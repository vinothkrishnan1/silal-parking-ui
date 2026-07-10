import logging
import os
import queue
import threading
import time
import xml.etree.ElementTree as ET

from flask import jsonify, request
from sqlalchemy import func

from services.vehicle_services import handle_anpr_entry, handle_anpr_exit, is_duplicate_entry
from models import DeviceConfig
from debug_logger import log_info

logger = logging.getLogger(__name__)

entry_queue = queue.Queue()
exit_queue = queue.Queue()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _normalize_plate(value):
    return (value or "").strip().replace(" ", "").upper()


def parse_anpr_xml_and_save_files(request_files, camera_type):
    if "anpr.xml" not in request_files:
        logger.error("Missing anpr.xml in %s request.", camera_type)
        return None, None, None, "Missing anpr.xml"

    xml_file = request_files["anpr.xml"]
    xml_content = xml_file.read()
    xml_path = os.path.join(UPLOAD_DIR, f"anpr_{camera_type}.xml")

    try:
        with open(xml_path, "wb") as output_file:
            output_file.write(xml_content)

        ns = {"ns": "http://www.hikvision.com/ver20/XMLSchema"}
        root = ET.fromstring(xml_content)

        source_ip_elem = root.find(".//ns:ipAddress", ns)
        source_ip = (source_ip_elem.text or "").strip() if source_ip_elem is not None else None

        license_plate_elem = root.find(".//ns:licensePlate", ns)
        license_plate = _normalize_plate(
            license_plate_elem.text if license_plate_elem is not None else ""
        )

        if not license_plate:
            return None, None, source_ip, "License plate not found in XML."

        file_names = root.findall(".//ns:pictureInfo/ns:fileName", ns)
        saved_files = []

        for file_elem in file_names:
            file_name = (file_elem.text or "").strip()
            file = request_files.get(file_name)
            if not file:
                continue

            image_path = os.path.join(UPLOAD_DIR, f"{license_plate}_{file_name}")
            file.save(image_path)
            saved_files.append(image_path)

        return license_plate, saved_files, source_ip, None
    except ET.ParseError:
        logger.exception("Invalid XML received from %s camera.", camera_type)
        return None, None, None, "Invalid XML format."
    except Exception:
        logger.exception("Error processing %s camera data.", camera_type)
        return None, None, None, "Internal server error during file processing."


def _get_request_source_ip():
    header_candidates = [
        request.headers.get('X-Forwarded-For', ''),
        request.headers.get('X-Real-IP', ''),
        request.headers.get('X-Client-IP', ''),
    ]

    for header_value in header_candidates:
        if header_value:
            return header_value.split(',')[0].strip()

    if request.access_route:
        return request.access_route[0]

    return request.remote_addr


def _resolve_gate_name_from_source_ip(source_ip, camera_type):
    if not source_ip:
        return None

    device = DeviceConfig.query.filter(DeviceConfig.ip_address == source_ip).first()
    if device and device.gate_name:
        gate_name = str(device.gate_name).strip()
        if gate_name:
            return gate_name

    return None


def _read_camera_payload(camera_type):
    if "anpr.xml" in request.files:
        license_plate, saved_files, source_ip, error = parse_anpr_xml_and_save_files(
            request.files,
            camera_type,
        )
        if error:
            return None, None, error

        data = {
            "license_plate": license_plate,
            "image_paths": saved_files,
        }
        if source_ip:
            data["source_ip"] = source_ip
        return data, license_plate, None

    data = request.get_json(silent=True) or {}
    license_plate = _normalize_plate(data.get("license_plate"))

    if not license_plate:
        return None, None, "license_plate missing"

    data["license_plate"] = license_plate
    return data, license_plate, None


def register_camera_routes(app):
    @app.route("/entry-anpr", methods=["POST"])
    @app.route("/api/register/entry-anpr", methods=["POST"])
    def receive_entry_data():
        data, license_plate, error = _read_camera_payload("entry")

        if error:
            return jsonify({"status": "error", "message": error}), 400

        source_ip = data.get("source_ip") or _get_request_source_ip()
        data["source_ip"] = source_ip
        data["gate_name"] = _resolve_gate_name_from_source_ip(source_ip, "entry")
        data["camera_type"] = "ENTRY CAMERA"
        log_info(
            f"Entry camera received: plate={license_plate}, source_ip={source_ip}, gate_name={data.get('gate_name')}, "
            f"camera_type={data.get('camera_type')}"
        )
        entry_queue.put(data)
        print(f"[CAMERA] Entry received: {license_plate} | Queue size: {entry_queue.qsize()}")

        return jsonify({
            "status": "received",
            "camera": "entry",
            "data": data,
            "license_plate": license_plate,
        }), 200

    @app.route("/exit-anpr", methods=["POST"])
    @app.route("/api/register/exit-anpr", methods=["POST"])
    def receive_exit_data():
        data, license_plate, error = _read_camera_payload("exit")

        if error:
            return jsonify({"status": "error", "message": error}), 400

        source_ip = data.get("source_ip") or _get_request_source_ip()
        data["source_ip"] = source_ip
        data["gate_name"] = _resolve_gate_name_from_source_ip(source_ip, "exit")
        data["camera_type"] = "EXIT CAMERA"
        log_info(
            f"Exit camera received: plate={license_plate}, source_ip={source_ip}, gate_name={data.get('gate_name')}, "
            f"camera_type={data.get('camera_type')}"
        )
        exit_queue.put(data)
        print(f"[CAMERA] Exit received: {license_plate} | Queue size: {exit_queue.qsize()}")

        return jsonify({
            "status": "received",
            "camera": "exit",
            "data": data,
            "license_plate": license_plate,
        }), 200


def process_entry_data(app):
    while True:
        try:
            data = entry_queue.get(timeout=1)
            with app.app_context():
                license_plate = data.get("license_plate")
                if license_plate and license_plate.lower() != "unknown":
                    if not is_duplicate_entry(license_plate):
                        print(f"[ENTRY PROCESS] Processing: {license_plate}")
                        handle_anpr_entry(data)
                    else:
                        print(f"[ENTRY PROCESS] Duplicate ignored: {license_plate}")
                else:
                    print(f"[ENTRY PROCESS] Error: License plate missing in data: {data}")
            entry_queue.task_done()
        except queue.Empty:
            continue
        except Exception as exc:
            print(f"[ENTRY PROCESS] Critical Error: {str(exc)}")
            time.sleep(1)


def process_exit_data(app):
    while True:
        try:
            data = exit_queue.get(timeout=1)
            with app.app_context():
                license_plate = data.get("license_plate")
                if license_plate and license_plate.lower() != "unknown":
                    print(f"[EXIT PROCESS] Processing: {license_plate}")
                    handle_anpr_exit(data)
            exit_queue.task_done()
        except queue.Empty:
            continue
        except Exception as exc:
            print(f"[EXIT PROCESS] Critical Error: {str(exc)}")
            time.sleep(1)


def start_camera_listeners(app):
    threading.Thread(target=process_entry_data, args=(app,), daemon=True).start()
    threading.Thread(target=process_exit_data, args=(app,), daemon=True).start()
