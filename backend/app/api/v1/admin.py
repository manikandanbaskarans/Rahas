import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_client_ip, get_current_active_user
from app.core.database import get_db
from app.core.exceptions import AuthorizationError
from app.models.organization import Organization, OrgMembership, OrgRole
from app.models.user import User
from app.schemas.admin import (
    AccessPolicyUpdate,
    InviteUserRequest,
    OrgCreate,
    OrgResponse,
    OrgUserResponse,
    PasswordPolicyResponse,
    PasswordPolicyUpdate,
)
from app.services import audit_service, policy_service

router = APIRouter(prefix="/org", tags=["Organization & Admin"])


@router.post("", response_model=OrgResponse, status_code=201)
async def create_organization(
    data: OrgCreate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    org = Organization(name=data.name)
    db.add(org)
    await db.flush()

    membership = OrgMembership(
        user_id=current_user.id, org_id=org.id, role=OrgRole.ADMIN
    )
    db.add(membership)
    await db.flush()

    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        org_id=org.id,
        action="org.create",
        resource_type="organization",
        resource_id=str(org.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return OrgResponse.model_validate(org)


@router.get("/users", response_model=list[OrgUserResponse])
async def list_org_users(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_org_admin(db, current_user.id, org_id)

    result = await db.execute(
        select(OrgMembership, User)
        .join(User, OrgMembership.user_id == User.id)
        .where(OrgMembership.org_id == org_id)
    )
    members = result.all()
    return [
        OrgUserResponse(
            user_id=user.id,
            email=user.email,
            name=user.name,
            role=membership.role.value,
            status=user.status.value,
            joined_at=membership.created_at,
        )
        for membership, user in members
    ]


@router.post("/users/invite")
async def invite_user(
    data: InviteUserRequest,
    org_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_org_admin(db, current_user.id, org_id)

    result = await db.execute(select(User).where(User.email == data.email))
    target_user = result.scalar_one_or_none()

    if not target_user:
        return {"message": "Invitation sent (user will need to register first)"}

    existing = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == target_user.id,
            OrgMembership.org_id == org_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "User is already a member of this organization"}

    membership = OrgMembership(
        user_id=target_user.id,
        org_id=org_id,
        role=OrgRole(data.role),
    )
    db.add(membership)

    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        org_id=org_id,
        action="org.invite_user",
        resource_type="org_membership",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        metadata={"invited_email": data.email, "role": data.role},
    )
    await db.flush()
    return {"message": "User added to organization"}


@router.put("/policies/password", response_model=PasswordPolicyResponse)
async def update_password_policy(
    data: PasswordPolicyUpdate,
    org_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_org_admin(db, current_user.id, org_id)

    policy = await policy_service.upsert_password_policy(
        db, org_id, **data.model_dump()
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        org_id=org_id,
        action="org.update_password_policy",
        resource_type="password_policy",
        resource_id=str(policy.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return PasswordPolicyResponse.model_validate(policy)


@router.put("/policies/access")
async def update_access_policy(
    data: AccessPolicyUpdate,
    org_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_org_admin(db, current_user.id, org_id)

    policy = await policy_service.upsert_access_policy(
        db, org_id, **data.model_dump()
    )
    await audit_service.create_audit_log(
        db,
        user_id=current_user.id,
        org_id=org_id,
        action="org.update_access_policy",
        resource_type="access_policy",
        resource_id=str(policy.id),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return {"message": "Access policy updated"}


async def _require_org_admin(
    db: AsyncSession, user_id: uuid.UUID, org_id: uuid.UUID
) -> OrgMembership:
    result = await db.execute(
        select(OrgMembership).where(
            OrgMembership.user_id == user_id,
            OrgMembership.org_id == org_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership or membership.role not in (OrgRole.ADMIN, OrgRole.MANAGER):
        raise AuthorizationError("Admin or manager role required")
    return membership
