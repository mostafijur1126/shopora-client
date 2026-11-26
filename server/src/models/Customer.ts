import { Document, Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

export interface ICustomerCartLine {
  productId: string;
  quantity: number;
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedVariantKey?: string;
  selectedVariantAttributes?: Record<string, string>;
}

export interface ICustomer extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  passwordHash?: string;
  guestId?: string;
  guestSecretHash?: string;
  isGuest: boolean;
  cart: ICustomerCartLine[];
  mergedGuestIds: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const cartLineSchema = new Schema<ICustomerCartLine>(
  {
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 10000 },
    selectedModel: { type: String, trim: true, maxlength: 100 },
    selectedSize: { type: String, trim: true, maxlength: 50 },
    selectedColor: { type: String, trim: true, maxlength: 60 },
    selectedVariantKey: { type: String, trim: true, maxlength: 500 },
    selectedVariantAttributes: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      required: function () {
        return this.isGuest;
      },
      trim: true,
      maxlength: 30,
    },
    address: { type: String, trim: true, maxlength: 500 },
    district: { type: String, trim: true, maxlength: 100 },
    passwordHash: { type: String, select: false },
    guestId: { type: String, select: false },
    guestSecretHash: { type: String, select: false },
    isGuest: { type: Boolean, default: true },
    cart: { type: [cartLineSchema], default: [] },
    mergedGuestIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

customerSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isGuest: false, email: { $type: "string" } } },
);
customerSchema.index(
  { guestId: 1 },
  {
    unique: true,
    partialFilterExpression: { isGuest: true, guestId: { $type: "string" } },
  },
);

customerSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return Boolean(this.passwordHash) && bcrypt.compare(candidate, this.passwordHash);
};

export const Customer = model<ICustomer>("Customer", customerSchema);
