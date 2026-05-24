# Mobile Maestro Flows

These flows target installable Expo development builds, not Expo Go. They use stable React Native `testID` values and the staging Firebase Auth test-user path.

## Prerequisites

- Install a development build with app id `com.gastify.mobile`.
- Connect the Samsung S23 over USB and verify `adb devices` shows an authorized `device`.
- Build the app with staging Firebase service files.
- Configure `EXPO_PUBLIC_E2E_AUTH_ENABLED=true` and `EXPO_PUBLIC_E2E_AUTH_MODE=staging`.
- Provide staging E2E email/password through local env or CI secrets.
- Point `EXPO_PUBLIC_API_BASE_URL` at the Railway `staging-e2e` API for deterministic Phase 2 proof, or at the Railway `staging` API for live Gemini smoke. A local backend is fallback-only evidence.
- Run `cd mobile && npm run doctor:e2e` and inspect `tests/mobile/results/latest/<env>/environment/mobile-doctor.txt`.

## Run

Verified S23 / WSL-native path:

```bash
cd mobile
export ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
export EXPO_DEV_CLIENT_URL='exp+gastify-mobile://expo-development-client/?url=<encoded-metro-url>'

npm run maestro:open-dev-client
npm run maestro:install-driver
MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active
MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:scan-entry:active
```

The active flows assume the Expo dev-client URL has already opened the app. They avoid the `openLink` flake seen on the S23 and can skip Maestro's automatic driver reinstall after the bundled driver APKs are installed.

The older all-in-one flow remains available:

```bash
tests/mobile/scripts/run-maestro.sh
```

The runner writes screenshots, `report.html`, `maestro.log`, command traces,
and manifests to a durable run folder:

```text
tests/mobile/results/runs/<env>/<run-id>/<flow-name>/
```

It also mirrors the latest packet to `tests/mobile/results/latest/<env>/<flow-name>/`
for quick inspection. Use `GASTIFY_MOBILE_RUN_ID=<id>` to group several flows
under one environment proof run.

## Phase 2 Scan Upload Fixture Gate

The Phase 2 upload/progress gate uses the real native gallery picker, multipart
upload, and WebSocket client on the physical S23. The backend runs in explicit
fixture mode so Gemini is bypassed but the production scan endpoints, scan row,
event stream, persistence, and terminal UI routing remain exercised.

Preferred: use the Railway `staging-e2e` API and run the root wrapper:

```bash
export GASTIFY_STAGING_E2E_API_BASE_URL=https://<gastify-api-staging-e2e-domain>
export MAESTRO_DEVICE_ID="RFCW90N4BYP"
bash scripts/staging/run-s23-fixture-gate.sh
```

Local fallback: start the deterministic fixture backend in one terminal:

```bash
GASTIFY_DATABASE_URL=<local-or-staging-e2e-postgres-url> \
GASTIFY_ENVIRONMENT=staging-e2e \
GASTIFY_SCAN_PROVIDER=fixture \
GASTIFY_FIREBASE_PROJECT_ID=<staging-firebase-project-id> \
GASTIFY_FIREBASE_CREDENTIALS_PATH=/secure/path/staging-admin.json \
tests/mobile/scripts/start-scan-fixture-backend.sh
```

Keep Metro/dev-client open as usual, then run the S23 flows from `mobile/`:

```bash
export ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
export MAESTRO_DEVICE_ID="RFCW90N4BYP"
export MAESTRO_VERBOSE=true
export MAESTRO_REINSTALL_DRIVER=false

npm run maestro:scan-upload:happy:active
npm run maestro:scan-upload:review:active
npm run maestro:scan-upload:failure:active
npm run maestro:camera-permission-denied:active
```

Each upload script seeds exactly one receipt image into
`/sdcard/Pictures/GastifyE2E/`, refreshes Android media indexing, applies the
required `adb reverse` ports, and writes evidence under the matching durable
run folder. The root staging fixture wrapper sets a shared run id so all four
flows land under one `tests/mobile/results/runs/staging-e2e/<run-id>/` packet.

The Phase 2 scan-entry flow verifies the authenticated screen exposes camera/library scan controls. The scan-upload fixture flows are now the required proof for gallery upload, backend WebSocket progress, completion/review/error routing, and camera-permission denial on the S23.

The Firebase Auth Emulator remains a fallback by setting `EXPO_PUBLIC_E2E_AUTH_MODE=emulator`, but staging is the default lane for P4 mobile E2E.

## Phase 5 Golden Journey Gate

The Phase 5 S23 gate groups the full Android mobile exit-signal journey and the
native edge flows under one `staging-e2e` run folder:

```bash
export GASTIFY_STAGING_E2E_API_BASE_URL=https://<gastify-api-staging-e2e-domain>
export MAESTRO_DEVICE_ID="RFCW90N4BYP"
bash scripts/staging/run-s23-phase5-gate.sh
```

The wrapper writes all flow manifests under:

```text
tests/mobile/results/runs/staging-e2e/<run-id>/
```

It runs `p4-phase5-golden-journey-active.yaml` first, then the review,
scan-failure, and camera-permission-denied flows. The golden flow covers sign
in, native gallery scan, WebSocket progress, transaction detail navigation,
merchant edit, sign out, and reauth into a clean home screen with no stale scan
result. File-validation, reconnect token refresh, optimistic rollback, push
permission denied, and SecureStore/query/cache eviction are covered by Jest/RNTL
and must be green before this runtime packet can close Phase 5 Exec.

iOS runtime testing is deferred post-roadmap and is not a Phase 5 blocker.
