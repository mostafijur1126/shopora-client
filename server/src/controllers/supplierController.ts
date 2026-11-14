import { Response } from 'express';
import { z } from 'zod';
import { Supplier } from '../models/Purchase.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { recordActivity } from '../utils/activityLog.js';

// All supplier routes are admin-only — suppliers are internal business data.

export const getSuppliers = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const suppliers = await Supplier.find().sort({ createdAt: -1 });
  res.json({ success: true, count: suppliers.length, suppliers });
});

const supplierSchema = z.object({
  name: z.string().min(1).max(150),
  phone: z.string().min(1).max(30),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(400).optional(),
  notes: z.string().max(500).optional(),
});

export const createSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(`Invalid supplier data: ${parsed.error.issues[0]?.message || 'validation failed'}`, 400);
  }
  const supplier = await Supplier.create(parsed.data);
  await recordActivity(req, {
    actionType: 'create',
    module: 'suppliers',
    description: `Added supplier "${supplier.name}".`,
    targetId: String(supplier._id),
    targetName: supplier.name,
    newValues: { title: supplier.name },
  });
  res.status(201).json({ success: true, supplier });
});

export const updateSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(`Invalid supplier data: ${parsed.error.issues[0]?.message || 'validation failed'}`, 400);
  }
  const previous = await Supplier.findById(req.params.id);
  if (!previous) throw new AppError('Supplier not found', 404);
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, parsed.data, { new: true, runValidators: true });
  if (!supplier) throw new AppError('Supplier not found', 404);
  await recordActivity(req, {
    actionType: 'update',
    module: 'suppliers',
    description: `Updated supplier "${supplier.name}".`,
    targetId: String(supplier._id),
    targetName: supplier.name,
    previousValues: { title: previous.name },
    newValues: { title: supplier.name },
  });
  res.json({ success: true, supplier });
});

export const deleteSupplier = asyncHandler(async (req: AuthRequest, res: Response) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) throw new AppError('Supplier not found', 404);
  await recordActivity(req, {
    actionType: 'delete',
    module: 'suppliers',
    description: `Deleted supplier "${supplier.name}".`,
    targetId: String(supplier._id),
    targetName: supplier.name,
    previousValues: { title: supplier.name },
  });
  res.json({ success: true, message: 'Supplier deleted' });
});
