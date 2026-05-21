# Android Device E2E Setup

This is the Android lane for the current machine: use a physical Samsung S23 over USB, not a local Android emulator.

## Current Decision

The WSL2 + Windows Android emulator path is deprecated for Gastify P4. It consumed local disk and CPU/RAM through generated native folders, Android SDK shims, Gradle builds, and emulator runtime, while Maestro remained unstable across the WSL-to-Windows ADB boundary.

Keep WSL for fast JS/config checks. Use the S23 for Android native proof.

## Current Repo-Side Status

- Expo development builds are enabled with `expo-dev-client`.
- `mobile/eas.json` has development and E2E APK profiles.
- EAS project `@brownbull/gastify-mobile` is linked through project id `eecbbed5-3325-4687-9756-c3b1135e3de5`.
- Maestro flows live under `tests/mobile/maestro/`.
- `tests/mobile/scripts/run-maestro.sh` expects an authorized physical Android device visible to ADB.
- Local generated Android build folders are ignored and should stay disposable.

Removed/deprecated from the local path:

- Generated `mobile/android/` native project from local prebuilds.
- Generated `.android-sdk-shim/` WSL-to-Windows SDK bridge.
- Local non-admin JDK/platform-tools installers used for emulator retries.
- Experimental WSL ADB bridge.

## Phone Prep

On the Samsung S23:

1. Enable Developer options.
2. Enable USB debugging.
3. Connect by USB and choose a data-capable USB mode if prompted.
4. Approve the computer fingerprint prompt.
5. Keep the phone unlocked during install and Maestro runs.

Expected host check:

```bash
adb devices
```

The device must show as `device`, not `unauthorized`.

For longer smoke sessions, keep the S23 awake only while USB is plugged in:

```bash
adb shell svc power stayon usb
```

This sets Android's `stay_on_while_plugged_in` mode to USB-only. It stops keeping the phone awake when the USB cable is disconnected. To turn it off explicitly:

```bash
adb shell svc power stayon false
```

## Host Rule

Maestro and ADB must see the same physical device from the same host side.

On this WSL2 machine, Windows `adb.exe` may see the S23 while Linux Maestro cannot control it through the same local ADB server. Do not revive the old WSL emulator bridge. If that split appears, use one of these lanes:

- Run ADB + Maestro together on Windows.
- Attach the USB device directly into WSL2 with `usbipd-win`, then use native Linux ADB + Maestro in WSL.
- Use the S23 for manual APK smoke now and defer automated Maestro until one of the above host paths is stable.

The repo runner enforces this: `tests/mobile/scripts/run-maestro.sh` exits early from WSL when ADB resolves to the Windows wrapper instead of native Linux ADB.

## WSL Native ADB + Maestro Probe

This is the preferred automation path for this machine because it keeps Maestro in WSL while using the physical S23.

Installed local pieces:

- Windows `usbipd-win` 5.3.0.
- Native Linux Android platform-tools at `~/.local/share/gastify/android-platform-tools/platform-tools`.
- S23 usbipd bus id: `2-2` (`04e8:6860`, serial `RFCW90N4BYP`).

One-time WSL permission rule, from WSL:

```bash
printf '%s\n' 'SUBSYSTEM=="usb", ATTR{idVendor}=="04e8", MODE="0666", GROUP="plugdev", TAG+="uaccess"' \
  | sudo tee /etc/udev/rules.d/51-android-samsung.rules >/dev/null
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Attach the S23 into WSL from Windows PowerShell. The `bind --force` command requires administrator approval and temporarily makes Windows stop using the phone's USB interfaces:

```powershell
& 'C:\Program Files\usbipd-win\usbipd.exe' bind --force --busid 2-2
& 'C:\Program Files\usbipd-win\usbipd.exe' attach --wsl --busid 2-2
```

Verify native WSL ADB:

```bash
ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
"$ADB_BIN" kill-server
"$ADB_BIN" devices -l
```

Expected: `RFCW90N4BYP device`. If it shows `no permissions`, the udev rule above has not been applied to the current USB attachment; detach/reattach after reloading udev rules.

Run Maestro with native WSL ADB after the dev client is already open:

```bash
ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb" \
MAESTRO_REINSTALL_DRIVER=false \
  tests/mobile/scripts/run-maestro.sh tests/mobile/maestro/p4-phase1-smoke-active.yaml
```

Restore normal Windows ADB behavior:

```powershell
& 'C:\Program Files\usbipd-win\usbipd.exe' detach --busid 2-2
& 'C:\Program Files\usbipd-win\usbipd.exe' unbind --busid 2-2
```

If either command reports `Access denied`, rerun it from an Administrator PowerShell. `Shared (forced)` means Windows is still sharing the phone even if WSL ADB no longer sees it; `unbind` clears that state.

Current probe result: USB/IP attach works, WSL native ADB sees `RFCW90N4BYP device`, `npm run doctor:e2e` passes its ADB check with the native Linux platform-tools path, and the Phase 1 active Maestro smoke passed on the S23. Maestro's `openLink` startup was unreliable on this Samsung/Expo dev-client combination, and Maestro's automatic Android driver reinstall can stall after device selection. The stable path is to open the Expo dev-client URL with ADB first, preinstall Maestro's bundled driver APKs, then run the active flow with `MAESTRO_REINSTALL_DRIVER=false`.

## Backend URL

A physical phone cannot reach WSL `localhost`. Prefer a staging API, or expose the local backend on the LAN:

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0
```

Then set:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8000
```

If ADB is stable, `adb reverse tcp:8000 tcp:8000` is also acceptable and lets the phone call `http://127.0.0.1:8000`.

## Build Without Local Emulator Load

Preferred path: build an Android APK through EAS so this machine does not regenerate `mobile/android/` or run Gradle locally.

EAS requires an Expo account. A personal Expo account is fine for this phase; the project can move under an organization later.

```bash
cd mobile
npm run eas:whoami
# if not logged in, create/sign into an account:
# https://expo.dev/signup
npx eas-cli@latest login
npm run eas:build:android:e2e
```

Cloud EAS builds cannot read ignored local Firebase files unless they are uploaded as EAS file env vars. Create or refresh them from `mobile/` when needed:

```bash
npx eas-cli@latest env:create development --name GOOGLE_SERVICES_JSON --type file --visibility secret --value google-services.json --force
npx eas-cli@latest env:create development --name GOOGLE_SERVICE_INFO_PLIST --type file --visibility secret --value GoogleService-Info.plist --force
```

Install the APK on the S23 using the EAS artifact link, Android Studio, or ADB:

```bash
adb install -r path/to/gastify-e2e.apk
```

Start Metro for the dev client. If the phone can reach the host LAN directly, `--host lan` is fine:

```bash
cd mobile
npm run start:dev-client -- --host lan
```

On this WSL2 + Windows ADB machine, the verified manual-smoke path is Expo tunnel mode. It avoids the Windows localhost / WSL Metro gap that can make ADB reverse return a broken response:

```bash
cd mobile
npm run start:dev-client -- --host tunnel
```

The first tunnel run may prompt to install `@expo/ngrok`; accept it. Then open the printed `exp+gastify-mobile://...` URL on the S23. With ADB:

```bash
adb shell am start -a android.intent.action.VIEW -d 'exp+gastify-mobile://expo-development-client/?url=<encoded-metro-url>' com.gastify.mobile
```

Open the Gastify dev build on the phone and connect it to the Metro server.
Keep the phone unlocked and awake; otherwise ADB screenshots may be black or show the Android bouncer while the app is focused underneath.

## Run The Smoke

For the verified WSL-native S23 lane, keep the Metro tunnel running, export native Linux ADB, open the dev-client URL, then run the active Maestro flow. From `mobile/`:

```bash
export ADB_BIN="$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb"
export EXPO_DEV_CLIENT_URL='exp+gastify-mobile://expo-development-client/?url=<encoded-metro-url>'

npm run maestro:open-dev-client
npm run maestro:install-driver
MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active
```

If Expo shows its first-run developer menu, tap **Continue** and close the menu before starting Maestro. Avoid `CLEAR_APP_STATE=true` unless you intentionally want to reset the dev-client state.

The active runner writes report HTML, logs, command traces, and screenshots to:

```text
tests/mobile/results/runs/<env>/<run-id>/p4-phase1-smoke-active/
```

The latest packet is also mirrored to `tests/mobile/results/latest/<env>/`.
The old `--archive` flag is no longer needed because each run gets a durable
run folder.

The older `p4-phase1-smoke.yaml` flow still documents the all-in-one `openLink` idea, but on this S23 it can leave the phone at the Android home screen. Prefer `p4-phase1-smoke-active.yaml` until a later phase proves a better Expo dev-client launch hook.

If Maestro stalls after selecting the S23 or `maestro hierarchy` hangs, reset the local Android driver packages and retry:

```bash
npm run maestro:reset-driver
npm run maestro:install-driver
MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active
```

## Fast Checks That Do Not Need The Phone

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

`npm run doctor:e2e` may warn when the S23 is not connected. That is expected for fast WSL-only checks.

## Deprecated Local Emulator Path

Do not spend more time on the local Android emulator path in this environment. Specifically avoid:

- Recreating `.android-sdk-shim/`.
- Reintroducing the WSL ADB bridge.
- Running local Gradle/prebuild loops just to produce screenshots.
- Treating Windows emulator visibility through `adb.exe` as sufficient for Linux Maestro.

Local `npx expo run:android` remains a generic Expo escape hatch, but it can regenerate `mobile/android/` and consume more than 1 GB. Use it only if you intentionally want a local native build.
