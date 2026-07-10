from app import create_app
from models import db, Tenant

app = create_app()
with app.app_context():
    print("Columns in Tenant table:")
    for c in Tenant.__table__.columns:
        print(c.name)
