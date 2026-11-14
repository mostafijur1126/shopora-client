import { Response, Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getCustomerOrders,
  getCustomerSession,
  getCustomersForAdmin,
  loginCustomer,
  mergeCustomerGuestData,
  signupCustomer,
} from "../controllers/customerController.js";
import { protect, requirePermission } from "../middleware/auth.js";
import { AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";

const router = Router();
const customerOnly = (req: AuthRequest, _res: Response, next: (error?: unknown) => void) => {
  if (req.user?.role !== "customer") return next(new AppError("Customer access required", 403));
  next();
};
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/auth/signup", authLimiter, signupCustomer);
router.post("/auth/login", authLimiter, loginCustomer);
router.get("/auth/me", protect, customerOnly, getCustomerSession);
router.post("/merge", protect, customerOnly, mergeCustomerGuestData);
router.get("/me/orders", protect, customerOnly, getCustomerOrders);
router.get("/", protect, requirePermission("customers:read"), getCustomersForAdmin);

export default router;
