from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Altering tenant_subscriptions table to add allocated_slots...")
    with db.engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tenant_subscriptions ADD COLUMN allocated_slots INT DEFAULT 1;"))
            print("Successfully added allocated_slots")
        except Exception as e:
            print("Error adding allocated_slots:", e)
        conn.commit()
    print("Database schema updated successfully!")
