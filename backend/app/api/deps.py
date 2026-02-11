import uuid

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_token
from app.models.organization import OrgMembership, OrgRole
from app.models.user import User, UserStatus

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise AuthenticationError("Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload")

    try:
        uid = uuid.UUID(user_id)
    except ValueError as err:
        raise AuthenticationError("Invalid token payload") from err

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationError("User not found")
    if user.status != UserStatus.ACTIVE:
        raise AuthenticationError("Account is not active")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.status != UserStatus.ACTIVE:
        raise AuthenticationError("Inactive user")
    return current_user


def require_org_role(*roles: OrgRole):
    async def check_role(
        request: Request,
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        org_id = request.path_params.get("org_id") or request.query_params.get("org_id")
        if not org_id:
            raise AuthorizationError("Organization context required")

        result = await db.execute(
            select(OrgMembership).where(
                OrgMembership.user_id == current_user.id,
                OrgMembership.org_id == uuid.UUID(org_id),
            )
        )
        membership = result.scalar_one_or_none()

        if not membership or membership.role not in roles:
            raise AuthorizationError("Insufficient organization permissions")

        return current_user

    return check_role


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
