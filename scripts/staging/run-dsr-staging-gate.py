#!/usr/bin/env python3
"""P16 Phase 1 DSR staging gate — exercise the four data-subject rights + the D82
group void/choice against a DEPLOYED staging-e2e backend, with THROWAWAY users.

Erasure is irreversible (hard-delete + scrub), so this never touches the persistent
A/B fixtures: every actor is a disposable Firebase user created via the REST
``accounts:signUp`` endpoint (API key only, no Admin SDK) and deleted via
``accounts:delete`` at the end. Three sections, all asserted against the live URL:

  1. All four DSR rights on one throwaway user (data-access / rectification /
     portability / erasure), proving erasure HARD-DELETES (D89) — transactions_count
     drops to 0 after.
  2. Account-delete void (D82/T4): a sharer shares into a group with a viewer, then
     account-deletes — the viewer sees the group-period stat VOIDED (account_deleted)
     and the sharer de-membered.
  3. Group-leave keep-vs-delete choice (D82/T5): leave?delete_shared=true voids the
     left group's affected month (member_removed_data); the default keep leaves it.

Artifacts (per-step JSON + manifest) land under tests/mobile/results/.../dsr-api-gate.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import httpx

ROOT_DIR = Path(__file__).resolve().parents[2]
MOBILE_DIR = ROOT_DIR / "mobile"
CURRENCY = "CLP"
THROWAWAY_PASSWORD = "Dsr-Proof-Pw-2026!"  # noqa: S105 — disposable staging-only signups


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="DSR rights + D82 group void staging gate.")
    parser.add_argument(
        "--api-base-url",
        default=os.getenv("GASTIFY_STAGING_E2E_API_BASE_URL")
        or os.getenv("GASTIFY_STAGING_API_BASE_URL"),
        help="Deployed API base URL.",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path(os.getenv("GASTIFY_MOBILE_ENV_FILE", str(MOBILE_DIR / ".env"))),
        help="Mobile env file (only used to default the API base URL).",
    )
    parser.add_argument(
        "--google-services",
        type=Path,
        default=MOBILE_DIR / "google-services.json",
        help="Android Firebase google-services.json used to read the web API key.",
    )
    parser.add_argument(
        "--result-root",
        type=Path,
        default=ROOT_DIR / "tests" / "mobile" / "results",
    )
    parser.add_argument(
        "--result-env",
        default=os.getenv("GASTIFY_RESULT_ENV") or "staging-e2e",
    )
    parser.add_argument("--stage-id", default=os.getenv("GASTIFY_DSR_STAGE_ID"))
    parser.add_argument("--timeout-s", type=int, default=60)
    return parser.parse_args()


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def require(value: str | None, label: str) -> str:
    if value:
        return value
    raise SystemExit(f"Missing required {label}.")


def read_firebase_api_key(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Missing Firebase config: {path}")
    config = json.loads(path.read_text(encoding="utf-8"))
    for client in config.get("client") or []:
        for api_key in client.get("api_key") or []:
            current_key = api_key.get("current_key")
            if current_key:
                return str(current_key)
    raise SystemExit(f"No Firebase API key found in {path}")


def firebase_signup(api_key: str, *, email: str, password: str) -> dict[str, Any]:
    response = httpx.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={api_key}",
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=30,
    )
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict) or not body.get("idToken"):
        raise SystemExit(f"Firebase signUp failed for {email}: {body}")
    return cast("dict[str, Any]", body)


def firebase_delete(api_key: str, id_token: str) -> None:
    try:
        httpx.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:delete?key={api_key}",
            json={"idToken": id_token},
            timeout=30,
        )
    except Exception as exc:  # cleanup is best-effort — never fail the gate on it
        print(f"  (cleanup) firebase delete failed: {exc}")


def request_json(
    client: httpx.Client, method: str, url: str, *, token: str | None = None, **kwargs: Any
) -> dict[str, Any] | list[Any]:
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = client.request(method, url, headers=headers, **kwargs)
    response.raise_for_status()
    body = response.json()
    if isinstance(body, (dict, list)):
        return body
    raise RuntimeError(f"Unexpected JSON response: {body}")


def request_status(
    client: httpx.Client, method: str, url: str, *, token: str, **kwargs: Any
) -> int:
    headers = {"Authorization": f"Bearer {token}"}
    response = client.request(method, url, headers=headers, **kwargs)
    response.raise_for_status()
    return response.status_code


def git_value(*args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", *args], cwd=ROOT_DIR, text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        return ""


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def expect(condition: bool, message: str) -> None:  # noqa: FBT001
    if not condition:
        raise RuntimeError(message)


class Actor:
    """A throwaway Firebase identity + its bearer token against the deployed API."""

    def __init__(self, api_key: str, label: str) -> None:
        self.label = label
        self.email = f"dsr-proof-{label}-{uuid.uuid4().hex[:12]}@gastify.test"
        auth = firebase_signup(api_key, email=self.email, password=THROWAWAY_PASSWORD)
        self.token = str(auth["idToken"])
        self.local_id = str(auth["localId"])


def _seed_personal_txn(
    client: httpx.Client, base: str, token: str, *, when: str, total_minor: int
) -> str:
    created = request_json(
        client,
        "POST",
        f"{base}/api/v1/transactions",
        token=token,
        json={
            "transaction_date": when,
            "merchant": "DSR Proof Merchant",
            "total_minor": total_minor,
            "currency": CURRENCY,
            "receipt_type": "manual",
        },
    )
    expect(isinstance(created, dict) and bool(created.get("id")), f"txn create failed: {created}")
    return str(cast("dict[str, Any]", created)["id"])


def _group_monthly(
    client: httpx.Client, base: str, token: str, *, group_id: str, period: str
) -> dict[str, Any]:
    body = request_json(
        client,
        "GET",
        f"{base}/api/v1/insights/monthly?period={period}&currency={CURRENCY}&group_id={group_id}",
        token=token,
    )
    expect(isinstance(body, dict), f"monthly not an object: {body}")
    return cast("dict[str, Any]", body)


def _make_group_with_two(
    client: httpx.Client, base: str, owner: Actor, member: Actor, *, name: str
) -> str:
    """owner creates a group, member joins it via an invite link. Returns group_id."""
    created = request_json(
        client, "POST", f"{base}/api/v1/groups", token=owner.token, json={"name": name}
    )
    group_id = str(cast("dict[str, Any]", created)["id"])
    invite = request_json(
        client, "POST", f"{base}/api/v1/groups/{group_id}/invite", token=owner.token
    )
    token_str = str(cast("dict[str, Any]", invite)["token"])
    joined = request_json(
        client, "POST", f"{base}/api/v1/invites/{token_str}/join", token=member.token
    )
    expect(str(cast("dict[str, Any]", joined).get("id")) == group_id, f"join failed: {joined}")
    return group_id


def section_four_rights(
    client: httpx.Client, base: str, api_key: str, result_dir: Path
) -> dict[str, Any]:
    """All four DSR rights on one throwaway user; erasure proves HARD-DELETE (D89)."""
    user = Actor(api_key, "rights")
    try:
        access = request_json(client, "GET", f"{base}/api/v1/privacy/data-access", token=user.token)
        access_d = cast("dict[str, Any]", access)
        expect(access_d.get("transactions_count") == 0, f"fresh access count: {access_d}")

        rect = request_json(
            client,
            "POST",
            f"{base}/api/v1/privacy/rectification",
            token=user.token,
            json={"display_name": "Proof Name", "locale": "en"},
        )
        expect(
            "display_name" in cast("dict[str, Any]", rect).get("updated_fields", []),
            f"rectification: {rect}",
        )

        port = request_json(client, "GET", f"{base}/api/v1/privacy/portability", token=user.token)
        port_d = cast("dict[str, Any]", port)
        expect(port_d.get("format") == "application/json", f"portability: {port_d}")

        # Seed one transaction so erasure has data to hard-delete.
        _seed_personal_txn(client, base, user.token, when="2026-02-10", total_minor=15_000)
        access2 = cast(
            "dict[str, Any]",
            request_json(client, "GET", f"{base}/api/v1/privacy/data-access", token=user.token),
        )
        expect(access2.get("transactions_count") == 1, f"count after seed: {access2}")

        erasure = cast(
            "dict[str, Any]",
            request_json(client, "POST", f"{base}/api/v1/privacy/erasure", token=user.token),
        )
        expect(erasure.get("transactions_deleted") == 1, f"erasure deleted: {erasure}")
        expect(erasure.get("user_anonymized") is True, f"erasure anonymized: {erasure}")
        expect(bool(erasure.get("audit_event_id")), f"erasure audit id: {erasure}")

        # HARD-DELETE proof: the scrubbed shell survives but its data is gone.
        access3 = cast(
            "dict[str, Any]",
            request_json(client, "GET", f"{base}/api/v1/privacy/data-access", token=user.token),
        )
        expect(access3.get("transactions_count") == 0, f"count after erasure: {access3}")

        result = {
            "section": "four_dsr_rights",
            "status": "passed",
            "rectification_fields": cast("dict[str, Any]", rect).get("updated_fields"),
            "transactions_deleted": erasure.get("transactions_deleted"),
            "group_periods_voided": erasure.get("group_periods_voided"),
            "audit_event_id": erasure.get("audit_event_id"),
            "count_after_erasure": access3.get("transactions_count"),
        }
        json_write(result_dir / "section-four-rights.json", result)
        return result
    finally:
        firebase_delete(api_key, user.token)


def section_account_delete_void(
    client: httpx.Client, base: str, api_key: str, result_dir: Path
) -> dict[str, Any]:
    """A shares into a group with B, then account-deletes → B sees the stat voided."""
    sharer = Actor(api_key, "share-del")
    viewer = Actor(api_key, "view-del")
    try:
        group_id = _make_group_with_two(client, base, sharer, viewer, name="Account-Delete Proof")
        txn_id = _seed_personal_txn(
            client, base, sharer.token, when="2026-03-15", total_minor=64_000
        )
        request_status(
            client,
            "POST",
            f"{base}/api/v1/groups/{group_id}/share",
            token=sharer.token,
            json={"transaction_id": txn_id},
        )
        before = _group_monthly(client, base, viewer.token, group_id=group_id, period="2026-03")
        expect(before.get("total_spend_minor") == 64_000, f"before total: {before}")
        expect(before.get("voided") is False, f"before voided: {before}")

        erasure = cast(
            "dict[str, Any]",
            request_json(client, "POST", f"{base}/api/v1/privacy/erasure", token=sharer.token),
        )
        expect(erasure.get("group_periods_voided") == 1, f"erasure void count: {erasure}")
        expect(erasure.get("group_memberships_removed") == 1, f"erasure de-member: {erasure}")

        after = _group_monthly(client, base, viewer.token, group_id=group_id, period="2026-03")
        expect(after.get("voided") is True, f"after voided: {after}")
        expect(after.get("void_reason") == "account_deleted", f"after reason: {after}")
        expect(after.get("total_spend_minor") == 0, f"after total: {after}")

        result = {
            "section": "account_delete_void",
            "status": "passed",
            "group_id": group_id,
            "before_total_minor": before.get("total_spend_minor"),
            "after_voided": after.get("voided"),
            "after_void_reason": after.get("void_reason"),
            "after_total_minor": after.get("total_spend_minor"),
            "group_periods_voided": erasure.get("group_periods_voided"),
            "group_memberships_removed": erasure.get("group_memberships_removed"),
        }
        json_write(result_dir / "section-account-delete-void.json", result)
        return result
    finally:
        firebase_delete(api_key, sharer.token)
        firebase_delete(api_key, viewer.token)


def section_leave_choice(
    client: httpx.Client, base: str, api_key: str, result_dir: Path
) -> dict[str, Any]:
    """Group-leave keep-vs-delete: delete voids the left month, keep leaves it intact."""
    owner = Actor(api_key, "leave-own")
    leaver = Actor(api_key, "leave-mbr")
    try:
        group_id = _make_group_with_two(client, base, owner, leaver, name="Leave-Choice Proof")
        # DELETE branch (April).
        del_txn = _seed_personal_txn(
            client, base, leaver.token, when="2026-04-10", total_minor=30_000
        )
        request_status(
            client,
            "POST",
            f"{base}/api/v1/groups/{group_id}/share",
            token=leaver.token,
            json={"transaction_id": del_txn},
        )
        before_del = _group_monthly(client, base, owner.token, group_id=group_id, period="2026-04")
        expect(before_del.get("total_spend_minor") == 30_000, f"before del: {before_del}")

        request_status(
            client,
            "POST",
            f"{base}/api/v1/groups/{group_id}/leave?delete_shared=true",
            token=leaver.token,
        )
        after_del = _group_monthly(client, base, owner.token, group_id=group_id, period="2026-04")
        expect(after_del.get("voided") is True, f"after leave-delete voided: {after_del}")
        expect(
            after_del.get("void_reason") == "member_removed_data",
            f"after leave-delete reason: {after_del}",
        )
        expect(after_del.get("total_spend_minor") == 0, f"after leave-delete total: {after_del}")

        result = {
            "section": "leave_choice",
            "status": "passed",
            "group_id": group_id,
            "delete_before_total_minor": before_del.get("total_spend_minor"),
            "delete_after_voided": after_del.get("voided"),
            "delete_after_void_reason": after_del.get("void_reason"),
            "delete_after_total_minor": after_del.get("total_spend_minor"),
        }
        json_write(result_dir / "section-leave-choice.json", result)
        return result
    finally:
        firebase_delete(api_key, owner.token)
        firebase_delete(api_key, leaver.token)


def section_leave_keep(
    client: httpx.Client, base: str, api_key: str, result_dir: Path
) -> dict[str, Any]:
    """Group-leave default KEEP — the left member's shared stats stay (D72)."""
    owner = Actor(api_key, "keep-own")
    leaver = Actor(api_key, "keep-mbr")
    try:
        group_id = _make_group_with_two(client, base, owner, leaver, name="Leave-Keep Proof")
        txn = _seed_personal_txn(client, base, leaver.token, when="2026-05-12", total_minor=21_000)
        request_status(
            client,
            "POST",
            f"{base}/api/v1/groups/{group_id}/share",
            token=leaver.token,
            json={"transaction_id": txn},
        )
        request_status(
            client, "POST", f"{base}/api/v1/groups/{group_id}/leave", token=leaver.token
        )
        after = _group_monthly(client, base, owner.token, group_id=group_id, period="2026-05")
        expect(after.get("voided") is False, f"keep voided unexpectedly: {after}")
        expect(after.get("total_spend_minor") == 21_000, f"keep total changed: {after}")

        result = {
            "section": "leave_keep",
            "status": "passed",
            "group_id": group_id,
            "after_voided": after.get("voided"),
            "after_total_minor": after.get("total_spend_minor"),
        }
        json_write(result_dir / "section-leave-keep.json", result)
        return result
    finally:
        firebase_delete(api_key, owner.token)
        firebase_delete(api_key, leaver.token)


def main() -> None:
    args = parse_args()
    env_values = load_env_file(args.env_file)
    api_base_url = require(
        args.api_base_url or env_values.get("EXPO_PUBLIC_API_BASE_URL"), "API base URL"
    ).rstrip("/")
    stage_id = args.stage_id or f"{datetime.now(UTC):%Y%m%dT%H%M%SZ}-dsr-api-gate"
    result_dir = args.result_root / "runs" / args.result_env / stage_id / "dsr-api-gate"
    latest_dir = args.result_root / "latest" / args.result_env / "dsr-api-gate"
    api_key = read_firebase_api_key(args.google_services)

    manifest: dict[str, Any] = {
        "schema": "dsr-api-gate.v1",
        "stage_id": stage_id,
        "result_status": "started",
        "api_base_url": api_base_url,
        "result_env": args.result_env,
        "git_rev": git_value("rev-parse", "HEAD"),
        "git_branch": git_value("branch", "--show-current"),
        "started_at": datetime.now(UTC).isoformat(),
    }

    try:
        with httpx.Client(timeout=args.timeout_s) as client:
            readiness = request_json(client, "GET", f"{api_base_url}/api/v1/health/ready")
            json_write(result_dir / "readiness.json", readiness)
            ready_d = cast("dict[str, Any]", readiness)
            manifest["migration_current"] = ready_d.get("migration_current")

            sections = [
                section_four_rights(client, api_base_url, api_key, result_dir),
                section_account_delete_void(client, api_base_url, api_key, result_dir),
                section_leave_choice(client, api_base_url, api_key, result_dir),
                section_leave_keep(client, api_base_url, api_key, result_dir),
            ]
            manifest.update(
                {
                    "result_status": "passed",
                    "sections": {s["section"]: s["status"] for s in sections},
                    "completed_at": datetime.now(UTC).isoformat(),
                }
            )
    except Exception as exc:
        manifest.update(
            {
                "result_status": "failed",
                "error": str(exc),
                "completed_at": datetime.now(UTC).isoformat(),
            }
        )
        json_write(result_dir / "manifest.json", manifest)
        json_write(latest_dir / "manifest.json", manifest)
        raise

    json_write(result_dir / "manifest.json", manifest)
    json_write(latest_dir / "manifest.json", manifest)
    print(json.dumps(manifest, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
