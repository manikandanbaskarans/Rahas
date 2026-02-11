from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all models so Base.metadata knows about them
import app.models  # noqa: F401
from app.api.v1 import (
    admin,
    audit,
    auth,
    dashboard,
    import_export,
    notifications,
    profile,
    secrets,
    sharing,
    tags,
    teams,
    tools,
    travel,
    vaults,
)
from app.core.config import settings
from app.core.database import create_tables
from app.core.middleware import RateLimitMiddleware, SecurityHeadersMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - create tables if using SQLite (dev mode)
    await create_tables()
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise Password & Key Management - Zero-Knowledge Encrypted Vault",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Middleware (order matters - last added = first executed)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(vaults.router, prefix="/api/v1")
app.include_router(secrets.router, prefix="/api/v1")
app.include_router(sharing.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(teams.router, prefix="/api/v1")
app.include_router(tools.router, prefix="/api/v1")
app.include_router(tags.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(travel.router, prefix="/api/v1")
app.include_router(import_export.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}
