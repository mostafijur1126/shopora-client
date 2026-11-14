import { Response } from "express";
import { z } from "zod";
import { Product } from "../models/Product.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { AuthRequest } from "../middleware/auth.js";
import { recordActivity } from "../utils/activityLog.js";

// GET /api/products — list all products (public, anyone can view)
export const getProducts = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { category, search } = req.query;

    const filter: Record<string, unknown> = {};
    if (category && typeof category === "string") {
      filter.category = category;
    }
    if (search && typeof search === "string") {
      filter.$text = { $search: search };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, products });
  },
);

// GET /api/products/:id — get a single product by its ID (public)
export const getProductById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError("Product not found", 404);
    res.json({ success: true, product });
  },
);

// ---------- Validation schemas (Zod) ----------

const colorVariantSchema = z.object({
  name: z.string().min(1).max(60),
  hex: z.string().max(20).optional(),
});

// Used when creating a product
const productSchema = z.object({
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  sku: z.string().max(60).optional(),
  category: z.string().min(1),
  categoryBn: z.string().optional(),

  price: z.number().min(0),
  originalPrice: z.number().min(0).optional(),
  promotionalPrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  discountBadge: z.string().max(40).optional(),

  image: z.string().min(1),
  images: z.array(z.string()).optional(),

  inStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),

  description: z.string().max(2000).optional(),
  detailedDescription: z.string().max(5000).optional(),
  features: z.array(z.string()).optional(),
  specifications: z.record(z.string(), z.string()).optional(),
  deliveryTime: z.string().max(100).optional(),
  materialOrOrigin: z.string().max(200).optional(),

  model: z.string().max(100).optional(),
  models: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(colorVariantSchema).optional(),
  colorVariants: z.array(colorVariantSchema).optional(),
  hasColors: z.boolean().optional(),
  hasSizes: z.boolean().optional(),

  isPopular: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  pdpSectionVisibility: z
    .object({
      description: z.boolean(),
      specifications: z.boolean(),
      reviews: z.boolean(),
      relatedProducts: z.boolean(),
      recentlyViewed: z.boolean(),
    })
    .optional(),
});

// Used when updating: every field optional, and these can be null (= clear the field)
const nullableOptional = <T extends z.ZodTypeAny>(s: T) =>
  s.nullable().optional();

const updateProductSchema = productSchema.partial().extend({
  originalPrice: nullableOptional(z.number().min(0)),
  promotionalPrice: nullableOptional(z.number().min(0)),
  costPrice: nullableOptional(z.number().min(0)),
  nameEn: nullableOptional(z.string().max(200)),
  deliveryTime: nullableOptional(z.string().max(100)),
  materialOrOrigin: nullableOptional(z.string().max(200)),
  model: nullableOptional(z.string().max(100)),
  discountBadge: nullableOptional(z.string().max(40)),
});

// POST /api/products — create a new product (admin only, enforced by route middleware)
export const createProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        `Invalid product data: ${parsed.error.issues[0]?.message || "validation failed"}`,
        400,
      );
    }

    const product = await Product.create(parsed.data);
    await recordActivity(req, {
      actionType: "create",
      module: "products",
      description: `Created product "${product.name}".`,
      targetId: String(product._id),
      targetName: product.name,
      newValues: {
        title: product.name,
        category: product.category,
        price: product.price,
        stockQty: product.stockQty,
      },
    });
    res.status(201).json({ success: true, product });
  },
);

// PATCH /api/products/:id — update an existing product (admin only)
export const updateProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        `Invalid product data: ${parsed.error.issues[0]?.message || "validation failed"}`,
        400,
      );
    }

    // null means "clear this field" -> $unset, everything else -> $set
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === null) $unset[key] = 1;
      else if (value !== undefined) $set[key] = value;
    }

    const update: Record<string, unknown> = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    const previous = await Product.findById(req.params.id);
    if (!previous) throw new AppError("Product not found", 404);
    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!product) throw new AppError("Product not found", 404);
    await recordActivity(req, {
      actionType: "update",
      module: "products",
      description: `Updated product "${product.name}".`,
      targetId: String(product._id),
      targetName: product.name,
      previousValues: {
        title: previous.name,
        category: previous.category,
        price: previous.price,
        stockQty: previous.stockQty,
        inStock: previous.inStock,
      },
      newValues: {
        title: product.name,
        category: product.category,
        price: product.price,
        stockQty: product.stockQty,
        inStock: product.inStock,
      },
    });
    res.json({ success: true, product });
  },
);

// DELETE /api/products/:id — remove a product permanently (admin only)
export const deleteProduct = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new AppError("Product not found", 404);
    await recordActivity(req, {
      actionType: "delete",
      module: "products",
      description: `Deleted product "${product.name}".`,
      targetId: String(product._id),
      targetName: product.name,
      previousValues: {
        title: product.name,
        category: product.category,
        price: product.price,
        stockQty: product.stockQty,
      },
    });
    res.json({ success: true, message: "Product deleted" });
  },
);
