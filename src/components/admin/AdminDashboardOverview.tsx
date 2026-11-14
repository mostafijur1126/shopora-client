import React, { useMemo, useState } from "react";
import { Product, OrderItem } from "../../types";
import { AdminManualOrderModal } from "./AdminManualOrderModal";
import { AdminViewOrderModal } from "./AdminViewOrderModal";
import { AdminEditOrderModal } from "./AdminEditOrderModal";
import { AdminTaxInvoiceModal } from "./AdminTaxInvoiceModal";
import {
  Calendar,
  Download,
  Plus,
  Truck,
  Users,
  AlertTriangle,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Package,
  Eye,
  Edit,
  RefreshCw,
} from "lucide-react";

type DateFilter = "today" | "week" | "month" | "all";

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Delivered",
  processing: "Processing",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  processing: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

interface AdminDashboardOverviewProps {
  products?: Product[];
  orders?: OrderItem[];
  customersCount?: number;
  onNavigateTab: (
    tab: "products" | "orders" | "customers" | "staff" | "settings",
  ) => void;
  onAddOrder?: (newOrder: OrderItem) => void;
  onUpdateOrder?: (updatedOrder: OrderItem) => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderItem["status"]) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefreshedAt?: Date | null;
}

// Start of the selected period (null = no lower bound)
const getPeriodStart = (filter: DateFilter): Date | null => {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  switch (filter) {
    case "today":
      return startOfToday;
    case "week": {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - d.getDay()); // Sunday
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    default:
      return null;
  }
};

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  products = [],
  orders = [],
  onNavigateTab,
  onAddOrder,
  onUpdateOrder,
  customersCount = 0,
  onUpdateOrderStatus,
  onRefresh,
  isRefreshing = false,
  lastRefreshedAt = null,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [selectedViewOrder, setSelectedViewOrder] = useState<OrderItem | null>(
    null,
  );
  const [selectedEditOrder, setSelectedEditOrder] = useState<OrderItem | null>(
    null,
  );
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] =
    useState<OrderItem | null>(null);

  // ---- Real metrics, computed only from database data ----
  const { periodOrders, totalSales } = useMemo(() => {
    const start = getPeriodStart(dateFilter);
    const inPeriod = start
      ? orders.filter((o) => {
          const t =
            o.timestamp ||
            (o.createdAt ? new Date(o.createdAt).getTime() : NaN);
          return !Number.isNaN(t) && t >= start.getTime();
        })
      : orders;

    const sales = inPeriod.reduce(
      (sum, o) => sum + (o.status !== "cancelled" ? o.total : 0),
      0,
    );
    return { periodOrders: inPeriod, totalSales: sales };
  }, [orders, dateFilter]);

  const totalCustomers = customersCount;

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) =>
          !p.inStock ||
          (p.stockQty !== undefined &&
            p.stockQty <= (p.lowStockThreshold || 10)),
      ).length,
    [products],
  );

  const handleExportCSV = () => {
    const headers = [
      "Order ID",
      "Customer Name",
      "Phone",
      "Address",
      "Total (BDT)",
      "Status",
      "Date",
    ];
    const rows = periodOrders.map((order) => [
      order.id,
      `"${order.customerName}"`,
      order.phone,
      `"${order.address}"`,
      order.total,
      order.status,
      order.createdAt,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `AmarShop_Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 antialiased font-sans">
      {/* Header: title, date filter, refresh, export, manual order */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191c1d] font-montserrat tracking-tight">
            Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-sans">
            Business Summary
            {lastRefreshedAt && (
              <span className="text-gray-400">
                {" "}
                · Updated {lastRefreshedAt.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <button
              id="admin-date-filter-btn"
              onClick={() => setDateDropdownOpen((open) => !open)}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Calendar className="w-4 h-4 text-[#00503a]" />
              <span>{DATE_FILTER_LABELS[dateFilter]}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95">
                {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map(
                  (filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => {
                        setDateFilter(filterKey);
                        setDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-emerald-50 hover:text-[#00503a] flex items-center justify-between ${
                        dateFilter === filterKey
                          ? "bg-emerald-50 text-[#00503a]"
                          : "text-gray-700"
                      }`}
                    >
                      <span>{DATE_FILTER_LABELS[filterKey]}</span>
                      {dateFilter === filterKey && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00503a]" />
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          {onRefresh && (
            <button
              id="admin-refresh-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-4 h-4 text-[#00503a] ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}

          <button
            id="admin-export-csv-btn"
            onClick={handleExportCSV}
            className="hidden sm:flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-4 h-4 text-gray-600" />
            <span>Export</span>
          </button>

          <button
            id="admin-dashboard-manual-order-btn"
            onClick={() => setIsManualOrderOpen(true)}
            className="flex items-center gap-1.5 bg-[#00503a] hover:bg-[#003828] text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer shrink-0"
            title="Create manual customer order"
          >
            <Plus className="w-4 h-4 text-[#9ef4d0]" />
            <span>Manual Order</span>
          </button>
        </div>
      </div>

      {/* 4 stat cards — all real data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-gray-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="w-8 h-8 rounded-full bg-[#9ef4d0]/60 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-[#00503a]" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs font-semibold text-gray-500">
              Total Sales ({DATE_FILTER_LABELS[dateFilter]})
            </p>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 font-montserrat mt-0.5 tracking-tight">
              {totalSales.toLocaleString()} tk
            </h3>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-white rounded-xl p-3.5 sm:p-4 border border-gray-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[#ffdeaa]/60 flex items-center justify-center">
            <Truck className="w-4 h-4 text-[#5d4000]" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs font-semibold text-gray-500">
              Orders ({DATE_FILTER_LABELS[dateFilter]})
            </p>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 font-montserrat mt-0.5 tracking-tight">
              {periodOrders.length.toLocaleString()}
            </h3>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("customers")}
          className="bg-white rounded-xl p-3.5 sm:p-4 border border-gray-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-700" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs font-semibold text-gray-500">
              Total Customers
            </p>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 font-montserrat mt-0.5 tracking-tight">
              {totalCustomers.toLocaleString()}
            </h3>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("products")}
          className="bg-white rounded-xl p-3.5 sm:p-4 border border-red-100 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-full bg-[#ffdad8] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#bb0027]" />
            </div>
            {lowStockCount > 0 && (
              <span className="bg-[#ffdad8] text-[#bb0027] text-[10px] font-bold font-montserrat px-2 py-0.5 rounded-full">
                Urgent
              </span>
            )}
          </div>
          <div className="mt-2.5">
            <p className="text-xs font-semibold text-red-700">
              Low Stock Items
            </p>
            <h3 className="text-lg sm:text-xl font-black text-[#bb0027] font-montserrat mt-0.5 tracking-tight">
              {lowStockCount} items
            </h3>
          </div>
        </div>
      </div>

      {/* Recent orders & courier panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200/90 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <h3 className="font-bold text-base text-[#191c1d]">
              Recent Orders
            </h3>
            <button
              onClick={() => onNavigateTab("orders")}
              className="text-xs font-bold text-[#00503a] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Orders ({orders.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              No orders yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 mt-2">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/80 px-2.5 rounded-xl transition-colors cursor-pointer group"
                  onClick={() => setSelectedViewOrder(order)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#e7f6f0] text-[#00503a] flex items-center justify-center font-bold font-mono text-xs shrink-0 group-hover:scale-105 transition-transform">
                      {order.id.slice(-4)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-gray-900 truncate">
                          {order.customerName}
                        </p>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {order.phone}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {order.items}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-extrabold text-sm text-[#00503a] font-montserrat">
                        {order.total.toLocaleString()} tk
                      </p>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                          STATUS_STYLES[order.status] ||
                          "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {STATUS_LABELS[order.status] || "Pending"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedViewOrder(order);
                        }}
                        className="p-1.5 rounded-lg bg-[#e7f6f0] text-[#00503a] hover:bg-[#00503a] hover:text-white transition-colors cursor-pointer"
                        title="View Order"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEditOrder(order);
                        }}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                        title="Edit Order"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-sm text-[#191c1d]">
              Courier Logistics
            </h3>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
              Live API
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                letter: "P",
                name: "Pathao Courier",
                area: "Dhaka & Metropolitan",
                color: "bg-red-100 text-red-700",
              },
              {
                letter: "S",
                name: "Steadfast Logistics",
                area: "Nationwide Cash On Delivery",
                color: "bg-orange-100 text-orange-700",
              },
              {
                letter: "R",
                name: "RedX Delivery",
                area: "Sub-urban & Regional COD",
                color: "bg-rose-100 text-rose-700",
              },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-montserrat ${c.color}`}
                  >
                    {c.letter}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">{c.name}</p>
                    <p className="text-[10px] text-gray-500">{c.area}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Connected
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => onNavigateTab("products")}
              className="w-full bg-[#f4f9f6] hover:bg-[#00503a] hover:text-white text-[#00503a] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Manage Products & Inventory</span>
            </button>
          </div>
        </div>
      </div>

      {isManualOrderOpen && (
        <AdminManualOrderModal
          isOpen={isManualOrderOpen}
          onClose={() => setIsManualOrderOpen(false)}
          products={products}
          onAddOrder={(newOrder) => onAddOrder?.(newOrder)}
        />
      )}

      {selectedViewOrder && (
        <AdminViewOrderModal
          order={selectedViewOrder}
          isOpen
          onClose={() => setSelectedViewOrder(null)}
          onEditOrder={(orderToEdit) => {
            setSelectedViewOrder(null);
            setSelectedEditOrder(orderToEdit);
          }}
          onOpenInvoice={(orderToInvoice) => {
            setSelectedViewOrder(null);
            setSelectedInvoiceOrder(orderToInvoice);
          }}
          onUpdateStatus={(orderId, newStatus) => {
            onUpdateOrderStatus?.(orderId, newStatus);
            setSelectedViewOrder((prev) =>
              prev && prev.id === orderId
                ? { ...prev, status: newStatus }
                : prev,
            );
          }}
        />
      )}

      {selectedEditOrder && (
        <AdminEditOrderModal
          order={selectedEditOrder}
          isOpen
          onClose={() => setSelectedEditOrder(null)}
          products={products}
          onUpdateOrder={(updatedOrder) => {
            onUpdateOrder?.(updatedOrder);
            setSelectedEditOrder(null);
          }}
        />
      )}

      {selectedInvoiceOrder && (
        <AdminTaxInvoiceModal
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}
    </div>
  );
};
