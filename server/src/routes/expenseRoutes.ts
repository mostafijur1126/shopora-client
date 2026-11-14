import { Router } from 'express';
import { getExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, requirePermission('expenses:read'), getExpenses);
router.post('/', protect, requirePermission('expenses:manage'), createExpense);
router.delete('/:id', protect, requirePermission('expenses:manage'), deleteExpense);

export default router;
