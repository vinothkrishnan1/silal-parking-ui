from extensions import socketio, db
from models import Vehicle, ParkingSettings
import traceback

def get_current_slot_status():
    """Helper to fetch status using the same logic as the API"""
    try:
        settings = ParkingSettings.query.first()
        if not settings:
            return None
            
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
        
        return {
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
