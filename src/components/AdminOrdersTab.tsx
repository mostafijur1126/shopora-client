import React, { useState } from 'react';
import { OrderItem } from '../types';
import { formatPrice } from "../utils/format";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Phone,
  MessageSquare,
  MapPin,
  Eye,
  Trash2,
  Copy,
  Check,
  Printer,
  ChevronDown,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

interface AdminOrdersTabProps {
  orders?: OrderItem[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderItem['status']) => void;
  onDeleteOrder: (orderId: string) => void;
}

export const AdminOrdersTab: React.FC<AdminOrdersTabProps> = ({
  orders = [],
  onUpdateOrderStatus,
  onDeleteOrder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<OrderItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter orders by search & status
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesQuery =
      order.id.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.phone.includes(query) ||
      (order.address && order.address.toLowerCase().includes(query)) ||
      (order.items && order.items.toLowerCase().includes(query));

    return matchesStatus && matchesQuery;
  });

  // Status counts
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp quick contact
  const getWhatsAppContactUrl = (order: OrderItem) => {
    const cleanPhone = order.phone.replace(/[^0-9]/g, '');
    const internationalPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const text = `আসসালামু আলাইকুম ${order.customerName},\n\nShopora থেকে আপনার #${order.id} অর্ডার সংক্রান্ত বিষয়ে যোগাযোগ করা হচ্ছে।\nঅর্ডারকৃত পণ্য: ${order.items}\nসর্বমোট মূল্য: ${order.total} tk\n\nআপনার অর্ডার সংক্রান্ত কোনো তথ্য জানতে চাইলে রিপ্লাই দিন। ধন্যবাদ!`;
    return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(text)}`;
  };

  const getStatusBadge = (status: OrderItem['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>অপেক্ষমান</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-bold">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>প্রসেসিং হচ্ছে</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>সম্পন্ন</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full text-xs font-bold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>বাতিল</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-bengali">
      {/* 📊 Orders Header & Stats Banner */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#bec9c2]/50 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-[#191c1d] flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#00503a]" />
                <span>কাস্টমার অর্ডারসমূহ ({orders.length})</span>
              </h2>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>লাইভ ফায়ারবেস সিঙ্ক</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              কাস্টমারদের সরাসরি অর্ডারের পূর্ণ বিবরণ, ফোন ও ঠিকানা ম্যানেজ করুন
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="আইডি, গ্রাহকের নাম বা ফোন..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:border-[#00503a] focus:bg-white focus:ring-1 focus:ring-[#00503a] outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#00503a] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            সব অর্ডার ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>অপেক্ষমান ({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'processing'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>প্রসেসিং ({processingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>সম্পন্ন ({completedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'cancelled'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>বাতিল ({cancelledCount})</span>
          </button>
        </div>
      </div>

      {/* 📋 Orders Table / Card List */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#bec9c2]/50 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-gray-700">কোনো অর্ডার পাওয়া যায়নি</h3>
            <p className="text-xs text-gray-500">
              {searchQuery
                ? 'আপনার সার্চ কুয়েরির সাথে কোনো অর্ডার মেলেনি।'
                : 'এখনও কোনো কাস্টমার অর্ডার নেই।'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#f8faf9] border-b border-gray-200 text-xs font-bold text-[#00503a]">
                  <th className="p-3.5">অর্ডার আইডি</th>
                  <th className="p-3.5">গ্রাহকের নাম ও ফোন</th>
                  <th className="p-3.5">ঠিকানা ও জোন</th>
                  <th className="p-3.5">অর্ডারকৃত পণ্য</th>
                  <th className="p-3.5">মোট মূল্য</th>
                  <th className="p-3.5">স্ট্যাটাস</th>
                  <th className="p-3.5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrderForModal(order)}
                    className="hover:bg-[#f9fbf9] transition-colors cursor-pointer"
                  >
                    {/* Order ID */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#00503a] bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                          {order.id}
                        </span>
                        <button
                          onClick={(e) => handleCopyId(order.id, e)}
                          title="আইডি কপি করুন"
                          className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        >
                          {copiedId === order.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-[11px] text-gray-400 block mt-1">{order.date}</span>
                    </td>

                    {/* Customer Info */}
                    <td className="p-3.5">
                      <p className="font-bold text-gray-900 text-xs sm:text-sm">{order.customerName}</p>
                      <a
                        href={`tel:${order.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-gray-600 hover:text-[#00503a] font-mono flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="w-3 h-3 text-[#00503a]" />
                        <span>{order.phone}</span>
                      </a>
                    </td>

                    {/* Delivery Address */}
                    <td className="p-3.5 max-w-[200px]">
                      <p className="text-xs text-gray-800 line-clamp-1 font-medium" title={order.address}>
                        {order.address || 'ঠিকানা দেওয়া হয়নি'}
                      </p>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {order.deliveryZone === 'inside_dhaka'
                          ? 'ঢাকার ভেতরে'
                          : order.deliveryZone === 'sub_dhaka'
                          ? 'ঢাকা সাব-সিটি'
                          : 'ঢাকার বাইরে'}
                      </span>
                    </td>

                    {/* Items Summary */}
                    <td className="p-3.5 max-w-[220px]">
                      <p className="text-xs text-gray-700 line-clamp-2" title={order.items}>
                        {order.items}
                      </p>
                      {order.note && (
                        <p className="text-[11px] text-amber-700 font-medium italic mt-0.5 truncate">
                          নোট: "{order.note}"
                        </p>
                      )}
                    </td>

                    {/* Total */}
                    <td className="p-3.5 whitespace-nowrap">
                      <p className="font-extrabold text-sm text-[#00503a] font-montserrat">
                        {formatPrice(order.total)}
                      </p>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {order.paymentMethod === 'bkash' ? 'বিকাশ' : 'ক্যাশ অন ডেলিভারি'}
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td className="p-3.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as any)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${
                            order.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : order.status === 'processing'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : order.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="pending">⏳ অপেক্ষমান (Pending)</option>
                          <option value="processing">🚚 প্রসেসিং (Processing)</option>
                          <option value="completed">✅ সম্পন্ন (Completed)</option>
                          <option value="cancelled">❌ বাতিল (Cancelled)</option>
                        </select>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp Customer */}
                        <a
                          href={getWhatsAppContactUrl(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="গ্রাহককে হোয়াটসঅ্যাপে মেসেজ দিন"
                          className="p-1.5 text-white bg-[#25D366] hover:bg-[#20b858] rounded-lg transition-colors shadow-2xs"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </a>

                        {/* View Details */}
                        <button
                          onClick={() => setSelectedOrderForModal(order)}
                          title="অর্ডার ইনভয়েস দেখুন"
                          className="p-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Order */}
                        <button
                          onClick={() => {
                            if (window.confirm(`আপনি কি #${order.id} অর্ডারটি মুছে ফেলতে চান?`)) {
                              onDeleteOrder(order.id);
                            }
                          }}
                          title="অর্ডার মুছে ফেলুন"
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 📄 ORDER DETAILS INVOICE MODAL */}
      {selectedOrderForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-bengali"
          onClick={() => setSelectedOrderForModal(null)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#00503a] to-[#003828] text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-200 font-bold uppercase tracking-wider">অর্ডার বিস্তারিত রশিদ</span>
                <h3 className="text-lg font-extrabold flex items-center gap-2">
                  <span>#{selectedOrderForModal.id}</span>
                  <span className="text-xs font-normal text-emerald-100">({selectedOrderForModal.date})</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Status Update Strip */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 font-bold block">বর্তমান স্ট্যাটাস</span>
                  <div className="mt-1">{getStatusBadge(selectedOrderForModal.status)}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">পরিবর্তন:</span>
                  <select
                    value={selectedOrderForModal.status}
                    onChange={(e) => {
                      const newStat = e.target.value as any;
                      onUpdateOrderStatus(selectedOrderForModal.id, newStat);
                      setSelectedOrderForModal({ ...selectedOrderForModal, status: newStat });
                    }}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-gray-300 bg-white outline-none"
                  >
                    <option value="pending">⏳ অপেক্ষমান</option>
                    <option value="processing">🚚 প্রসেসিং</option>
                    <option value="completed">✅ সম্পন্ন</option>
                    <option value="cancelled">❌ বাতিল</option>
                  </select>
                </div>
              </div>

              {/* Customer Information Card */}
              <div className="bg-[#f9faf9] p-4 rounded-2xl border border-emerald-100 space-y-2.5">
                <h4 className="text-xs font-extrabold text-[#00503a] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>গ্রাহক ও ডেলিভারি বিবরণ</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-gray-500">গ্রাহকের নাম:</span>
                    <p className="font-bold text-gray-900 text-sm">{selectedOrderForModal.customerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">মোবাইল নম্বর:</span>
                    <a
                      href={`tel:${selectedOrderForModal.phone}`}
                      className="font-mono font-bold text-[#00503a] hover:underline flex items-center gap-1 text-sm"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedOrderForModal.phone}</span>
                    </a>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">সম্পূর্ণ ঠিকানা:</span>
                    <p className="font-bold text-gray-900">{selectedOrderForModal.address}</p>
                    {selectedOrderForModal.district && (
                      <span className="text-[11px] text-gray-500">জেলা: {selectedOrderForModal.district}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">ডেলিভারি এলাকা:</span>
                    <p className="font-bold text-gray-900">
                      {selectedOrderForModal.deliveryZone === 'inside_dhaka'
                        ? 'ঢাকার ভেতরে (60 tk)'
                        : selectedOrderForModal.deliveryZone === 'sub_dhaka'
                        ? 'ঢাকা সাব-সিটি (100 tk)'
                        : 'ঢাকার বাইরে (120 tk)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">পেমেন্ট মেথড:</span>
                    <p className="font-bold text-emerald-800">
                      {selectedOrderForModal.paymentMethod === 'bkash'
                        ? 'বিকাশ / নগদ (অনলাইন)'
                        : 'ক্যাশ অন ডেলিভারি (COD)'}
                    </p>
                  </div>
                </div>

                {selectedOrderForModal.note && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <span className="text-gray-500 font-bold text-[11px]">বিশেষ নির্দেশনা / নোট:</span>
                    <p className="text-gray-800 font-medium italic mt-0.5 bg-white p-2 rounded-lg border border-gray-100">
                      "{selectedOrderForModal.note}"
                    </p>
                  </div>
                )}
              </div>

              {/* Ordered Products Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                  অর্ডারকৃত পণ্যসমূহ:
                </h4>
                <div className="space-y-2">
                  {selectedOrderForModal.orderedProducts && selectedOrderForModal.orderedProducts.length > 0 ? (
                    selectedOrderForModal.orderedProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <div className="flex items-center gap-2.5">
                          {prod.image && (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-10 h-10 rounded-lg object-cover"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div>
                            <h5 className="font-bold text-xs text-gray-900">{prod.name}</h5>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                              <span className="font-montserrat">{formatPrice(prod.price)} x {prod.quantity}টি</span>
                              {prod.sku && (
                                <span className="font-mono text-gray-400">({prod.sku})</span>
                              )}
                              {prod.model && (
                                <span className="bg-emerald-50 text-[#00503a] font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                  Model: {prod.model}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="font-bold text-[#00503a] font-montserrat">
                          {formatPrice(prod.price * prod.quantity)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-800 font-medium">
                      {selectedOrderForModal.items}
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Calculation summary */}
              <div className="bg-[#f8faf9] p-4 rounded-2xl border border-emerald-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>পণ্যের মূল্য (সাবটোটাল):</span>
                  <span className="font-bold text-gray-900 font-montserrat">
                    {formatPrice(selectedOrderForModal.subtotal || selectedOrderForModal.total - (selectedOrderForModal.deliveryCharge || 60))}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ডেলিভারি চার্জ:</span>
                  <span className="font-bold text-gray-900 font-montserrat">
                    {formatPrice(selectedOrderForModal.deliveryCharge || 60)}
                  </span>
                </div>
                <div className="pt-2 border-t border-emerald-200 flex justify-between items-center text-sm sm:text-base font-extrabold">
                  <span className="text-gray-900">সর্বমোট প্রদেয় বিল:</span>
                  <span className="text-xl font-black text-[#00503a] font-montserrat">
                    {formatPrice(selectedOrderForModal.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
              <a
                href={getWhatsAppContactUrl(selectedOrderForModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#20b858] text-white py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <WhatsAppIcon className="w-4 h-4 fill-current" />
                <span>গ্রাহককে WhatsApp করুন</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট</span>
                </button>
                <button
                  onClick={() => setSelectedOrderForModal(null)}
                  className="bg-[#00503a] hover:bg-[#003828] text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
