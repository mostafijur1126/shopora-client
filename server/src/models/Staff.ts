import { Document, Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

export const STAFF_ROLES = [
  "Super Admin",
  "Manager",
  "Support",
  "Seller",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export const LEGACY_SUPPORT_ROLE = "Customer Support" as const;
type PersistedStaffRole = StaffRole | typeof LEGACY_SUPPORT_ROLE;
export type StaffStatus = "active" | "inactive";

export const normalizeStaffRole = (role: PersistedStaffRole): StaffRole =>
  role === LEGACY_SUPPORT_ROLE ? "Support" : role;

export interface IStaff extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  status: StaffStatus;
  role: PersistedStaffRole;
  joiningDate: Date;
  designation: string;
  address: string;
  employeeId: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const staffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive"],
      default: "active",
    },
    role: {
      type: String,
      required: true,
      enum: [...STAFF_ROLES, LEGACY_SUPPORT_ROLE],
    },
    joiningDate: { type: Date, required: true },
    designation: { type: String, required: true, trim: true, maxlength: 100 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    employeeId: { type: String, required: true, unique: true, immutable: true },
  },
  { timestamps: true },
);

staffSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const Staff = model<IStaff>("Staff", staffSchema);
