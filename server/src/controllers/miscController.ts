import { Response } from 'express';
import { z } from 'zod';
import {
  Review,
  ActivityLog,
  StockNotifyRequest,
  StoreContactSettings,
} from '../models/Misc.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { recordActivity } from '../utils/activityLog.js';

/* ---------------- Reviews ---------------- */

// Public — reviews are shown to every visitor on the homepage
export const getReviews = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const reviews = await Review.find().sort({ createdAt: -1 });
  res.json({ success: true, count: reviews.length, reviews });
});

const reviewSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerLocation: z.string().max(100).optional(),
  productName: z.string().max(150).optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  image: z.string().min(1),
  imageAlt: z.string().optional(),
});

// Admin only — reviews are added by the shop owner from screenshots
export const createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(`Invalid review data: ${parsed.error.issues[0]?.message || 'validation failed'}`, 400);
  }
  const review = await Review.create({ ...parsed.data, date: new Date().toISOString().split('T')[0] });
  await recordActivity(req, {
    actionType: 'create',
    module: 'reviews',
    description: 'Added a customer review.',
    targetId: String(review._id),
    targetName: review.productName || 'Customer review',
    newValues: { rating: review.rating, verified: review.verified },
  });
  res.status(201).json({ success: true, review });
});

export const updateReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = reviewSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(`Invalid review data: ${parsed.error.issues[0]?.message || 'validation failed'}`, 400);
  }
  const previous = await Review.findById(req.params.id);
  if (!previous) throw new AppError('Review not found', 404);
  const review = await Review.findByIdAndUpdate(req.params.id, parsed.data, {
    new: true,
    runValidators: true,
  });
  if (!review) throw new AppError('Review not found', 404);
  await recordActivity(req, {
    actionType: 'update',
    module: 'reviews',
    description: 'Updated a customer review.',
    targetId: String(review._id),
    targetName: review.productName || 'Customer review',
    previousValues: { rating: previous.rating, verified: previous.verified },
    newValues: { rating: review.rating, verified: review.verified },
  });
  res.json({ success: true, review });
});

export const deleteReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  await recordActivity(req, {
    actionType: 'delete',
    module: 'reviews',
    description: 'Deleted a customer review.',
    targetId: String(review._id),
    targetName: review.productName || 'Customer review',
    previousValues: { rating: review.rating, verified: review.verified },
  });
  res.json({ success: true, message: 'Review deleted' });
});

/* ---------------- Activity Log ---------------- */

const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  staff: z.string().max(100).optional(),
  role: z.string().max(40).optional(),
  module: z.enum(['products', 'orders', 'customers', 'categories', 'reviews', 'staff', 'suppliers', 'purchases', 'expenses', 'account']).optional(),
  actionType: z.enum(['create', 'update', 'delete', 'status_change', 'payment']).optional(),
  search: z.string().trim().max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const isRealDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getActivityLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = activityQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new AppError('Invalid activity log filters', 400);
  const { page, limit, staff, role, module, actionType, search, startDate, endDate } = parsed.data;
  if ((startDate && !isRealDate(startDate)) || (endDate && !isRealDate(endDate))) {
    throw new AppError('Invalid activity date range', 400);
  }
  if (startDate && endDate && startDate > endDate) {
    throw new AppError('Start date must be on or before end date', 400);
  }

  const filter: Record<string, unknown> = {};
  if (staff) filter.$or = [{ staffId: staff }, { staffName: staff }];
  if (role) filter.staffRole = role;
  if (module) filter.module = module;
  if (actionType) filter.actionType = actionType;
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) {
      const exclusiveEnd = new Date(`${endDate}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      createdAt.$lt = exclusiveEnd;
    }
    filter.createdAt = createdAt;
  }
  if (search) {
    const searchFilter = {
      $or: ['staffName', 'description', 'action', 'targetName', 'module'].map((field) => ({
        [field]: { $regex: escapeRegex(search), $options: 'i' },
      })),
    };
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or as unknown[] }, searchFilter];
      delete filter.$or;
    } else {
      filter.$or = searchFilter.$or;
    }
  }

  const skip = (page - 1) * limit;
  const [logs, total, staffOptions] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    ActivityLog.countDocuments(filter),
    ActivityLog.aggregate([
      { $match: { staffId: { $type: 'string' }, staffName: { $type: 'string' } } },
      { $sort: { staffId: 1, createdAt: -1 } },
      {
        $group: {
          _id: '$staffId',
          staffId: { $first: '$staffId' },
          name: { $first: '$staffName' },
          role: { $first: '$staffRole' },
        },
      },
      { $sort: { name: 1 } },
      { $limit: 500 },
      { $project: { _id: 0, staffId: 1, name: 1, role: 1 } },
    ]),
  ]);
  res.json({
    success: true,
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    filters: {
      staff: staffOptions,
      roles: ['Super Admin', 'Manager', 'Support', 'Seller', 'Staff'],
      modules: ['products', 'orders', 'customers', 'categories', 'reviews', 'staff', 'suppliers', 'purchases', 'expenses', 'account'],
      actionTypes: ['create', 'update', 'delete', 'status_change', 'payment'],
    },
  });
});

/* ---------------- Stock Notify Requests ---------------- */

const notifySchema = z.object({
  productId: z.string(),
  productName: z.string(),
  contact: z.string().min(1).max(150),
});

// Public — any customer can ask to be notified when an out-of-stock product is back
export const createStockNotifyRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = notifySchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('Invalid request', 400);
  const request = await StockNotifyRequest.create(parsed.data);
  res.status(201).json({ success: true, request });
});

// Admin only — view who asked to be notified
export const getStockNotifyRequests = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const requests = await StockNotifyRequest.find().sort({ createdAt: -1 });
  res.json({ success: true, count: requests.length, requests });
});

/* ---------------- Store Contact Settings ---------------- */

const STORE_CONTACT_SETTINGS_KEY = 'store-contact';
const EMPTY_STORE_CONTACT_SETTINGS = {
  hotlineNumber: '',
  whatsappNumber: '',
  storeAddress: '',
};

const contactPhoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .regex(/^\+?[0-9().\-\s]+$/)
  .refine((value) => value.replace(/\D/g, '').length >= 7);

const storeContactSettingsSchema = z.object({
  hotlineNumber: contactPhoneSchema,
  whatsappNumber: contactPhoneSchema,
  storeAddress: z.string().trim().min(1).max(500),
});

export const getStoreContactSettings = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    res.set('Cache-Control', 'no-store');
    const storedSettings = await StoreContactSettings.findOne({
      key: STORE_CONTACT_SETTINGS_KEY,
    })
      .select('hotlineNumber whatsappNumber storeAddress')
      .lean();

    res.json({
      success: true,
      settings: storedSettings
        ? {
            hotlineNumber: storedSettings.hotlineNumber,
            whatsappNumber: storedSettings.whatsappNumber,
            storeAddress: storedSettings.storeAddress,
          }
        : EMPTY_STORE_CONTACT_SETTINGS,
    });
  },
);

export const updateStoreContactSettings = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const parsed = storeContactSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        `Invalid store contact information: ${parsed.error.issues[0]?.message || 'validation failed'}`,
        400,
      );
    }

    const settings = await StoreContactSettings.findOneAndUpdate(
      { key: STORE_CONTACT_SETTINGS_KEY },
      {
        $set: parsed.data,
        $setOnInsert: { key: STORE_CONTACT_SETTINGS_KEY },
      },
      { new: true, upsert: true, runValidators: true },
    );

    res.json({
      success: true,
      settings: {
        hotlineNumber: settings.hotlineNumber,
        whatsappNumber: settings.whatsappNumber,
        storeAddress: settings.storeAddress,
      },
    });
  },
);
