import { Schema, model, Document } from 'mongoose';

export interface IExpense extends Document {
  title: string;
  category: string;
  amount: number;
  paymentMethod: string;
  note?: string;
  date: string;
  isRecurring: boolean;
  recurrenceFrequency?: 'monthly' | 'weekly' | 'yearly';
  nextDueDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, trim: true },
    note: { type: String, trim: true, maxlength: 500 },
    date: { type: String, required: true },
    isRecurring: { type: Boolean, default: false },
    recurrenceFrequency: { type: String, enum: ['monthly', 'weekly', 'yearly'] },
    nextDueDate: { type: String },
  },
  { timestamps: true }
);

export const Expense = model<IExpense>('Expense', expenseSchema);

export interface IReview extends Document {
  customerName: string;
  customerLocation?: string;
  productName?: string;
  rating: number;
  comment?: string;
  image: string;
  imageAlt?: string;
  date?: string;
  verified?: boolean;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    customerLocation: { type: String, trim: true, maxlength: 100 },
    productName: { type: String, trim: true, maxlength: 150 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    image: { type: String, required: true },
    imageAlt: { type: String, trim: true },
    date: { type: String },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Review = model<IReview>('Review', reviewSchema);

export interface IActivityLog extends Document {
  staffId?: string;
  staffName: string;
  staffRole?: string;
  action: string;
  actionType?: 'create' | 'update' | 'delete' | 'status_change' | 'payment';
  module?: string;
  description?: string;
  targetId?: string;
  targetType: 'product' | 'order' | 'purchase' | 'expense' | 'supplier' | 'category' | 'staff' | 'customer' | 'review' | 'account';
  targetName?: string;
  details?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  date: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    staffId: { type: String, trim: true, maxlength: 100 },
    staffName: { type: String, required: true, trim: true, maxlength: 100 },
    staffRole: { type: String, trim: true, maxlength: 40 },
    action: { type: String, required: true, trim: true, maxlength: 150 },
    actionType: {
      type: String,
      enum: ['create', 'update', 'delete', 'status_change', 'payment'],
    },
    module: { type: String, trim: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 1000 },
    targetId: { type: String, trim: true, maxlength: 100 },
    targetType: {
      type: String,
      required: true,
      enum: ['product', 'order', 'purchase', 'expense', 'supplier', 'category', 'staff', 'customer', 'review', 'account'],
    },
    targetName: { type: String, trim: true, maxlength: 150 },
    details: { type: String, trim: true, maxlength: 300 },
    previousValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    date: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ staffId:  1, createdAt: -1 });
activityLogSchema.index({ staffRole: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, actionType: 1, createdAt: -1 });

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema);

export interface IStockNotifyRequest extends Document {
  productId: string;
  productName: string;
  contact: string;
  notified: boolean;
  createdAt: Date;
}

const stockNotifySchema = new Schema<IStockNotifyRequest>(
  {
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    contact: { type: String, required: true, trim: true, maxlength: 150 },
    notified: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const StockNotifyRequest = model<IStockNotifyRequest>('StockNotifyRequest', stockNotifySchema);

export interface IStoreContactSettings extends Document {
  key: string;
  hotlineNumber: string;
  whatsappNumber: string;
  storeAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const storeContactSettingsSchema = new Schema<IStoreContactSettings>(
  {
    key: { type: String, required: true, unique: true, immutable: true },
    hotlineNumber: { type: String, required: true, trim: true, maxlength: 30 },
    whatsappNumber: { type: String, required: true, trim: true, maxlength: 30 },
    storeAddress: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const StoreContactSettings = model<IStoreContactSettings>(
  'StoreContactSettings',
  storeContactSettingsSchema,
);
