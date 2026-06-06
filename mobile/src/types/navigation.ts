export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  Statements: undefined;
  Transactions: undefined;
  Dashboard: undefined;
  Trends: undefined;
  Items: undefined;
  Reports: undefined;
  Notifications: undefined;
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
