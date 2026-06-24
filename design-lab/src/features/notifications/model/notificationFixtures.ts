/**
 * Notification feed fixtures — mirrors backend/app/schemas/notifications.py
 * (NotificationRow: kind / title / body / read_at / created_at; the feed is
 * user-global, recency-ordered, read = read_at != null). The first three kinds
 * are the live backend kinds; budget_alert + group_shared are natural
 * extensions the check-constraint would grow into.
 */
export type NotificationKind =
  | "scan_complete"
  | "scan_needs_review"
  | "statement_reconciled"
  | "budget_alert"
  | "group_shared";

export type TimeBucket = "Hoy" | "Esta semana" | "Antes";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** relative display time, e.g. "hace 5 min", "Ayer", "12 jun". */
  time: string;
  bucket: TimeBucket;
  read: boolean;
}

/** icon + accent hex per kind (tinted tile). */
export const KIND_META: Record<NotificationKind, { icon: string; color: string }> = {
  scan_complete: { icon: "scan-success", color: "#10B981" },
  scan_needs_review: { icon: "status-warning", color: "#F59E0B" },
  statement_reconciled: { icon: "scan-statement", color: "#7B6EF6" },
  budget_alert: { icon: "fin-budget", color: "#EF4444" },
  group_shared: { icon: "settings-groups", color: "#3B82F6" },
};

export const BUCKET_ORDER: TimeBucket[] = ["Hoy", "Esta semana", "Antes"];

// The feed keeps ~30 days; older notifications are dropped server-side. Paginated
// at 12/page in the screen.
export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", kind: "scan_complete", title: "Escaneo listo", body: "Tu boleta de Supermercado Líder está lista — 8 ítems, $28.350.", time: "hace 5 min", bucket: "Hoy", read: false },
  { id: "n2", kind: "scan_needs_review", title: "Revisa tu escaneo", body: "No pudimos leer 2 ítems de Farmacia Ahumada. Confírmalos.", time: "hace 2 h", bucket: "Hoy", read: false },
  { id: "n3", kind: "group_shared", title: "Actividad en Familia González", body: "Camila compartió un gasto de $12.990 en el grupo.", time: "hace 4 h", bucket: "Hoy", read: false },
  { id: "n4", kind: "budget_alert", title: "Vas llegando al límite", body: "Llevas 85% de tu límite de Supermercados este mes.", time: "Ayer", bucket: "Esta semana", read: true },
  { id: "n5", kind: "statement_reconciled", title: "Estado de cuenta conciliado", body: "14 transacciones de tu cartola se vincularon automáticamente.", time: "Lun", bucket: "Esta semana", read: true },
  { id: "n6", kind: "scan_complete", title: "Escaneo listo", body: "Tu boleta de Unimarc está lista — 12 ítems, $22.400.", time: "Lun", bucket: "Esta semana", read: true },
  { id: "n7", kind: "group_shared", title: "Actividad en Roommates 502", body: "Diego compartió un gasto de $64.200 en el grupo.", time: "Dom", bucket: "Esta semana", read: true },
  { id: "n8", kind: "scan_needs_review", title: "Revisa tu escaneo", body: "No pudimos leer el total de Almacén Doña Rosa.", time: "Sáb", bucket: "Esta semana", read: true },
  { id: "n9", kind: "scan_complete", title: "Escaneo listo", body: "Tu boleta de Copec está lista — 1 ítem, $38.000.", time: "12 jun", bucket: "Antes", read: true },
  { id: "n10", kind: "budget_alert", title: "Límite alcanzado", body: "Superaste tu límite de Restaurantes este mes.", time: "11 jun", bucket: "Antes", read: true },
  { id: "n11", kind: "statement_reconciled", title: "Estado de cuenta conciliado", body: "9 transacciones de tu cartola se vincularon automáticamente.", time: "9 jun", bucket: "Antes", read: true },
  { id: "n12", kind: "group_shared", title: "Te uniste a Viaje Sur 2026", body: "Ahora compartes gastos con 4 personas más.", time: "7 jun", bucket: "Antes", read: true },
  { id: "n13", kind: "scan_complete", title: "Escaneo listo", body: "Tu boleta de Jumbo está lista — 23 ítems, $64.200.", time: "5 jun", bucket: "Antes", read: true },
  { id: "n14", kind: "scan_complete", title: "Escaneo listo", body: "Tu boleta de Farmacia Cruz Verde está lista — 3 ítems, $9.800.", time: "3 jun", bucket: "Antes", read: true },
  { id: "n15", kind: "budget_alert", title: "Vas llegando al límite", body: "Llevas 80% de tu límite de Transporte este mes.", time: "1 jun", bucket: "Antes", read: true },
  { id: "n16", kind: "scan_needs_review", title: "Revisa tu escaneo", body: "No pudimos leer 1 ítem de Pizzería Napoli.", time: "29 may", bucket: "Antes", read: true },
];

export const unreadCount = (ns: AppNotification[]): number => ns.filter((n) => !n.read).length;
