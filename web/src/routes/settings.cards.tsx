import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/hooks/useI18n";
import { apiClient } from "@/lib/api";
import { useCardAliases, cardAliasKeys, type CardAlias } from "@/hooks/useCardAliases";
import {
  CARD_ICON_CHOICES,
  CARD_COLOR_CHOICES,
  MAX_CARDS,
  DEFAULT_CARD_ICON,
  DEFAULT_CARD_COLOR,
  softBgFor,
} from "@/lib/paymentMethods";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Pagination } from "@/components/ui/Pagination";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { XIcon } from "@/components/shell/icons";
import {
  SettingsSubviewShell,
  SettingsGroupHeading,
} from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/cards")({
  component: CardsSubview,
});

const PAGE_SIZE = 12;

interface EditorLabels {
  addTitle: string;
  editTitle: string;
  alias: string;
  aliasPlaceholder: string;
  icon: string;
  color: string;
  defaultLabel: string;
  defaultHint: string;
  save: string;
  saving: string;
  archive: string;
  cancel: string;
  newCard: string;
  saveError: string;
  archiveError: string;
}

/** A card row in the list: color-tinted icon tile + name + default badge + chevron. */
function MethodRow({
  card,
  editLabel,
  defaultLabel,
  active,
  onEdit,
}: {
  card: CardAlias;
  editLabel: string;
  defaultLabel: string;
  active: boolean;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${editLabel} ${card.name}`}
      data-testid={`card-row-${card.id}`}
      className={`flex w-full items-center gap-gt-12 rounded-gt-lg px-gt-4 py-gt-6 text-left transition hover:bg-gt-bg-3 ${active ? "bg-gt-bg-3" : ""}`}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong"
        style={{ backgroundColor: softBgFor(card.color) }}
      >
        <PixelIcon name={card.icon ?? DEFAULT_CARD_ICON} size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{card.name}</span>
        {card.is_default ? (
          <span className="inline-flex w-fit items-center gap-gt-2 rounded-gt-pill bg-gt-primary-soft px-gt-6 font-gt-display text-gt-xs font-extrabold text-gt-primary">
            <PixelIcon name="scan-success" size={13} /> {defaultLabel}
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 -rotate-45 border-b-2 border-r-2 border-gt-ink-3" />
    </button>
  );
}

/** The full card editor — alias + icon picker + color picker + default toggle +
 * live preview + archive. Fills the detail pane (not a cramped modal). */
function CardEditor({
  target,
  labels,
  onClose,
  onSaved,
}: {
  target: CardAlias | "new";
  labels: EditorLabels;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = target !== "new";
  const [name, setName] = useState(isEdit ? target.name : "");
  const [icon, setIcon] = useState(isEdit ? target.icon ?? DEFAULT_CARD_ICON : DEFAULT_CARD_ICON);
  const [color, setColor] = useState(isEdit ? target.color ?? DEFAULT_CARD_COLOR : DEFAULT_CARD_COLOR);
  const [isDefault, setIsDefault] = useState(isEdit ? target.is_default : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  const save = async () => {
    if (trimmed.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    const body = { name: trimmed, icon, color, is_default: isDefault };
    const { error: apiError } = isEdit
      ? await apiClient.PATCH("/api/v1/card-aliases/{alias_id}", {
          params: { path: { alias_id: target.id } },
          body,
        })
      : await apiClient.POST("/api/v1/card-aliases", { body });
    setSaving(false);
    if (apiError) {
      setError(labels.saveError);
      return;
    }
    onSaved();
  };

  const archive = async () => {
    if (!isEdit || saving) return;
    setSaving(true);
    setError(null);
    const { error: apiError } = await apiClient.DELETE("/api/v1/card-aliases/{alias_id}", {
      params: { path: { alias_id: target.id } },
    });
    setSaving(false);
    if (apiError) {
      setError(labels.archiveError);
      return;
    }
    onSaved();
  };

  const fieldLabel = "font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3";

  return (
    <div className="flex flex-col gap-gt-16 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm">
      <div className="flex items-center justify-between gap-gt-8">
        <h2 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">
          {isEdit ? labels.editTitle : labels.addTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.cancel}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-md text-gt-ink-2 transition hover:bg-gt-bg-3"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* live preview */}
      <div className="flex justify-center py-gt-2">
        <span
          className="inline-flex items-center gap-gt-8 rounded-gt-pill border-2 border-gt-line-strong px-gt-12 py-gt-6 shadow-gt-xs"
          style={{ backgroundColor: softBgFor(color) }}
        >
          <PixelIcon name={icon} size={22} />
          <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{trimmed || labels.newCard}</span>
        </span>
      </div>

      {/* alias */}
      <div className="flex flex-col gap-gt-6">
        <span className={fieldLabel}>{labels.alias}</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.aliasPlaceholder}
          maxLength={20}
          aria-label={labels.alias}
        />
      </div>

      {/* icon picker */}
      <div className="flex flex-col gap-gt-8">
        <span className={fieldLabel}>{labels.icon}</span>
        <div className="flex flex-wrap gap-gt-8">
          {CARD_ICON_CHOICES.map((ic) => (
            <button
              key={ic}
              type="button"
              aria-label={ic}
              aria-pressed={icon === ic}
              onClick={() => setIcon(ic)}
              className={`grid h-12 w-12 place-items-center rounded-gt-lg border-2 transition ${
                icon === ic
                  ? "border-gt-line-strong bg-gt-primary-soft shadow-gt-xs"
                  : "border-gt-line bg-gt-surface hover:bg-gt-bg-3"
              }`}
            >
              <PixelIcon name={ic} size={28} />
            </button>
          ))}
        </div>
      </div>

      {/* color picker */}
      <div className="flex flex-col gap-gt-8">
        <span className={fieldLabel}>{labels.color}</span>
        <div className="flex flex-wrap gap-gt-8">
          {CARD_COLOR_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-gt-pill border-2 transition ${
                color === c ? "border-gt-ink shadow-gt-xs" : "border-gt-line-strong hover:-translate-y-0.5"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* default toggle */}
      <div className="flex items-center gap-gt-12 rounded-gt-lg border-2 border-gt-line bg-gt-bg-2 px-gt-12 py-gt-10">
        <span className="grid h-9 w-9 shrink-0 place-items-center">
          <PixelIcon name="scan-success" size={26} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
          <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{labels.defaultLabel}</span>
          <span className="text-gt-xs font-medium text-gt-ink-3">{labels.defaultHint}</span>
        </span>
        <Switch checked={isDefault} onChange={setIsDefault} label={labels.defaultLabel} />
      </div>

      {error ? (
        <p className="text-gt-sm font-bold text-gt-error" role="alert">{error}</p>
      ) : null}

      {/* footer */}
      <div className="flex items-center justify-between gap-gt-8 border-t-2 border-gt-line pt-gt-12">
        {isEdit ? (
          <Button variant="ghost" size="sm" onClick={() => void archive()} disabled={saving} className="text-gt-negative">
            {labels.archive}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-gt-8">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            {labels.cancel}
          </Button>
          <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving || trimmed.length === 0}>
            {saving ? labels.saving : labels.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mis tarjetas — user-named card aliases for statement reconciliation (REQ-09),
 * rebuilt to the design-lab card-management UX. WIRED: list / add / edit (alias +
 * fin-* icon + accent color + default-method toggle) / archive against /card-aliases
 * (icon/color/is_default persisted; one default per scope, backend-enforced).
 *
 * The editor is a full-section master/detail (list left, editor fills the pane on
 * desktop; full-screen editor on mobile) — NOT a cramped modal. gastify stores only
 * the alias + these presentational fields, never the number / CVV / expiry.
 *
 * COMING-SOON (D101): Efectivo (cash) as a payment method (CS-17) and restoring an
 * archived card (CS-18) remain unbacked — cards-only, archive is one-way.
 */
function CardsSubview() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const cards = useCardAliases(false);
  const [editing, setEditing] = useState<CardAlias | "new" | null>(null);
  const [page, setPage] = useState(1);

  const items = cards.data ?? [];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageItems = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const activeId = editing && editing !== "new" ? editing.id : null;

  const labels: EditorLabels = {
    addTitle: t("settings.cards.addTitle"),
    editTitle: t("settings.cards.editTitle"),
    alias: t("settings.cards.alias"),
    aliasPlaceholder: t("settings.cards.namePlaceholder"),
    icon: t("settings.cards.icon"),
    color: t("settings.cards.color"),
    defaultLabel: t("settings.cards.default"),
    defaultHint: t("settings.cards.defaultHint"),
    save: t("settings.cards.save"),
    saving: t("settings.cards.saving"),
    archive: t("settings.cards.archive"),
    cancel: t("settings.cards.cancel"),
    newCard: t("settings.cards.newCard"),
    saveError: t("settings.cards.saveError"),
    archiveError: t("settings.cards.archiveError"),
  };

  const onSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: cardAliasKeys.all });
    setEditing(null);
  };

  return (
    <SettingsSubviewShell title={t("settings.row.cards")} wide>
      <div className="flex flex-col gap-gt-16 lg:flex-row lg:items-start lg:gap-gt-20">
        {/* MASTER — the methods list (hidden on mobile while editing) */}
        <div
          className={`flex-col gap-gt-12 lg:flex lg:w-80 lg:shrink-0 ${editing ? "hidden lg:flex" : "flex"}`}
        >
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
                  <MethodRow
                    key={card.id}
                    card={card}
                    editLabel={t("settings.cards.editAria")}
                    defaultLabel={t("settings.cards.defaultBadge")}
                    active={card.id === activeId}
                    onEdit={() => setEditing(card)}
                  />
                ))}
              </div>
              {pageCount > 1 ? <Pagination page={current} pageCount={pageCount} onPage={setPage} className="pt-gt-2" /> : null}
            </>
          )}

          {items.length < MAX_CARDS ? (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="mt-gt-2 flex w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-dashed border-gt-line-strong px-gt-12 py-gt-10 font-gt-display text-gt-md font-extrabold text-gt-primary transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:bg-gt-primary-soft"
            >
              <PixelIcon name="action-add" size={18} /> {t("settings.cards.add")}
            </button>
          ) : (
            <p className="px-gt-4 text-gt-sm font-bold text-gt-ink-3">{t("settings.cards.max")}</p>
          )}
        </div>

        {/* DETAIL — the editor (full-screen on mobile; empty-state hint on desktop) */}
        <div className={`flex-1 flex-col ${editing ? "flex" : "hidden lg:flex"}`}>
          {editing ? (
            <CardEditor
              key={editing === "new" ? "new" : editing.id}
              target={editing}
              labels={labels}
              onClose={() => setEditing(null)}
              onSaved={() => void onSaved()}
            />
          ) : (
            <div className="flex min-h-40 items-center justify-center rounded-gt-2xl border-2 border-dashed border-gt-line p-gt-16 text-center">
              <p className="text-gt-sm font-medium text-gt-ink-3">{t("settings.cards.selectHint")}</p>
            </div>
          )}
        </div>
      </div>
    </SettingsSubviewShell>
  );
}
