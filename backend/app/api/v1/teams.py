import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.database import get_db
from app.core.exceptions import AuthorizationError, NotFoundError
from app.models.organization import (
    OrgMembership,
    OrgRole,
    Team,
    TeamMembership,
    TeamRole,
)
from app.models.user import User
from app.schemas.admin import TeamCreate, TeamMemberAdd, TeamResponse
from app.services import audit_service

router = APIRouter(prefix="/org/teams", tags=["Teams"])


@router.post("", response_model=TeamResponse, status_code=201)
async def create_team(
    data: TeamCreate,
    org_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_org_member(db, current_user.id, org_id, admin_only=True)

    team = Team(
        org_id=org_id,
        name=data.name,
        encrypted_team_key=data.encrypted_team_key,
    )
    db.add(team)
    await db.flush()

    membership = TeamMembership(
        user_id=current_user.id,
        team_id=team.id,
        role=TeamRole.ADMIN,
    )
    db.add(membership)

    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        org_id=org_id,
        action="team.create",
        resource_type="team",
        resource_id=str(team.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    await db.flush()
    return TeamResponse.model_validate(team)


@router.get("", response_model=list[TeamResponse])
async def list_teams(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_org_member(db, current_user.id, org_id)

    result = await db.execute(
        select(Team).where(Team.org_id == org_id).order_by(Team.name)
    )
    teams = result.scalars().all()
    return [TeamResponse.model_validate(t) for t in teams]


@router.post("/{team_id}/members", status_code=201)
async def add_team_member(
    team_id: uuid.UUID,
    data: TeamMemberAdd,
    org_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_team_admin(db, current_user.id, team_id)

    membership = TeamMembership(
        user_id=data.user_id,
        team_id=team_id,
        encrypted_team_key_for_user=data.encrypted_team_key_for_user,
        role=TeamRole(data.role),
    )
    db.add(membership)

    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        org_id=org_id,
        action="team.add_member",
        resource_type="team_membership",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={"team_id": str(team_id), "added_user_id": str(data.user_id)},
    )
    await db.flush()
    return {"message": "Member added to team"}


@router.delete("/{team_id}/members/{user_id}", status_code=204)
async def remove_team_member(
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_team_admin(db, current_user.id, team_id)

    result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == user_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise NotFoundError("Team membership")

    await db.delete(membership)
    await db.flush()


async def _require_org_member(
    db: AsyncSession,
    user_id: uuid.UUID,
    org_id: uuid.UUID,
    admin_only: bool = False,
) -> OrgMembership:
    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == user_id,
            OrgMembership.org_id == org_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise AuthorizationError("Not a member of this organization")
    if admin_only and membership.role not in (OrgRole.ADMIN, OrgRole.MANAGER):
        raise AuthorizationError("Admin or manager role required")
    return membership


async def _require_team_admin(
    db: AsyncSession, user_id: uuid.UUID, team_id: uuid.UUID
) -> TeamMembership:
    result = await db.execute(
        select(TeamMembership).where(
            TeamMembership.user_id == user_id,
            TeamMembership.team_id == team_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership or membership.role != TeamRole.ADMIN:
        raise AuthorizationError("Team admin role required")
    return membership
