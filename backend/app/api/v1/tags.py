import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.tag import TagAssign, TagCreate, TagResponse, TagUpdate
from app.services import tag_service

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("", response_model=list[TagResponse])
async def list_tags(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tags = await tag_service.get_user_tags(db, current_user.id)
    return [TagResponse.model_validate(t) for t in tags]


@router.post("", response_model=TagResponse, status_code=201)
async def create_tag(
    data: TagCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tag = await tag_service.create_tag(db, current_user.id, data.name, data.color)
    return TagResponse.model_validate(tag)


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: uuid.UUID,
    data: TagUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    tag = await tag_service.update_tag(
        db, tag_id, current_user.id, name=data.name, color=data.color
    )
    return TagResponse.model_validate(tag)


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await tag_service.delete_tag(db, tag_id, current_user.id)


@router.post("/secrets/{secret_id}/tags", status_code=204)
async def assign_tags(
    secret_id: uuid.UUID,
    data: TagAssign,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await tag_service.assign_tags_to_secret(db, secret_id, data.tag_ids, current_user.id)


@router.delete("/secrets/{secret_id}/tags/{tag_id}", status_code=204)
async def remove_tag(
    secret_id: uuid.UUID,
    tag_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await tag_service.remove_tag_from_secret(db, secret_id, tag_id, current_user.id)
