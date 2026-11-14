import { Router } from 'express';
import { getPurchases, createPurchase, recordPurchasePayment, deletePurchase } from '../controllers/purchaseController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(protect, requirePermission('purchasing:manage'));

router.get('/', getPurchases);
router.post('/', createPurchase);
router.patch('/:id/pay', recordPurchasePayment);
router.delete('/:id', deletePurchase);

export default router;
