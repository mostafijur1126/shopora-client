import { Response } from 'express';
import { z } from 'zod';
import { Category } from '../models/Category.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { recordActivity } from '../utils/activityLog.js';

// GET /api/categories — list all categories (public)
export const getCategories = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const categories = await Category.find().sort({ order: 1 });
  res.json({ success: true, count: categories.length, categories });
});

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  titleEn: z.string().max(100).optional(),
  titleBn: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
  order: z.number().optional(),
});

// POST /api/categories — create a new category (admin only)
export const createCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(`Invalid category data: ${parsed.error.issues[0]?.message || 'validation failed'}`, 400);
  }

  const existing = await Category.findOne({ slug: parsed.data.slug });
  if (existing) throw new AppError('A category with this slug already exists', 409);

  const category = await Category.create(parsed.data);
  await recordActivity(req, {
    actionType: 'create',
    module: 'categories',
    description: `Created category "${category.name}".`,
    targetId: String(category._id),
    targetName: category.name,
    newValues: { title: category.name, slug: category.slug },
  });
  res.status(201).json({ success: true, category });
});

// PATCH /api/categories/:id — update a category (admin only)
export const updateCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(`Invalid category data: ${parsed.error.issues[0]?.message || 'validation failed'}`, 400);
  }

  const previous = await Category.findById(req.params.id);
  if (!previous) throw new AppError('Category not found', 404);
  const category = await Category.findByIdAndUpdate(req.params.id, parsed.data, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new AppError('Category not found', 404);
  await recordActivity(req, {
    actionType: 'update',
    module: 'categories',
    description: `Updated category "${category.name}".`,
    targetId: String(category._id),
    targetName: category.name,
    previousValues: { title: previous.name, slug: previous.slug },
    newValues: { title: category.name, slug: category.slug },
  });
  res.json({ success: true, category });
});

// DELETE /api/categories/:id — remove a category (admin only)
export const deleteCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new AppError('Category not found', 404);
  await recordActivity(req, {
    actionType: 'delete',
    module: 'categories',
    description: `Deleted category "${category.name}".`,
    targetId: String(category._id),
    targetName: category.name,
    previousValues: { title: category.name, slug: category.slug },
  });
  res.json({ success: true, message: 'Category deleted' });
});
