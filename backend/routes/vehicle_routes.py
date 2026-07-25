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
    from models import VisitorVehicle, VisitorSubscription, WaivedUser, SUBSCRIPTION_STATUS_ACTIVE
    from datetime import datetime
    
    vehicles = Vehicle.query.filter_by(status='in').order_by(Vehicle.entry_time.desc()).all()
    
    today = datetime.now().date()
    result = []
    for v in vehicles:
        has_active_sub = False
        is_staff = False
        clean_plate = v.license_plate.replace(' ', '').lower() if v.license_plate else ''
        
        # Check active visitor subscription
        sub = db.session.query(VisitorSubscription).join(
            VisitorVehicle, VisitorSubscription.visitor_id == VisitorVehicle.visitor_id
        ).filter(
            func.replace(func.lower(VisitorVehicle.license_plate), ' ', '') == clean_plate,
            VisitorSubscription.status == SUBSCRIPTION_STATUS_ACTIVE,
            VisitorSubscription.start_date <= today,
            VisitorSubscription.end_date >= today
        ).first()

        if sub:
            has_active_sub = True

        # Check staff pass (WaivedUser)
        if v.vehicle_category == 'Staff' or (not has_active_sub and v.vehicle_category not in ('Tenant',)):
            staff = WaivedUser.query.filter(
                func.replace(func.lower(WaivedUser.license_plate), ' ', '').contains(clean_plate)
            ).all()
            for s in staff:
                v_from = s.valid_from.date() if isinstance(s.valid_from, datetime) else s.valid_from
                v_until = s.valid_until.date() if isinstance(s.valid_until, datetime) else s.valid_until
                if (not v_from or today >= v_from) and (not v_until or today <= v_until):
                    is_staff = True
                    break

        category = v.vehicle_category or 'Visitor'
        if has_active_sub:
            category = 'Subscriber'
        elif is_staff:
            category = 'Staff'
            
        result.append({
            'id': str(v.id),
            'license_plate': v.license_plate,
            'vehicleNumber': v.license_plate,
            'entryTime': v.entry_time.strftime('%Y-%m-%d %H:%M:%S'),
            'type': category,
            'vehicle_category': category,
            'plateImage': 'https://placehold.co/300x100/333/white?text=' + v.license_plate,
            'exitTime': None,
            'paymentProcessedTime': v.payment_processed_at.strftime('%Y-%m-%d %H:%M:%S') if v.payment_processed_at else None,
            'paymentStatus': 'waived' if (has_active_sub or is_staff or v.payment_status == 'waived') else v.payment_status,
            'hasActiveSubscription': has_active_sub or is_staff,
            'location_id': str(v.location_id) if v.location_id else None
        })
    
    return jsonify(result), 200

    
@vehicle_bp.route('/add', methods=['POST'])
def add_vehicle():
    try:
        from flask import request
        from datetime import datetime
        data = request.get_json()
        
        license_plate = data.get('vehicleNumber')
        vehicle_category = data.get('type', 'Visitor')
        location_id = data.get('location_id')
        
        if not license_plate:
            return jsonify({"status": "error", "message": "Vehicle number is required"}), 400
            
        # Check if already inside
        existing = Vehicle.query.filter_by(license_plate=license_plate, status='in').first()
        if existing:
            return jsonify({"status": "error", "message": "Vehicle is already inside"}), 400
            
        new_vehicle = Vehicle(
            license_plate=license_plate,
            vehicle_category=vehicle_category,
            location_id=location_id if location_id and location_id != 'all' else None,
            status='in',
            entry_time=datetime.utcnow()
        )
        
        db.session.add(new_vehicle)
        db.session.commit()
        
        from services.parking_broadcast import broadcast_slot_status
        broadcast_slot_status()
        
        return jsonify({"status": "success", "message": "Vehicle added successfully", "id": new_vehicle.id}), 201
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

@vehicle_bp.route('/check-registration', methods=['GET'])
def check_registration():
    try:
        from flask import request
        from datetime import datetime
        from models import VisitorSubscription, VisitorVehicle, TenantSubscription, TenantVehicle, WaivedUser
        from sqlalchemy import func
        
        plate = request.args.get('plate', '').strip()
        if not plate:
            return jsonify({"is_registered": False})
            
        clean_plate = plate.replace(' ', '').lower()
        today = datetime.now().date()
        
        # 1. Check Staff (WaivedUser)
        staff_matches = WaivedUser.query.filter(
            func.replace(func.lower(WaivedUser.license_plate), ' ', '').contains(clean_plate)
        ).all()
        for s in staff_matches:
            v_from = s.valid_from.date() if isinstance(s.valid_from, datetime) else s.valid_from
            v_until = s.valid_until.date() if isinstance(s.valid_until, datetime) else s.valid_until
            if (not v_from or today >= v_from) and (not v_until or today <= v_until):
                return jsonify({
                    "is_registered": True,
                    "type": "Staff",
                    "location_id": s.location_id
                })
                
        # 2. Check Visitor Subscription
        vis_sub = db.session.query(VisitorSubscription).join(VisitorVehicle, VisitorSubscription.visitor_id == VisitorVehicle.visitor_id).filter(
            func.replace(func.lower(VisitorVehicle.license_plate), ' ', '') == clean_plate,
            VisitorSubscription.start_date <= today,
            VisitorSubscription.end_date >= today,
            VisitorSubscription.status == 'active'
        ).first()
        if vis_sub:
            return jsonify({
                "is_registered": True,
                "type": "Subscriber",
                "location_id": vis_sub.location_id
            })
            
        # 3. Check Tenant Subscription
        tenant_sub = db.session.query(TenantSubscription).join(TenantVehicle, TenantSubscription.tenant_id == TenantVehicle.tenant_id).filter(
            func.replace(func.lower(TenantVehicle.license_plate), ' ', '') == clean_plate,
            TenantSubscription.start_date <= today,

            TenantSubscription.end_date >= today,
            TenantSubscription.status == 'active'
        ).first()
        if tenant_sub:
            # Note: We get the tenant location from the subscription's location_id if available,
            # else we can look at the Tenant directly, but the model has it.
            # However, TenantSubscription might not have location_id directly, let's assume it maps to Tenant.location_id
            from models import Tenant
            tenant = Tenant.query.get(tenant_sub.tenant_id)
            return jsonify({
                "is_registered": True,
                "type": "Tenant",
                "location_id": tenant.location_id if tenant else None
            })
            
        return jsonify({"is_registered": False})
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"is_registered": False, "error": str(e)})


@vehicle_bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    """
    Returns metrics for the dashboard.
    """
    try:
        from flask import request
        from models import ParkingSettings, TenantSubscription
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        location_id = request.args.get('location_id')
        
        if location_id and location_id != 'all':
            location_id = int(location_id)
            settings = ParkingSettings.query.filter_by(location_id=location_id).first()
            if not settings:
                settings = ParkingSettings(location_id=location_id, total_visitor_slots=100, total_tenant_slots=100)
                db.session.add(settings)
                db.session.commit()
            total_visitor_staff = settings.total_visitor_slots
            total_tenant = settings.total_tenant_slots
            visitor_reserved = settings.visitor_reserved or 0
            tenant_reserved = settings.tenant_reserved or 0
            
            base_vehicle_query = Vehicle.query.filter_by(location_id=location_id)
        else:
            from models import Location
            active_locations = Location.query.filter_by(is_active=True).all()
            active_location_ids = [loc.id for loc in active_locations]
            
            all_settings = ParkingSettings.query.all()
            
            # If we have location-specific settings for active locations, use them
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
        
        # Dynamic counts
        occupied_visitor_staff = base_vehicle_query.filter(
            Vehicle.status == 'in',
            Vehicle.vehicle_category.in_(['Visitor', 'Staff'])
        ).count()
        occupied_tenant = base_vehicle_query.filter_by(status='in', vehicle_category='Tenant').count()
        
        available_visitor_staff = max(0, total_visitor_staff - occupied_visitor_staff - visitor_reserved)
        available_tenant = max(0, total_tenant - occupied_tenant - tenant_reserved)
        
        total_slots = total_visitor_staff + total_tenant
        occupied_count = occupied_visitor_staff + occupied_tenant
        available_count = available_visitor_staff + available_tenant
        total_reserved = visitor_reserved + tenant_reserved
        
        # 2. Entry/Exit Stats
        entered_today = base_vehicle_query.filter(Vehicle.entry_time >= today_start).count()
        exited_today = base_vehicle_query.filter(Vehicle.exit_time >= today_start).count()
        
        # 3. Revenue (Today)
        visitor_revenue_query = db.session.query(func.sum(Vehicle.payable_amount)).filter(
            Vehicle.exit_time >= today_start,
            Vehicle.payment_status == 'paid'
        )
        if location_id and location_id != 'all':
            visitor_revenue_query = visitor_revenue_query.filter(Vehicle.location_id == location_id)
            
        visitor_revenue = visitor_revenue_query.scalar() or 0.0
        
        sub_revenue = db.session.query(func.sum(TenantSubscription.amount_paid)).filter(
            TenantSubscription.created_at >= today_start
        ).scalar() or 0.0
        
        total_revenue = visitor_revenue + sub_revenue
        
        # 4. Vehicle Flow (Last 24 hours)
        vehicle_flow = []
        for i in range(24):
            hour_start = today_start + timedelta(hours=i)
            hour_end = today_start + timedelta(hours=i+1)
            
            entries = base_vehicle_query.filter(Vehicle.entry_time >= hour_start, Vehicle.entry_time < hour_end).count()
            exits = base_vehicle_query.filter(Vehicle.exit_time >= hour_start, Vehicle.exit_time < hour_end).count()
            
            vehicle_flow.append({
                'time': hour_start.strftime('%H:00'),
                'entries': entries,
                'exits': exits
            })
            
        # 5. Vehicle Type Distribution (Current)
        staff_count = base_vehicle_query.filter_by(status='in', vehicle_category='Staff').count()
        tenant_count = base_vehicle_query.filter_by(status='in', vehicle_category='Tenant').count()
        visitor_count = base_vehicle_query.filter_by(status='in', vehicle_category='Visitor').count()
        
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
        recent_vehicles = base_vehicle_query.order_by(desc(case(
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
            'visitorRevenueToday': visitor_revenue,
            'tenantRevenueToday': sub_revenue,
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
    Returns a list of vehicles and/or subscriptions for reports with filtering and sorting.
    """
    try:
        from flask import request
        from datetime import datetime
        
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        search = request.args.get('search', '')
        vehicle_type = request.args.get('type', 'all') # Staff, Visitor, Tenant
        payment_type = request.args.get('payment_type', 'all') # visitor, tenant, all
        
        result = []
        
        # 1. Fetch Vehicle Reports (Gate Entries) if payment_type is 'all', 'gate', 'visitor', or 'tenant'
        if payment_type in ('all', 'gate', 'visitor', 'tenant'):
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
            elif payment_type == 'visitor':
                # If they explicitly want visitor payments, filter out Tenant category to be clean
                query = query.filter(Vehicle.vehicle_category != 'Tenant')
                
            vehicles = query.all()
            
            for v in vehicles:
                duration_str = "-"
                if v.entry_time:
                    end_time = v.exit_time or datetime.utcnow()
                    diff = end_time - v.entry_time
                    hours = int(diff.total_seconds() // 3600)
                    minutes = int((diff.total_seconds() % 3600) // 60)
                    duration_str = f"{hours}h {minutes}m"
                
                # Check if vehicle entry is covered by an active visitor or tenant subscription
                effective_payment_status = v.payment_status.capitalize() if v.payment_status else 'Pending'
                
                # Calculate local entry date using system timezone offset to avoid UTC mismatch (e.g. late night UTC is next day local)
                now = datetime.now()
                utcnow = datetime.utcnow()
                tz_offset = now - utcnow
                entry_date = (v.entry_time + tz_offset).date() if v.entry_time else now.date()
                clean_plate = v.license_plate.replace(' ', '').lower() if v.license_plate else ''
                
                from models import VisitorSubscription, VisitorVehicle, TenantSubscription, TenantVehicle, WaivedUser
                has_vis_sub = db.session.query(VisitorSubscription).join(VisitorVehicle, VisitorSubscription.visitor_id == VisitorVehicle.visitor_id).filter(
                    func.replace(func.lower(VisitorVehicle.license_plate), ' ', '') == clean_plate,
                    VisitorSubscription.start_date <= entry_date,
                    VisitorSubscription.end_date >= entry_date,
                    VisitorSubscription.status == 'active'
                ).first()
                
                has_tenant_sub = db.session.query(TenantSubscription).join(TenantVehicle, TenantSubscription.tenant_id == TenantVehicle.tenant_id).filter(
                    func.replace(func.lower(TenantVehicle.license_plate), ' ', '') == clean_plate,
                    TenantSubscription.start_date <= entry_date,
                    TenantSubscription.end_date >= entry_date,
                    TenantSubscription.status == 'active'
                ).first() if not has_vis_sub else None

                # Check staff pass (WaivedUser)
                is_staff = False
                if v.vehicle_category == 'Staff' or (not has_vis_sub and v.vehicle_category not in ('Tenant',)):
                    staff_matches = WaivedUser.query.filter(
                        func.replace(func.lower(WaivedUser.license_plate), ' ', '').contains(clean_plate)
                    ).all()
                    for s in staff_matches:
                        v_from = s.valid_from.date() if isinstance(s.valid_from, datetime) else s.valid_from
                        v_until = s.valid_until.date() if isinstance(s.valid_until, datetime) else s.valid_until
                        if (not v_from or entry_date >= v_from) and (not v_until or entry_date <= v_until):
                            is_staff = True
                            break
                
                if (has_vis_sub or has_tenant_sub or is_staff) and v.payment_status in ('not paid', 'pending', None, 'waived'):
                    effective_payment_status = 'Waived'

                cat_lower = (v.vehicle_category or 'visitor').strip().lower()
                if has_vis_sub or has_tenant_sub:
                    v_type = 'Subscriber'
                elif is_staff or cat_lower in ('staff', 'employee'):
                    v_type = 'Staff'
                elif cat_lower in ('tenant',):
                    v_type = 'Tenant'
                else:
                    v_type = 'Visitor'

                
                result.append({
                    'id': f"vehicle_{v.id}",
                    'vehicleNumber': v.license_plate,
                    'entryTime': v.entry_time.strftime('%Y-%m-%d %H:%M:%S') if v.entry_time else None,
                    'exitTime': v.exit_time.strftime('%Y-%m-%d %H:%M:%S') if v.exit_time else None,
                    'type': v_type,
                    'recordCategory': 'Gate Entry',
                    'status': 'Exited' if v.exit_time else 'Inside',
                    'duration': duration_str,
                    'paymentMode': v.payment_mode.capitalize() if v.payment_mode else '-',
                    'paymentAmount': f"{v.payable_amount:.3f}" if v.payable_amount is not None else "0.000",
                    'paymentStatus': effective_payment_status,
                    'collectedBy': v.verifier.username if v.verifier else ('System' if v.payment_status == 'paid' else '-'),
                    'paymentType': 'visitor',
                    'location': v.location.location_name if v.location else '-'
                })
        
        # Sort merged list by entryTime desc
        result.sort(key=lambda x: x['entryTime'] or '', reverse=True)
        
        return jsonify(result), 200
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
