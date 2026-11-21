import { Schema, model, Document, Types } from "mongoose";

export interface IOrderedProduct {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
  model?: string;
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
  image?: string;
}

export interface IOrderPayment {
  _id?: Types.ObjectId;
  amount: number;
  method: "bkash" | "nagad" | "cash";
  transactionId?: string;
  screenshot?: string;
  status: "pending" | "verified" | "rejected";
  createdAt: Date;
  verifiedAt?: Date;
}

export interface IOrder extends Document {
  invoiceId?: string;
  customerName: string;
  phone: string;
  address: string;
  email?: string;
  customerId?: Types.ObjectId;
  guestId?: string;
  district?: string;
  deliveryZone?: string;
  deliveryCharge?: number;
  discount?: number;
  paymentMethod: string;
  orderedProducts: IOrderedProduct[];
  items?: string;
  subtotal: number;
  total: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentStatus?: "unpaid" | "partially_paid" | "paid";
  payments: IOrderPayment[];
  status: string;
  saleType?: string;
  courier?: Record<string, unknown> | null;
  date: string;
  timestamp?: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderedProductSchema = new Schema<IOrderedProduct>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    sku: { type: String },
    model: { type: String },
    selectedModel: { type: String, trim: true, maxlength: 100 },
    selectedSize: { type: String, trim: true, maxlength: 50 },
    selectedColor: { type: String, trim: true, maxlength: 60 },
    image: { type: String },
  },
  { _id: false },
);

const orderPaymentSchema = new Schema<IOrderPayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, required: true, enum: ["bkash", "nagad", "cash"] },
    transactionId: { type: String, trim: true, maxlength: 100 },
    screenshot: { type: String, maxlength: 7_000_000 },
    status: {
      type: String,
      required: true,
      enum: ["pending", "verified", "rejected"],
    },
    createdAt: { type: Date, required: true, default: Date.now },
    verifiedAt: { type: Date },
  },
  { _id: true },
);

const orderSchema = new Schema<IOrder>(
  {
    invoiceId: { type: String, trim: true, index: true },
    customerName: { type: String, required: true, trim: true, maxlength: 150 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    email: { type: String, trim: true, maxlength: 200 },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    guestId: { type: String, index: true, select: false },
    district: { type: String, trim: true, maxlength: 100 },
    deliveryZone: { type: String, trim: true, maxlength: 50 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, required: true, trim: true },
    orderedProducts: { type: [orderedProductSchema], required: true },
    items: { type: String },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid"],
      default: "unpaid",
    },
    payments: { type: [orderPaymentSchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "packing",
        "pickup",
        "courier",
        "delivered",
        "cancelled",
        "return_received",
        "on_hold",
        "draft",
        "exchange",
        "incompleted",
        "processing",
        "completed",
      ],
      default: "pending",
    },
    saleType: { type: String, trim: true },
    courier: { type: Schema.Types.Mixed },
    date: { type: String, required: true },
    timestamp: { type: Number },
    note: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

export const Order = model<IOrder>("Order", orderSchema);
