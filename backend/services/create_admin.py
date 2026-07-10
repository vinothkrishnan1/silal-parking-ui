from dotenv import load_dotenv
import os
from models import db, User
from werkzeug.security import generate_password_hash

load_dotenv()

def create_initial_admin(app):
    with app.app_context():
        username = os.getenv("INITIAL_ADMIN_USERNAME")
        password = os.getenv("INITIAL_ADMIN_PASSWORD")

        if not username or not password:
            print("Admin credentials not found in .env")
            return

        admin = User.query.filter_by(username=username).first()
        if not admin:
            hashed_password = generate_password_hash(password)
            new_admin = User(username=username, password=hashed_password, role='admin')
            db.session.add(new_admin)
            db.session.commit()
            print("Initial admin created.")
        else:
            print("Admin already exists.")