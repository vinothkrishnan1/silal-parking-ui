import ipaddress
import re
import socket

from flask import jsonify
from sqlalchemy.exc import SQLAlchemyError

from extensions import db
from models import DeviceConfig

VALID_DEVICE_TYPES = ["ENTRY CAMERA", "EXIT CAMERA", "CONTROLLER"]
MAC_REGEX = re.compile(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')


def is_valid_ip(ip):
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def is_valid_port(port):
    try:
        port = int(port)
        return 1 <= port <= 65535
    except (ValueError, TypeError):
        return False


def is_valid_mac(mac):
    return bool(MAC_REGEX.match(mac))


def add_device(data):
    try:
        device_type = data.get("device_type")
        device_name = (data.get("device_name") or "").strip() or None
        gate_name = (data.get("gate_name") or "").strip() or None
        gate_type = (data.get("gate_type") or "").strip() or "Unrestricted"
        ip_address = data.get("ip_address")
        mac_address = data.get("mac_address")
        port = data.get("port")

        missing_fields = [field for field in ["device_type", "ip_address", "mac_address", "port"] if not data.get(field)]
        if missing_fields:
            return jsonify({"status": "error", "message": f"Missing fields: {', '.join(missing_fields)}"}), 400

        if device_type not in VALID_DEVICE_TYPES:
            return jsonify({"status": "error", "message": "Invalid device type"}), 400
        if not is_valid_ip(ip_address):
            return jsonify({"status": "error", "message": "Invalid IP address format"}), 400
        if not is_valid_mac(mac_address):
            return jsonify({"status": "error", "message": "Invalid MAC address format"}), 400
        if not is_valid_port(port):
            return jsonify({"status": "error", "message": "Invalid port number (1-65535)"}), 400

        device = DeviceConfig(
            device_type=device_type,
            device_name=device_name,
            gate_name=gate_name,
            gate_type=gate_type,
            ip_address=ip_address,
            mac_address=mac_address,
            port=int(port),
        )

        db.session.add(device)
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Device added successfully.",
            "data": device.to_dict(),
            "id": device.id,
        }), 201
    except SQLAlchemyError as exc:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(exc)}), 500


def edit_device(data, device_id):
    try:
        device = DeviceConfig.query.filter_by(id=device_id).first()
        if not device:
            return jsonify({"status": "error", "message": "Device not found"}), 404

        device_type = data.get("device_type")
        device_name = (data.get("device_name") or "").strip() or None
        gate_name = (data.get("gate_name") or "").strip() or None
        gate_type = (data.get("gate_type") or "").strip() or "Unrestricted"
        ip_address = data.get("ip_address")
        mac_address = data.get("mac_address")
        port = data.get("port")

        missing_fields = [field for field in ["device_type", "ip_address", "mac_address", "port"] if not data.get(field)]
        if missing_fields:
            return jsonify({"status": "error", "message": f"Missing fields: {', '.join(missing_fields)}"}), 400

        if device_type not in VALID_DEVICE_TYPES:
            return jsonify({"status": "error", "message": "Invalid device type"}), 400
        if not is_valid_ip(ip_address):
            return jsonify({"status": "error", "message": "Invalid IP address format"}), 400
        if not is_valid_mac(mac_address):
            return jsonify({"status": "error", "message": "Invalid MAC address format"}), 400
        if not is_valid_port(port):
            return jsonify({"status": "error", "message": "Invalid port number (1-65535)"}), 400

        device.device_type = device_type
        device.device_name = device_name
        device.gate_name = gate_name
        device.gate_type = gate_type
        device.ip_address = ip_address
        device.mac_address = mac_address
        device.port = int(port)

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Device updated successfully.",
            "data": device.to_dict(),
        }), 200
    except SQLAlchemyError as exc:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(exc)}), 500


def delete_device(device_id):
    try:
        device = DeviceConfig.query.filter_by(id=device_id).first()
        if not device:
            return jsonify({"status": "error", "message": "Device not found"}), 404

        db.session.delete(device)
        db.session.commit()
        return jsonify({"status": "success", "message": "Device deleted successfully."}), 200
    except SQLAlchemyError as exc:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(exc)}), 500


def get_all_devices():
    try:
        devices = DeviceConfig.query.all()
        return jsonify({
            "status": "success",
            "message": "Devices fetched successfully.",
            "data": [device.to_dict() for device in devices],
        }), 200
    except SQLAlchemyError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


def get_device_status(ip_address, port):
    if not ip_address or not port:
        return jsonify({"status": "failure", "message": "IP address and port are required"}), 400
    if not is_valid_ip(ip_address):
        return jsonify({"status": "failure", "message": "Invalid IP address format"}), 400
    if not is_valid_port(port):
        return jsonify({"status": "failure", "message": "Invalid port number"}), 400

    try:
        with socket.create_connection((ip_address, int(port)), timeout=1):
            return jsonify({"status": "success", "isActive": True, "message": "Device is active."}), 200
    except (socket.timeout, ConnectionRefusedError, OSError) as exc:
        return jsonify({
            "status": "success",
            "isActive": False,
            "message": f"Device is inactive or unreachable: {exc}",
        }), 200
    except Exception as exc:
        return jsonify({"status": "failure", "message": f"Unexpected error: {exc}"}), 500
