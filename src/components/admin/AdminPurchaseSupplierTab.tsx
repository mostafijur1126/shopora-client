import React, { useState, useMemo } from 'react';
import { Product, Supplier, PurchaseEntry, PurchaseLineItem, PurchasePaymentMethod } from '../../types';
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Truck,
  Phone,
  MapPin,
  Search,
  ShoppingBasket,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wallet,
  Package
} from 'lucide-react';

interface AdminPurchaseSupplierTabProps {
  products?: Product[];
  suppliers?: Supplier[];
  purchases?: PurchaseEntry[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onAddPurchase: (purchase: PurchaseEntry) => void;
  onDeletePurchase: (purchaseId: string) => void;
  onRecordPurchasePayment: (purchaseId: string, amount: number) => void;
}

type SubView = 'suppliers' | 'new-purchase' | 'history';

const PAYMENT_METHODS: { value: PurchasePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'ক্যাশ' },
  { value: 'bkash', label: 'বিকাশ' },
  { value: 'nagad', label: 'নগদ' },
  { value: 'bank', label: 'ব্যাংক ট্রান্সফার' },
  { value: 'card', label: 'কার্ড' },
];

const formatTaka = (n: number) =>
  `৳${(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;

export const AdminPurchaseSupplierTab: React.FC<AdminPurchaseSupplierTabProps> = ({
  products = [],
  suppliers = [],
  purchases = [],
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddPurchase,
  onDeletePurchase,
  onRecordPurchasePayment,
}) => {
  const [subView, setSubView] = useState<SubView>('new-purchase');
  const [searchTerm, setSearchTerm] = useState('');

  /* ---------------------------- Supplier Modal ---------------------------- */
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [supFormError, setSupFormError] = useState('');

  const openAddSupplierModal = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupNotes('');
    setSupFormError('');
    setIsSupplierModalOpen(true);
  };

  const openEditSupplierModal = (s: Supplier) => {
    setEditingSupplier(s);
    setSupName(s.name);
    setSupPhone(s.phone);
    setSupEmail(s.email || '');
    setSupAddress(s.address || '');
    setSupNotes(s.notes || '');
    setSupFormError('');
    setIsSupplierModalOpen(true);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) {
      setSupFormError('সাপ্লায়ারের নাম ও ফোন নম্বর আবশ্যক।');
      return;
    }
    if (editingSupplier) {
      onUpdateSupplier({
        ...editingSupplier,
        name: supName.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        address: supAddress.trim(),
        notes: supNotes.trim(),
      });
    } else {
      onAddSupplier({
        id: `SUP-${Date.now()}`,
        name: supName.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        address: supAddress.trim(),
        notes: supNotes.trim(),
        totalPurchased: 0,
        totalPaid: 0,
        dueAmount: 0,
        timestamp: Date.now(),
      });
    }
    setIsSupplierModalOpen(false);
  };

  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.phone.includes(searchTerm)
      ),
    [suppliers, searchTerm]
  );

  const totalSupplierDue = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.dueAmount || 0), 0),
    [suppliers]
  );

  /* ---------------------------- New Purchase Form ---------------------------- */
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);
  const [itemProductId, setItemProductId] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemCost, setItemCost] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>('cash');
  const [purchaseNote, setPurchaseNote] = useState('');
  const [purchaseFormError, setPurchaseFormError] = useState('');
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState('');

  const purchaseTotal = useMemo(
    () => lineItems.reduce((sum, it) => sum + it.subtotal, 0),
    [lineItems]
  );

  const handleAddLineItem = () => {
    setPurchaseFormError('');
    const product = products.find((p) => p.id === itemProductId);
    const qty = parseFloat(itemQty);
    const cost = parseFloat(itemCost);

    if (!product) {
      setPurchaseFormError('প্রোডাক্ট নির্বাচন করুন।');
      return;
    }
    if (!qty || qty <= 0) {
      setPurchaseFormError('সঠিক পরিমাণ (quantity) দিন।');
      return;
    }
    if (!cost || cost <= 0) {
      setPurchaseFormError('সঠিক ইউনিট ক্রয়মূল্য দিন।');
      return;
    }

    setLineItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.productId === product.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const merged = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + qty,
          unitCost: cost,
        };
        merged.subtotal = merged.quantity * merged.unitCost;
        updated[existingIdx] = merged;
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitCost: cost,
          subtotal: qty * cost,
        },
      ];
    });

    setItemProductId('');
    setItemQty('1');
    setItemCost('');
  };

  const handleRemoveLineItem = (productId: string) => {
    setLineItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  const resetPurchaseForm = () => {
    setSelectedSupplierId('');
    setLineItems([]);
    setItemProductId('');
    setItemQty('1');
    setItemCost('');
    setPaidAmount('');
    setPaymentMethod('cash');
    setPurchaseNote('');
    setPurchaseFormError('');
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseFormError('');
    setPurchaseSuccessMsg('');

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) {
      setPurchaseFormError('সাপ্লায়ার নির্বাচন করুন।');
      return;
    }
    if (lineItems.length === 0) {
      setPurchaseFormError('কমপক্ষে একটি প্রোডাক্ট যোগ করুন।');
      return;
    }

    const total = purchaseTotal;
    const paid = paidAmount.trim() === '' ? total : Math.min(parseFloat(paidAmount) || 0, total);
    const due = Math.max(0, total - paid);
    const status = due <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Due';

    const newPurchase: PurchaseEntry = {
      id: `PUR-${Date.now()}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: lineItems,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: due,
      paymentStatus: status,
      paymentMethod,
      note: purchaseNote.trim(),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };

    onAddPurchase(newPurchase);
    setPurchaseSuccessMsg(`পারচেজ সফলভাবে যোগ হয়েছে — মোট ${formatTaka(total)}, বকেয়া ${formatTaka(due)}`);
    resetPurchaseForm();
    setTimeout(() => setPurchaseSuccessMsg(''), 4000);
  };

  /* ---------------------------- Purchase History ---------------------------- */
  const [payingPurchase, setPayingPurchase] = useState<PurchaseEntry | null>(null);
  const [payAmountInput, setPayAmountInput] = useState('');

  const filteredPurchases = useMemo(
    () =>
      purchases.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.invoiceId || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [purchases, searchTerm]
  );

  const handleConfirmPayment = () => {
    if (!payingPurchase) return;
    const amount = parseFloat(payAmountInput);
    if (!amount || amount <= 0 || amount > payingPurchase.dueAmount) return;
    onRecordPurchasePayment(payingPurchase.id, amount);
    setPayingPurchase(null);
    setPayAmountInput('');
  };

  const statusBadge = (status: PurchaseEntry['paymentStatus']) => {
    const styles: Record<string, string> = {
      Paid: 'bg-emerald-50 text-[#00503a] border-emerald-100',
      Partial: 'bg-amber-50 text-amber-700 border-amber-100',
      Due: 'bg-red-50 text-[#bb0027] border-red-100',
    };
    const icons: Record<string, React.ReactNode> = {
      Paid: <CheckCircle2 className="w-3 h-3" />,
      Partial: <Clock className="w-3 h-3" />,
      Due: <AlertCircle className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status]}`}>
        {icons[status]} {status}
      </span>
    );
  };

  return (
    <div className="space-y-5 font-bengali">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 font-montserrat flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#00503a]" />
            Purchase & Supplier Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            সাপ্লায়ার ও ক্রয় (Purchase) ট্র্যাক করুন — স্টক অটো আপডেট হবে।
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-100 px-4 py-2.5 shadow-sm">
          <Wallet className="w-4 h-4 text-[#bb0027]" />
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase">মোট সাপ্লায়ার বকেয়া</p>
            <p className="text-sm font-bold text-[#bb0027]">{formatTaka(totalSupplierDue)}</p>
          </div>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit flex-wrap">
        {([
          { id: 'new-purchase', label: 'নতুন পারচেজ', icon: ShoppingBasket },
          { id: 'history', label: 'পারচেজ হিস্টোরি', icon: Receipt },
          { id: 'suppliers', label: 'সাপ্লায়ার লিস্ট', icon: Truck },
        ] as { id: SubView; label: string; icon: React.ComponentType<{ className?: string }> }[]).map((tab) => {
          const Icon = tab.icon;
          const isActive = subView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubView(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isActive ? 'bg-[#00503a] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ---------------------------- NEW PURCHASE ---------------------------- */}
      {subView === 'new-purchase' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 space-y-5">
          {suppliers.length === 0 ? (
            <div className="text-center py-10">
              <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">প্রথমে অন্তত একটা সাপ্লায়ার যোগ করুন।</p>
              <button
                onClick={() => {
                  setSubView('suppliers');
                  openAddSupplierModal();
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00503a] text-white text-sm font-semibold hover:bg-[#006a4e] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> সাপ্লায়ার যোগ করুন
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitPurchase} className="space-y-5">
              {/* Supplier select */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">সাপ্লায়ার নির্বাচন করুন</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30 focus:border-[#00503a]"
                >
                  <option value="">-- সাপ্লায়ার বেছে নিন --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) {s.dueAmount > 0 ? `— বকেয়া ${formatTaka(s.dueAmount)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add line item */}
              <div className="bg-[#f8f9fa] rounded-xl p-3.5 border border-gray-100">
                <p className="text-xs font-bold text-gray-600 mb-2.5 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> প্রোডাক্ট যোগ করুন
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <select
                    value={itemProductId}
                    onChange={(e) => setItemProductId(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                  >
                    <option value="">-- প্রোডাক্ট বেছে নিন --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (স্টক: {p.stockQty ?? 0})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    placeholder="পরিমাণ"
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    placeholder="ইউনিট ক্রয়মূল্য (৳)"
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00503a] text-white text-xs font-bold hover:bg-[#006a4e] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> লিস্টে যোগ করুন
                </button>
              </div>

              {/* Line items table */}
              {lineItems.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">প্রোডাক্ট</th>
                        <th className="text-right px-3 py-2 font-semibold">পরিমাণ</th>
                        <th className="text-right px-3 py-2 font-semibold">ইউনিট মূল্য</th>
                        <th className="text-right px-3 py-2 font-semibold">সাবটোটাল</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineItems.map((it) => (
                        <tr key={it.productId}>
                          <td className="px-3 py-2 font-medium text-gray-800">{it.productName}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{it.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatTaka(it.unitCost)}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">{formatTaka(it.subtotal)}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(it.productId)}
                              className="text-gray-400 hover:text-[#bb0027] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50/60">
                        <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-700">
                          মোট
                        </td>
                        <td className="px-3 py-2 text-right font-extrabold text-[#00503a]">{formatTaka(purchaseTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Payment section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    কত টাকা পরিশোধ করছেন? (ফাঁকা রাখলে Full Paid ধরা হবে)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={purchaseTotal || undefined}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder={`সর্বোচ্চ ${formatTaka(purchaseTotal)}`}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">পেমেন্ট মেথড</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PurchasePaymentMethod)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">নোট (ঐচ্ছিক)</label>
                <textarea
                  value={purchaseNote}
                  onChange={(e) => setPurchaseNote(e.target.value)}
                  rows={2}
                  placeholder="যেমন: ঈদ কালেকশনের জন্য বাল্ক ক্রয়"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                />
              </div>

              {purchaseFormError && (
                <p className="text-xs font-semibold text-[#bb0027] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {purchaseFormError}
                </p>
              )}
              {purchaseSuccessMsg && (
                <p className="text-xs font-semibold text-[#00503a] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {purchaseSuccessMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00503a] text-white font-bold text-sm hover:bg-[#006a4e] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" /> পারচেজ সেভ করুন (স্টক অটো আপডেট হবে)
              </button>
            </form>
          )}
        </div>
      )}

      {/* ---------------------------- PURCHASE HISTORY ---------------------------- */}
      {subView === 'history' && (
        <div className="space-y-3.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="সাপ্লায়ার বা ইনভয়েস আইডি দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
            />
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">এখনো কোনো পারচেজ এন্ট্রি নেই।</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPurchases.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-400 font-mono">{p.invoiceId}</span>
                      {statusBadge(p.paymentStatus)}
                    </div>
                    <p className="font-bold text-gray-900 text-sm mt-1">{p.supplierName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.items.length} প্রোডাক্ট · {p.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-5 sm:gap-8">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">মোট</p>
                      <p className="text-sm font-bold text-gray-900">{formatTaka(p.totalAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">বকেয়া</p>
                      <p className={`text-sm font-bold ${p.dueAmount > 0 ? 'text-[#bb0027]' : 'text-[#00503a]'}`}>
                        {formatTaka(p.dueAmount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.dueAmount > 0 && (
                        <button
                          onClick={() => {
                            setPayingPurchase(p);
                            setPayAmountInput(String(p.dueAmount));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-[#00503a] text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          পেমেন্ট দিন
                        </button>
                      )}
                      <button
                        onClick={() => onDeletePurchase(p.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-[#bb0027] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------- SUPPLIER LIST ---------------------------- */}
      {subView === 'suppliers' && (
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="সাপ্লায়ার নাম বা ফোন দিয়ে খুঁজুন..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
              />
            </div>
            <button
              onClick={openAddSupplierModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00503a] text-white text-sm font-bold hover:bg-[#006a4e] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> নতুন সাপ্লায়ার
            </button>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">কোনো সাপ্লায়ার পাওয়া যায়নি।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSuppliers.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {s.phone}
                      </p>
                      {s.address && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {s.address}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditSupplierModal(s)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#00503a] cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteSupplier(s.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-[#bb0027] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">মোট ক্রয়</p>
                      <p className="text-xs font-bold text-gray-800">{formatTaka(s.totalPurchased)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">বকেয়া</p>
                      <p className={`text-xs font-bold ${s.dueAmount > 0 ? 'text-[#bb0027]' : 'text-[#00503a]'}`}>
                        {formatTaka(s.dueAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------- Add/Edit Supplier Modal ---------------------------- */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsSupplierModalOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 font-montserrat">
                {editingSupplier ? 'সাপ্লায়ার এডিট করুন' : 'নতুন সাপ্লায়ার যোগ করুন'}
              </h3>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSupplierSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">সাপ্লায়ারের নাম *</label>
                <input
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                  placeholder="যেমন: রহমান টেক্সটাইল"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">ফোন নম্বর *</label>
                <input
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">ইমেইল (ঐচ্ছিক)</label>
                <input
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">ঠিকানা (ঐচ্ছিক)</label>
                <input
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">নোট (ঐচ্ছিক)</label>
                <textarea
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30"
                />
              </div>
              {supFormError && (
                <p className="text-xs font-semibold text-[#bb0027] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {supFormError}
                </p>
              )}
              <button
                type="submit"
                className="w-full px-4 py-3 rounded-xl bg-[#00503a] text-white font-bold text-sm hover:bg-[#006a4e] transition-colors cursor-pointer"
              >
                {editingSupplier ? 'আপডেট করুন' : 'সাপ্লায়ার সেভ করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------- Record Payment Modal ---------------------------- */}
      {payingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setPayingPurchase(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 font-montserrat">পেমেন্ট রেকর্ড করুন</h3>
              <button
                onClick={() => setPayingPurchase(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-1">{payingPurchase.supplierName} — {payingPurchase.invoiceId}</p>
            <p className="text-sm font-bold text-[#bb0027] mb-4">বর্তমান বকেয়া: {formatTaka(payingPurchase.dueAmount)}</p>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">কত টাকা পরিশোধ করছেন?</label>
            <input
              type="number"
              min="0.01"
              max={payingPurchase.dueAmount}
              step="0.01"
              value={payAmountInput}
              onChange={(e) => setPayAmountInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a]/30 mb-4"
            />
            <button
              onClick={handleConfirmPayment}
              className="w-full px-4 py-3 rounded-xl bg-[#00503a] text-white font-bold text-sm hover:bg-[#006a4e] transition-colors cursor-pointer"
            >
              পেমেন্ট কনফার্ম করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
