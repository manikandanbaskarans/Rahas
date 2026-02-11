import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_generate_password(client):
    response = await client.post(
        "/api/v1/tools/generate-password",
        json={"length": 20, "include_uppercase": True, "include_lowercase": True},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["password"]) == 20
    assert data["strength_score"] >= 0
    assert data["entropy_bits"] > 0


@pytest.mark.asyncio
async def test_generate_password_min_length(client):
    response = await client.post(
        "/api/v1/tools/generate-password",
        json={"length": 8},
    )
    assert response.status_code == 200
    assert len(response.json()["password"]) == 8


@pytest.mark.asyncio
async def test_generate_password_max_length(client):
    response = await client.post(
        "/api/v1/tools/generate-password",
        json={"length": 128},
    )
    assert response.status_code == 200
    assert len(response.json()["password"]) == 128


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
