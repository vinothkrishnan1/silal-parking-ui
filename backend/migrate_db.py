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
        print("Checking database schema...")
        
        # 1. Create Pricing Table
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS pricing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pricing_type VARCHAR(50) NOT NULL,
                vehicle_type VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price FLOAT DEFAULT 0.0,
                start_date DATE,
                end_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # 2. Create Pricing Tiers Table
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS pricing_tiers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pricing_id INT NOT NULL,
                duration INT NOT NULL,
                unit VARCHAR(20) NOT NULL,
                price_omr FLOAT NOT NULL,
                FOREIGN KEY (pricing_id) REFERENCES pricing(id) ON DELETE CASCADE
            )
        """))
        
        # 3. Add columns to Tenants Table if they don't exist
        columns_to_add = [
            ("subscription_plan_id", "INT"),
            ("amount_paid", "FLOAT DEFAULT 0.0"),
            ("payment_method", "VARCHAR(50)"),
            ("payment_status", "VARCHAR(50) DEFAULT 'Pending'"),
            ("transaction_id", "VARCHAR(100)"),
            ("payment_date", "DATE"),
            ("vehicle_type", "VARCHAR(50)")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                # Check if column exists
                result = db.session.execute(text(f"SHOW COLUMNS FROM tenants LIKE '{col_name}'")).fetchone()
                if not result:
                    print(f"Adding column {col_name} to tenants table...")
                    db.session.execute(text(f"ALTER TABLE tenants ADD COLUMN {col_name} {col_type}"))
                else:
                    print(f"Column {col_name} already exists in tenants table.")
            except Exception as e:
                print(f"Error adding column {col_name}: {e}")
        
        db.session.commit()
        print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
