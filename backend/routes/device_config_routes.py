from flask import Blueprint, request
from sqlalchemy import inspect, text

from extensions import db
from models import DeviceConfig
from services.device_config_services import (
    add_device,
    edit_device,
    delete_device,
    get_all_devices,
    get_device_status,
)

device_bp = Blueprint("device", __name__, url_prefix="/api/device_config")


def ensure_device_config_schema():
    inspector = inspect(db.engine)
    table_name = DeviceConfig.__tablename__

    if not inspector.has_table(table_name):
        DeviceConfig.__table__.create(bind=db.engine, checkfirst=True)
        return

    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    schema_updates = []

    if "device_name" not in existing_columns:
        schema_updates.append("ALTER TABLE device_config ADD COLUMN device_name VARCHAR(100) NULL")
    if "gate_name" not in existing_columns:
        schema_updates.append("ALTER TABLE device_config ADD COLUMN gate_name VARCHAR(100) NULL")
    if "gate_type" not in existing_columns:
        schema_updates.append("ALTER TABLE device_config ADD COLUMN gate_type VARCHAR(50) NULL DEFAULT 'Unrestricted'")

    if not schema_updates:
        return

    with db.engine.begin() as connection:
        for statement in schema_updates:
            connection.execute(text(statement))


@device_bp.route("/add-new-device", methods=["POST"])
def add_new_device():
    return add_device(request.get_json() or {})


@device_bp.route("/edit-device/<int:device_id>", methods=["PUT"])
def edit_device_route(device_id):
    return edit_device(request.get_json() or {}, device_id)


@device_bp.route("/delete-device/<int:device_id>", methods=["DELETE"])
def delete_device_route(device_id):
    return delete_device(device_id)


@device_bp.route("/get-devices", methods=["GET"])
def get_devices():
    return get_all_devices()


@device_bp.route("/check-device-status", methods=["GET"])
def check_device_status():
    ip_address = request.args.get("ip_address")
    port = request.args.get("port")
    return get_device_status(ip_address, port)
