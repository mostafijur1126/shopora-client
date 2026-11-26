// Pure helpers for creating orders. This file has NO external imports on purpose,
// so the money / validation rules can be tested in isolation.

export const MAX_MONEY = 10_000_000;
export const MAX_DELIVERY_CHARGE = 5_000;

export const ORDER_STATUSES = [
  "pending",
  "packing",
  "pickup",
  "courier",
  "delivered",
  "cancelled",
  "return_received",
  "on_hold",
  "draft",
  "exchange",
  "incompleted",
  "processing",
  "completed",
] as const;

export interface OrderLine {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  brand?: string;
  sku?: string;
  variantSku?: string;
  regularPrice?: number;
  salePrice?: number;
  model?: string;
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedVariantKey?: string;
  selectedVariantAttributes?: Record<string, string>;
  image?: string;
}

export interface OrderTotals {
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
}

// A MongoDB ObjectId is exactly 24 hex characters. Anything else (for example the
// "custom-123" lines an admin types by hand in the manual order form) is not a catalogue product.
export const isObjectId = (value: string): boolean =>
  /^[a-fA-F0-9]{24}$/.test(value);

export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

// Turns anything into a safe, non-negative, capped amount of money.
export const sanitizeMoney = (
  value: unknown,
  max: number = MAX_MONEY,
): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return round2(Math.min(n, max));
};

export const buildItemsSummary = (lines: OrderLine[]): string =>
  lines
    .map((line) => {
      const selectedOptions = [
        line.model && `Model: ${line.model}`,
        line.selectedSize && `Size: ${line.selectedSize}`,
        line.selectedColor && `Color: ${line.selectedColor}`,
        ...Object.entries(line.selectedVariantAttributes || {}).map(
          ([name, value]) => `${name}: ${value}`,
        ),
      ].filter(Boolean);
      return `${line.name}${selectedOptions.length ? ` [${selectedOptions.join(", ")}]` : ""} (${line.quantity} pcs)`;
    })
    .join(", ");

// Server-side source of truth for the money on an order.
//  - subtotal is computed by the caller from verified prices
//  - delivery charge is capped
//  - discount, and the amount already paid, can only be set by logged-in staff;
//    for a public (customer) order both are forced to 0 so nobody can give themselves a discount
//    or mark their own order as already paid.
export const computeTotals = (input: {
  subtotal: number;
  deliveryCharge?: unknown;
  discount?: unknown;
  paidAmount?: unknown;
  isStaff: boolean;
}): OrderTotals => {
  const subtotal = sanitizeMoney(input.subtotal);
  const deliveryCharge = sanitizeMoney(
    input.deliveryCharge,
    MAX_DELIVERY_CHARGE,
  );
  const gross = round2(subtotal + deliveryCharge);
  const discount = input.isStaff
    ? Math.min(sanitizeMoney(input.discount), gross)
    : 0;
  const total = round2(gross - discount);
  const paidAmount = input.isStaff
    ? Math.min(sanitizeMoney(input.paidAmount), total)
    : 0;
  const dueAmount = round2(total - paidAmount);
  return { subtotal, deliveryCharge, discount, total, paidAmount, dueAmount };
};
