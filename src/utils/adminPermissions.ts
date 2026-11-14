import type { StaffRole } from "../types";

export type AdminSection =
  | "dashboard"
  | "products"
  | "categories"
  | "orders"
  | "purchases"
  | "expenses"
  | "account"
  | "reports"
  | "activity"
  | "customers"
  | "staff"
  | "reviews"
  | "settings";

const ROLE_SECTIONS: Record<StaffRole, readonly AdminSection[]> = {
  "Super Admin": [
    "dashboard",
    "products",
    "categories",
    "orders",
    "purchases",
    "expenses",
    "account",
    "reports",
    "activity",
    "customers",
    "staff",
    "reviews",
    "settings",
  ],
  Manager: [
    "dashboard",
    "products",
    "categories",
    "orders",
    "purchases",
    "expenses",
    "reports",
    "activity",
    "customers",
    "reviews",
  ],
  Support: [
    "dashboard",
    "orders",
    "customers",
    "reviews",
    "products",
    "categories",
    "purchases",
    "reports",
  ],
  Seller: [
    "dashboard",
    "orders",
    "customers",
    "reviews",
    "products",
    "categories",
    "purchases",
  ],
};

export const canAccessAdminSection = (
  accountRole: "admin" | "staff" | null,
  staffRole: StaffRole | undefined,
  section: AdminSection,
): boolean => {
  if (section === "settings") {
    return (
      accountRole === "admin" ||
      (accountRole === "staff" && staffRole === "Super Admin")
    );
  }
  if (accountRole === "admin" || (accountRole === "staff" && !staffRole)) {
    return true;
  }
  return staffRole ? ROLE_SECTIONS[staffRole].includes(section) : false;
};
