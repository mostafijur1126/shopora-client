import { z } from "zod";
import { ORDER_STATUSES } from "./orderLogic.js";

const dataUrlScreenshotSchema = z
  .string()
  .max(7_000_000)
  .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
  .refine((value) => {
    const encoded = value.slice(value.indexOf(",") + 1);
    return Math.floor((encoded.length * 3) / 4) <= 5_000_000;
  }, "Screenshot must be 5 MB or smaller");

const cloudinaryScreenshotSchema = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "res.cloudinary.com" &&
        /^\/[^/]+\/image\/upload\//.test(url.pathname)
      );
    } catch {
      return false;
    }
  }, "Screenshot must be a secure Cloudinary image URL");

const paymentScreenshotSchema = z.union([
  dataUrlScreenshotSchema,
  cloudinaryScreenshotSchema,
]);

const paymentProofSchema = z
  .object({
    amount: z.number().positive().max(10_000_000),
    transactionId: z.string().trim().max(100).optional(),
    screenshot: paymentScreenshotSchema.optional(),
  })
  .refine(
    (proof) => Boolean(proof.transactionId || proof.screenshot),
    "A transaction ID or payment screenshot is required",
  );

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
    brand: z.string().trim().max(100).optional(),
    sku: z.string().max(100).optional(),
    variantSku: z.string().trim().max(100).optional(),
    regularPrice: z.number().min(0).optional(),
    salePrice: z.number().min(0).optional(),
    model: z.string().max(200).optional(),
    selectedModel: z.string().max(100).optional(),
    selectedSize: z.string().max(50).optional(),
    selectedColor: z.string().max(60).optional(),
    selectedVariantKey: z.string().max(500).optional(),
    selectedVariantAttributes: z
      .record(z.string(), z.string().max(100))
      .optional(),
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
  paymentProof: paymentProofSchema.optional(),
  orderedProducts: z.array(orderedProductSchema).min(1).max(100),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  paidAmount: z.number().min(0).optional(),
  saleType: z.string().max(50).optional(),
  note: z.string().max(1000).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  courier: z.record(z.string(), z.unknown()).nullable().optional(),
});
