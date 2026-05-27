# Gastify Mobile

Cross-platform Expo/React Native app for the Gastify mobile MVP.

## Stack

- Expo 55 + React Native 0.83
- React Navigation native stack
- React Native Firebase Auth + Google Sign-In
- Expo SecureStore for the API bearer-token snapshot
- Expo ImagePicker for camera and library receipt capture
- Expo DocumentPicker for statement PDF upload
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

The app expects the backend API at `EXPO_PUBLIC_API_BASE_URL`. For the Samsung S23 lane, use the Railway `staging-e2e` API for deterministic fixture proof, the Railway `staging` API for live Gemini smoke, or a local backend only for development fallback.

Installable development builds use `expo-dev-client`; EAS profiles live in `eas.json`. See `ANDROID_E2E_SETUP.md` for the physical Android + Maestro screenshot lane. Local `npm run android` is still available as an Expo escape hatch, but it can regenerate `android/` and consume local build resources.

## Auth And Storage

React Native Firebase owns the native Firebase session. The API ID token used by `openapi-fetch` is mirrored into SecureStore so `/gabe-review` and later Phase 4 can verify platform keystore/keychain eviction independently from query/store cleanup.

## Receipt Scans

The home screen exposes camera and image-library receipt capture. Selected images are validated locally, uploaded as multipart form data to `POST /api/v1/scans`, then tracked through the backend WebSocket stream at `/ws/scans/{scan_id}?token=<firebase-id-token>`.

The scan store maps backend progress events into the native stages shown in the UI: submitted, processing, extracting, categorizing, verified, complete, and failed. Terminal `scan_complete` payloads surface low-confidence and new-merchant review signals when the backend provides them.

## Statement Scans

The Statements screen exposes the Android-native P5 journey: choose a statement
PDF, optionally select or create a card alias, provide a PDF password when
needed, and accept per-scan AI-processing consent before upload. The app posts
multipart data to `POST /api/v1/statements` and follows extraction/reconciliation
progress over `/ws/statements/{statement_id}?token=<firebase-id-token>`.

Completed statement scans render the coverage metric and reconciliation buckets:
matched, statement-only, app-only, ambiguous, and failed. Statement-only
candidates can be added as uncategorized statement transactions with one flagged
`Unidentified statement item`; the mobile app does not collect PAN, CVV, expiry,
or other PCI-shaped card fields.

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

The development build must include staging Firebase service files and the backend must validate the same staging Firebase project. Run `npm run doctor:e2e` before Maestro to write a setup report under `../tests/mobile/results/latest/<env>/environment/`.

Production builds set `EXPO_PUBLIC_APP_ENV=production` and must not enable E2E auth. `mobile/app.config.ts` fails the Expo config step if `EXPO_PUBLIC_E2E_AUTH_ENABLED=true` is combined with production.

The Firebase Auth Emulator is still available for fallback by setting `EXPO_PUBLIC_E2E_AUTH_MODE=emulator` and `EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. The Maestro flows live under `../tests/mobile/maestro/`.
