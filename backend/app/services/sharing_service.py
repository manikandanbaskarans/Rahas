import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, NotFoundError, ValidationError
from app.models.secret import Secret
from app.models.sharing import SecretShare, SharePermission
from app.models.vault import Vault


async def share_secret(
    db: AsyncSession,
    secret_id: uuid.UUID,
    shared_by: uuid.UUID,
    *,
    shared_with_user_id: uuid.UUID | None = None,
    shared_with_team_id: uuid.UUID | None = None,
    encrypted_item_key_for_recipient: str,
    permission: str = "read",
    expires_at: datetime | None = None,
) -> SecretShare:
    if not shared_with_user_id and not shared_with_team_id:
        raise ValidationError("Must specify either a user or team to share with")

    result = await db.execute(select(Secret).where(Secret.id == secret_id))
    secret = result.scalar_one_or_none()
    if not secret or secret.is_deleted:
        raise NotFoundError("Secret")

    vault_result = await db.execute(select(Vault).where(Vault.id == secret.vault_id))
    vault = vault_result.scalar_one_or_none()
    if not vault or vault.owner_id != shared_by:
        raise AuthorizationError("Only the vault owner can share secrets")

    share = SecretShare(
        secret_id=secret_id,
        shared_by=shared_by,
        shared_with_user_id=shared_with_user_id,
        shared_with_team_id=shared_with_team_id,
        encrypted_item_key_for_recipient=encrypted_item_key_for_recipient,
        permission=SharePermission(permission),
        expires_at=expires_at,
    )
    db.add(share)
    await db.flush()
    return share


async def get_shared_with_me(
    db: AsyncSession, user_id: uuid.UUID
) -> list[tuple[SecretShare, Secret]]:
    now = datetime.now(UTC)

    result = await db.execute(
        select(SecretShare, Secret)
        .join(Secret, SecretShare.secret_id == Secret.id)
        .where(
            SecretShare.shared_with_user_id == user_id,
            Secret.is_deleted == False,  # noqa: E712
        )
        .where(
            (SecretShare.expires_at == None) | (SecretShare.expires_at > now)  # noqa: E711
        )
        .order_by(SecretShare.created_at.desc())
    )
    return list(result.all())


async def revoke_share(
    db: AsyncSession, share_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    result = await db.execute(select(SecretShare).where(SecretShare.id == share_id))
    share = result.scalar_one_or_none()

    if not share:
        raise NotFoundError("Share")
    if share.shared_by != user_id:
        raise AuthorizationError("Only the sharer can revoke")

    await db.delete(share)
    await db.flush()


async def update_share(
    db: AsyncSession,
    share_id: uuid.UUID,
    user_id: uuid.UUID,
    permission: str | None = None,
    expires_at: datetime | None = None,
) -> SecretShare:
    result = await db.execute(select(SecretShare).where(SecretShare.id == share_id))
    share = result.scalar_one_or_none()

    if not share:
        raise NotFoundError("Share")
    if share.shared_by != user_id:
        raise AuthorizationError("Only the sharer can update")

    if permission:
        share.permission = SharePermission(permission)
    if expires_at is not None:
        share.expires_at = expires_at

    await db.flush()
    return share


async def create_share_link(
    db: AsyncSession,
    secret_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    encrypted_item_key_for_link: str,
    expires_in_hours: int = 24,
    max_views: int | None = None,
) -> SecretShare:
    result = await db.execute(select(Secret).where(Secret.id == secret_id))
    secret = result.scalar_one_or_none()
    if not secret or secret.is_deleted:
        raise NotFoundError("Secret")

    vault_result = await db.execute(select(Vault).where(Vault.id == secret.vault_id))
    vault = vault_result.scalar_one_or_none()
    if not vault or vault.owner_id != user_id:
        raise AuthorizationError("Only the vault owner can create share links")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(hours=expires_in_hours)

    share = SecretShare(
        secret_id=secret_id,
        shared_by=user_id,
        encrypted_item_key_for_recipient=encrypted_item_key_for_link,
        permission=SharePermission.READ,
        share_link_token=token,
        max_views=max_views,
        view_count=0,
        audience="link",
        expires_at=expires_at,
    )
    db.add(share)
    await db.flush()
    return share


async def access_share_link(
    db: AsyncSession,
    token: str,
) -> tuple[SecretShare, Secret]:
    result = await db.execute(
        select(SecretShare, Secret)
        .join(Secret, SecretShare.secret_id == Secret.id)
        .where(SecretShare.share_link_token == token)
    )
    row = result.first()
    if not row:
        raise NotFoundError("Share link")

    share, secret = row[0], row[1]

    now = datetime.now(UTC)
    if share.expires_at and share.expires_at < now:
        raise ValidationError("Share link has expired")

    if share.max_views and share.view_count >= share.max_views:
        raise ValidationError("Share link view limit reached")

    share.view_count += 1
    await db.flush()

    return share, secret


async def get_sharing_history(
    db: AsyncSession,
    secret_id: uuid.UUID,
    user_id: uuid.UUID,
) -> list[SecretShare]:
    result = await db.execute(select(Secret).where(Secret.id == secret_id))
    secret = result.scalar_one_or_none()
    if not secret:
        raise NotFoundError("Secret")

    vault_result = await db.execute(select(Vault).where(Vault.id == secret.vault_id))
    vault = vault_result.scalar_one_or_none()
    if not vault or vault.owner_id != user_id:
        raise AuthorizationError("Not authorized")

    shares_result = await db.execute(
        select(SecretShare)
        .where(SecretShare.secret_id == secret_id)
        .order_by(SecretShare.created_at.desc())
    )
    return list(shares_result.scalars().all())
