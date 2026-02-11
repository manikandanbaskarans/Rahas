"""Cleanup tasks for purging soft-deleted secrets after retention period."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select

from app.core.database import async_session_factory
from app.models.secret import Secret

RETENTION_DAYS = 30


async def purge_deleted_secrets() -> int:
    """Hard-delete secrets where deleted_at > 30 days ago.

    Returns the number of secrets permanently removed.
    """
    cutoff = datetime.now(UTC) - timedelta(days=RETENTION_DAYS)

    async with async_session_factory() as session:
        result = await session.execute(
            select(Secret).where(
                Secret.is_deleted == True,  # noqa: E712
                Secret.deleted_at is not None,
                Secret.deleted_at < cutoff,
            )
        )
        expired = result.scalars().all()
        count = len(expired)

        if count > 0:
            await session.execute(
                delete(Secret).where(
                    Secret.is_deleted == True,  # noqa: E712
                    Secret.deleted_at < cutoff,
                )
            )
            await session.commit()

        return count
