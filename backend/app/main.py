from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.card_aliases import router as card_aliases_router
from app.api.consent import router as consent_router
from app.api.groups import invites_router
from app.api.groups import router as groups_router
from app.api.health import router as health_router
from app.api.insights import router as insights_router
from app.api.metrics import router as metrics_router
from app.api.privacy import router as privacy_router
from app.api.push_tokens import router as push_tokens_router
from app.api.reference import router as reference_router
from app.api.scan_stream import router as scan_stream_router
from app.api.scan_stream import ws_router as scan_ws_router
from app.api.scan_test_cases import router as scan_test_cases_router
from app.api.scans import router as scans_router
from app.api.statement_stream import router as statement_stream_router
from app.api.statement_stream import ws_router as statement_ws_router
from app.api.statements import router as statements_router
from app.api.transactions import router as transactions_router
from app.config import settings
from app.db import assert_least_privilege_role
from app.logging import setup_logging
from app.middleware import AccessLogMiddleware, RequestIdMiddleware

setup_logging()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Durable RLS guard (P43): refuse to boot if the runtime DB role can bypass
    # row-level security. Skips local + SQLite. A successful boot is proof the
    # runtime connects as a least-privilege role.
    await assert_least_privilege_role()
    yield


app = FastAPI(
    title="Gastify API",
    version="0.1.0",
    description="Chilean smart expense tracker — FastAPI backend",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
    lifespan=lifespan,
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
app.include_router(card_aliases_router, prefix="/api/v1")
app.include_router(transactions_router, prefix="/api/v1")
app.include_router(consent_router, prefix="/api/v1")
app.include_router(privacy_router, prefix="/api/v1")
app.include_router(push_tokens_router, prefix="/api/v1")
app.include_router(scans_router, prefix="/api/v1")
app.include_router(scan_test_cases_router, prefix="/api/v1", include_in_schema=False)
app.include_router(scan_stream_router, prefix="/api/v1")
app.include_router(statements_router, prefix="/api/v1")
app.include_router(statement_stream_router, prefix="/api/v1")
app.include_router(scan_ws_router)
app.include_router(statement_ws_router)
app.include_router(reference_router, prefix="/api/v1")
app.include_router(insights_router, prefix="/api/v1")
app.include_router(groups_router, prefix="/api/v1")
app.include_router(invites_router, prefix="/api/v1")
app.include_router(metrics_router, prefix="/api/v1")
