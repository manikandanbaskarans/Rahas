"""Server-side security metadata for the Checkpost (security scoring) feature.

NOTE: Actual password strength analysis is done client-side (zero-knowledge).
This service only provides metadata the server already knows about.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.secret import Secret
from app.models.user import User
from app.models.vault import Vault


async def get_security_summary(
    db: AsyncSession, user_id: uuid.UUID
) -> dict:
    """Return server-side security metadata without exposing any plaintext."""

    # Get user info
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    # Get vault IDs for this user
    vault_result = await db.execute(
        select(Vault.id).where(Vault.owner_id == user_id)
    )
    vault_ids = list(vault_result.scalars().all())

    # Total item count
    total_items = 0
    if vault_ids:
        count_result = await db.execute(
            select(func.count())
            .select_from(Secret)
            .where(
                Secret.vault_id.in_(vault_ids),
                Secret.is_deleted == False,  # noqa: E712
            )
        )
        total_items = count_result.scalar() or 0

    # Count by type
    type_counts = {}
    if vault_ids:
        type_result = await db.execute(
            select(Secret.type, func.count())
            .where(
                Secret.vault_id.in_(vault_ids),
                Secret.is_deleted == False,  # noqa: E712
            )
            .group_by(Secret.type)
        )
        for row in type_result:
            type_counts[row[0].value] = row[1]

    # Items older than 90 days (may need rotation)
    cutoff_90 = datetime.now(UTC) - timedelta(days=90)
    old_items = 0
    if vault_ids:
        old_result = await db.execute(
            select(func.count())
            .select_from(Secret)
            .where(
                Secret.vault_id.in_(vault_ids),
                Secret.is_deleted == False,  # noqa: E712
                Secret.updated_at < cutoff_90,
            )
        )
        old_items = old_result.scalar() or 0

    # Items older than 180 days (urgent)
    cutoff_180 = datetime.now(UTC) - timedelta(days=180)
    very_old_items = 0
    if vault_ids:
        very_old_result = await db.execute(
            select(func.count())
            .select_from(Secret)
            .where(
                Secret.vault_id.in_(vault_ids),
                Secret.is_deleted == False,  # noqa: E712
                Secret.updated_at < cutoff_180,
            )
        )
        very_old_items = very_old_result.scalar() or 0

    return {
        "total_items": total_items,
        "vault_count": len(vault_ids),
        "mfa_enabled": user.mfa_enabled if user else False,
        "type_breakdown": type_counts,
        "items_older_than_90_days": old_items,
        "items_older_than_180_days": very_old_items,
    }
