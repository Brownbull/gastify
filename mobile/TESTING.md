# Gastify Mobile Testing

## Layers

1. **Static gates:** `npm run generate:api`, `npm run typecheck`, `npm run check:expo-config`, `npm audit --audit-level=high`.
2. **Jest/RNTL:** component, provider, session, SecureStore, and API-client behavior that can run without a simulator. The project uses the React Native 0.83 Jest preset because RN moved the preset out of `react-native/jest-preset`; Expo-native modules are mocked explicitly where needed.
3. **Maestro:** native development-build E2E for Android and iOS behavior that Jest cannot prove. Android runs should target the physical Samsung S23 lane, not the local emulator path on this WSL2 machine.

## Local Fast Path

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

1. **Now: fast checks + staging auth.** Run Jest/RNTL, typecheck, API drift, Expo config, audit, `doctor:e2e`, and `verify:staging-auth`. This proves JS behavior, config readiness, and the staging Firebase email/password path. It does not prove native screenshots, camera, SecureStore eviction, or platform permissions.
2. **Next: Samsung S23 physical smoke.** Build an EAS Android APK, install it on the USB-connected S23, point it at staging or a LAN-reachable backend, and capture the first real screenshots under `../tests/mobile/artifacts/latest/p4-phase1-smoke/`.
3. **Automation: Maestro on the same host side as ADB.** Run `../tests/mobile/scripts/run-maestro.sh` only when ADB and Maestro both see the authorized S23. In WSL2, that means either attaching USB into WSL or running ADB + Maestro together on Windows.
4. **Later: Firebase Test Lab Android smoke.** Use the built Android APK for limited Android device coverage. The Spark/no-cost quota is useful for small smoke runs, and Test Lab gives logs, screenshots, and videos, but Robo tests are less deterministic than Maestro. Treat Test Lab as a device-coverage supplement, not the main journey assertion.
5. **Phase 5 final gate.** Maestro remains the deterministic journey gate for Android hardware and the best available iOS simulator/device lane. Firebase Test Lab becomes an Android compatibility lane once the APK and data reset story are stable.

## E2E Auth

Automated E2E uses staging Firebase Auth users, not the real Google OAuth UI. The development build should point at the staging Firebase project through the native service files and should expose the E2E sign-in button with:

```bash
EXPO_PUBLIC_E2E_AUTH_ENABLED=true
EXPO_PUBLIC_E2E_AUTH_MODE=staging
EXPO_PUBLIC_E2E_AUTH_EMAIL=<staging-e2e-user-email>
EXPO_PUBLIC_E2E_AUTH_PASSWORD=<staging-e2e-user-password>
```

If the mobile app calls a local backend, run that backend against the same staging Firebase project:

```bash
GASTIFY_ENVIRONMENT=staging
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

The report is saved at `../tests/mobile/artifacts/latest/environment/mobile-doctor.txt`.

## Maestro

Maestro flows live in `../tests/mobile/maestro/`.

Android setup details live in `ANDROID_E2E_SETUP.md`.

```bash
../tests/mobile/scripts/run-maestro.sh
```

The runner writes screenshots, reports, logs, and command traces to `../tests/mobile/artifacts/latest/<flow-name>/`. Pass `--archive` to move the existing latest run into `../tests/mobile/artifacts/archive/` before rewriting it.

The current local environment is WSL2. Maestro is installed under `~/.maestro/bin`, and EAS CLI is available through `npx eas-cli@latest`. Android automation should use the physical Samsung S23 path in `ANDROID_E2E_SETUP.md`; iOS automation requires macOS simulator infrastructure or EAS/device infrastructure.

## Firebase Auth Emulator Fallback

The Firebase Auth Emulator remains an optional auth fallback. It is not the Android emulator path. Use it only when staging is unavailable:

```bash
EXPO_PUBLIC_E2E_AUTH_MODE=emulator
EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```
