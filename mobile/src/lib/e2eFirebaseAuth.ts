import auth from "@react-native-firebase/auth";
import { mobileConfig } from "./mobileConfig";

let emulatorConfigured = false;

export function configureE2EFirebaseAuth() {
  if (
    !mobileConfig.e2eAuthEnabled ||
    mobileConfig.e2eAuthMode !== "emulator" ||
    !mobileConfig.firebaseAuthEmulatorHost ||
    emulatorConfigured
  ) {
    return;
  }

  auth().useEmulator(toEmulatorUrl(mobileConfig.firebaseAuthEmulatorHost));
  emulatorConfigured = true;
}

function toEmulatorUrl(host: string) {
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host;
  }

  return `http://${host}`;
}
