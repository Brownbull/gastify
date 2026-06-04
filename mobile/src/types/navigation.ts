export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  Statements: undefined;
  Transactions: undefined;
  Dashboard: undefined;
  Trends: undefined;
  Groups: undefined;
  GroupDetail: { groupId: string };
  Settings: undefined;
  TransactionDetail: { transactionId: string };
  BatchCapture: undefined;
  BatchReview: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
