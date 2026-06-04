import { Button, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { mobileConfig } from "../lib/mobileConfig";
import { useAuth } from "../providers/AuthProvider";

export function SignInScreen() {
  const { error, signInWithGoogle, signInWithTestUser, signInWithTestUserB } = useAuth();

  return (
    <ScreenShell>
      <View style={styles.hero} testID="sign-in-screen">
        <Text style={styles.eyebrow}>Gastify</Text>
        <Text style={styles.title}>Scan receipts from your phone.</Text>
        <Text style={styles.body}>
          Sign in with your Gastify Google account to start the native mobile
          workflow.
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="Continue with Google"
        testID="google-sign-in-button"
        onPress={() => void signInWithGoogle()}
      />

      {mobileConfig.e2eAuthEnabled ? (
        <View style={styles.e2eAuth}>
          <Button
            title="Use test auth"
            testID="e2e-sign-in-button"
            onPress={() => void signInWithTestUser()}
          />
          {mobileConfig.e2eAuthEmailB ? (
            <Button
              title="Use test auth (B)"
              testID="e2e-sign-in-button-b"
              onPress={() => void signInWithTestUserB()}
            />
          ) : null}
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 23,
  },
  error: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    color: "#991b1b",
    marginBottom: 16,
    padding: 12,
  },
  e2eAuth: {
    marginTop: 12,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  hero: {
    gap: 12,
    marginBottom: 24,
  },
  title: {
    color: "#0f172a",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
