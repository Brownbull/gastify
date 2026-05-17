import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  SignIn: undefined;
  Home: NavigatorScreenParams<Record<string, never>> | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
