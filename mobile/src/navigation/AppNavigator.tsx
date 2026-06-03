import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { HomeScreen } from "../screens/HomeScreen";
import { InsightsScreen } from "../screens/InsightsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SignInScreen } from "../screens/SignInScreen";
import { StatementsScreen } from "../screens/StatementsScreen";
import { TransactionDetailScreen } from "../screens/TransactionDetailScreen";
import { TransactionsScreen } from "../screens/TransactionsScreen";
import type { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading} testID="mobile-auth-loading">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: "Gastify" }}
            />
            <Stack.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{ title: "Transactions" }}
            />
            <Stack.Screen
              name="Statements"
              component={StatementsScreen}
              options={{ title: "Statements" }}
            />
            <Stack.Screen
              name="Insights"
              component={InsightsScreen}
              options={{ title: "Insights" }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: "Settings" }}
            />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{ title: "Transaction detail" }}
            />
          </>
        ) : (
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ title: "Sign in" }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    flex: 1,
    justifyContent: "center",
  },
});
