from flask import Blueprint, jsonify
from models import db, Vehicle, Tenant, TenantVehicle
from sqlalchemy import func, case, desc, inspect, text

vehicle_bp = Blueprint('vehicle_bp', __name__)


def ensure_vehicle_payment_schema():
    inspector = inspect(db.engine)
    table_name = Vehicle.__tablename__

    if not inspector.has_table(table_name):
        return

    existing_columns = {column['name'] for column in inspector.get_columns(table_name)}
    if 'payment_processed_at' in existing_columns:
        return

    with db.engine.begin() as connection:
        connection.execute(text("ALTER TABLE vehicles ADD COLUMN payment_processed_at DATETIME NULL"))

@vehicle_bp.route('/current', methods=['GET'])
def get_current_vehicles():
    """
    Returns a list of all vehicles currently in the parking area (status='in').
    """
    vehicles = Vehicle.query.filter_by(status='in').order_by(Vehicle.entry_time.desc()).all()
    
    result = []
    for v in vehicles:
        result.append({
            'id': str(v.id),
            'license_plate': v.license_plate,
            'vehicleNumber': v.license_plate,
            'entryTime': v.entry_time.strftime('%Y-%m-%d %H:%M:%S'),
            'type': v.vehicle_category or 'Visitor',
            'vehicle_category': v.vehicle_category or 'Visitor',
            'plateImage': 'https://placehold.co/300x100/333/white?text=' + v.license_plate,
            'exitTime': None,
            'paymentProcessedTime': v.payment_processed_at.strftime('%Y-%m-%d %H:%M:%S') if v.payment_processed_at else None,
            'paymentStatus': v.payment_status
        })
    
    return jsonify(result), 200

@vehicle_bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    """
    Returns metrics for the dashboard.
    """
    try:
        from models import ParkingSettings, TenantSubscription
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 1. Slot Stats (Grouped: Visitor+Staff vs Tenant)
        settings = ParkingSettings.query.first()
        if not settings:
            settings = ParkingSettings(total_visitor_slots=100, total_tenant_slots=100)
            db.session.add(settings)
            db.session.commit()
            
        total_visitor_staff = settings.total_visitor_slots
        total_tenant = settings.total_tenant_slots
        visitor_reserved = settings.visitor_reserved or 0
        tenant_reserved = settings.tenant_reserved or 0
        
        # Dynamic counts
        occupied_visitor_staff = Vehicle.query.filter(
            Vehicle.status == 'in',
            Vehicle.vehicle_category.in_(['Visitor', 'Staff'])
        ).count()
        occupied_tenant = Vehicle.query.filter_by(status='in', vehicle_category='Tenant').count()
        
        available_visitor_staff = max(0, total_visitor_staff - occupied_visitor_staff - visitor_reserved)
        available_tenant = max(0, total_tenant - occupied_tenant - tenant_reserved)
        
        total_slots = total_visitor_staff + total_tenant
        occupied_count = occupied_visitor_staff + occupied_tenant
        available_count = available_visitor_staff + available_tenant
        total_reserved = visitor_reserved + tenant_reserved
        
        # 2. Entry/Exit Stats
        entered_today = Vehicle.query.filter(Vehicle.entry_time >= today_start).count()
        exited_today = Vehicle.query.filter(Vehicle.exit_time >= today_start).count()
        
        # 3. Revenue (Today)
        visitor_revenue = db.session.query(func.sum(Vehicle.payable_amount)).filter(
            Vehicle.exit_time >= today_start,
            Vehicle.payment_status == 'paid'
        ).scalar() or 0.0
        
        sub_revenue = db.session.query(func.sum(TenantSubscription.amount_paid)).filter(
            TenantSubscription.created_at >= today_start
        ).scalar() or 0.0
        
        total_revenue = visitor_revenue + sub_revenue
        
        # 4. Vehicle Flow (Last 24 hours)
        vehicle_flow = []
        for i in range(24):
            hour_start = today_start + timedelta(hours=i)
            hour_end = today_start + timedelta(hours=i+1)
            
            entries = Vehicle.query.filter(Vehicle.entry_time >= hour_start, Vehicle.entry_time < hour_end).count()
            exits = Vehicle.query.filter(Vehicle.exit_time >= hour_start, Vehicle.exit_time < hour_end).count()
            
            vehicle_flow.append({
                'time': hour_start.strftime('%H:00'),
                'entries': entries,
                'exits': exits
            })
            
        # 5. Vehicle Type Distribution (Current)
        staff_count = Vehicle.query.filter_by(status='in', vehicle_category='Staff').count()
        tenant_count = Vehicle.query.filter_by(status='in', vehicle_category='Tenant').count()
        visitor_count = Vehicle.query.filter_by(status='in', vehicle_category='Visitor').count()
        
        total_current = occupied_count if occupied_count > 0 else 1
        staff_pct = round((staff_count / total_current) * 100)
        tenant_pct = round((tenant_count / total_current) * 100)
        visitor_pct = 100 - staff_pct - tenant_pct

        # 6. Most Active Time
        most_active_time = "N/A"
        max_flow = -1
        for hour in vehicle_flow:
            flow = hour['entries'] + hour['exits']
            if flow > max_flow:
                max_flow = flow
                h = int(hour['time'].split(':')[0])
                most_active_time = f"{h:02d}:00 - {h+1:02d}:00"

        # 7. Recent Activity
        recent_vehicles = Vehicle.query.order_by(desc(case(
            (Vehicle.exit_time != None, Vehicle.exit_time),
            else_=Vehicle.entry_time
        ))).limit(3).all()
        
        recent_activity = []
        for v in recent_vehicles:
            if v.exit_time:
                msg = f"{v.license_plate} exited"
                time_val = v.exit_time
            else:
                msg = f"{v.license_plate} entered"
                time_val = v.entry_time
            
            # Simple "ago" calculation
            diff = now - time_val
            if diff.total_seconds() < 60:
                ago = "just now"
            elif diff.total_seconds() < 3600:
                ago = f"{int(diff.total_seconds() // 60)}m ago"
            else:
                ago = f"{int(diff.total_seconds() // 3600)}h ago"
                
            recent_activity.append({
                'message': msg,
                'ago': ago,
                'type': 'exit' if v.exit_time else 'entry'
            })

        return jsonify({
            'availableSlots': available_count,
            'occupiedSlots': occupied_count,
            'totalSlots': total_slots,
            'totalReserved': total_reserved,
            'visitor': {
                'total': total_visitor_staff,
                'occupied': occupied_visitor_staff,
                'available': available_visitor_staff,
                'reserved': visitor_reserved
            },
            'tenant': {
                'total': total_tenant,
                'occupied': occupied_tenant,
                'available': available_tenant,
                'reserved': tenant_reserved
            },
            'currentVehicles': occupied_count,
            'enteredToday': entered_today,
            'exitedToday': exited_today,
            'revenueToday': total_revenue,
            'vehicleFlow': vehicle_flow,
            'typeDistribution': {
                'staff': staff_pct,
                'tenant': tenant_pct,
                'visitor': visitor_pct,
                'staff_count': staff_count,
                'tenant_count': tenant_count,
                'visitor_count': visitor_count
            },
            'mostActiveTime': most_active_time,
            'recentActivity': recent_activity
        }), 200
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@vehicle_bp.route('/reports', methods=['GET'])
def get_reports():
    """
    Returns a list of vehicles for reports with filtering and sorting.
    """
    try:
        from flask import request
        from datetime import datetime
        
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        search = request.args.get('search', '')
        vehicle_type = request.args.get('type', 'all') # Staff, Visitor, Tenant
        
        query = Vehicle.query
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            query = query.filter(Vehicle.entry_time >= start_date)
            
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            query = query.filter(Vehicle.entry_time <= end_date)
            
        if search:
            query = query.filter(Vehicle.license_plate.ilike(f'%{search}%'))
            
        if vehicle_type != 'all':
            query = query.filter(Vehicle.vehicle_category == vehicle_type)
            
        vehicles = query.order_by(Vehicle.entry_time.desc()).all()
        
        result = []
        for v in vehicles:
            duration_str = "-"
            if v.entry_time:
                end_time = v.exit_time or datetime.utcnow()
                diff = end_time - v.entry_time
                hours = int(diff.total_seconds() // 3600)
                minutes = int((diff.total_seconds() % 3600) // 60)
                duration_str = f"{hours}h {minutes}m"
                
            result.append({
                'id': v.id,
                'vehicleNumber': v.license_plate,
                'entryTime': v.entry_time.strftime('%Y-%m-%d %H:%M:%S') if v.entry_time else None,
                'exitTime': v.exit_time.strftime('%Y-%m-%d %H:%M:%S') if v.exit_time else None,
                'type': v.vehicle_category or 'Visitor',
                'status': 'Exited' if v.exit_time else 'Inside',
                'duration': duration_str,
                'paymentMode': v.payment_mode.capitalize() if v.payment_mode else '-',
                'paymentAmount': f"{v.payable_amount:.3f}" if v.payable_amount is not None else "0.000",
                'paymentStatus': v.payment_status.capitalize() if v.payment_status else 'Pending',
                'collectedBy': v.verifier.username if v.verifier else ('System' if v.payment_status == 'paid' else '-')
            })
            
        return jsonify(result), 200
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
