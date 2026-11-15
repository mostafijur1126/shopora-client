export interface CategoryItem {
  id: string;
  name: string; // বাংলা নাম (e.g. 'শাড়ি ও থ্রি-পিস')
  nameEn: string; // ইংরেজি নাম (e.g. 'Saree & Salwar')
  slug: string; // ক্যাটাগরি স্লাগ / কী (e.g. 'Fashion' or 'saree')
  iconName?: string; // আইকন নাম
  description?: string;
  image?: string;
}

export interface ColorVariant {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  nameEn?: string;
  sku?: string;
  model?: string; // Primary Model number or name (e.g. 'Pro-Max V2', 'TX-500', 'Standard')
  models?: string[]; // Multiple available models/variants (e.g. ['Model A', 'Model B', 'Model C'])
  sizes?: string[]; // Available sizes (e.g. ['M', 'L', 'XL', 'XXL'])
  colors?: (string | ColorVariant)[]; // Available colors (e.g. ['Emerald Green'] or [{name: 'Red', hex: '#FF0000'}])
  colorVariants?: ColorVariant[]; // Strongly typed color variants
  hasColors?: boolean; // Enable / Disable Color variants selector
  hasSizes?: boolean;
  ratingAverage?: number;
  reviewCount?: number;
  category: string;
  categoryBn?: string;
  price: number;
  originalPrice?: number;
  promotionalPrice?: number;
  discountBadge?: string;
  image: string;
  images?: string[];
  imageAlt?: string;
  inStock: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  description?: string;
  detailedDescription?: string;
  features?: string[];
  specifications?: Record<string, string>;
  deliveryTime?: string;
  materialOrOrigin?: string;
  costPrice?: number; // buying/production cost per unit, used for profit margin calculation
  pdpSectionVisibility?: {
    description: boolean;
    specifications: boolean;
    reviews: boolean;
    relatedProducts: boolean;
    recentlyViewed: boolean;
  };
}

export interface StockNotifyRequest {
  id: string;
  productId: string;
  productName: string;
  contact: string; // phone or email, sanitized/trimmed
  timestamp?: number;
  createdAt?: any;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export type ActiveScreen =
  | "home"
  | "categories"
  | "admin"
  | "about"
  | "contact"
  | "product-detail"
  | "wishlist";

export interface AdminStats {
  todaySales: number;
  todaySalesGrowth: string;
  activeProducts: number;
  outOfStockCount: number;
  newOrdersCount: number;
  newOrdersGrowth: string;
  totalCustomersCount: number;
  lowStockCount: number;
}

export interface OrderedProductSummary {
  id: string;
  name: string;
  sku?: string;
  model?: string;
  price: number;
  quantity: number;
  image?: string;
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export type OrderStatus =
  | "pending"
  | "packing"
  | "pickup"
  | "courier"
  | "delivered"
  | "cancelled"
  | "return_received"
  | "on_hold"
  | "draft"
  | "exchange"
  | "incompleted"
  | "processing"
  | "completed";

export type CourierPartner =
  | "Steadfast"
  | "Pathao"
  | "RedX"
  | "Paperfly"
  | "In-house"
  | "Other";

export type SaleType =
  | "Online Store"
  | "POS / Manual Sale"
  | "Direct Order"
  | "WhatsApp Order"
  | "Facebook Sale"
  | "Facebook / Social"
  | "Phone / WhatsApp"
  | "Wholesale";

export interface CourierAssignment {
  partner: CourierPartner;
  trackingId: string;
  trackingCode?: string;
  consignmentId?: string | number;
  trackingUrl?: string;
  assignedAt: string;
  status:
    | "Assigned"
    | "Picked Up"
    | "In Transit"
    | "Delivered"
    | "Returned"
    | "Pending";
  courierFee?: number;
  apiResponse?: any;
}

export interface OrderItem {
  id: string;
  customerId?: string;
  invoiceId?: string; // e.g. 'AS-19685' or 'ORD-1002'
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  district?: string;
  deliveryZone?: "inside_dhaka" | "sub_dhaka" | "outside_dhaka";
  deliveryCharge?: number;
  discount?: number;
  paymentMethod?: "cod" | "bkash" | "nagad" | "card" | "bank";
  paidAmount?: number;
  dueAmount?: number;
  saleType?: SaleType;
  items: string;
  orderedProducts?: OrderedProductSummary[];
  subtotal?: number;
  total: number;
  note?: string;
  status: OrderStatus;
  courier?: CourierAssignment;
  assignedStaff?: string;
  date: string;
  timestamp?: number;
  createdAt?: any;
  updatedAt?: any;
}

export type CustomerLoyaltyTier = "Platinum VIP" | "Gold" | "Silver";

export interface CustomerCRM {
  id: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  totalOrders: number;
  totalSpent: number;
  tier: CustomerLoyaltyTier;
  joinedDate: string;
  lastOrderDate: string;
  notes?: string;
  status?: string;
  isGuest?: boolean;
}

export type StaffRole = "Super Admin" | "Manager" | "Support" | "Seller";

export interface StaffPermissions {
  manageProducts: boolean;
  manageOrders: boolean;
  financialReports: boolean;
  systemSettings: boolean;
  courierApi: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: "Active" | "Inactive";
  avatar?: string;
  lastLogin: string;
  permissions: StaffPermissions;
}

export interface StoreSettingsConfig {
  shippingInsideDhaka: number;
  shippingSubDhaka: number;
  shippingOutsideDhaka: number;
  bkashMerchant: string;
  nagadMerchant: string;
  rocketNumber: string;
  supportPhone: string;
  supportWhatsapp: string;
  supportEmail: string;
  storeAddress: string;
  defaultCourier: "Pathao" | "RedX" | "Steadfast";
  vatTaxPercent: number;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  steadfastTestMode?: boolean;
}

export interface StoreContactSettings {
  hotlineNumber: string;
  whatsappNumber: string;
  storeAddress: string;
}

export interface DailyRevenueTrend {
  day: string;
  dateStr: string;
  revenue: number;
  orderCount: number;
  growth: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchased: number; // lifetime total purchase value from this supplier
  totalPaid: number; // lifetime total paid to this supplier
  dueAmount: number; // totalPurchased - totalPaid (money the shop owes the supplier)
  createdAt?: any;
  timestamp?: number;
}

export interface PurchaseLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number; // buying price per unit
  subtotal: number; // quantity * unitCost
}

export type PurchasePaymentStatus = "Paid" | "Partial" | "Due";
export type PurchasePaymentMethod =
  | "cash"
  | "bkash"
  | "nagad"
  | "bank"
  | "card";

export interface PurchaseEntry {
  id: string;
  invoiceId?: string; // e.g. 'PUR-10023'
  supplierId: string;
  supplierName: string;
  items: PurchaseLineItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PurchasePaymentStatus;
  paymentMethod?: PurchasePaymentMethod;
  note?: string;
  date: string;
  timestamp?: number;
  createdAt?: any;
  updatedAt?: any;
}

export type ExpenseCategory =
  | "Rent"
  | "Utility Bill"
  | "Salary"
  | "Transport"
  | "Marketing"
  | "Maintenance"
  | "Other";

export type ExpensePaymentMethod = "cash" | "bkash" | "nagad" | "bank" | "card";
export type RecurrenceFrequency = "monthly" | "weekly" | "yearly";

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory | string; // string allows custom categories too
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  note?: string;
  date: string;
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  nextDueDate?: string; // auto-computed for recurring expenses
  timestamp?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ReportExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  createdAt?: string;
}

export interface ActivityLogEntry {
  id: string;
  staffId?: string;
  staffName: string;
  staffRole?: string;
  action: string;
  actionType?: "create" | "update" | "delete" | "status_change" | "payment";
  module?: string;
  description?: string;
  targetId?: string;
  targetType:
    | "product"
    | "order"
    | "purchase"
    | "expense"
    | "supplier"
    | "category"
    | "staff"
    | "customer"
    | "review"
    | "account";
  targetName?: string;
  details?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  date?: string;
  createdAt?: string;
}

export interface ActivityLogQuery {
  page?: number;
  limit?: number;
  staff?: string;
  role?: string;
  module?: string;
  actionType?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface ActivityLogPage {
  logs: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    staff: { staffId?: string; name: string; role?: string }[];
    roles: string[];
    modules: string[];
    actionTypes: string[];
  };
}

export interface ReviewScreenshot {
  id: string;
  customerName: string;
  customerLocation?: string;
  productId?: string;
  productName?: string;
  rating: number;
  comment?: string;
  image?: string;
  imageAlt?: string;
  date?: string;
  verified?: boolean;
}
