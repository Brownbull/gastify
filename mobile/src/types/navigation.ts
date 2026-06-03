export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  Statements: undefined;
  Transactions: undefined;
  Insights: undefined;
  Settings: undefined;
  TransactionDetail: { transactionId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
