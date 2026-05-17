# Mobile Staging Setup

Use this when preparing Gastify mobile E2E against the staging Firebase project.

## Official Firebase Links

- Firebase Console: <https://console.firebase.google.com/>
- Project settings: `https://console.firebase.google.com/project/<PROJECT_ID>/settings/general`
- Service accounts: `https://console.firebase.google.com/project/<PROJECT_ID>/settings/serviceaccounts/adminsdk`
- Authentication providers: `https://console.firebase.google.com/project/<PROJECT_ID>/authentication/providers`
- Firebase Admin SDK setup: <https://firebase.google.com/docs/admin/setup>
- Download Firebase config files: <https://support.google.com/firebase/answer/7015592>
- Android app setup: <https://firebase.google.com/docs/android/setup>
- Apple app setup: <https://firebase.google.com/docs/ios/setup>
- Email/password auth: <https://firebase.google.com/docs/auth/web/password-auth>

## Files You Fill

`mobile/.env` is the local fill-in file. It is ignored by git.

Keep these secret files local:

- `.secrets/gastify-staging-admin.json`
- `mobile/google-services.json`
- `mobile/GoogleService-Info.plist`

## Step 1: Create The Firebase Admin Key

In Firebase Console for the staging project:

1. Open Project settings.
2. Open Service accounts.
3. Generate a new private key.
4. Save it locally as:

```bash
mkdir -p .secrets
chmod 700 .secrets
# move the downloaded JSON to:
# .secrets/gastify-staging-admin.json
chmod 600 .secrets/gastify-staging-admin.json
```

`.secrets/` is ignored by git. Do not force-add files from this folder.

## Step 2: Create Native Firebase App Config Files

In the same staging Firebase project, create or verify apps for:

- Android package: `com.gastify.mobile`
- iOS bundle id: `com.gastify.mobile`

Current staging app registrations:

- Android app id: `1:52976046656:android:9cfc34aa6f6f49547dc5a5`
- iOS app id: `1:52976046656:ios:9237b76118e177167dc5a5`

Download and place:

```text
mobile/google-services.json
mobile/GoogleService-Info.plist
```

Both files are ignored by git.

## Step 3: Fill `mobile/.env`

Fill these values:

```bash
GASTIFY_FIREBASE_PROJECT_ID=<staging-firebase-project-id>
GASTIFY_FIREBASE_CREDENTIALS_PATH=/home/khujta/projects/apps/gastify/.secrets/gastify-staging-admin.json

GASTIFY_MOBILE_E2E_EMAIL=<disposable-staging-e2e-email>
GASTIFY_MOBILE_E2E_PASSWORD=<disposable-staging-e2e-password>

EXPO_PUBLIC_API_BASE_URL=<staging-api-url-or-local-backend-url>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<staging-web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<staging-ios-client-id>
EXPO_PUBLIC_E2E_AUTH_ENABLED=true
EXPO_PUBLIC_E2E_AUTH_MODE=staging
EXPO_PUBLIC_E2E_AUTH_EMAIL=<same-email-as-GASTIFY_MOBILE_E2E_EMAIL>
EXPO_PUBLIC_E2E_AUTH_PASSWORD=<same-password-as-GASTIFY_MOBILE_E2E_PASSWORD>
```

Use a disposable staging-only password. `EXPO_PUBLIC_E2E_AUTH_PASSWORD` is bundled into E2E-enabled dev builds.

Current local staging defaults:

- E2E email: `gastify-mobile-e2e@gastify-staging.test`
- Samsung S23 local API URL: `http://<your-lan-ip>:8000` or `http://127.0.0.1:8000` when `adb reverse tcp:8000 tcp:8000` is active

The password lives only in ignored `mobile/.env`.

## Step 4: Enable Email/Password Auth

In Firebase Console for staging:

1. Open Authentication.
2. Open Sign-in method.
3. Enable Email/Password.

The automated E2E path uses email/password instead of Google OAuth.

## Optional: Firebase CLI Access

There is no Firebase/GCP MCP connector available in the current Codex session. The local Firebase CLI is installed, so Codex can use it after you authenticate it locally.

User-run authentication:

```bash
firebase login
```

Useful non-secret inspection commands after login:

```bash
firebase projects:list
firebase apps:list --project <staging-firebase-project-id>
firebase apps:sdkconfig ANDROID <android-app-id> -o mobile/google-services.json
firebase apps:sdkconfig IOS <ios-app-id> -o mobile/GoogleService-Info.plist
```

The Admin SDK private key still has to be generated from Firebase Console or Google Cloud IAM by a user with sufficient permissions. Save it as `.secrets/gastify-staging-admin.json`.

## Step 5: Create Or Refresh The Staging Test User

From the repo root:

```bash
set -a
source mobile/.env
set +a

cd backend
uv run python ../tests/mobile/scripts/setup-staging-auth-user.py --execute --reset-password
```

The script refuses to run unless the Firebase project id contains `staging`.

## Step 6: Run The Doctor

From the repo root:

```bash
set -a
source mobile/.env
set +a

cd mobile
npm run doctor:e2e
```

The report is saved to:

```text
tests/mobile/artifacts/latest/environment/mobile-doctor.txt
```

## Step 7: What To Tell Codex

Do not paste secret values into chat. After filling the files, say:

```text
The staging env file is filled.
The Admin SDK JSON is at .secrets/gastify-staging-admin.json.
The native Firebase files are in mobile/.
You can run the staging user setup and doctor.
```
