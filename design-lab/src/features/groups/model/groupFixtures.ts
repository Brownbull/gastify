/**
 * Group (shared ownership scope) fixtures — mirrors backend/app/schemas/groups.py
 * (GroupSummary / MemberSummary / GroupDetail / GroupTransactionRow). A group is a
 * shared expense space: members with roles (owner/admin/member), a user-chosen
 * emoji + accent-color avatar (D75), and a feed of shared transactions whose
 * per-member visibility follows the 5e consent model (`sharesDetail`).
 */

export type GroupRole = "owner" | "admin" | "member";

/** display label + Badge tone per role (Spanish UI strings). */
export const ROLE_LABEL: Record<GroupRole, string> = {
  owner: "Dueño",
  admin: "Admin",
  member: "Miembro",
};
export const ROLE_TONE: Record<GroupRole, "primary" | "warning" | "neutral"> = {
  owner: "primary",
  admin: "warning",
  member: "neutral",
};

export interface GroupMember {
  userId: string;
  displayName: string;
  role: GroupRole;
  /** avatar accent hex. */
  color: string;
  /** the signed-in user (rendered as "Tú"). */
  isYou?: boolean;
  /** 5e (D73): opted in to expose their individual shared transactions. */
  sharesDetail: boolean;
}

export interface GroupSharedTxn {
  id: string;
  /** display date, e.g. "15 jun". */
  date: string;
  merchant: string;
  /** CLP. */
  total: number;
  currency: string;
  sharedByName: string;
  isOwn: boolean;
  /** store rubro id (ThumbnailBadge category) + pixel store icon. */
  category: string;
  storeIcon: string;
}

export interface Group {
  id: string;
  name: string;
  /** the signed-in user's role in THIS group. */
  role: GroupRole;
  /** user-chosen emoji avatar (D75). */
  icon: string;
  /** accent hex (D75). */
  color: string;
  members: GroupMember[];
  /** shared spending total for the active period (CLP). */
  sharedTotal: number;
  /** 5e: admin enabled per-member transaction visibility for this group. */
  memberVisibilityEnabled: boolean;
  sharedTxns: GroupSharedTxn[];
}

const FAMILIA: Group = {
  id: "g-familia",
  name: "Familia González",
  role: "owner",
  icon: "🏡",
  color: "#7B6EF6",
  sharedTotal: 284_500,
  memberVisibilityEnabled: true,
  members: [
    { userId: "u-you", displayName: "Tú", role: "owner", color: "#7B6EF6", isYou: true, sharesDetail: true },
    { userId: "u-cami", displayName: "Camila Rojas", role: "admin", color: "#EC4899", sharesDetail: true },
    { userId: "u-sofi", displayName: "Sofía González", role: "member", color: "#10B981", sharesDetail: false },
    { userId: "u-mati", displayName: "Matías González", role: "member", color: "#F59E0B", sharesDetail: true },
  ],
  sharedTxns: [
    { id: "gt-1", date: "15 jun", merchant: "Supermercado Líder", total: 48_350, currency: "CLP", sharedByName: "Tú", isOwn: true, category: "supermercados", storeIcon: "store-supermarket" },
    { id: "gt-2", date: "14 jun", merchant: "Farmacia Ahumada", total: 12_990, currency: "CLP", sharedByName: "Camila", isOwn: false, category: "salud-bienestar", storeIcon: "store-pharmacy" },
    { id: "gt-3", date: "12 jun", merchant: "Copec", total: 38_000, currency: "CLP", sharedByName: "Matías", isOwn: false, category: "transporte-vehiculo", storeIcon: "store-gas-station" },
    { id: "gt-4", date: "10 jun", merchant: "Unimarc", total: 27_400, currency: "CLP", sharedByName: "Tú", isOwn: true, category: "supermercados", storeIcon: "store-supermarket" },
  ],
};

const ROOMMATES: Group = {
  id: "g-roomies",
  name: "Roommates 502",
  role: "member",
  icon: "🛋️",
  color: "#10B981",
  sharedTotal: 156_800,
  memberVisibilityEnabled: false,
  members: [
    { userId: "u-vale", displayName: "Valentina Soto", role: "owner", color: "#7B6EF6", sharesDetail: true },
    { userId: "u-diego", displayName: "Diego Pérez", role: "admin", color: "#3B82F6", sharesDetail: true },
    { userId: "u-you", displayName: "Tú", role: "member", color: "#10B981", isYou: true, sharesDetail: false },
  ],
  sharedTxns: [
    { id: "rt-1", date: "13 jun", merchant: "Almacén Doña Rosa", total: 8_800, currency: "CLP", sharedByName: "Valentina", isOwn: false, category: "comercio-barrio", storeIcon: "store-minimarket" },
    { id: "rt-2", date: "11 jun", merchant: "Jumbo", total: 64_200, currency: "CLP", sharedByName: "Diego", isOwn: false, category: "supermercados", storeIcon: "store-supermarket" },
    { id: "rt-3", date: "09 jun", merchant: "Pizzería Napoli", total: 23_900, currency: "CLP", sharedByName: "Tú", isOwn: true, category: "restaurantes", storeIcon: "store-restaurant" },
  ],
};

const VIAJE: Group = {
  id: "g-viaje",
  name: "Viaje Sur 2026",
  role: "admin",
  icon: "🏔️",
  color: "#F59E0B",
  sharedTotal: 432_000,
  memberVisibilityEnabled: true,
  members: [
    { userId: "u-tomas", displayName: "Tomás Vera", role: "owner", color: "#EC4899", sharesDetail: true },
    { userId: "u-you", displayName: "Tú", role: "admin", color: "#F59E0B", isYou: true, sharesDetail: true },
    { userId: "u-fran", displayName: "Francisca Lillo", role: "member", color: "#7B6EF6", sharesDetail: true },
    { userId: "u-igna", displayName: "Ignacio Mella", role: "member", color: "#10B981", sharesDetail: false },
    { userId: "u-pau", displayName: "Paula Díaz", role: "member", color: "#3B82F6", sharesDetail: true },
  ],
  sharedTxns: [
    { id: "vt-1", date: "08 jun", merchant: "Copec Ruta 5", total: 52_000, currency: "CLP", sharedByName: "Tú", isOwn: true, category: "transporte-vehiculo", storeIcon: "store-gas-station" },
    { id: "vt-2", date: "07 jun", merchant: "Cabañas del Lago", total: 180_000, currency: "CLP", sharedByName: "Tomás", isOwn: false, category: "vivienda", storeIcon: "store-minimarket" },
    { id: "vt-3", date: "07 jun", merchant: "Restaurant El Ciervo", total: 46_500, currency: "CLP", sharedByName: "Francisca", isOwn: false, category: "restaurantes", storeIcon: "store-restaurant" },
  ],
};

export const SAMPLE_GROUPS: Group[] = [FAMILIA, ROOMMATES, VIAJE];
