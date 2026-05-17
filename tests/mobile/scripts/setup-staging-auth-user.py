#!/usr/bin/env python3
"""Create or refresh the staging Firebase Auth user used by mobile E2E."""

from __future__ import annotations

import argparse
import os
import sys

import firebase_admin
from firebase_admin import auth, credentials


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare the staging Firebase Auth user for Gastify mobile E2E."
    )
    parser.add_argument(
        "--project-id",
        default=os.getenv("GASTIFY_FIREBASE_PROJECT_ID"),
        help="Firebase staging project id. Defaults to GASTIFY_FIREBASE_PROJECT_ID.",
    )
    parser.add_argument(
        "--credentials-path",
        default=os.getenv("GASTIFY_FIREBASE_CREDENTIALS_PATH"),
        help="Firebase Admin SDK JSON path. Defaults to GASTIFY_FIREBASE_CREDENTIALS_PATH.",
    )
    parser.add_argument(
        "--email",
        default=os.getenv("GASTIFY_MOBILE_E2E_EMAIL")
        or os.getenv("EXPO_PUBLIC_E2E_AUTH_EMAIL"),
        help="Staging test-user email. Defaults to GASTIFY_MOBILE_E2E_EMAIL.",
    )
    parser.add_argument(
        "--display-name",
        default=os.getenv("GASTIFY_MOBILE_E2E_DISPLAY_NAME", "Gastify Mobile E2E"),
        help="Display name for the staging test user.",
    )
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="Update password when the user already exists.",
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


def require_staging_project(project_id: str) -> None:
    if "staging" not in project_id.lower():
        raise SystemExit(
            f"Refusing to run against non-staging Firebase project: {project_id}"
        )


def init_firebase(project_id: str, credentials_path: str) -> None:
    cred = credentials.Certificate(credentials_path)
    firebase_admin.initialize_app(cred, {"projectId": project_id})


def main() -> int:
    args = parse_args()
    project_id = require(args.project_id, "project id")
    credentials_path = require(args.credentials_path, "credentials path")
    email = require(args.email, "test-user email")
    password = os.getenv("GASTIFY_MOBILE_E2E_PASSWORD") or os.getenv(
        "EXPO_PUBLIC_E2E_AUTH_PASSWORD"
    )

    require_staging_project(project_id)

    print(f"Project: {project_id}")
    print(f"Email: {email}")
    print(f"Display name: {args.display_name}")
    print(f"Mode: {'execute' if args.execute else 'dry-run'}")

    if not args.execute:
        print("Dry-run only. Re-run with --execute to create/update the user.")
        return 0

    password = require(password, "test-user password env")
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
        print(f"Created staging E2E user uid={user.uid}")
        return 0

    updates: dict[str, str | bool] = {
        "display_name": args.display_name,
        "email_verified": True,
        "disabled": False,
    }
    if args.reset_password:
        updates["password"] = password

    auth.update_user(user.uid, **updates)
    print(f"Updated staging E2E user uid={user.uid}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
