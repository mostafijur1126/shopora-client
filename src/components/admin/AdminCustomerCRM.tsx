import React, { useMemo, useState } from "react";
import { CustomerCRM, OrderItem } from "../../types";
import type { CustomerDirectoryRecord } from "../../services/api";
import {
  Users,
  Search,
  Crown,
  Award,
  Shield,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  X,
} from "lucide-react";

interface AdminCustomerCRMProps {
  customers: CustomerDirectoryRecord[];
}

// Business rules (change here if your loyalty rules change)
const PLATINUM_MIN_SPENT = 50000;
const GOLD_MIN_SPENT = 20000;
const WINBACK_AFTER_DAYS = 60;
const NOT_COUNTED_STATUSES = ["cancelled", "draft"];

type CustomerRow = CustomerCRM & { orders: CustomerDirectoryRecord["orders"] };

const toRow = (customer: CustomerDirectoryRecord, now: number): CustomerRow => {
  const lastOrder = customer.lastOrderDate
    ? new Date(customer.lastOrderDate)
    : null;
  const orders = customer.orders || [];
  const totalSpent = orders
    .filter((order) => !NOT_COUNTED_STATUSES.includes(order.status))
    .reduce((sum, order) => sum + (Number(order.total) || 0), 0);

  return {
    id: customer.id,
    name: customer.name || "Customer",
    phone: customer.phone || "",
    email: customer.email || undefined,
    location: customer.address || "Address not provided",
    totalOrders: Number(customer.totalOrders) || 0,
    totalSpent,
    tier:
      totalSpent >= PLATINUM_MIN_SPENT
        ? "Platinum VIP"
        : totalSpent >= GOLD_MIN_SPENT
          ? "Gold"
          : "Silver",
    joinedDate: customer.createdAt
      ? new Date(customer.createdAt).toLocaleDateString()
      : "—",
    lastOrderDate: lastOrder ? lastOrder.toLocaleDateString() : "No orders",
    status:
      lastOrder && now - lastOrder.getTime() > WINBACK_AFTER_DAYS * 86400000
        ? "Inactive"
        : "Active",
    isGuest: Boolean(customer.isGuest),
    orders,
  };
};

const getTierBadge = (tier: CustomerCRM["tier"]) => {
  switch (tier) {
    case "Platinum VIP":
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-200 text-xs font-black px-2.5 py-0.5 rounded-full">
          <Crown className="w-3.5 h-3.5 text-purple-700" />
          <span>Platinum VIP</span>
        </span>
      );
    case "Gold":
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black px-2.5 py-0.5 rounded-full">
          <Award className="w-3.5 h-3.5 text-amber-700" />
          <span>Gold Member</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
          <Shield className="w-3.5 h-3.5 text-slate-600" />
          <span>Silver Member</span>
        </span>
      );
  }
};

export const AdminCustomerCRM: React.FC<AdminCustomerCRMProps> = ({
  customers: records = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("all");
  const [inspectingId, setInspectingId] = useState<string | null>(null);

  const customers = useMemo(() => {
    const now = Date.now();
    return records.map((record) => toRow(record, now));
  }, [records]);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return customers.filter((cust) => {
      const matchesSearch =
        !query ||
        cust.name.toLowerCase().includes(query) ||
        cust.phone.includes(query) ||
        (cust.email && cust.email.toLowerCase().includes(query)) ||
        cust.location.toLowerCase().includes(query);

      const matchesTier =
        selectedTierFilter === "all" ||
        (selectedTierFilter === "winback"
          ? cust.status === "Inactive"
          : cust.tier === selectedTierFilter);

      return matchesSearch && matchesTier;
    });
  }, [customers, searchQuery, selectedTierFilter]);

  const counts = useMemo(
    () => ({
      platinum: customers.filter((c) => c.tier === "Platinum VIP").length,
      gold: customers.filter((c) => c.tier === "Gold").length,
      silver: customers.filter((c) => c.tier === "Silver").length,
      winback: customers.filter((c) => c.status === "Inactive").length,
    }),
    [customers],
  );

  const inspecting = inspectingId
    ? customers.find((c) => c.id === inspectingId) || null
    : null;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#191c1d] font-montserrat">
              Customer Directory & CRM
            </h2>
            <span className="bg-[#e7f6f0] text-[#00503a] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#00503a]/20">
              {customers.length} Profiles
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Registered accounts and guest customers with verified orders
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <span className="bg-purple-50 text-purple-800 px-3 py-1 rounded-xl border border-purple-200">
            VIP: {counts.platinum}
          </span>
          <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-xl border border-amber-200">
            Gold: {counts.gold}
          </span>
          <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-xl border border-slate-200">
            Silver: {counts.silver}
          </span>
        </div>
      </div>

      {/* Search & filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone number or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/90 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 text-xs font-bold overflow-x-auto">
            {[
              {
                id: "all",
                label: `All Customers (${customers.length})`,
                active: "bg-white text-[#00503a] shadow-xs",
                idle: "text-gray-500",
              },
              {
                id: "Platinum VIP",
                label: "Platinum VIP",
                active: "bg-purple-600 text-white shadow-xs",
                idle: "text-purple-700",
              },
              {
                id: "Gold",
                label: "Gold",
                active: "bg-amber-500 text-white shadow-xs",
                idle: "text-amber-700",
              },
              {
                id: "Silver",
                label: "Silver",
                active: "bg-slate-700 text-white shadow-xs",
                idle: "text-slate-700",
              },
              {
                id: "winback",
                label: `Win-back (${counts.winback})`,
                active: "bg-[#bb0027] text-white shadow-xs",
                idle: "text-[#bb0027]",
              },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedTierFilter(f.id)}
                title={
                  f.id === "winback"
                    ? `যেসব কাস্টমার ${WINBACK_AFTER_DAYS} দিনের বেশি অর্ডার করেননি`
                    : undefined
                }
                className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  selectedTierFilter === f.id ? f.active : f.idle
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#f8faf9] text-gray-600 font-bold uppercase text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Customer Profile</th>
                <th className="py-3.5 px-3">Contact & Address</th>
                <th className="py-3.5 px-3">Loyalty Tier</th>
                <th className="py-3.5 px-3 text-center">Total Orders</th>
                <th className="py-3.5 px-3">Lifetime Value</th>
                <th className="py-3.5 px-3">Last Purchase</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-600">
                      No customers found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#00503a] text-white font-bold flex items-center justify-center font-montserrat text-sm shrink-0">
                          {customer.name.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {customer.name}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            ID: {customer.id}
                          </p>
                          {customer.isGuest && (
                            <span className="text-[10px] font-semibold text-amber-700">
                              Guest customer
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-mono font-bold text-gray-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#00503a]" />
                        <span>{customer.phone}</span>
                      </p>
                      {customer.email && (
                        <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{customer.email}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span>{customer.location}</span>
                      </p>
                    </td>

                    <td className="py-3 px-3">{getTierBadge(customer.tier)}</td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-extrabold font-montserrat text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {customer.totalOrders}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-black text-[#00503a] font-montserrat text-sm">
                        {customer.totalSpent.toLocaleString()} tk
                      </p>
                    </td>

                    <td className="py-3 px-3">
                      <p className="text-xs text-gray-700">
                        {customer.lastOrderDate}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Joined: {customer.joinedDate}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectingId(customer.id)}
                        className="inline-flex items-center gap-1 bg-[#e7f6f0] hover:bg-[#00503a] hover:text-white text-[#00503a] font-bold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Order History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order history modal */}
      {inspecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 bg-[#00503a] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-base">
                  {inspecting.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-bold text-base font-montserrat">
                    {inspecting.name} - CRM Profile
                  </h3>
                  <p className="text-xs text-emerald-200">
                    {inspecting.phone} | {inspecting.location}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingId(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                <div>
                  <p className="text-gray-500 text-[11px]">Loyalty Tier</p>
                  <div className="mt-1">{getTierBadge(inspecting.tier)}</div>
                </div>
                <div>
                  <p className="text-gray-500 text-[11px]">Total Orders</p>
                  <p className="font-extrabold text-base text-gray-900 font-montserrat mt-0.5">
                    {inspecting.totalOrders}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-[11px]">
                    Lifetime Value (LTV)
                  </p>
                  <p className="font-black text-base text-[#00503a] font-montserrat mt-0.5">
                    {inspecting.totalSpent.toLocaleString()} tk
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#003828] mb-3 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#00503a]" />
                  <span>Orders</span>
                </h4>

                {inspecting.orders.length > 0 ? (
                  <div className="space-y-2.5">
                    {inspecting.orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-[#00503a]">
                              #{order.id}
                            </span>
                            <span className="text-gray-400 text-xs">
                              • {order.date}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {order.items}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-[#00503a] font-montserrat text-sm">
                            {Number(order.total).toLocaleString()} tk
                          </p>
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mt-0.5 uppercase">
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    <p className="text-xs">
                      No orders recorded for this customer.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingId(null)}
                  className="px-5 py-2 rounded-xl bg-[#00503a] text-white font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
