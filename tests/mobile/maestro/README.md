# Mobile Maestro Flows

These flows target installable Expo development builds, not Expo Go. They use stable React Native `testID` values and the staging Firebase Auth test-user path.

## Prerequisites

- Install a development build with app id `com.gastify.mobile`.
- Connect the Samsung S23 over USB and verify `adb devices` shows an authorized `device`.
- Build the app with staging Firebase service files.
- Configure `EXPO_PUBLIC_E2E_AUTH_ENABLED=true` and `EXPO_PUBLIC_E2E_AUTH_MODE=staging`.
- Provide staging E2E email/password through local env or CI secrets.
- Point `EXPO_PUBLIC_API_BASE_URL` at staging, or start a local backend with staging Firebase Admin credentials.
- Run `cd mobile && npm run doctor:e2e` and inspect `tests/mobile/artifacts/latest/environment/mobile-doctor.txt`.

## Run

Verified S23 / WSL-native path:

```bash
cd mobile
export ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
export EXPO_DEV_CLIENT_URL='exp+gastify-mobile://expo-development-client/?url=<encoded-metro-url>'

npm run maestro:open-dev-client
npm run maestro:install-driver
MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active
```

The active flow assumes the Expo dev-client URL has already opened the app. It avoids the `openLink` flake seen on the S23 and skips Maestro's automatic driver reinstall after the bundled driver APKs are installed.

The older all-in-one flow remains available:

```bash
tests/mobile/scripts/run-maestro.sh
```

The runner writes screenshots, `report.html`, `maestro.log`, and command traces to:

```text
tests/mobile/artifacts/latest/<flow-name>/
```

To keep the previous run before rewriting `latest/`:

```bash
tests/mobile/scripts/run-maestro.sh tests/mobile/maestro/p4-phase1-smoke-active.yaml --archive
```

Later P4 phases should extend this directory with camera, WebSocket stream, transaction edit, sign-out eviction, and push-permission flows.

The Firebase Auth Emulator remains a fallback by setting `EXPO_PUBLIC_E2E_AUTH_MODE=emulator`, but staging is the default lane for P4 mobile E2E.
