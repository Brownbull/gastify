import asyncio
import json
from typing import Annotated

import firebase_admin  # type: ignore[import-untyped]
from fastapi import Depends, HTTPException, Request, status
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import settings

_app: firebase_admin.App | None = None


def _get_firebase_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app

    if settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
    elif settings.firebase_credentials_json:
        try:
            parsed = json.loads(settings.firebase_credentials_json)
        except json.JSONDecodeError as exc:
            raise ValueError("FIREBASE_CREDENTIALS_JSON contains malformed JSON") from exc
        cred = credentials.Certificate(parsed)
    else:
        cred = credentials.ApplicationDefault()

    _app = firebase_admin.initialize_app(cred, {"projectId": settings.firebase_project_id})
    return _app


def _extract_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    return auth_header[7:]


class FirebaseUser:
    def __init__(self, uid: str, email: str | None, name: str | None) -> None:
        self.uid = uid
        self.email = email
        self.name = name


async def get_current_user(request: Request) -> FirebaseUser:
    token = _extract_token(request)
    _get_firebase_app()

    try:
        decoded = await asyncio.to_thread(firebase_auth.verify_id_token, token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
        ) from exc

    return FirebaseUser(
        uid=decoded["uid"],
        email=decoded.get("email"),
        name=decoded.get("name"),
    )


CurrentUser = Annotated[FirebaseUser, Depends(get_current_user)]
