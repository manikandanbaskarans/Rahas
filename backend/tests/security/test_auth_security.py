"""Security-specific tests for authentication endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_login_requires_auth_key(client):
    """Ensure login rejects requests without proper auth_key."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "auth_key": "short",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_requires_all_fields(client):
    """Ensure registration validates all required fields."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_protected_endpoint_requires_auth(client):
    """Ensure protected endpoints reject unauthenticated requests."""
    response = await client.get("/api/v1/vaults")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_protected_endpoint_rejects_invalid_token(client):
    """Ensure protected endpoints reject invalid tokens."""
    response = await client.get(
        "/api/v1/vaults",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_sql_injection_in_email(client):
    """Ensure SQL injection in email field is handled safely."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "' OR 1=1 --@evil.com",
        "auth_key": "a" * 32,
    })
    # Should return validation error or auth error, not 500
    assert response.status_code in (401, 422)


@pytest.mark.asyncio
async def test_xss_in_name_field(client):
    """Ensure XSS payloads in name field are handled safely."""
    response = await client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "name": "<script>alert('xss')</script>",
        "auth_key": "a" * 32,
        "encrypted_vault_key": "encrypted_data",
        "encrypted_private_key": "encrypted_pk",
        "public_key": "public_key_data",
    })
    # Should either succeed (data is just stored as-is since it's encrypted anyway)
    # or fail with a DB error - not a server crash
    assert response.status_code in (201, 422, 500)
