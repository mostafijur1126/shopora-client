import React, { useState, useEffect } from "react";
import { Product, OrderItem, OrderedProductSummary, CartItem } from "../types";
import { BANGLADESH_DISTRICTS, isDhakaDistrict } from "../data/districts";
import { formatPrice } from "../utils/format";
import { getCartItemPrice, getCartItemStockQty } from "../utils/cart";
import { getWhatsAppOrderLink } from "../utils/whatsapp";
import { fetchStoreContactSettingsApi } from "../services/api";
import { uploadPaymentProofApi } from "../utils/uploadImage";
import {
  ArrowLeft,
  X,
  ShoppingBag,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Phone,
  User,
  MapPin,
  FileText,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Trash2,
  Banknote,
} from "lucide-react";

const WhatsAppIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

/* ---------------- constants & helpers ---------------- */

// Delivery fees. (Server verifies totals, so keep these in sync with the backend / store settings.)
const DELIVERY_FEE = {
  inside_dhaka: 60,
  sub_dhaka: 100,
  outside_dhaka: 120,
} as const;

const ZONE_LABEL: Record<string, string> = {
  inside_dhaka: "Inside Dhaka",
  sub_dhaka: "Dhaka Suburban",
  outside_dhaka: "Outside Dhaka",
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

// "০১৭১১-২২৩৩৪৪" → "01711223344"
const normalizePhone = (raw: string) =>
  raw
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[^\d+]/g, "");

const isValidBdPhone = (p: string) => /^(?:\+?88)?01[3-9]\d{8}$/.test(p);

const maxQtyFor = (item: CartItem) => {
  const variant = item.product.variants?.find(
    (candidate) => candidate.key === item.selectedVariantKey,
  );
  return variant
    ? variant.stockQty
    : item.product.stockQty && item.product.stockQty > 0
      ? getCartItemStockQty(item)
      : 99;
};

const variantText = (it: CartItem) => {
  const parts: string[] = [];
  const model = it.selectedModel || it.product.model;
  if (model) parts.push(`Model: ${model}`);
  if (it.selectedSize) parts.push(`Size: ${it.selectedSize}`);
  if (it.selectedColor) parts.push(`Color: ${it.selectedColor}`);
  Object.entries(it.selectedVariantAttributes || {}).forEach(([name, value]) =>
    parts.push(`${name}: ${value}`),
  );
  return parts.join(", ");
};

const inputBase =
  "w-full h-12 text-base sm:text-sm bg-white border rounded-xl outline-none transition-colors placeholder-gray-400 text-gray-900";
const inputOk =
  "border-gray-300 focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15";
const inputBad =
  "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200";

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}

// Defined outside the modal so inputs keep focus while typing
const Field: React.FC<FieldProps> = ({
  id,
  label,
  required,
  optional,
  error,
  children,
}) => (
  <div>
    <label
      htmlFor={id}
      className="block text-xs font-bold text-gray-700 mb-1.5"
    >
      {label}
      {required && <span className="text-red-500"> *</span>}
      {optional && (
        <span className="text-gray-400 font-normal"> (optional)</span>
      )}
    </label>
    {children}
    {error && (
      <p
        id={`${id}-error`}
        role="alert"
        className="mt-1.5 text-xs font-semibold text-red-600"
      >
        {error}
      </p>
    )}
  </div>
);

type FieldErrors = { name?: string; phone?: string; address?: string };

/* ---------------- component ---------------- */

export interface DirectOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullPage?: boolean;
  backLabel?: string;
  product?: Product | null;
  quantity?: number;
  cartItems?: CartItem[];
  productsToOrder?: CartItem[];
  onCartItemsChange?: (items: CartItem[]) => void;
  onPlaceOrder?: (order: OrderItem) => void | Promise<OrderItem | null | void>;
  onOrderSuccess?: (order: OrderItem) => void;
  customerProfile?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    district?: string;
  };
  onCustomerInfoChange?: (profile: {
    name: string;
    phone: string;
    email: string;
    address: string;
    district: string;
  }) => void;
}

export const DirectOrderModal: React.FC<DirectOrderModalProps> = ({
  isOpen,
  onClose,
  fullPage = false,
  backLabel = "Back to Product Details",
  product,
  quantity = 1,
  cartItems = [],
  productsToOrder = [],
  onCartItemsChange,
  onPlaceOrder,
  onOrderSuccess,
  customerProfile,
  onCustomerInfoChange,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "bkash" | "nagad"
  >("cod");
  const [bkashNumber, setBkashNumber] = useState("");
  const [nagadNumber, setNagadNumber] = useState("");
  const [isLoadingPaymentSettings, setIsLoadingPaymentSettings] =
    useState(false);
  const [paymentSettingsError, setPaymentSettingsError] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentScreenshot, setPaymentScreenshot] = useState("");
  const [paymentScreenshotUploading, setPaymentScreenshotUploading] =
    useState(false);
  const [paymentProofError, setPaymentProofError] = useState("");
  const [paymentNumberCopied, setPaymentNumberCopied] = useState(false);
  const [paymentNumberCopyError, setPaymentNumberCopyError] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderItem | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Reset state and load items every time checkout opens.
  // Returning customers get their last name / phone / address pre-filled.
  useEffect(() => {
    if (!isOpen) return;

    let resolved: CartItem[] = [];
    if (Array.isArray(productsToOrder) && productsToOrder.length > 0) {
      resolved = productsToOrder.map((it) => ({ ...it }));
    } else if (Array.isArray(cartItems) && cartItems.length > 0) {
      resolved = cartItems.map((ci) => ({ ...ci, quantity: ci.quantity || 1 }));
    } else if (product) {
      resolved = [{ product, quantity: quantity || 1 }];
    }

    setItems(resolved);
    setPlacedOrder(null);
    setErrors({});
    setSubmitError("");
    setIsSubmitting(false);
    setCopiedOrderId(false);
    setPaymentMethod("cod");
    setPaymentAmount("");
    setTransactionId("");
    setPaymentScreenshot("");
    setPaymentScreenshotUploading(false);
    setPaymentProofError("");
    setPaymentNumberCopied(false);
    setPaymentNumberCopyError("");
    setPaymentSettingsError("");
    setBkashNumber("");
    setNagadNumber("");

    setCustomerName(customerProfile?.name || "");
    setPhone(customerProfile?.phone || "");
    setEmail(customerProfile?.email || "");
    setAddress(customerProfile?.address || "");
    setDistrict(customerProfile?.district || "Dhaka");
    setNote("");
    let cancelled = false;
    setIsLoadingPaymentSettings(true);
    fetchStoreContactSettingsApi()
      .then((settings) => {
        if (!cancelled) {
          setBkashNumber(settings.bkashNumber || "");
          setNagadNumber(settings.nagadNumber || "");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPaymentSettingsError(
            error instanceof Error
              ? error.message
              : "Could not load payment information.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPaymentSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Lock scrolling and handle Escape only while checkout is presented as a modal.
  useEffect(() => {
    if (!isOpen || fullPage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, fullPage, onClose]);

  if (!isOpen) return null;

  const requestClose = () => {
    if (!isSubmitting) onClose();
  };

  /* ----- quantity helpers (by line index, so the same product with different variants stays separate) ----- */
  const handleUpdateQuantity = (index: number, delta: number) => {
    const updatedItems = items.map((item, i) => {
      if (i !== index) return item;
      const next = Math.min(
        maxQtyFor(item),
        Math.max(1, item.quantity + delta),
      );
      return { ...item, quantity: next };
    });
    setItems(updatedItems);
    onCartItemsChange?.(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1 && !onCartItemsChange) return;
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    onCartItemsChange?.(updatedItems);
  };

  /* ----- calculations ----- */
  const subtotal = items.reduce(
    (sum, item) => sum + getCartItemPrice(item) * item.quantity,
    0,
  );
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryZone: "inside_dhaka" | "outside_dhaka" = isDhakaDistrict(
    district,
  )
    ? "inside_dhaka"
    : "outside_dhaka";
  const deliveryCharge = items.length > 0 ? DELIVERY_FEE[deliveryZone] : 0;
  const total = subtotal + deliveryCharge;
  const isMfsPayment = paymentMethod !== "cod";
  const paymentProvider = paymentMethod === "nagad" ? "Nagad" : "bKash";
  const selectedPaymentNumber =
    paymentMethod === "nagad" ? nagadNumber : bkashNumber;
  const paymentPanelClass =
    paymentMethod === "nagad"
      ? "border-orange-200 bg-orange-50/60"
      : "border-pink-200 bg-pink-50/60";
  const paymentTextClass =
    paymentMethod === "nagad" ? "text-orange-700" : "text-pink-700";
  const paymentBorderClass =
    paymentMethod === "nagad" ? "border-orange-200" : "border-pink-200";

  /* ----- validation ----- */
  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (customerName.trim().length < 2) {
      next.name = "Please enter your full name.";
    }
    if (!isValidBdPhone(normalizePhone(phone))) {
      next.phone = "Enter a valid mobile number, e.g. 017XXXXXXXX";
    }
    if (address.trim().length < 8) {
      next.address = "Please add house/road, area and thana.";
    }
    setErrors(next);
    if (isMfsPayment && !selectedPaymentNumber) {
      setPaymentProofError(
        `The store's ${paymentProvider} number is unavailable. Please choose Cash on Delivery or contact the store.`,
      );
      return false;
    }
    const hasPaymentProof = Boolean(
      transactionId.trim() || paymentScreenshot,
    );
    if (isMfsPayment && paymentScreenshotUploading) {
      setPaymentProofError("Wait for the screenshot upload to finish.");
      return false;
    }
    if (
      isMfsPayment &&
      (!Number.isFinite(Number(paymentAmount)) ||
        Number(paymentAmount) <= 0 ||
        Number(paymentAmount) > total)
    ) {
      setPaymentProofError(
        `Enter an amount between 1 and ${formatPrice(total)}.`,
      );
      return false;
    }
    if (isMfsPayment && !hasPaymentProof) {
      setPaymentProofError("Enter the TrxID or upload a transaction screenshot.");
      return false;
    }
    setPaymentProofError("");

    const firstKey = Object.keys(next)[0];
    if (firstKey) {
      document.getElementById(`checkout-${firstKey}`)?.focus();
      return false;
    }
    return true;
  };

  const handleCopyPaymentNumber = async () => {
    setPaymentNumberCopyError("");
    try {
      await navigator.clipboard.writeText(selectedPaymentNumber);
      setPaymentNumberCopied(true);
      window.setTimeout(() => setPaymentNumberCopied(false), 2000);
    } catch {
      setPaymentNumberCopyError(
        "Could not copy the number. Please select and copy it manually.",
      );
    }
  };

  /* ----- submit ----- */
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError("");

    if (items.length === 0) {
      setSubmitError("No items in your order.");
      return;
    }
    if (!validate()) return;

    setIsSubmitting(true);

    const cleanPhone = normalizePhone(phone).replace(/^\+?88/, "");
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsSummary = items
      .map((it) => {
        const v = variantText(it);
        return `${it.product.name}${v ? ` [${v}]` : ""} (Qty: ${it.quantity})`;
      })
      .join(", ");

    const orderedProducts: OrderedProductSummary[] = items.map((it) => ({
      id: it.product.id,
      name: it.product.name,
      sku: it.product.sku,
      model: it.selectedModel || it.product.model,
      selectedModel: it.selectedModel || it.product.model,
      selectedSize: it.selectedSize,
      selectedColor: it.selectedColor,
      selectedVariantKey: it.selectedVariantKey,
      selectedVariantAttributes: it.selectedVariantAttributes,
      price: getCartItemPrice(it),
      quantity: it.quantity,
      image: it.product.image?.startsWith("data:")
        ? undefined
        : it.product.image,
    }));

    const timeString = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const newOrder: OrderItem = {
      id: orderId,
      customerName: customerName.trim(),
      phone: cleanPhone,
      email: email.trim() || undefined,
      address: address.trim(),
      district: district.trim(),
      deliveryZone,
      deliveryCharge,
      paymentMethod,
      ...(isMfsPayment
        ? {
            paymentProof: {
              amount: Number(paymentAmount),
              transactionId: transactionId.trim() || undefined,
              screenshot: paymentScreenshot || undefined,
            },
          }
        : {}),
      items: itemsSummary,
      orderedProducts,
      subtotal,
      total,
      note: note.trim(),
      status: "pending",
      date: `Today, ${timeString}`,
      timestamp: Date.now(),
    };

    // The parent saves the order on the server. The confirmation screen is shown
    // ONLY if the server really saved it.
    let saved: OrderItem | null | undefined = newOrder;
    if (onPlaceOrder) {
      try {
        saved = (await onPlaceOrder(newOrder)) as OrderItem | null | undefined;
      } catch {
        saved = null;
      }
    }
    if (saved === null) {
      setIsSubmitting(false);
      setSubmitError(
        "দুঃখিত, অর্ডারটি সম্পন্ন করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন, অথবা আমাদের সরাসরি ফোন করুন।",
      );
      return;
    }
    const confirmedOrder: OrderItem = saved ?? newOrder;

    onCustomerInfoChange?.({
      name: customerName.trim(),
      phone: cleanPhone,
      email: email.trim(),
      address: address.trim(),
      district: district.trim(),
    });
    setCustomerName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDistrict("Dhaka");
    setNote("");
    setPlacedOrder(confirmedOrder);
    setIsSubmitting(false);
    if (onOrderSuccess) onOrderSuccess(confirmedOrder);

    setNote("");
    setPlacedOrder(confirmedOrder);
    setIsSubmitting(false);
    if (onOrderSuccess) onOrderSuccess(confirmedOrder);
  };

  const handleCopyOrderId = async () => {
    if (!placedOrder) return;
    try {
      await navigator.clipboard?.writeText(
        placedOrder.invoiceId || placedOrder.id,
      );
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const buildWhatsAppUrl = (order: OrderItem) => {
    const zone = ZONE_LABEL[order.deliveryZone || "outside_dhaka"];
    let text = `*🛍️ New Order (Shopora)*\n\n`;
    text += `*Order ID:* #${order.invoiceId || order.id}\n`;
    text += `*Customer:* ${order.customerName}\n`;
    text += `*Phone:* ${order.phone}\n`;
    text += `*Address:* ${order.address} (${order.district || "Bangladesh"})\n`;
    text += `*Delivery Area:* ${zone} (${order.deliveryCharge ?? 0} tk)\n\n`;
    text += `*Items:*\n`;
    if (order.orderedProducts && order.orderedProducts.length > 0) {
      order.orderedProducts.forEach((p, idx) => {
        const modelInfo = p.model ? ` [Model: ${p.model}]` : "";
        text += `${idx + 1}. ${p.name}${modelInfo} - ${p.quantity} pcs x ${p.price} tk = ${p.quantity * p.price} tk\n`;
      });
    } else {
      text += `${order.items}\n`;
    }
    text += `\n*Subtotal:* ${formatPrice(order.subtotal ?? order.total - (order.deliveryCharge || 0))}\n`;
    text += `*Delivery Fee:* ${formatPrice(order.deliveryCharge ?? 0)}\n`;
    const paymentLabel =
      order.paymentMethod === "bkash"
        ? "bKash Personal"
        : order.paymentMethod === "nagad"
          ? "Nagad Personal"
          : "Cash on Delivery";
    text += `*Total Amount:* ${formatPrice(order.total)} (${paymentLabel})\n`;
    if (order.note) text += `*Note:* ${order.note}\n`;
    text += `\nPlease confirm my order. Thank you!`;
    return getWhatsAppOrderLink(text);
  };

  /* ---------------- render ---------------- */
  return (
    <div
      className={
        fullPage
          ? "w-full bg-[#f8f9fa] px-3 py-4 sm:px-4 sm:py-6 lg:px-6"
          : "fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      }
      onClick={fullPage ? undefined : requestClose}
    >
      <div
        role={fullPage ? undefined : "dialog"}
        aria-modal={fullPage ? undefined : true}
        aria-labelledby="checkout-title"
        onClick={(e) => e.stopPropagation()}
        className={
          fullPage
            ? "mx-auto flex w-full max-w-6xl flex-col rounded-2xl border border-gray-200 bg-white shadow-sm sm:rounded-3xl"
            : "animate-sheet-up relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl"
        }
      >
        {/* Header */}
        <div
          className={`shrink-0 bg-gradient-to-r from-[#00503a] via-[#006a4e] to-[#003828] text-white ${
            fullPage ? "rounded-t-2xl sm:rounded-t-3xl" : ""
          }`}
        >
          {!fullPage && (
            <div className="flex justify-center pt-2 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-white/30" />
            </div>
          )}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                {placedOrder ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <ShoppingBag className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h2
                  id="checkout-title"
                  className="text-base sm:text-lg font-extrabold leading-tight truncate"
                >
                  {placedOrder ? "Order Confirmed" : "Checkout"}
                </h2>
                <p className="text-[11px] sm:text-xs text-emerald-100/90 truncate">
                  {placedOrder
                    ? "We have received your order"
                    : isMfsPayment
                      ? `${paymentProvider} Personal • Send Money`
                      : "Cash on Delivery • Fast home delivery"}
                </p>
              </div>
            </div>
            {fullPage ? (
              <button
                type="button"
                onClick={requestClose}
                disabled={isSubmitting}
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/30 px-3 text-xs font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{backLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {placedOrder ? (
          /* ================= SUCCESS ================= */
          <>
            <div
              className={`${fullPage ? "" : "flex-1 overflow-y-auto overscroll-contain"} px-4 py-6 sm:px-6`}
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-9 h-9 text-[#006a4e]" />
                </div>
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-[#00503a] px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  Order placed successfully
                </div>
                <h3 className="text-xl font-black text-gray-900">
                  Thank you, {placedOrder.customerName}!
                </h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                  Our team will call you shortly to confirm the delivery. Please
                  keep your phone nearby.
                </p>
              </div>

              <div className="mt-6 bg-gradient-to-br from-[#f8faf9] to-[#edf5f1] p-4 rounded-2xl border border-emerald-100 space-y-4 max-w-lg mx-auto">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-emerald-200/60">
                  <div className="min-w-0">
                    <span className="text-[11px] text-gray-500 font-semibold block">
                      Order ID
                    </span>
                    <span className="text-base font-black font-mono text-[#00503a] break-all">
                      {placedOrder.invoiceId || placedOrder.id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOrderId}
                    className="shrink-0 h-9 flex items-center gap-1.5 text-xs font-bold bg-white text-[#00503a] border border-emerald-200 hover:bg-emerald-50 px-3 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedOrderId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 shrink-0">Phone</dt>
                    <dd className="font-bold text-gray-900">
                      {placedOrder.phone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 shrink-0">Address</dt>
                    <dd className="font-bold text-gray-900 text-right">
                      {placedOrder.address}, {placedOrder.district}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500 shrink-0">Payment</dt>
                    <dd className="font-bold text-emerald-800">
                      {placedOrder.paymentMethod === "bkash"
                        ? "bKash Personal"
                        : placedOrder.paymentMethod === "nagad"
                          ? "Nagad Personal"
                          : "Cash on Delivery"}
                    </dd>
                  </div>
                </dl>
                {(placedOrder.paymentMethod === "bkash" ||
                  placedOrder.paymentMethod === "nagad") && (
                  <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900">
                    Your payment proof is awaiting verification by our team.
                  </p>
                )}

                <div className="pt-3 border-t border-emerald-200/60 space-y-2">
                  {placedOrder.orderedProducts?.map((p, idx) => (
                    <div
                      key={`${p.id}-${idx}`}
                      className="flex items-center justify-between gap-3 text-xs py-1.5 bg-white/70 px-2.5 rounded-lg border border-emerald-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-8 h-8 rounded object-cover shrink-0"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span className="font-medium text-gray-900 truncate">
                          {p.name}
                        </span>
                        <span className="text-gray-500 shrink-0">
                          ×{p.quantity}
                        </span>
                      </div>
                      <span className="font-bold text-[#00503a] shrink-0 font-montserrat">
                        {formatPrice(p.price * p.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-emerald-200 flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-800">
                    Total to pay
                  </span>
                  <span className="text-xl font-extrabold text-[#00503a] font-montserrat">
                    {formatPrice(placedOrder.total)}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`${fullPage ? "sticky bottom-0 z-10" : "shrink-0"} flex flex-col gap-2.5 border-t border-gray-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:px-6`}
            >
              <a
                href={buildWhatsAppUrl(placedOrder)}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:flex-1 h-12 bg-[#25D366] hover:bg-[#20b858] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5" />
                <span>Confirm on WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="sm:flex-1 h-12 bg-[#00503a] hover:bg-[#003828] text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </>
        ) : (
          /* ================= CHECKOUT FORM ================= */
          <>
            <div
              className={`${fullPage ? "" : "flex-1 overflow-y-auto overscroll-contain"} px-4 py-4 sm:px-6 sm:py-5`}
            >
              <form
                id="checkout-form"
                onSubmit={handleSubmitOrder}
                noValidate
                className={`space-y-6 ${
                  fullPage
                    ? "md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]"
                    : ""
                }`}
              >
                {/* Items */}
                <section
                  aria-label="Order items"
                  className={
                    fullPage
                      ? "md:col-start-1 md:row-start-1 lg:col-start-2"
                      : undefined
                  }
                >
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2.5">
                    <ShoppingBag className="w-4 h-4 text-[#00503a]" />
                    Your items ({totalQty})
                  </h3>

                  {items.length > 0 ? (
                    <ul className="space-y-2.5">
                      {items.map((item, index) => {
                        const max = maxQtyFor(item);
                        const variant = variantText(item);
                        const atMax = item.quantity >= max;
                        const lowStock =
                          item.product.stockQty !== undefined &&
                          item.product.stockQty > 0 &&
                          item.product.stockQty <=
                            (item.product.lowStockThreshold ?? 5);

                        return (
                          <li
                            key={`${item.product.id}-${variant}-${index}`}
                            className="flex gap-3 p-3 rounded-2xl border border-gray-200 bg-[#f7faf8]"
                          >
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-16 h-16 rounded-xl object-cover border border-gray-100 bg-white shrink-0"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0 flex flex-col">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                                  {item.product.name}
                                </h4>
                                {(items.length > 1 || onCartItemsChange) && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    aria-label={`Remove ${item.product.name}`}
                                    className="-mt-1 -mr-1 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {variant && (
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  {variant}
                                </p>
                              )}

                              <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                                <span className="text-sm font-extrabold text-[#00503a] font-montserrat">
                                  {formatPrice(
                                    getCartItemPrice(item) * item.quantity,
                                  )}
                                </span>

                                <div className="flex items-center border border-gray-200 rounded-xl bg-white">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateQuantity(index, -1)
                                    }
                                    disabled={item.quantity <= 1}
                                    aria-label="Decrease quantity"
                                    className="w-9 h-9 rounded-l-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-8 text-center text-sm font-bold text-[#00503a]">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateQuantity(index, 1)
                                    }
                                    disabled={atMax}
                                    aria-label="Increase quantity"
                                    className="w-9 h-9 rounded-r-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {(atMax && max < 99) || lowStock ? (
                                <p className="text-[11px] font-semibold text-amber-600 mt-1.5">
                                  Only {item.product.stockQty} left in stock
                                </p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                      No items to check out. Add products to your cart and try
                      again.
                    </p>
                  )}
                </section>

                {/* Delivery details */}
                <section
                  aria-label="Delivery details"
                  className={`space-y-4 ${
                    fullPage
                      ? "md:col-start-2 md:row-start-1 lg:col-start-1"
                      : ""
                  }`}
                >
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <MapPin className="w-4 h-4 text-[#00503a]" />
                    Delivery details
                  </h3>

                  <div
                    className={`grid grid-cols-1 gap-4 ${
                      fullPage ? "md:grid-cols-2" : "sm:grid-cols-2"
                    }`}
                  >
                    <Field
                      id="checkout-name"
                      label="Full name"
                      required
                      error={errors.name}
                    >
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="checkout-name"
                          type="text"
                          autoComplete="name"
                          enterKeyHint="next"
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            onCustomerInfoChange?.({
                              name: e.target.value,
                              phone,
                              email,
                              address,
                              district,
                            });
                            if (errors.name)
                              setErrors((p) => ({ ...p, name: undefined }));
                          }}
                          placeholder="Your full name"
                          aria-required="true"
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={
                            errors.name ? "checkout-name-error" : undefined
                          }
                          className={`${inputBase} pl-10 pr-3 ${errors.name ? inputBad : inputOk}`}
                        />
                      </div>
                    </Field>

                    <Field
                      id="checkout-phone"
                      label="Mobile number"
                      required
                      error={errors.phone}
                    >
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="checkout-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          enterKeyHint="next"
                          maxLength={16}
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            onCustomerInfoChange?.({
                              name: customerName,
                              phone: e.target.value,
                              email,
                              address,
                              district,
                            });
                            if (errors.phone)
                              setErrors((p) => ({ ...p, phone: undefined }));
                          }}
                          placeholder="01XXXXXXXXX"
                          aria-required="true"
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={
                            errors.phone ? "checkout-phone-error" : undefined
                          }
                          className={`${inputBase} pl-10 pr-3 ${errors.phone ? inputBad : inputOk}`}
                        />
                      </div>
                    </Field>
                  </div>

                  <Field id="checkout-email" label="Email address" optional>
                    <input
                      id="checkout-email"
                      type="email"
                      autoComplete="email"
                      maxLength={200}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        onCustomerInfoChange?.({
                          name: customerName,
                          phone,
                          email: e.target.value,
                          address,
                          district,
                        });
                      }}
                      placeholder="you@example.com"
                      className={`${inputBase} px-3.5 ${inputOk}`}
                    />
                  </Field>

                  <Field
                    id="checkout-district"
                    label="District / City"
                    required
                  >
                    <select
                      id="checkout-district"
                      value={district}
                      onChange={(e) => {
                        setDistrict(e.target.value);
                        onCustomerInfoChange?.({
                          name: customerName,
                          phone,
                          email,
                          address,
                          district: e.target.value,
                        });
                      }}
                      className={`${inputBase} ${inputOk} px-3.5 font-medium cursor-pointer`}
                    >
                      {BANGLADESH_DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nameEn} ({d.nameBn})
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 text-xs">
                      <span className="flex items-center gap-2 text-[#00503a] font-semibold">
                        <Truck className="w-4 h-4" />
                        Delivery: {ZONE_LABEL[deliveryZone]}
                      </span>
                      <span className="font-extrabold text-[#00503a] font-montserrat">
                        {formatPrice(deliveryCharge)}
                      </span>
                    </div>
                  </Field>

                  <Field
                    id="checkout-address"
                    label="Full delivery address"
                    required
                    error={errors.address}
                  >
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <textarea
                        id="checkout-address"
                        rows={3}
                        autoComplete="street-address"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          onCustomerInfoChange?.({
                            name: customerName,
                            phone,
                            email,
                            address: e.target.value,
                            district,
                          });
                          if (errors.address)
                            setErrors((p) => ({ ...p, address: undefined }));
                        }}
                        placeholder="House/Flat no, Road, Area/Village, Thana"
                        aria-required="true"
                        aria-invalid={Boolean(errors.address)}
                        aria-describedby={
                          errors.address ? "checkout-address-error" : undefined
                        }
                        className={`${inputBase} h-auto pl-10 pr-3 py-3 resize-none ${errors.address ? inputBad : inputOk}`}
                      />
                    </div>
                  </Field>

                  <Field id="checkout-note" label="Note for delivery" optional>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="checkout-note"
                        type="text"
                        enterKeyHint="done"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Color, landmark, preferred time..."
                        className={`${inputBase} pl-10 pr-3 ${inputOk}`}
                      />
                    </div>
                  </Field>
                </section>

                {/* Payment */}
                <section
                  aria-label="Payment method"
                  className={
                    fullPage
                      ? "md:col-start-1 md:row-start-2 lg:row-start-2"
                      : undefined
                  }
                >
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2.5">
                    <Banknote className="w-4 h-4 text-[#00503a]" />
                    Payment
                  </h3>
                  <div
                    className={`grid gap-2 ${
                      fullPage ? "grid-cols-1 lg:grid-cols-2" : "sm:grid-cols-2"
                    }`}
                  >
                    {(
                      [
                        ["cod", "Cash on Delivery", "Pay when your order arrives."],
                        ["bkash", "bKash Personal", "Pay using Send Money."],
                        ["nagad", "Nagad Personal", "Pay using Nagad Send Money."],
                      ] as const
                    ).map(([method, label, description]) => (
                      <button
                        key={method}
                        type="button"
                        aria-pressed={paymentMethod === method}
                        onClick={() => {
                          if (paymentScreenshotUploading) return;
                          if (paymentMethod !== method) {
                            setTransactionId("");
                            setPaymentScreenshot("");
                            setPaymentNumberCopied(false);
                            setPaymentNumberCopyError("");
                          }
                          setPaymentMethod(method);
                          if (method !== "cod" && !paymentAmount) {
                            setPaymentAmount(String(total));
                          }
                          setPaymentProofError("");
                        }}
                        disabled={paymentScreenshotUploading}
                        className={`text-left rounded-2xl border-2 p-3.5 transition-colors ${
                          paymentMethod === method
                            ? method === "nagad"
                              ? "border-orange-500 bg-orange-50"
                              : "border-[#00503a] bg-[#f4fbf8]"
                            : "border-gray-200 bg-white hover:border-emerald-300"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                paymentMethod === method
                                  ? method === "nagad"
                                    ? "border-orange-600"
                                    : "border-[#00503a]"
                                  : "border-gray-300"
                              }`}
                            >
                              {paymentMethod === method && (
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    method === "nagad"
                                      ? "bg-orange-600"
                                      : "bg-[#00503a]"
                                  }`}
                                />
                              )}
                            </span>
                            <span>
                              <span className="block text-sm font-bold text-gray-900">
                                {label}
                              </span>
                              <span className="block text-xs text-gray-600 mt-0.5">
                                {description}
                              </span>
                            </span>
                          </span>
                          {method !== "cod" && (
                            <span
                              className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${
                                method === "nagad"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-pink-100 text-pink-700"
                              }`}
                            >
                              {method === "nagad" ? "NAGAD" : "bKash"}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                  {isLoadingPaymentSettings && (
                    <p className="mt-2 text-xs text-gray-500">
                      Loading payment information…
                    </p>
                  )}
                  {paymentSettingsError && (
                    <p role="alert" className="mt-2 text-xs text-red-700">
                      {paymentSettingsError}
                    </p>
                  )}
                  {isMfsPayment && (
                    <div
                      className={`mt-3 space-y-3 rounded-2xl border p-4 ${paymentPanelClass}`}
                    >
                      <div>
                        <p className={`text-xs font-bold ${paymentTextClass}`}>
                          Send Money to this personal {paymentProvider} number
                        </p>
                        <p
                          className={`mt-1 font-mono text-lg font-extrabold ${paymentTextClass}`}
                        >
                          {selectedPaymentNumber ||
                            `${paymentProvider} number not configured`}
                        </p>
                        {selectedPaymentNumber && (
                          <button
                            type="button"
                            onClick={handleCopyPaymentNumber}
                            className={`mt-2 inline-flex min-h-10 items-center rounded-lg border bg-white px-3 text-xs font-bold hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${paymentBorderClass} ${paymentTextClass}`}
                          >
                            {paymentNumberCopied
                              ? "Number copied"
                              : "Copy number for Send Money"}
                          </button>
                        )}
                        {paymentNumberCopyError && (
                          <p role="alert" className="mt-1 text-xs text-red-700">
                            {paymentNumberCopyError}
                          </p>
                        )}
                        {!selectedPaymentNumber && !isLoadingPaymentSettings && (
                          <p role="alert" className="mt-1 text-xs text-red-700">
                            The store has not configured a {paymentProvider}{" "}
                            number. Please use Cash on Delivery or contact the
                            store.
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-600">
                          Open {paymentProvider}, choose{" "}
                          <strong>Send Money</strong>, and send your payment to
                          the number above. Submit the transaction ID or a
                          screenshot of the successful transaction below.
                        </p>
                      </div>
                      <label className="block text-xs font-bold text-gray-700">
                        Amount sent (৳)
                        <input
                          type="number"
                          min={1}
                          max={total}
                          step="0.01"
                          required
                          value={paymentAmount}
                          onChange={(e) => {
                            setPaymentAmount(e.target.value);
                            setPaymentProofError("");
                          }}
                          className="mt-1.5 w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#00503a]"
                        />
                      </label>
                      <label className="block text-xs font-bold text-gray-700">
                        Transaction ID (TrxID)
                        <input
                          type="text"
                          maxLength={100}
                          value={transactionId}
                          onChange={(e) => {
                            setTransactionId(e.target.value);
                            setPaymentProofError("");
                          }}
                          placeholder={`Enter your ${paymentProvider} TrxID`}
                          className="mt-1.5 w-full h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#00503a]"
                        />
                      </label>
                      <label className="block text-xs font-bold text-gray-700">
                        Or upload transaction screenshot
                        <input
                          key={paymentMethod}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={paymentScreenshotUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setPaymentProofError("");
                            if (!file) {
                              setPaymentScreenshot("");
                              return;
                            }
                            setPaymentScreenshot("");
                            if (
                              !["image/jpeg", "image/png", "image/webp"].includes(
                                file.type,
                              ) ||
                              file.size > 5_000_000
                            ) {
                              setPaymentProofError(
                                "Choose a JPG, PNG, or WebP image up to 5 MB.",
                              );
                              e.target.value = "";
                              return;
                            }
                            setPaymentScreenshotUploading(true);
                            void uploadPaymentProofApi(file)
                              .then(setPaymentScreenshot)
                              .catch((error: unknown) => {
                                setPaymentProofError(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not upload the screenshot. Please try again.",
                                );
                              })
                              .finally(() =>
                                setPaymentScreenshotUploading(false),
                              );
                          }}
                          className="mt-1.5 block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-bold file:text-[#00503a]"
                        />
                      </label>
                      {paymentScreenshotUploading && (
                        <p role="status" className="text-xs text-gray-600">
                          Uploading payment screenshot…
                        </p>
                      )}
                      {paymentScreenshot && (
                        <div className="flex items-center gap-3">
                          <img
                            src={paymentScreenshot}
                            alt={`Selected ${paymentProvider} payment proof`}
                            className={`h-16 w-16 rounded-lg border object-cover ${paymentBorderClass}`}
                          />
                          <button
                            type="button"
                            disabled={paymentScreenshotUploading}
                            onClick={() => setPaymentScreenshot("")}
                            className="text-xs font-bold text-red-600"
                          >
                            Remove screenshot
                          </button>
                        </div>
                      )}
                      {paymentProofError && (
                        <p role="alert" className="text-xs font-semibold text-red-700">
                          {paymentProofError}
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {/* Price summary */}
                <section
                  aria-label="Price summary"
                  className={`space-y-2 rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#f8faf9] to-[#edf5f1] p-4 text-sm ${
                    fullPage
                      ? "md:col-start-2 md:row-start-2"
                      : ""
                  }`}
                >
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900 font-montserrat">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery ({ZONE_LABEL[deliveryZone]})</span>
                    <span className="font-bold text-gray-900 font-montserrat">
                      {formatPrice(deliveryCharge)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/80 flex justify-between items-center font-extrabold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-xl font-black text-[#00503a] font-montserrat">
                      {formatPrice(total)}
                    </span>
                  </div>
                </section>
              </form>
            </div>

            {/* Sticky action bar: always visible on mobile */}
            <div
              className={`${fullPage ? "sticky bottom-0 z-10" : "shrink-0"} border-t border-gray-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.12)] sm:px-6`}
            >
              {submitError && (
                <div
                  role="alert"
                  className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-start gap-2"
                >
                  <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <p className="text-[11px] text-gray-500 leading-none">
                    Total
                  </p>
                  <p className="text-lg font-black text-[#00503a] font-montserrat leading-tight mt-1">
                    {formatPrice(total)}
                  </p>
                </div>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={
                    isSubmitting ||
                    paymentScreenshotUploading ||
                    items.length === 0
                  }
                  className="flex-1 h-12 bg-[#00503a] hover:bg-[#003828] disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Placing order...</span>
                    </>
                  ) : (
                    <>
                      <span>Place Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="hidden sm:flex mt-2 text-[11px] text-gray-500 items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00503a]" />
                <span>Secure checkout • Inspect the product before paying</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
