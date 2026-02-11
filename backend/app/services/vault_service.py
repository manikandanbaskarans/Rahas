import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, NotFoundError
from app.models.secret import Folder, Secret
from app.models.vault import Vault, VaultType


async def create_vault(
    db: AsyncSession,
    owner_id: uuid.UUID,
    name_encrypted: str,
    vault_type: str = "personal",
    org_id: uuid.UUID | None = None,
    description_encrypted: str | None = None,
    icon: str = "folder-lock",
) -> Vault:
    vault = Vault(
        owner_id=owner_id,
        name_encrypted=name_encrypted,
        type=VaultType(vault_type),
        org_id=org_id,
        description_encrypted=description_encrypted,
        icon=icon,
    )
    db.add(vault)
    await db.flush()
    return vault


async def get_user_vaults(
    db: AsyncSession, user_id: uuid.UUID, travel_mode: bool = False,
) -> tuple[list[Vault], int]:
    query = select(Vault).where(Vault.owner_id == user_id)
    count_query = select(func.count()).select_from(Vault).where(Vault.owner_id == user_id)

    if travel_mode:
        query = query.where(Vault.safe_for_travel == True)  # noqa: E712
        count_query = count_query.where(Vault.safe_for_travel == True)  # noqa: E712

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.order_by(Vault.created_at.desc()))
    vaults = list(result.scalars().all())
    return vaults, total


async def get_vault(
    db: AsyncSession, vault_id: uuid.UUID, user_id: uuid.UUID
) -> Vault:
    result = await db.execute(select(Vault).where(Vault.id == vault_id))
    vault = result.scalar_one_or_none()

    if not vault:
        raise NotFoundError("Vault")
    if vault.owner_id != user_id:
        raise AuthorizationError("Not authorized to access this vault")

    return vault


async def update_vault(
    db: AsyncSession,
    vault_id: uuid.UUID,
    user_id: uuid.UUID,
    name_encrypted: str | None = None,
    description_encrypted: str | None = None,
    icon: str | None = None,
    safe_for_travel: bool | None = None,
) -> Vault:
    vault = await get_vault(db, vault_id, user_id)
    if name_encrypted is not None:
        vault.name_encrypted = name_encrypted
    if description_encrypted is not None:
        vault.description_encrypted = description_encrypted
    if icon is not None:
        vault.icon = icon
    if safe_for_travel is not None:
        vault.safe_for_travel = safe_for_travel
    await db.flush()
    return vault


async def delete_vault(
    db: AsyncSession, vault_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    vault = await get_vault(db, vault_id, user_id)
    await db.delete(vault)
    await db.flush()


async def get_vault_item_count(
    db: AsyncSession, vault_id: uuid.UUID
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Secret)
        .where(
            Secret.vault_id == vault_id,
            Secret.is_deleted == False,  # noqa: E712
        )
    )
    return result.scalar() or 0


async def get_vault_type_breakdown(
    db: AsyncSession, vault_id: uuid.UUID
) -> dict[str, int]:
    result = await db.execute(
        select(Secret.type, func.count())
        .where(
            Secret.vault_id == vault_id,
            Secret.is_deleted == False,  # noqa: E712
        )
        .group_by(Secret.type)
    )
    return {row[0].value: row[1] for row in result.all()}


async def get_vault_folder_count(
    db: AsyncSession, vault_id: uuid.UUID
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Folder)
        .where(Folder.vault_id == vault_id)
    )
    return result.scalar() or 0
