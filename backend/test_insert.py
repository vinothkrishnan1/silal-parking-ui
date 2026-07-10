from app import create_app
from models import db, Vehicle
from datetime import datetime

app = create_app()
with app.app_context():
    v = Vehicle(license_plate='TEST-999', status='in')
    db.session.add(v)
    db.session.commit()
    print("Inserted TEST-999")
    
    check = Vehicle.query.filter_by(license_plate='TEST-999').first()
    if check:
        print(f"Verified: {check.license_plate} is in DB")
    else:
        print("Failed to verify insertion")
