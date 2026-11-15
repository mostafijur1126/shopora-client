import { Router } from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
} from "../controllers/orderController.js";
import {
  optionalProtect,
  protect,
  requirePermission,
} from "../middleware/auth.js";

const router = Router();

// Public — customers place orders without logging in (guest checkout)
router.post("/", optionalProtect, createOrder);

// Admin only — viewing and managing all orders
router.get("/", protect, requirePermission("orders:manage"), getOrders);
router.get("/:id", protect, requirePermission("orders:manage"), getOrderById);
router.patch(
  "/:id/status",
  protect,
  requirePermission("orders:manage"),
  updateOrderStatus,
);
router.patch("/:id", protect, requirePermission("orders:manage"), updateOrder);
router.delete("/:id", protect, requirePermission("orders:manage"), deleteOrder);

export default router;
