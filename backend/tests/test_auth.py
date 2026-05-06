"""Tests for auth JIT user provisioning and Firebase auth."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app.auth.firebase import FirebaseUser, _extract_token, _get_firebase_app, get_current_user


class TestGetFirebaseApp:
    def test_initializes_app(self) -> None:
        import app.auth.firebase as fb_mod

        original = fb_mod._app
        fb_mod._app = None
        try:
            with (
                patch("app.auth.firebase.credentials.ApplicationDefault") as mock_cred,
                patch(
                    "app.auth.firebase.firebase_admin.initialize_app", return_value=MagicMock()
                ) as mock_init,
                patch("app.auth.firebase.settings") as mock_settings,
            ):
                mock_settings.firebase_credentials_path = None
                mock_settings.firebase_project_id = "test-project"
                result = _get_firebase_app()
                mock_cred.assert_called_once()
                mock_init.assert_called_once()
                assert result is not None
        finally:
            fb_mod._app = original

    def test_returns_cached_app(self) -> None:
        import app.auth.firebase as fb_mod

        original = fb_mod._app
        sentinel = MagicMock()
        fb_mod._app = sentinel
        try:
            result = _get_firebase_app()
            assert result is sentinel
        finally:
            fb_mod._app = original

    def test_certificate_path(self) -> None:
        import app.auth.firebase as fb_mod

        original = fb_mod._app
        fb_mod._app = None
        try:
            with (
                patch("app.auth.firebase.credentials.Certificate") as mock_cert,
                patch("app.auth.firebase.firebase_admin.initialize_app", return_value=MagicMock()),
                patch("app.auth.firebase.settings") as mock_settings,
            ):
                mock_settings.firebase_credentials_path = "/path/to/creds.json"
                mock_settings.firebase_project_id = "test-project"
                _get_firebase_app()
                mock_cert.assert_called_once_with("/path/to/creds.json")
        finally:
            fb_mod._app = original


class TestExtractToken:
    def test_valid_bearer(self) -> None:
        request = MagicMock()
        request.headers.get.return_value = "Bearer abc123"
        token = _extract_token(request)
        assert token == "abc123"

    def test_missing_header(self) -> None:
        request = MagicMock()
        request.headers.get.return_value = None
        with pytest.raises(HTTPException) as exc_info:
            _extract_token(request)
        assert exc_info.value.status_code == 401

    def test_invalid_prefix(self) -> None:
        request = MagicMock()
        request.headers.get.return_value = "Basic abc123"
        with pytest.raises(HTTPException) as exc_info:
            _extract_token(request)
        assert exc_info.value.status_code == 401


class TestGetCurrentUser:
    async def test_valid_token(self) -> None:
        request = MagicMock()
        request.headers.get.return_value = "Bearer valid-token"

        decoded = {"uid": "user123", "email": "test@example.com", "name": "Test"}

        with (
            patch("app.auth.firebase._get_firebase_app"),
            patch("app.auth.firebase.firebase_auth.verify_id_token", return_value=decoded),
            patch("asyncio.to_thread", new_callable=AsyncMock, return_value=decoded),
        ):
            user = await get_current_user(request)
            assert isinstance(user, FirebaseUser)
            assert user.uid == "user123"
            assert user.email == "test@example.com"
            assert user.name == "Test"

    async def test_invalid_token_raises_401(self) -> None:
        request = MagicMock()
        request.headers.get.return_value = "Bearer invalid-token"

        with (
            patch("app.auth.firebase._get_firebase_app"),
            patch(
                "asyncio.to_thread",
                new_callable=AsyncMock,
                side_effect=Exception("Token verification failed"),
            ),
        ):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(request)
            assert exc_info.value.status_code == 401


class TestJITProvisioning:
    async def test_first_request_creates_user_and_scope(self, jit_client: AsyncClient) -> None:
        resp = await jit_client.get("/api/v1/transactions")
        assert resp.status_code == 200

    async def test_second_request_reuses_existing_user(self, jit_client: AsyncClient) -> None:
        resp1 = await jit_client.get("/api/v1/transactions")
        assert resp1.status_code == 200

        resp2 = await jit_client.get("/api/v1/transactions")
        assert resp2.status_code == 200

    async def test_jit_user_can_create_transaction(self, jit_client: AsyncClient) -> None:
        resp = await jit_client.post(
            "/api/v1/transactions",
            json={
                "transaction_date": "2026-05-04",
                "merchant": "Café Test",
                "total_minor": 3500,
                "currency": "CLP",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data

        list_resp = await jit_client.get("/api/v1/transactions")
        assert list_resp.status_code == 200
        assert len(list_resp.json()["data"]) == 1
