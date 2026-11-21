import React, { useState, useMemo, Suspense, lazy } from "react";
import {
  OrderItem,
  OrderedProductSummary,
  Product,
  OrderStatus,
  CourierPartner,
} from "../../types";
import {
  Search,
  Plus,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileText,
  Calendar,
  ChevronDown,
  Edit,
  Trash2,
  Copy,
  Phone,
  MessageCircle,
  Package,
  DollarSign,
  Download,
  Check,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";
import {
  updateOrderStatusApi,
  updateOrderApi,
  deleteOrderApi,
} from "../../services/api";

// Lazy loaded modals for efficient code splitting
const AdminTaxInvoiceModal = lazy(() =>
  import("./AdminTaxInvoiceModal").then((m) => ({
    default: m.AdminTaxInvoiceModal,
  })),
);
const AdminThermalLabelModal = lazy(() =>
  import("./AdminThermalLabelModal").then((m) => ({
    default: m.AdminThermalLabelModal,
  })),
);
const AdminManualOrderModal = lazy(() =>
  import("./AdminManualOrderModal").then((m) => ({
    default: m.AdminManualOrderModal,
  })),
);
const AdminEditOrderModal = lazy(() =>
  import("./AdminEditOrderModal").then((m) => ({
    default: m.AdminEditOrderModal,
  })),
);
const AdminViewOrderModal = lazy(() =>
  import("./AdminViewOrderModal").then((m) => ({
    default: m.AdminViewOrderModal,
  })),
);

interface AdminOrderManagementDashboardProps {
  orders: OrderItem[];
  products: Product[];
  onAddOrder?: (order: OrderItem) => void;
  onUpdateOrder?: (order: OrderItem) => void;
  onUpdateOrderStatus?: (
    id: string,
    status: OrderStatus,
  ) => void | Promise<void>;
  onReviewPayment?: (
    orderId: string,
    paymentId: string,
    data: { status: "verified" | "rejected"; amount?: number },
  ) => Promise<OrderItem | null>;
  onRecordPayment?: (
    orderId: string,
    data: { amount: number; method: "bkash" | "nagad" | "cash" },
  ) => Promise<OrderItem | null>;
  onDeleteOrder?: (id: string) => void;
}

export type CoreStatusTab =
  | "all"
  | "pending"
  | "processing"
  | "courier"
  | "due"
  | "delivered"
  | "returned"
  | "cancelled";

type DatePreset = "all" | "today" | "yesterday" | "7days" | "30days" | "custom";

// The server stores `productId`; older/local data may use `id`
type OrderLine = OrderedProductSummary & { productId?: string };

const CORE_STATUS_TABS: { id: CoreStatusTab; label: string }[] = [
  { id: "all", label: "All Orders" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "courier", label: "Courier Processing" },
  { id: "due", label: "Due Orders" },
  { id: "delivered", label: "Delivered" },
  { id: "returned", label: "Returned" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "delivered", label: "Delivered" },
  { value: "return_received", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
];

const COURIER_LIST: CourierPartner[] = [
  "Steadfast",
  "Pathao",
  "RedX",
  "Paperfly",
  "In-house",
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const orderStatus = (order: OrderItem) => (order.status || "pending").toLowerCase();

const isDeliveredOrder = (order: OrderItem) =>
  ["delivered", "completed"].includes(orderStatus(order));

const isReturnedOrder = (order: OrderItem) =>
  orderStatus(order) === "return_received" ||
  order.courier?.status?.toLowerCase() === "returned";

const isCancelledOrder = (order: OrderItem) =>
  ["cancelled", "incompleted"].includes(orderStatus(order));

const matchesOrderFilter = (
  order: OrderItem,
  filter: Exclude<CoreStatusTab, "all">,
) => {
  const status = orderStatus(order);
  switch (filter) {
    case "pending":
      return status === "pending" && !order.courier?.partner;
    case "processing":
      return (
        ["packing", "processing", "on_hold", "exchange"].includes(status) &&
        !order.courier?.partner
      );
    case "courier":
      return (
        !isDeliveredOrder(order) &&
        !isReturnedOrder(order) &&
        !isCancelledOrder(order) &&
        (["courier", "pickup"].includes(status) ||
          Boolean(order.courier?.partner))
      );
    case "due":
      return getPaymentInfo(order).due > 0;
    case "delivered":
      return isDeliveredOrder(order);
    case "returned":
      return isReturnedOrder(order);
    case "cancelled":
      return isCancelledOrder(order);
  }
};

const getStatusBadge = (status?: string) => {
  const s = (status || "pending").toLowerCase();
  switch (s) {
    case "pending":
      return {
        label: "Pending",
        cls: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "courier":
      return {
        label: "Courier Processing",
        cls: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "pickup":
      return {
        label: "Courier Processing",
        cls: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "packing":
      return {
        label: "Packing",
        cls: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "processing":
    case "on_hold":
    case "exchange":
      return {
        label: s === "on_hold" ? "On hold" : "Processing",
        cls: "bg-blue-50 text-blue-800 border-blue-200",
      };
    case "delivered":
    case "completed":
      return {
        label: "Delivered",
        cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "cancelled":
    case "incompleted":
      return {
        label: "Cancelled",
        cls: "bg-rose-50 text-rose-800 border-rose-200",
      };
    case "return_received":
      return {
        label: "Returned",
        cls: "bg-violet-50 text-violet-800 border-violet-200",
      };
    default:
      return {
        label: status || "Pending",
        cls: "bg-gray-50 text-gray-700 border-gray-200",
      };
  }
};

const money = (n: number | undefined | null) =>
  `${(n ?? 0).toLocaleString()} tk`;

const getInvoiceCode = (order: OrderItem) => order.invoiceId || order.id;

const getTimeLabel = (order: OrderItem) => {
  const ts =
    order.timestamp ||
    (order.createdAt ? new Date(order.createdAt).getTime() : 0);
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPaymentInfo = (order: OrderItem) => {
  const paid = order.paidAmount ?? 0;
  const due = order.dueAmount ?? Math.max(0, order.total - paid);
  return { paid, due };
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  bkash: "bKash Personal",
  nagad: "Nagad Personal",
  card: "Card",
  bank: "Bank",
  cash: "Cash",
};

/* ------------------------------------------------------------------ */
/* small presentational pieces (outside the main component)            */
/* ------------------------------------------------------------------ */

const Thumb: React.FC<{ src?: string; alt: string; className?: string }> = ({
  src,
  alt,
  className = "w-12 h-12",
}) =>
  src ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`${className} rounded-lg object-cover border border-gray-200 bg-gray-100 shrink-0`}
    />
  ) : (
    <div
      className={`${className} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0`}
    >
      <Package className="w-4 h-4" />
    </div>
  );

const Chip: React.FC<{
  children: React.ReactNode;
  swatch?: string;
}> = ({ children, swatch }) => (
  <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 border border-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
    {swatch && (
      <span
        className="w-2.5 h-2.5 rounded-full border border-gray-300 shrink-0"
        style={{ backgroundColor: swatch }}
      />
    )}
    {children}
  </span>
);

const ProductLines: React.FC<{
  order: OrderItem;
  productMap: Map<string, Product>;
}> = ({ order, productMap }) => {
  const lines = (order.orderedProducts || []) as OrderLine[];

  if (lines.length === 0) {
    return (
      <p className="text-xs text-gray-700 font-medium">
        {order.items || "No product details"}
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {lines.map((line, idx) => {
        const product = productMap.get(line.productId || line.id);
        // Orders do not store big base64 images, so use the live product photo
        const image = line.image || product?.image || product?.images?.[0];
        const model = line.selectedModel || line.model;
        const colorHex = line.selectedColor
          ? (product?.colorVariants || []).find(
              (c) => c.name === line.selectedColor,
            )?.hex
          : undefined;

        return (
          <li
            key={`${line.productId || line.id}-${idx}`}
            className="flex gap-2.5"
          >
            <Thumb src={image} alt={line.name} className="w-12 h-12" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">
                {line.name}
              </p>
              {(model || line.selectedSize || line.selectedColor) && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {model && <Chip>Model: {model}</Chip>}
                  {line.selectedSize && <Chip>Size: {line.selectedSize}</Chip>}
                  {line.selectedColor && (
                    <Chip swatch={colorHex}>{line.selectedColor}</Chip>
                  )}
                </div>
              )}
              <p className="text-[11px] text-gray-500 mt-1">
                <span className="font-semibold text-gray-800">
                  {line.quantity}
                </span>{" "}
                × {money(line.price)}
                {line.sku && (
                  <span className="text-gray-400"> · {line.sku}</span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const StatusSelect: React.FC<{
  order: OrderItem;
  onChange: (id: string, status: OrderStatus) => void;
}> = ({ order, onChange }) => {
  const current = (order.status || "pending") as OrderStatus;
  const badge = getStatusBadge(current);
  const inList = STATUS_OPTIONS.some((o) => o.value === current);

  return (
    <div className="relative inline-block">
      <select
        value={current}
        onChange={(e) => onChange(order.id, e.target.value as OrderStatus)}
        aria-label={`Status for order ${getInvoiceCode(order)}`}
        className={`h-8 appearance-none rounded-full border pl-3 pr-7 text-xs font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-[#00503a]/30 ${badge.cls}`}
      >
        {!inList && <option value={current}>{badge.label}</option>}
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
    </div>
  );
};

const CourierCell: React.FC<{ order: OrderItem; onAssign: () => void }> = ({
  order,
  onAssign,
}) =>
  order.courier?.partner ? (
    <div>
      <span className="inline-block rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-800">
        {order.courier.partner}
      </span>
      {order.courier.trackingId && (
        <p className="mt-1 text-[11px] font-mono text-gray-500 break-all">
          {order.courier.trackingId}
        </p>
      )}
    </div>
  ) : (
    <button
      type="button"
      onClick={onAssign}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2.5 text-xs font-medium text-gray-500 hover:border-[#00503a] hover:text-[#00503a] hover:bg-emerald-50 cursor-pointer transition-colors"
    >
      <Truck className="w-3.5 h-3.5" />
      Assign
    </button>
  );

const IconBtn: React.FC<{
  label: string;
  onClick?: () => void;
  href?: string;
  tone?: "default" | "danger" | "whatsapp";
  children: React.ReactNode;
}> = ({ label, onClick, href, tone = "default", children }) => {
  const cls = `inline-flex w-9 h-9 items-center justify-center rounded-lg border text-gray-600 transition-colors cursor-pointer ${
    tone === "danger"
      ? "border-rose-200 text-rose-600 hover:bg-rose-50"
      : tone === "whatsapp"
        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        : "border-gray-200 hover:bg-gray-50 hover:text-gray-900"
  }`;
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={label}
        aria-label={label}
        className={cls}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cls}
    >
      {children}
    </button>
  );
};

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone: string;
}> = ({ label, value, icon, tone }) => (
  <div className="bg-white rounded-2xl border border-gray-200/70 p-3.5 sm:p-5 flex items-center justify-between gap-3 min-w-0">
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
      <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 font-montserrat truncate">
        {value}
      </p>
    </div>
    <div
      className={`w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center ${tone}`}
    >
      {icon}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export const AdminOrderManagementDashboard: React.FC<
  AdminOrderManagementDashboardProps
> = ({
  orders,
  products,
  onAddOrder,
  onUpdateOrder,
  onUpdateOrderStatus,
  onReviewPayment,
  onRecordPayment,
  onDeleteOrder,
}) => {
  // Filters
  const [activeTab, setActiveTab] = useState<CoreStatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilterPreset, setDateFilterPreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);

  // Selection / bulk
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [bulkCourierModalOpen, setBulkCourierModalOpen] = useState(false);
  const [selectedBulkCourier, setSelectedBulkCourier] =
    useState<CourierPartner>("Steadfast");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [viewingOrder, setViewingOrder] = useState<OrderItem | null>(null);
  const [invoiceOrders, setInvoiceOrders] = useState<OrderItem[] | null>(null);
  const [labelOrders, setLabelOrders] = useState<OrderItem[] | null>(null);

  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Fast product lookup: used to show the product photo and colour swatch
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const handleCopyInvoice = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedInvoiceId(text);
    setTimeout(() => setCopiedInvoiceId(null), 2000);
  };

  const { statusCounts, totalRevenue } = useMemo(() => {
    const counts: Record<CoreStatusTab, number> = {
      all: orders.length,
      pending: 0,
      processing: 0,
      courier: 0,
      due: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0,
    };
    let revenue = 0;
    orders.forEach((order) => {
      CORE_STATUS_TABS.forEach(({ id }) => {
        if (id !== "all" && matchesOrderFilter(order, id)) counts[id]++;
      });
      if (!isCancelledOrder(order) && !isReturnedOrder(order))
        revenue += order.total || 0;
    });
    return { statusCounts: counts, totalRevenue: revenue };
  }, [orders]);

  const handleDatePresetSelect = (preset: DatePreset) => {
    setDateFilterPreset(preset);
    setCurrentPage(1);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const today = new Date();

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      setStartDate(fmt(today));
      setEndDate(fmt(today));
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setStartDate(fmt(y));
      setEndDate(fmt(y));
    } else if (preset === "7days" || preset === "30days") {
      const past = new Date();
      past.setDate(past.getDate() - (preset === "7days" ? 7 : 30));
      setStartDate(fmt(past));
      setEndDate(fmt(today));
    }
    setShowCustomDateInputs(preset === "custom");
  };

  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const qDigits = q.replace(/\D/g, "");

    return orders.filter((order) => {
      if (activeTab !== "all" && !matchesOrderFilter(order, activeTab))
        return false;

      if (q) {
        const productMatch = (order.orderedProducts || []).some((p) =>
          (p.name || "").toLowerCase().includes(q),
        );
        const match =
          (order.invoiceId || order.id).toLowerCase().includes(q) ||
          (order.customerName || "").toLowerCase().includes(q) ||
          (qDigits &&
            (order.phone || "").replace(/\D/g, "").includes(qDigits)) ||
          (order.address || "").toLowerCase().includes(q) ||
          (order.courier?.trackingId || "").toLowerCase().includes(q) ||
          productMatch;
        if (!match) return false;
      }

      if (startDate || endDate) {
        const ts =
          order.timestamp || (order.date ? new Date(order.date).getTime() : 0);
        if (startDate && ts < new Date(startDate).setHours(0, 0, 0, 0))
          return false;
        if (endDate && ts > new Date(endDate).setHours(23, 59, 59, 999))
          return false;
      }
      return true;
    });
  }, [orders, activeTab, searchQuery, startDate, endDate]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, safePage, itemsPerPage]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedOrderIds.includes(o.id)),
    [orders, selectedOrderIds],
  );

  const isAllPageSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedOrderIds.includes(o.id));

  const handleToggleSelectAll = () => {
    const pageIds = paginatedOrders.map((o) => o.id);
    setSelectedOrderIds((prev) =>
      isAllPageSelected
        ? prev.filter((id) => !pageIds.includes(id))
        : Array.from(new Set([...prev, ...pageIds])),
    );
  };

  const handleToggleSelectOne = (id: string) =>
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  /* ---------- actions ---------- */

  // All server calls go through App.tsx handlers (they update state and show
  // the success/error toast), so this component never calls the API itself.
  const runBulk = async (task: () => Promise<unknown>) => {
    setIsUpdatingBulk(true);
    try {
      await task();
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    onUpdateOrderStatus?.(orderId, status);
    setViewingOrder((current) =>
      current?.id === orderId ? { ...current, status } : current,
    );
  };

  const handleReviewPayment = async (
    orderId: string,
    paymentId: string,
    data: { status: "verified" | "rejected"; amount?: number },
  ) => {
    const updated = await onReviewPayment?.(orderId, paymentId, data);
    if (updated) setViewingOrder(updated);
    return updated ?? null;
  };

  const handleRecordPayment = async (
    orderId: string,
    data: { amount: number; method: "bkash" | "nagad" | "cash" },
  ) => {
    const updated = await onRecordPayment?.(orderId, data);
    if (updated) setViewingOrder(updated);
    return updated ?? null;
  };

  const handleBulkStatusUpdate = (status: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    return runBulk(async () => {
      await Promise.all(
        selectedOrderIds.map((id) =>
          Promise.resolve(onUpdateOrderStatus?.(id, status)),
        ),
      );
      setSelectedOrderIds([]);
    });
  };

  // Assigns the partner and moves the order to "In courier". The tracking ID is
  // added later (Edit order) or by the courier API integration on the server.
  const handleBulkSendToCourier = () => {
    if (selectedOrders.length === 0) return;
    setBulkCourierModalOpen(false);
    return runBulk(async () => {
      await Promise.all(
        selectedOrders.map((ord) =>
          Promise.resolve(
            onUpdateOrder?.({
              ...ord,
              status: "courier",
              courier: {
                partner: selectedBulkCourier,
                trackingId: ord.courier?.trackingId ?? "",
                assignedAt: new Date().toISOString(),
                status: "Pending",
                ...(ord.deliveryCharge !== undefined
                  ? { courierFee: ord.deliveryCharge }
                  : {}),
              },
            }),
          ),
        ),
      );
      setSelectedOrderIds([]);
    });
  };

  const handleBulkDelete = () => {
    if (selectedOrderIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedOrderIds.length} selected orders? This cannot be undone.`,
      )
    )
      return;
    return runBulk(async () => {
      await Promise.all(
        selectedOrderIds.map((id) => Promise.resolve(onDeleteOrder?.(id))),
      );
      setSelectedOrderIds([]);
    });
  };

  const handleDeleteOne = async (order: OrderItem) => {
    if (!window.confirm(`Delete order #${getInvoiceCode(order)}?`)) return;
    await onDeleteOrder?.(order.id);
    setSelectedOrderIds((prev) => prev.filter((id) => id !== order.id));
  };

  const handleExportCSV = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Invoice ID",
      "Date",
      "Customer",
      "Phone",
      "Address",
      "Products",
      "Status",
      "Courier",
      "Tracking ID",
      "Total",
      "Paid",
      "Due",
    ];
    const rows = filteredOrders.map((o) => {
      const { paid, due } = getPaymentInfo(o);
      const productText = (o.orderedProducts || [])
        .map((p) =>
          [
            `${p.name} x${p.quantity}`,
            p.selectedModel || p.model,
            p.selectedSize && `Size ${p.selectedSize}`,
            p.selectedColor,
          ]
            .filter(Boolean)
            .join(" / "),
        )
        .join(" | ");
      return [
        o.invoiceId || o.id,
        o.date,
        o.customerName,
        o.phone,
        o.address,
        productText || o.items,
        o.status || "pending",
        o.courier?.partner || "",
        o.courier?.trackingId || "",
        o.total,
        paid,
        due,
      ]
        .map(esc)
        .join(",");
    });
    const blob = new Blob(
      ["\uFEFF" + [headers.map(esc).join(","), ...rows].join("\n")],
      {
        type: "text/csv;charset=utf-8;",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Orders_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const whatsappLink = (order: OrderItem) =>
    `https://wa.me/88${order.phone.replace(/\D/g, "").replace(/^88/, "")}?text=${encodeURIComponent(
      `Hello ${order.customerName}, regarding your order #${getInvoiceCode(order)}:`,
    )}`;

  const renderActions = (order: OrderItem) => (
    <div
      className="flex flex-wrap items-center gap-1.5"
      onClick={(event) => event.stopPropagation()}
    >
      <IconBtn label="Edit order" onClick={() => setEditingOrder(order)}>
        <Edit className="w-4 h-4 text-blue-600" />
      </IconBtn>
      <IconBtn label="Print invoice" onClick={() => setInvoiceOrders([order])}>
        <FileText className="w-4 h-4 text-emerald-600" />
      </IconBtn>
      <IconBtn label="Print label" onClick={() => setLabelOrders([order])}>
        <Printer className="w-4 h-4 text-purple-600" />
      </IconBtn>
      {order.phone && order.phone !== "N/A" && (
        <IconBtn label="WhatsApp" href={whatsappLink(order)} tone="whatsapp">
          <MessageCircle className="w-4 h-4" />
        </IconBtn>
      )}
      <IconBtn
        label="Delete order"
        tone="danger"
        onClick={() => handleDeleteOne(order)}
      >
        <Trash2 className="w-4 h-4" />
      </IconBtn>
    </div>
  );

  const renderInvoice = (order: OrderItem) => {
    const code = getInvoiceCode(order);
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-bold text-[#00503a] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
          {code}
        </span>
        <button
          type="button"
          onClick={() => handleCopyInvoice(code)}
          aria-label="Copy invoice code"
          title="Copy invoice code"
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          {copiedInvoiceId === code ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    );
  };

  const renderCustomer = (order: OrderItem) => (
    <div className="space-y-1 min-w-0">
      <p className="text-sm font-bold text-gray-900 leading-tight break-words">
        {order.customerName || "Customer"}
      </p>
      {order.phone && order.phone !== "N/A" && (
        <a
          href={`tel:${order.phone}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00503a] hover:underline"
        >
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono">{order.phone}</span>
        </a>
      )}
      {order.address && (
        <p className="flex items-start gap-1.5 text-xs text-gray-600 leading-snug">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-px" />
          <span className="break-words">
            {order.address}
            {order.district ? ` (${order.district})` : ""}
          </span>
        </p>
      )}
    </div>
  );

  const renderPayment = (order: OrderItem, align: "left" | "right") => {
    const { paid, due } = getPaymentInfo(order);
    return (
      <div className={align === "right" ? "text-right" : ""}>
        <p className="text-sm font-bold text-gray-900 font-montserrat">
          {money(order.total)}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {PAYMENT_LABEL[order.paymentMethod || "cod"] || order.paymentMethod}
        </p>
        <p className="text-[11px] mt-1">
          <span className="text-gray-500">Paid </span>
          <span className="font-semibold text-emerald-700">{money(paid)}</span>
        </p>
        <p className="text-[11px]">
          <span className="text-gray-500">Due </span>
          <span className="font-semibold text-rose-600">{money(due)}</span>
        </p>
        <p className="text-[11px] text-gray-500 capitalize">
          Payment status:{" "}
          {(order.paymentStatus ||
            (paid >= order.total
              ? "paid"
              : paid > 0
                ? "partially_paid"
                : "unpaid")
          ).replace("_", " ")}
        </p>
      </div>
    );
  };

  const pageNumbers = useMemo(() => {
    const count = Math.min(5, totalPages);
    let startPage = 1;
    if (totalPages > 5) {
      startPage = Math.min(Math.max(1, safePage - 2), totalPages - 4);
    }
    return Array.from({ length: count }, (_, i) => startPage + i);
  }, [totalPages, safePage]);

  const hasSelection = selectedOrderIds.length > 0;
  const filtersActive =
    searchQuery || dateFilterPreset !== "all" || activeTab !== "all";

  /* ---------------------------------------------------------------- */
  /* render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className={`space-y-4 sm:space-y-5 font-sans text-gray-900 ${
        hasSelection ? "pb-28" : "pb-10"
      }`}
    >
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total orders"
          value={orders.length.toLocaleString()}
          icon={<Package className="w-5 h-5" />}
          tone="bg-gray-100 text-gray-700"
        />
        <StatCard
          label="Pending"
          value={statusCounts.pending}
          icon={<Clock className="w-5 h-5" />}
          tone="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Delivered"
          value={statusCounts.delivered}
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Revenue"
          value={money(totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          tone="bg-emerald-50 text-[#00503a]"
        />
      </div>

      {/* Search + date + export + add */}
      <div className="bg-white rounded-2xl border border-gray-200/70 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 lg:max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoice, customer, phone, product..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 pl-10 pr-16 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/10 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-xs font-semibold text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="flex items-center h-11 bg-gray-50 border border-gray-200 rounded-xl pl-3">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <select
                value={dateFilterPreset}
                onChange={(e) =>
                  handleDatePresetSelect(e.target.value as DatePreset)
                }
                aria-label="Filter by date"
                className="bg-transparent h-full text-sm font-medium text-gray-700 pl-2 pr-3 outline-none cursor-pointer"
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Export the filtered orders to CSV"
              className="h-11 inline-flex items-center gap-2 px-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-gray-500" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-11 inline-flex items-center gap-2 px-4 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold shadow-sm cursor-pointer active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add order
            </button>
          </div>
        </div>

        {showCustomDateInputs && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Start date"
              className="h-10 bg-white border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-[#00503a]"
            />
            <span className="text-sm text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="End date"
              className="h-10 bg-white border border-gray-200 rounded-xl px-3 text-sm text-gray-700 outline-none focus:border-[#00503a]"
            />
          </div>
        )}

        {/* Status tabs */}
        <div className="-mx-1 px-1 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CORE_STATUS_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`h-10 shrink-0 inline-flex items-center gap-2 px-3.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? "bg-[#00503a] text-white"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                <span
                  className={`min-w-[22px] px-1.5 py-0.5 rounded-full text-[11px] font-semibold text-center ${
                    active ? "bg-white/20 text-white" : "bg-white text-gray-600"
                  }`}
                >
                  {statusCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {paginatedOrders.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/70 py-14 px-4 text-center">
          <Package className="w-10 h-10 mx-auto text-gray-300 mb-2.5" />
          <p className="font-semibold text-gray-800">No orders found</p>
          <p className="text-sm text-gray-500 mt-1">
            {filtersActive
              ? "Try another status, date or search word."
              : "New orders will appear here."}
          </p>
        </div>
      )}

      {/* ============ Mobile + tablet: cards ============ */}
      {paginatedOrders.length > 0 && (
        <div className="lg:hidden space-y-3">
          <label className="flex items-center gap-2.5 px-1 text-sm text-gray-600 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={isAllPageSelected}
              onChange={handleToggleSelectAll}
              className="w-5 h-5 rounded border-gray-300 accent-[#00503a] cursor-pointer"
            />
            Select all on this page
          </label>

          {paginatedOrders.map((order) => {
            const selected = selectedOrderIds.includes(order.id);
            return (
              <article
                key={order.id}
                onClick={() => setViewingOrder(order)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setViewingOrder(order);
                  }
                }}
                className={`bg-white rounded-2xl border p-4 space-y-4 ${
                  selected
                    ? "border-[#00503a] ring-1 ring-[#00503a]/30"
                    : "border-gray-200/70"
                } cursor-pointer`}
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      onClick={(event) => event.stopPropagation()}
                      checked={selected}
                      onChange={() => handleToggleSelectOne(order.id)}
                      aria-label={`Select order ${getInvoiceCode(order)}`}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 accent-[#00503a] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      {renderInvoice(order)}
                      <p className="text-[11px] text-gray-500 mt-1">
                        {order.date}
                        {getTimeLabel(order) && ` · ${getTimeLabel(order)}`}
                        {order.saleType ? ` · ${order.saleType}` : ""}
                      </p>
                    </div>
                  </div>
                  <div onClick={(event) => event.stopPropagation()}>
                    <StatusSelect order={order} onChange={handleStatusChange} />
                  </div>
                </header>

                <ProductLines order={order} productMap={productMap} />

                <div className="border-t border-gray-100 pt-3.5">
                  {renderCustomer(order)}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3.5">
                  <div>
                    <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                      Courier
                    </p>
                    <CourierCell
                      order={order}
                      onAssign={() => setEditingOrder(order)}
                    />
                  </div>
                  {renderPayment(order, "right")}
                </div>

                {order.note && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    Note: {order.note}
                  </p>
                )}

                <div className="border-t border-gray-100 pt-3.5">
                  {renderActions(order)}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ============ Desktop: table ============ */}
      {paginatedOrders.length > 0 && (
        <div className="hidden lg:block bg-white rounded-2xl border border-gray-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm border-collapse">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold border-b border-gray-200/70">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all orders on this page"
                      className="w-4 h-4 rounded border-gray-300 accent-[#00503a] cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">Order</th>
                  <th className="py-3 px-3 min-w-[210px]">Customer</th>
                  <th className="py-3 px-3 min-w-[270px]">Products</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 min-w-[120px]">Courier</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">
                    Payment
                  </th>
                  <th className="py-3 px-4 min-w-[130px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map((order) => {
                  const selected = selectedOrderIds.includes(order.id);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setViewingOrder(order)}
                      className={`align-top hover:bg-gray-50/60 transition-colors cursor-pointer ${
                        selected ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td
                        className="py-4 px-4 text-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleToggleSelectOne(order.id)}
                          aria-label={`Select order ${getInvoiceCode(order)}`}
                          className="w-4 h-4 rounded border-gray-300 accent-[#00503a] cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        {renderInvoice(order)}
                        <p className="text-xs text-gray-900 font-medium mt-1.5">
                          {order.date}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {getTimeLabel(order)}
                          {order.saleType ? ` · ${order.saleType}` : ""}
                        </p>
                      </td>

                      <td className="py-4 px-3 max-w-[260px]">
                        {renderCustomer(order)}
                      </td>

                      <td className="py-4 px-3">
                        <ProductLines order={order} productMap={productMap} />
                        {order.note && (
                          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-2 line-clamp-2">
                            Note: {order.note}
                          </p>
                        )}
                      </td>

                      <td
                        className="py-4 px-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <StatusSelect
                          order={order}
                          onChange={handleStatusChange}
                        />
                      </td>

                      <td
                        className="py-4 px-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <CourierCell
                          order={order}
                          onAssign={() => setEditingOrder(order)}
                        />
                      </td>

                      <td className="py-4 px-3">
                        {renderPayment(order, "right")}
                      </td>

                      <td
                        className="py-4 px-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="max-w-[140px]">
                          {renderActions(order)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/70 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-gray-500">
            <label className="flex items-center gap-2">
              Rows
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-9 bg-white border border-gray-200 rounded-lg px-2 font-medium text-gray-700 outline-none cursor-pointer"
              >
                {[10, 15, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span>
              Showing{" "}
              <strong className="text-gray-800">
                {paginatedOrders.length}
              </strong>{" "}
              of {filteredOrders.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCurrentPage(n)}
                aria-current={safePage === n ? "page" : undefined}
                className={`w-9 h-9 rounded-lg text-sm font-semibold cursor-pointer ${
                  safePage === n
                    ? "bg-[#00503a] text-white"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============ Bulk action bar (appears when orders are selected) ============ */}
      {hasSelection && (
        <div className="fixed z-40 inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 pl-1 pr-2 text-sm font-semibold whitespace-nowrap">
              {selectedOrderIds.length} selected
            </span>

            <select
              value=""
              disabled={isUpdatingBulk}
              onChange={(e) =>
                e.target.value &&
                handleBulkStatusUpdate(e.target.value as OrderStatus)
              }
              aria-label="Change status of selected orders"
              className="h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium px-3 outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="" className="text-gray-900">
                Set status
              </option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="text-gray-900">
                  {o.label}
                </option>
              ))}
            </select>

            {[
              {
                label: "Courier",
                icon: <Truck className="w-4 h-4" />,
                run: () => setBulkCourierModalOpen(true),
              },
              {
                label: "Invoice",
                icon: <FileText className="w-4 h-4" />,
                run: () => setInvoiceOrders(selectedOrders),
              },
              {
                label: "Label",
                icon: <Printer className="w-4 h-4" />,
                run: () => setLabelOrders(selectedOrders),
              },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={b.run}
                disabled={isUpdatingBulk}
                className="h-10 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3 text-sm font-medium cursor-pointer disabled:opacity-50"
              >
                {b.icon}
                {b.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isUpdatingBulk}
              className="h-10 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-500 px-3 text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              {isUpdatingBulk ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              aria-label="Clear selection"
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============ Modals ============ */}

      {bulkCourierModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
          onClick={() => setBulkCourierModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="courier-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between">
              <h3
                id="courier-title"
                className="text-base font-bold text-gray-900 flex items-center gap-2"
              >
                <Truck className="w-4 h-4 text-[#00503a]" />
                Send {selectedOrderIds.length} to courier
              </h3>
              <button
                type="button"
                onClick={() => setBulkCourierModalOpen(false)}
                aria-label="Close"
                className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label
                htmlFor="bulk-courier"
                className="text-sm font-medium text-gray-700 block mb-1.5"
              >
                Courier partner
              </label>
              <select
                id="bulk-courier"
                value={selectedBulkCourier}
                onChange={(e) =>
                  setSelectedBulkCourier(e.target.value as CourierPartner)
                }
                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-base sm:text-sm font-medium bg-gray-50 focus:bg-white focus:border-[#00503a] outline-none cursor-pointer"
              >
                {COURIER_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                The status changes to "In courier". Add the tracking ID later
                from Edit order.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBulkCourierModalOpen(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSendToCourier}
                disabled={isUpdatingBulk}
                className="flex-1 h-11 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold cursor-pointer disabled:opacity-60"
              >
                Send to courier
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AdminManualOrderModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            products={products}
            onAddOrder={(newOrd) =>
              onAddOrder ? onAddOrder(newOrd) : undefined
            }
            onOpenInvoice={(ord) => setInvoiceOrders([ord])}
          />
        </Suspense>
      )}

      {editingOrder && (
        <Suspense fallback={null}>
          <AdminEditOrderModal
            order={editingOrder}
            isOpen={!!editingOrder}
            onClose={() => setEditingOrder(null)}
            products={products}
            onUpdateOrder={(updated) => {
              if (onUpdateOrder) onUpdateOrder(updated);
              setEditingOrder(null);
            }}
          />
        </Suspense>
      )}

      {viewingOrder && (
        <Suspense fallback={null}>
          <AdminViewOrderModal
            order={viewingOrder}
            isOpen
            onClose={() => setViewingOrder(null)}
            onEditOrder={(order) => {
              setViewingOrder(null);
              setEditingOrder(order);
            }}
            onOpenInvoice={(order) => {
              setViewingOrder(null);
              setInvoiceOrders([order]);
            }}
            onUpdateStatus={handleStatusChange}
            onReviewPayment={handleReviewPayment}
            onRecordPayment={handleRecordPayment}
          />
        </Suspense>
      )}

      {invoiceOrders && invoiceOrders.length > 0 && (
        <Suspense fallback={null}>
          <AdminTaxInvoiceModal
            orders={invoiceOrders}
            onClose={() => setInvoiceOrders(null)}
          />
        </Suspense>
      )}

      {labelOrders && labelOrders.length > 0 && (
        <Suspense fallback={null}>
          <AdminThermalLabelModal
            orders={labelOrders}
            onClose={() => setLabelOrders(null)}
          />
        </Suspense>
      )}
    </div>
  );
};
