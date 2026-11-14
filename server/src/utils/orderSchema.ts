import { z } from "zod";
import { ORDER_STATUSES } from "./orderLogic.js";

// The website sends each ordered product's database id as `id`; older code expected `productId`.
// Accept both, and always hand the rest of the server a `productId`.
const orderedProductSchema = z.preprocess(
  (value) => {
    if (value && typeof value === "object") {
      const line = value as Record<string, unknown>;
      return { ...line, productId: line.productId ?? line.id };
    }
    return value;
  },
  z.object({
    productId: z.string().min(1),
    name: z.string().min(1).max(300),
    quantity: z.number().int().min(1).max(10000),
    price: z.number().min(0),
    sku: z.string().max(100).optional(),
    model: z.string().max(200).optional(),
    selectedModel: z.string().max(100).optional(),
    selectedSize: z.string().max(50).optional(),
    selectedColor: z.string().max(60).optional(),
    image: z.string().optional(),
  }),
);

export const orderSchema = z.object({
  customerName: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(1).max(30),
  address: z.string().trim().min(1).max(500),
  email: z.string().trim().email().max(200).optional(),
  district: z.string().trim().max(100).optional(),
  deliveryZone: z.string().max(50).optional(),
  deliveryCharge: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  paymentMethod: z.string().min(1),
  orderedProducts: z.array(orderedProductSchema).min(1).max(100),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  paidAmount: z.number().min(0).optional(),
  saleType: z.string().max(50).optional(),
  note: z.string().max(1000).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  courier: z.record(z.string(), z.unknown()).optional(),
});
