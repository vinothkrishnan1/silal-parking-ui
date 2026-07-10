import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('FLASK_SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

def run_migration():
    with app.app_context():
        print("Starting migration to add tracking columns to 'vehicles' table...")
        
        # 1. Add vehicle_category column
        try:
            db.session.execute(text("ALTER TABLE vehicles ADD COLUMN vehicle_category VARCHAR(50) DEFAULT 'Visitor'"))
            db.session.commit()
            print("Added 'vehicle_category' column.")
        except Exception as e:
            db.session.rollback()
            print(f"Note: Could not add 'vehicle_category' (it might already exist).")
            
        # 2. Add tenant_id column
        try:
            db.session.execute(text("ALTER TABLE vehicles ADD COLUMN tenant_id INT"))
            db.session.commit()
            print("Added 'tenant_id' column.")
        except Exception as e:
            db.session.rollback()
            print(f"Note: Could not add 'tenant_id' (it might already exist).")
            
        # 3. Add Foreign Key for tenant_id
        try:
            db.session.execute(text("ALTER TABLE vehicles ADD CONSTRAINT fk_vehicle_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL"))
            db.session.commit()
            print("Added Foreign Key constraint 'fk_vehicle_tenant'.")
        except Exception as fk_err:
            db.session.rollback()
            print(f"Note: Could not add Foreign Key (might already exist).")

        # 4. Backfill categories for existing records
        try:
            db.session.execute(text("""
                UPDATE vehicles v
                JOIN tenant_vehicles tv ON LOWER(v.license_plate) = LOWER(tv.license_plate)
                JOIN tenants t ON tv.tenant_id = t.id
                SET v.vehicle_category = t.tenant_type, v.tenant_id = t.id
                WHERE v.vehicle_category = 'Visitor' OR v.vehicle_category IS NULL
            """))
            db.session.commit()
            print("Backfilled categories and tenant IDs for existing matching records.")
        except Exception as e:
            db.session.rollback()
            print(f"Error during backfill: {e}")

        print("Migration completed.")

if __name__ == "__main__":
    run_migration()
