import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  OrderItem,
  Product,
  OrderedProductSummary,
  CourierAssignment,
} from "../../types";
import { BANGLADESH_DISTRICTS, isDhakaDistrict } from "../../data/districts";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  ShoppingBag,
  CreditCard,
  Edit,
  Save,
  Clock,
  Truck,
  XCircle,
  Package,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";

/* ---------------- types ---------------- */

type OrderStatus = OrderItem["status"];
type DeliveryZone = "inside_dhaka" | "sub_dhaka" | "outside_dhaka";
type PaymentMethod = "cod" | "bkash" | "nagad";
type CourierPartner = "Pathao" | "RedX" | "Steadfast" | "Paperfly";

// Fields that exist in the database but may be missing from the shared OrderItem type
type ExtOrder = OrderItem & {
  discount?: number;
  createdAt?: string;
  updatedAt?: string;
};

interface Line {
  uid: string;
  productId?: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  image?: string;
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
}

interface FormState {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  deliveryZone: DeliveryZone;
  customDeliveryCharge: number | null;
  items: Line[];
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  note: string;
  discount: number;
  advancePaid: number;
  hasCourier: boolean;
  courierPartner: CourierPartner;
  courierTrackingId: string;
  courierStatus: CourierAssignment["status"];
}

interface AdminEditOrderModalProps {
  order: OrderItem;
  isOpen: boolean;
  onClose: () => void;
  products?: Product[];
  onUpdateOrder: (updatedOrder: OrderItem) => void | Promise<unknown>;
}

/* ---------------- constants & helpers ---------------- */

// Keep in sync with the storefront checkout (DirectOrderModal) and backend.
const DELIVERY_FEE: Record<DeliveryZone, number> = {
  inside_dhaka: 60,
  sub_dhaka: 100,
  outside_dhaka: 120,
};

const ZONES: { id: DeliveryZone; label: string }[] = [
  { id: "inside_dhaka", label: "Inside Dhaka" },
  { id: "sub_dhaka", label: "Dhaka Sub-urban" },
  { id: "outside_dhaka", label: "Outside Dhaka" },
];

const STATUS_OPTIONS: {
  value: OrderStatus;
  label: string;
  hint: string;
  icon: React.ElementType;
  active: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    hint: "Awaiting confirmation",
    icon: Clock,
    active: "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-200",
  },
  {
    value: "processing",
    label: "Processing",
    hint: "Confirmed / Shipped",
    icon: Truck,
    active: "border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-200",
  },
  {
    value: "completed",
    label: "Delivered",
    hint: "Completed",
    icon: CheckCircle2,
    active:
      "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    hint: "Order cancelled",
    icon: XCircle,
    active: "border-red-500 bg-red-50 text-red-800 ring-2 ring-red-200",
  },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const normalizePhone = (raw: string) =>
  raw
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/[^\d+]/g, "")
    .replace(/^\+?88(?=01)/, "");
const isValidBdPhone = (p: string) => /^01[3-9]\d{8}$/.test(p);

const money = (n: number) => `${Math.round(n).toLocaleString("en-US")} tk`;
const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const uid = () => Math.random().toString(36).slice(2, 10);

const formatDateTime = (iso?: string, fallback?: string) => {
  if (!iso) return fallback || "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback || "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  });
};

const deriveInitial = (order: OrderItem): FormState => {
  const o = order as ExtOrder;
  const discount = Number(o.discount) || 0;

  let items: Line[];
  if (o.orderedProducts && o.orderedProducts.length > 0) {
    items = o.orderedProducts.map((p) => {
      const raw = p as OrderedProductSummary & { productId?: string };
      return {
        uid: uid(),
        // DB stores `productId`; older/local orders use `id`
        productId: raw.productId || raw.id,
        name: raw.name,
        sku: raw.sku,
        price: Number(raw.price) || 0,
        quantity: Number(raw.quantity) || 1,
        image: raw.image,
        selectedModel: raw.selectedModel || raw.model,
        selectedSize: raw.selectedSize,
        selectedColor: raw.selectedColor,
      };
    });
  } else {
    items = [
      {
        uid: uid(),
        name: o.items || "Order item",
        price:
          o.subtotal ??
          Math.max(0, (o.total || 0) - (o.deliveryCharge || 0) + discount),
        quantity: 1,
      },
    ];
  }

  return {
    customerName: o.customerName || "",
    phone: o.phone || "",
    email: o.email || "",
    address: o.address || "",
    district: o.district || "Dhaka",
    deliveryZone: (o.deliveryZone as DeliveryZone) || "inside_dhaka",
    customDeliveryCharge:
      o.deliveryCharge !== undefined && o.deliveryCharge !== null
        ? o.deliveryCharge
        : null,
    items,
    paymentMethod: (o.paymentMethod as PaymentMethod) || "cod",
    status: o.status || "pending",
    note: o.note || "",
    discount,
    advancePaid: Number(o.paidAmount) || 0,
    hasCourier: Boolean(o.courier),
    courierPartner: (o.courier?.partner as CourierPartner) || "Pathao",
    courierTrackingId: o.courier?.trackingId || "",
    courierStatus: o.courier?.status || ("In Transit" as never),
  };
};

const inputCls = (bad?: boolean) =>
  `w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border ${
    bad ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"
  } focus:outline-none focus:ring-2 focus:ring-[#00503a]/40 focus:border-[#00503a] transition-colors`;

/* ---------------- component ---------------- */

export const AdminEditOrderModal: React.FC<AdminEditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  products = [],
  onUpdateOrder,
}) => {
  const o = order as ExtOrder;

  const initial = useMemo(() => deriveInitial(order), [order]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  // Re-load form whenever a different order (or fresh data) arrives
  useEffect(() => {
    setForm(initial);
    setErrors({});
    setSubmitError("");
    setIsSaving(false);
    setProductSearch("");
    setIsDropdownOpen(false);
  }, [initial]);

  const isDirty = useMemo(() => {
    const strip = (f: FormState) =>
      JSON.stringify({ ...f, items: f.items.map(({ uid: _u, ...r }) => r) });
    return strip(form) !== strip(initial);
  }, [form, initial]);

  const requestClose = () => {
    if (isSaving) return;
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?"))
      return;
    onClose();
  };

  // Lock background scroll + Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isDirty, isSaving]);

  // Close product dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      )
        setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!isOpen) return null;

  /* ----- calculations ----- */
  const deliveryCharge =
    form.customDeliveryCharge !== null
      ? form.customDeliveryCharge
      : DELIVERY_FEE[form.deliveryZone];
  const subtotal = form.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalQty = form.items.reduce((s, i) => s + i.quantity, 0);
  const discount = Math.min(form.discount, subtotal + deliveryCharge);
  const total = Math.max(0, subtotal + deliveryCharge - discount);
  const paid = Math.min(form.advancePaid, total);
  const due = Math.max(0, total - paid);
  const paymentState =
    total > 0 && paid >= total
      ? { label: "Fully paid", cls: "bg-emerald-100 text-emerald-800" }
      : paid > 0
        ? { label: "Partially paid", cls: "bg-blue-100 text-blue-800" }
        : {
            label: form.paymentMethod === "cod" ? "Pay on delivery" : "Unpaid",
            cls: "bg-amber-100 text-amber-800",
          };

  const statusChanged = form.status !== (o.status || "pending");

  /* ----- product catalog ----- */
  const q = productSearch.trim().toLowerCase();
  const filteredProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)),
      )
    : [];

  const addCatalogProduct = (prod: Product) => {
    setForm((f) => {
      const existing = f.items.find(
        (i) =>
          i.productId === prod.id &&
          !i.selectedSize &&
          !i.selectedColor &&
          !i.selectedModel,
      );
      const items = existing
        ? f.items.map((i) =>
            i.uid === existing.uid ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [
            ...f.items,
            {
              uid: uid(),
              productId: prod.id,
              name: prod.nameEn || prod.name,
              sku: prod.sku,
              price: prod.price,
              quantity: 1,
              image: prod.image,
            },
          ];
      return { ...f, items };
    });
    setProductSearch("");
    setIsDropdownOpen(false);
  };

  const addCustomItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { uid: uid(), name: "", price: 0, quantity: 1 }],
    }));

  const patchLine = (id: string, patch: Partial<Line>) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => (i.uid === id ? { ...i, ...patch } : i)),
    }));

  const removeLine = (id: string) =>
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.uid !== id) }));

  /* ----- save helpers ----- */
  const persist = async (updated: OrderItem) => {
    setIsSaving(true);
    setSubmitError("");
    try {
      await onUpdateOrder(updated);
      onClose();
    } catch {
      setSubmitError("Could not save the order. Please try again.");
      setIsSaving(false);
    }
  };

  // Change ONLY the status (leaves every other saved value untouched)
  const handleQuickStatusUpdate = () => {
    if (!statusChanged || isSaving) return;
    persist({ ...order, status: form.status } as OrderItem);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const next: Record<string, string> = {};
    const cleanPhone = normalizePhone(form.phone);

    if (form.customerName.trim().length < 2)
      next.customerName = "Customer name is required";
    if (!cleanPhone) next.phone = "Phone number is required";
    else if (!isValidBdPhone(cleanPhone))
      next.phone = "Enter a valid mobile number, e.g. 017XXXXXXXX";
    if (form.address.trim().length < 5)
      next.address = "Full delivery address is required";
    if (form.items.length === 0) next.items = "Add at least one item";
    else if (form.items.some((i) => !i.name.trim()))
      next.items = "Every item needs a name";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim()))
      next.email = "Enter a valid email address";

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setSubmitError("Please fix the highlighted fields.");
      return;
    }

    const itemsSummary = form.items
      .map((i) => {
        const v = [
          i.selectedModel && `Model: ${i.selectedModel}`,
          i.selectedSize && `Size: ${i.selectedSize}`,
          i.selectedColor && `Color: ${i.selectedColor}`,
        ]
          .filter(Boolean)
          .join(", ");
        return `${i.name.trim()}${v ? ` [${v}]` : ""} (${i.quantity} pcs)`;
      })
      .join(", ");

    // Write both `productId` (DB field) and `id` (used by the storefront types)
    const orderedProducts = form.items.map((i) => ({
      id: i.productId || `custom-${i.uid}`,
      productId: i.productId || `custom-${i.uid}`,
      name: i.name.trim(),
      sku: i.sku,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
      model: i.selectedModel,
      selectedModel: i.selectedModel,
      selectedSize: i.selectedSize,
      selectedColor: i.selectedColor,
    })) as unknown as OrderedProductSummary[];

    let courier: CourierAssignment | undefined;
    if (form.hasCourier) {
      courier = {
        partner: form.courierPartner,
        trackingId:
          form.courierTrackingId.trim() ||
          o.courier?.trackingId ||
          `${form.courierPartner.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`,
        assignedAt:
          o.courier?.assignedAt ||
          `Today, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        status: form.courierStatus,
        courierFee: deliveryCharge,
      };
    }

    const updated = {
      ...order,
      customerName: form.customerName.trim(),
      phone: cleanPhone,
      email: form.email.trim() || undefined,
      address: form.address.trim(),
      district: form.district,
      deliveryZone: form.deliveryZone,
      deliveryCharge,
      paymentMethod: form.paymentMethod,
      paidAmount: paid,
      dueAmount: due,
      discount,
      items: itemsSummary,
      orderedProducts,
      subtotal,
      total,
      note: form.note.trim() || undefined,
      status: form.status,
      courier,
    } as OrderItem;

    persist(updated);
  };

  /* ---------------- render ---------------- */
  const displayId = o.invoiceId || o.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs sm:p-4"
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-order-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[95dvh] sm:max-h-[92vh] flex flex-col font-sans"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#003828] text-white flex items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Edit className="w-5 h-5 text-[#9ef4d0]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="edit-order-title"
                  className="text-base sm:text-lg font-bold font-montserrat break-all"
                >
                  Order #{displayId}
                </h2>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    STATUS_BADGE[o.status || "pending"] || STATUS_BADGE.pending
                  }`}
                >
                  {o.status || "pending"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200 truncate">
                Placed {formatDateTime(o.createdAt, o.date)}
                {o.updatedAt && o.updatedAt !== o.createdAt
                  ? ` • Updated ${formatDateTime(o.updatedAt)}`
                  : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          id="edit-order-form"
          onSubmit={handleSubmit}
          noValidate
          className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-5 flex-1"
        >
          {/* Order status */}
          <section className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
              <div className="flex items-center gap-2 text-[#003828] font-bold text-sm">
                <Package className="w-4 h-4 text-[#00503a]" />
                <span>Order Status</span>
              </div>
              {statusChanged && (
                <button
                  type="button"
                  onClick={handleQuickStatusUpdate}
                  disabled={isSaving}
                  className="text-xs font-bold bg-[#00503a] hover:bg-[#003828] disabled:opacity-60 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Update status only
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STATUS_OPTIONS.map((s) => {
                const Icon = s.icon;
                const active = form.status === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set({ status: s.value })}
                    aria-pressed={active}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? s.active
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <p className="text-xs font-bold">{s.label}</p>
                    <p className="text-[10px] opacity-70">{s.hint}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Customer */}
          <section className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-4">
            <div className="flex items-center gap-2 text-[#003828] font-bold text-sm border-b border-gray-200 pb-2">
              <User className="w-4 h-4 text-[#00503a]" />
              <span>Customer & Delivery Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Customer name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => set({ customerName: e.target.value })}
                    className={`${inputCls(!!errors.customerName)} pl-9`}
                  />
                </div>
                {errors.customerName && (
                  <p className="text-red-500 text-[11px] mt-1">
                    {errors.customerName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                    className={`${inputCls(!!errors.phone)} pl-9 font-mono`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-[11px] mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set({ email: e.target.value })}
                    className={`${inputCls(!!errors.email)} pl-9`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-[11px] mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  District / City
                </label>
                <select
                  value={form.district}
                  onChange={(e) => {
                    const d = e.target.value;
                    set({
                      district: d,
                      deliveryZone: isDhakaDistrict(d)
                        ? "inside_dhaka"
                        : "outside_dhaka",
                      customDeliveryCharge: null,
                    });
                  }}
                  className={inputCls()}
                >
                  {!BANGLADESH_DISTRICTS.some(
                    (d) => d.id === form.district,
                  ) && <option value={form.district}>{form.district}</option>}
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameEn} ({d.nameBn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full delivery address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <textarea
                    rows={2}
                    value={form.address}
                    onChange={(e) => set({ address: e.target.value })}
                    className={`${inputCls(!!errors.address)} pl-9 resize-none`}
                  />
                </div>
                {errors.address && (
                  <p className="text-red-500 text-[11px] mt-1">
                    {errors.address}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Delivery zone & shipping rate
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ZONES.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() =>
                        set({ deliveryZone: z.id, customDeliveryCharge: null })
                      }
                      aria-pressed={form.deliveryZone === z.id}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        form.deliveryZone === z.id
                          ? "border-[#00503a] bg-emerald-50 text-[#00503a] ring-2 ring-[#00503a]/20"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>{z.label}</span>
                      <span className="font-montserrat">
                        {DELIVERY_FEE[z.id]} tk
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Items */}
          <section className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <div className="flex items-center gap-2 text-[#003828] font-bold text-sm">
                <ShoppingBag className="w-4 h-4 text-[#00503a]" />
                <span>Ordered Items ({totalQty})</span>
              </div>
              <button
                type="button"
                onClick={addCustomItem}
                className="text-xs text-[#00503a] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add custom item
              </button>
            </div>

            <div className="relative" ref={searchBoxRef}>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Add from store inventory
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Search by name, SKU or category..."
                  className={`${inputCls()} pl-9`}
                />
              </div>

              {isDropdownOpen && q && (
                <div className="absolute top-full left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-center text-gray-500 text-xs">
                      No matching products
                    </div>
                  ) : (
                    filteredProducts.slice(0, 10).map((prod) => (
                      <button
                        type="button"
                        key={prod.id}
                        onClick={() => addCatalogProduct(prod)}
                        className="w-full p-2.5 hover:bg-emerald-50/60 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={prod.image}
                            alt=""
                            className="w-9 h-9 object-cover rounded-lg border border-gray-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-gray-900 truncate">
                              {prod.nameEn || prod.name}
                            </p>
                            <p className="text-[10px] text-gray-500 font-mono truncate">
                              {prod.sku || "No SKU"} • {prod.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-xs text-[#00503a] font-montserrat">
                            {money(prod.price)}
                          </p>
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                            + Add
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {form.items.length > 0 ? (
              <ul className="space-y-2.5">
                {form.items.map((item) => {
                  const chips = [
                    item.selectedModel && `Model: ${item.selectedModel}`,
                    item.selectedSize && `Size: ${item.selectedSize}`,
                    item.selectedColor && `Color: ${item.selectedColor}`,
                  ].filter(Boolean) as string[];

                  return (
                    <li
                      key={item.uid}
                      className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <input
                            type="text"
                            value={item.name}
                            placeholder="Item name"
                            onChange={(e) =>
                              patchLine(item.uid, { name: e.target.value })
                            }
                            className="w-full text-sm font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#00503a] focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.sku && (
                              <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                SKU: {item.sku}
                              </span>
                            )}
                            {chips.map((c) => (
                              <span
                                key={c}
                                className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(item.uid)}
                          aria-label={`Remove ${item.name || "item"}`}
                          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-500 font-semibold">
                            Unit price
                          </span>
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            value={item.price || ""}
                            placeholder="0"
                            onChange={(e) =>
                              patchLine(item.uid, {
                                price: num(e.target.value),
                              })
                            }
                            className="w-24 text-center text-sm font-montserrat font-bold bg-gray-50 border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00503a]/40"
                          />
                          <span className="text-gray-400 text-xs">tk</span>
                        </div>

                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              patchLine(item.uid, {
                                quantity: Math.max(1, item.quantity - 1),
                              })
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              patchLine(item.uid, {
                                quantity: Math.max(
                                  1,
                                  Math.floor(num(e.target.value)) || 1,
                                ),
                              })
                            }
                            className="w-12 text-center text-sm font-bold font-mono focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              patchLine(item.uid, {
                                quantity: item.quantity + 1,
                              })
                            }
                            aria-label="Increase quantity"
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="font-montserrat font-extrabold text-sm text-[#00503a] min-w-[80px] text-right">
                          {money(item.price * item.quantity)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-red-500">No items in this order.</p>
            )}
            {errors.items && (
              <p className="text-red-500 text-xs">{errors.items}</p>
            )}
          </section>

          {/* Payment, logistics & billing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-4">
              <div className="flex items-center gap-2 text-[#003828] font-bold text-sm border-b border-gray-200 pb-2">
                <CreditCard className="w-4 h-4 text-[#00503a]" />
                <span>Payment & Logistics</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Payment method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["cod", "COD", "border-[#00503a] bg-[#00503a]"],
                      ["bkash", "bKash", "border-[#E2136E] bg-[#E2136E]"],
                      ["nagad", "Nagad", "border-[#F7941D] bg-[#F7941D]"],
                    ] as const
                  ).map(([val, label, on]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => set({ paymentMethod: val })}
                      aria-pressed={form.paymentMethod === val}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        form.paymentMethod === val
                          ? `${on} text-white`
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasCourier}
                    onChange={(e) => set({ hasCourier: e.target.checked })}
                    className="rounded text-[#00503a] focus:ring-[#00503a] w-4 h-4"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Assign courier partner & tracking
                  </span>
                </label>

                {form.hasCourier && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Courier
                      </label>
                      <select
                        value={form.courierPartner}
                        onChange={(e) =>
                          set({
                            courierPartner: e.target.value as CourierPartner,
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-lg text-xs bg-white border border-gray-300 font-bold"
                      >
                        <option value="Pathao">Pathao</option>
                        <option value="Steadfast">Steadfast</option>
                        <option value="RedX">RedX</option>
                        <option value="Paperfly">Paperfly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Tracking ID
                      </label>
                      <input
                        type="text"
                        value={form.courierTrackingId}
                        onChange={(e) =>
                          set({ courierTrackingId: e.target.value })
                        }
                        placeholder="Auto-generated if empty"
                        className="w-full px-2.5 py-2 rounded-lg text-xs bg-white border border-gray-300 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Notes / instructions
                </label>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => set({ note: e.target.value })}
                  placeholder="e.g. Deliver before 2 PM / Fragile item..."
                  className={`${inputCls()} resize-none`}
                />
              </div>
            </section>

            <section className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2 text-[#003828] font-bold text-sm">
                  <DollarSign className="w-4 h-4 text-[#00503a]" />
                  <span>Billing Summary</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paymentState.cls}`}
                >
                  {paymentState.label}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-gray-600 font-semibold">
                  <span>Subtotal ({totalQty} items)</span>
                  <span className="font-montserrat text-sm text-gray-900 font-bold">
                    {money(subtotal)}
                  </span>
                </div>

                {(
                  [
                    [
                      "Delivery charge",
                      deliveryCharge,
                      (v: number) => set({ customDeliveryCharge: v }),
                      "",
                    ],
                    [
                      "Discount",
                      form.discount,
                      (v: number) => set({ discount: v }),
                      "text-emerald-700",
                    ],
                    [
                      "Amount paid (advance)",
                      form.advancePaid,
                      (v: number) => set({ advancePaid: v }),
                      "text-blue-700",
                    ],
                  ] as const
                ).map(([label, value, onChange, color]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center text-gray-600 font-semibold"
                  >
                    <span>{label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={value || ""}
                        placeholder="0"
                        onChange={(e) => onChange(num(e.target.value))}
                        className={`w-24 px-2 py-1.5 text-right text-sm font-montserrat font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00503a]/40 ${color}`}
                      />
                      <span className="text-gray-400 text-xs">tk</span>
                    </div>
                  </div>
                ))}

                <div className="border-t-2 border-dashed border-gray-200 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-900">
                      Total
                    </span>
                    <span className="font-montserrat font-extrabold text-lg text-[#00503a]">
                      {money(total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <span className="font-bold text-xs text-amber-900">
                      {form.paymentMethod === "cod"
                        ? "Collect on delivery"
                        : "Balance due"}
                    </span>
                    <span className="font-montserrat font-bold text-sm text-amber-900">
                      {money(due)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </form>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.12)]">
          {submitError && (
            <div
              role="alert"
              className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500 hidden sm:block">
              {isDirty ? "You have unsaved changes" : "No changes yet"}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={requestClose}
                disabled={isSaving}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-60 font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-order-form"
                disabled={isSaving || !isDirty}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#00503a] hover:bg-[#003828] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-[#9ef4d0]" />
                )}
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
