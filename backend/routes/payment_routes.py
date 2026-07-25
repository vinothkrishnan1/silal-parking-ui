from flask import Blueprint, request, jsonify
from datetime import datetime
from extensions import db
from models import Vehicle
from sqlalchemy import func, desc
from services.payment_services import process_soap_payment
import logging
logger = logging.getLogger(__name__)
from debug_logger import log_info

payment_bp = Blueprint('payment', __name__)

@payment_bp.route('/process', methods=['POST'])
def process_payment():
    data = request.get_json()
    license_plate = data.get('license_plate')
    amount = data.get('amount')

    if not license_plate or amount is None:
        return jsonify({"status": "error", "message": "Missing license_plate or amount"}), 400

    try:
        amount_float = float(amount)
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid amount"}), 400

    # 1. Process payment via SOAP
    payment_response = process_soap_payment(amount_float)

    if not payment_response.get('success'):
        return jsonify({
            "status": "error", 
            "message": payment_response.get('message', 'Payment failed'),
            "details": payment_response
        }), 400

    # 2. Update Vehicle record on success
    try:
        vehicle = Vehicle.query.filter(
            func.lower(Vehicle.license_plate) == func.lower(license_plate)
        ).order_by(desc(Vehicle.entry_time)).first()
        
        if vehicle:
            vehicle.payment_status = 'paid'
            vehicle.payment_mode = 'card'
            vehicle.payable_amount = amount_float
            vehicle.payment_processed_at = datetime.now()
            
            # If we want to mark the vehicle as out right away
            vehicle.status = 'out'
            if not vehicle.exit_time:
                vehicle.exit_time = datetime.now()
            if not vehicle.duration and vehicle.entry_time and vehicle.exit_time:
                vehicle.duration = vehicle.exit_time - vehicle.entry_time
                
            db.session.commit()
            logger.info(f"Payment processed successfully for {license_plate}. Amount: {amount_float}")

            try:
                from services.parking_broadcast import broadcast_vehicle_event
                broadcast_vehicle_event('payment', {
                    'license_plate': vehicle.license_plate,
                    'payment_status': vehicle.payment_status,
                    'payment_mode': vehicle.payment_mode,
                    'payment_processed_at': vehicle.payment_processed_at.isoformat() if vehicle.payment_processed_at else None
                })
            except Exception as broadcast_error:
                logger.error(f"Failed to broadcast payment event for {license_plate}: {broadcast_error}")

        return jsonify({
            "status": "success",
            "message": payment_response.get('message', 'Payment successful'),
            "details": payment_response
        }), 200

    except Exception as e:
        logger.error(f"Database update failed after payment for {license_plate}: {e}")
        return jsonify({
            "status": "error",
            "message": "Payment successful but failed to update database",
            "error": str(e)
        }), 500
