import eventlet
eventlet.monkey_patch()

from flask import Flask, jsonify, send_from_directory, request
from extensions import db, socketio
from routes.auth_routes import auth_bp
from flask_cors import CORS
import os
from pathlib import Path
from services.create_admin import create_initial_admin
from services.camera_listener import register_camera_routes, start_camera_listeners
from routes.kiosk_routes import register_kiosk_routes
from routes.led_routes import register_led_routes
from routes.on_exit_routes import register_on_exit_routes
from services.on_exit_services import update_payment_status, exit_ping_on_exit, get_last_exit_gate_name
from services.door_controller import DoorController
from routes.tenant_routes import tenant_bp, ensure_tenant_schema
from routes.vehicle_routes import vehicle_bp, ensure_vehicle_payment_schema
from routes.pricing_routes import pricing_bp
from routes.slot_routes import slot_bp
from routes.parking_routes import parking_bp
from routes.device_config_routes import device_bp, ensure_device_config_schema
from routes.location_routes import location_bp
from routes.visitor_routes import visitor_bp
from routes.payment_routes import payment_bp
from services.parking_broadcast import broadcast_slot_status
from services.subscription_status_service import register_subscription_status_lifespan
from models import DeviceConfig
from debug_logger import log_info
from sqlalchemy import func

def create_app():
    frontend_dist = Path(__file__).resolve().parent.parent / 'dist'
    app = Flask(__name__)

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config.from_prefixed_env()

    CORS(app)

    db.init_app(app)
    socketio.init_app(app)

    db_path = r'C:\ProgramData\MySQL\MySQL Server 9.3\Data\pro_parking'
    with app.app_context():
        if db.engine.url.drivername == 'sqlite' and not os.path.exists(db_path):
            db.create_all()
            print("Database created.")

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(tenant_bp, url_prefix='/api/tenants')
    app.register_blueprint(vehicle_bp, url_prefix='/api/vehicles')
    app.register_blueprint(pricing_bp, url_prefix='/api/pricing')
    app.register_blueprint(slot_bp, url_prefix='/api/slot')
    app.register_blueprint(parking_bp, url_prefix='/api/parking')
    app.register_blueprint(device_bp)
    app.register_blueprint(location_bp, url_prefix='/api/locations')
    app.register_blueprint(visitor_bp, url_prefix='/api/visitors')
    app.register_blueprint(payment_bp, url_prefix='/api/payment')

    @app.route("/api/config/features", methods=["GET"])
    def get_features():
        enable_tenant_subscription = os.getenv('ENABLE_TENANT_SUBSCRIPTION', 'False').lower() in ('true', '1', 't')
        return jsonify({"enable_tenant_subscription": enable_tenant_subscription})

    from routes.staff_routes import staff_bp, ensure_staff_pass_schema
    app.register_blueprint(staff_bp, url_prefix='/api/staff-passes')
    from routes.pricing_routes import ensure_pricing_schema
    with app.app_context():
        ensure_tenant_schema()
        ensure_vehicle_payment_schema()
        ensure_staff_pass_schema()
        ensure_device_config_schema()
        ensure_pricing_schema()

    create_initial_admin(app)
    register_subscription_status_lifespan(app)
    register_camera_routes(app)
    register_kiosk_routes(app)
    register_led_routes(app)
    start_camera_listeners(app)
    register_on_exit_routes(app)


    def get_camera_devices():
        return DeviceConfig.query.filter(
            DeviceConfig.device_type.in_(["ENTRY CAMERA", "EXIT CAMERA"])
        ).order_by(DeviceConfig.id.asc()).all()

    def get_device_by_id(device_id):
        if not device_id:
            return None
        try:
            device_id = int(device_id)
        except (TypeError, ValueError):
            return None
        return DeviceConfig.query.filter_by(id=device_id).first()

    def get_device_by_gate_name(gate_name):
        if not gate_name:
            return None

        normalized_gate_name = str(gate_name).strip().lower()
        if not normalized_gate_name:
            return None

        return DeviceConfig.query.filter(
            func.lower(DeviceConfig.gate_name) == normalized_gate_name,
        ).order_by(DeviceConfig.id.asc()).first()

    def resolve_open_device(payload):
        payload = payload or {}

        for field in ("device_id", "ip_address", "source_ip"):
            value = payload.get(field)
            if not value:
                continue

            if field == "device_id":
                device = get_device_by_id(value)
            else:
                device = DeviceConfig.query.filter(DeviceConfig.ip_address == value).first()

            if device:
                return device, f"by-{field}"

        gate_name = payload.get("gate_name")
        if gate_name:
            device = get_device_by_gate_name(gate_name)
            if device:
                return device, "by-gate"

        device_type = str(payload.get("device_type") or payload.get("camera_type") or "").strip().upper()
        if device_type in {"ENTRY", "ENTRY CAMERA"}:
            device = DeviceConfig.query.filter_by(device_type="ENTRY CAMERA").order_by(DeviceConfig.id.asc()).first()
            if device:
                return device, "by-type"
        if device_type in {"EXIT", "EXIT CAMERA"}:
            device = DeviceConfig.query.filter_by(device_type="EXIT CAMERA").order_by(DeviceConfig.id.asc()).first()
            if device:
                return device, "by-type"

        return None, None

    def trigger_barrier_open(route_name, payload):
        device, source_kind = resolve_open_device(payload)
        log_info(
            f"{route_name} request: payload={payload}, resolved_source={source_kind}, "
            f"device_id={getattr(device, 'id', None)}, device_type={getattr(device, 'device_type', None)}, "
            f"device_name={getattr(device, 'device_name', None)}, gate_name={getattr(device, 'gate_name', None)}, "
            f"ip_address={getattr(device, 'ip_address', None)}, port={getattr(device, 'port', None)}"
        )

        if not device:
            log_info(f"{route_name} response: no controller or camera device configured")
            return jsonify({"error": "No boom barrier device configured"}), 404

        controller = DoorController(device.ip_address, port=device.port)
        result, status_code = controller.open_and_auto_close(delay_seconds=boom_barrier_delay)
        log_info(f"{route_name} response: status={status_code}, body={result}")
        return jsonify(result), status_code

    boom_barrier_delay = int(os.getenv("BOOM_BARRIER_CLOSE_DELAY", 15))

    @app.route("/api/boom-barrier/entry/open", methods=["POST"])
    def open_entry_boom_barrier():
        payload = request.get_json(silent=True) or {}
        payload.setdefault("device_type", "ENTRY CAMERA")
        payload.setdefault("barrier", "entry")
        return trigger_barrier_open("/api/boom-barrier/entry/open", payload)

    @app.route("/api/boom-barrier/exit/open", methods=["POST"])
    def open_exit_boom_barrier():
        payload = request.get_json(silent=True) or {}
        payload.setdefault("device_type", "EXIT CAMERA")
        payload.setdefault("barrier", "exit")
        return trigger_barrier_open("/api/boom-barrier/exit/open", payload)

    @app.route("/open-boom-barrier", methods=["POST"])
    def open_boom_barrier():
        data = request.get_json(silent=True) or {}
        if not data:
            data = {"device_type": "EXIT CAMERA", "barrier": "exit"}
        return trigger_barrier_open("/open-boom-barrier", data)

    if frontend_dist.exists():
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            if path.startswith(("api/", "auth/", "socket.io", "open-boom-barrier")):
                return {"message": "Resource not found"}, 404
            if path.startswith("assets/"):
                if not (frontend_dist / path).is_file():
                    return {"message": "Asset not found"}, 404
            if path and (frontend_dist / path).is_file():
                return send_from_directory(frontend_dist, path)
            
            response = send_from_directory(frontend_dist, 'index.html')
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response

    @app.errorhandler(404)
    def not_found_error(error):
        return {"message": "Resource not found"}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {"message": "Internal server error"}, 500

    return app


if __name__ == '__main__':
    app = create_app()
    socketio.run(app, host='0.0.0.0', port=8000, debug=True)
