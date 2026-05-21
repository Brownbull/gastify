export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  Transactions: undefined;
  TransactionDetail: { transactionId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
