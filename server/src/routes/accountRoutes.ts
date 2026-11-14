import { Router } from 'express';
import { getAccountSummary } from '../controllers/accountController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/summary', protect, requirePermission('account:read'), getAccountSummary);

export default router;
