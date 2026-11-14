import { Schema, model, Document } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchased: number;
  totalPaid: number;
  dueAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, trim: true, maxlength: 150 },
    address: { type: String, trim: true, maxlength: 400 },
    notes: { type: String, trim: true, maxlength: 500 },
    totalPurchased: { type: Number, default: 0, min: 0 },
    totalPaid: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Supplier = model<ISupplier>('Supplier', supplierSchema);

export interface IPurchaseLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface IPurchase extends Document {
  invoiceId?: string;
  supplierId: string;
  supplierName: string;
  items: IPurchaseLineItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Due';
  paymentMethod?: string;
  note?: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseLineItemSchema = new Schema<IPurchaseLineItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new Schema<IPurchase>(
  {
    invoiceId: { type: String, trim: true, index: true },
    supplierId: { type: String, required: true, index: true },
    supplierName: { type: String, required: true },
    items: { type: [purchaseLineItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Due'], default: 'Due' },
    paymentMethod: { type: String, trim: true },
    note: { type: String, trim: true, maxlength: 500 },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

export const Purchase = model<IPurchase>('Purchase', purchaseSchema);
