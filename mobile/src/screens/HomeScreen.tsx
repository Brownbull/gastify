import { Button, StyleSheet, Text, View } from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { mobileConfig } from "../lib/mobileConfig";
import { useAuth } from "../providers/AuthProvider";
import { useSessionStore } from "../stores/sessionStore";

export function HomeScreen() {
  const { signOut } = useAuth();
  const signedInUser = useSessionStore((state) => state.signedInUser);

  return (
    <ScreenShell>
      <View style={styles.header} testID="home-screen">
        <Text style={styles.eyebrow}>Gastify mobile</Text>
        <Text style={styles.title}>Capture-ready account</Text>
        <Text style={styles.body}>
          The native shell is connected to Firebase Auth, SecureStore, and the
          typed backend client.
        </Text>
      </View>

      <View style={styles.panel} testID="signed-in-user-panel">
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value} testID="signed-in-user-value">
          {signedInUser?.email ?? signedInUser?.displayName ?? signedInUser?.uid}
        </Text>
      </View>

      <View style={styles.panel} testID="api-base-url-panel">
        <Text style={styles.label}>API base URL</Text>
        <Text style={styles.value}>{mobileConfig.apiBaseUrl}</Text>
      </View>

      <Button
        title="Sign out"
        testID="sign-out-button"
        onPress={() => void signOut()}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 23,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  header: {
    gap: 10,
    marginBottom: 24,
  },
  label: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0,
  },
  value: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 22,
  },
});
