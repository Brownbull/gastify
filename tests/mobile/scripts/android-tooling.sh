#!/usr/bin/env bash

resolve_android_sdk_root() {
  local native_candidate
  for native_candidate in \
    "${GASTIFY_ANDROID_SDK_ROOT:-}" \
    "${HOME}/.local/share/gastify/android-platform-tools"; do
    if [[ -n "${native_candidate}" && -x "${native_candidate}/platform-tools/adb" ]]; then
      printf "%s" "${native_candidate}"
      return 0
    fi
  done

  if [[ -n "${ANDROID_SDK_ROOT:-}" && -d "${ANDROID_SDK_ROOT}" ]]; then
    printf "%s" "${ANDROID_SDK_ROOT}"
    return 0
  fi

  if [[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME}" ]]; then
    printf "%s" "${ANDROID_HOME}"
    return 0
  fi

  local candidate
  for candidate in \
    "/mnt/c/Users/Gabe/AppData/Local/Android/Sdk" \
    "/mnt/c/Users/${USER}/AppData/Local/Android/Sdk"; do
    if [[ -d "${candidate}" ]]; then
      printf "%s" "${candidate}"
      return 0
    fi
  done

  return 1
}

resolve_adb_bin() {
  if [[ -n "${ADB_BIN:-}" && -x "${ADB_BIN}" ]]; then
    printf "%s" "${ADB_BIN}"
    return 0
  fi

  if command -v adb >/dev/null 2>&1; then
    command -v adb
    return 0
  fi

  local sdk_root
  if sdk_root="$(resolve_android_sdk_root)"; then
    if [[ -x "${sdk_root}/platform-tools/adb" ]]; then
      printf "%s" "${sdk_root}/platform-tools/adb"
      return 0
    fi

    if [[ -x "${sdk_root}/platform-tools/adb.exe" ]]; then
      printf "%s" "${sdk_root}/platform-tools/adb.exe"
      return 0
    fi
  fi

  return 1
}

java_home_is_17() {
  local candidate="$1"

  if [[ ! -x "${candidate}/bin/java" ]]; then
    return 1
  fi

  "${candidate}/bin/java" -version 2>&1 | grep -Eq 'version "17\.'
}

resolve_java_home_17() {
  local candidate

  if [[ -n "${GASTIFY_JAVA_HOME:-}" ]] && java_home_is_17 "${GASTIFY_JAVA_HOME}"; then
    printf "%s" "${GASTIFY_JAVA_HOME}"
    return 0
  fi

  for candidate in \
    "/usr/lib/jvm/java-17-openjdk-amd64" \
    "/usr/lib/jvm/java-1.17.0-openjdk-amd64"; do
    if java_home_is_17 "${candidate}"; then
      printf "%s" "${candidate}"
      return 0
    fi
  done

  if [[ -n "${JAVA_HOME:-}" ]] && java_home_is_17 "${JAVA_HOME}"; then
    printf "%s" "${JAVA_HOME}"
    return 0
  fi

  return 1
}

export_android_tooling() {
  local sdk_root
  if sdk_root="$(resolve_android_sdk_root)"; then
    export ANDROID_HOME="${sdk_root}"
    export ANDROID_SDK_ROOT="${sdk_root}"
    export PATH="${sdk_root}/platform-tools:${PATH}"
  fi

  local java_home_17
  if java_home_17="$(resolve_java_home_17)"; then
    export JAVA_HOME="${java_home_17}"
    export PATH="${java_home_17}/bin:${PATH}"
  fi
}
