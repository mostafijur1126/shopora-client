import { Response } from "express";
import { string, z } from "zod";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Customer } from "../models/Customer.js";
import { Staff, normalizeStaffRole } from "../models/Staff.js";
import { User } from "../models/User.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { AuthRequest } from "../middleware/auth.js";
import { recordActivity, setAuditActor } from "../utils/activityLog.js";
import { verifyToken } from "../config/jwt.js";
import { orderSchema } from "../utils/orderSchema.js";
import { hashGuestSecret, matchesGuestSecret } from "../utils/guestIdentity.js";
import {
  ORDER_STATUSES,
  OrderLine,
  buildItemsSummary,
  computeTotals,
  isObjectId,
  round2,
} from "../utils/orderLogic.js";

// GET /api/orders — list orders (admin only — customers don't need to see everyone's orders)
export const getOrders = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status && typeof status === "string") filter.status = status;

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, orders });
  },
);

// GET /api/orders/:id — get one order (admin only)
export const getOrderById = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw new AppError("Order not found", 404);
    res.json({ success: true, order });
  },
);

// Guest and customer checkouts are public; signed-in customers are associated by their verified
// token. Admin/staff tokens retain the existing POS-only pricing and order-management abilities.
const getCallerFromRequest = async (req: AuthRequest) => {
  const header = req.headers.authorization;
  if (!header) return undefined;
  if (!header.startsWith("Bearer ")) {
    throw new AppError("Not authorized — invalid or expired token", 401);
  }

  let caller;
  try {
    caller = verifyToken(header.split(" ")[1]);
  } catch {
    throw new AppError("Not authorized — invalid or expired token", 401);
  }

  if (caller.role === "staff") {
    if (caller.staffRole) {
      const staff = await Staff.findById(caller.userId).select("status role name");
      if (!staff || staff.status !== "active") {
        throw new AppError("Staff account is inactive or no longer exists", 401);
      }
      caller.staffRole = normalizeStaffRole(staff.role);
      setAuditActor(req, {
        id: String(staff._id),
        name: staff.name,
        role: caller.staffRole,
      });
    } else {
      const user = await User.findOne({
        _id: caller.userId,
        role: "staff",
        isActive: true,
      }).select("_id name");
      if (!user) {
        throw new AppError("Staff account is inactive or no longer exists", 401);
      }
      setAuditActor(req, {
        id: String(user._id),
        name: user.name,
        role: "Staff",
      });
    }
  } else if (caller.role === "admin") {
    const user = await User.findById(caller.userId).select("name");
    setAuditActor(req, {
      id: caller.userId,
      name: user?.name || "Admin",
      role: "Super Admin",
    });
  }
  return caller;
};

const guestIdentitySchema = z.object({
  guestId: z.string().uuid(),
  secret: z.string().regex(/^[a-f0-9]{64}$/i),
});

// Short, human-friendly order number that is checked to be unused.
const generateInvoiceId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const exists = await Order.exists({ invoiceId: candidate });
    if (!exists) return candidate;
  }
  return `ORD-${Date.now()}`;
};

// POST /api/orders — place a new order
export const createOrder = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const caller = await getCallerFromRequest(req);
    const isStaff = caller?.role === "admin" || caller?.role === "staff";

    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
      throw new AppError(
        `Invalid order data: ${where}${issue?.message || "validation failed"}`,
        400,
      );
    }
    const data = parsed.data;
    if (!isStaff && !/^(?:\+?88)?01[3-9]\d{8}$/.test(data.phone)) {
      throw new AppError("Please enter a valid Bangladesh mobile number", 400);
    }
    if (!isStaff && data.address.trim().length < 8) {
      throw new AppError("Please enter a complete delivery address", 400);
    }
    if (!isStaff && !data.district) {
      throw new AppError("Please select a delivery district", 400);
    }
    if (!isStaff && data.paymentMethod !== "cod") {
      throw new AppError("Cash on delivery is the only available payment method", 400);
    }

    let customerId: string | undefined;
    let guestId: string | undefined;
    if (caller?.role === "customer") {
      const customer = await Customer.findById(caller.userId);
      if (!customer || customer.isGuest) {
        throw new AppError("Customer session is no longer valid", 401);
      }
      customer.name = data.customerName;
      customer.phone = data.phone;
      customer.address = data.address;
      if (data.email && data.email.toLowerCase() !== customer.email) {
        if (
          await Customer.exists({
            email: data.email.toLowerCase(),
            isGuest: false,
            _id: { $ne: customer._id },
          })
        ) {
          throw new AppError("That email address is already in use", 409);
        }
        customer.email = data.email.toLowerCase();
      }
      if (data.district) customer.district = data.district;
      await customer.save();
      customerId = String(customer._id);
    } else if (!isStaff) {
      const identity = guestIdentitySchema.safeParse(req.body?.guestIdentity);
      if (!identity.success) {
        throw new AppError("Guest checkout session expired; refresh and try again", 400);
      }
      guestId = identity.data.guestId;
      let customer = await Customer.findOne({ guestId }).select("+guestId +guestSecretHash");
      if (customer) {
        if (
          !customer.guestSecretHash ||
          !matchesGuestSecret(identity.data.secret, customer.guestSecretHash)
        ) {
          throw new AppError("Guest checkout session could not be verified", 403);
        }
        customer.name = data.customerName;
        customer.phone = data.phone;
        customer.address = data.address;
        if (data.email) customer.email = data.email.toLowerCase();
        if (data.district) customer.district = data.district;
        await customer.save();
      } else {
        customer = await Customer.create({
          name: data.customerName,
          email: data.email?.toLowerCase(),
          phone: data.phone,
          address: data.address,
          district: data.district,
          guestId,
          guestSecretHash: hashGuestSecret(identity.data.secret),
          isGuest: true,
        });
      }
      customerId = String(customer._id);
    }

    // 1) Verify every line against the database. Never trust prices sent by a customer's browser.
    const lines: OrderLine[] = [];
    let verifiedSubtotal = 0;

    for (const item of data.orderedProducts) {
      if (!isObjectId(item.productId)) {
        // Not a catalogue product — only staff may sell a hand-typed item (e.g. in the manual order form).
        if (!isStaff)
          throw new AppError(`Product not found: ${item.name}`, 400);
        lines.push({ ...item });
        verifiedSubtotal += item.price * item.quantity;
        continue;
      }

      const product = await Product.findById(item.productId);
      if (!product) throw new AppError(`Product not found: ${item.name}`, 400);
      const availableModels = [
        ...(product.models ?? []),
        ...(product.model ? [product.model] : []),
      ];
      const availableColors = [
        ...(product.colors ?? []).map((color) => color.name),
        ...(product.colorVariants ?? []).map((color) => color.name),
      ];
      const selectedModel = item.selectedModel ?? item.model;
      if (
        (selectedModel &&
          availableModels.length &&
          !availableModels.includes(selectedModel)) ||
        (item.selectedSize &&
          product.sizes?.length &&
          !product.sizes.includes(item.selectedSize)) ||
        (item.selectedColor &&
          availableColors.length &&
          !availableColors.includes(item.selectedColor))
      ) {
        throw new AppError(`Invalid variant selected for "${product.name}"`, 400);
      }
      if (!product.inStock || (product.stockQty ?? 0) < item.quantity) {
        throw new AppError(
          `"${product.name}" is out of stock or has insufficient quantity`,
          400,
        );
      }

      // Customers always pay the database price. Staff may enter a negotiated price in the POS form.
      const price = isStaff ? item.price : product.price;
      lines.push({ ...item, name: product.name, price });
      verifiedSubtotal += price * item.quantity;
    }

    // 2) Money: computed here, from verified numbers only.
    const isDhaka = /dhaka|ঢাকা/i.test(data.district || "");
    const verifiedDeliveryZone = isStaff
      ? data.deliveryZone
      : isDhaka
        ? "inside_dhaka"
        : "outside_dhaka";
    const verifiedDeliveryCharge = isStaff
      ? data.deliveryCharge
      : isDhaka
        ? 60
        : 120;
    const totals = computeTotals({
      subtotal: round2(verifiedSubtotal),
      deliveryCharge: verifiedDeliveryCharge,
      discount: data.discount,
      paidAmount: data.paidAmount,
      isStaff,
    });

    // 3) Reserve stock atomically (a single conditional update per product), so two customers
    //    buying the last item at the same moment cannot both succeed. Undo everything if any step fails.
    const reserved: { productId: string; quantity: number }[] = [];
    let orderPersisted = false;
    try {
      for (const line of lines) {
        if (!isObjectId(line.productId)) continue;
        const updated = await Product.findOneAndUpdate(
          {
            _id: line.productId,
            inStock: true,
            stockQty: { $gte: line.quantity },
          },
          { $inc: { stockQty: -line.quantity } },
        );
        if (!updated) {
          throw new AppError(
            `"${line.name}" is out of stock or has insufficient quantity`,
            400,
          );
        }
        reserved.push({ productId: line.productId, quantity: line.quantity });
      }

      const order = await Order.create({
        invoiceId: await generateInvoiceId(),
        customerName: data.customerName,
        phone: data.phone,
        address: data.address,
        email: data.email || undefined,
        customerId,
        guestId,
        district: data.district || undefined,
        deliveryZone: verifiedDeliveryZone || undefined,
        deliveryCharge: totals.deliveryCharge,
        discount: totals.discount,
        paymentMethod: data.paymentMethod,
        orderedProducts: lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          quantity: l.quantity,
          price: l.price,
          sku: l.sku,
          model: l.model,
          selectedModel: l.selectedModel,
          selectedSize: l.selectedSize,
          selectedColor: l.selectedColor,
          image: l.image,
        })),
        items: buildItemsSummary(lines),
        subtotal: totals.subtotal,
        total: totals.total,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        status: isStaff && data.status ? data.status : "pending",
        saleType: isStaff ? data.saleType : undefined,
        courier: isStaff ? data.courier : undefined,
        note: data.note || undefined,
        date: new Date().toISOString().split("T")[0],
        timestamp: Date.now(),
      });

      orderPersisted = true;
      if (isStaff) {
        const itemSummary = `${lines.length} item${lines.length === 1 ? "" : "s"}`;
        await recordActivity(req, {
          actionType: "create",
          module: "orders",
          description: `Created order ${order.invoiceId} (${itemSummary}).`,
          targetId: String(order._id),
          targetName: order.invoiceId,
          newValues: {
            status: order.status,
            total: order.total,
            itemCount: lines.length,
          },
        });
      }
      res.status(201).json({ success: true, order });
    } catch (err) {
      if (!orderPersisted) {
        for (const r of reserved) {
          await Product.findByIdAndUpdate(r.productId, {
            $inc: { stockQty: r.quantity },
          }).catch(() => undefined);
        }
      }
      throw err;
    }
  },
);

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

// PATCH /api/orders/:id/status — update just the order status (admin only)
export const updateOrderStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError("Invalid status value", 400);

    const previous = await Order.findById(req.params.id);
    if (!previous) throw new AppError("Order not found", 404);
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: parsed.data.status },
      { new: true },
    );
    if (!order) throw new AppError("Order not found", 404);
    if (previous.status !== order.status) {
      await recordActivity(req, {
        actionType: "status_change",
        module: "orders",
        description: `Changed order ${order.invoiceId || ""} status from "${previous.status}" to "${order.status}".`.trim(),
        targetId: String(order._id),
        targetName: order.invoiceId,
        previousValues: { status: previous.status },
        newValues: { status: order.status },
      });
    }
    res.json({ success: true, order });
  },
);

// PATCH /api/orders/:id — update general order fields (admin only)
export const updateOrder = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const parsed = orderSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path?.length ? `${issue.path.join(".")}: ` : "";
      throw new AppError(
        `Invalid order data: ${where}${issue?.message || "validation failed"}`,
        400,
      );
    }
    const previous = await Order.findById(req.params.id);
    if (!previous) throw new AppError("Order not found", 404);
    const order = await Order.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    });
    if (!order) throw new AppError("Order not found", 404);
    const hasChanges = Object.keys(parsed.data).some(
      (key) => JSON.stringify(previous.get(key)) !== JSON.stringify(order.get(key)),
    );
    if (hasChanges) {
      const statusChanged = previous.status !== order.status;
      await recordActivity(req, {
        actionType: statusChanged ? "status_change" : "update",
        module: "orders",
        description: statusChanged
          ? `Changed order ${order.invoiceId || ""} status from "${previous.status}" to "${order.status}".`.trim()
          : `Updated order ${order.invoiceId || ""}.`.trim(),
        targetId: String(order._id),
        targetName: order.invoiceId,
        previousValues: {
          status: previous.status,
          total: previous.total,
          paymentMethod: previous.paymentMethod,
        },
        newValues: {
          status: order.status,
          total: order.total,
          paymentMethod: order.paymentMethod,
        },
      });
    }
    res.json({ success: true, order });
  },
);

// DELETE /api/orders/:id — remove an order (admin only)
export const deleteOrder = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) throw new AppError("Order not found", 404);
    await recordActivity(req, {
      actionType: "delete",
      module: "orders",
      description: `Deleted order ${order.invoiceId || ""}.`.trim(),
      targetId: String(order._id),
      targetName: order.invoiceId,
      previousValues: {
        status: order.status,
        total: order.total,
        paymentMethod: order.paymentMethod,
      },
    });
    res.json({ success: true, message: "Order deleted" });
  },
);
