import React, { useState } from 'react';
import { Product, OrderItem, OrderedProductSummary, CourierAssignment } from '../../types';
import { BANGLADESH_DISTRICTS, isDhakaDistrict } from '../../data/districts';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  DollarSign,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Percent,
  CreditCard,
  MessageSquare
} from 'lucide-react';

interface AdminManualOrderModalProps {
  onBack: () => void;
  products: Product[];
  onAddOrder: (newOrder: OrderItem) => void | Promise<OrderItem | null | void>;
  onOpenInvoice?: (order: OrderItem) => void;
}

interface ManualOrderItemLine {
  productId?: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  image?: string;
}

export const AdminManualOrderModal: React.FC<AdminManualOrderModalProps> = ({
  onBack,
  products,
  onAddOrder,
  onOpenInvoice
}) => {
  // Customer Info State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [deliveryZone, setDeliveryZone] = useState<'inside_dhaka' | 'sub_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState<number | null>(null);

  // Ordered Items
  const [selectedItems, setSelectedItems] = useState<ManualOrderItemLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Financial State
  const [discount, setDiscount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [orderStatus, setOrderStatus] = useState<OrderItem['status']>('pending');
  const [orderNote, setOrderNote] = useState('');

  // Courier Assignment (Optional)
  const [assignCourierNow, setAssignCourierNow] = useState(false);
  const [courierPartner, setCourierPartner] = useState<'Pathao' | 'RedX' | 'Steadfast' | 'Paperfly'>('Pathao');
  const [customTrackingId, setCustomTrackingId] = useState('');

  // Validation & feedback state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdOrderSuccess, setCreatedOrderSuccess] = useState<OrderItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate default delivery charge based on zone
  const defaultDeliveryCharge =
    deliveryZone === 'inside_dhaka' ? 70 : deliveryZone === 'sub_dhaka' ? 100 : 130;
  const activeDeliveryCharge = customDeliveryCharge !== null ? customDeliveryCharge : defaultDeliveryCharge;

  // Calculate subtotal
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalAmount = Math.max(0, subtotal + activeDeliveryCharge - discount);
  const dueAmount = Math.max(0, totalAmount - advancePaid);

  // Filter available products
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Add a product line
  const handleAddProductLine = (prod: Product) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.productId === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          name: prod.nameEn || prod.name,
          sku: prod.sku || `SKU-${prod.id.slice(-4)}`,
          price: prod.price,
          quantity: 1,
          image: prod.image
        }
      ];
    });
    setProductSearch('');
    setIsProductDropdownOpen(false);
    // Clear product error if any
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: '' }));
    }
  };

  // Add a generic custom item
  const handleAddCustomItem = () => {
    const newItem: ManualOrderItemLine = {
      name: 'Custom Product Item',
      price: 500,
      quantity: 1
    };
    setSelectedItems((prev) => [...prev, newItem]);
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: '' }));
    }
  };

  // Update line item
  const handleUpdateItem = (index: number, field: keyof ManualOrderItemLine, value: any) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (cleanPhone.length < 11) {
      newErrors.phone = 'Please provide a valid 11-digit mobile number (e.g. 017XXXXXXXX)';
    }

    if (!address.trim()) {
      newErrors.address = 'Full delivery address is required';
    }

    if (selectedItems.length === 0) {
      newErrors.items = 'Please select or add at least one product item';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit and Create Order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderId = `ORD-MAN-${randomSuffix}`;

    const itemsSummary = selectedItems
      .map((item) => `${item.name} (${item.quantity} pcs)`)
      .join(', ');

    const orderedProducts: OrderedProductSummary[] = selectedItems.map((item) => ({
      id: item.productId || `custom-${Date.now()}`,
      name: item.name,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      image: item.image
    }));

    let courierAssignment: CourierAssignment | undefined = undefined;
    if (assignCourierNow) {
      const trackingCode =
        customTrackingId.trim() ||
        `${courierPartner.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}`;
      courierAssignment = {
        partner: courierPartner,
        trackingId: trackingCode,
        assignedAt: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Assigned',
        courierFee: activeDeliveryCharge
      };
    }

    const newOrder: OrderItem = {
      id: orderId,
      invoiceId: `AS-${randomSuffix.toString().slice(-5)}`,
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      district,
      deliveryZone,
      deliveryCharge: activeDeliveryCharge,
      discount,
      paymentMethod,
      paidAmount: advancePaid,
      dueAmount: Math.max(0, totalAmount - advancePaid),
      saleType: 'POS / Manual Sale',
      items: itemsSummary,
      orderedProducts,
      subtotal,
      total: totalAmount,
      note: orderNote.trim() || (advancePaid > 0 ? `Advance: ${advancePaid} tk, Due: ${dueAmount} tk` : undefined),
      status: assignCourierNow ? 'courier' : orderStatus,
      courier: courierAssignment,
      date: new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      timestamp: Date.now()
    };

    // Show the success screen only after the server has really saved the order.
    setIsSubmitting(true);
    try {
      const result = (await onAddOrder(newOrder)) as OrderItem | null | undefined;
      if (result === null) return; // the server rejected it; the parent already showed the error
      setCreatedOrderSuccess(result ?? newOrder);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset and prepare another
  const handleResetForNew = () => {
    setCustomerName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setSelectedItems([]);
    setDiscount(0);
    setAdvancePaid(0);
    setOrderNote('');
    setAssignCourierNow(false);
    setCustomTrackingId('');
    setCreatedOrderSuccess(null);
    setErrors({});
  };

  // WhatsApp quick text
  const getWhatsAppConfirmationUrl = (order: OrderItem) => {
    const cleanPhone = order.phone.replace(/[^0-9]/g, '');
    const internationalPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const text = `Hello ${order.customerName},\n\nYour order has been confirmed successfully at AmarShop!\nOrder ID: #${order.invoiceId || order.id}\nItems: ${order.items}\nTotal Amount: ${order.total} tk\nDelivery Address: ${order.address}\n\nThank you for choosing AmarShop!`;
    return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col font-sans">
        {/* Page Header */}
        <div className="p-4 sm:p-5 bg-[#003828] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#00503a] border border-emerald-400/30 flex items-center justify-center text-white shadow-xs">
              <ShoppingBag className="w-5 h-5 text-[#9ef4d0]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-montserrat">
                  Manual Order Entry
                </h2>
                <span className="bg-[#9ef4d0] text-[#003828] text-[10px] font-black uppercase px-2 py-0.5 rounded font-montserrat">
                  Admin POS
                </span>
              </div>
              <p className="text-xs text-emerald-200 break-words">
                Create customer orders from Phone, Facebook, WhatsApp, or in-store walk-in
              </p>
            </div>
          </div>

          <button
            onClick={onBack}
            className="min-h-11 w-full sm:w-auto px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs font-bold"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Successful Creation Notification Card */}
        {createdOrderSuccess ? (
          <div className="p-4 sm:p-8 lg:p-10 text-center space-y-6 bg-gray-50/50">
            <div className="w-16 h-16 bg-emerald-100 text-[#00503a] rounded-full flex items-center justify-center mx-auto shadow-xs border-2 border-emerald-200">
              <CheckCircle2 className="w-9 h-9 text-[#006a4e]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-[#003828] font-montserrat">
                Order Created Successfully!
              </h3>
              <p className="text-sm text-gray-600">
                Order ID:{' '}
                <span className="font-mono font-bold text-[#00503a] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  #{createdOrderSuccess.invoiceId || createdOrderSuccess.id}
                </span>
              </p>
            </div>

            {/* Order Details Brief Summary */}
            <div className="max-w-md mx-auto bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs text-left text-xs space-y-2.5">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold">Customer Name:</span>
                <span className="font-bold text-gray-900">{createdOrderSuccess.customerName}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold">Phone:</span>
                <span className="font-bold font-mono text-gray-900">{createdOrderSuccess.phone}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold">Items:</span>
                <span className="font-medium text-gray-800 line-clamp-1">{createdOrderSuccess.items}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-gray-100 pb-2">
                <span className="text-gray-500 font-semibold">Total Amount:</span>
                <span className="font-extrabold text-sm text-[#00503a] font-montserrat">{createdOrderSuccess.total.toLocaleString()} tk</span>
              </div>
              {createdOrderSuccess.courier && (
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-emerald-800 font-semibold">
                  <span>Courier Tracking:</span>
                  <span>{createdOrderSuccess.courier.partner} ({createdOrderSuccess.courier.trackingId})</span>
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={getWhatsAppConfirmationUrl(createdOrderSuccess)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send WhatsApp Confirmation</span>
              </a>

              {onOpenInvoice && (
                <button
                  onClick={() => {
                    onOpenInvoice(createdOrderSuccess);
                    onBack();
                  }}
                    className="min-h-11 flex items-center gap-2 bg-[#00503a] hover:bg-[#003828] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#9ef4d0]" />
                  <span>Print Packing Invoice</span>
                </button>
              )}

              <button
                onClick={handleResetForNew}
                className="min-h-11 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Another Order</span>
              </button>

              <button
                onClick={onBack}
                className="min-h-11 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          /* Main Order Entry Form */
          <form onSubmit={handleSubmit} className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6">
            {/* Grid 1: Customer Info & Delivery Details */}
            <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-4">
              <div className="flex items-center gap-2 text-[#003828] font-bold text-sm border-b border-gray-200 pb-2">
                <User className="w-4 h-4 text-[#00503a]" />
                <span>1. Customer Details & Delivery Address</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed / Tahmina Begum"
                    className={`min-h-11 w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white border ${
                      errors.customerName ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                    } focus:outline-none focus:ring-2 focus:ring-[#00503a]`}
                  />
                  {errors.customerName && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.customerName}</p>
                  )}
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className={`min-h-11 w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white border ${
                        errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-[#00503a] font-mono`}
                    />
                  </div>
                  {errors.phone && <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@gmail.com"
                    className="min-h-11 w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00503a]"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    District / City
                  </label>
                  <select
                    value={district}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setDistrict(selected);
                      if (isDhakaDistrict(selected)) {
                        setDeliveryZone('inside_dhaka');
                      } else {
                        setDeliveryZone('outside_dhaka');
                      }
                      setCustomDeliveryCharge(null);
                    }}
                    className="min-h-11 w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00503a]"
                  >
                    {BANGLADESH_DISTRICTS.map((dist) => (
                      <option key={dist.id} value={dist.id}>
                        {dist.nameEn} ({dist.nameBn})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Full Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Full Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <textarea
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House/Holding no, Road no, Area, Thana, Landmark..."
                      className={`min-h-11 w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white border ${
                        errors.address ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'
                      } focus:outline-none focus:ring-2 focus:ring-[#00503a]`}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-[11px] text-red-600 mt-1">{errors.address}</p>
                  )}
                </div>

                {/* Delivery Zone Selector */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Delivery Zone & Fee
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryZone('inside_dhaka');
                        setCustomDeliveryCharge(null);
                      }}
                      className={`min-h-11 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        deliveryZone === 'inside_dhaka' && customDeliveryCharge === null
                          ? 'border-[#00503a] bg-[#e7f6f0] text-[#00503a]'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>Inside Dhaka</span>
                      <span className="font-montserrat">70 tk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryZone('sub_dhaka');
                        setCustomDeliveryCharge(null);
                      }}
                      className={`min-h-11 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        deliveryZone === 'sub_dhaka' && customDeliveryCharge === null
                          ? 'border-[#00503a] bg-[#e7f6f0] text-[#00503a]'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>Dhaka Sub-urban</span>
                      <span className="font-montserrat">100 tk</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryZone('outside_dhaka');
                        setCustomDeliveryCharge(null);
                      }}
                      className={`min-h-11 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        deliveryZone === 'outside_dhaka' && customDeliveryCharge === null
                          ? 'border-[#00503a] bg-[#e7f6f0] text-[#00503a]'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>Outside Dhaka</span>
                      <span className="font-montserrat">130 tk</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid 2: Ordered Items / Product Selection */}
            <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <div className="flex items-center gap-2 text-[#003828] font-bold text-sm">
                  <ShoppingBag className="w-4 h-4 text-[#00503a]" />
                  <span>2. Ordered Products & Items</span>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="text-xs text-[#00503a] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Custom Item</span>
                </button>
              </div>

              {/* Product Live Search & Add Picker */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Product from Inventory:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    placeholder="Search by product name, SKU, or category..."
                    className="min-h-11 w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00503a]"
                  />
                </div>

                {/* Dropdown Suggestions */}
                {isProductDropdownOpen && productSearch.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-56 overflow-y-auto divide-y divide-gray-100">
                    {filteredProducts.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-xs">
                        No matching products found
                      </div>
                    ) : (
                      filteredProducts.slice(0, 10).map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleAddProductLine(prod)}
                          className="p-2.5 hover:bg-emerald-50/70 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-9 h-9 rounded-lg object-cover border border-gray-200"
                            />
                            <div>
                              <p className="font-bold text-xs text-gray-900 line-clamp-1">
                                {prod.nameEn || prod.name}
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                {prod.sku || `SKU-${prod.id.slice(-4)}`} • {prod.category}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-xs text-[#00503a] font-montserrat">
                              {prod.price.toLocaleString()} tk
                            </p>
                            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                              + Add
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {errors.items && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errors.items}</span>
                </div>
              )}

              {/* Selected Items List */}
              {selectedItems.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  <div className="hidden md:grid md:grid-cols-12 p-2.5 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase">
                    <span className="col-span-6">Product</span>
                    <span className="col-span-2 text-center">Unit Price</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>

                  {selectedItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 grid grid-cols-3 md:grid-cols-12 items-center gap-2 text-xs"
                    >
                      {/* Product Name & SKU */}
                      <div className="col-span-3 md:col-span-6 flex items-center gap-2 min-w-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 rounded object-cover shrink-0 border border-gray-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 font-bold">
                            #
                          </div>
                        )}
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                          className="min-w-0 w-full px-2 py-2 text-xs font-semibold text-gray-900 border border-transparent hover:border-gray-200 focus:border-[#00503a] rounded"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-1 md:col-span-2 text-left md:text-center">
                        <span className="block md:hidden text-[10px] text-gray-500 mb-1">Unit Price</span>
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) =>
                              handleUpdateItem(index, 'price', Number(e.target.value))
                            }
                            className="min-h-10 w-11 sm:w-16 px-1.5 py-1 text-center font-bold font-montserrat text-xs border border-gray-200 rounded focus:border-[#00503a]"
                          />
                          <span className="text-gray-400 text-xs ml-0.5">tk</span>
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="col-span-2 md:col-span-2">
                        <span className="block md:hidden text-[10px] text-gray-500 mb-1 text-center">Quantity</span>
                        <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItem(index, 'quantity', Math.max(1, item.quantity - 1))
                          }
                          className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="min-w-6 text-center font-mono font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItem(index, 'quantity', item.quantity + 1)
                          }
                          className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                        </div>
                      </div>

                      {/* Line Total & Remove */}
                      <div className="col-span-3 md:col-span-2 flex items-center justify-between md:justify-end gap-2 border-t border-gray-100 pt-2 md:border-0 md:pt-0">
                        <span className="md:hidden text-[10px] text-gray-500">Total</span>
                        <span className="font-montserrat font-bold text-gray-900">
                          {(item.price * item.quantity).toLocaleString()} tk
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="min-h-10 min-w-10 p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grid 3: Accounting, Payment, Courier & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Payment & Courier Logistics */}
              <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex items-center gap-2 text-[#003828] font-bold text-sm border-b border-gray-200 pb-2">
                  <CreditCard className="w-4 h-4 text-[#00503a]" />
                  <span>3. Payment & Courier Options</span>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`min-h-11 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        paymentMethod === 'cod'
                          ? 'border-[#00503a] bg-[#e7f6f0] text-[#00503a]'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cash On Delivery (COD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bkash')}
                      className={`min-h-11 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        paymentMethod === 'bkash'
                          ? 'border-pink-600 bg-pink-50 text-pink-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      bKash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('nagad')}
                      className={`min-h-11 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        paymentMethod === 'nagad'
                          ? 'border-orange-600 bg-orange-50 text-orange-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Nagad
                    </button>
                  </div>
                </div>

                {/* Order Initial Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Initial Order Status
                  </label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as OrderItem['status'])}
                    className="min-h-11 w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-gray-200 font-bold focus:ring-2 focus:ring-[#00503a]"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing / Confirmed</option>
                    <option value="completed">Completed / Delivered</option>
                  </select>
                </div>

                {/* Immediate Courier Assignment Toggle */}
                <div className="pt-2 border-t border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignCourierNow}
                        onChange={(e) => setAssignCourierNow(e.target.checked)}
                        className="rounded text-[#00503a] focus:ring-[#00503a] w-4 h-4"
                      />
                      <span className="text-xs font-bold text-gray-800">
                        Assign Directly to Courier Partner
                      </span>
                    </label>
                  </div>

                  {assignCourierNow && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2.5 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Courier Partner:
                          </label>
                          <select
                            value={courierPartner}
                            onChange={(e) =>
                              setCourierPartner(e.target.value as 'Pathao' | 'RedX' | 'Steadfast' | 'Paperfly')
                            }
                            className="min-h-11 w-full px-2.5 py-1.5 rounded-lg text-xs bg-gray-50 border border-gray-200 font-semibold"
                          >
                            <option value="Pathao">Pathao Courier</option>
                            <option value="Steadfast">Steadfast Courier</option>
                            <option value="RedX">RedX Delivery</option>
                            <option value="Paperfly">Paperfly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">
                            Tracking Code (Optional):
                          </label>
                          <input
                            type="text"
                            value={customTrackingId}
                            onChange={(e) => setCustomTrackingId(e.target.value)}
                            placeholder="Auto generated if blank"
                            className="min-h-11 w-full px-2.5 py-1.5 rounded-lg text-xs bg-gray-50 border border-gray-200 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin / Delivery Note */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Special Instructions / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="e.g. Call before delivery / Customer requested fast shipment..."
                    className="min-h-16 w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-gray-200 focus:ring-2 focus:ring-[#00503a]"
                  />
                </div>
              </div>

              {/* Right Column: Financial Summary & Calculation Card */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-[#003828] font-bold text-sm border-b border-gray-200 pb-2">
                  <DollarSign className="w-4 h-4 text-[#00503a]" />
                  <span>4. Billing & Financial Summary</span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Subtotal */}
                  <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-gray-600 font-semibold">
                    <span>Products Subtotal ({selectedItems.reduce((acc, i) => acc + i.quantity, 0)} items):</span>
                    <span className="font-montserrat text-sm text-gray-900 font-bold">
                      {subtotal.toLocaleString()} tk
                    </span>
                  </div>

                  {/* Delivery Fee Input */}
                  <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-gray-600 font-semibold">
                    <span>Delivery Charge:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={activeDeliveryCharge}
                        onChange={(e) => setCustomDeliveryCharge(Number(e.target.value))}
                        className="min-h-10 w-20 px-2 py-1 text-right font-montserrat font-bold text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-[#00503a]"
                      />
                      <span className="text-gray-400 text-xs">tk</span>
                    </div>
                  </div>

                  {/* Discount Input */}
                  <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-gray-600 font-semibold">
                    <span>Special Discount:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                        className="min-h-10 w-20 px-2 py-1 text-right font-montserrat font-bold text-xs bg-gray-50 border border-gray-200 rounded-lg text-red-600 focus:bg-white focus:border-[#00503a]"
                      />
                      <span className="text-gray-400 text-xs">tk</span>
                    </div>
                  </div>

                  {/* Advance Paid Input */}
                  <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 text-gray-600 font-semibold">
                    <span>Advance Payment (if any):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={advancePaid}
                        onChange={(e) => setAdvancePaid(Math.max(0, Number(e.target.value)))}
                        className="min-h-10 w-20 px-2 py-1 text-right font-montserrat font-bold text-xs bg-gray-50 border border-gray-200 rounded-lg text-emerald-700 focus:bg-white focus:border-[#00503a]"
                      />
                      <span className="text-gray-400 text-xs">tk</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t-2 border-dashed border-gray-200 pt-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-bold text-sm text-gray-900">Total Invoice Amount:</span>
                      <span className="font-montserrat font-extrabold text-lg text-[#00503a]">
                        {totalAmount.toLocaleString()} tk
                      </span>
                    </div>

                    {advancePaid > 0 && (
                      <div className="flex flex-wrap justify-between items-center gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        <span className="font-bold text-xs text-amber-900">
                          Due on Delivery:
                        </span>
                        <span className="font-montserrat font-bold text-sm text-amber-900">
                          {dueAmount.toLocaleString()} tk
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Actions */}
            <div className="pt-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#00503a]" />
                <span>Orders will sync immediately to live store and inventory</span>
              </div>

              <div className="flex flex-col md:flex-row gap-2.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={onBack}
                  className="min-h-11 w-full md:w-auto px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-11 w-full md:w-auto flex items-center justify-center gap-2 bg-[#00503a] hover:bg-[#003828] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#9ef4d0]" />
                  <span>{isSubmitting ? 'Saving order…' : 'Confirm & Create Order'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
    </div>
  );
};
