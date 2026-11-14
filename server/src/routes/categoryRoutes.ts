import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/', getCategories);
router.post('/', protect, requirePermission('categories:manage'), createCategory);
router.patch('/:id', protect, requirePermission('categories:manage'), updateCategory);
router.delete('/:id', protect, requirePermission('categories:manage'), deleteCategory);

export default router;
