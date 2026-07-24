from datetime import date, datetime

from flask import Blueprint, request, jsonify
from sqlalchemy import inspect, text

from extensions import db
from models import WaivedUser
import logging

logger = logging.getLogger(__name__)

staff_bp = Blueprint('staff_bp', __name__)


def format_date_value(value):
    return value.isoformat() if value else None


def parse_date_value(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    text_value = str(value).strip()
    for date_format in ('%Y-%m-%d', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(text_value, date_format).date()
        except ValueError:
            continue

    raise ValueError(f"Invalid date format: {value}")


def serialize_staff_member(staff):
    vehicles = []
    if staff.license_plate:
        plates = [plate.strip() for plate in staff.license_plate.split(',') if plate.strip()]
        vehicles = [{'plateNumber': plate} for plate in plates]

    return {
        'id': str(staff.id),
        'passId': staff.waiver_id,
        'staffName': staff.name,
        'department': staff.waiver_category,
        'designation': staff.reason,
        'mobileNumber': staff.mobile_number,
        'validFrom': format_date_value(staff.valid_from),
        'validUntil': format_date_value(staff.valid_until),
        'status': 'active',
        'vehicles': vehicles
    }


def ensure_staff_pass_schema():
    inspector = inspect(db.engine)
    table_name = WaivedUser.__tablename__

    if not inspector.has_table(table_name):
        WaivedUser.__table__.create(bind=db.engine, checkfirst=True)
        logger.info("Created missing waived_users table.")
        return

    existing_columns = {column['name'] for column in inspector.get_columns(table_name)}
    schema_updates = []

    if 'mobile_number' not in existing_columns:
        schema_updates.append("ALTER TABLE waived_users ADD COLUMN mobile_number VARCHAR(30) NULL")
    if 'valid_from' not in existing_columns:
        schema_updates.append("ALTER TABLE waived_users ADD COLUMN valid_from DATE NULL")
    if 'valid_until' not in existing_columns:
        schema_updates.append("ALTER TABLE waived_users ADD COLUMN valid_until DATE NULL")

    if not schema_updates:
        return

    with db.engine.begin() as connection:
        for statement in schema_updates:
            connection.execute(text(statement))

    logger.info("Updated waived_users schema with missing staff pass columns.")

@staff_bp.route('/', methods=['GET'])
def get_staff():
    try:
        staff_members = WaivedUser.query.all()
        return jsonify([serialize_staff_member(staff) for staff in staff_members]), 200
    except Exception as e:
        logger.error(f"Error fetching staff: {e}")
        return jsonify({'error': str(e)}), 500

@staff_bp.route('/', methods=['POST'])
def create_staff():
    try:
        data = request.json or {}
        vehicles = data.get('vehicles', [])
        plate_str = ','.join([v.get('plateNumber', '').strip() for v in vehicles if v.get('plateNumber', '').strip()])

        new_staff = WaivedUser(
            name=data.get('staffName'),
            waiver_id=data.get('passId'),
            waiver_category=data.get('department'),
            reason=data.get('designation'),
            license_plate=plate_str,
            mobile_number=data.get('mobileNumber'),
            valid_from=parse_date_value(data.get('validFrom')),
            valid_until=parse_date_value(data.get('validUntil'))
        )

        db.session.add(new_staff)
        db.session.commit()
        try:
            from services.parking_broadcast import broadcast_slot_status
            broadcast_slot_status()
        except Exception:
            pass
        
        return jsonify({
            'message': 'Staff pass created successfully',
            'id': new_staff.id,
            'staffPass': serialize_staff_member(new_staff)
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating staff: {e}")
        return jsonify({'error': str(e)}), 500

@staff_bp.route('/<int:staff_id>', methods=['PUT'])
def update_staff(staff_id):
    try:
        data = request.json or {}
        staff = WaivedUser.query.get(staff_id)
        
        if not staff:
            return jsonify({'error': 'Staff pass not found'}), 404

        vehicles = data.get('vehicles', [])
        plate_str = ','.join([v.get('plateNumber', '').strip() for v in vehicles if v.get('plateNumber', '').strip()])

        staff.name = data.get('staffName', staff.name)
        staff.waiver_id = data.get('passId', staff.waiver_id)
        staff.waiver_category = data.get('department', staff.waiver_category)
        staff.reason = data.get('designation', staff.reason)
        staff.license_plate = plate_str
        staff.mobile_number = data.get('mobileNumber', staff.mobile_number)
        staff.valid_from = parse_date_value(data.get('validFrom')) if 'validFrom' in data else staff.valid_from
        staff.valid_until = parse_date_value(data.get('validUntil')) if 'validUntil' in data else staff.valid_until

        db.session.commit()
        try:
            from services.parking_broadcast import broadcast_slot_status
            broadcast_slot_status()
        except Exception:
            pass

        return jsonify({
            'message': 'Staff pass updated successfully',
            'staffPass': serialize_staff_member(staff)
        })
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating staff: {e}")
        return jsonify({'error': str(e)}), 500

@staff_bp.route('/<int:staff_id>', methods=['DELETE'])
def delete_staff(staff_id):
    try:
        staff = WaivedUser.query.get(staff_id)
        if not staff:
            return jsonify({'error': 'Staff pass not found'}), 404

        db.session.delete(staff)
        db.session.commit()
        try:
            from services.parking_broadcast import broadcast_slot_status
            broadcast_slot_status()
        except Exception:
            pass

        return jsonify({'message': 'Staff pass deleted successfully'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting staff: {e}")
        return jsonify({'error': str(e)}), 500
