import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProviders } from "./providers/AppProviders";
import { AppNavigator } from "./navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProviders>
        <StatusBar style="auto" />
        <AppNavigator />
      </AppProviders>
    </SafeAreaProvider>
  );
}
