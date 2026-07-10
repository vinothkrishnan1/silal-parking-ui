import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

db_uri = os.getenv('FLASK_SQLALCHEMY_DATABASE_URI')

if not db_uri:
    print("Error: FLASK_SQLALCHEMY_DATABASE_URI not found in .env")
    exit(1)

print(f"Connecting to database...")
try:
    engine = create_engine(db_uri)

    new_columns = [
        ("start_date", "DATE", "NULL"),
        ("end_date", "DATE", "NULL"),
        ("is_tenant", "BOOLEAN", "1"),
        ("is_master", "BOOLEAN", "0"),
        ("tenant_type", "VARCHAR(50)", "'Tenant'"),
        ("vehicle_type", "VARCHAR(50)", "NULL"),
        ("subscription_plan_id", "INTEGER", "NULL"),
        ("amount_paid", "FLOAT", "0.0"),
        ("payment_method", "VARCHAR(50)", "NULL"),
        ("payment_status", "VARCHAR(50)", "'Pending'"),
        ("transaction_id", "VARCHAR(100)", "NULL"),
        ("payment_date", "DATE", "NULL"),
        ("created_at", "DATETIME", "CURRENT_TIMESTAMP")
    ]

    with engine.connect() as conn:
        for col_name, col_type, default in new_columns:
            try:
                print(f"Adding column {col_name} to tenants table...")
                # Use text() for executing raw SQL
                query = text(f"ALTER TABLE tenants ADD COLUMN {col_name} {col_type} DEFAULT {default}")
                conn.execute(query)
                conn.commit()
                print(f"Successfully added {col_name}.")
            except Exception as e:
                # Check for duplicate column error (MySQL 1060)
                if "1060" in str(e) or "Duplicate column name" in str(e):
                    print(f"Column {col_name} already exists. Skipping.")
                else:
                    print(f"Error adding {col_name}: {e}")

    print("Migration complete!")

except Exception as main_e:
    print(f"Fatal error during migration: {main_e}")
