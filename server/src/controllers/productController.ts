import { Response } from "express";
import { z } from "zod";
import { Product } from "../models/Product.js";
import { Review } from "../models/Misc.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { AuthRequest } from "../middleware/auth.js";
import { recordActivity } from "../utils/activityLog.js";
import { randomBytes } from "node:crypto";

const addReviewStats = async (products: Awaited<ReturnType<typeof Product.find>>[number][]) => {
  if (!products.length) return [];
  const summaries = await Review.aggregate<{
    _id: unknown;
    reviewCount: number;
    ratingAverage: number;
  }>([
    { $match: { productId: { $in: products.map((product) => product._id) } } },
    {
      $group: {
        _id: "$productId",
        reviewCount: { $sum: 1 },
        ratingAverage: { $avg: "$rating" },
      },
    },
  ]);
  const byProductId = new Map(
    summaries.map((summary) => [String(summary._id), summary]),
  );
  return products.map((product) => {
    const data = product.toJSON();
    const summary = byProductId.get(String(product._id));
    return {
      ...data,
      ratingAverage: summary?.ratingAverage ?? 0,
      reviewCount: summary?.reviewCount ?? 0,
    };
  });
};

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
    res.json({
      success: true,
      count: products.length,
      products: await addReviewStats(products),
    });
  },
);

// GET /api/products/:id — get a single product by its ID (public)
export const getProductById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError("Product not found", 404);
    const [productWithStats] = await addReviewStats([product]);
    res.json({ success: true, product: productWithStats });
  },
);

// ---------- Validation schemas (Zod) ----------

const colorVariantSchema = z.object({
  name: z.string().min(1).max(60),
  hex: z.string().max(20).optional(),
});

const variantAttributeSchema = z.object({
  name: z.string().trim().min(1).max(60),
  values: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
});

const productVariantSchema = z.object({
  key: z.string().min(1).max(500),
  attributes: z.record(z.string(), z.string().trim().min(1).max(100)),
  regularPrice: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  stockQty: z.number().int().min(0),
  sku: z.string().trim().max(60).optional(),
});

// Used when creating a product
const productSchema = z.object({
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  brand: z.string().trim().max(100).optional(),
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
  videos: z.array(z.string().url().max(2048)).max(20).optional(),
  variantAttributes: z.array(variantAttributeSchema).max(10).optional(),
  variants: z.array(productVariantSchema).max(200).optional(),

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
  brand: nullableOptional(z.string().trim().max(100)),
  deliveryTime: nullableOptional(z.string().max(100)),
  materialOrOrigin: nullableOptional(z.string().max(200)),
  model: nullableOptional(z.string().max(100)),
  discountBadge: nullableOptional(z.string().max(40)),
});

const getVariantKey = (attributes: Record<string, string>) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(attributes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  );

const validateVariantSet = (
  attributes: Array<{ name: string; values: string[] }>,
  variants: Array<z.infer<typeof productVariantSchema>>,
) => {
  if (!attributes.length && !variants.length) return;
  if (!attributes.length || !variants.length) {
    throw new AppError("Variant attributes and combinations must be saved together.", 400);
  }

  const names = new Set<string>();
  for (const attribute of attributes) {
    const name = attribute.name.toLowerCase();
    if (/[.$]/.test(attribute.name) || names.has(name)) {
      throw new AppError("Variant attribute names must be unique and cannot contain dots or dollar signs.", 400);
    }
    names.add(name);
    if (new Set(attribute.values.map((value) => value.toLowerCase())).size !== attribute.values.length) {
      throw new AppError(`Values for "${attribute.name}" must be unique.`, 400);
    }
  }

  const expectedCount = attributes.reduce(
    (total, attribute) => total * attribute.values.length,
    1,
  );
  if (expectedCount > 200 || variants.length !== expectedCount) {
    throw new AppError("The submitted variant combinations are incomplete or exceed the limit.", 400);
  }

  let combinations: Record<string, string>[] = [{}];
  for (const attribute of attributes) {
    combinations = combinations.flatMap((combination) =>
      attribute.values.map((value) => ({ ...combination, [attribute.name]: value })),
    );
  }
  const expectedKeys = new Set(combinations.map(getVariantKey));
  const actualKeys = new Set<string>();
  for (const variant of variants) {
    if (
      variant.key !== getVariantKey(variant.attributes) ||
      !expectedKeys.has(variant.key) ||
      actualKeys.has(variant.key)
    ) {
      throw new AppError("A product variant does not match its selected attributes.", 400);
    }
    if (
      variant.regularPrice <= 0 ||
      (variant.salePrice !== undefined &&
        (variant.salePrice <= 0 || variant.salePrice >= variant.regularPrice))
    ) {
      throw new AppError("Variant sale prices must be lower than their regular prices.", 400);
    }
    actualKeys.add(variant.key);
  }
}

const normalizeProductSkus = <T extends {
  sku?: string;
  variants?: Array<{ sku?: string }>;
}>(data: T): T => ({
  ...data,
  sku: data.sku?.trim().toUpperCase() || undefined,
  variants: data.variants?.map((variant) => ({
    ...variant,
    sku: variant.sku?.trim().toUpperCase() || undefined,
  })),
});

const assertUniqueSkus = async (skus: Array<string | undefined>, exceptId?: unknown) => {
  const values = skus.filter((sku): sku is string => Boolean(sku));
  const normalized = values.map((sku) => sku.toUpperCase());
  if (new Set(normalized).size !== normalized.length) {
    throw new AppError("Product and variant SKUs must be unique.", 409);
  }
  if (!values.length) return;

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter: Record<string, unknown> = {
    $or: values.flatMap((sku) => {
      const exact = new RegExp(`^${escapeRegex(sku)}$`, "i");
      return [{ sku: exact }, { "variants.sku": exact }];
    }),
  };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await Product.exists(filter)) {
    throw new AppError("A product or variant already uses one of these SKUs.", 409);
  }
};

const isDuplicateKeyError = (
  error: unknown,
): error is { code: number } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === 11000;

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

    const data = normalizeProductSkus(parsed.data);
    validateVariantSet(data.variantAttributes ?? [], data.variants ?? []);
    const sku = data.sku || (await generateUniqueSku());
    await assertUniqueSkus([
      sku,
      ...(data.variants ?? []).map((variant) => variant.sku),
    ]);
    const variants = data.variants ?? [];
    const variantSummary = variants.length
      ? {
          price: Math.min(
            ...variants.map((variant) => variant.salePrice ?? variant.regularPrice),
          ),
          regularPrice: Math.min(
            ...variants.map((variant) => variant.regularPrice),
          ),
          stockQty: variants.reduce((total, variant) => total + variant.stockQty, 0),
        }
      : undefined;
    let product;
    try {
      product = await Product.create({
        ...data,
        sku,
        ...(variantSummary
          ? {
              price: variantSummary.price,
              originalPrice:
                variantSummary.regularPrice > variantSummary.price
                  ? variantSummary.regularPrice
                  : undefined,
              promotionalPrice: undefined,
              stockQty: variantSummary.stockQty,
              inStock: data.inStock !== false && variantSummary.stockQty > 0,
            }
          : {}),
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError("A product or variant already uses this SKU.", 409);
      }
      throw error;
    }
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

    const previous = await Product.findById(req.params.id);
    if (!previous) throw new AppError("Product not found", 404);
    const data = normalizeProductSkus(parsed.data);
    const nextAttributes = data.variantAttributes ?? previous.variantAttributes ?? [];
    const nextVariants = data.variants ?? previous.variants ?? [];
    validateVariantSet(nextAttributes, nextVariants);
    if (nextVariants.length) {
      const price = Math.min(
        ...nextVariants.map((variant) => variant.salePrice ?? variant.regularPrice),
      );
      const regularPrice = Math.min(
        ...nextVariants.map((variant) => variant.regularPrice),
      );
      const stockQty = nextVariants.reduce(
        (total, variant) => total + variant.stockQty,
        0,
      );
      Object.assign(data, {
        price,
        originalPrice: regularPrice > price ? regularPrice : null,
        promotionalPrice: null,
        stockQty,
        inStock: (data.inStock ?? previous.inStock) && stockQty > 0,
      });
    }
    if (data.sku !== undefined || data.variants !== undefined) {
      await assertUniqueSkus(
        [
          data.sku ?? previous.sku,
          ...nextVariants.map((variant) => variant.sku),
        ],
        previous._id,
      );
    }

    // null means "clear this field" -> $unset, everything else -> $set
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null) $unset[key] = 1;
      else if (value !== undefined) $set[key] = value;
    }

    const update: Record<string, unknown> = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    let product;
    try {
      product = await Product.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError("A product or variant already uses this SKU.", 409);
      }
      throw error;
    }
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
    const [productWithStats] = await addReviewStats([product]);
    res.json({ success: true, product: productWithStats });
  },
);

const generateUniqueSku = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sku = `SHP-${randomBytes(5).toString("hex").toUpperCase()}`;
    if (
      !(await Product.exists({
        $or: [{ sku }, { "variants.sku": sku }],
      }))
    )
      return sku;
  }
  throw new AppError("Could not generate a unique SKU. Please try again.", 503);
};

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
