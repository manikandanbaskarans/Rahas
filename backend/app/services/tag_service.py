import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.tag import SecretTag, Tag


async def create_tag(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    color: str = "#6366f1",
) -> Tag:
    tag = Tag(user_id=user_id, name=name, color=color)
    db.add(tag)
    await db.flush()
    return tag


async def get_user_tags(
    db: AsyncSession, user_id: uuid.UUID
) -> list[Tag]:
    result = await db.execute(
        select(Tag).where(Tag.user_id == user_id).order_by(Tag.name)
    )
    return list(result.scalars().all())


async def get_tag(
    db: AsyncSession, tag_id: uuid.UUID, user_id: uuid.UUID
) -> Tag:
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
    )
    tag = result.scalar_one_or_none()
    if not tag:
        raise NotFoundError("Tag")
    return tag


async def update_tag(
    db: AsyncSession,
    tag_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str | None = None,
    color: str | None = None,
) -> Tag:
    tag = await get_tag(db, tag_id, user_id)
    if name is not None:
        tag.name = name
    if color is not None:
        tag.color = color
    await db.flush()
    return tag


async def delete_tag(
    db: AsyncSession, tag_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    tag = await get_tag(db, tag_id, user_id)
    await db.delete(tag)
    await db.flush()


async def assign_tags_to_secret(
    db: AsyncSession,
    secret_id: uuid.UUID,
    tag_ids: list[uuid.UUID],
    user_id: uuid.UUID,
) -> None:
    # Remove existing tags for this secret
    await db.execute(
        delete(SecretTag).where(SecretTag.secret_id == secret_id)
    )
    # Add new tag assignments
    for tag_id in tag_ids:
        await get_tag(db, tag_id, user_id)
        db.add(SecretTag(secret_id=secret_id, tag_id=tag_id))
    await db.flush()


async def remove_tag_from_secret(
    db: AsyncSession,
    secret_id: uuid.UUID,
    tag_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    await get_tag(db, tag_id, user_id)
    await db.execute(
        delete(SecretTag).where(
            SecretTag.secret_id == secret_id,
            SecretTag.tag_id == tag_id,
        )
    )
    await db.flush()
