import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { onRateLimited } from "../lib/api";

/**
 * Global "you're going too fast" toast — surfaces any 429 (RATE-LIMIT-PLAN row 10).
 * Mounted once at the app root; subscribes to the API client's rate-limit emitter
 * and auto-dismisses. Minimal functional markup; the overhaul re-skins.
 */
export function RateLimitToast() {
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  useEffect(() => onRateLimited((seconds) => setRetryAfter(seconds)), []);

  useEffect(() => {
    if (retryAfter === null) return;
    const timer = setTimeout(() => setRetryAfter(null), 5000);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  if (retryAfter === null) return null;

  const message =
    retryAfter > 0
      ? `You're going too fast. Try again in ${retryAfter}s.`
      : "You're going too fast. Try again in a moment.";

  return (
    <View style={styles.toast} testID="rate-limit-toast" accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      <Pressable
        testID="rate-limit-toast-dismiss"
        onPress={() => setRetryAfter(null)}
        hitSlop={8}
      >
        <Text style={styles.dismiss}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: "center",
    backgroundColor: "#1f2937",
    borderRadius: 10,
    bottom: 90,
    flexDirection: "row",
    gap: 12,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    right: 20,
  },
  message: {
    color: "#f9fafb",
    flex: 1,
    fontSize: 13,
  },
  dismiss: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "600",
  },
});
