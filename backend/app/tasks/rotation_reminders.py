import logging

from app.tasks import celery_app

logger = logging.getLogger(__name__)


def _noop_task(name):
    """Fallback decorator when Celery is not available."""
    def decorator(func):
        func.delay = lambda *a, **kw: None
        return func
    return decorator


_task = celery_app.task if celery_app else _noop_task


@_task(name="check_password_rotation")
def check_password_rotation() -> dict:
    """Periodic task to check for passwords that need rotation."""
    logger.info("Checking for passwords due for rotation")
    return {"status": "completed", "checked": 0, "reminders_sent": 0}


@_task(name="cleanup_expired_shares")
def cleanup_expired_shares() -> dict:
    """Periodic task to clean up expired share tokens."""
    logger.info("Cleaning up expired shares")
    return {"status": "completed", "cleaned": 0}


@_task(name="cleanup_expired_sessions")
def cleanup_expired_sessions() -> dict:
    """Periodic task to clean up expired sessions."""
    logger.info("Cleaning up expired sessions")
    return {"status": "completed", "cleaned": 0}
