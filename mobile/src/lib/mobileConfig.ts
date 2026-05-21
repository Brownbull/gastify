import Constants from "expo-constants";

interface MobileExtraConfig {
  appEnvironment?: string;
  apiBaseUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  e2eAuthEnabled?: boolean;
  e2eAuthMode?: string;
  firebaseAuthEmulatorHost?: string;
  e2eAuthEmail?: string;
  e2eAuthPassword?: string;
  scanTestControlsEnabled?: boolean;
}

const extra = (Constants.expoConfig?.extra ?? {}) as MobileExtraConfig;

export const mobileConfig = {
  appEnvironment: normalizeAppEnvironment(extra.appEnvironment),
  apiBaseUrl: extra.apiBaseUrl ?? "http://localhost:8000",
  googleWebClientId: extra.googleWebClientId ?? "",
  googleIosClientId: extra.googleIosClientId ?? "",
  e2eAuthEnabled: extra.e2eAuthEnabled ?? false,
  e2eAuthMode: normalizeE2EAuthMode(extra.e2eAuthMode),
  firebaseAuthEmulatorHost: extra.firebaseAuthEmulatorHost ?? "",
  e2eAuthEmail: extra.e2eAuthEmail ?? "",
  e2eAuthPassword: extra.e2eAuthPassword ?? "",
  scanTestControlsEnabled:
    extra.scanTestControlsEnabled === true &&
    normalizeAppEnvironment(extra.appEnvironment) !== "production",
};

function normalizeE2EAuthMode(mode: string | undefined) {
  return mode === "emulator" ? "emulator" : "staging";
}

function normalizeAppEnvironment(environment: string | undefined) {
  return environment ?? "local";
}
