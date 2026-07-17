from app import create_app
from extensions import db
from models import Location

app = create_app()

with app.app_context():
    Location.__table__.create(db.engine, checkfirst=True)
    print("Location table ensured.")
