from flask import Blueprint, request, jsonify
from sqlalchemy import func, inspect, text
from models import (
    db,
    Visitor,
    VisitorVehicle,
    VisitorSubscription,
    Vehicle,
    Pricing,
    SUBSCRIPTION_STATUS_ACTIVE,
    SUBSCRIPTION_STATUS_INACTIVE
)
from datetime import datetime
import re
from sqlalchemy.exc import IntegrityError
from services.subscription_status_service import (
    normalize_subscription_status,
    resolve_subscription_status_for_save,
    sync_expired_subscriptions
)

visitor_bp = Blueprint('visitor_bp', __name__)

PAID_SUBSCRIPTION_STATUSES = {'paid', 'completed', 'success', 'waived'}
SUBSCRIPTION_PAYMENT_METHODS = {'cash': 'Cash', 'card': 'Card', 'online': 'Online'}


def ensure_visitor_schema():
    pass


def _normalize_text(value):
    return str(value or '').strip()


def _parse_bool(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return _normalize_text(value).lower() in {'true', '1', 'yes', 'active'}


def _resolve_requested_status(data, default=SUBSCRIPTION_STATUS_ACTIVE):
    if 'status' in data:
        return normalize_subscription_status(data.get('status'), default=default)
    if 'is_active' in data:
        return SUBSCRIPTION_STATUS_ACTIVE if _parse_bool(data.get('is_active'), default == SUBSCRIPTION_STATUS_ACTIVE) else SUBSCRIPTION_STATUS_INACTIVE
    return default


def _parse_subscription_date(value, field_name, default_today=False):
    if value in (None, ''):
        if default_today:
            return datetime.utcnow().date()
        return None

    try:
        return datetime.strptime(str(value), '%Y-%m-%d').date()
    except ValueError:
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format.")


def _parse_allocated_slots(value):
    slots = int(value or 1)
    if slots < 1:
        raise ValueError("Allocated slots must be at least 1.")
    return slots


def _normalize_plan_id(value):
    if value in (None, '', 'null', 'undefined'):
        return None
    return int(value)


def _normalize_amount(value):
    if value in (None, ''):
        return 0.0
    return float(value)


def _normalize_subscription_payment_method(value, default='Card'):
    normalized_value = _normalize_text(value).lower()

    if not normalized_value:
        return default

    if normalized_value not in SUBSCRIPTION_PAYMENT_METHODS:
        allowed_methods = ', '.join(SUBSCRIPTION_PAYMENT_METHODS.values())
        raise ValueError(f"Payment Method must be one of: {allowed_methods}.")

    return SUBSCRIPTION_PAYMENT_METHODS[normalized_value]


def _is_subscription_payment_pending(value):
    normalized_value = _normalize_text(value).lower()
    return not normalized_value or normalized_value not in PAID_SUBSCRIPTION_STATUSES


def _recalculate_subscription_amount(subscription):
    if not subscription.subscription_plan_id:
        return

    plan = Pricing.query.get(subscription.subscription_plan_id)
    if not plan:
        raise ValueError("Selected subscription plan was not found.")

    subscription.amount_paid = plan.price * subscription.allocated_slots

# --- Master Visitor Routes ---

@visitor_bp.route('/', methods=['GET'])
def get_visitors():
    visitors = Visitor.query.all()
    return jsonify([visitor.to_dict() for visitor in visitors]), 200

@visitor_bp.route('/', methods=['POST'])
def add_visitor():
    data = request.json
    if not data or 'visitor_name' not in data or 'phone_number' not in data:
        return jsonify({"error": "Missing name or phone"}), 400

    try:
        new_visitor = Visitor(
            visitor_name=_normalize_text(data.get('visitor_name')),
            phone_number=_normalize_text(data.get('phone_number'))
        )
        db.session.add(new_visitor)
        db.session.flush()

        for plate in data.get('vehicles', []):
            if plate.strip():
                new_vehicle = VisitorVehicle(visitor_id=new_visitor.id, license_plate=plate.upper().strip())
                db.session.add(new_vehicle)

        db.session.commit()
        return jsonify(new_visitor.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@visitor_bp.route('/<int:id>', methods=['PUT'])
def update_visitor(id):
    visitor = Visitor.query.get_or_404(id)
    data = request.json
    try:
        if 'visitor_name' in data: visitor.visitor_name = data['visitor_name']
        if 'phone_number' in data: visitor.phone_number = _normalize_text(data.get('phone_number'))
        
        if 'vehicles' in data:
            VisitorVehicle.query.filter_by(visitor_id=visitor.id).delete()
            for plate in data['vehicles']:
                if plate.strip():
                    new_v = VisitorVehicle(visitor_id=visitor.id, license_plate=plate.upper().strip())
                    db.session.add(new_v)
        
        db.session.commit()
        return jsonify(visitor.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@visitor_bp.route('/<int:id>', methods=['DELETE'])
def delete_visitor(id):
    visitor = Visitor.query.get_or_404(id)
    db.session.delete(visitor)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200

# --- Subscription Routes ---

@visitor_bp.route('/subscriptions/', methods=['GET'])
def get_subscriptions():
    sync_expired_subscriptions()
    subs = VisitorSubscription.query.order_by(VisitorSubscription.created_at.desc(), VisitorSubscription.id.desc()).all()
    return jsonify([s.to_dict() for s in subs]), 200

@visitor_bp.route('/subscriptions/', methods=['POST'])
def add_subscription():
    data = request.json or {}
    try:
        visitor_id = data.get('visitor_id')
        
        if not visitor_id:
            # Inline visitor creation
            visitor_name = data.get('visitor_name')
            phone_number = data.get('phone_number')
            if not visitor_name or not phone_number:
                return jsonify({"error": "Please select a visitor or provide a name and phone number."}), 400
            
            visitor = Visitor(visitor_name=_normalize_text(visitor_name), phone_number=_normalize_text(phone_number))
            db.session.add(visitor)
            db.session.flush() # To get visitor.id
        else:
            visitor = Visitor.query.get(int(visitor_id))
            if not visitor:
                return jsonify({"error": "Selected visitor was not found."}), 404

        plan_id = _normalize_plan_id(data.get('subscription_plan_id'))
        allocated_slots = _parse_allocated_slots(data.get('allocated_slots', 1))
        start_date = _parse_subscription_date(data.get('start_date'), 'Start Date')
        end_date = _parse_subscription_date(data.get('end_date'), 'End Date')

        if not start_date or not end_date:
            return jsonify({"error": "Start Date and End Date are required."}), 400
        if end_date < start_date:
            return jsonify({"error": "End Date cannot be earlier than Start Date."}), 400

        amount_paid = _normalize_amount(data.get('amount_paid'))
        requested_status = _resolve_requested_status(data, default=SUBSCRIPTION_STATUS_ACTIVE)
        final_status = resolve_subscription_status_for_save(requested_status, start_date, end_date, default=requested_status)

        # check duplicate visitor subscription
        visitor_sub = VisitorSubscription.query.filter(
            VisitorSubscription.visitor_id == visitor.id,
            VisitorSubscription.start_date <= end_date,
            VisitorSubscription.end_date >= start_date,
            VisitorSubscription.status == SUBSCRIPTION_STATUS_ACTIVE
        ).first()
        
        if visitor_sub and final_status == SUBSCRIPTION_STATUS_ACTIVE:
            return jsonify({"error": "Duplicate visitor subscription"}), 400


        new_sub = VisitorSubscription(
            visitor_id=visitor.id,
            start_date=start_date,
            end_date=end_date,
            allocated_slots=allocated_slots,
            subscription_plan_id=plan_id,
            amount_paid=amount_paid,
            payment_method=_normalize_subscription_payment_method(data.get('payment_method')),
            payment_status=_normalize_text(data.get('payment_status') or 'Pending') or 'Pending',
            transaction_id=_normalize_text(data.get('transaction_id')) or None,
            status=final_status
        )

        new_sub.payment_date = _parse_subscription_date(
            data.get('payment_date'),
            'Payment Date',
            default_today=True
        )

        if new_sub.subscription_plan_id:
            _recalculate_subscription_amount(new_sub)
            
        db.session.add(new_sub)
        db.session.commit()
        return jsonify(new_sub.to_dict()), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@visitor_bp.route('/subscriptions/<int:id>', methods=['PUT'])
def update_subscription(id):
    sub = VisitorSubscription.query.get_or_404(id)
    data = request.json or {}
    try:
        if 'visitor_id' in data:
            visitor_id = int(data['visitor_id'])
            visitor = Visitor.query.get(visitor_id)
            if not visitor:
                return jsonify({"error": "Selected visitor was not found."}), 404
            sub.visitor_id = visitor_id

        if 'start_date' in data:
            sub.start_date = _parse_subscription_date(data['start_date'], 'Start Date')
        if 'end_date' in data:
            sub.end_date = _parse_subscription_date(data['end_date'], 'End Date')
        if sub.start_date and sub.end_date and sub.end_date < sub.start_date:
            return jsonify({"error": "End Date cannot be earlier than Start Date."}), 400

        should_recalculate_amount = False

        if 'allocated_slots' in data:
            sub.allocated_slots = _parse_allocated_slots(data['allocated_slots'])
            should_recalculate_amount = True

        if 'subscription_plan_id' in data:
            sub.subscription_plan_id = _normalize_plan_id(data['subscription_plan_id'])
            should_recalculate_amount = True

        if should_recalculate_amount and sub.subscription_plan_id:
            _recalculate_subscription_amount(sub)
        elif 'amount_paid' in data:
            sub.amount_paid = _normalize_amount(data['amount_paid'])

        if 'payment_method' in data:
            sub.payment_method = _normalize_subscription_payment_method(data['payment_method'])
        if 'payment_status' in data:
            sub.payment_status = _normalize_text(data['payment_status']) or 'Pending'
        if 'transaction_id' in data:
            sub.transaction_id = _normalize_text(data['transaction_id']) or None
        if 'payment_date' in data:
            sub.payment_date = _parse_subscription_date(data['payment_date'], 'Payment Date', default_today=True)
        next_status = resolve_subscription_status_for_save(
            _resolve_requested_status(data, default=normalize_subscription_status(sub.status)),
            sub.start_date,
            sub.end_date,
            default=normalize_subscription_status(sub.status)
        )
        overlapping_subscription = None
        if next_status == SUBSCRIPTION_STATUS_ACTIVE:
            overlapping_subscription = VisitorSubscription.query.filter(
                VisitorSubscription.id != sub.id,
                VisitorSubscription.visitor_id == sub.visitor_id,
                VisitorSubscription.start_date <= sub.end_date,
                VisitorSubscription.end_date >= sub.start_date,
                VisitorSubscription.status == SUBSCRIPTION_STATUS_ACTIVE
            ).first()

        if overlapping_subscription:
            return jsonify({"error": "Duplicate visitor subscription"}), 400

        sub.status = next_status
        
        db.session.commit()
        return jsonify(sub.to_dict()), 200
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@visitor_bp.route('/subscriptions/<int:id>', methods=['DELETE'])
def delete_subscription(id):
    sub = VisitorSubscription.query.get_or_404(id)
    db.session.delete(sub)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200

# --- Advanced Validation Route ---

@visitor_bp.route('/check', methods=['POST'])
def check_visitor():
    sync_expired_subscriptions()
    data = request.json
    plate = str(data.get('car_numberplate', '')).upper().strip()
    if not plate: return jsonify({"error": "No plate"}), 400

    # 1. Registration Check
    tv = VisitorVehicle.query.filter(func.lower(VisitorVehicle.license_plate) == plate.lower()).first()
    if not tv:
        return jsonify({"status": "not_found", "message": "Vehicle not in Master List"}), 404

    # 2. Subscription Check
    today = datetime.utcnow().date()
    active_subscriptions = VisitorSubscription.query.filter(
        VisitorSubscription.visitor_id == tv.visitor_id,
        VisitorSubscription.start_date <= today,
        VisitorSubscription.end_date >= today,
        VisitorSubscription.status == SUBSCRIPTION_STATUS_ACTIVE
    ).order_by(VisitorSubscription.end_date.desc(), VisitorSubscription.created_at.desc()).all()

    sub = next(
        (subscription for subscription in active_subscriptions if not _is_subscription_payment_pending(subscription.payment_status)),
        None
    )

    if not sub:
        if active_subscriptions:
            return jsonify({"status": "payment_pending", "message": "Subscription payment is pending"}), 403
        return jsonify({"status": "expired", "message": "No active subscription found"}), 403

    # 3. Slot Count Check
    current_parked = Vehicle.query.filter_by(visitor_id=tv.visitor_id, status='in').count()
    if current_parked >= sub.allocated_slots:
        return jsonify({
            "status": "full", 
            "message": f"Parking Limit Reached ({current_parked}/{sub.allocated_slots} slots used)"
        }), 403

    return jsonify({
        "status": "allowed",
        "message": "Access Granted",
        "visitor_name": tv.visitor.visitor_name,
        "slots_used": f"{current_parked + 1}/{sub.allocated_slots}"
    }), 200

