from flask import Blueprint, request, jsonify
from extensions import db
from models import Pricing, PricingTier
from datetime import datetime
from sqlalchemy import text

pricing_bp = Blueprint('pricing', __name__)

def ensure_pricing_schema():
    with db.engine.connect() as conn:
        try:
            conn.execute(text("SELECT duration_value FROM pricing LIMIT 1"))
        except:
            conn.execute(text("ALTER TABLE pricing ADD COLUMN duration_value INTEGER DEFAULT 1"))
            conn.execute(text("ALTER TABLE pricing ADD COLUMN duration_unit VARCHAR(20) DEFAULT 'months'"))
            conn.commit()
            print("Added duration_value and duration_unit columns to pricing table.")

@pricing_bp.route('/', methods=['GET'])
def get_pricing():
    pricing_list = Pricing.query.all()
    return jsonify([p.to_dict() for p in pricing_list]), 200

@pricing_bp.route('/active-tenant-plans', methods=['GET'])
def get_active_tenant_plans():
    plans = Pricing.query.filter_by(pricing_type='Tenant Subscription', is_active=True).all()
    return jsonify([p.to_dict() for p in plans]), 200

@pricing_bp.route('/', methods=['POST'])
def add_pricing():
    data = request.json
    try:
        duration_val = data.get('duration_value')
        
        new_pricing = Pricing(
            pricing_type=data.get('pricing_type', 'Visitor Parking'),
            vehicle_type=data.get('vehicle_type'),
            name=data.get('name'),
            description=data.get('description'),
            price=float(data.get('price', 0.0)),
            duration_value=int(duration_val) if duration_val not in [None, ''] else 1,
            duration_unit=data.get('duration_unit', 'months'),
            is_active=data.get('is_active', True)
        )
        
        if data.get('start_date'):
            new_pricing.start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
        if data.get('end_date'):
            new_pricing.end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()

        db.session.add(new_pricing)
        db.session.flush() # To get the id

        if new_pricing.pricing_type == 'Visitor Parking' and 'tiers' in data:
            for tier_data in data['tiers']:
                tier = PricingTier(
                    pricing_id=new_pricing.id,
                    duration=tier_data.get('duration'),
                    unit=tier_data.get('unit'),
                    price_omr=float(tier_data.get('price_omr'))
                )
                db.session.add(tier)

        db.session.commit()
        return jsonify(new_pricing.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@pricing_bp.route('/<int:id>', methods=['PUT'])
def update_pricing(id):
    pricing = Pricing.query.get_or_404(id)
    data = request.json
    try:
        pricing.pricing_type = data.get('pricing_type', pricing.pricing_type)
        pricing.vehicle_type = data.get('vehicle_type', pricing.vehicle_type)
        pricing.name = data.get('name', pricing.name)
        pricing.description = data.get('description', pricing.description)
        pricing.price = float(data.get('price', pricing.price))
        
        duration_val = data.get('duration_value')
        if duration_val not in [None, '']:
            pricing.duration_value = int(duration_val)
        else:
            pricing.duration_value = 1
            
        pricing.duration_unit = data.get('duration_unit', pricing.duration_unit)
        pricing.is_active = data.get('is_active', pricing.is_active)

        if data.get('start_date'):
            pricing.start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
        if data.get('end_date'):
            pricing.end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()

        # Update Tiers for Visitor Parking
        if pricing.pricing_type == 'Visitor Parking' and 'tiers' in data:
            # Delete old tiers
            PricingTier.query.filter_by(pricing_id=pricing.id).delete()
            for tier_data in data['tiers']:
                tier = PricingTier(
                    pricing_id=pricing.id,
                    duration=tier_data.get('duration'),
                    unit=tier_data.get('unit'),
                    price_omr=float(tier_data.get('price_omr'))
                )
                db.session.add(tier)

        db.session.commit()
        return jsonify(pricing.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@pricing_bp.route('/<int:id>', methods=['DELETE'])
def delete_pricing(id):
    pricing = Pricing.query.get_or_404(id)
    try:
        db.session.delete(pricing)
        db.session.commit()
        return jsonify({'message': 'Pricing deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
