import { Router } from 'express';
import {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
} from '../controllers/staffController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(protect, requirePermission('staff:manage'));
router.get('/', listStaff);
router.post('/', createStaff);
router.patch('/:id', updateStaff);
router.delete('/:id', deleteStaff);

export default router;
