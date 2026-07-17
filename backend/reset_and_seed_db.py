import os
from datetime import datetime
from flask import Flask
from extensions import db
from models import (
    User, Vehicle, WaivedUser, Pricing, PricingTier, Tenant, 
    TenantSubscription, TenantVehicle, ParkingSettings, DeviceConfig, Location
)

def reset_and_seed():
    app = Flask(__name__)
    
    # Load env vars
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'FLASK_SQLALCHEMY_DATABASE_URI', 
        'mysql+pymysql://ipro_admin:1Pr0%40dmin123#%40!@192.168.0.100:3306/vinoth_silal_market_parking'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        print("WARNING: This will drop all tables and all data will be lost.")
        confirm = input("Are you sure you want to proceed? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Aborted.")
            return

        print("Dropping all tables...")
        db.drop_all()

        print("Creating all tables...")
        db.create_all()

        print("Seeding Admin User...")
        admin = User(username='admin', role='admin')
        admin.set_password('admin123')
        db.session.add(admin)

        print("Seeding Parking Settings...")
        settings = ParkingSettings(
            total_visitor_slots=100,
            total_tenant_slots=50,
            visitor_reserved=0,
            tenant_reserved=0
        )
        db.session.add(settings)

        print("Seeding Locations...")
        locations = ['Location A', 'Location B']
        for loc in locations:
            db.session.add(Location(location_name=loc))

        print("Seeding Pricing...")
        visitor_pricing = Pricing(
            pricing_type='Visitor Parking',
            vehicle_type='4-Wheeler',
            name='Standard Visitor Plan',
            description='Default visitor pricing',
            is_active=True
        )
        db.session.add(visitor_pricing)
        db.session.flush()
        
        tier1 = PricingTier(pricing_id=visitor_pricing.id, duration=1, unit='hour', price_omr=1.0)
        tier2 = PricingTier(pricing_id=visitor_pricing.id, duration=1, unit='day', price_omr=10.0)
        db.session.add_all([tier1, tier2])

        db.session.commit()
        print("Database reset and seeded successfully!")

if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()
    reset_and_seed()
