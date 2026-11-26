import React from "react";
import { OrderItem, CourierAssignment } from "../../types";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  DollarSign,
  Package,
  Calendar,
  FileText,
  Edit,
  MessageSquare,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ExternalLink,
  CreditCard,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";

interface AdminViewOrderModalProps {
  order: OrderItem;
  onBack: () => void;
  onEditOrder?: (order: OrderItem) => void;
  onOpenInvoice?: (order: OrderItem) => void;
  onUpdateStatus?: (orderId: string, status: OrderItem["status"]) => void;
  onReviewPayment?: (
    orderId: string,
    paymentId: string,
    data: { status: "verified" | "rejected"; amount?: number },
  ) => Promise<OrderItem | null>;
  onRecordPayment?: (
    orderId: string,
    data: { amount: number; method: "bkash" | "nagad" | "cash" },
  ) => Promise<OrderItem | null>;
}

export const AdminViewOrderModal: React.FC<AdminViewOrderModalProps> = ({
  order,
  onBack,
  onEditOrder,
  onOpenInvoice,
  onUpdateStatus,
  onReviewPayment,
  onRecordPayment,
}) => {
  const [copiedTracking, setCopiedTracking] = React.useState(false);
  const [paymentAmounts, setPaymentAmounts] = React.useState<
    Record<string, string>
  >({});
  const [newPaymentAmount, setNewPaymentAmount] = React.useState("");
  const [newPaymentMethod, setNewPaymentMethod] = React.useState<
    "bkash" | "nagad" | "cash"
  >("cash");
  const [paymentBusy, setPaymentBusy] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState("");
  const [failedPaymentScreenshots, setFailedPaymentScreenshots] =
    React.useState<Record<string, boolean>>({});
  const [previewPaymentScreenshot, setPreviewPaymentScreenshot] =
    React.useState<{ url: string; label: string } | null>(null);
  const [previewZoom, setPreviewZoom] = React.useState(1);

  const deliveryCharge =
    order.deliveryCharge !== undefined
      ? order.deliveryCharge
      : order.deliveryZone === "outside_dhaka"
        ? 130
        : 70;
  const discount = order.discount ?? 0;
  const subtotal =
    order.subtotal ??
    (order.orderedProducts && order.orderedProducts.length > 0
      ? order.orderedProducts.reduce((acc, p) => acc + p.price * p.quantity, 0)
      : Math.max(0, order.total - deliveryCharge + discount));
  const totalQuantity = order.orderedProducts?.reduce(
    (quantity, item) => quantity + item.quantity,
    0,
  );
  const paymentsToDisplay =
    order.payments && order.payments.length > 0
      ? order.payments
      : order.paymentProof
        ? [
            {
              id: "legacy-payment-proof",
              amount: order.paymentProof.amount,
              method: order.paymentMethod === "nagad" ? "nagad" as const : "bkash" as const,
              transactionId: order.paymentProof.transactionId,
              screenshot: order.paymentProof.screenshot,
              status: "pending" as const,
            },
          ]
        : [];

  React.useEffect(() => {
    if (!previewPaymentScreenshot) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewPaymentScreenshot(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewPaymentScreenshot]);

  const getVariantAttributes = (
    item: NonNullable<OrderItem["orderedProducts"]>[number],
  ) => {
    const attributes = { ...(item.selectedVariantAttributes || {}) };
    const addLegacyAttribute = (name: string, value?: string) => {
      if (
        value &&
        !Object.keys(attributes).some(
          (existing) => existing.toLowerCase() === name.toLowerCase(),
        )
      ) {
        attributes[name] = value;
      }
    };
    addLegacyAttribute("Model", item.selectedModel || item.model);
    addLegacyAttribute("Size", item.selectedSize);
    addLegacyAttribute("Color", item.selectedColor);
    return Object.entries(attributes);
  };

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const getWhatsAppLink = () => {
    const cleanPhone = order.phone.replace(/[^0-9]/g, "");
    const internationalPhone = cleanPhone.startsWith("88")
      ? cleanPhone
      : `88${cleanPhone}`;
    const text = `Hello ${order.customerName},\nThis is regarding your Shopora order #${order.id}.\nItems: ${order.items}\nTotal: ${order.total} tk\nDelivery Address: ${order.address}`;
    return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(text)}`;
  };

  const getStatusBadge = (status: OrderItem["status"]) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          icon: CheckCircle2,
          label: "Delivered / Completed",
        };
      case "processing":
        return {
          bg: "bg-blue-100 text-blue-900 border-blue-300",
          icon: Clock,
          label: "Processing / Confirmed",
        };
      case "courier":
      case "pickup":
        return {
          bg: "bg-blue-100 text-blue-900 border-blue-300",
          icon: Clock,
          label: "Courier Processing",
        };
      case "cancelled":
        return {
          bg: "bg-red-100 text-red-900 border-red-300",
          icon: XCircle,
          label: "Cancelled",
        };
      case "return_received":
        return {
          bg: "bg-violet-100 text-violet-900 border-violet-300",
          icon: RotateCcw,
          label: "Returned",
        };
      default:
        return {
          bg: "bg-amber-100 text-amber-900 border-amber-300",
          icon: AlertCircle,
          label: "Pending Confirmation",
        };
    }
  };

  const statusBadge = getStatusBadge(order.status);
  const StatusIcon = statusBadge.icon;
  const paidAmount = order.paidAmount ?? 0;
  const dueAmount = order.dueAmount ?? Math.max(0, order.total - paidAmount);
  const paymentStatus =
    order.paymentStatus ??
    (paidAmount >= order.total
      ? "paid"
      : paidAmount > 0
        ? "partially_paid"
        : "unpaid");

  const reviewPayment = async (
    paymentId: string,
    status: "verified" | "rejected",
  ) => {
    if (!onReviewPayment) return;
    setPaymentBusy(true);
    setPaymentError("");
    try {
      const amountValue = paymentAmounts[paymentId];
      const updated = await onReviewPayment(order.id, paymentId, {
        status,
        ...(status === "verified" && amountValue
          ? { amount: Number(amountValue) }
          : {}),
      });
      if (!updated) setPaymentError("Payment could not be updated.");
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : "Payment could not be updated.",
      );
    } finally {
      setPaymentBusy(false);
    }
  };

  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onRecordPayment) return;
    setPaymentBusy(true);
    setPaymentError("");
    try {
      const updated = await onRecordPayment(order.id, {
        amount: Number(newPaymentAmount),
        method: newPaymentMethod,
      });
      if (updated) setNewPaymentAmount("");
      else setPaymentError("Payment could not be recorded.");
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : "Payment could not be recorded.",
      );
    } finally {
      setPaymentBusy(false);
    }
  };

  return (
    <>
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col font-sans">
      {/* Page Header */}
      <div className="p-4 sm:p-5 bg-[#003828] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Package className="w-5 h-5 text-[#9ef4d0]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-montserrat break-words">
                  Order Details: #{order.id}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  <span>{statusBadge.label}</span>
                </span>
              </div>
              <p className="text-xs text-emerald-200 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Placed on: {order.date}</span>
              </p>
            </div>
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            {onEditOrder && (
              <button
                onClick={() => {
                  onBack();
                  onEditOrder(order);
                }}
                className="min-h-11 flex items-center justify-center gap-1.5 bg-[#9ef4d0] hover:bg-[#8ee5c0] text-[#003828] text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                title="Edit this Order"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Order</span>
              </button>
            )}

            {onOpenInvoice && (
              <button
                onClick={() => {
                  onBack();
                  onOpenInvoice(order);
                }}
                className="min-h-11 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                title="Print Packing Invoice"
              >
                <FileText className="w-3.5 h-3.5 text-[#9ef4d0]" />
                <span>Invoice</span>
              </button>
            )}

            <button
              onClick={onBack}
              className="min-h-11 col-span-2 sm:col-span-1 sm:w-auto rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 px-3 transition-colors cursor-pointer text-xs font-bold"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
        </div>
      </div>

        {/* Order Details */}
        <div className="p-3 sm:p-5 lg:p-6 space-y-5 bg-gray-50/50 text-xs sm:text-sm">
          {/* Quick Status Control Bar */}
          {onUpdateStatus && (
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700">
                  Quick Change Status:
                </span>
                <span className="text-xs text-gray-500">
                  Update current fulfillment state
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, "pending")}
                  className={`min-h-11 px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    order.status === "pending"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, "processing")}
                  className={`min-h-11 px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    order.status === "processing"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Processing / Shipped
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, "completed")}
                  className={`min-h-11 px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    order.status === "completed"
                      ? "bg-[#00503a] text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Delivered
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, "return_received")}
                  className={`min-h-11 px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    order.status === "return_received"
                      ? "bg-violet-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Returned
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, "cancelled")}
                  className={`min-h-11 px-2.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    order.status === "cancelled"
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Cancelled
                </button>
              </div>
            </div>
          )}

          {/* 2-Column Info Grid: Customer Info & Courier / Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Information Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2 text-[#003828] font-bold text-sm">
                  <User className="w-4 h-4 text-[#00503a]" />
                  <span>Customer Information</span>
                </div>
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
                    Full Name
                  </span>
                  <p                   className="font-bold text-gray-900 text-sm break-words">
                    {order.customerName}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
                      Phone Number
                    </span>
                    <a
                      href={`tel:${order.phone}`}
                      className="font-mono font-bold text-[#00503a] hover:underline text-sm flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{order.phone}</span>
                    </a>
                  </div>
                  {order.email && (
                    <div>
                      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
                        Email
                      </span>
                      <p className="text-gray-700 text-xs flex items-center gap-1 break-all">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{order.email}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">
                    Delivery Address
                  </span>
                  <p className="text-gray-800 flex items-start gap-1.5 mt-0.5 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                    <MapPin className="w-4 h-4 text-[#00503a] shrink-0 mt-0.5" />
                    <span className="break-words">{order.address}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {order.district && (
                    <div>
                      <span className="text-gray-500">District: </span>
                      <span className="font-bold text-gray-800">
                        {order.district}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Zone: </span>
                    <span className="font-bold text-[#00503a]">
                      {order.deliveryZone === "outside_dhaka"
                        ? "Outside Dhaka (130 tk)"
                        : order.deliveryZone === "sub_dhaka"
                          ? "Dhaka Sub-urban (100 tk)"
                          : "Inside Dhaka (70 tk)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Courier & Shipping Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2 text-[#003828] font-bold text-sm">
                    <Truck className="w-4 h-4 text-[#00503a]" />
                    <span>Courier & Logistics</span>
                  </div>
                  {order.courier ? (
                    <span className="bg-emerald-50 text-[#00503a] text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                      Assigned
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-200">
                      Unassigned
                    </span>
                  )}
                </div>

                {order.courier ? (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap justify-between items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 block">
                          Partner
                        </span>
                        <p className="font-bold text-sm text-[#00503a]">
                          {order.courier.partner} Courier
                        </p>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg">
                        {order.courier.status || "In Transit"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200/80">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-gray-500 block">
                          Tracking Code
                        </span>
                        <p className="font-mono font-bold text-xs text-gray-900 break-all">
                          {order.courier.trackingId}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleCopyTracking(order.courier?.trackingId || "")
                        }
                        className="min-h-11 flex items-center gap-1 text-[11px] font-bold text-[#00503a] hover:bg-emerald-50 px-2 py-1 rounded border border-gray-200 cursor-pointer"
                      >
                        {copiedTracking ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedTracking ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {order.courier.assignedAt && (
                      <p className="text-[11px] text-gray-500">
                        Assigned on: {order.courier.assignedAt}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <p className="text-xs text-gray-500">
                      No courier service has been assigned yet.
                    </p>
                    {onEditOrder && (
                      <button
                        onClick={() => {
                                  onBack();
                          onEditOrder(order);
                        }}
                        className="inline-flex items-center gap-1.5 bg-[#00503a] text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-[#003828] transition-all cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Assign Courier Partner</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {order.note && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    Special Instructions:
                  </span>
                  <p className="text-amber-800">{order.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5 text-[#003828] font-bold text-sm">
              <CreditCard className="w-4 h-4 text-[#00503a]" />
              <span>Payment Information</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Order Total</span>
                <strong>{order.total.toLocaleString()} tk</strong>
              </div>
              <div>
                <span className="text-gray-500 block">Paid</span>
                <strong className="text-emerald-700">
                  {paidAmount.toLocaleString()} tk
                </strong>
              </div>
              <div>
                <span className="text-gray-500 block">Due</span>
                <strong className="text-amber-700">
                  {dueAmount.toLocaleString()} tk
                </strong>
              </div>
              <div>
                <span className="text-gray-500 block">Payment Status</span>
                <strong className="capitalize">
                  {paymentStatus.replace("_", " ")}
                </strong>
              </div>
            </div>
            <p className="text-xs text-gray-700">
              Method:{" "}
              <strong>
                {order.paymentMethod === "bkash"
                  ? "bKash Personal"
                  : order.paymentMethod === "nagad"
                    ? "Nagad Personal"
                    : order.paymentMethod === "cod"
                      ? "Cash on Delivery (COD)"
                      : order.paymentMethod || "Cash on Delivery (COD)"}
              </strong>
            </p>

            {paymentsToDisplay.length > 0 && (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                {paymentsToDisplay.map((payment, index) => {
                  const paymentId = payment.id || payment._id || `payment-${index}`;
                  const screenshotUrl = payment.screenshot || "";
                  const isLegacyProof = paymentId === "legacy-payment-proof";
                  const paymentMethodLabel =
                    payment.method === "bkash"
                      ? "bKash"
                      : payment.method === "nagad"
                        ? "Nagad"
                        : "Cash";
                  return (
                    <div
                      key={paymentId}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2"
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-xs">
                        <strong>
                          {paymentMethodLabel} ·{" "}
                          {payment.amount.toLocaleString()} tk
                          {payment.status === "pending" ? " submitted" : ""}
                        </strong>
                        <span className="capitalize">{payment.status}</span>
                      </div>
                      {payment.transactionId && (
                        <p className="text-xs">
                          TrxID: <span className="font-mono">{payment.transactionId}</span>
                        </p>
                      )}
                      {screenshotUrl && (
                        failedPaymentScreenshots[paymentId] ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-amber-800">
                              Screenshot preview unavailable.
                            </span>
                            <a
                              href={screenshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[#00503a] underline"
                            >
                              Open original
                            </a>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewZoom(1);
                              setPreviewPaymentScreenshot({
                                url: screenshotUrl,
                                label: `${paymentMethodLabel} payment proof`,
                              });
                            }}
                            className="inline-flex min-h-11 items-center gap-2 text-left text-xs font-bold text-[#00503a] underline"
                          >
                            <img
                              src={screenshotUrl}
                              alt={`${paymentMethodLabel} payment proof`}
                              onError={() =>
                                setFailedPaymentScreenshots((previous) => ({
                                  ...previous,
                                  [paymentId]: true,
                                }))
                              }
                              className="h-14 w-14 rounded-lg border border-gray-200 object-cover"
                            />
                            View payment screenshot
                          </button>
                        )
                      )}
                      {!isLegacyProof &&
                        payment.status === "pending" &&
                        onReviewPayment && (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs text-gray-600">
                            Received amount
                            <input
                              type="number"
                              min={0.01}
                              max={dueAmount}
                              step="0.01"
                              value={
                                paymentAmounts[paymentId] ??
                                String(payment.amount)
                              }
                              onChange={(event) =>
                                setPaymentAmounts((previous) => ({
                                  ...previous,
                                  [paymentId]: event.target.value,
                                }))
                              }
                              className="ml-2 h-11 w-28 rounded-lg border border-gray-300 bg-white px-2"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={paymentBusy}
                            onClick={() => reviewPayment(paymentId, "verified")}
                            className="min-h-11 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white disabled:opacity-60"
                          >
                            Verify payment
                          </button>
                          <button
                            type="button"
                            disabled={paymentBusy}
                            onClick={() => reviewPayment(paymentId, "rejected")}
                            className="min-h-11 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-60"
                          >
                            Reject proof
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {onRecordPayment && dueAmount > 0 && (
              <form
                onSubmit={recordPayment}
                className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3"
              >
                <label className="text-xs font-semibold text-gray-600">
                  Record received payment
                  <input
                    type="number"
                    min={0.01}
                    max={dueAmount}
                    step="0.01"
                    required
                    value={newPaymentAmount}
                    onChange={(event) => setNewPaymentAmount(event.target.value)}
                    className="mt-1 block h-10 w-32 rounded-lg border border-gray-300 bg-white px-2"
                  />
                </label>
                <select
                  value={newPaymentMethod}
                  onChange={(event) =>
                    setNewPaymentMethod(
                      event.target.value as "bkash" | "nagad" | "cash",
                    )
                  }
                  className="min-h-11 rounded-lg border border-gray-300 bg-white px-2 text-xs"
                >
                  <option value="cash">Cash / COD</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                </select>
                <button
                  type="submit"
                  disabled={paymentBusy}
                  className="min-h-11 rounded-lg bg-[#00503a] px-3 text-xs font-bold text-white disabled:opacity-60"
                >
                  Add payment
                </button>
              </form>
            )}
            {paymentError && (
              <p role="alert" className="text-xs font-semibold text-red-700">
                {paymentError}
              </p>
            )}
          </div>

          {/* Ordered Products */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#003828] font-bold text-sm">
                <Package className="w-4 h-4 text-[#00503a]" />
                <span>Ordered Items & Quantities</span>
              </div>
              <span className="text-xs text-gray-500 font-semibold">
                Payment:{" "}
                {order.paymentMethod
                  ? order.paymentMethod.toUpperCase()
                  : "Cash on Delivery"}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {order.orderedProducts && order.orderedProducts.length > 0 ? (
                order.orderedProducts.map((item, idx) => {
                  const attributes = getVariantAttributes(item);
                  const regularPrice = item.regularPrice ?? item.price;
                  return (
                    <article
                      key={`${item.id || "item"}-${item.selectedVariantKey || ""}-${idx}`}
                      className="space-y-3 p-3 sm:p-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-14 w-14 object-cover rounded-lg border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 break-words">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-600">
                            Brand: {item.brand || "Not recorded"}
                          </p>
                          {item.sku && (
                            <p className="text-[10px] font-mono text-gray-500 break-all">
                              {item.selectedVariantKey && !item.variantSku
                                ? "Recorded SKU"
                                : "Product SKU"}
                              : {item.sku}
                            </p>
                          )}
                          {item.variantSku && (
                            <p className="text-[10px] font-mono text-gray-500 break-all">
                              Variant SKU: {item.variantSku}
                            </p>
                          )}
                          {attributes.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {attributes.map(([name, value]) => (
                                <span
                                  key={name}
                                  className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-900"
                                >
                                  {name}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-xs sm:grid-cols-5">
                        <div>
                          <p className="text-[10px] text-gray-500">Regular price</p>
                          <p className="font-semibold text-gray-700">
                            {regularPrice.toLocaleString()} tk
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Sale price</p>
                          <p className="font-semibold text-gray-700">
                            {item.salePrice !== undefined
                              ? `${item.salePrice.toLocaleString()} tk`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Ordered price</p>
                          <p className="font-bold text-gray-900">
                            {item.price.toLocaleString()} tk
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Quantity</p>
                          <p className="font-bold text-gray-900">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Product subtotal</p>
                          <p className="font-bold text-[#00503a]">
                            {(item.price * item.quantity).toLocaleString()} tk
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="p-4 text-xs text-gray-700">
                  <p className="font-bold text-gray-900">{order.items}</p>
                  <p className="mt-1 text-gray-500">
                    Item-level product details were not recorded for this order.
                  </p>
                </div>
              )}
            </div>

            {/* Financial Summary Calculation Card */}
            <div className="p-4 bg-gray-50/70 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-xs text-gray-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#00503a]" />
                  <span>
                    Official computerized record in Shopora admin database
                  </span>
                </p>
                <p className="font-mono text-[11px]">Ref ID: #{order.id}</p>
              </div>

              <div className="w-full sm:w-72 bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Total product quantity:</span>
                  <span className="font-bold">
                    {totalQuantity === undefined
                      ? "Not recorded"
                      : totalQuantity.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-montserrat font-bold">
                    {subtotal.toLocaleString()} tk
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping charge:</span>
                  <span className="font-montserrat font-bold">
                    {deliveryCharge.toLocaleString()} tk
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Discount:</span>
                  <span className="font-montserrat font-bold">
                    {discount > 0 ? `−${discount.toLocaleString()}` : "0"} tk
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-extrabold text-[#00503a]">
                  <span>Total order amount:</span>
                  <span className="font-montserrat font-extrabold text-base">
                    {order.total.toLocaleString()} tk
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Actions */}
        <div className="p-3 sm:p-5 bg-white border-t border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="grid grid-cols-2 sm:flex gap-2 w-full md:w-auto">
            {onOpenInvoice && (
              <button
                onClick={() => {
                  onBack();
                  onOpenInvoice(order);
                }}
                className="min-h-11 flex items-center justify-center gap-2 bg-[#00503a] hover:bg-[#003828] text-white px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#9ef4d0]" />
                <span>Print Invoice</span>
              </button>
            )}

            {onEditOrder && (
              <button
                onClick={() => {
                  onBack();
                  onEditOrder(order);
                }}
                className="min-h-11 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                <Edit className="w-4 h-4 text-gray-600" />
                <span>Edit Order</span>
              </button>
            )}
          </div>

          <button
            onClick={onBack}
            className="min-h-11 w-full md:w-auto px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors cursor-pointer"
          >
            Back
          </button>
        </div>
    </div>
    {previewPaymentScreenshot && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={previewPaymentScreenshot.label}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-3 sm:p-6"
        onClick={() => setPreviewPaymentScreenshot(null)}
      >
        <button
          type="button"
          aria-label="Close image preview"
          onClick={() => setPreviewPaymentScreenshot(null)}
          className="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <X className="h-5 w-5" />
        </button>
        <div
          className="flex max-h-full w-full flex-col items-center gap-3"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex min-h-11 items-center gap-2 text-white">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={previewZoom <= 1}
              onClick={() =>
                setPreviewZoom((zoom) =>
                  Math.max(1, Number((zoom - 0.25).toFixed(2))),
                )
              }
              className="min-h-11 min-w-11 rounded-lg bg-white/15 disabled:opacity-40"
            >
              <ZoomOut className="mx-auto h-5 w-5" />
            </button>
            <span className="min-w-12 text-center text-xs">
              {Math.round(previewZoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={previewZoom >= 3}
              onClick={() =>
                setPreviewZoom((zoom) =>
                  Math.min(3, Number((zoom + 0.25).toFixed(2))),
                )
              }
              className="min-h-11 min-w-11 rounded-lg bg-white/15 disabled:opacity-40"
            >
              <ZoomIn className="mx-auto h-5 w-5" />
            </button>
            <a
              href={previewPaymentScreenshot.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-semibold hover:bg-white/25"
            >
              <ExternalLink className="h-4 w-4" />
              Open original
            </a>
          </div>
          <div className="max-h-[85vh] max-w-full overflow-auto">
            <img
              src={previewPaymentScreenshot.url}
              alt={previewPaymentScreenshot.label}
              className="max-h-[85vh] max-w-[94vw] object-contain transition-transform"
              style={{ transform: `scale(${previewZoom})` }}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
};
