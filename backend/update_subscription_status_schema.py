from flask import Flask
from dotenv import load_dotenv

from extensions import db
from services.subscription_status_service import ensure_subscription_status_schema, sync_expired_subscriptions

load_dotenv()


def create_database_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config.from_prefixed_env()
    db.init_app(app)
    return app

def migrate_subscription_status_schema():
    app = create_database_app()

    with app.app_context():
        ensure_subscription_status_schema()
        updated_count = sync_expired_subscriptions()
        print(f'Subscription status schema updated successfully. Expired rows synced: {updated_count}')


if __name__ == '__main__':
    migrate_subscription_status_schema()
