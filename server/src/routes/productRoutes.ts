import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

// Public — anyone visiting the site can see products
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin only — must be logged in AND have the admin role
router.post('/', protect, requirePermission('products:manage'), createProduct);
router.patch('/:id', protect, requirePermission('products:manage'), updateProduct);
router.delete('/:id', protect, requirePermission('products:manage'), deleteProduct);

export default router;
