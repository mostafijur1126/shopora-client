import { Router } from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(protect, requirePermission('purchasing:manage'));

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.patch('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;
