import type { AuthRequest } from "../middleware/auth.js";
import { ActivityLog } from "../models/Misc.js";
import type { IActivityLog } from "../models/Misc.js";
import type { StaffRole } from "../models/Staff.js";

export type ActivityActionType =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "payment";

export type ActivityModule =
  | "products"
  | "orders"
  | "customers"
  | "categories"
  | "reviews"
  | "staff"
  | "suppliers"
  | "purchases"
  | "expenses"
  | "account";

export interface ActivityActor {
  id: string;
  name: string;
  role: StaffRole | "Super Admin" | "Staff";
}

interface ActivityInput {
  actionType: ActivityActionType;
  module: ActivityModule;
  description: string;
  targetId?: string;
  targetName?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

const sensitiveField = /password|token|secret|email|phone|address|customer|contact|auth/i;

const safeValues = (
  values?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!values) return undefined;
  return Object.fromEntries(
    Object.entries(values).filter(([key, value]) => {
      if (sensitiveField.test(key)) return false;
      return (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      );
    }),
  );
};

const legacyTargetType: Record<ActivityModule, IActivityLog["targetType"]> = {
  products: "product",
  orders: "order",
  customers: "customer",
  categories: "category",
  reviews: "review",
  staff: "staff",
  suppliers: "supplier",
  purchases: "purchase",
  expenses: "expense",
  account: "account",
};

const actionLabel: Record<ActivityActionType, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  status_change: "Changed status",
  payment: "Recorded payment",
};

export const recordActivity = async (
  req: AuthRequest,
  input: ActivityInput,
): Promise<void> => {
  const actor = req.auditActor;
  if (!actor || !req.user || !["admin", "staff"].includes(req.user.role)) {
    throw new Error("Cannot record an activity without an authenticated staff actor");
  }

  await ActivityLog.create({
    staffId: actor.id,
    staffName: actor.name,
    staffRole: actor.role,
    actionType: input.actionType,
    module: input.module,
    description: input.description,
    targetId: input.targetId,
    targetName: input.targetName,
    previousValues: safeValues(input.previousValues),
    newValues: safeValues(input.newValues),
    action: `${actionLabel[input.actionType]} ${input.module}`,
    targetType: legacyTargetType[input.module],
    date: new Date().toISOString().slice(0, 10),
  });
};

export const setAuditActor = (
  req: AuthRequest,
  actor: ActivityActor,
): void => {
  req.auditActor = actor;
};
