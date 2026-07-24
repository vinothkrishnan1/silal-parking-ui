from flask import Blueprint, jsonify, request
from models import Vehicle, Tenant, ParkingSettings, Location, db
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
            
            master_visitor_total = settings.total_visitor_slots or 0
            visitor_reserved = settings.visitor_reserved or 0
            total_tenant = settings.total_tenant_slots or 0
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
            
            master_visitor_total = sum((s.total_visitor_slots or 0) for s in settings_to_sum)
            visitor_reserved = sum((s.visitor_reserved or 0) for s in settings_to_sum)
            total_tenant = sum((s.total_tenant_slots or 0) for s in settings_to_sum)
            tenant_reserved = sum((s.tenant_reserved or 0) for s in settings_to_sum)
            
        # Dynamic capacities
        from models import WaivedUser, VisitorSubscription, SUBSCRIPTION_STATUS_ACTIVE, VisitorVehicle
        from datetime import datetime
        from sqlalchemy import or_
        today = datetime.utcnow().date()
        
        # Dynamic count
        occupied_staff = base_vehicle_query.filter_by(status='in', vehicle_category='Staff').count()
        
        visitor_vehicles_in = base_vehicle_query.filter(Vehicle.status == 'in', Vehicle.vehicle_category == 'Visitor').all()
        
        occupied_visitor = 0
        occupied_visitor_sub = 0
        for v in visitor_vehicles_in:
            vv = VisitorVehicle.query.filter_by(license_plate=v.license_plate).first()
            has_sub = False
            if vv:
                active_sub = VisitorSubscription.query.filter(
                    VisitorSubscription.visitor_id == vv.visitor_id,
                    VisitorSubscription.status == SUBSCRIPTION_STATUS_ACTIVE,
                    VisitorSubscription.start_date <= today,
                    VisitorSubscription.end_date >= today
                ).first()
                if active_sub:
                    has_sub = True
                    
            if has_sub:
                occupied_visitor_sub += 1
            else:
                occupied_visitor += 1
                
        total_global = master_visitor_total
        occupied_global = occupied_visitor + occupied_staff + occupied_visitor_sub
        available_global = max(0, total_global - occupied_global - visitor_reserved)
        
        occupied_tenant = base_vehicle_query.filter_by(status='in', vehicle_category='Tenant').count()
        available_tenant = max(0, total_tenant - occupied_tenant - tenant_reserved)
        
        return jsonify({
            'visitor': {
                'total': total_global,
                'occupied': occupied_visitor,
                'reserved': visitor_reserved,
                'available': available_global,
                'occupancy_rate': round((occupied_visitor / total_global * 100), 1) if total_global > 0 else 0
            },
            'staff': {
                'total': total_global,
                'occupied': occupied_staff,
                'reserved': visitor_reserved,
                'available': available_global,
                'occupancy_rate': round((occupied_staff / total_global * 100), 1) if total_global > 0 else 0
            },
            'visitor_sub': {
                'total': total_global,
                'occupied': occupied_visitor_sub,
                'reserved': visitor_reserved,
                'available': available_global,
                'occupancy_rate': round((occupied_visitor_sub / total_global * 100), 1) if total_global > 0 else 0
            },
            'tenant': {
                'total': total_tenant,
                'occupied': occupied_tenant,
                'reserved': tenant_reserved,
                'available': available_tenant,
                'occupancy_rate': round((occupied_tenant / total_tenant * 100), 1) if total_tenant > 0 else 0
            },
            'overall': {
                'total': total_global + total_tenant,
                'occupied': occupied_global + occupied_tenant,
                'reserved': visitor_reserved + tenant_reserved,
                'available': available_global + available_tenant
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
