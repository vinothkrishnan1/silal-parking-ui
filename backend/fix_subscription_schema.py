from app import app
from models import db, TenantSubscription

with app.app_context():
    # Create the tenant_subscriptions table if it doesn't exist
    print("Creating tenant_subscriptions table...")
    TenantSubscription.__table__.create(db.engine, checkfirst=True)
    print("Successfully created tenant_subscriptions table.")
