import React, { useState, Suspense, lazy } from "react";
import { OrderItem, CourierAssignment, Product } from "../../types";
import {
  ShoppingBag,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Trash2,
  ExternalLink,
  ChevronDown,
  Phone,
  MapPin,
  Filter,
  Check,
  Send,
  PackageCheck,
  Plus,
  Eye,
  Edit,
} from "lucide-react";

// Lazy loaded modals for smaller bundle
const AdminTaxInvoiceModal = lazy(() =>
  import("./AdminTaxInvoiceModal").then((m) => ({
    default: m.AdminTaxInvoiceModal,
  })),
);
const AdminManualOrderModal = lazy(() =>
  import("./AdminManualOrderModal").then((m) => ({
    default: m.AdminManualOrderModal,
  })),
);
const AdminViewOrderModal = lazy(() =>
  import("./AdminViewOrderModal").then((m) => ({
    default: m.AdminViewOrderModal,
  })),
);
const AdminEditOrderModal = lazy(() =>
  import("./AdminEditOrderModal").then((m) => ({
    default: m.AdminEditOrderModal,
  })),
);

interface AdminOrderTrackingProps {
  orders?: OrderItem[];
  products?: Product[];
  onAddOrder?: (newOrder: OrderItem) => void;
  onUpdateOrder?: (updatedOrder: OrderItem) => void | Promise<unknown>;
  onUpdateOrderStatus: (orderId: string, status: OrderItem["status"]) => void;
  onUpdateOrderCourier?: (orderId: string, courier: CourierAssignment) => void;
  onDeleteOrder: (orderId: string) => void;
}

export const AdminOrderTracking: React.FC<AdminOrderTrackingProps> = ({
  orders = [],
  products = [],
  onAddOrder,
  onUpdateOrder,
  onUpdateOrderStatus,
  onUpdateOrderCourier,
  onDeleteOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("all");
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] =
    useState<OrderItem | null>(null);
  const [selectedViewOrder, setSelectedViewOrder] = useState<OrderItem | null>(
    null,
  );
  const [selectedEditOrder, setSelectedEditOrder] = useState<OrderItem | null>(
    null,
  );
  const [courierModalOrder, setCourierModalOrder] = useState<OrderItem | null>(
    null,
  );
  const [selectedCourierPartner, setSelectedCourierPartner] = useState<
    "Pathao" | "RedX" | "Steadfast" | "Paperfly"
  >("Pathao");
  const [customTrackingId, setCustomTrackingId] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleOpenCourierModal = (order: OrderItem) => {
    setCourierModalOrder(order);
    setSelectedCourierPartner((order.courier?.partner as any) || "Pathao");
    setCustomTrackingId(
      order.courier?.trackingId ||
        `${selectedCourierPartner.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`,
    );
  };

  const handleSaveCourierAssignment = () => {
    if (!courierModalOrder) return;
    const trackingId =
      customTrackingId.trim() ||
      `${selectedCourierPartner.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;

    const assignment: CourierAssignment = {
      partner: selectedCourierPartner,
      trackingId,
      assignedAt:
        "Today, " +
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      status: "In Transit",
      courierFee: courierModalOrder.deliveryZone === "outside_dhaka" ? 130 : 70,
    };

    if (onUpdateOrderCourier) {
      onUpdateOrderCourier(courierModalOrder.id, assignment);
    }
    // Also move status to processing / shipped
    onUpdateOrderStatus(courierModalOrder.id, "processing");
    showFeedback(
      `Order #${courierModalOrder.id} successfully assigned to ${selectedCourierPartner}!`,
    );
    setCourierModalOrder(null);
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      order.id.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.phone.includes(query) ||
      order.address.toLowerCase().includes(query) ||
      order.items.toLowerCase().includes(query);

    const matchesStatus =
      selectedStatusFilter === "all" || order.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  if (selectedEditOrder) {
    return (
      <Suspense
        fallback={
          <div role="status" className="rounded-2xl bg-white p-6 text-sm text-gray-500">
            Loading order editor...
          </div>
        }
      >
        <AdminEditOrderModal
          order={selectedEditOrder}
          onBack={() => setSelectedEditOrder(null)}
          products={products}
          onUpdateOrder={async (updatedOrder) => {
            if (onUpdateOrder) {
              await onUpdateOrder(updatedOrder);
            } else {
              onUpdateOrderStatus(updatedOrder.id, updatedOrder.status);
            }
            showFeedback(`Order #${updatedOrder.id} successfully updated!`);
          }}
        />
      </Suspense>
    );
  }

  if (selectedViewOrder) {
    return (
      <Suspense fallback={null}>
        <AdminViewOrderModal
          order={selectedViewOrder}
          onBack={() => setSelectedViewOrder(null)}
          onEditOrder={(orderToEdit) => {
            setSelectedViewOrder(null);
            setSelectedEditOrder(orderToEdit);
          }}
          onOpenInvoice={(orderToInvoice) => {
            setSelectedViewOrder(null);
            setSelectedInvoiceOrder(orderToInvoice);
          }}
          onUpdateStatus={(orderId, newStatus) => {
            onUpdateOrderStatus(orderId, newStatus);
            setSelectedViewOrder((prev) =>
              prev && prev.id === orderId
                ? { ...prev, status: newStatus }
                : prev,
            );
            showFeedback(`Order #${orderId} status changed to ${newStatus}`);
          }}
        />
      </Suspense>
    );
  }

  if (isManualOrderModalOpen) {
    return (
      <Suspense fallback={null}>
        <AdminManualOrderModal
          onBack={() => setIsManualOrderModalOpen(false)}
          products={products}
          onAddOrder={async (newOrder) => {
            const saved = (onAddOrder
              ? onAddOrder(newOrder)
              : undefined) as unknown as OrderItem | null | undefined;
            if (saved !== null) {
              showFeedback(
                `Manual order #${saved?.invoiceId || newOrder.id} created successfully!`,
              );
            }
            return saved;
          }}
          onOpenInvoice={(order) => setSelectedInvoiceOrder(order)}
        />
      </Suspense>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#191c1d] font-montserrat">
              Order Tracking & Couriers
            </h2>
            <span className="bg-[#e7f6f0] text-[#00503a] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#00503a]/20">
              {orders.length} Orders
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Live stream order status updates, Pathao / RedX / Steadfast courier
            assignments & Tax Invoices
          </p>
        </div>

        <div className="flex items-center gap-3">
          {feedbackMsg && (
            <div className="bg-[#e7f6f0] text-[#00503a] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#00503a]/20 animate-in fade-in">
              {feedbackMsg}
            </div>
          )}

          {/* 🌟 New Manual Order Action Button */}
          <button
            id="admin-create-manual-order-btn"
            onClick={() => setIsManualOrderModalOpen(true)}
            className="flex items-center gap-2 bg-[#00503a] hover:bg-[#003828] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0 active:scale-98"
          >
            <Plus className="w-4 h-4 text-[#9ef4d0]" />
            <span>+ Create Manual Order</span>
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, address or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/90 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a] focus:bg-white transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setSelectedStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedStatusFilter === "all"
                  ? "bg-white text-[#00503a] shadow-xs"
                  : "text-gray-500"
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedStatusFilter === "pending"
                  ? "bg-amber-100 text-amber-900 shadow-xs"
                  : "text-gray-500"
              }`}
            >
              Pending ({orders.filter((o) => o.status === "pending").length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("processing")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedStatusFilter === "processing"
                  ? "bg-blue-100 text-blue-900 shadow-xs"
                  : "text-gray-500"
              }`}
            >
              Processing (
              {orders.filter((o) => o.status === "processing").length})
            </button>
            <button
              onClick={() => setSelectedStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedStatusFilter === "completed"
                  ? "bg-emerald-100 text-emerald-900 shadow-xs"
                  : "text-gray-500"
              }`}
            >
              Delivered ({orders.filter((o) => o.status === "completed").length}
              )
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#f8faf9] text-gray-600 font-bold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-3">Customer Info</th>
                <th className="py-3.5 px-3">Ordered Items</th>
                <th className="py-3.5 px-3">Total & Payment</th>
                <th className="py-3.5 px-3">Courier Partner</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-600">
                      No orders found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    {/* Order ID & Time */}
                    <td className="py-3 px-4">
                      <span className="font-bold font-mono text-[#00503a] bg-[#e7f6f0] px-2 py-0.5 rounded text-xs">
                        #{order.id}
                      </span>
                      <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{order.date}</span>
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900">
                        {order.customerName}
                      </p>
                      <p className="text-[11px] font-mono text-gray-600 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#00503a]" />
                        <span>{order.phone}</span>
                      </p>
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {order.address}
                      </p>
                    </td>

                    {/* Items */}
                    <td className="py-3 px-3">
                      <p className="font-semibold text-gray-800 line-clamp-2 text-xs">
                        {order.items}
                      </p>
                      {order.note && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-200 line-clamp-1">
                          Note: {order.note}
                        </p>
                      )}
                    </td>

                    {/* Total & Payment */}
                    <td className="py-3 px-3">
                      <p className="font-black text-[#00503a] font-montserrat text-sm">
                        {order.total.toLocaleString()} tk
                      </p>
                      <span className="inline-block text-[10px] font-bold text-gray-500 uppercase mt-0.5">
                        {order.paymentMethod
                          ? order.paymentMethod.toUpperCase()
                          : "COD"}
                      </span>
                    </td>

                    {/* Courier Partner Assignment */}
                    <td className="py-3 px-3">
                      {order.courier ? (
                        <div>
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#00503a] font-bold text-xs px-2 py-0.5 rounded border border-emerald-200">
                            <Truck className="w-3 h-3 text-[#006a4e]" />
                            <span>{order.courier.partner}</span>
                          </span>
                          <p className="text-[10px] font-mono text-gray-400 mt-1">
                            {order.courier.trackingId}
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenCourierModal(order)}
                          className="inline-flex items-center gap-1 bg-gray-100 hover:bg-[#00503a] hover:text-white text-gray-700 font-bold text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Assign Courier</span>
                        </button>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3 px-3 text-center">
                      <select
                        value={order.status}
                        onChange={(e) => {
                          const newStatus = e.target
                            .value as OrderItem["status"];
                          onUpdateOrderStatus(order.id, newStatus);
                          showFeedback(
                            `Order #${order.id} status updated to: ${newStatus}`,
                          );
                        }}
                        className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border focus:outline-none cursor-pointer ${
                          order.status === "completed"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : order.status === "processing"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : order.status === "cancelled"
                                ? "bg-red-50 text-red-800 border-red-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Invoice & Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Order Modal Button */}
                        <button
                          onClick={() => setSelectedViewOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-[#00503a] hover:text-white text-[#00503a] font-bold text-xs transition-colors cursor-pointer"
                          title="View Order Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">View</span>
                        </button>

                        {/* Edit Order Modal Button */}
                        <button
                          onClick={() => setSelectedEditOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                          title="Edit Order"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Edit</span>
                        </button>

                        {/* Print Invoice Button */}
                        <button
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-800 hover:text-white text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                          title="View Tax Invoice"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">Invoice</span>
                        </button>

                        {/* Delete Order Button */}
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to delete order #${order.id}?`,
                              )
                            ) {
                              onDeleteOrder(order.id);
                              showFeedback(
                                `Order #${order.id} has been deleted.`,
                              );
                            }
                          }}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 transition-colors cursor-pointer"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚚 Courier Assignment Modal */}
      {courierModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-[#00503a] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#9ef4d0]" />
                <h3 className="font-bold text-base font-montserrat">
                  Courier Partner Assignment
                </h3>
              </div>
              <button
                onClick={() => setCourierModalOrder(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              <div>
                <p className="text-xs text-gray-500">Order Reference:</p>
                <p className="font-bold font-mono text-gray-900">
                  #{courierModalOrder.id} - {courierModalOrder.customerName}
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Select Courier Partner
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Pathao", "Steadfast", "RedX", "Paperfly"] as const).map(
                    (partner) => (
                      <button
                        key={partner}
                        type="button"
                        onClick={() => {
                          setSelectedCourierPartner(partner);
                          setCustomTrackingId(
                            `${partner.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`,
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                          selectedCourierPartner === partner
                            ? "border-[#00503a] bg-[#e7f6f0] text-[#00503a]"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span>{partner} Express</span>
                        {selectedCourierPartner === partner && (
                          <Check className="w-4 h-4 text-[#00503a]" />
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Consignment / Tracking ID
                </label>
                <input
                  type="text"
                  value={customTrackingId}
                  onChange={(e) => setCustomTrackingId(e.target.value)}
                  placeholder="e.g. PTH-884920"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#00503a] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCourierModalOrder(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCourierAssignment}
                  className="px-5 py-2 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white font-bold cursor-pointer shadow-xs"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      {selectedInvoiceOrder && (
        <Suspense fallback={null}>
          <AdminTaxInvoiceModal
            order={selectedInvoiceOrder}
            onClose={() => setSelectedInvoiceOrder(null)}
          />
        </Suspense>
      )}

    </div>
  );
};
