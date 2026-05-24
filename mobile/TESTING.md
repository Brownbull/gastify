# Gastify Mobile Testing

## Layers

1. **Static gates:** `npm run generate:api`, `npm run typecheck`, `npm run check:expo-config`, `npm audit --audit-level=high`.
2. **Jest/RNTL:** component, provider, session, SecureStore, API-client, scan upload, scan store, and scan WebSocket behavior that can run without a simulator. The project uses the React Native 0.83 Jest preset because RN moved the preset out of `react-native/jest-preset`; Expo-native modules are mocked explicitly where needed.
3. **Maestro:** native development-build E2E for Android behavior that Jest cannot prove. Android runs should target the physical Samsung S23 lane, not the local emulator path on this WSL2 machine. iOS runtime testing is officially deferred until after the P1-P9 roadmap.

## Local Path

```bash
cd mobile
npm run generate:api
npm run typecheck
npm test
npm run doctor:e2e
npm run verify:staging-auth
npm run check:expo-config
npm audit --audit-level=high
```

## Testing Ladder

1. **Fast checks + staging auth.** Run Jest/RNTL, typecheck, API drift, Expo config, audit, `doctor:e2e`, and `verify:staging-auth`. This proves JS behavior, config readiness, scan upload/socket contracts, and the staging Firebase email/password path. It does not prove native screenshots, camera, SecureStore eviction, or platform permissions.
2. **Samsung S23 physical entry smoke.** Build an EAS Android APK, install it on the USB-connected S23, open the dev client, and capture scan-entry screenshots under `../tests/mobile/results/runs/<env>/<run-id>/p4-phase2-scan-entry-active/`.
3. **Samsung S23 scan-upload fixture gate.** Use the Railway `staging-e2e` API with isolated Postgres and `GASTIFY_SCAN_PROVIDER=fixture`, seed a receipt into the Android gallery, and run the happy/review/failure/camera-permission Maestro flows. This is the hard proof for Phase 2 upload + WebSocket progress.
4. **Live Gemini smoke.** With fixture/mock mode off on the Railway `staging` API, run one real receipt through the same S23 gallery path against live Gemini credentials. Treat provider failures as smoke evidence, not as the deterministic gate.
5. **Later: Firebase Test Lab Android smoke.** Use the built Android APK for limited Android device coverage. The Spark/no-cost quota is useful for small smoke runs, and Test Lab gives logs, screenshots, and videos, but Robo tests are less deterministic than Maestro. Treat Test Lab as a device-coverage supplement, not the main journey assertion.
6. **Phase 5 final gate.** Maestro remains the deterministic journey gate for Android hardware. Firebase Test Lab becomes an Android compatibility lane once the APK and data reset story are stable. The Android gate uses the Railway `staging-e2e` API and runs the golden sign in -> scan -> stream -> transaction -> edit -> sign out -> reauth clean-home flow plus review/failure/camera-denied edges. iOS simulator/device proof is deferred post-roadmap.

## E2E Auth

Automated E2E uses staging Firebase Auth users, not the real Google OAuth UI. The development build should point at the staging Firebase project through the native service files and should expose the E2E sign-in button with:

```bash
EXPO_PUBLIC_E2E_AUTH_ENABLED=true
EXPO_PUBLIC_E2E_AUTH_MODE=staging
EXPO_PUBLIC_E2E_AUTH_EMAIL=<staging-e2e-user-email>
EXPO_PUBLIC_E2E_AUTH_PASSWORD=<staging-e2e-user-password>
```

If the mobile app calls a local backend, run that backend against the same staging Firebase project. Local can use SQLite and the mock scan provider, but it cannot close runtime proof gates:

```bash
GASTIFY_ENVIRONMENT=local
GASTIFY_SCAN_PROVIDER=mock
GASTIFY_DATABASE_URL=sqlite+aiosqlite:///../.tmp/local/gastify.db
GASTIFY_FIREBASE_PROJECT_ID=<staging-firebase-project-id>
GASTIFY_FIREBASE_CREDENTIALS_PATH=/secure/path/staging-admin.json
```

The staging user must be safe for automated reuse and reset. Store the password and service-account files outside git. Because `EXPO_PUBLIC_E2E_AUTH_PASSWORD` is bundled into E2E-enabled dev builds, use only a disposable staging-only account and never distribute that build outside the test lane.

Use `npm run check:expo-config` instead of raw `npx expo config --type public` in local logs; the wrapper redacts `e2eAuthPassword`.

To create or refresh the user from Firebase Admin:

```bash
cd ../backend
GASTIFY_FIREBASE_PROJECT_ID=<staging-firebase-project-id> \
GASTIFY_FIREBASE_CREDENTIALS_PATH=/secure/path/staging-admin.json \
GASTIFY_MOBILE_E2E_EMAIL=<staging-e2e-user-email> \
GASTIFY_MOBILE_E2E_PASSWORD=<staging-e2e-user-password> \
uv run python ../tests/mobile/scripts/setup-staging-auth-user.py --execute --reset-password
```

Before running Maestro, generate a setup report:

```bash
npm run doctor:e2e
npm run verify:staging-auth
```

The report is saved at `../tests/mobile/results/latest/<env>/environment/mobile-doctor.txt`.

## Maestro

Maestro flows live in `../tests/mobile/maestro/`.

Android setup details live in `ANDROID_E2E_SETUP.md`.

```bash
../tests/mobile/scripts/run-maestro.sh
npm run maestro:scan-entry:active
```

The runner writes durable proof to `../tests/mobile/results/runs/<env>/<run-id>/<flow-name>/` and mirrors the latest packet to `../tests/mobile/results/latest/<env>/<flow-name>/`. Use `GASTIFY_MOBILE_RUN_ID=<id>` to group several flows into one environment run. For repeated attempts at the same stage, prefer `GASTIFY_MOBILE_STAGE_ID=<stage>` plus `GASTIFY_MOBILE_ATTEMPT_ID=<attempt>`; this writes `runs/<env>/<stage>/attempts/<attempt>/<flow-name>/` so `r1`, `r2`, `r3`, and `r4` stay under one stage folder. The staging fixture wrapper sets a shared run id automatically.

The current local environment is WSL2. Maestro is installed under `~/.maestro/bin`, and EAS CLI is available through `npx eas-cli@latest`. Android automation should use the physical Samsung S23 path in `ANDROID_E2E_SETUP.md`; iOS automation requires macOS simulator infrastructure or EAS/device infrastructure.

### Phase 2 Scan Upload Fixture Gate

The required Phase 2 upload proof runs on the physical S23 with a fixture-backed
backend. The fixture mode is backend-only: the app still uses the native gallery
picker, real multipart upload, authenticated WebSocket stream, and normal result
UI. Fixture lookup uses a SHA-256 marker of the raw uploaded image and is refused
when `GASTIFY_ENVIRONMENT=production`.

Preferred enterprise lane: point the mobile app at the Railway
`staging-e2e` API and run the wrapper from the repo root:

```bash
export GASTIFY_STAGING_E2E_API_BASE_URL=https://<gastify-api-staging-e2e-domain>
export MAESTRO_DEVICE_ID="RFCW90N4BYP"
bash scripts/staging/run-s23-fixture-gate.sh
```

Local fallback only, not completion evidence:

Start the backend in one terminal:

```bash
GASTIFY_DATABASE_URL=<local-or-staging-e2e-postgres-url> \
GASTIFY_ENVIRONMENT=staging-e2e \
GASTIFY_SCAN_PROVIDER=fixture \
GASTIFY_FIREBASE_PROJECT_ID=<staging-firebase-project-id> \
GASTIFY_FIREBASE_CREDENTIALS_PATH=/secure/path/staging-admin.json \
../tests/mobile/scripts/start-scan-fixture-backend.sh
```

Run the physical S23 flows from `mobile/`:

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

Required evidence: `run-manifest.json` plus each flow's `manifest.json`,
`report.html`, screenshots, Maestro log, and command trace in
`../tests/mobile/results/runs/staging-e2e/<run-id>/<flow-name>/`. Stage-grouped
reruns use `../tests/mobile/results/runs/staging-e2e/<stage-id>/attempts/<attempt-id>/<flow-name>/`.
The same latest packets are mirrored under
`../tests/mobile/results/latest/staging-e2e/` for quick inspection only.

### Phase 5 Mobile Journey Gate

The Phase 5 Android gate uses the same S23 / Railway `staging-e2e` lane, but it
groups the end-to-end journey and key runtime edges under one stage folder:

```bash
export GASTIFY_STAGING_E2E_API_BASE_URL=https://<gastify-api-staging-e2e-domain>
export MAESTRO_DEVICE_ID="RFCW90N4BYP"
bash scripts/staging/run-s23-phase5-gate.sh
```

By default, repeated attempts on the same UTC day write under:

```text
tests/mobile/results/runs/staging-e2e/<YYYYMMDD>-phase5-s23-clean-gate/attempts/<HHMMSSZ>/
```

For named retries, set both values explicitly:

```bash
export GASTIFY_MOBILE_STAGE_ID=20260524-phase5-s23-clean-gate
export GASTIFY_MOBILE_ATTEMPT_ID=r4
bash scripts/staging/run-s23-phase5-gate.sh
```

The golden flow is `tests/mobile/maestro/p4-phase5-golden-journey-active.yaml`.
It signs in, scans the seeded receipt through the native gallery picker and
WebSocket stream, opens the created transaction, edits the merchant, signs out,
signs in again, and asserts the home screen no longer shows the prior scan
result. The wrapper then runs the review, scan-failure, and camera-permission
flows so the packet covers the Phase 5 edge list that needs native runtime proof.

iOS runtime testing is not part of the current Phase 5 closure. It is tracked
as the post-roadmap deferred lane in D47/P31 and should come back with an iOS
EAS/dev-client or TestFlight path, Maestro simulator/device execution, and the
same artifact-backed clean-home proof after the P1-P9 roadmap is implemented.

## Firebase Auth Emulator Fallback

The Firebase Auth Emulator remains an optional auth fallback. It is not the Android emulator path. Use it only when staging is unavailable:

```bash
EXPO_PUBLIC_E2E_AUTH_MODE=emulator
EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```
