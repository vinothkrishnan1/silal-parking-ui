from flask import request, jsonify
import logging
from datetime import datetime
from models import Vehicle, db, DeviceConfig
from sqlalchemy import desc
from sqlalchemy import func
from debug_logger import log_info

logger = logging.getLogger(__name__)

last_exit_post_data = {}


EXIT_PING_ENDPOINT = "http://localhost:5000/exit_ping_on_exit"  # Replace with env/config if needed


def _normalize_camera_type(camera_type):
    if not camera_type:
        return None

    normalized = str(camera_type).strip().upper()
    if normalized in {"ENTRY", "ENTRY CAMERA"}:
        return "ENTRY CAMERA"
    if normalized in {"EXIT", "EXIT CAMERA"}:
        return "EXIT CAMERA"
    return None


def _get_device_by_type(device_type):
    normalized_device_type = _normalize_camera_type(device_type)
    if not normalized_device_type:
        return None

    return DeviceConfig.query.filter_by(device_type=normalized_device_type).order_by(DeviceConfig.id.asc()).first()


def _resolve_payment_barrier_device(source_ip=None, gate_name=None):
    if source_ip:
        device = DeviceConfig.query.filter(DeviceConfig.ip_address == source_ip).first()
        if device:
            return device

    if gate_name:
        normalized_gate_name = str(gate_name).strip().lower()
        if normalized_gate_name:
            return DeviceConfig.query.filter(
                func.lower(DeviceConfig.gate_name) == normalized_gate_name,
            ).order_by(DeviceConfig.id.asc()).first()

    return None


def _normalize_controller_device(controller_device):
    if controller_device is None:
        return None

    if hasattr(controller_device, "ip_address"):
        return controller_device

    lookup_value = str(controller_device).strip()
    if not lookup_value:
        return None

    controller = DeviceConfig.query.filter(
        DeviceConfig.ip_address == lookup_value,
    ).first()
    if controller:
        return controller

    controller = DeviceConfig.query.filter(
        func.lower(DeviceConfig.gate_name) == lookup_value.lower(),
    ).first()
    if controller:
        return controller

    controller = DeviceConfig.query.filter(
        func.lower(DeviceConfig.device_name) == lookup_value.lower(),
    ).first()
    if controller:
        return controller

    return None


def get_last_exit_gate_name():
    return (last_exit_post_data or {}).get('gate_name')


def get_last_exit_source_ip():
    return (last_exit_post_data or {}).get('source_ip')


def _open_barrier_with_log(controller_device, license_plate):
    controller_device = _normalize_controller_device(controller_device)
    if not controller_device:
        raise ValueError("No boom barrier device configured")

    from services.door_controller import DoorController

    controller_ip = getattr(controller_device, "ip_address", None) or str(controller_device)
    controller_port = getattr(controller_device, "port", None) or 80

    log_info(
        f"Payment barrier request: plate={license_plate}, device_id={getattr(controller_device, 'id', None)}, "
        f"device_name={getattr(controller_device, 'device_name', None)}, gate_name={getattr(controller_device, 'gate_name', None)}, "
        f"ip_address={controller_ip}, port={controller_port}"
    )
    controller = DoorController(controller_ip, port=controller_port)
    result, status_code = controller.open_barrier()
    log_info(f"Payment barrier response: status={status_code}, body={result}")
    return result, status_code

def update_payment_status():
    """
    Receives payment status updates from the on_exit desktop website.
    """
    data = request.get_json()
    license_plate = data.get('license_plate')
    payment_status = data.get('payment_status')
    payment_mode = data.get('payment_mode')
    gate_name = data.get('gate_name') or get_last_exit_gate_name()
    source_ip = data.get('source_ip') or data.get('ip_address') or data.get('client_ip') or data.get('remote_addr') or get_last_exit_source_ip()

    if not license_plate or not payment_status:
        return jsonify({"status": "error", "message": "Missing license_plate or payment_status"}), 400

    try:
        vehicle = Vehicle.query.filter(
            func.lower(Vehicle.license_plate) == func.lower(license_plate)
        ).order_by(desc(Vehicle.entry_time)).first()
        
        if vehicle:
            vehicle.payment_status = payment_status
            vehicle.payment_mode = payment_mode
            vehicle.payment_processed_at = datetime.utcnow() if payment_status.lower() in ['paid', 'waived'] else None
            db.session.commit()
            logger.info(f"Payment status for {license_plate} updated to {payment_status}")

            try:
                from services.parking_broadcast import broadcast_vehicle_event
                broadcast_vehicle_event('payment', {
                    'license_plate': vehicle.license_plate,
                    'payment_status': vehicle.payment_status,
                    'payment_mode': vehicle.payment_mode,
                    'payment_processed_at': vehicle.payment_processed_at.isoformat() if vehicle.payment_processed_at else None
                })
            except Exception as broadcast_error:
                logger.error(f"Failed to broadcast payment event for {license_plate}: {broadcast_error}")
            
            # If payment is successful, open the boom barrier and close out the vehicle row.
            if payment_status.lower() in ['paid', 'waived']:
                try:
                    log_info(
                        f"Payment barrier trigger start: plate={license_plate}, source_ip={source_ip}, gate_name={gate_name}, payment_status={payment_status}"
                    )
                    controller_device = _resolve_payment_barrier_device(source_ip, gate_name)
                    if not controller_device:
                        raise ValueError(f"No boom barrier device configured for source_ip={source_ip} gate_name={gate_name}")
                    log_info(
                        f"Payment barrier resolved controller: device_id={getattr(controller_device, 'id', None)}, "
                        f"device_name={getattr(controller_device, 'device_name', None)}, gate_name={getattr(controller_device, 'gate_name', None)}, "
                        f"ip_address={getattr(controller_device, 'ip_address', None)}, device_type={getattr(controller_device, 'device_type', None)}"
                    )
                    _open_barrier_with_log(controller_device, license_plate)
                    vehicle.status = 'out'
                    if not vehicle.exit_time:
                        vehicle.exit_time = datetime.utcnow()
                    if not vehicle.duration and vehicle.entry_time and vehicle.exit_time:
                        vehicle.duration = vehicle.exit_time - vehicle.entry_time
                    db.session.commit()
                    log_info(
                        f"Payment barrier exit state updated: plate={license_plate}, vehicle_id={getattr(vehicle, 'id', None)}, status={vehicle.status}, exit_time={vehicle.exit_time.isoformat() if vehicle.exit_time else None}"
                    )
                    print(f"[BARRIER] Boom barrier opened for paid visitor: {license_plate}")
                    log_info(f"Boom barrier opened for paid visitor: Plate={license_plate}")
                except Exception as e:
                    print(f"[BARRIER] Boom barrier failed to open: {e}")
                    logger.error(f"Failed to open barrier for {license_plate}: {e}")
                    log_info(f"Boom barrier failed to open for paid visitor: Plate={license_plate}. Error: {e}")
                
                # Broadcast the parking slot update since the vehicle has now exited
                from services.parking_broadcast import broadcast_slot_status
                broadcast_slot_status()
                
            return jsonify({"status": "success", "message": "Payment status updated"}), 200
        else:
            logger.error(f"Vehicle with license plate {license_plate} not found")
            return jsonify({"status": "error", "message": f"Vehicle with license plate {license_plate} not found"}), 404
    except Exception as e:
        logger.error(f"Error updating payment status: {e}")
        return jsonify({"status": "error", "message": f"Error updating payment status: {e}"}), 500

def exit_ping_on_exit():
    """
    Handles GET and POST pings from the exit system.
    POST stores the vehicle info and returns it.
    GET returns the same data that was posted last time.
    """
    global last_exit_post_data

    if request.method == 'POST':
        data = request.get_json()
        license_plate = data.get('license_plate')

        if not license_plate:
            return jsonify({"status": "error", "message": "Missing license_plate in POST data"}), 400

        try:
            vehicle = Vehicle.query.filter(
                func.lower(Vehicle.license_plate) == func.lower(license_plate)
            ).order_by(desc(Vehicle.entry_time)).first()

            if vehicle:
                last_exit_post_data = {  # Store for GET
                    "license_plate": vehicle.license_plate,
                    "entry_time": vehicle.entry_time.isoformat() if vehicle.entry_time else None,
                    "exit_time": vehicle.exit_time.isoformat() if vehicle.exit_time else None,
                    "duration": round(vehicle.duration.total_seconds() / 60, 2) if vehicle.duration else None,
                    "payable_amount": round(vehicle.payable_amount, 2) if vehicle.payable_amount else None,
                    "gate_name": data.get('gate_name'),
                    "source_ip": data.get('source_ip') or data.get('ip_address') or data.get('client_ip') or data.get('remote_addr')
                }

                return jsonify({
                    "status": "success",
                    "message": "Vehicle data retrieved (POST)",
                    **last_exit_post_data
                }), 200
            else:
                return jsonify({"status": "success", "message": "No vehicle entries found"}), 200

        except Exception as e:
            logger.error(f"Error retrieving vehicle data: {e}")
            return jsonify({"status": "error", "message": f"Error retrieving vehicle data: {e}"}), 500

    elif request.method == 'GET':
        logger.info("Exit system pinged (GET) for last known vehicle data.")
        if last_exit_post_data:
            return jsonify({
                "status": "success",
                "message": "Last vehicle data retrieved (GET)",
                **last_exit_post_data
            }), 200
        else:
            return jsonify({"status": "success", "message": "No data has been sent yet", "data": {}}), 200

    return jsonify({"status": "error", "message": "Method not allowed"}), 405


