from models import WaivedUser
from datetime import datetime
from models import db, Vehicle, Tenant, TenantVehicle, Pricing, PricingTier, TenantSubscription, SUBSCRIPTION_STATUS_ACTIVE, DeviceConfig
import logging
import sys
import os
from sqlalchemy import func  # Import the func module
from services.kiosk_services import generate_barcode, send_data_to_website  # Import the new function
from services.parking_slip_generator import generate_parking_slip_html # Import the function
from flask import current_app, jsonify
from services.on_exit_services import update_payment_status, exit_ping_on_exit
import requests
from services.parking_broadcast import broadcast_slot_status, broadcast_vehicle_event
from services.door_controller import DoorController
from services.subscription_status_service import sync_expired_subscriptions
from debug_logger import log_info

# KIOSK_ENDPOINT = "http://<kiosk_ip>:<port>/receive_entry"  # Replace with actual IP/port
# ✅ Define the target endpoint URL at the top (assuming local server)

logger = logging.getLogger(__name__)


def _get_self_base_url():
    configured_base_url = (
        current_app.config.get("SELF_BASE_URL")
        or current_app.config.get("KIOSK_WEBSITE_BASE_URL")
        or ""
    )
    env_base_url = (
        os.getenv("SELF_BASE_URL")
        or os.getenv("KIOSK_WEBSITE_BASE_URL")
        or ""
    )
    return (configured_base_url or env_base_url or "http://127.0.0.1:8000").rstrip("/")


def _get_exit_ping_endpoint():
    return f"{_get_self_base_url()}/exit_ping_on_exit"


def _resolve_gate_name_from_camera_data(camera_data):
    camera_data = camera_data or {}

    gate_name = camera_data.get("gate_name")
    if gate_name:
        normalized_gate_name = str(gate_name).strip()
        if normalized_gate_name:
            return normalized_gate_name

    source_ip = camera_data.get("source_ip") or camera_data.get("ip_address") or camera_data.get("client_ip") or camera_data.get("remote_addr")
    if source_ip:
        device = DeviceConfig.query.filter(DeviceConfig.ip_address == source_ip).first()
        if device and device.gate_name:
            normalized_gate_name = str(device.gate_name).strip()
            if normalized_gate_name:
                return normalized_gate_name

    return None


def _log_camera_context(prefix, camera_data):
    camera_data = camera_data or {}
    log_info(
        f"{prefix}: source_ip={camera_data.get('source_ip') or camera_data.get('ip_address') or camera_data.get('client_ip') or camera_data.get('remote_addr')}, "
        f"gate_name={camera_data.get('gate_name')}, camera_type={camera_data.get('camera_type')}, "
        f"device_type={camera_data.get('device_type')}, device_id={camera_data.get('device_id')}, device_name={camera_data.get('device_name')}"
    )


def _get_controller_for_gate(gate_name=None):
    if not gate_name:
        return None

    normalized_gate_name = str(gate_name).strip().lower()
    if not normalized_gate_name:
        return None

    return DeviceConfig.query.filter(
        func.lower(DeviceConfig.gate_name) == normalized_gate_name,
    ).order_by(DeviceConfig.id.asc()).first()


def _get_controller_from_camera_data(camera_data):
    camera_data = camera_data or {}
    _log_camera_context("Controller lookup from camera data", camera_data)

    source_ip = camera_data.get("source_ip") or camera_data.get("ip_address") or camera_data.get("client_ip") or camera_data.get("remote_addr")
    if source_ip:
        log_info(f"Controller lookup branch=source_ip value={source_ip}")
        camera = DeviceConfig.query.filter(DeviceConfig.ip_address == source_ip).first()
        if camera:
            log_info(
                f"Controller lookup result by source_ip: device_id={getattr(camera, 'id', None)}, "
                f"device_name={getattr(camera, 'device_name', None)}, gate_name={getattr(camera, 'gate_name', None)}, "
                f"ip_address={getattr(camera, 'ip_address', None)}, device_type={getattr(camera, 'device_type', None)}"
            )
            if camera.gate_name:
                controller = _get_controller_for_gate(camera.gate_name)
                if controller:
                    log_info(
                        f"Controller redirected by source_ip gate_name: device_id={getattr(controller, 'id', None)}, "
                        f"device_name={getattr(controller, 'device_name', None)}, gate_name={getattr(controller, 'gate_name', None)}, "
                        f"ip_address={getattr(controller, 'ip_address', None)}, device_type={getattr(controller, 'device_type', None)}"
                    )
                    return controller
            return camera

    gate_name = camera_data.get("gate_name")
    if gate_name:
        log_info(f"Controller lookup branch=gate_name value={gate_name}")
        controller = _get_controller_for_gate(gate_name)
        if controller:
            log_info(
                f"Controller lookup result by gate_name: device_id={getattr(controller, 'id', None)}, "
                f"device_name={getattr(controller, 'device_name', None)}, gate_name={getattr(controller, 'gate_name', None)}, "
                f"ip_address={getattr(controller, 'ip_address', None)}, device_type={getattr(controller, 'device_type', None)}"
            )
            return controller

    device_id = camera_data.get("device_id")
    if device_id:
        log_info(f"Controller lookup branch=device_id value={device_id}")
        device = DeviceConfig.query.filter_by(id=device_id).first()
        if device:
            log_info(
                f"Controller lookup result by device_id: device_id={getattr(device, 'id', None)}, "
                f"device_name={getattr(device, 'device_name', None)}, gate_name={getattr(device, 'gate_name', None)}, "
                f"ip_address={getattr(device, 'ip_address', None)}, device_type={getattr(device, 'device_type', None)}"
            )
            return device

    device_name = camera_data.get("device_name")
    if device_name:
        log_info(f"Controller lookup branch=device_name value={device_name}")
        device = DeviceConfig.query.filter(
            func.lower(DeviceConfig.device_name) == str(device_name).strip().lower(),
        ).first()
        if device:
            log_info(
                f"Controller lookup result by device_name: device_id={getattr(device, 'id', None)}, "
                f"device_name={getattr(device, 'device_name', None)}, gate_name={getattr(device, 'gate_name', None)}, "
                f"ip_address={getattr(device, 'ip_address', None)}, device_type={getattr(device, 'device_type', None)}"
            )
            return device

    camera_type = str(camera_data.get("camera_type") or camera_data.get("device_type") or "").strip().upper()
    if camera_type in {"ENTRY", "ENTRY CAMERA"}:
        log_info(f"Controller lookup branch=camera_type value={camera_type}")
        device = DeviceConfig.query.filter_by(device_type="ENTRY CAMERA").order_by(DeviceConfig.id.asc()).first()
        if device:
            log_info(
                f"Controller lookup result by camera_type ENTRY: device_id={getattr(device, 'id', None)}, "
                f"device_name={getattr(device, 'device_name', None)}, gate_name={getattr(device, 'gate_name', None)}, "
                f"ip_address={getattr(device, 'ip_address', None)}, device_type={getattr(device, 'device_type', None)}"
            )
            return device
    if camera_type in {"EXIT", "EXIT CAMERA"}:
        log_info(f"Controller lookup branch=camera_type value={camera_type}")
        device = DeviceConfig.query.filter_by(device_type="EXIT CAMERA").order_by(DeviceConfig.id.asc()).first()
        if device:
            log_info(
                f"Controller lookup result by camera_type EXIT: device_id={getattr(device, 'id', None)}, "
                f"device_name={getattr(device, 'device_name', None)}, gate_name={getattr(device, 'gate_name', None)}, "
                f"ip_address={getattr(device, 'ip_address', None)}, device_type={getattr(device, 'device_type', None)}"
            )
            return device

    log_info("Controller lookup result: no matching device found")
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


def _open_barrier_with_log(controller_device, context_label, license_plate):
    controller_device = _normalize_controller_device(controller_device)
    if not controller_device:
        raise ValueError("No boom barrier device configured")

    controller_ip = getattr(controller_device, "ip_address", None) or str(controller_device)
    controller_port = getattr(controller_device, "port", None) or 80

    log_info(
        f"{context_label} request: plate={license_plate}, device_id={getattr(controller_device, 'id', None)}, "
        f"device_name={getattr(controller_device, 'device_name', None)}, gate_name={getattr(controller_device, 'gate_name', None)}, "
        f"ip_address={controller_ip}, port={controller_port}"
    )
    controller = DoorController(controller_ip, port=controller_port)
    result, status_code = controller.open_barrier()
    log_info(f"{context_label} response: status={status_code}, body={result}")
    return result, status_code


def handle_anpr_entry(vehicle_data):
    """
    Handles ANPR entry data, checks for duplicates, creates a new vehicle entry,
    and sends data to a kiosk for barcode printing.

    Args:
        vehicle_data (dict): A dictionary containing vehicle information,
                            including 'license_plate' (required).
    """
    license_plate = vehicle_data.get("license_plate")

    if not license_plate:
        logger.error("License plate missing in entry data.")
        return

    log_info(f"ANPR Camera Entry Detect & Process: Plate={license_plate}")
    _log_camera_context("Entry camera context", vehicle_data)
    log_info(f"Entry camera resolved gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}")

    # Block only if the same plate is still active inside.
    existing_vehicle = Vehicle.query.filter(
        func.replace(func.lower(Vehicle.license_plate), ' ', '') == license_plate.lower().replace(' ', ''),
        Vehicle.status == 'in'
    ).first()
    if existing_vehicle:
        log_message = f"[INFO] Vehicle {license_plate} already inside."
        logger.info(log_message)
        print(log_message, file=sys.stdout)
        return

    now = datetime.utcnow()
    today = now.date()
    sync_expired_subscriptions(today)

    # --- Vehicle Classification Logic (Priority: Tenant > Staff > Visitor) ---
    tenant_vehicle = TenantVehicle.query.filter(
        func.replace(func.lower(TenantVehicle.license_plate), ' ', '') == license_plate.lower().replace(' ', '')
    ).first()

    category = 'Visitor'
    tenant_id = None
    is_subscriber = False

    if tenant_vehicle:
        tenant = Tenant.query.get(tenant_vehicle.tenant_id)
        if tenant:
            print(f"[DEBUG] Found tenant: {tenant.tenant_name} for plate: {license_plate}")
            active_sub = TenantSubscription.query.filter(
                TenantSubscription.tenant_id == tenant.id,
                TenantSubscription.status == SUBSCRIPTION_STATUS_ACTIVE,
                TenantSubscription.start_date <= today,
                TenantSubscription.end_date >= today
            ).first()

            if active_sub:
                # Check slot allocation
                current_parked = Vehicle.query.filter_by(tenant_id=tenant.id, status='in').count()
                if current_parked < active_sub.allocated_slots:
                    # Within limit, allow as Tenant/Staff
                    category = tenant.tenant_type if tenant.tenant_type else 'Tenant'
                    tenant_id = tenant.id
                    is_subscriber = True
                else:
                    logger.info(f"Tenant {tenant.tenant_name} reached slot limit ({current_parked}/{active_sub.allocated_slots}). Treating as Visitor.")
            else:
                logger.info(f"Tenant vehicle {license_plate} has no active subscription. Treating as Visitor.")
  
    if not tenant_vehicle:
        staff = WaivedUser.query.filter(WaivedUser.license_plate.ilike(f"%{license_plate}%")).first()
        if staff:
            category = 'Staff'
            is_subscriber = True

    # Always create a fresh history row once the prior visit has exited.
    new_vehicle = Vehicle(
        license_plate=license_plate,
        entry_time=now,
        status='in',
        payment_status='waived' if is_subscriber else 'not paid',
        vehicle_category=category,
        tenant_id=tenant_id
    )
    db.session.add(new_vehicle)
    db.session.commit()
    log_info(
        f"Vehicle entry created: plate={license_plate}, vehicle_id={getattr(new_vehicle, 'id', None)}, category={category}, "
        f"payment_status={new_vehicle.payment_status}"
    )
    broadcast_slot_status()
    broadcast_vehicle_event('entry', {
        'license_plate': license_plate,
        'entry_time': now.isoformat(),
        'vehicle_category': category
    })

    log_message = f"[INFO] Entry recorded: {license_plate} as {category}"
    logger.info(log_message)

    if is_subscriber:
        # Subscribers/staff should not fall through to visitor pass generation.
        website_payload = {
            "flow_type": "entry",
            "license_plate": license_plate,
            "entry_time": now.strftime('%Y-%m-%d %H:%M:%S'),
            "vehicle_category": category,
            "tenant_type": category,
            "is_tenant": True,
            "requires_payment": False,
            "requires_print": False,
            "message": f"{category} access granted",
        }
        send_data_to_website(website_payload)

        try:
            controller_device = _get_controller_from_camera_data(vehicle_data)
            _open_barrier_with_log(controller_device, "Entry barrier auto-open", license_plate)
            logger.info(f"Automatic boom barrier trigger sent for entry: {license_plate}")
            print("[BARRIER] Boom barrier opened successfully.")
            log_info(f"Boom barrier opened successfully for entry: Plate={license_plate}")
        except Exception as e:
            logger.error(f"Failed to trigger automatic boom barrier for entry {license_plate}: {e}")
            print("[BARRIER] Boom barrier opening failed", e)
            log_info(f"Boom barrier opening failed for entry: Plate={license_plate}. Error: {e}")

        return

    # Trigger automatic boom barrier for entry
    try:
        controller_device = _get_controller_from_camera_data(vehicle_data)
        _open_barrier_with_log(controller_device, "Entry barrier auto-open", license_plate)
        logger.info(f"Automatic boom barrier trigger sent for entry: {license_plate}")
        print("[BARRIER] Boom barrier opened successfully.")    
        log_info(f"Boom barrier opened successfully for entry: Plate={license_plate}")
    except Exception as e:
        logger.error(f"Failed to trigger automatic boom barrier for entry {license_plate}: {e}")
        print("[BARRIER] Boom barrier opening failed", e)    
        log_info(f"Boom barrier opening failed for entry: Plate={license_plate}. Error: {e}")

    # --- Visitor Logic (Barcode & Slip) ---
    barcode_data = f"{license_plate}, {now.strftime('%Y-%m-%d %H:%M:%S')}"
    barcode_image_base64 = generate_barcode(barcode_data)

    slip_data = {
        "vehicle_number": license_plate,
        "date": now.strftime('%Y-%m-%d'),
        "entry-time": now.strftime('%H:%M:%S'),
    }
    html_content = generate_parking_slip_html(slip_data)

    website_payload = {
        "flow_type": "entry",
        "license_plate": license_plate,
        "entry_time": now.strftime('%Y-%m-%d %H:%M:%S'),
        "barcode_image": barcode_image_base64,
        "printable_slip": html_content,
        "vehicle_category": category,
        "tenant_type": category,
        "requires_payment": False,
        "requires_print": True
    }
    send_data_to_website(website_payload)

def handle_anpr_exit(vehicle_data):
    """
    Handles ANPR exit: updates vehicle info, calculates duration/payment, 
    and returns response with full vehicle exit data.
    
    Args:
        vehicle_data (dict): Must contain 'license_plate'.
    
    Returns:
        (Flask Response): JSON response with vehicle exit info or error.
    """
    license_plate = vehicle_data.get("license_plate")
    if not license_plate:
        logger.error("License plate missing in exit data.")
        print("[ERROR] License plate missing in exit data.", file=sys.stderr)
        return jsonify({"status": "error", "message": "License plate missing"}), 400

    log_info(f"ANPR Camera Exit Detect & Process: Plate={license_plate}")
    _log_camera_context("Exit camera context", vehicle_data)
    log_info(f"Exit camera resolved gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}")

    try:
        logger.debug(f"Searching for vehicle with plate: {license_plate}")

        vehicle = Vehicle.query.filter(
            func.replace(func.lower(Vehicle.license_plate), ' ', '') == license_plate.lower().replace(' ', ''),
            func.lower(Vehicle.status) == 'in'
        ).first()

        if not vehicle:
            logger.error(f"No active vehicle found with plate: {license_plate}")
            log_info(
                f"Exit barrier skipped: no active vehicle found for plate={license_plate}, "
                f"source_ip={vehicle_data.get('source_ip')}, gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}"
            )
            return jsonify({"status": "error", "message": "No active vehicle found inside"}), 404

        now = datetime.utcnow()
        duration = (now - vehicle.entry_time).total_seconds() / 60  # in minutes
        payable_amount = calculate_payment(duration)

        # Update vehicle details
        vehicle.exit_time = now
        vehicle.duration = now - vehicle.entry_time
        vehicle.payable_amount = payable_amount
        db.session.commit()

        # Prepare payload
        payload = {
            "status": "success",
            "message": "Vehicle data retrieved",
            "license_plate": vehicle.license_plate,
            "entry_time": vehicle.entry_time.isoformat() if vehicle.entry_time else None,
            "exit_time": vehicle.exit_time.isoformat() if vehicle.exit_time else None,
            "duration": duration if vehicle.duration else None,
            "payable_amount": round(vehicle.payable_amount, 2) if vehicle.payable_amount else None,
            "gate_name": _resolve_gate_name_from_camera_data(vehicle_data),
        }

        kiosk_payload = {
            "flow_type": "exit",
            "license_plate": vehicle.license_plate,
            "entry_time": vehicle.entry_time.isoformat() if vehicle.entry_time else None,
            "exit_time": vehicle.exit_time.isoformat() if vehicle.exit_time else None,
            "duration": round(duration, 2),
            "payable_amount": round(vehicle.payable_amount, 2) if vehicle.payable_amount else 0,
            "payment_status": vehicle.payment_status,
            "vehicle_category": vehicle.vehicle_category or "Visitor",
            "tenant_type": vehicle.vehicle_category or "Visitor",
            "gate_name": _resolve_gate_name_from_camera_data(vehicle_data),
        }

        # Optional: POST to external exit kiosk if needed
        try:
            response = requests.post(_get_exit_ping_endpoint(), json=payload, timeout=5)
            response.raise_for_status()
            logger.info("Data sent to exit kiosk endpoint successfully.")
        except requests.RequestException as e:
            logger.warning(f"Failed to notify exit kiosk: {e}")

        # --- Tenant Check Logic on Exit ---
        tenant_vehicle = TenantVehicle.query.filter(
            func.replace(func.lower(TenantVehicle.license_plate), ' ', '') == license_plate.lower().replace(' ', '')
        ).first()

        if tenant_vehicle:
            tenant = Tenant.query.get(tenant_vehicle.tenant_id)
            if tenant:
                from models import TenantSubscription
                today = now.date()
                sync_expired_subscriptions(today)
                active_sub = TenantSubscription.query.filter(
                    TenantSubscription.tenant_id == tenant.id,
                    TenantSubscription.status == SUBSCRIPTION_STATUS_ACTIVE,
                    TenantSubscription.start_date <= today,
                    TenantSubscription.end_date >= today
                ).first()
                
                if not active_sub:
                    # Expired tenant exiting (maybe it expired while they were inside)
                    logger.warning(f"Tenant vehicle {license_plate} subscription expired. Exit intervention required.")
                    log_info(
                        f"Exit barrier skipped: tenant subscription expired for plate={license_plate}, "
                        f"source_ip={vehicle_data.get('source_ip')}, gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}"
                    )
                    kiosk_payload.update({
                        "requires_payment": True,
                        "message": "Tenant subscription expired. Intervention required"
                    })
                    send_data_to_website(kiosk_payload)
                    return jsonify({"status": "unpaid", "message": "Tenant subscription expired. Intervention required", **payload}), 403
                else:
                    vehicle.payment_status = 'waived' # Ensure they are allowed out
                    log_info(f"Exit tenant approved via waiver: plate={license_plate}, gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}")

        # Allow exit if payment is done, or if the payable amount is zero.
        if payable_amount is not None and payable_amount <= 0:
            vehicle.payment_status = 'waived'
            db.session.commit()
            log_info(
                f"Exit auto-allowed for zero payable amount: plate={license_plate}, payable_amount={payable_amount}, "
                f"source_ip={vehicle_data.get('source_ip')}, gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}"
            )

        if vehicle.payment_status not in ['paid', 'waived']:
            logger.info(f"Payment not completed for vehicle: {license_plate}. Cannot exit.")
            log_info(
                f"Exit barrier skipped: payment_status={vehicle.payment_status}, plate={license_plate}, "
                f"source_ip={vehicle_data.get('source_ip')}, gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}"
            )
            kiosk_payload.update({
                "requires_payment": True,
                "message": "Payment required before exit"
            })
            send_data_to_website(kiosk_payload)
            return jsonify({"status": "unpaid", "message": "Payment not completed", **payload}), 403

        kiosk_payload.update({
            "requires_payment": False,
            "message": f"{vehicle.vehicle_category or 'Vehicle'} exit approved"
        })
        log_info(
            f"Exit barrier approved: plate={license_plate}, payment_status={vehicle.payment_status}, "
            f"source_ip={vehicle_data.get('source_ip')}, gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}"
        )
        send_data_to_website(kiosk_payload)

        # Mark veh icle as out
        vehicle.status = 'out'
        db.session.commit()

        # Trigger automatic boom barrier for approved exit vehicles using resolved camera data.
        try:
            log_info(
                f"Exit barrier trigger start: plate={license_plate}, source_ip={vehicle_data.get('source_ip')}, "
                f"gate_name={_resolve_gate_name_from_camera_data(vehicle_data)}, camera_type={vehicle_data.get('camera_type')}, "
                f"vehicle_status={vehicle.status}, payment_status={vehicle.payment_status}"
            )
            controller_device = _get_controller_from_camera_data(vehicle_data)
            if not controller_device:
                controller_device = DeviceConfig.query.order_by(DeviceConfig.id.asc()).first()
                log_info(
                    f"Exit barrier fallback controller selected: device_id={getattr(controller_device, 'id', None)}, "
                    f"device_name={getattr(controller_device, 'device_name', None)}, gate_name={getattr(controller_device, 'gate_name', None)}, "
                    f"ip_address={getattr(controller_device, 'ip_address', None)}, device_type={getattr(controller_device, 'device_type', None)}"
                )
            else:
                log_info(
                    f"Exit barrier resolved controller: device_id={getattr(controller_device, 'id', None)}, "
                    f"device_name={getattr(controller_device, 'device_name', None)}, gate_name={getattr(controller_device, 'gate_name', None)}, "
                    f"ip_address={getattr(controller_device, 'ip_address', None)}, device_type={getattr(controller_device, 'device_type', None)}"
                )

            log_info(f"Exit barrier sending open command: plate={license_plate}")
            _open_barrier_with_log(
                controller_device,
                "Exit barrier auto-open",
                license_plate,
            )
            print(f"[BARRIER] Boom barrier automatically opened for {vehicle.vehicle_category or 'Vehicle'} exit: {license_plate}")
            logger.info(f"Automatic boom barrier trigger sent for {vehicle.vehicle_category or 'Vehicle'} exit: {license_plate}")
            log_info(f"Boom barrier automatically opened for {vehicle.vehicle_category or 'Vehicle'} exit: Plate={license_plate}")
        except Exception as e:
            print("[BARRIER] Boom barrier failed",e)
            logger.error(f"Failed to trigger automatic boom barrier for exit {license_plate}: {e}")
            log_info(f"Boom barrier failed to open for {vehicle.vehicle_category or 'Vehicle'} exit: Plate={license_plate}. Error: {e}")

        broadcast_slot_status()
        broadcast_vehicle_event('exit', {
            'license_plate': license_plate,
            'exit_time': now.isoformat()
        })

        logger.info(f"Vehicle {license_plate} exited. Duration: {duration:.2f} mins, Payable: ₹{payable_amount:.2f}")
        return jsonify(payload), 200

    except Exception as e:
        logger.exception("Unexpected error during ANPR exit handling")
        return jsonify({"status": "error", "message": "Internal server error"}), 500
    
def calculate_payment(duration_minutes):
    """
    Calculates the parking fee based on the duration.  This is just an example;
    replace with your actual pricing logic.

    Args:
        duration_minutes (float): The parking duration in minutes.

    Returns:
        float: The amount due.
    """
    # Try to find 'Visitor Parking' pricing
    pricing = Pricing.query.filter_by(pricing_type='Visitor Parking', is_active=True).first()
    
    if not pricing:
        logger.warning("No active 'Visitor Parking' pricing found. Using fallback logic.")
        # Fallback logic: ₹10 for first 30 min, ₹1 per additional minute
        if duration_minutes <= 30:
            return 10.00
        else:
            return 10.00 + (duration_minutes - 30) * 1.00

    # Get tiers sorted by duration (assuming duration is in hours/units)
    # The current PricingTier model has 'duration' and 'unit' ('hour', 'day')
    # Let's assume the pricing tiers are progressive or flat based on the system design.
    # For now, let's find the tier that matches the duration best.
    
    # Convert duration to hours for comparison if unit is hour
    duration_hours = duration_minutes / 60
    
    # Sort tiers by duration ascending
    tiers = sorted(pricing.tiers, key=lambda x: x.duration)
    
    if not tiers:
        return 0.0

    # Basic tier logic: Find the first tier where duration >= current duration
    # This might need to be more complex (e.g., cumulative pricing), 
    # but for now we'll pick the matching tier.
    selected_price = tiers[0].price_omr
    for tier in tiers:
        if tier.unit == 'hour':
            if duration_hours <= tier.duration:
                selected_price = tier.price_omr
                break
            else:
                selected_price = tier.price_omr # Keep the highest matching tier so far
        elif tier.unit == 'day':
            if (duration_hours / 24) <= tier.duration:
                selected_price = tier.price_omr
                break
            else:
                selected_price = tier.price_omr
                
    return float(selected_price)


def is_duplicate_entry(license_plate):
    """
    Checks if there is an existing open entry for the given license plate.
    """
    open_entry = Vehicle.query.filter(
        func.replace(func.lower(Vehicle.license_plate), ' ', '') == license_plate.lower().replace(' ', ''),
        Vehicle.status == 'in'
    ).first()
    return open_entry is not None


