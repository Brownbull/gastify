import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { useAuth } from "../providers/AuthProvider";
import {
  useTheme,
  type ColorTheme,
  type ThemeMode,
} from "../providers/ThemeProvider";
import { useSessionStore } from "../stores/sessionStore";
const COLOR_THEMES: { value: ColorTheme; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "professional", label: "Professional" },
  { value: "mono", label: "Monochrome" },
];

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function SettingsScreen() {
  const { colors } = useTheme();

  return (
    <ScreenShell>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
      >
        <ProfileSection />
        <AppearanceSection />
        <AccountSection />
      </ScrollView>
    </ScreenShell>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

function ProfileSection() {
  const user = useSessionStore((s) => s.signedInUser);
  return (
    <SectionCard title="Profile">
      <FieldRow label="Email" value={user?.email ?? "—"} />
      <FieldRow label="Name" value={user?.displayName ?? "—"} />
    </SectionCard>
  );
}

function AppearanceSection() {
  const { colors, colorTheme, themeMode, setColorTheme, setThemeMode } =
    useTheme();

  return (
    <SectionCard title="Appearance">
      <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
        Color theme
      </Text>
      <View style={styles.chipRow}>
        {COLOR_THEMES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setColorTheme(t.value)}
            style={[
              styles.chip,
              {
                borderColor:
                  colorTheme === t.value ? colors.primary : colors.borderLight,
                backgroundColor:
                  colorTheme === t.value ? colors.primaryLight : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    colorTheme === t.value
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text
        style={[
          styles.fieldLabel,
          { color: colors.textSecondary, marginTop: 16, marginBottom: 8 },
        ]}
      >
        Mode
      </Text>
      <View style={styles.chipRow}>
        {THEME_MODES.map((m) => (
          <Pressable
            key={m.value}
            onPress={() => setThemeMode(m.value)}
            style={[
              styles.chip,
              {
                borderColor:
                  themeMode === m.value ? colors.primary : colors.borderLight,
                backgroundColor:
                  themeMode === m.value ? colors.primaryLight : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    themeMode === m.value
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
            >
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}

function AccountSection() {
  const { signOut } = useAuth();
  const { colors } = useTheme();

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <SectionCard title="Account">
      <Pressable
        onPress={handleSignOut}
        style={[styles.button, { borderColor: colors.borderLight }]}
      >
        <Text style={[styles.buttonText, { color: colors.error }]}>
          Sign out
        </Text>
      </Pressable>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: { fontSize: 17, fontWeight: "600", marginBottom: 12 },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  fieldLabel: { fontSize: 14 },
  fieldValue: { fontSize: 14, fontWeight: "500" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: "500" },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "600" },
});
