from app import create_app
from models import db, TenantSubscription
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Creating tenant_subscriptions table...")
    TenantSubscription.__table__.create(db.engine, checkfirst=True)
    print("Successfully created tenant_subscriptions table.")
    
    print("Altering tenants table to remove old subscription columns...")
    with db.engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN start_date;"))
            print("Dropped start_date")
        except Exception as e:
            print("start_date:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN end_date;"))
            print("Dropped end_date")
        except Exception as e:
            print("end_date:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN is_tenant;"))
            print("Dropped is_tenant")
        except Exception as e:
            print("is_tenant:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN is_master;"))
            print("Dropped is_master")
        except Exception as e:
            print("is_master:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN vehicle_type;"))
            print("Dropped vehicle_type")
        except Exception as e:
            print("vehicle_type:", e)

        try:
            # Need to drop foreign key for subscription_plan_id first if it exists
            conn.execute(text("ALTER TABLE tenants DROP FOREIGN KEY tenants_ibfk_1;"))
            print("Dropped foreign key tenants_ibfk_1")
        except Exception as e:
            print("FK drop:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN subscription_plan_id;"))
            print("Dropped subscription_plan_id")
        except Exception as e:
            print("subscription_plan_id:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN amount_paid;"))
            print("Dropped amount_paid")
        except Exception as e:
            print("amount_paid:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN payment_method;"))
            print("Dropped payment_method")
        except Exception as e:
            print("payment_method:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN payment_status;"))
            print("Dropped payment_status")
        except Exception as e:
            print("payment_status:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN transaction_id;"))
            print("Dropped transaction_id")
        except Exception as e:
            print("transaction_id:", e)
            
        try:
            conn.execute(text("ALTER TABLE tenants DROP COLUMN payment_date;"))
            print("Dropped payment_date")
        except Exception as e:
            print("payment_date:", e)

        conn.commit()
    print("Database schema updated successfully!")
