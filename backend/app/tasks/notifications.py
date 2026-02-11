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


@_task(name="send_email_notification")
def send_email_notification(to_email: str, subject: str, body: str) -> dict:
    logger.info("Sending email to %s: %s", to_email, subject)
    return {"status": "sent", "to": to_email, "subject": subject}


@_task(name="send_new_device_alert")
def send_new_device_alert(user_email: str, device_info: str, ip_address: str) -> dict:
    logger.info("New device alert for %s from %s (%s)", user_email, ip_address, device_info)
    return {"status": "sent", "to": user_email}


@_task(name="send_share_notification")
def send_share_notification(
    recipient_email: str, sharer_name: str, secret_type: str
) -> dict:
    logger.info(
        "Share notification to %s from %s (type: %s)",
        recipient_email,
        sharer_name,
        secret_type,
    )
    return {"status": "sent", "to": recipient_email}
