import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SCREEN_PADDING, ScreenShell } from "../components/ScreenShell";
import { useItems } from "../hooks/useItems";
import { colorIndexForKey } from "../lib/chartData";
import { formatDate, formatMinorAmount } from "../lib/format";
import type { ItemFilters, ItemListRow } from "../lib/items";
import { useTheme } from "../providers/ThemeProvider";
import type { RootStackParamList } from "../types/navigation";

type ItemsScreenProps = Partial<
  NativeStackScreenProps<RootStackParamList, "Items">
>;

export function ItemsScreen({ navigation }: ItemsScreenProps = {}) {
  const [filters, setFilters] = useState<ItemFilters>({});
  const { colors } = useTheme();
  const palette = [
    colors.chart1,
    colors.chart2,
    colors.chart3,
    colors.chart4,
    colors.chart5,
    colors.chart6,
  ];
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useItems(filters);

  const items = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Object.values(filters).some(Boolean);

  const colorForRow = (row: ItemListRow) => {
    const key = row.item_category_key ?? row.store_category_key;
    if (!key) return colors.textTertiary;
    return palette[colorIndexForKey(key) % palette.length];
  };

  return (
    <ScreenShell scroll={false}>
      <FlatList
        testID="items-screen"
        data={items}
        keyExtractor={(item) => item.id}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>Ledger</Text>
              <Text style={styles.title}>Items</Text>
              <Text style={styles.body}>
                Every line item across your receipts, with its merchant and
                amount.
              </Text>
            </View>

            <FilterPanel filters={filters} onChange={setFilters} />

            {error ? (
              <View style={styles.errorPanel} testID="items-error">
                <Text style={styles.errorTitle}>Items could not load</Text>
                <Text style={styles.errorBody}>{error.message}</Text>
                <Button title="Retry" onPress={() => void refetch()} />
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.loadingPanel} testID="items-loading">
                <ActivityIndicator color="#2563eb" />
                <Text style={styles.mutedText}>Loading items</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyPanel} testID="items-empty">
              <Text style={styles.emptyTitle}>
                {hasFilters ? "No matching items" : "No items yet"}
              </Text>
              <Text style={styles.mutedText}>
                {hasFilters
                  ? "Adjust the filters and try again."
                  : "Scan a receipt to populate your item history."}
              </Text>
            </View>
          )
        }
        renderItem={({ index, item }) => (
          <ItemRow
            accentColor={colorForRow(item)}
            index={index}
            item={item}
            onPress={() =>
              navigation?.navigate("TransactionDetail", {
                transactionId: item.transaction_id,
              })
            }
          />
        )}
        ListFooterComponent={
          hasNextPage ? (
            <View style={styles.loadMore}>
              <Button
                title={isFetchingNextPage ? "Loading..." : "Load more"}
                testID="items-load-more"
                onPress={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ScreenShell>
  );
}

function FilterPanel({
  filters,
  onChange,
}: {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
}) {
  const update = (partial: Partial<ItemFilters>) =>
    onChange({ ...filters, ...partial });

  return (
    <View style={styles.filterPanel} testID="items-filter-panel">
      <View style={styles.filterGrid}>
        <FieldInput
          label="Search"
          testID="items-search"
          value={filters.search ?? ""}
          placeholder="Item name"
          onChangeText={(value) => update({ search: value || undefined })}
        />
        <FieldInput
          label="Merchant"
          testID="items-filter-merchant"
          value={filters.merchant ?? ""}
          placeholder="Search"
          onChangeText={(value) => update({ merchant: value || undefined })}
        />
      </View>

      {Object.values(filters).some(Boolean) ? (
        <Button
          title="Clear filters"
          testID="items-clear-filters-button"
          onPress={() => onChange({})}
        />
      ) : null}
    </View>
  );
}

function FieldInput({
  label,
  onChangeText,
  placeholder,
  testID,
  value,
}: {
  label: string;
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
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.textInput}
        testID={testID}
        value={value}
      />
    </View>
  );
}

function ItemRow({
  accentColor,
  index,
  item,
  onPress,
}: {
  accentColor: string;
  index: number;
  item: ItemListRow;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.itemRow}
      testID={`items-row-${index}`}
    >
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.itemMain}>
        <Text numberOfLines={1} style={styles.itemName}>
          {item.qty != null && item.qty > 1 ? `${item.qty} x ` : ""}
          {item.name}
        </Text>
        <Text numberOfLines={1} style={styles.itemMeta}>
          {item.merchant} - {formatDate(item.transaction_date)}
        </Text>
      </View>
      <View style={styles.itemAmounts}>
        <Text style={styles.amountText}>
          {formatMinorAmount(item.total_minor, item.currency)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accent: {
    alignSelf: "stretch",
    borderRadius: 999,
    marginRight: 12,
    width: 4,
  },
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
  itemAmounts: {
    alignItems: "flex-end",
    minWidth: 96,
  },
  itemMain: {
    flex: 1,
    paddingRight: 12,
  },
  itemMeta: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  itemName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  itemRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    padding: 16,
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  listContent: {
    // The FlatList is now the scroll container (ScreenShell scroll={false}), so it owns
    // the screen padding the shell's ScrollView used to provide.
    padding: SCREEN_PADDING,
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
  separator: {
    height: 10,
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
});
