import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { ShareToGroupButton } from "../components/ShareToGroupButton";
import { useItemCategories, useStoreCategories } from "../hooks/useCategories";
import {
  useTransaction,
  useUpdateItemFlags,
  useUpdateTransaction,
} from "../hooks/useTransactions";
import { ItemFlagChips } from "../components/ItemFlagChips";
import type { ItemFlagKind } from "../lib/transactions";
import {
  categoryLabel,
  categoryPath,
  type CategoryItem,
} from "../lib/categories";
import {
  formatDate,
  formatMinorAmount,
  formatTimestamp,
  majorInputToMinor,
  minorToMajorInput,
} from "../lib/format";
import type {
  TransactionDetail,
  TransactionItemUpdate,
  TransactionUpdate,
} from "../lib/transactions";
import type { RootStackParamList } from "../types/navigation";

type TransactionDetailScreenProps = Partial<
  NativeStackScreenProps<RootStackParamList, "TransactionDetail">
>;

export function TransactionDetailScreen({
  navigation,
  route,
}: TransactionDetailScreenProps = {}) {
  const transactionId = route?.params?.transactionId;
  const {
    data: transaction,
    error,
    isLoading,
    refetch,
  } = useTransaction(transactionId);
  const mutation = useUpdateTransaction(transactionId ?? "");
  const { data: storeCategories } = useStoreCategories();
  const { data: itemCategories } = useItemCategories();

  const save = (body: TransactionUpdate) => {
    if (!transactionId) return;
    mutation.mutate(body);
  };

  const flagMutation = useUpdateItemFlags(transactionId ?? "");
  const toggleFlag = (
    item: TransactionDetail["items"][number],
    kind: ItemFlagKind,
  ) => {
    if (!transactionId) return;
    const current = item.flags ?? [];
    const next = current.includes(kind)
      ? current.filter((flag) => flag !== kind)
      : [...current, kind];
    flagMutation.mutate({ itemId: item.id, flags: next });
  };

  if (!transactionId) {
    return (
      <ScreenShell>
        <ErrorPanel
          body="The transaction route is missing its identifier."
          title="Transaction unavailable"
        />
      </ScreenShell>
    );
  }

  if (isLoading) {
    return (
      <ScreenShell>
        <View style={styles.loadingPanel} testID="transaction-detail-loading">
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.mutedText}>Loading transaction</Text>
        </View>
      </ScreenShell>
    );
  }

  if (error || !transaction) {
    return (
      <ScreenShell>
        <Button title="Back" onPress={() => navigation?.goBack()} />
        <ErrorPanel
          body={error?.message ?? "The transaction could not be loaded."}
          title="Transaction could not load"
        />
        <Button title="Retry" onPress={() => void refetch()} />
      </ScreenShell>
    );
  }

  // D74: once shared into a group, the receipt's CONTENT is locked (the group keeps
  // a snapshot). Item flags, card pairing and recurrence stay editable elsewhere.
  const locked = transaction.is_shared;

  return (
    <ScreenShell>
      <View style={styles.header} testID="transaction-detail-screen">
        <Button title="Back" onPress={() => navigation?.goBack()} />
        <Text style={styles.eyebrow}>{formatDate(transaction.transaction_date)}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{transaction.merchant}</Text>
          {locked ? (
            <View style={styles.sharedBadge} testID="shared-lock-badge">
              <Text style={styles.sharedBadgeText}>🔒 Shared</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.body}>
          {formatMinorAmount(transaction.total_minor, transaction.currency)}
          {transaction.amount_usd_minor != null
            ? ` - ${formatMinorAmount(transaction.amount_usd_minor, "USD")}`
            : ""}
        </Text>
      </View>

      <ShareToGroupButton transactionId={transactionId} />

      {locked ? (
        <View style={styles.lockBanner} testID="shared-lock-banner">
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockText}>
            This transaction is shared to a group, so its contents are locked. You can
            still flag items, pair a card, or mark it recurrent.
          </Text>
        </View>
      ) : null}

      {mutation.error ? (
        <View style={styles.errorPanel} testID="transaction-mutation-error">
          <Text style={styles.errorTitle}>Edit was rolled back</Text>
          <Text style={styles.errorBody}>{mutation.error.message}</Text>
          <Button title="Dismiss" onPress={() => mutation.reset()} />
        </View>
      ) : null}

      <SummaryPanel transaction={transaction} storeCategories={storeCategories} />

      <TransactionEditor
        disabled={mutation.isPending}
        locked={locked}
        onSave={save}
        storeCategories={storeCategories}
        transaction={transaction}
      />

      {flagMutation.error ? (
        <View style={styles.errorPanel} testID="transaction-flag-error">
          <Text style={styles.errorTitle}>Flag change failed</Text>
          <Text style={styles.errorBody}>{flagMutation.error.message}</Text>
          <Button title="Dismiss" onPress={() => flagMutation.reset()} />
        </View>
      ) : null}

      <LineItemsPanel
        currency={transaction.currency}
        disabled={mutation.isPending}
        flagPending={flagMutation.isPending}
        itemCategories={itemCategories}
        items={transaction.items}
        locked={locked}
        onSaveItem={(item) => save({ items: [item] })}
        onToggleFlag={toggleFlag}
      />

      {transaction.images.length > 0 ? (
        <View style={styles.panel} testID="transaction-images-panel">
          <Text style={styles.panelTitle}>Receipt images</Text>
          <View style={styles.imageGrid}>
            {transaction.images.map((image) => (
              <Image
                key={image.id}
                source={{ uri: image.image_url }}
                style={styles.receiptImage}
                testID={`transaction-image-${image.id}`}
              />
            ))}
          </View>
        </View>
      ) : null}
    </ScreenShell>
  );
}

function SummaryPanel({
  storeCategories,
  transaction,
}: {
  storeCategories: ReturnType<typeof useStoreCategories>["data"];
  transaction: TransactionDetail;
}) {
  const editedFields = [
    transaction.merchant_user_edited_at ? "merchant" : null,
    transaction.store_category_user_edited_at ? "category" : null,
    ...transaction.items.flatMap((item) => [
      item.name_user_edited_at ? `${item.name} name` : null,
      item.item_category_user_edited_at ? `${item.name} category` : null,
    ]),
  ].filter((field): field is string => field != null);

  return (
    <View style={styles.panel} testID="transaction-summary-panel">
      <Text style={styles.panelTitle}>Summary</Text>
      <View style={styles.metricGrid}>
        <Metric
          label="Original"
          value={formatMinorAmount(transaction.total_minor, transaction.currency)}
        />
        <Metric
          label="USD"
          value={
            transaction.amount_usd_minor != null
              ? formatMinorAmount(transaction.amount_usd_minor, "USD")
              : "-"
          }
        />
        <Metric
          label="Category"
          value={categoryPath(storeCategories, transaction.store_category_id)}
        />
        <Metric label="Card" value={transaction.alias ?? "-"} />
      </View>

      {transaction.fx_rate_to_usd ? (
        <Text style={styles.mutedText}>
          FX {transaction.fx_rate_to_usd}
          {transaction.fx_captured_at
            ? ` captured ${formatTimestamp(transaction.fx_captured_at)}`
            : ""}
        </Text>
      ) : null}

      {editedFields.length > 0 ? (
        <View style={styles.infoBox} testID="transaction-edited-fields">
          <Text style={styles.infoText}>
            User-edited fields: {editedFields.join(", ")}
          </Text>
        </View>
      ) : null}

      {transaction.scan_review_level !== "none" ? (
        <View style={styles.warningBox} testID="transaction-review-warning">
          <Text style={styles.warningTitle}>
            Scan {formatReviewLevel(transaction.scan_review_level)}
          </Text>
          {(transaction.scan_review_signals ?? []).map((signal) => (
            <Text key={signal.code} style={styles.warningText}>
              {signal.message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TransactionEditor({
  disabled,
  locked,
  onSave,
  storeCategories,
  transaction,
}: {
  disabled: boolean;
  locked: boolean;
  onSave: (body: TransactionUpdate) => void;
  storeCategories: ReturnType<typeof useStoreCategories>["data"];
  transaction: TransactionDetail;
}) {
  const [merchantDraft, setMerchantDraft] = useState(transaction.merchant);
  const [dateDraft, setDateDraft] = useState(transaction.transaction_date);

  useEffect(() => {
    setMerchantDraft(transaction.merchant);
    setDateDraft(transaction.transaction_date);
  }, [transaction.id, transaction.merchant, transaction.transaction_date]);

  const saveMerchant = () => {
    const merchant = merchantDraft.trim();
    if (merchant && merchant !== transaction.merchant) {
      onSave({ merchant });
    }
  };
  const saveDate = () => {
    if (dateDraft && dateDraft !== transaction.transaction_date) {
      onSave({ transaction_date: dateDraft });
    }
  };

  // D74: when shared, the content editors collapse to read-only static text — the
  // group keeps a snapshot, so the source can no longer change merchant/date/category.
  if (locked) {
    return (
      <View style={styles.panel} testID="transaction-edit-panel">
        <Text style={styles.panelTitle}>Transaction details</Text>
        <ReadOnlyField
          label="Merchant"
          testID="transaction-edit-merchant"
          value={transaction.merchant}
        />
        <ReadOnlyField
          label="Date"
          testID="transaction-edit-date"
          value={formatDate(transaction.transaction_date)}
        />
        <ReadOnlyField
          label="Store category"
          testID="transaction-store-category"
          value={categoryPath(storeCategories, transaction.store_category_id)}
        />
      </View>
    );
  }

  return (
    <View style={styles.panel} testID="transaction-edit-panel">
      <Text style={styles.panelTitle}>Edit transaction</Text>
      <FieldInput
        label="Merchant"
        onChangeText={setMerchantDraft}
        testID="transaction-edit-merchant"
        value={merchantDraft}
      />
      <Button
        title="Save merchant"
        testID="transaction-save-merchant-button"
        onPress={saveMerchant}
        disabled={disabled || !merchantDraft.trim()}
      />

      <FieldInput
        label="Date"
        onChangeText={setDateDraft}
        placeholder="YYYY-MM-DD"
        testID="transaction-edit-date"
        value={dateDraft}
      />
      <Button
        title="Save date"
        testID="transaction-save-date-button"
        onPress={saveDate}
        disabled={disabled}
      />

      <CategorySelector
        categories={storeCategories}
        disabled={disabled}
        label="Store category"
        onSelect={(categoryId) => onSave({ store_category_id: categoryId })}
        selectedId={transaction.store_category_id ?? undefined}
        testIDPrefix="transaction-store-category"
      />
    </View>
  );
}

function LineItemsPanel({
  currency,
  disabled,
  flagPending,
  itemCategories,
  items,
  locked,
  onSaveItem,
  onToggleFlag,
}: {
  currency: string;
  disabled: boolean;
  flagPending: boolean;
  itemCategories: ReturnType<typeof useItemCategories>["data"];
  items: TransactionDetail["items"];
  locked: boolean;
  onSaveItem: (item: TransactionItemUpdate) => void;
  onToggleFlag: (
    item: TransactionDetail["items"][number],
    kind: ItemFlagKind,
  ) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.panel} testID="transaction-line-items-panel">
      <Text style={styles.panelTitle}>Line items</Text>
      {items.map((item, index) => (
        <LineItemEditor
          key={item.id}
          currency={currency}
          disabled={disabled}
          flagPending={flagPending}
          itemIndex={index}
          item={item}
          itemCategories={itemCategories}
          locked={locked}
          onSave={onSaveItem}
          onToggleFlag={onToggleFlag}
        />
      ))}
    </View>
  );
}

function LineItemEditor({
  currency,
  disabled,
  flagPending,
  item,
  itemIndex,
  itemCategories,
  locked,
  onSave,
  onToggleFlag,
}: {
  currency: string;
  disabled: boolean;
  flagPending: boolean;
  item: TransactionDetail["items"][number];
  itemIndex: number;
  itemCategories: ReturnType<typeof useItemCategories>["data"];
  locked: boolean;
  onSave: (item: TransactionItemUpdate) => void;
  onToggleFlag: (
    item: TransactionDetail["items"][number],
    kind: ItemFlagKind,
  ) => void;
}) {
  const [nameDraft, setNameDraft] = useState(item.name);
  const [totalDraft, setTotalDraft] = useState(
    minorToMajorInput(item.total_price_minor, currency),
  );
  const [categoryId, setCategoryId] = useState(item.item_category_id ?? "");
  const [flagged, setFlagged] = useState(item.is_flagged);
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft(item.name);
    setTotalDraft(minorToMajorInput(item.total_price_minor, currency));
    setCategoryId(item.item_category_id ?? "");
    setFlagged(item.is_flagged);
    setValidation(null);
  }, [
    currency,
    item.id,
    item.is_flagged,
    item.item_category_id,
    item.name,
    item.total_price_minor,
  ]);

  const save = () => {
    const totalMinor = majorInputToMinor(totalDraft, currency);
    if (totalMinor == null) {
      setValidation("Enter a valid amount.");
      return;
    }

    const next: TransactionItemUpdate = { id: item.id };
    const name = nameDraft.trim();
    if (name && name !== item.name) next.name = name;
    if (totalMinor !== item.total_price_minor) {
      next.total_price_minor = totalMinor;
    }
    if ((categoryId || null) !== (item.item_category_id ?? null)) {
      next.item_category_id = categoryId || null;
    }
    if (flagged !== item.is_flagged) next.is_flagged = flagged;

    if (Object.keys(next).length > 1) {
      setValidation(null);
      onSave(next);
    }
  };

  // D74: when shared, the line item's content is read-only (the group holds a
  // snapshot). The per-item personal flag chips stay editable — they're a separate
  // endpoint that never touches the locked receipt content.
  if (locked) {
    return (
      <View style={styles.itemEditor} testID={`transaction-item-${item.id}`}>
        <View style={styles.itemHeader}>
          <View style={styles.itemNameBlock}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.mutedText}>
              {item.qty != null ? `${item.qty} qty - ` : ""}
              {formatMinorAmount(item.total_price_minor, currency)}
            </Text>
          </View>
        </View>
        <ItemFlagChips
          item={item}
          disabled={flagPending}
          onToggleFlag={onToggleFlag}
        />
      </View>
    );
  }

  return (
    <View style={styles.itemEditor} testID={`transaction-item-${item.id}`}>
      <View style={styles.itemHeader}>
        <View style={styles.itemNameBlock}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.mutedText}>
            {item.qty != null ? `${item.qty} qty - ` : ""}
            {formatMinorAmount(item.total_price_minor, currency)}
          </Text>
        </View>
        <Button
          title={flagged ? "Unflag" : "Flag"}
          onPress={() => setFlagged((value) => !value)}
          disabled={disabled}
        />
      </View>

      <FieldInput
        label="Name"
        onChangeText={setNameDraft}
        testID={`transaction-item-${itemIndex}-name`}
        value={nameDraft}
      />
      <FieldInput
        keyboardType="decimal-pad"
        label="Amount"
        onChangeText={setTotalDraft}
        testID={`transaction-item-${itemIndex}-amount`}
        value={totalDraft}
      />
      <CategorySelector
        categories={itemCategories}
        disabled={disabled}
        label="Item category"
        onSelect={setCategoryId}
        selectedId={categoryId || undefined}
        testIDPrefix={`transaction-item-${itemIndex}-category`}
      />
      {validation ? <Text style={styles.errorBody}>{validation}</Text> : null}
      <Button
        title="Save item"
        testID={`transaction-item-${itemIndex}-save-button`}
        onPress={save}
        disabled={disabled}
      />
      <ItemFlagChips
        item={item}
        disabled={flagPending}
        onToggleFlag={onToggleFlag}
      />
    </View>
  );
}

function CategorySelector({
  categories,
  disabled,
  label,
  onSelect,
  selectedId,
  testIDPrefix,
}: {
  categories: readonly CategoryItem[] | undefined;
  disabled: boolean;
  label: string;
  onSelect: (categoryId: string) => void;
  selectedId?: string;
  testIDPrefix: string;
}) {
  const [filter, setFilter] = useState("");
  const selected = categories?.find((category) => category.id === selectedId);
  const options = useMemo(() => {
    const normalized = filter.trim().toLowerCase();
    const source = categories ?? [];
    if (!normalized) return source.slice(0, 16);

    return source
      .filter((category) =>
        categoryPath(source, category.id).toLowerCase().includes(normalized),
      )
      .slice(0, 16);
  }, [categories, filter]);

  return (
    <View style={styles.categorySelector}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.currentCategory}>
        {selected ? categoryPath(categories, selected.id) : "Uncategorized"}
      </Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={setFilter}
        placeholder="Search categories"
        style={styles.textInput}
        testID={`${testIDPrefix}-search`}
        value={filter}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categoryRow}>
          {options.map((category) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: category.id === selectedId }}
              disabled={disabled}
              key={category.id}
              onPress={() => onSelect(category.id)}
              style={[
                styles.categoryChip,
                category.id === selectedId && styles.categoryChipSelected,
              ]}
              testID={`${testIDPrefix}-${category.id}`}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.categoryChipText,
                  category.id === selectedId &&
                    styles.categoryChipTextSelected,
                ]}
              >
                {categoryLabel(category)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function FieldInput({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  testID,
  value,
}: {
  keyboardType?: TextInputProps["keyboardType"];
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  testID: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.textInput}
        testID={testID}
        value={value}
      />
    </View>
  );
}

function ReadOnlyField({
  label,
  testID,
  value,
}: {
  label: string;
  testID: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.readOnlyValue} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ErrorPanel({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.errorPanel} testID="transaction-detail-error">
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorBody}>{body}</Text>
    </View>
  );
}

function formatReviewLevel(level: string): string {
  // replaceAll so multi-underscore review levels (e.g. a future "needs_manual_review")
  // render fully, not just the first underscore.
  return level.replaceAll("_", " ");
}

const styles = StyleSheet.create({
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
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 2,
  },
  categorySelector: {
    gap: 8,
  },
  currentCategory: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
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
  header: {
    gap: 10,
    marginBottom: 24,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  infoText: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "700",
  },
  inputGroup: {
    gap: 6,
  },
  itemEditor: {
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 16,
  },
  itemHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemNameBlock: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
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
  lockBanner: {
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    padding: 12,
  },
  lockIcon: {
    fontSize: 15,
  },
  lockText: {
    color: "#1d4ed8",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  metric: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  mutedText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    marginBottom: 16,
    padding: 16,
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
  },
  readOnlyValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  receiptImage: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    height: 96,
    width: 96,
  },
  sharedBadge: {
    backgroundColor: "#dbeafe",
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sharedBadgeText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
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
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  warningBox: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 14,
    padding: 12,
  },
  warningText: {
    color: "#92400e",
    fontSize: 13,
    lineHeight: 18,
  },
  warningTitle: {
    color: "#92400e",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
  },
});
