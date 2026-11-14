import { StaffRole } from "../models/Staff.js";

export type AdminPermission =
  | "staff:manage"
  | "account:read"
  | "reports:read"
  | "expenses:read"
  | "expenses:manage"
  | "activity:read"
  | "activity:write"
  | "stock-notify:read"
  | "orders:manage"
  | "customers:read"
  | "products:manage"
  | "categories:manage"
  | "purchasing:manage"
  | "reviews:manage";

const ALL_PERMISSIONS: readonly AdminPermission[] = [
  "staff:manage",
  "account:read",
  "reports:read",
  "expenses:read",
  "expenses:manage",
  "activity:read",
  "activity:write",
  "stock-notify:read",
  "orders:manage",
  "customers:read",
  "products:manage",
  "categories:manage",
  "purchasing:manage",
  "reviews:manage",
];

const ROLE_PERMISSIONS: Record<StaffRole, readonly AdminPermission[]> = {
  "Super Admin": ALL_PERMISSIONS,
  Manager: ALL_PERMISSIONS.filter(
    (permission) => permission !== "staff:manage" && permission !== "account:read",
  ),
  Support: [
    "orders:manage",
    "customers:read",
    "products:manage",
    "categories:manage",
    "purchasing:manage",
    "reviews:manage",
    "reports:read",
    "activity:write",
  ],
  Seller: [
    "orders:manage",
    "customers:read",
    "products:manage",
    "categories:manage",
    "purchasing:manage",
    "reviews:manage",
    "activity:write",
  ],
};

export const roleHasPermission = (
  role: StaffRole,
  permission: AdminPermission,
): boolean => ROLE_PERMISSIONS[role].includes(permission);
