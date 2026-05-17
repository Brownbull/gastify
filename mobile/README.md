# Gastify Mobile

Cross-platform Expo/React Native app for the Gastify mobile MVP.

## Stack

- Expo 55 + React Native 0.83
- React Navigation native stack
- React Native Firebase Auth + Google Sign-In
- Expo SecureStore for the API bearer-token snapshot
- TanStack Query for server state
- Zustand for scoped client state
- openapi-fetch with generated backend types

## Setup

```bash
npm install
cp .env.example .env
npm run generate:api
```

Fill the Firebase and Google client IDs in `.env`. Native Firebase service files stay local:

- `google-services.json` for Android
- `GoogleService-Info.plist` for iOS

## Development

```bash
npm start
npm run start:dev-client
npm run android
npm run ios
npm test
npm run typecheck
```

The app expects the backend API at `EXPO_PUBLIC_API_BASE_URL`. For the Samsung S23 lane, use a staging API, a LAN-reachable backend URL, or `adb reverse` with `http://127.0.0.1:8000`.

Installable development builds use `expo-dev-client`; EAS profiles live in `eas.json`. See `ANDROID_E2E_SETUP.md` for the physical Android + Maestro screenshot lane. Local `npm run android` is still available as an Expo escape hatch, but it can regenerate `android/` and consume local build resources.

## Auth And Storage

React Native Firebase owns the native Firebase session. The API ID token used by `openapi-fetch` is mirrored into SecureStore so `/gabe-review` and later Phase 4 can verify platform keystore/keychain eviction independently from query/store cleanup.

## Testing

Fast local gates:

```bash
npm run generate:api
npm run typecheck
npm test
npm run check:expo-config
npm audit --audit-level=high
```

Native E2E is driven by Maestro against development builds. Automated E2E uses staging Firebase Auth test users rather than the real Google OAuth UI:

```bash
EXPO_PUBLIC_E2E_AUTH_ENABLED=true
EXPO_PUBLIC_E2E_AUTH_MODE=staging
EXPO_PUBLIC_E2E_AUTH_EMAIL=<staging-e2e-user-email>
EXPO_PUBLIC_E2E_AUTH_PASSWORD=<staging-e2e-user-password>
```

The development build must include staging Firebase service files and the backend must validate the same staging Firebase project. Run `npm run doctor:e2e` before Maestro to write a setup report under `../tests/mobile/artifacts/latest/environment/`.

The Firebase Auth Emulator is still available for fallback by setting `EXPO_PUBLIC_E2E_AUTH_MODE=emulator` and `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. The Maestro flows live under `../tests/mobile/maestro/`.
