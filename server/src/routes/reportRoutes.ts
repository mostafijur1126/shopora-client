import { Router } from "express";
import { getExpenseReport } from "../controllers/reportController.js";
import { protect, requirePermission } from "../middleware/auth.js";

const router = Router();

router.get(
  "/expenses",
  protect,
  requirePermission("reports:read"),
  getExpenseReport,
);

export default router;
