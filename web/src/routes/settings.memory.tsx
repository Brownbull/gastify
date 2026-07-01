import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { apiClient } from "@/lib/api";
import { useMappings, mappingKeys } from "@/hooks/useMappings";
import { useStoreCategories, useItemCategories } from "@/hooks/useCategories";
import { storeCategoryIcon, itemCategoryIcon } from "@/lib/categoryIcon";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { XIcon } from "@/components/shell/icons";
import {
  SettingsSubviewShell,
  SettingsGroupHeading,
} from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/memory")({
  component: MemorySubview,
});

interface MemoryRule {
  id: string;
  kind: "merchant" | "item";
  name: string;
  icon: string;
  caption: string;
}

type CategoryItem = { id: string; key: string; display_labels: Record<string, unknown> };

function RuleRow({
  rule,
  forgetLabel,
  onForget,
}: {
  rule: MemoryRule;
  forgetLabel: string;
  onForget: () => void;
}) {
  return (
    <div
      className="flex items-center gap-gt-12 px-gt-4 py-gt-10"
      data-testid={`mapping-row-${rule.id}`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center">
        <PixelIcon name={rule.icon} size={36} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{rule.name}</span>
        <span className="truncate text-gt-sm font-medium text-gt-ink-3">{rule.caption}</span>
      </span>
      <button
        type="button"
        onClick={onForget}
        aria-label={`${forgetLabel} ${rule.name}`}
        data-testid={`mapping-delete-${rule.id}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-pill text-gt-ink-3 transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 hover:text-gt-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function MemorySection({
  heading,
  caption,
  rules,
  loading,
  loadingLabel,
  emptyLabel,
  forgetLabel,
  onForget,
}: {
  heading: string;
  caption: string;
  rules: MemoryRule[];
  loading: boolean;
  loadingLabel: string;
  emptyLabel: string;
  forgetLabel: string;
  onForget: (rule: MemoryRule) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-gt-2">
        <SettingsGroupHeading>{heading}</SettingsGroupHeading>
        <p className="px-gt-4 text-gt-xs font-medium text-gt-ink-3">{caption}</p>
      </div>
      {loading ? (
        <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-ink-3">{loadingLabel}</p>
      ) : rules.length > 0 ? (
        <div className="flex flex-col">
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} forgetLabel={forgetLabel} onForget={() => onForget(rule)} />
          ))}
        </div>
      ) : (
        <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-ink-3">{emptyLabel}</p>
      )}
    </>
  );
}

/**
 * Mi memoria — gastify's learned categorization, rebuilt to the design-lab
 * MemorySubview reference: two memories (Transacciones = merchant→store-category,
 * Productos = item→item-category), each rule removable via the ✕, plus an
 * "Olvidar todo" (Modal-confirmed) clear.
 *
 * WIRED: rules read from /mappings; each merchant's store_category_id and each
 * item's target_category_id resolve to a human label + pixel icon via the
 * store/item category taxonomies (useStoreCategories / useItemCategories). Per-rule
 * delete hits /mappings/{merchant,item}/{id}; "Olvidar todo" loops those per-id
 * deletes (there is no bulk endpoint) and invalidates the cache.
 *
 * COMING-SOON (D101): the master "Aprender de mis correcciones" toggle is a
 * disabled placeholder — gastify always learns from corrections today and there is
 * no backend flag to turn that off (CS-14).
 */
function MemorySubview() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const mappings = useMappings();
  const storeCats = useStoreCategories();
  const itemCats = useItemCategories();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const labelOf = (cat: CategoryItem | undefined): string => {
    if (!cat) return "";
    const labels = cat.display_labels ?? {};
    return (labels[locale] as string) ?? (labels.en as string) ?? cat.key;
  };

  const storeById = new Map<string, CategoryItem>((storeCats.data ?? []).map((c) => [c.id, c]));
  const itemById = new Map<string, CategoryItem>((itemCats.data ?? []).map((c) => [c.id, c]));
  const classifiedAs = t("settings.memory.classifiedAs");

  const txRules: MemoryRule[] = (mappings.data?.merchants ?? []).map((m) => {
    const cat = m.store_category_id ? storeById.get(m.store_category_id) : undefined;
    const label = labelOf(cat);
    return {
      id: m.id,
      kind: "merchant" as const,
      name: m.target_merchant || m.original_merchant,
      icon: storeCategoryIcon(cat?.key),
      caption: label ? `${classifiedAs} ${label}` : `${m.original_merchant} → ${m.target_merchant}`,
    };
  });

  const itemRules: MemoryRule[] = (mappings.data?.items ?? []).map((it) => {
    const cat = itemById.get(it.target_category_id);
    const label = labelOf(cat);
    return {
      id: it.id,
      kind: "item" as const,
      name: it.target_item || it.original_item,
      icon: itemCategoryIcon(cat?.key),
      caption: label ? `${classifiedAs} ${label}` : it.original_item,
    };
  });

  const loading = mappings.isLoading;
  const hasAny = txRules.length > 0 || itemRules.length > 0;

  const forget = async (rule: MemoryRule) => {
    if (rule.kind === "merchant") {
      await apiClient.DELETE("/api/v1/mappings/merchant/{mapping_id}", {
        params: { path: { mapping_id: rule.id } },
      });
    } else {
      await apiClient.DELETE("/api/v1/mappings/item/{mapping_id}", {
        params: { path: { mapping_id: rule.id } },
      });
    }
    await queryClient.invalidateQueries({ queryKey: mappingKeys.all });
  };

  const forgetAll = async () => {
    setClearing(true);
    // No bulk endpoint — clear by looping the per-id deletes.
    await Promise.all([...txRules, ...itemRules].map((r) => forget(r).catch(() => undefined)));
    await queryClient.invalidateQueries({ queryKey: mappingKeys.all });
    setClearing(false);
    setConfirmClear(false);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title={t("settings.row.memory")}>
        <p className="px-gt-2 text-gt-sm font-medium leading-relaxed text-gt-ink-3">
          {t("settings.memory.intro")}
        </p>

        {/* master toggle — coming-soon (no backend flag to disable learning) */}
        <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
          <span className="grid h-11 w-11 shrink-0 place-items-center">
            <PixelIcon name="settings-memory" size={36} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t("settings.memory.learnTitle")}</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">{t("settings.memory.learnSubtitle")}</span>
          </span>
          <div className="flex shrink-0 items-center gap-gt-8">
            <Badge tone="neutral">{t("settings.comingSoon")}</Badge>
            <Switch checked disabled onChange={() => undefined} label={t("settings.memory.learnTitle")} />
          </div>
        </div>

        <div className="flex flex-col gap-gt-8" data-testid="learned-mappings-section">
          {mappings.isError ? (
            <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-error">{t("settings.memory.loadError")}</p>
          ) : (
            <>
              <MemorySection
                heading={t("settings.memory.txHeading")}
                caption={t("settings.memory.txCaption")}
                rules={txRules}
                loading={loading}
                loadingLabel={t("settings.memory.loading")}
                emptyLabel={t("settings.memory.emptySection")}
                forgetLabel={t("settings.memory.forget")}
                onForget={(r) => void forget(r)}
              />
              <MemorySection
                heading={t("settings.memory.itemsHeading")}
                caption={t("settings.memory.itemsCaption")}
                rules={itemRules}
                loading={loading}
                loadingLabel={t("settings.memory.loading")}
                emptyLabel={t("settings.memory.emptySection")}
                forgetLabel={t("settings.memory.forget")}
                onForget={(r) => void forget(r)}
              />

              {hasAny ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="mt-gt-8 flex w-full items-center gap-gt-12 px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce hover:bg-gt-negative/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center">
                    <PixelIcon name="action-delete" size={36} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
                    <span className="font-gt-display text-gt-md font-extrabold text-gt-negative">{t("settings.memory.forgetAll")}</span>
                    <span className="text-gt-sm font-medium text-gt-ink-3">{t("settings.memory.forgetAllSubtitle")}</span>
                  </span>
                </button>
              ) : null}
            </>
          )}
        </div>
      </SettingsSubviewShell>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t("settings.memory.forgetAllTitle")}
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)} disabled={clearing}>
              {t("settings.memory.cancel")}
            </Button>
            <Button variant="danger" size="sm" onClick={() => void forgetAll()} disabled={clearing}>
              {t("settings.memory.forgetAll")}
            </Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          {t("settings.memory.forgetAllBody")}
        </p>
      </Modal>
    </div>
  );
}
