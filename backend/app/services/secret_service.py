import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, NotFoundError
from app.models.secret import Folder, Secret, SecretType, SecretVersion
from app.models.vault import Vault


async def create_secret(
    db: AsyncSession,
    vault_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    secret_type: str = "password",
    name_encrypted: str,
    data_encrypted: str,
    encrypted_item_key: str,
    metadata_encrypted: str | None = None,
    folder_id: uuid.UUID | None = None,
    favorite: bool = False,
) -> Secret:
    vault = await _verify_vault_access(db, vault_id, user_id)

    secret = Secret(
        vault_id=vault.id,
        type=SecretType(secret_type),
        name_encrypted=name_encrypted,
        data_encrypted=data_encrypted,
        encrypted_item_key=encrypted_item_key,
        metadata_encrypted=metadata_encrypted,
        folder_id=folder_id,
        favorite=favorite,
    )
    db.add(secret)
    await db.flush()

    version = SecretVersion(
        secret_id=secret.id,
        data_encrypted=data_encrypted,
        encrypted_item_key=encrypted_item_key,
        version_number=1,
        created_by=user_id,
    )
    db.add(version)
    await db.flush()

    return secret


async def get_vault_secrets(
    db: AsyncSession,
    vault_id: uuid.UUID,
    user_id: uuid.UUID,
    folder_id: uuid.UUID | None = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
    category: str | None = None,
) -> tuple[list[Secret], int]:
    await _verify_vault_access(db, vault_id, user_id)

    query = select(Secret).where(
        Secret.vault_id == vault_id,
        Secret.is_deleted == False,  # noqa: E712
        Secret.is_archived == False,  # noqa: E712
    )
    count_query = select(func.count()).select_from(Secret).where(
        Secret.vault_id == vault_id,
        Secret.is_deleted == False,  # noqa: E712
        Secret.is_archived == False,  # noqa: E712
    )

    if folder_id:
        query = query.where(Secret.folder_id == folder_id)
        count_query = count_query.where(Secret.folder_id == folder_id)

    if category:
        query = query.where(Secret.type == SecretType(category))
        count_query = count_query.where(Secret.type == SecretType(category))

    # Dynamic sorting
    sort_column = getattr(Secret, sort_by, Secret.updated_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query)
    secrets = list(result.scalars().all())
    return secrets, total


async def get_secret(
    db: AsyncSession, secret_id: uuid.UUID, user_id: uuid.UUID
) -> Secret:
    result = await db.execute(select(Secret).where(Secret.id == secret_id))
    secret = result.scalar_one_or_none()

    if not secret or secret.is_deleted:
        raise NotFoundError("Secret")

    await _verify_vault_access(db, secret.vault_id, user_id)

    # Track access
    secret.access_count += 1
    secret.last_accessed_at = datetime.now(UTC)
    await db.flush()

    return secret


async def update_secret(
    db: AsyncSession,
    secret_id: uuid.UUID,
    user_id: uuid.UUID,
    **kwargs,
) -> Secret:
    secret = await get_secret(db, secret_id, user_id)

    data_changed = False
    for key, value in kwargs.items():
        if value is not None and hasattr(secret, key):
            setattr(secret, key, value)
            if key == "data_encrypted":
                data_changed = True

    if data_changed:
        max_version = await db.execute(
            select(func.max(SecretVersion.version_number)).where(
                SecretVersion.secret_id == secret_id
            )
        )
        current_max = max_version.scalar() or 0

        version = SecretVersion(
            secret_id=secret_id,
            data_encrypted=secret.data_encrypted,
            encrypted_item_key=secret.encrypted_item_key,
            version_number=current_max + 1,
            created_by=user_id,
        )
        db.add(version)

    await db.flush()
    return secret


async def delete_secret(
    db: AsyncSession, secret_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    secret = await get_secret(db, secret_id, user_id)
    secret.is_deleted = True
    secret.deleted_at = datetime.now(UTC)
    await db.flush()


async def archive_secret(
    db: AsyncSession, secret_id: uuid.UUID, user_id: uuid.UUID
) -> Secret:
    secret = await get_secret(db, secret_id, user_id)
    secret.is_archived = True
    await db.flush()
    return secret


async def unarchive_secret(
    db: AsyncSession, secret_id: uuid.UUID, user_id: uuid.UUID
) -> Secret:
    result = await db.execute(select(Secret).where(Secret.id == secret_id))
    secret = result.scalar_one_or_none()
    if not secret:
        raise NotFoundError("Secret")
    await _verify_vault_access(db, secret.vault_id, user_id)
    secret.is_archived = False
    await db.flush()
    return secret


async def get_archived_secrets(
    db: AsyncSession, user_id: uuid.UUID
) -> list[Secret]:
    # Get all vaults for user, then all archived secrets
    vault_query = select(Vault.id).where(Vault.owner_id == user_id)
    vault_ids = (await db.execute(vault_query)).scalars().all()

    result = await db.execute(
        select(Secret)
        .where(
            Secret.vault_id.in_(vault_ids),
            Secret.is_archived == True,  # noqa: E712
            Secret.is_deleted == False,  # noqa: E712
        )
        .order_by(Secret.updated_at.desc())
    )
    return list(result.scalars().all())


async def get_deleted_secrets(
    db: AsyncSession, user_id: uuid.UUID
) -> list[Secret]:
    vault_query = select(Vault.id).where(Vault.owner_id == user_id)
    vault_ids = (await db.execute(vault_query)).scalars().all()

    result = await db.execute(
        select(Secret)
        .where(
            Secret.vault_id.in_(vault_ids),
            Secret.is_deleted == True,  # noqa: E712
        )
        .order_by(Secret.deleted_at.desc())
    )
    return list(result.scalars().all())


async def restore_secret(
    db: AsyncSession, secret_id: uuid.UUID, user_id: uuid.UUID
) -> Secret:
    result = await db.execute(select(Secret).where(Secret.id == secret_id))
    secret = result.scalar_one_or_none()
    if not secret:
        raise NotFoundError("Secret")
    await _verify_vault_access(db, secret.vault_id, user_id)
    secret.is_deleted = False
    secret.deleted_at = None
    await db.flush()
    return secret


async def permanent_delete_secret(
    db: AsyncSession, secret_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    result = await db.execute(select(Secret).where(Secret.id == secret_id))
    secret = result.scalar_one_or_none()
    if not secret:
        raise NotFoundError("Secret")
    await _verify_vault_access(db, secret.vault_id, user_id)
    await db.delete(secret)
    await db.flush()


async def get_secret_versions(
    db: AsyncSession, secret_id: uuid.UUID, user_id: uuid.UUID
) -> list[SecretVersion]:
    await get_secret(db, secret_id, user_id)

    result = await db.execute(
        select(SecretVersion)
        .where(SecretVersion.secret_id == secret_id)
        .order_by(SecretVersion.version_number.desc())
    )
    return list(result.scalars().all())


async def create_folder(
    db: AsyncSession,
    vault_id: uuid.UUID,
    user_id: uuid.UUID,
    name_encrypted: str,
    parent_folder_id: uuid.UUID | None = None,
) -> Folder:
    await _verify_vault_access(db, vault_id, user_id)

    folder = Folder(
        vault_id=vault_id,
        name_encrypted=name_encrypted,
        parent_folder_id=parent_folder_id,
    )
    db.add(folder)
    await db.flush()
    return folder


async def get_vault_folders(
    db: AsyncSession, vault_id: uuid.UUID, user_id: uuid.UUID
) -> list[Folder]:
    await _verify_vault_access(db, vault_id, user_id)

    result = await db.execute(
        select(Folder).where(Folder.vault_id == vault_id).order_by(Folder.created_at)
    )
    return list(result.scalars().all())


async def move_secret(
    db: AsyncSession,
    secret_id: uuid.UUID,
    user_id: uuid.UUID,
    target_vault_id: uuid.UUID,
    encrypted_item_key: str,
) -> Secret:
    """Move a secret to a different vault. Client re-encrypts item key with target vault key."""
    secret = await get_secret(db, secret_id, user_id)
    await _verify_vault_access(db, target_vault_id, user_id)

    secret.vault_id = target_vault_id
    secret.encrypted_item_key = encrypted_item_key
    await db.flush()
    return secret


async def duplicate_secret(
    db: AsyncSession,
    secret_id: uuid.UUID,
    user_id: uuid.UUID,
    name_encrypted: str,
    encrypted_item_key: str,
    target_vault_id: uuid.UUID | None = None,
) -> Secret:
    """Duplicate a secret, optionally to a different vault."""
    original = await get_secret(db, secret_id, user_id)

    vault_id = target_vault_id or original.vault_id
    if target_vault_id:
        await _verify_vault_access(db, target_vault_id, user_id)

    duplicate = Secret(
        vault_id=vault_id,
        type=original.type,
        name_encrypted=name_encrypted,
        data_encrypted=original.data_encrypted,
        encrypted_item_key=encrypted_item_key,
        metadata_encrypted=original.metadata_encrypted,
        folder_id=original.folder_id if not target_vault_id else None,
        favorite=False,
    )
    db.add(duplicate)
    await db.flush()

    version = SecretVersion(
        secret_id=duplicate.id,
        data_encrypted=duplicate.data_encrypted,
        encrypted_item_key=duplicate.encrypted_item_key,
        version_number=1,
        created_by=user_id,
    )
    db.add(version)
    await db.flush()

    return duplicate


async def _verify_vault_access(
    db: AsyncSession, vault_id: uuid.UUID, user_id: uuid.UUID
) -> Vault:
    result = await db.execute(select(Vault).where(Vault.id == vault_id))
    vault = result.scalar_one_or_none()

    if not vault:
        raise NotFoundError("Vault")
    if vault.owner_id != user_id:
        raise AuthorizationError("Not authorized to access this vault")
    return vault
