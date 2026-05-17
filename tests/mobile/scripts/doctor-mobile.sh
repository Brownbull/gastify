#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
MOBILE_DIR="${ROOT_DIR}/mobile"
ENV_FILE="${MOBILE_DIR}/.env"
OUT_DIR="${ROOT_DIR}/tests/mobile/artifacts/latest/environment"
OUT_FILE="${OUT_DIR}/mobile-doctor.txt"

# shellcheck source=tests/mobile/scripts/android-tooling.sh
source "${ROOT_DIR}/tests/mobile/scripts/android-tooling.sh"
export_android_tooling

mkdir -p "${OUT_DIR}"

env_key_is_set() {
  local key="$1"

  if [[ -n "${!key:-}" ]]; then
    return 0
  fi

  if [[ -f "${ENV_FILE}" ]] && grep -Eq "^${key}=.+$" "${ENV_FILE}"; then
    return 0
  fi

  return 1
}

env_key_value() {
  local key="$1"

  if [[ -n "${!key:-}" ]]; then
    printf "%s" "${!key}"
    return 0
  fi

  if [[ -f "${ENV_FILE}" ]]; then
    grep -E "^${key}=" "${ENV_FILE}" | tail -n 1 | cut -d= -f2-
    return 0
  fi

  return 1
}

check_file() {
  local label="$1"
  local path="$2"

  if [[ -f "${path}" ]]; then
    printf "OK   %s\n" "${label}"
  else
    printf "WARN %s missing at %s\n" "${label}" "${path}"
  fi
}

check_env() {
  local label="$1"
  local key="$2"

  if env_key_is_set "${key}"; then
    printf "OK   %s is set\n" "${label}"
  else
    printf "WARN %s is not set (%s)\n" "${label}" "${key}"
  fi
}

check_command() {
  local label="$1"
  local command_name="$2"
  local requirement="$3"

  if command -v "${command_name}" >/dev/null 2>&1; then
    printf "OK   %s available\n" "${label}"
  else
    printf "WARN %s missing (%s)\n" "${label}" "${requirement}"
  fi
}

check_maestro() {
  if command -v maestro >/dev/null 2>&1; then
    printf "OK   Maestro available\n"
  elif [[ -x "${HOME}/.maestro/bin/maestro" ]]; then
    printf "OK   Maestro available at %s\n" "${HOME}/.maestro/bin/maestro"
  else
    printf "WARN Maestro missing (required for native E2E execution)\n"
  fi
}

check_eas() {
  if command -v eas >/dev/null 2>&1; then
    printf "OK   EAS CLI available\n"
  elif command -v npx >/dev/null 2>&1; then
    printf "OK   EAS CLI available through npx\n"
  else
    printf "WARN EAS CLI missing (optional for cloud/dev-build lanes)\n"
  fi
}

check_adb() {
  local adb_bin
  if adb_bin="$(resolve_adb_bin)"; then
    printf "OK   Android Debug Bridge available at %s\n" "${adb_bin}"
    "${adb_bin}" devices | tr -d '\r' | sed 's/^/     /'
  else
    printf "WARN Android Debug Bridge missing (required for USB Android device installs and Maestro)\n"
  fi
}

adb_has_authorized_device() {
  local adb_bin="$1"

  "${adb_bin}" devices | tr -d '\r' | awk 'NR > 1 && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'
}

adb_is_windows_bridge() {
  local adb_bin="$1"
  local adb_realpath

  adb_realpath="$(realpath "${adb_bin}" 2>/dev/null || printf "%s" "${adb_bin}")"
  [[ "${adb_bin}" == *.exe || "${adb_realpath}" == "${ROOT_DIR}/tests/mobile/bin/adb" ]]
}

check_android_device() {
  local adb_bin
  if ! adb_bin="$(resolve_adb_bin)"; then
    printf "WARN Android device check skipped because ADB is unavailable\n"
    return 0
  fi

  if adb_has_authorized_device "${adb_bin}"; then
    printf "OK   Authorized Android device visible to ADB\n"
    if grep -qi microsoft /proc/version 2>/dev/null && adb_is_windows_bridge "${adb_bin}"; then
      printf "WARN ADB is the Windows/WSL bridge; APK install/manual smoke can use it, but WSL Maestro cannot. Use Windows-side Maestro or attach the S23 into WSL with usbipd-win for automated E2E.\n"
    fi
  else
    printf "WARN No authorized Android device visible to ADB (connect Samsung S23, enable USB debugging, approve prompt)\n"
  fi
}

check_java_17() {
  local java_home_17
  if java_home_17="$(resolve_java_home_17)"; then
    printf "OK   JDK 17 available at %s\n" "${java_home_17}"
    "${java_home_17}/bin/java" -version 2>&1 | sed 's/^/     /'
  else
    printf "WARN JDK 17 missing (optional; only needed for local expo run:android builds, not the S23 + EAS APK lane)\n"
  fi
}

{
  printf "# Gastify Mobile Staging Doctor\n"
  printf "Generated: %s\n\n" "$(date -Iseconds)"

  printf "## Files\n"
  check_file "mobile/.env" "${ENV_FILE}"
  check_file "Android staging Firebase file" "${MOBILE_DIR}/google-services.json"
  check_file "iOS staging Firebase file" "${MOBILE_DIR}/GoogleService-Info.plist"
  printf "\n"

  printf "## Mobile Environment\n"
  check_env "API base URL" "EXPO_PUBLIC_API_BASE_URL"
  check_env "E2E auth enabled flag" "EXPO_PUBLIC_E2E_AUTH_ENABLED"
  check_env "E2E auth mode" "EXPO_PUBLIC_E2E_AUTH_MODE"
  check_env "E2E staging user email" "EXPO_PUBLIC_E2E_AUTH_EMAIL"
  check_env "E2E staging user password" "EXPO_PUBLIC_E2E_AUTH_PASSWORD"
  printf "\n"

  printf "## Backend Staging Token Verification\n"
  check_env "Firebase project id" "GASTIFY_FIREBASE_PROJECT_ID"
  check_env "Firebase admin credentials path" "GASTIFY_FIREBASE_CREDENTIALS_PATH"
  if env_key_is_set "GASTIFY_FIREBASE_CREDENTIALS_PATH"; then
    credentials_path="$(env_key_value "GASTIFY_FIREBASE_CREDENTIALS_PATH")"
    if [[ -f "${credentials_path}" ]]; then
      printf "OK   Firebase admin credentials file exists\n"
    else
      printf "WARN Firebase admin credentials file is not readable at %s\n" "${credentials_path}"
    fi
  fi
  printf "\n"

  printf "## Local Tooling\n"
  check_command "Node" "node" "required for Expo/Jest"
  check_command "npm" "npm" "required for mobile scripts"
  check_command "Expo CLI via npx" "npx" "required for expo commands"
  check_maestro
  check_adb
  check_android_device
  check_java_17
  check_command "Xcode xcrun" "xcrun" "required for local iOS simulator runs on macOS"
  check_eas
  printf "\n"

  printf "## Result\n"
  printf "This report is diagnostic. WARN lines identify setup gaps before running Maestro.\n"
} | tee "${OUT_FILE}"

printf "\nSaved report to %s\n" "${OUT_FILE}"
