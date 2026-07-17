from flask import Blueprint, request, jsonify
from extensions import db
from models import Location

location_bp = Blueprint('location', __name__)

@location_bp.route('/', methods=['GET'])
def get_locations():
    try:
        locations = Location.query.order_by(Location.created_at.desc()).all()
        return jsonify([location.to_dict() for location in locations]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@location_bp.route('/', methods=['POST'])
def create_location():
    try:
        data = request.get_json()
        location_name = data.get('location_name')

        if not location_name:
            return jsonify({'error': 'Location name is required'}), 400

        existing = Location.query.filter_by(location_name=location_name).first()
        if existing:
            return jsonify({'error': 'Location with this name already exists'}), 400

        new_location = Location(location_name=location_name)
        db.session.add(new_location)
        db.session.commit()

        return jsonify(new_location.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@location_bp.route('/<int:location_id>', methods=['PUT'])
def update_location(location_id):
    try:
        data = request.get_json()
        location = Location.query.get(location_id)
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404

        new_name = data.get('location_name')
        if new_name:
            # Check for conflict
            existing = Location.query.filter(Location.location_name == new_name, Location.id != location_id).first()
            if existing:
                return jsonify({'error': 'Location with this name already exists'}), 400
            location.location_name = new_name

        db.session.commit()
        return jsonify(location.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@location_bp.route('/<int:location_id>', methods=['DELETE'])
def delete_location(location_id):
    try:
        location = Location.query.get(location_id)
        if not location:
            return jsonify({'error': 'Location not found'}), 404

        db.session.delete(location)
        db.session.commit()
        return jsonify({'message': 'Location deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
