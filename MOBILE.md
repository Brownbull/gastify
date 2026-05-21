# Gastify Mobile Runbook

Quick commands for spinning up and testing the Expo/React Native mobile app.

## Resume Next Session

Last known good state, 2026-05-15:

- Phase 1 Android physical-device automation is green on the Samsung S23.
- The local Android emulator path is intentionally retired for this machine.
- The stable automation lane is WSL `usbipd-win` + native Linux ADB + Expo dev client + Maestro active flow.
- Latest evidence from the passing run is under `tests/mobile/artifacts/latest/p4-phase1-smoke-active/`.
- Phase 1 still needs review/commit/push before advancing to Phase 2.

Spin-up checklist:

```bash
cd /home/khujta/projects/apps/gastify
git status --short
cd mobile
npm run doctor:e2e
```

Attach the S23 to WSL from Windows PowerShell. Confirm the current bus id first because it can change after reboot:

```powershell
& 'C:\Program Files\usbipd-win\usbipd.exe' list
& 'C:\Program Files\usbipd-win\usbipd.exe' bind --force --busid 2-2
& 'C:\Program Files\usbipd-win\usbipd.exe' attach --wsl --busid 2-2
```

Then from WSL:

```bash
export ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
"$ADB_BIN" devices -l
```

Expected: `RFCW90N4BYP device`.

Start the dev client and run the proven smoke:

```bash
cd /home/khujta/projects/apps/gastify/mobile
npm run start:dev-client -- --host tunnel
```

Copy the printed `exp+gastify-mobile://...` URL into another WSL shell:

```bash
cd /home/khujta/projects/apps/gastify/mobile
export ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
export EXPO_DEV_CLIENT_URL='exp+gastify-mobile://expo-development-client/?url=<encoded-metro-url>'

npm run maestro:open-dev-client
npm run maestro:install-driver
MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active -- --archive
```

If Maestro stalls after selecting the S23:

```bash
npm run maestro:reset-driver
npm run maestro:install-driver
MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active -- --archive
```

Shutdown cleanup after a hardware session:

```bash
export ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
"$ADB_BIN" shell svc power stayon false
```

Then from Windows PowerShell:

```powershell
& 'C:\Program Files\usbipd-win\usbipd.exe' detach --busid 2-2
& 'C:\Program Files\usbipd-win\usbipd.exe' unbind --busid 2-2
```

If either command reports `Access denied`, open PowerShell as Administrator and rerun the same command. If `usbipd list` shows the phone as `Shared (forced)` after WSL ADB no longer sees it, the phone is detached from WSL but still USB-shared by Windows; run the admin `unbind` before expecting normal Windows ADB behavior.

## Prerequisites

- Node 20 + npm
- Backend env configured enough to run FastAPI
- Native Firebase files kept local only:
  - `mobile/google-services.json` for Android
  - `mobile/GoogleService-Info.plist` for iOS
- A development build. Do not use Expo Go; this app uses React Native Firebase native modules.

## First Setup

```bash
cd mobile
npm install
cp .env.example .env
npm run generate:api
```

Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` to the backend URL reachable by the target device:

| Target | API URL example |
|---|---|
| Railway staging API | `https://<gastify-api-staging-domain>` |
| Railway staging-e2e API | `https://<gastify-api-staging-e2e-domain>` |
| Samsung S23 on same Wi-Fi | `http://<your-lan-ip>:8000` |
| Samsung S23 with `adb reverse tcp:8000 tcp:8000` | `http://127.0.0.1:8000` |
| iOS simulator on macOS | `http://127.0.0.1:8000` |

## Start The Backend

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0
```

## Run The App

```bash
cd mobile
npm start
npm run ios
```

This local WSL2 environment should not use the Android emulator path for P4. Use the physical Samsung S23 lane in `mobile/ANDROID_E2E_SETUP.md`, preferably with an EAS APK so local Gradle/prebuild work does not recreate the ignored `mobile/android/` folder.

Maestro is installed locally under `~/.maestro/bin`; the mobile scripts can find it even before a new shell picks up the PATH update. EAS CLI is available through `npx eas-cli@latest`, but cloud builds require Expo login.

`npm start` starts Metro, the mobile JavaScript bundler/dev server. It is not the Gastify API server. The API server is the FastAPI process from the previous section.

Browser note: Expo can run web apps in a browser, but this mobile app uses React Native Firebase native modules. Browser testing is useful only for a separate web-compatible harness; the real mobile proof needs a dev build in an emulator/simulator/device.

## Fast Test Gates

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

Expected current result: Jest passes 6 suites / 14 tests. `npm audit --audit-level=high` passes; moderate Expo/PostCSS-chain findings remain.

## Staging E2E Auth

For mobile E2E, use staging Firebase Auth test users by default. This follows the legacy BoletApp pattern: real staging project, controlled test accounts, and automated tests that avoid the brittle Google OAuth UI.

In `mobile/.env`, point the app at the staging API or at a local backend configured to verify staging Firebase tokens:

```bash
EXPO_PUBLIC_API_BASE_URL=https://<staging-api>
EXPO_PUBLIC_E2E_AUTH_ENABLED=true
EXPO_PUBLIC_E2E_AUTH_MODE=staging
EXPO_PUBLIC_E2E_AUTH_EMAIL=<staging-e2e-user-email>
EXPO_PUBLIC_E2E_AUTH_PASSWORD=<staging-e2e-user-password>
GOOGLE_SERVICES_JSON=./google-services.json
GOOGLE_SERVICE_INFO_PLIST=./GoogleService-Info.plist
```

If using a local backend instead of a deployed staging API, it must verify the same staging Firebase project:

```bash
cd backend
GASTIFY_ENVIRONMENT=staging \
GASTIFY_FIREBASE_PROJECT_ID=<staging-firebase-project-id> \
GASTIFY_FIREBASE_CREDENTIALS_PATH=/secure/path/staging-admin.json \
uv run uvicorn app.main:app --reload
```

Keep staging passwords, service-account JSON, `google-services.json`, and `GoogleService-Info.plist` local or in CI secrets. Do not commit them. Because `EXPO_PUBLIC_E2E_AUTH_PASSWORD` is bundled into E2E-enabled dev builds, use only a disposable staging-only account and never distribute that build outside the test lane.

Run the setup doctor before Maestro:

```bash
cd mobile
npm run doctor:e2e
```

The doctor writes `tests/mobile/artifacts/latest/environment/mobile-doctor.txt` and overwrites it on each run.

Verify the actual staging email/password path:

```bash
cd mobile
npm run verify:staging-auth
```

This calls Firebase Identity Toolkit with the ignored staging credentials and prints only the email + uid, never the password.

Use `npm run check:expo-config` for Expo config checks. Raw `npx expo config --type public` can print the E2E password because Expo public config is bundled into E2E-enabled development builds.

## E2E Roadmap

1. **Current gate:** JS checks, API drift, staging config doctor, staging Firebase sign-in verification, and Samsung S23 Phase 1 Maestro smoke.
2. **Android hardware gate:** WSL-native ADB through `usbipd-win`, Expo tunnel dev client, and `p4-phase1-smoke-active.yaml` with `MAESTRO_REINSTALL_DRIVER=false`.
3. **Next gate:** Phase 2 camera scan + WebSocket progress on the same S23 lane against the Railway `staging-e2e` API, with local backends used only as fallback.
4. **Build runway:** EAS Build for Android APK and iOS simulator app artifacts; avoid local emulator/Gradle loops unless intentionally debugging native build output.
5. **Final P4 gate:** Maestro scripted golden journey on Android hardware plus the best available iOS simulator/device lane. Firebase Test Lab remains Android compatibility coverage, not the main deterministic assertion.

Android setup details live in `mobile/ANDROID_E2E_SETUP.md`.

## Maestro E2E Smoke

Build/run a development build with the staging environment above. On this machine, prefer the active S23 flow:

```bash
cd mobile
export ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
export EXPO_DEV_CLIENT_URL='exp+gastify-mobile://expo-development-client/?url=<encoded-metro-url>'

npm run maestro:open-dev-client
npm run maestro:install-driver
MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active -- --archive
```

The staging E2E user must already exist in Firebase Auth and be safe to reset or reuse between tests.

To create or refresh that user with Firebase Admin, use the staging-only setup script. It refuses to run unless the Firebase project id contains `staging`, and it only mutates data with `--execute`:

```bash
cd backend
GASTIFY_FIREBASE_PROJECT_ID=<staging-firebase-project-id> \
GASTIFY_FIREBASE_CREDENTIALS_PATH=/secure/path/staging-admin.json \
GASTIFY_MOBILE_E2E_EMAIL=<staging-e2e-user-email> \
GASTIFY_MOBILE_E2E_PASSWORD=<staging-e2e-user-password> \
uv run python ../tests/mobile/scripts/setup-staging-auth-user.py --execute --reset-password
```

The active runner saves visual evidence under `tests/mobile/artifacts/latest/p4-phase1-smoke-active/`:

- `01-sign-in.png`
- `02-home.png`
- `03-signed-out.png`
- `report.html`
- `maestro.log`
- Maestro command traces

`latest/` is overwritten on normal runs. To preserve the prior run first:

```bash
tests/mobile/scripts/run-maestro.sh --archive
```

Archived runs go under `tests/mobile/artifacts/archive/`. Generated artifacts are ignored by git so screenshots do not pollute the repo root or commits.

## Firebase Auth Emulator Fallback

The Firebase Auth Emulator remains available as an explicit auth fallback, but it is unrelated to Android device execution and is not the preferred P4 lane. To use it, set:

```bash
EXPO_PUBLIC_E2E_AUTH_MODE=emulator
EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```
