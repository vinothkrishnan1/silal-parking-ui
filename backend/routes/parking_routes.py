from flask import Blueprint, jsonify
from models import Vehicle, TenantSubscription, ParkingSettings, db
from datetime import datetime
from sqlalchemy import func
import traceback

parking_bp = Blueprint('parking_bp', __name__)

@parking_bp.route('/slot-status', methods=['GET'])
def get_slot_status():
    try:
        settings = ParkingSettings.query.first()
        if not settings:
            settings = ParkingSettings(
                total_visitor_slots=100,
                total_tenant_slots=100,
                visitor_reserved=0,
                tenant_reserved=0
            )
            db.session.add(settings)
            db.session.commit()
            
        # Visitor & Staff counts
        visitor_total = settings.total_visitor_slots
        visitor_occupied = Vehicle.query.filter(
            Vehicle.status == 'in',
            Vehicle.vehicle_category.in_(['Visitor', 'Staff'])
        ).count()
        
        if settings.visitor_occupied_override is not None:
            visitor_occupied = settings.visitor_occupied_override
            
        visitor_reserved = settings.visitor_reserved
        visitor_available = max(0, visitor_total - visitor_occupied - visitor_reserved)
        
        # Tenant counts
        tenant_total = settings.total_tenant_slots
        tenant_occupied = Vehicle.query.filter(
            Vehicle.status == 'in',
            Vehicle.vehicle_category == 'Tenant'
        ).count()
        
        if settings.tenant_occupied_override is not None:
            tenant_occupied = settings.tenant_occupied_override
            
        tenant_reserved = settings.tenant_reserved
        tenant_available = max(0, tenant_total - tenant_occupied - tenant_reserved)
        
        # Grand total
        total = visitor_total + tenant_total
        occupied = visitor_occupied + tenant_occupied
        reserved = visitor_reserved + tenant_reserved
        available = visitor_available + tenant_available
        
        return jsonify({
            'total': total,
            'occupied': occupied,
            'reserved': reserved,
            'available': available,
            'visitor': {
                'total': visitor_total,
                'occupied': visitor_occupied,
                'reserved': visitor_reserved,
                'available': visitor_available
            },
            'tenant': {
                'total': tenant_total,
                'occupied': tenant_occupied,
                'reserved': tenant_reserved,
                'available': tenant_available
            }
        }), 200
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
