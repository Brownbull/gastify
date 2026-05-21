import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { useStoreCategories } from "../hooks/useCategories";
import { useTransactions } from "../hooks/useTransactions";
import { categoryPath } from "../lib/categories";
import { formatDate, formatMinorAmount } from "../lib/format";
import type {
  TransactionFilters,
  TransactionListItem,
} from "../lib/transactions";
import type { RootStackParamList } from "../types/navigation";

type TransactionsScreenProps = Partial<
  NativeStackScreenProps<RootStackParamList, "Transactions">
>;

export function TransactionsScreen({
  navigation,
}: TransactionsScreenProps = {}) {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useTransactions(filters);
  const { data: storeCategories } = useStoreCategories();

  const transactions = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <ScreenShell>
      <View style={styles.header} testID="transactions-screen">
        <Text style={styles.eyebrow}>Ledger</Text>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.body}>
          Receipt and statement activity with original and USD amounts.
        </Text>
      </View>

      <FilterPanel
        filters={filters}
        onChange={setFilters}
        storeCategories={storeCategories}
      />

      {error ? (
        <View style={styles.errorPanel} testID="transactions-error">
          <Text style={styles.errorTitle}>Ledger could not load</Text>
          <Text style={styles.errorBody}>{error.message}</Text>
          <Button title="Retry" onPress={() => void refetch()} />
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingPanel} testID="transactions-loading">
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.mutedText}>Loading transactions</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyPanel} testID="transactions-empty">
          <Text style={styles.emptyTitle}>
            {hasFilters ? "No matching transactions" : "No transactions yet"}
          </Text>
          <Text style={styles.mutedText}>
            {hasFilters
              ? "Adjust the filters and try again."
              : "Scan a receipt to create the first ledger entry."}
          </Text>
        </View>
      ) : (
        <View style={styles.list} testID="transactions-list">
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              onPress={() =>
                navigation?.navigate("TransactionDetail", {
                  transactionId: transaction.id,
                })
              }
              storeCategories={storeCategories}
              transaction={transaction}
            />
          ))}
        </View>
      )}

      {hasNextPage ? (
        <View style={styles.loadMore}>
          <Button
            title={isFetchingNextPage ? "Loading..." : "Load more"}
            testID="transactions-load-more-button"
            onPress={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          />
        </View>
      ) : null}
    </ScreenShell>
  );
}

function FilterPanel({
  filters,
  onChange,
  storeCategories,
}: {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  storeCategories: ReturnType<typeof useStoreCategories>["data"];
}) {
  const update = (partial: Partial<TransactionFilters>) =>
    onChange({ ...filters, ...partial });

  return (
    <View style={styles.filterPanel} testID="transactions-filter-panel">
      <View style={styles.filterGrid}>
        <FieldInput
          label="From"
          testID="transactions-filter-date-from"
          value={filters.dateFrom ?? ""}
          placeholder="YYYY-MM-DD"
          onChangeText={(value) => update({ dateFrom: value || undefined })}
        />
        <FieldInput
          label="To"
          testID="transactions-filter-date-to"
          value={filters.dateTo ?? ""}
          placeholder="YYYY-MM-DD"
          onChangeText={(value) => update({ dateTo: value || undefined })}
        />
        <FieldInput
          label="Merchant"
          testID="transactions-filter-merchant"
          value={filters.merchant ?? ""}
          placeholder="Search"
          onChangeText={(value) => update({ merchant: value || undefined })}
        />
        <FieldInput
          label="Card"
          testID="transactions-filter-card"
          value={filters.cardAlias ?? ""}
          placeholder="Alias"
          onChangeText={(value) => update({ cardAlias: value || undefined })}
        />
        <FieldInput
          label="Currency"
          testID="transactions-filter-currency"
          value={filters.currency ?? ""}
          placeholder="CLP"
          maxLength={3}
          onChangeText={(value) =>
            update({ currency: value.toUpperCase() || undefined })
          }
        />
      </View>

      <View style={styles.categoryFilter}>
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            <CategoryChip
              label="All"
              selected={!filters.category}
              testID="transactions-filter-category-all"
              onPress={() => update({ category: undefined })}
            />
            {storeCategories?.map((category) => (
              <CategoryChip
                key={category.id}
                label={categoryPath(storeCategories, category.id)}
                selected={filters.category === category.id}
                testID={`transactions-filter-category-${category.id}`}
                onPress={() => update({ category: category.id })}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {Object.values(filters).some(Boolean) ? (
        <Button
          title="Clear filters"
          testID="transactions-clear-filters-button"
          onPress={() => onChange({})}
        />
      ) : null}
    </View>
  );
}

function FieldInput({
  label,
  maxLength,
  onChangeText,
  placeholder,
  testID,
  value,
}: {
  label: string;
  maxLength?: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  testID: string;
  value: string;
}) {
  return (
    <View style={styles.filterInput}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.textInput}
        testID={testID}
        value={value}
      />
    </View>
  );
}

function CategoryChip({
  label,
  onPress,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
      testID={testID}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.categoryChipText,
          selected && styles.categoryChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionRow({
  onPress,
  storeCategories,
  transaction,
}: {
  onPress: () => void;
  storeCategories: ReturnType<typeof useStoreCategories>["data"];
  transaction: TransactionListItem;
}) {
  const isEdited =
    transaction.merchant_user_edited_at != null ||
    transaction.store_category_user_edited_at != null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.transactionRow}
      testID={`transaction-row-${transaction.id}`}
    >
      <View style={styles.transactionMain}>
        <Text style={styles.transactionDate}>
          {formatDate(transaction.transaction_date)}
        </Text>
        <Text style={styles.transactionMerchant}>
          {transaction.merchant}
          {isEdited ? <Text style={styles.editedText}> edited</Text> : null}
        </Text>
        <Text style={styles.transactionMeta}>
          {categoryPath(storeCategories, transaction.store_category_id)}
          {transaction.alias ? ` - ${transaction.alias}` : ""}
        </Text>
        {transaction.scan_review_level !== "none" ? (
          <Text style={styles.warningText}>
            Scan {transaction.scan_review_level.replace("_", " ")}
          </Text>
        ) : null}
      </View>
      <View style={styles.transactionAmounts}>
        <Text style={styles.amountText}>
          {formatMinorAmount(transaction.total_minor, transaction.currency)}
        </Text>
        <Text style={styles.usdText}>
          {transaction.amount_usd_minor != null
            ? formatMinorAmount(transaction.amount_usd_minor, "USD")
            : "USD -"}
        </Text>
        <Text style={styles.itemCountText}>{transaction.item_count} items</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amountText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  body: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 23,
  },
  categoryChip: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipSelected: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  categoryChipText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryChipTextSelected: {
    color: "#1d4ed8",
  },
  categoryFilter: {
    gap: 8,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 2,
  },
  editedText: {
    color: "#7c3aed",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  errorBody: {
    color: "#7f1d1d",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  errorPanel: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  errorTitle: {
    color: "#991b1b",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterInput: {
    minWidth: "47%",
  },
  filterPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
    padding: 16,
  },
  header: {
    gap: 10,
    marginBottom: 24,
  },
  itemCountText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 6,
    textAlign: "right",
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  list: {
    gap: 10,
  },
  loadMore: {
    marginTop: 16,
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  mutedText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  textInput: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0,
  },
  transactionAmounts: {
    alignItems: "flex-end",
    minWidth: 96,
  },
  transactionDate: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  transactionMain: {
    flex: 1,
    paddingRight: 12,
  },
  transactionMerchant: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  transactionMeta: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
  },
  transactionRow: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  usdText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  warningText: {
    color: "#92400e",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    textTransform: "capitalize",
  },
});
