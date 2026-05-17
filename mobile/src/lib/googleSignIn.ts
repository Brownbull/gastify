import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { mobileConfig } from "./mobileConfig";

let configured = false;

export function configureGoogleSignIn() {
  if (configured) return;

  GoogleSignin.configure({
    webClientId: mobileConfig.googleWebClientId || undefined,
    iosClientId: mobileConfig.googleIosClientId || undefined,
    offlineAccess: false,
  });
  configured = true;
}
