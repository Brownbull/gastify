import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { EmptyState } from "@design-system/molecules/EmptyState";
import { Pagination } from "@design-system/molecules/Pagination";
import { expandHex } from "@lib/hexColor";
import { SAMPLE_NOTIFICATIONS, KIND_META, BUCKET_ORDER, unreadCount, type AppNotification } from "../model/notificationFixtures";

function NotificationRow({ n, onRead, onDelete }: { n: AppNotification; onRead?: () => void; onDelete?: () => void }) {
  const meta = KIND_META[n.kind];
  return (
    <div className="flex items-start gap-gt-10 px-gt-12 py-gt-12 transition duration-150 ease-gt-bounce hover:bg-gt-bg-3">
      {/* main tap area — marks an unread notification read (deep-links in the app) */}
      <button type="button" onClick={() => (n.read ? undefined : onRead?.())} className="flex min-w-0 flex-1 items-start gap-gt-10 text-left">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong" style={{ backgroundColor: `${expandHex(meta.color)}26` }}>
          <PixelIcon name={meta.icon} size={meta.size ?? 26} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
          <span className={`truncate font-gt-display text-gt-md ${n.read ? "font-bold text-gt-ink-2" : "font-extrabold text-gt-ink"}`}>{n.title}</span>
          <span className={`text-gt-sm font-medium ${n.read ? "text-gt-ink-3" : "text-gt-ink-2"}`}>{n.body}</span>
          <span className="text-gt-xs font-bold text-gt-ink-3">{n.time}</span>
        </span>
      </button>
      {/* trailing: unread dot, or once read a delete button (removes, no confirm) */}
      <span className="mt-gt-2 shrink-0">
        {n.read ? (
          <button
            type="button"
            aria-label="Eliminar notificación"
            onClick={onDelete}
            className="grid h-9 w-9 place-items-center rounded-gt-md text-gt-ink-3 transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:bg-gt-negative-bg hover:text-gt-negative"
          >
            <PixelIcon name="action-delete" size={26} />
          </button>
        ) : (
          <span aria-label="No leída" className="block h-2.5 w-2.5 rounded-gt-pill bg-gt-primary" />
        )}
      </span>
    </div>
  );
}

export interface NotificationsScreenProps {
  notifications?: AppNotification[];
  onBack?: () => void;
}

/**
 * NotificationsScreen — the user-global notification feed (backend D78), reached
 * from the avatar dropdown. Time-grouped (Hoy / Esta semana / Antes), with an
 * unread dot + bolder title per item; tapping marks read, plus "marcar todo".
 */
const PAGE_SIZE = 12; // notifications per page (feed keeps ~30 days)

export function NotificationsScreen({ notifications = SAMPLE_NOTIFICATIONS, onBack }: NotificationsScreenProps) {
  const [items, setItems] = useState(notifications);
  const [page, setPage] = useState(1);
  const unread = unreadCount(items);
  const markRead = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAll = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const deleteNotif = (id: string) => setItems((prev) => prev.filter((n) => n.id !== id));
  // paginate the flat feed (12/page), then group the current page under buckets.
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageItems = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Notificaciones" onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-12 pt-gt-12" style={{ maxWidth: "42rem" }}>
          {items.length === 0 ? (
            <div className="grid place-items-center py-gt-24" style={{ minHeight: "50vh" }}>
              <EmptyState
                iconName="nav-alerts"
                title="Sin notificaciones"
                message="Aquí verás tus escaneos listos, alertas de límites y la actividad de tus grupos."
              />
            </div>
          ) : (
            <>
              {unread > 0 ? (
                <div className="flex items-center justify-between gap-gt-8 px-gt-4">
                  <span className="font-gt-display text-gt-sm font-extrabold text-gt-ink-2">{unread} sin leer</span>
                  <button type="button" onClick={markAll} className="font-gt-display text-gt-sm font-extrabold text-gt-primary">
                    Marcar todo como leído
                  </button>
                </div>
              ) : null}
              {BUCKET_ORDER.filter((b) => pageItems.some((n) => n.bucket === b)).map((bucket) => (
                <section key={bucket} className="flex flex-col gap-gt-6">
                  <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">{bucket}</p>
                  <div className="flex flex-col divide-y-2 divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
                    {pageItems
                      .filter((n) => n.bucket === bucket)
                      .map((n) => (
                        <NotificationRow key={n.id} n={n} onRead={() => markRead(n.id)} onDelete={() => deleteNotif(n.id)} />
                      ))}
                  </div>
                </section>
              ))}

              {pageCount > 1 ? <Pagination page={current} pageCount={pageCount} onPage={setPage} className="pt-gt-2" /> : null}

              <p className="px-gt-4 pt-gt-2 text-center text-gt-xs font-medium text-gt-ink-3">
                Se guardan las notificaciones de los últimos 30 días.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
