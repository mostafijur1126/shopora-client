import { Response } from 'express';
import { z } from 'zod';
import { Purchase, Supplier } from '../models/Purchase.js';
import { Product } from '../models/Product.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { recordActivity } from '../utils/activityLog.js';

export const getPurchases = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const purchases = await Purchase.find().sort({ createdAt: -1 });
  res.json({ success: true, count: purchases.length, purchases });
});

const lineItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().min(1),
  unitCost: z.number().min(0),
});

const purchaseSchema = z.object({
  supplierId: z.string(),
  items: z.array(lineItemSchema).min(1),
  paidAmount: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  note: z.string().max(500).optional(),
});

// POST /api/purchases — record a new purchase.
// This does three things at once: saves the purchase, increases product stock,
// and updates the supplier's running totals — same as the old Firestore version.
export const createPurchase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(`Invalid purchase data: ${parsed.error.issues[0]?.message || 'validation failed'}`, 400);
  }
  const data = parsed.data;

  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier) throw new AppError('Supplier not found', 404);

  const items = data.items.map((it) => ({ ...it, subtotal: it.quantity * it.unitCost }));
  const totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0);
  const paidAmount = data.paidAmount ?? totalAmount;
  const dueAmount = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = dueAmount <= 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Due';

  const purchase = await Purchase.create({
    supplierId: data.supplierId,
    supplierName: supplier.name,
    items,
    totalAmount,
    paidAmount,
    dueAmount,
    paymentStatus,
    paymentMethod: data.paymentMethod,
    note: data.note,
    invoiceId: `PUR-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
  });

  // Increase stock for every purchased product
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stockQty: item.quantity },
      $set: { inStock: true },
    });
  }

  // Update the supplier's running totals
  supplier.totalPurchased += totalAmount;
  supplier.totalPaid += paidAmount;
  supplier.dueAmount += dueAmount;
  await supplier.save();

  await recordActivity(req, {
    actionType: 'create',
    module: 'purchases',
    description: `Recorded purchase ${purchase.invoiceId || ''} from "${supplier.name}".`.trim(),
    targetId: String(purchase._id),
    targetName: purchase.invoiceId || supplier.name,
    newValues: {
      supplier: supplier.name,
      totalAmount: purchase.totalAmount,
      paidAmount: purchase.paidAmount,
      dueAmount: purchase.dueAmount,
    },
  });
  res.status(201).json({ success: true, purchase });
});

const paymentSchema = z.object({
  amount: z.number().positive(),
});

// PATCH /api/purchases/:id/pay — record a payment against an existing purchase's due amount
export const recordPurchasePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('Invalid payment amount', 400);

  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) throw new AppError('Purchase not found', 404);

  const previousValues = {
    paidAmount: purchase.paidAmount,
    dueAmount: purchase.dueAmount,
    paymentStatus: purchase.paymentStatus,
  };
  const amount = Math.min(parsed.data.amount, purchase.dueAmount);
  if (amount <= 0) throw new AppError('This purchase has no due amount left', 400);

  purchase.paidAmount += amount;
  purchase.dueAmount -= amount;
  purchase.paymentStatus = purchase.dueAmount <= 0 ? 'Paid' : 'Partial';
  await purchase.save();

  const supplier = await Supplier.findById(purchase.supplierId);
  if (supplier) {
    supplier.totalPaid += amount;
    supplier.dueAmount = Math.max(0, supplier.dueAmount - amount);
    await supplier.save();
  }

  await recordActivity(req, {
    actionType: 'payment',
    module: 'purchases',
    description: `Recorded a payment of ${amount} for purchase ${purchase.invoiceId || String(purchase._id)}.`,
    targetId: String(purchase._id),
    targetName: purchase.invoiceId || purchase.supplierName,
    previousValues,
    newValues: {
      paidAmount: purchase.paidAmount,
      dueAmount: purchase.dueAmount,
      paymentStatus: purchase.paymentStatus,
    },
  });
  res.json({ success: true, purchase });
});

export const deletePurchase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const purchase = await Purchase.findByIdAndDelete(req.params.id);
  if (!purchase) throw new AppError('Purchase not found', 404);
  await recordActivity(req, {
    actionType: 'delete',
    module: 'purchases',
    description: `Deleted purchase ${purchase.invoiceId || ''} from "${purchase.supplierName}".`.trim(),
    targetId: String(purchase._id),
    targetName: purchase.invoiceId || purchase.supplierName,
    previousValues: {
      supplier: purchase.supplierName,
      totalAmount: purchase.totalAmount,
      paymentStatus: purchase.paymentStatus,
    },
  });
  res.json({ success: true, message: 'Purchase deleted' });
});
