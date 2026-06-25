#!/usr/bin/env python3
"""Create or refresh the disposable production smoke-test Firebase Auth user.

Production verifies Firebase ID tokens against the project named in
``GASTIFY_FIREBASE_PROJECT_ID`` (currently ``gastify-staging`` — production
reuses the staging Firebase project, so the staging Admin SDK key manages it).

This account is a *real* Firebase email/password user, not an auth bypass. The
production sign-in form only surfaces it when ``VITE_PROD_TEST_AUTH_ENABLED`` is
set on the web service. See docs/runbooks/PRODUCTION-TEST-USER.md.

Dry-runs by default; pass --execute to actually create/update the user.
"""

from __future__ import annotations

import argparse
import os
import sys

import firebase_admin
from firebase_admin import auth, credentials


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare the production smoke-test Firebase Auth user.",
    )
    parser.add_argument(
        "--project-id",
        default=os.getenv("GASTIFY_FIREBASE_PROJECT_ID"),
        help="Firebase project id production verifies against. "
        "Defaults to GASTIFY_FIREBASE_PROJECT_ID.",
    )
    parser.add_argument(
        "--credentials-path",
        default=os.getenv("GASTIFY_FIREBASE_CREDENTIALS_PATH"),
        help="Firebase Admin SDK JSON path. "
        "Defaults to GASTIFY_FIREBASE_CREDENTIALS_PATH.",
    )
    parser.add_argument(
        "--email",
        default=os.getenv("GASTIFY_PROD_TEST_EMAIL"),
        help="Production test-user email. Defaults to GASTIFY_PROD_TEST_EMAIL.",
    )
    parser.add_argument(
        "--display-name",
        default=os.getenv("GASTIFY_PROD_TEST_DISPLAY_NAME", "Gastify Prod Test"),
        help="Display name for the test user.",
    )
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Update the password when the user already exists.",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually create/update the Firebase Auth user. Without this, dry-runs.",
    )
    return parser.parse_args()


def require(value: str | None, label: str) -> str:
    if value:
        return value

    raise SystemExit(f"Missing required {label}.")


def init_firebase(project_id: str, credentials_path: str) -> None:
    cred = credentials.Certificate(credentials_path)
    firebase_admin.initialize_app(cred, {"projectId": project_id})


def main() -> int:
    args = parse_args()
    project_id = require(args.project_id, "project id")
    credentials_path = require(args.credentials_path, "credentials path")
    email = require(args.email, "test-user email")
    password = os.getenv("GASTIFY_PROD_TEST_PASSWORD")

    print(f"Project: {project_id}")
    print(f"Email: {email}")
    print(f"Display name: {args.display_name}")
    print(f"Mode: {'execute' if args.execute else 'dry-run'}")
    print(
        "Note: this creates a REAL Firebase account. Keep VITE_PROD_TEST_AUTH_ENABLED "
        "off in normal production; enable it only for a smoke window."
    )

    if not args.execute:
        print("Dry-run only. Re-run with --execute to create/update the user.")
        return 0

    password = require(password, "test-user password env (GASTIFY_PROD_TEST_PASSWORD)")
    init_firebase(project_id, credentials_path)

    try:
        user = auth.get_user_by_email(email)
    except auth.UserNotFoundError:
        user = auth.create_user(
            email=email,
            password=password,
            display_name=args.display_name,
            email_verified=True,
            disabled=False,
        )
        print(f"Created production test user uid={user.uid}")
        return 0

    updates: dict[str, str | bool] = {
        "display_name": args.display_name,
        "email_verified": True,
        "disabled": False,
    }
    if args.reset_password:
        updates["password"] = password

    auth.update_user(user.uid, **updates)
    print(f"Updated production test user uid={user.uid}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
