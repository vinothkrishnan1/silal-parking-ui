from datetime import datetime, timedelta
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from extensions import socketio

LOG_DIR = Path(__file__).resolve().parent / 'logs'
LOG_FILE = LOG_DIR / 'scheduler_errors.log'


def _get_scheduler_error_logger():
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger('backend.flask_scheduler.errors')
    logger.setLevel(logging.ERROR)
    logger.propagate = False

    log_file_path = str(LOG_FILE)
    for handler in logger.handlers:
        if getattr(handler, 'baseFilename', None) == log_file_path:
            return logger

    handler = RotatingFileHandler(log_file_path, maxBytes=1024 * 1024, backupCount=5, encoding='utf-8')
    handler.setLevel(logging.ERROR)
    handler.setFormatter(
        logging.Formatter('%(asctime)s | %(levelname)s | %(name)s | %(message)s')
    )
    logger.addHandler(handler)
    return logger


SCHEDULER_ERROR_LOGGER = _get_scheduler_error_logger()


class Scheduler:
    def __init__(self, app=None):
        self.app = None
        self._jobs = {}
        self._started = False
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        self.app = app
        app.extensions['flask_scheduler'] = self
        return self

    def add_job(
        self,
        func,
        trigger='cron',
        id=None,
        replace_existing=False,
        run_on_start=False,
        hour=0,
        minute=0,
        days=0,
        hours=0,
        minutes=0,
        seconds=0,
        args=None,
        kwargs=None
    ):
        if trigger not in ('cron', 'interval'):
            raise ValueError("Scheduler currently supports only 'cron' and 'interval' trigger jobs.")

        job_id = id or getattr(func, '__name__', 'scheduler_job')
        if job_id in self._jobs and not replace_existing:
            raise ValueError(f"Scheduler job '{job_id}' already exists.")

        job = {
            'id': job_id,
            'func': func,
            'trigger': trigger,
            'args': tuple(args or ()),
            'kwargs': dict(kwargs or {}),
            'run_on_start': bool(run_on_start),
            'has_started': False,
            'last_run_date': None,
            'last_run_at': None,
            'last_error_at': None,
            'last_error_message': None
        }

        if trigger == 'cron':
            job['hour'] = int(hour)
            job['minute'] = int(minute)
        else:
            interval_seconds = (
                int(days) * 86400 +
                int(hours) * 3600 +
                int(minutes) * 60 +
                int(seconds)
            )
            if interval_seconds <= 0:
                raise ValueError("Interval jobs require a positive days/hours/minutes/seconds value.")
            job['interval_seconds'] = interval_seconds
            job['next_run_at'] = datetime.now() + timedelta(seconds=interval_seconds)

        self._jobs[job_id] = job
        return self._jobs[job_id]

    def start(self):
        if self._started or self.app is None:
            return False

        self._started = True
        socketio.start_background_task(self._run_loop)
        return True

    def _run_job(self, job, now):
        try:
            with self.app.app_context():
                job['func'](*job['args'], **job['kwargs'])
            job['has_started'] = True
            job['last_run_date'] = now.date()
            job['last_run_at'] = now
            if job['trigger'] == 'interval':
                job['next_run_at'] = now + timedelta(seconds=job['interval_seconds'])
        except Exception as exc:
            job['last_error_at'] = now
            job['last_error_message'] = str(exc)
            SCHEDULER_ERROR_LOGGER.exception(
                "Scheduler job '%s' failed. trigger=%s args=%s kwargs=%s",
                job['id'],
                job['trigger'],
                job['args'],
                job['kwargs']
            )

    def _should_run_cron_job(self, job, now):
        return (
            now.hour == job['hour'] and
            now.minute >= job['minute'] and
            job['last_run_date'] != now.date()
        )

    def _should_run_interval_job(self, job, now):
        next_run_at = job.get('next_run_at')
        if next_run_at is None:
            job['next_run_at'] = now + timedelta(seconds=job['interval_seconds'])
            return False
        return now >= next_run_at

    def _run_loop(self):
        while True:
            now = datetime.now()

            for job in self._jobs.values():
                if job['run_on_start'] and not job['has_started']:
                    self._run_job(job, now)
                    continue

                if job['trigger'] == 'interval':
                    should_run = self._should_run_interval_job(job, now)
                else:
                    should_run = self._should_run_cron_job(job, now)

                if should_run:
                    self._run_job(job, now)

            socketio.sleep(1)
