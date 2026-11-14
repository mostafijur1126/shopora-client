import "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import {
  reviewRouter,
  activityLogRouter,
  stockNotifyRouter,
  storeSettingsRouter,
} from "./routes/miscRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// ---- Security & core middleware ----
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "http://localhost:3000")
      .split(",")
      .map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "30mb" }));
app.use(morgan("dev"));

// Rate limit: protects against brute-force / abuse on all API routes.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// ---- Health check ----
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Shopora API is running",
    time: new Date().toISOString(),
  });
});

// ---- Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reviews", reviewRouter);
app.use("/api/activity-logs", activityLogRouter);
app.use("/api/stock-notify", stockNotifyRouter);
app.use("/api/store-settings", storeSettingsRouter);
// app.use('/api/products', productRoutes);
// app.use('/api/categories', categoryRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/suppliers', supplierRoutes);
// app.use('/api/purchases', purchaseRoutes);
// app.use('/api/expenses', expenseRoutes);
// app.use('/api/reviews', reviewRoutes);
// app.use('/api/activity-logs', activityLogRoutes);
// app.use('/api/stock-notify', stockNotifyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Shopora API server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
