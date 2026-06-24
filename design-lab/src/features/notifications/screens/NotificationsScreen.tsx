import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { EmptyState } from "@design-system/molecules/EmptyState";
import { expandHex } from "@lib/hexColor";
import { SAMPLE_NOTIFICATIONS, KIND_META, BUCKET_ORDER, unreadCount, type AppNotification } from "../model/notificationFixtures";

function NotificationRow({ n, onClick }: { n: AppNotification; onClick?: () => void }) {
  const meta = KIND_META[n.kind];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-gt-10 px-gt-12 py-gt-12 text-left transition duration-150 ease-gt-bounce hover:bg-gt-bg-3"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong" style={{ backgroundColor: `${expandHex(meta.color)}26` }}>
        <PixelIcon name={meta.icon} size={26} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className={`truncate font-gt-display text-gt-md ${n.read ? "font-bold text-gt-ink-2" : "font-extrabold text-gt-ink"}`}>{n.title}</span>
        <span className={`text-gt-sm font-medium ${n.read ? "text-gt-ink-3" : "text-gt-ink-2"}`}>{n.body}</span>
        <span className="text-gt-xs font-bold text-gt-ink-3">{n.time}</span>
      </span>
      {n.read ? null : <span aria-label="No leída" className="mt-gt-2 h-2.5 w-2.5 shrink-0 rounded-gt-pill bg-gt-primary" />}
    </button>
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
export function NotificationsScreen({ notifications = SAMPLE_NOTIFICATIONS, onBack }: NotificationsScreenProps) {
  const [items, setItems] = useState(notifications);
  const unread = unreadCount(items);
  const markRead = (id: string) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAll = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));

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
              {BUCKET_ORDER.filter((b) => items.some((n) => n.bucket === b)).map((bucket) => (
                <section key={bucket} className="flex flex-col gap-gt-6">
                  <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">{bucket}</p>
                  <div className="flex flex-col divide-y-2 divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
                    {items
                      .filter((n) => n.bucket === bucket)
                      .map((n) => (
                        <NotificationRow key={n.id} n={n} onClick={() => markRead(n.id)} />
                      ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
