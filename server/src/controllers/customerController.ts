import { Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Customer, ICustomerCartLine } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Staff } from "../models/Staff.js";
import { User } from "../models/User.js";
import { signToken } from "../config/jwt.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { AuthRequest } from "../middleware/auth.js";
import { matchesGuestSecret } from "../utils/guestIdentity.js";

const bdPhone = /^(?:\+?88)?01[3-9]\d{8}$/;
const accountSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(200).transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(200).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});
const guestIdentitySchema = z.object({
  guestId: z.string().uuid(),
  secret: z.string().regex(/^[a-f0-9]{64}$/i),
});
const profileSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().email().max(200).optional(),
  phone: z.string().trim().regex(bdPhone).optional(),
  address: z.string().trim().min(8).max(500).optional(),
  district: z.string().trim().max(100).optional(),
});
const cartSchema = z.array(
  z.object({
    productId: z.string().regex(/^[a-f\d]{24}$/i),
    quantity: z.number().int().min(1).max(10000),
    selectedModel: z.string().trim().max(100).optional(),
    selectedSize: z.string().trim().max(50).optional(),
    selectedColor: z.string().trim().max(60).optional(),
    selectedVariantKey: z.string().max(500).optional(),
    selectedVariantAttributes: z
      .record(z.string(), z.string().max(100))
      .optional(),
  }),
).max(100);

const sessionResponse = (customer: InstanceType<typeof Customer>) => ({
  success: true,
  token: signToken({ userId: String(customer._id), role: "customer" }),
  customer: {
    id: String(customer._id),
    name: customer.name,
    email: customer.email,
    phone: customer.phone || "",
    address: customer.address,
    district: customer.district,
    createdAt: customer.createdAt,
  },
});

export const signupCustomer = asyncHandler(async (req, res: Response) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid customer signup details", 400);
  const [existingCustomer, existingStaff, existingUser] = await Promise.all([
    Customer.exists({ email: parsed.data.email, isGuest: false }),
    Staff.exists({ email: parsed.data.email }),
    User.exists({ email: parsed.data.email }),
  ]);
  if (existingCustomer || existingStaff || existingUser) {
    throw new AppError("An account with this email already exists", 409);
  }
  const customer = await Customer.create({
    name: parsed.data.name,
    email: parsed.data.email,
    isGuest: false,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
  });
  res.status(201).json(sessionResponse(customer));
});

export const loginCustomer = asyncHandler(async (req, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError("Invalid email or password", 400);
  const customer = await Customer.findOne({
    email: parsed.data.email,
    isGuest: false,
  }).select("+passwordHash");
  if (!customer || !(await customer.comparePassword(parsed.data.password))) {
    throw new AppError("Invalid email or password", 401);
  }
  res.json(sessionResponse(customer));
});

export const getCustomerSession = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const customer = await Customer.findById(req.user!.userId);
    if (!customer || customer.isGuest) throw new AppError("Customer not found", 404);
    res.json({
      success: true,
      customer: {
        id: String(customer._id),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        district: customer.district,
        createdAt: customer.createdAt,
      },
    });
  },
);

export const mergeCustomerGuestData = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const profileParsed = profileSchema.safeParse(req.body.profile ?? {});
    const identityParsed = guestIdentitySchema.safeParse(req.body.guestIdentity);
    const cartParsed = cartSchema.safeParse(req.body.cart ?? []);
    if (!profileParsed.success || !identityParsed.success || !cartParsed.success) {
      throw new AppError("Invalid guest data", 400);
    }

    const customer = await Customer.findById(req.user!.userId);
    if (!customer || customer.isGuest) throw new AppError("Customer not found", 404);

    const profileEmail = profileParsed.data.email?.toLowerCase();
    if (profileEmail && profileEmail !== customer.email) {
      const [existingCustomer, existingStaff, existingUser] = await Promise.all([
        Customer.exists({
          email: profileEmail,
          isGuest: false,
          _id: { $ne: customer._id },
        }),
        Staff.exists({ email: profileEmail }),
        User.exists({ email: profileEmail }),
      ]);
      if (existingCustomer || existingStaff || existingUser) {
        throw new AppError("An account with this email already exists", 409);
      }
    }

    const guest = await Customer.findOne({
      guestId: identityParsed.data.guestId,
      isGuest: true,
    }).select("+guestSecretHash +guestId");
    if (guest) {
      if (
        !guest.guestSecretHash ||
        !matchesGuestSecret(identityParsed.data.secret, guest.guestSecretHash)
      ) {
        throw new AppError("Guest session could not be verified", 403);
      }
    } else if (await Order.exists({ guestId: identityParsed.data.guestId })) {
      throw new AppError("Guest session could not be verified", 403);
    }

    const products = await Product.find({
      _id: {
        $in: [
          ...cartParsed.data.map((line) => line.productId),
          ...customer.cart.map((line) => line.productId),
        ],
      },
    }).select("_id model models sizes colors colorVariants variantAttributes variants");
    const productsById = new Map(
      products.map((product) => [String(product._id), product]),
    );
    const verifiedProductIds = new Set(productsById.keys());
    if (verifiedProductIds.size !== new Set(cartParsed.data.map((line) => line.productId)).size) {
      throw new AppError("Cart contains an unavailable product", 400);
    }
    for (const line of cartParsed.data) {
      const product = productsById.get(line.productId);
      if (!product) throw new AppError("Cart contains an unavailable product", 400);
      const models = [...(product.models ?? []), ...(product.model ? [product.model] : [])];
      const colors = [
        ...(product.colors ?? []).map((color) => color.name),
        ...(product.colorVariants ?? []).map((color) => color.name),
      ];
      const variant = product.variantAttributes?.length
        ? product.variants?.find(
            (item) => item.key === line.selectedVariantKey,
          )
        : undefined;
      if (
        (line.selectedModel && models.length && !models.includes(line.selectedModel)) ||
        (line.selectedSize && product.sizes?.length && !product.sizes.includes(line.selectedSize)) ||
        (line.selectedColor && colors.length && !colors.includes(line.selectedColor)) ||
        (product.variantAttributes?.length && !variant)
      ) {
        throw new AppError("Cart contains an invalid product variant", 400);
      }
    }

    const alreadyMerged = customer.mergedGuestIds.includes(identityParsed.data.guestId);
    const combined = new Map<string, ICustomerCartLine>();
    for (const line of [
      ...customer.cart,
      ...(alreadyMerged ? [] : [...(guest?.cart ?? []), ...cartParsed.data]),
    ]) {
      const product = productsById.get(line.productId);
      const selectedVariant =
        product?.variantAttributes?.length && line.selectedVariantKey
          ? product.variants?.find(
              (variant) => variant.key === line.selectedVariantKey,
            )
          : undefined;
      const defaultVariant =
        product?.variantAttributes?.length && !selectedVariant
          ? product.variants?.[0]
          : undefined;
      const variant = selectedVariant ?? defaultVariant;
      const selectedVariantKey = variant?.key ?? line.selectedVariantKey;
      const key = [
        line.productId,
        line.selectedModel ?? "",
        line.selectedSize ?? "",
        line.selectedColor ?? "",
        selectedVariantKey ?? "",
      ].join("::");
      const current = combined.get(key);
      combined.set(key, {
        ...line,
        selectedVariantKey,
        selectedVariantAttributes:
          variant?.attributes ?? line.selectedVariantAttributes,
        quantity: Math.min(10000, (current?.quantity ?? 0) + line.quantity),
      });
    }
    customer.cart = [...combined.values()];
    if (!alreadyMerged) customer.mergedGuestIds.push(identityParsed.data.guestId);

    for (const key of ["name", "email", "phone", "address", "district"] as const) {
      const value = profileParsed.data[key];
      if (!customer[key] && value) customer.set(key, value);
    }
    await customer.save();

    if (guest) {
      await Order.updateMany(
        { customerId: guest._id, guestId: identityParsed.data.guestId },
        { $set: { customerId: customer._id }, $unset: { guestId: 1 } },
      );
      await Customer.deleteOne({ _id: guest._id });
    }

    res.json({
      success: true,
      customer: sessionResponse(customer).customer,
      cart: customer.cart,
    });
  },
);

export const getCustomerOrders = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const orders = await Order.find({ customerId: req.user!.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, orders });
  },
);

export const getCustomersForAdmin = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const [customers, orders] = await Promise.all([
      Customer.find().select("-passwordHash -guestSecretHash -guestId -cart"),
      Order.find().sort({ createdAt: -1 }),
    ]);

    const grouped = new Map<string, {
      id: string;
      name: string;
      email?: string;
      phone: string;
      address?: string;
      isGuest: boolean;
      createdAt: Date;
      orders: typeof orders;
    }>();
    for (const customer of customers) {
      const id = String(customer._id);
      grouped.set(id, {
        id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        address: customer.address,
        isGuest: customer.isGuest,
        createdAt: customer.createdAt,
        orders: [],
      });
    }

    for (const order of orders) {
      const existingId = order.customerId ? String(order.customerId) : undefined;
      const fallbackKey = `legacy:${order.phone.replace(/\D/g, "")}`;
      const key = existingId && grouped.has(existingId) ? existingId : fallbackKey;
      let group = grouped.get(key);
      if (!group) {
        group = {
          id: key,
          name: order.customerName,
          email: order.email,
          phone: order.phone,
          address: order.address,
          isGuest: true,
          createdAt: order.createdAt,
          orders: [],
        };
        grouped.set(key, group);
      }
      group.orders.push(order);
      if (!group.email && order.email) group.email = order.email;
      if (!group.address && order.address) group.address = order.address;
    }

    const result = [...grouped.values()]
      .filter((customer) => !customer.isGuest || customer.orders.length > 0)
      .map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        isGuest: customer.isGuest,
        createdAt: customer.createdAt,
        totalOrders: customer.orders.length,
        totalSpent: customer.orders.reduce((sum, order) => sum + order.total, 0),
        lastOrderDate: customer.orders[0]?.createdAt,
        orders: customer.orders.map((order) => ({
          id: String(order._id),
          invoiceId: order.invoiceId,
          total: order.total,
          status: order.status,
          date: order.date,
          items: order.items,
          customerId: order.customerId ? String(order.customerId) : undefined,
          phone: order.phone,
        })),
      }));

    res.json({ success: true, customers: result });
  },
);
