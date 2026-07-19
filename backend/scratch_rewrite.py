import re

def rewrite():
    with open(r'g:\silal_market_pro_parking\backend\routes\vehicle_routes.py', 'r') as f:
        content = f.read()
        
    new_func = """@vehicle_bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    \"\"\"
    Returns metrics for the dashboard.
    \"\"\"
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
            all_settings = ParkingSettings.query.all()
            if not all_settings:
                settings = ParkingSettings(total_visitor_slots=100, total_tenant_slots=100)
                db.session.add(settings)
                db.session.commit()
                all_settings = [settings]
                
            total_visitor_staff = sum(s.total_visitor_slots for s in all_settings)
            total_tenant = sum(s.total_tenant_slots for s in all_settings)
            visitor_reserved = sum((s.visitor_reserved or 0) for s in all_settings)
            tenant_reserved = sum((s.tenant_reserved or 0) for s in all_settings)
            
            base_vehicle_query = Vehicle.query
        
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
        }), 200"""
    
    # We find the start and end of get_dashboard_data
    start_str = "@vehicle_bp.route('/dashboard', methods=['GET'])"
    end_str = "    except Exception as e:"
    
    start_idx = content.find(start_str)
    end_idx = content.find(end_str, start_idx)
    
    if start_idx == -1 or end_idx == -1:
        print("Could not find boundaries")
        return
        
    new_content = content[:start_idx] + new_func + "\n" + content[end_idx:]
    
    with open(r'g:\silal_market_pro_parking\backend\routes\vehicle_routes.py', 'w') as f:
        f.write(new_content)
        
    print("Rewritten get_dashboard_data")

if __name__ == '__main__':
    rewrite()
