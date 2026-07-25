from extensions import socketio, db
from models import Vehicle, ParkingSettings
import traceback

def get_current_slot_status():
    """Helper to fetch status using the same logic as the API"""
    try:
        from models import WaivedUser, VisitorSubscription, VisitorVehicle, SUBSCRIPTION_STATUS_ACTIVE
        from datetime import datetime
        today = datetime.now().date()

        settings = ParkingSettings.query.first()
        if not settings:
            return None
            
        visitor_total = settings.total_visitor_slots or 0
        
        all_staff = WaivedUser.query.all()
        active_staff_count = 0
        for staff in all_staff:
            v_from = staff.valid_from.date() if isinstance(staff.valid_from, datetime) else staff.valid_from
            v_until = staff.valid_until.date() if isinstance(staff.valid_until, datetime) else staff.valid_until
            if v_from and today < v_from:
                continue
            if v_until and today > v_until:
                continue
            active_staff_count += 1

        occupied_staff = Vehicle.query.filter_by(status='in', vehicle_category='Staff').count()
        reserved_staff = max(0, active_staff_count - occupied_staff)

        active_vis_subs = VisitorSubscription.query.filter(
            VisitorSubscription.status == SUBSCRIPTION_STATUS_ACTIVE,
            VisitorSubscription.start_date <= today,
            VisitorSubscription.end_date >= today
        ).all()
        total_vis_sub_allocated = sum((sub.allocated_slots or 1) for sub in active_vis_subs)

        visitor_vehicles_in = Vehicle.query.filter(Vehicle.status == 'in', Vehicle.vehicle_category == 'Visitor').all()
        
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

        reserved_visitor_sub = max(0, total_vis_sub_allocated - occupied_visitor_sub)

        occupied_global = occupied_visitor + occupied_staff + occupied_visitor_sub
        reserved_global = reserved_staff + reserved_visitor_sub
        available_global = max(0, visitor_total - occupied_global - reserved_global)
        
        # Tenant counts
        tenant_total = settings.total_tenant_slots or 0
        tenant_occupied = Vehicle.query.filter_by(status='in', vehicle_category='Tenant').count()
        if settings.tenant_occupied_override is not None:
            tenant_occupied = settings.tenant_occupied_override
            
        tenant_reserved = settings.tenant_reserved or 0
        tenant_available = max(0, tenant_total - tenant_occupied - tenant_reserved)
        
        total = visitor_total + tenant_total
        occupied = occupied_global + tenant_occupied
        reserved = reserved_global + tenant_reserved
        available = available_global + tenant_available
        
        return {
            'total': total,
            'occupied': occupied,
            'reserved': reserved,
            'available': available,
            'visitor': {
                'total': visitor_total,
                'occupied': occupied_visitor,
                'reserved': 0,
                'available': available_global
            },
            'staff': {
                'total': visitor_total,
                'occupied': occupied_staff,
                'reserved': reserved_staff,
                'available': available_global
            },
            'visitor_sub': {
                'total': visitor_total,
                'occupied': occupied_visitor_sub,
                'reserved': reserved_visitor_sub,
                'available': available_global
            },
            'tenant': {
                'total': tenant_total,
                'occupied': tenant_occupied,
                'reserved': tenant_reserved,
                'available': tenant_available
            }
        }
    except Exception:
        print(traceback.format_exc())
        return None

def broadcast_slot_status():
    """Broadcast the current slot status to all connected clients"""
    status = get_current_slot_status()
    if status:
        socketio.emit('slot_status_update', status)
        print(f"[DEBUG] Broadcasted slot status update via WebSocket")

def broadcast_vehicle_event(event_type, data):
    """Broadcast a new vehicle entry or exit event"""
    socketio.emit('vehicle_event', {
        'type': event_type,
        'data': data
    })
    print(f"[DEBUG] Broadcasted vehicle {event_type} event via WebSocket")

@socketio.on('connect')
def handle_connect():
    print("[INFO] Client connected to WebSocket")
    status = get_current_slot_status()
    if status:
        socketio.emit('slot_status_update', status)
