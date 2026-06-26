import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { SettingsSubviewShell } from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/memory")({
  component: MemorySubview,
});

type LearnedMappings = {
  merchants: Array<{ id: string; original_merchant: string; target_merchant: string }>;
  items: Array<{ id: string; original_item: string; target_item: string | null }>;
};

function MemorySubview() {
  const { t } = useI18n();
  const [data, setData] = useState<LearnedMappings | null>(null);

  const refresh = () => {
    apiClient.GET("/api/v1/mappings").then(({ data: d }) => {
      if (d) setData(d as LearnedMappings);
    });
  };
  useEffect(refresh, []);

  const remove = async (kind: "merchant" | "item", id: string) => {
    if (kind === "merchant") {
      await apiClient.DELETE("/api/v1/mappings/merchant/{mapping_id}", {
        params: { path: { mapping_id: id } },
      });
    } else {
      await apiClient.DELETE("/api/v1/mappings/item/{mapping_id}", {
        params: { path: { mapping_id: id } },
      });
    }
    refresh();
  };

  const empty = data && data.merchants.length === 0 && data.items.length === 0;
  return (
    <SettingsSubviewShell title={t("settings.row.memory")}>
      <div className="space-y-gt-8" data-testid="learned-mappings-section">
        {!data && <p className="text-gt-sm font-medium text-gt-ink-3">…</p>}
        {empty && (
          <p className="text-gt-sm font-medium text-gt-ink-3" data-testid="learned-mappings-empty">
            {t("settings.memory.empty")}
          </p>
        )}
        {data?.merchants.map((m) => (
          <MappingRow
            key={m.id}
            id={m.id}
            label={`${m.original_merchant} → ${m.target_merchant}`}
            deleteLabel={t("settings.memory.delete")}
            onRemove={() => remove("merchant", m.id)}
          />
        ))}
        {data?.items.map((m) => (
          <MappingRow
            key={m.id}
            id={m.id}
            label={`${m.original_item} → ${m.target_item ?? "(category only)"}`}
            deleteLabel={t("settings.memory.delete")}
            onRemove={() => remove("item", m.id)}
          />
        ))}
      </div>
    </SettingsSubviewShell>
  );
}

function MappingRow({
  id,
  label,
  deleteLabel,
  onRemove,
}: {
  id: string;
  label: string;
  deleteLabel: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-gt-8 rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-12 py-gt-8">
      <span className="truncate text-gt-sm font-medium text-gt-ink-2">{label}</span>
      <Button variant="ghost" size="sm" data-testid={`mapping-delete-${id}`} onClick={onRemove} className="shrink-0 text-gt-negative">
        {deleteLabel}
      </Button>
    </div>
  );
}
