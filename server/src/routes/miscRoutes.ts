import { Router } from 'express';
import {
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  getActivityLogs,
  createStockNotifyRequest,
  getStockNotifyRequests,
  getStoreContactSettings,
  updateStoreContactSettings,
} from '../controllers/miscController.js';
import {
  protect,
  requirePermission,
  requireSuperAdmin,
} from '../middleware/auth.js';

const reviewRouter = Router();
reviewRouter.get('/', getReviews); // public
reviewRouter.post('/', protect, requirePermission('reviews:manage'), createReview);
reviewRouter.patch('/:id', protect, requirePermission('reviews:manage'), updateReview);
reviewRouter.delete('/:id', protect, requirePermission('reviews:manage'), deleteReview);

const activityLogRouter = Router();
activityLogRouter.get('/', protect, requirePermission('activity:read'), getActivityLogs);

const stockNotifyRouter = Router();
stockNotifyRouter.post('/', createStockNotifyRequest); // public
stockNotifyRouter.get('/', protect, requirePermission('stock-notify:read'), getStockNotifyRequests);

const storeSettingsRouter = Router();
storeSettingsRouter.get('/', getStoreContactSettings);
storeSettingsRouter.put('/', protect, requireSuperAdmin, updateStoreContactSettings);

export {
  reviewRouter,
  activityLogRouter,
  stockNotifyRouter,
  storeSettingsRouter,
};
