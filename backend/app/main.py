from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.consent import router as consent_router
from app.api.health import router as health_router
from app.api.metrics import router as metrics_router
from app.api.privacy import router as privacy_router
from app.api.scans import router as scans_router
from app.api.transactions import router as transactions_router
from app.config import settings
from app.logging import setup_logging
from app.middleware import AccessLogMiddleware, RequestIdMiddleware

setup_logging()

app = FastAPI(
    title="Gastify API",
    version="0.1.0",
    description="Chilean smart expense tracker — FastAPI backend",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
)

app.add_middleware(AccessLogMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(transactions_router, prefix="/api/v1")
app.include_router(consent_router, prefix="/api/v1")
app.include_router(privacy_router, prefix="/api/v1")
app.include_router(scans_router, prefix="/api/v1")
app.include_router(metrics_router, prefix="/api/v1")
