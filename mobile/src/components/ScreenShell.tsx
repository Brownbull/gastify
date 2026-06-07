import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** All-sides padding the shell's ScrollView applies — exported so a `scroll={false}`
 *  screen can reproduce it on its own scroll container's contentContainerStyle. */
export const SCREEN_PADDING = 24;

interface ScreenShellProps {
  children: ReactNode;
  /** Wrap children in the shell's ScrollView (default). Pass `false` when the screen's
   *  root IS its own scroll container (e.g. a FlatList) — nesting a VirtualizedList in
   *  a plain ScrollView breaks list windowing and logs the RN dev warning. Such screens
   *  own their padding via the list's contentContainerStyle (see SCREEN_PADDING). */
  scroll?: boolean;
}

export function ScreenShell({ children, scroll = true }: ScreenShellProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  keyboardAvoiding: {
    flex: 1,
  },
});
