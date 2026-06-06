export type RootStackParamList = {
  SignIn: undefined;
  Home: undefined;
  Statements: undefined;
  // Optional date-range filter so a Reports "view transactions" drill can
  // pre-filter the list (mobile equivalent of the web validateSearch).
  Transactions: { dateFrom?: string; dateTo?: string } | undefined;
  Dashboard: undefined;
  Trends: undefined;
  Items: undefined;
  Reports: undefined;
  ReportDetail: {
    period: string;
    label: string;
    totalMinor: number;
    count: number;
    currency: string;
    trendDirection: "up" | "down" | "flat";
    trendPercent: number;
    hasBaseline: boolean;
  };
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
