import re

with open(r'g:\silal_market_pro_parking\backend\routes\slot_routes.py', 'r') as f:
    content = f.read()

new_content = """from flask import Blueprint, jsonify, request
from models import Vehicle, Tenant, ParkingSettings, Location, db
from datetime import datetime

slot_bp = Blueprint('slot_bp', __name__)

@slot_bp.route('/list-slot-details', methods=['GET'])
def list_slot_details():
    try:
        location_id = request.args.get('location_id')
        
        if location_id and location_id != 'all':
            location_id = int(location_id)
            settings = ParkingSettings.query.filter_by(location_id=location_id).first()
            if not settings:
                settings = ParkingSettings(location_id=location_id, total_visitor_slots=100, total_tenant_slots=100)
                db.session.add(settings)
                db.session.commit()
            
            total_visitor_staff = settings.total_visitor_slots
            visitor_reserved = settings.visitor_reserved or 0
            total_tenant = settings.total_tenant_slots
            tenant_reserved = settings.tenant_reserved or 0
            
            base_vehicle_query = Vehicle.query.filter_by(location_id=location_id)
        else:
            active_locations = Location.query.filter_by(is_active=True).all()
            active_location_ids = [loc.id for loc in active_locations]
            
            all_settings = ParkingSettings.query.all()
            location_specific_settings = [s for s in all_settings if s.location_id in active_location_ids]
            
            if location_specific_settings:
                settings_to_sum = location_specific_settings
                base_vehicle_query = Vehicle.query.filter(Vehicle.location_id.in_(active_location_ids))
            elif all_settings and not Location.query.count():
                settings_to_sum = [s for s in all_settings if s.location_id is None]
                base_vehicle_query = Vehicle.query
            else:
                settings = ParkingSettings(total_visitor_slots=0, total_tenant_slots=0)
                settings_to_sum = [settings]
                base_vehicle_query = Vehicle.query.filter(Vehicle.location_id.in_(active_location_ids)) if active_location_ids else Vehicle.query.filter(False)
            
            total_visitor_staff = sum(s.total_visitor_slots for s in settings_to_sum)
            total_tenant = sum(s.total_tenant_slots for s in settings_to_sum)
            visitor_reserved = sum((s.visitor_reserved or 0) for s in settings_to_sum)
            tenant_reserved = sum((s.tenant_reserved or 0) for s in settings_to_sum)
            
        # Dynamic count
        occupied_visitor_staff = base_vehicle_query.filter(
            Vehicle.status == 'in',
            Vehicle.vehicle_category.in_(['Visitor', 'Staff'])
        ).count()
        available_visitor_staff = max(0, total_visitor_staff - occupied_visitor_staff - visitor_reserved)
        
        occupied_tenant = base_vehicle_query.filter_by(status='in', vehicle_category='Tenant').count()
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
        location_id = data.get('location_id')
        if location_id and location_id != 'all':
            location_id = int(location_id)
            settings = ParkingSettings.query.filter_by(location_id=location_id).first()
            if not settings:
                settings = ParkingSettings(location_id=location_id)
                db.session.add(settings)
        else:
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
"""

with open(r'g:\silal_market_pro_parking\backend\routes\slot_routes.py', 'w') as f:
    f.write(new_content)
