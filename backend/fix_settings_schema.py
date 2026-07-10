from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Altering parking_settings table to add reserved_slots_override column...")
    with db.engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE parking_settings ADD COLUMN reserved_slots_override INT DEFAULT NULL AFTER total_slots;"))
            print("Successfully added reserved_slots_override")
        except Exception as e:
            print("Error adding reserved_slots_override (it might already exist):", e)
            
        conn.commit()
    print("Database schema fix completed!")
