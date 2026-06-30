import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { type MessageKey } from "@/lib/i18n";
import { apiClient } from "@/lib/api";
import { useCardAliases, cardAliasKeys, type CardAlias } from "@/hooks/useCardAliases";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { PixelIcon } from "@/components/shell/PixelIcon";
import {
  SettingsSubviewShell,
  SettingsGroupHeading,
} from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/cards")({
  component: CardsSubview,
});

const PAGE_SIZE = 12;

/** Add/edit a card alias — only the name is stored. */
function CardAliasModal({
  target,
  saving,
  errorMsg,
  onClose,
  onSave,
  onArchive,
  labels,
}: {
  target: CardAlias | "new";
  saving: boolean;
  errorMsg: string | null;
  onClose: () => void;
  onSave: (name: string) => void;
  onArchive: () => void;
  labels: {
    addTitle: string;
    editTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    save: string;
    archive: string;
    cancel: string;
  };
}) {
  const isEdit = target !== "new";
  const [name, setName] = useState(isEdit ? target.name : "");
  const trimmed = name.trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? labels.editTitle : labels.addTitle}
      footer={
        <div className="flex items-center justify-between gap-gt-8">
          {isEdit ? (
            <Button variant="ghost" size="sm" onClick={onArchive} disabled={saving} className="text-gt-negative">
              {labels.archive}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-gt-8">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              {labels.cancel}
            </Button>
            <Button variant="primary" size="sm" onClick={() => onSave(trimmed)} disabled={saving || trimmed.length === 0}>
              {labels.save}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-gt-6">
        <span className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">{labels.nameLabel}</span>
        <Input aria-label={labels.nameLabel} value={name} placeholder={labels.namePlaceholder} onChange={(e) => setName(e.target.value)} />
        {errorMsg ? (
          <p className="text-gt-sm font-bold text-gt-error" role="alert">{errorMsg}</p>
        ) : null}
      </div>
    </Modal>
  );
}

/**
 * Mis tarjetas — user-named card aliases for statement reconciliation (REQ-09),
 * rebuilt to the design-lab CardsSubview grammar. WIRED: list / add / rename /
 * archive against /card-aliases (gastify stores only the alias name — never the
 * number, CVV or expiry). Client-paginated at 12.
 *
 * COMING-SOON (D101): the mockup's per-card color + icon picker (CS-16), the
 * default-method + Efectivo (cash) rows (CS-17), and restoring an archived card
 * (CS-18) are unbacked — card_aliases stores only {name, archived_at}, archive is
 * one-way (no restore endpoint), and there is no cash/default/color/icon model.
 */
function CardsSubview() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const cards = useCardAliases(false);
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<CardAlias | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  const open = (next: CardAlias | "new") => {
    setError(null);
    setTarget(next);
  };

  const items = cards.data ?? [];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageItems = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const labels = {
    addTitle: t("settings.cards.addTitle"),
    editTitle: t("settings.cards.editTitle"),
    nameLabel: t("settings.cards.nameLabel"),
    namePlaceholder: t("settings.cards.namePlaceholder"),
    save: t("settings.cards.save"),
    archive: t("settings.cards.archive"),
    cancel: t("settings.cards.cancel"),
  };

  const save = async (name: string) => {
    if (name.length === 0 || target === null) return;
    setSaving(true);
    setError(null);
    try {
      const { error: apiError } =
        target === "new"
          ? await apiClient.POST("/api/v1/card-aliases", { body: { name } })
          : await apiClient.PATCH("/api/v1/card-aliases/{alias_id}", {
              params: { path: { alias_id: target.id } },
              body: { name },
            });
      if (apiError) {
        setError("settings.cards.saveError"); // e.g. 409 duplicate name — keep the modal open
        return;
      }
      await queryClient.invalidateQueries({ queryKey: cardAliasKeys.all });
      setTarget(null);
    } catch {
      setError("settings.cards.saveError");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (target === null || target === "new") return;
    setSaving(true);
    setError(null);
    try {
      const { error: apiError } = await apiClient.DELETE("/api/v1/card-aliases/{alias_id}", {
        params: { path: { alias_id: target.id } },
      });
      if (apiError) {
        setError("settings.cards.archiveError");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: cardAliasKeys.all });
      setTarget(null);
    } catch {
      setError("settings.cards.archiveError");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title={t("settings.row.cards")}>
        <p className="px-gt-2 text-gt-sm font-medium leading-relaxed text-gt-ink-3">{t("settings.cards.intro")}</p>

        <SettingsGroupHeading>{t("settings.cards.section")}</SettingsGroupHeading>
        {cards.isError ? (
          <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-error">{t("settings.cards.loadError")}</p>
        ) : cards.isLoading ? (
          <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-ink-3">{t("settings.cards.loading")}</p>
        ) : items.length === 0 ? (
          <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-ink-3">{t("settings.cards.empty")}</p>
        ) : (
          <>
            <div className="flex flex-col">
              {pageItems.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => open(card)}
                  aria-label={`${t("settings.cards.editAria")} ${card.name}`}
                  className="flex w-full items-center gap-gt-12 rounded-gt-lg px-gt-2 py-gt-6 text-left transition hover:bg-gt-bg-3"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface">
                    <PixelIcon name="fin-credit-card" size={26} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{card.name}</span>
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 -rotate-45 border-b-2 border-r-2 border-gt-ink-3" />
                </button>
              ))}
            </div>
            {pageCount > 1 ? <Pagination page={current} pageCount={pageCount} onPage={setPage} className="pt-gt-2" /> : null}
          </>
        )}

        <button
          type="button"
          onClick={() => open("new")}
          className="mt-gt-2 flex w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-dashed border-gt-line-strong px-gt-12 py-gt-10 font-gt-display text-gt-md font-extrabold text-gt-primary transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:bg-gt-primary-soft"
        >
          <PixelIcon name="action-add" size={18} /> {t("settings.cards.add")}
        </button>
      </SettingsSubviewShell>

      {target != null ? (
        <CardAliasModal
          key={target === "new" ? "new" : target.id}
          target={target}
          saving={saving}
          errorMsg={error ? t(error) : null}
          onClose={() => setTarget(null)}
          onSave={(name) => void save(name)}
          onArchive={() => void archive()}
          labels={labels}
        />
      ) : null}
    </div>
  );
}
