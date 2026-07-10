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
        print("Starting migration for Multiple Car Support...")
        
        # 1. Create Tenant Vehicles Table
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS tenant_vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id INT NOT NULL,
                license_plate VARCHAR(20) NOT NULL UNIQUE,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
            )
        """))
        print("Created tenant_vehicles table if it didn't exist.")

        # 2. Migrate existing data from tenants.car_numberplate
        try:
            # Check if car_numberplate column exists in tenants
            result = db.session.execute(text("SHOW COLUMNS FROM tenants LIKE 'car_numberplate'")).fetchone()
            if result:
                print("Migrating existing car number plates to tenant_vehicles...")
                # Insert existing plates into tenant_vehicles
                db.session.execute(text("""
                    INSERT IGNORE INTO tenant_vehicles (tenant_id, license_plate)
                    SELECT id, car_numberplate FROM tenants WHERE car_numberplate IS NOT NULL AND car_numberplate != ''
                """))
                print("Data migration completed.")
                
                # Optional: Rename the column to avoid confusion or just leave it
                # print("Renaming car_numberplate to old_car_numberplate...")
                # db.session.execute(text("ALTER TABLE tenants CHANGE car_numberplate old_car_numberplate VARCHAR(20)"))
            else:
                print("Column car_numberplate not found in tenants table. Skipping data migration.")
        except Exception as e:
            print(f"Error during data migration: {e}")

        db.session.commit()
        print("Migration for Multiple Car Support completed successfully.")

if __name__ == "__main__":
    run_migration()
