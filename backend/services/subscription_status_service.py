from datetime import datetime
import os

from flask_scheduler import Scheduler
from sqlalchemy import inspect, or_, text

from extensions import db
from models import (
    TenantSubscription,
    SUBSCRIPTION_STATUS_ACTIVE,
    SUBSCRIPTION_STATUS_EXPIRED,
    SUBSCRIPTION_STATUS_INACTIVE,
    SUBSCRIPTION_STATUS_VALUES
)

DEFAULT_SYNC_HOUR = int(os.getenv('SUBSCRIPTION_STATUS_SYNC_HOUR', '0'))
DEFAULT_SYNC_MINUTE = int(os.getenv('SUBSCRIPTION_STATUS_SYNC_MINUTE', '1'))
DEFAULT_SYNC_TRIGGER = str(os.getenv('SUBSCRIPTION_STATUS_SYNC_TRIGGER', 'interval')).strip().lower()  # for live cron for testing interval
DEFAULT_SYNC_INTERVAL_MINUTES = int(os.getenv('SUBSCRIPTION_STATUS_SYNC_INTERVAL_MINUTES', '1'))
SUBSCRIPTION_STATUS_JOB_ID = 'tenant_subscription_status_sync'

subscription_status_scheduler = Scheduler()


def normalize_subscription_status(value, default=SUBSCRIPTION_STATUS_ACTIVE):
    normalized_value = str(value or default).strip().lower()
    if normalized_value in SUBSCRIPTION_STATUS_VALUES:
        return normalized_value
    return default


def _add_status_column(connection, dialect_name):
    if dialect_name == 'mysql':
        connection.execute(
            text(
                "ALTER TABLE tenant_subscriptions "
                "ADD COLUMN status ENUM('active','inactive','expired') NOT NULL DEFAULT 'active'"
            )
        )
    else:
        connection.execute(
            text(
                "ALTER TABLE tenant_subscriptions "
                "ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'"
            )
        )


def ensure_subscription_status_schema():
    inspector = inspect(db.engine)
    if 'tenant_subscriptions' not in inspector.get_table_names():
        return

    column_names = {column['name'] for column in inspector.get_columns('tenant_subscriptions')}
    dialect_name = db.engine.url.get_backend_name()

    with db.engine.begin() as connection:
        if 'status' not in column_names:
            _add_status_column(connection, dialect_name)
            column_names.add('status')

        if 'is_active' in column_names:
            connection.execute(
                text(
                    "UPDATE tenant_subscriptions "
                    "SET status = CASE "
                    "WHEN is_active = 0 THEN 'inactive' "
                    "WHEN end_date < CURRENT_DATE THEN 'expired' "
                    "ELSE 'active' "
                    "END "
                    "WHERE status IS NULL OR status = '' OR status = 'active'"
                )
            )
        else:
            connection.execute(
                text(
                    "UPDATE tenant_subscriptions "
                    "SET status = CASE "
                    "WHEN end_date < CURRENT_DATE THEN 'expired' "
                    "ELSE COALESCE(NULLIF(status, ''), 'active') "
                    "END"
                )
            )


def resolve_subscription_status_for_save(requested_status, start_date, end_date, default=SUBSCRIPTION_STATUS_ACTIVE):
    normalized_status = normalize_subscription_status(requested_status, default=default)
    today = datetime.utcnow().date()

    if normalized_status == SUBSCRIPTION_STATUS_INACTIVE:
        return SUBSCRIPTION_STATUS_INACTIVE
    if normalized_status == SUBSCRIPTION_STATUS_EXPIRED:
        return SUBSCRIPTION_STATUS_EXPIRED
    if end_date and end_date < today:
        return SUBSCRIPTION_STATUS_EXPIRED
    return SUBSCRIPTION_STATUS_ACTIVE


def sync_expired_subscriptions(reference_date=None):
    today = reference_date or datetime.utcnow().date()

    subscriptions_to_expire = TenantSubscription.query.filter(
        TenantSubscription.end_date < today,
        or_(
            TenantSubscription.status == SUBSCRIPTION_STATUS_ACTIVE,
            TenantSubscription.status.is_(None)
        )
    ).all()

    for subscription in subscriptions_to_expire:
        subscription.status = SUBSCRIPTION_STATUS_EXPIRED

    if subscriptions_to_expire:
        db.session.commit()

    return len(subscriptions_to_expire)


def _run_subscription_status_sync_job():
    ensure_subscription_status_schema()
    sync_expired_subscriptions()


def _configure_subscription_status_scheduler(app, run_hour=DEFAULT_SYNC_HOUR, run_minute=DEFAULT_SYNC_MINUTE):
    if app.extensions.get('subscription_status_scheduler_configured'):
        return

    subscription_status_scheduler.init_app(app)

    with app.app_context():
        ensure_subscription_status_schema()

    scheduler_trigger = DEFAULT_SYNC_TRIGGER if DEFAULT_SYNC_TRIGGER in ('cron', 'interval') else 'cron'

    # Live deployment:
    #   SUBSCRIPTION_STATUS_SYNC_TRIGGER=cron
    #   SUBSCRIPTION_STATUS_SYNC_HOUR=0
    #   SUBSCRIPTION_STATUS_SYNC_MINUTE=5
    #
    # Testing:
    #   SUBSCRIPTION_STATUS_SYNC_TRIGGER=interval
    #   SUBSCRIPTION_STATUS_SYNC_INTERVAL_MINUTES=1
    print(scheduler_trigger)
    if scheduler_trigger == 'interval':
        subscription_status_scheduler.add_job(
            _run_subscription_status_sync_job,
            trigger='interval',
            id=SUBSCRIPTION_STATUS_JOB_ID,
            replace_existing=True,
            run_on_start=True,
            minutes=DEFAULT_SYNC_INTERVAL_MINUTES
        )
    else:
        subscription_status_scheduler.add_job(
            _run_subscription_status_sync_job,
            trigger='cron',
            id=SUBSCRIPTION_STATUS_JOB_ID,
            replace_existing=True,
            run_on_start=True,
            hour=run_hour,
            minute=run_minute
        )

    app.extensions['subscription_status_scheduler_configured'] = True


def _ensure_subscription_status_scheduler_started(app, run_hour=DEFAULT_SYNC_HOUR, run_minute=DEFAULT_SYNC_MINUTE):
    _configure_subscription_status_scheduler(app, run_hour, run_minute)

    if app.extensions.get('subscription_status_scheduler_started'):
        return

    app.extensions['subscription_status_scheduler_started'] = True
    subscription_status_scheduler.start()


def register_subscription_status_lifespan(app, run_hour=DEFAULT_SYNC_HOUR, run_minute=DEFAULT_SYNC_MINUTE):
    if app.extensions.get('subscription_status_scheduler_lifespan_registered'):
        return

    _configure_subscription_status_scheduler(app, run_hour, run_minute)

    @app.before_request
    def _start_subscription_scheduler_on_lifespan():
        _ensure_subscription_status_scheduler_started(app, run_hour, run_minute)

    app.extensions['subscription_status_scheduler_lifespan_registered'] = True


def start_subscription_status_scheduler(app, run_hour=DEFAULT_SYNC_HOUR, run_minute=DEFAULT_SYNC_MINUTE):
    _ensure_subscription_status_scheduler_started(app, run_hour, run_minute)
