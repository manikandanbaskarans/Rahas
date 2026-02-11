import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AccessPolicy, PasswordPolicy


async def get_password_policy(
    db: AsyncSession, org_id: uuid.UUID
) -> PasswordPolicy | None:
    result = await db.execute(
        select(PasswordPolicy).where(PasswordPolicy.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def upsert_password_policy(
    db: AsyncSession, org_id: uuid.UUID, **kwargs
) -> PasswordPolicy:
    result = await db.execute(
        select(PasswordPolicy).where(PasswordPolicy.org_id == org_id)
    )
    policy = result.scalar_one_or_none()

    if policy:
        for key, value in kwargs.items():
            if hasattr(policy, key):
                setattr(policy, key, value)
    else:
        policy = PasswordPolicy(org_id=org_id, **kwargs)
        db.add(policy)

    await db.flush()
    return policy


async def get_access_policy(
    db: AsyncSession, org_id: uuid.UUID
) -> AccessPolicy | None:
    result = await db.execute(
        select(AccessPolicy).where(AccessPolicy.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def upsert_access_policy(
    db: AsyncSession, org_id: uuid.UUID, **kwargs
) -> AccessPolicy:
    result = await db.execute(
        select(AccessPolicy).where(AccessPolicy.org_id == org_id)
    )
    policy = result.scalar_one_or_none()

    if policy:
        for key, value in kwargs.items():
            if hasattr(policy, key):
                setattr(policy, key, value)
    else:
        policy = AccessPolicy(org_id=org_id, **kwargs)
        db.add(policy)

    await db.flush()
    return policy
