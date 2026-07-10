from flask import Blueprint, jsonify, request
from models import Vehicle, Tenant, ParkingSettings, db
from datetime import datetime

slot_bp = Blueprint('slot_bp', __name__)

@slot_bp.route('/list-slot-details', methods=['GET'])
def list_slot_details():
    try:
        # 1. Get settings
        settings = ParkingSettings.query.first()
        if not settings:
            settings = ParkingSettings(total_visitor_slots=100, total_tenant_slots=100)
            db.session.add(settings)
            db.session.commit()
        
        # 2. Visitor & Staff Stats (Grouped)
        total_visitor_staff = settings.total_visitor_slots
        visitor_reserved = settings.visitor_reserved or 0
        
        # Dynamic count
        occupied_visitor_staff = Vehicle.query.filter(
            Vehicle.status == 'in',
            Vehicle.vehicle_category.in_(['Visitor', 'Staff'])
        ).count()
        available_visitor_staff = max(0, total_visitor_staff - occupied_visitor_staff - visitor_reserved)
        
        # 3. Tenant Stats (Separate)
        total_tenant = settings.total_tenant_slots
        tenant_reserved = settings.tenant_reserved or 0
        
        # Dynamic count
        occupied_tenant = Vehicle.query.filter_by(status='in', vehicle_category='Tenant').count()
        available_tenant = max(0, total_tenant - occupied_tenant - tenant_reserved)
        
        return jsonify({
            'visitor': {
                'total': total_visitor_staff,
                'occupied': occupied_visitor_staff,
                'reserved': visitor_reserved,
                'available': available_visitor_staff,
                'occupancy_rate': round((occupied_visitor_staff / total_visitor_staff * 100), 1) if total_visitor_staff > 0 else 0
            },
            'tenant': {
                'total': total_tenant,
                'occupied': occupied_tenant,
                'reserved': tenant_reserved,
                'available': available_tenant,
                'occupancy_rate': round((occupied_tenant / total_tenant * 100), 1) if total_tenant > 0 else 0
            },
            'overall': {
                'total': total_visitor_staff + total_tenant,
                'occupied': occupied_visitor_staff + occupied_tenant,
                'reserved': visitor_reserved + tenant_reserved,
                'available': available_visitor_staff + available_tenant
            }
        }), 200
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@slot_bp.route('/update-settings', methods=['POST'])
def update_settings():
    data = request.get_json()
    
    try:
        settings = ParkingSettings.query.first()
        if not settings:
            settings = ParkingSettings()
            db.session.add(settings)
            
        if 'total_visitor_slots' in data:
            settings.total_visitor_slots = int(data['total_visitor_slots'])
        if 'total_tenant_slots' in data:
            settings.total_tenant_slots = int(data['total_tenant_slots'])
        if 'visitor_reserved' in data:
            settings.visitor_reserved = int(data['visitor_reserved'])
        if 'tenant_reserved' in data:
            settings.tenant_reserved = int(data['tenant_reserved'])
            
        db.session.commit()
        from services.parking_broadcast import broadcast_slot_status
        broadcast_slot_status()
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
