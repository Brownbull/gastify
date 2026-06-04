import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../providers/AuthProvider";
import { BatchCaptureScreen } from "../screens/BatchCaptureScreen";
import { BatchReviewScreen } from "../screens/BatchReviewScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { GroupDetailScreen } from "../screens/GroupDetailScreen";
import { GroupsScreen } from "../screens/GroupsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TrendsScreen } from "../screens/TrendsScreen";
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
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: "Dashboard" }}
            />
            <Stack.Screen
              name="Trends"
              component={TrendsScreen}
              options={{ title: "Trends" }}
            />
            <Stack.Screen
              name="Groups"
              component={GroupsScreen}
              options={{ title: "Groups" }}
            />
            <Stack.Screen
              name="GroupDetail"
              component={GroupDetailScreen}
              options={{ title: "Group" }}
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
            <Stack.Screen
              name="BatchCapture"
              component={BatchCaptureScreen}
              options={{ title: "Batch scan" }}
            />
            <Stack.Screen
              name="BatchReview"
              component={BatchReviewScreen}
              options={{ title: "Review receipts" }}
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
