import {
  Product,
  OrderItem,
  Supplier,
  PurchaseEntry,
  Expense,
  ActivityLogPage,
  ActivityLogQuery,
  CategoryItem,
  ReviewScreenshot,
  StaffRole,
  ReportExpense,
  StoreContactSettings,
} from "../types";

// Set VITE_API_URL in your .env file to point at your deployed backend;
// defaults to the local dev server.
const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api";

const TOKEN_KEY = "shopora_admin_token";
const CUSTOMER_TOKEN_KEY = "shopora_customer_token";
const ADMIN_SESSION_KEY = "amarshop_admin_session";

// The admin screen drops the session if the server rejects an expired or invalid token.
export const AUTH_EXPIRED_EVENT = "shopora:auth-expired";
export const ADMIN_AUTH_CHANGED_EVENT = "shopora:admin-auth-changed";
export const CUSTOMER_AUTH_EXPIRED_EVENT = "shopora:customer-auth-expired";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const getCustomerToken = (): string | null =>
  localStorage.getItem(CUSTOMER_TOKEN_KEY);
export const setCustomerToken = (token: string): void =>
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
export const clearCustomerToken = (): void =>
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT));
};
export const clearToken = (): void => {
  const hadToken = Boolean(getToken());
  localStorage.removeItem(TOKEN_KEY);
  if (hadToken) window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT));
};

type SessionKind = "admin" | "customer" | "none";

async function request<T>(
  path: string,
  options: RequestInit = {},
  session: SessionKind = "admin",
): Promise<T> {
  const token =
    session === "admin"
      ? getToken()
      : session === "customer"
        ? getCustomerToken()
        : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A 401 on any route other than the login form means the saved token is
    // no longer valid: clear it and tell the UI to ask for a fresh login.
    if (
      res.status === 401 &&
      !path.includes("/auth/login") &&
      !path.includes("/auth/signup")
    ) {
      if (session === "admin") {
        clearToken();
        localStorage.removeItem(ADMIN_SESSION_KEY);
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      } else if (session === "customer") {
        clearCustomerToken();
        window.dispatchEvent(new Event(CUSTOMER_AUTH_EXPIRED_EVENT));
      }
      throw new Error(
        session === "customer"
          ? "Your customer session expired. Please sign in again."
          : "আপনার লগইনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।",
      );
    }
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

// MongoDB documents come back with `_id` — the frontend expects `id`.
function normalizeId<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  const { _id, ...rest } = obj as any;
  return (_id ? { id: _id, ...rest } : obj) as T;
}
function normalizeList<T extends Record<string, any>>(list: T[]): T[] {
  return (list || []).map(normalizeId);
}

/* ---------------- Auth ---------------- */
export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  staffRole?: StaffRole;
  employeeId?: string;
}

export const login = async (email: string, password: string) => {
  const res = await request<{ token: string; user: AdminSession }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  setToken(res.token);
  return res.user;
};

export const getAdminSession = async (): Promise<AdminSession> => {
  const res = await request<{ user: AdminSession }>("/auth/me");
  return res.user;
};

export type StaffStatus = "active" | "inactive";

export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: StaffStatus;
  role: StaffRole;
  joiningDate: string;
  designation: string;
  address: string;
  employeeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  status: StaffStatus;
  role: StaffRole;
  joiningDate: string;
  designation: string;
  address: string;
}

export const fetchStaff = async (): Promise<StaffRecord[]> => {
  const res = await request<{ staff: StaffRecord[] }>("/staff");
  return res.staff;
};

export const createStaffApi = async (
  data: StaffFormData,
): Promise<StaffRecord> => {
  const res = await request<{ staff: StaffRecord }>("/staff", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.staff;
};

export const updateStaffApi = async (
  id: string,
  data: Partial<StaffFormData>,
): Promise<StaffRecord> => {
  const res = await request<{ staff: StaffRecord }>(`/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.staff;
};

export const deleteStaffApi = async (id: string): Promise<void> => {
  await request(`/staff/${id}`, { method: "DELETE" });
};

/* ---------------- Customer accounts ---------------- */
export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  district?: string;
  createdAt?: string;
}

export interface GuestIdentity {
  guestId: string;
  secret: string;
}

export interface CustomerDirectoryRecord {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  isGuest: boolean;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  orders: Array<{
    id: string;
    total: number;
    status: string;
    date: string;
    items: string;
    customerId?: string;
    phone: string;
  }>;
}

interface MergeCartLine {
  productId: string;
  quantity: number;
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
}

export const authenticateCustomer = async (
  mode: "login" | "signup",
  credentials: { name?: string; email: string; password: string },
): Promise<{ token: string; customer: CustomerProfile }> => {
  const path =
    mode === "signup" ? "/customers/auth/signup" : "/customers/auth/login";
  return request<{ token: string; customer: CustomerProfile }>(
    path,
    { method: "POST", body: JSON.stringify(credentials) },
    "none",
  );
};

export const mergeCustomerGuestData = async (
  token: string,
  data: {
    guestIdentity: GuestIdentity;
    profile: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      district?: string;
    };
    cart: MergeCartLine[];
  },
) =>
  request<{ customer: CustomerProfile; cart: MergeCartLine[] }>(
    "/customers/merge",
    {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    },
    "none",
  );

export const fetchCustomerSession = async (): Promise<CustomerProfile> => {
  const res = await request<{ customer: CustomerProfile }>(
    "/customers/auth/me",
    {},
    "customer",
  );
  return res.customer;
};

export const fetchCustomersApi = async (): Promise<
  CustomerDirectoryRecord[]
> => {
  const res = await request<{ customers: CustomerDirectoryRecord[] }>(
    "/customers",
  );
  return normalizeList(res.customers);
};

export const fetchCustomerOrders = async (): Promise<OrderItem[]> => {
  const res = await request<{ orders: any[] }>(
    "/customers/me/orders",
    {},
    "customer",
  );
  return normalizeList(res.orders);
};

/* ---------------- Products ---------------- */
export const fetchProducts = async (): Promise<Product[]> => {
  const res = await request<{ products: any[] }>("/products");
  return normalizeList(res.products);
};
export const createProductApi = async (
  data: Partial<Product>,
): Promise<Product> => {
  const res = await request<{ product: any }>("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeId(res.product);
};
export const updateProductApi = async (
  id: string,
  data: Partial<Product>,
): Promise<Product> => {
  const res = await request<{ product: any }>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return normalizeId(res.product);
};
export const deleteProductApi = async (id: string): Promise<void> => {
  await request(`/products/${id}`, { method: "DELETE" });
};

/* ---------------- Categories ---------------- */
export const fetchCategories = async (): Promise<CategoryItem[]> => {
  const res = await request<{ categories: any[] }>("/categories");
  return normalizeList(res.categories);
};
export const createCategoryApi = async (
  data: Partial<CategoryItem>,
): Promise<CategoryItem> => {
  const res = await request<{ category: any }>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeId(res.category);
};
export const updateCategoryApi = async (
  id: string,
  data: Partial<CategoryItem>,
): Promise<CategoryItem> => {
  const res = await request<{ category: any }>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return normalizeId(res.category);
};
export const deleteCategoryApi = async (id: string): Promise<void> => {
  await request(`/categories/${id}`, { method: "DELETE" });
};

/* ---------------- Orders ---------------- */
export const fetchOrders = async (): Promise<OrderItem[]> => {
  const res = await request<{ orders: any[] }>("/orders");
  return normalizeList(res.orders);
};
export const createOrderApi = async (
  data: Partial<OrderItem>,
  options: {
    session?: SessionKind;
    guestIdentity?: GuestIdentity;
  } = {},
): Promise<OrderItem> => {
  const res = await request<{ order: any }>(
    "/orders",
    {
      method: "POST",
      body: JSON.stringify({
        ...data,
        ...(options.guestIdentity
          ? { guestIdentity: options.guestIdentity }
          : {}),
      }),
    },
    options.session,
  );
  return normalizeId(res.order);
};
export const updateOrderStatusApi = async (
  id: string,
  status: string,
): Promise<OrderItem> => {
  const res = await request<{ order: any }>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return normalizeId(res.order);
};
export const updateOrderApi = async (
  id: string,
  data: Partial<OrderItem>,
): Promise<OrderItem> => {
  const res = await request<{ order: any }>(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return normalizeId(res.order);
};
export const deleteOrderApi = async (id: string): Promise<void> => {
  await request(`/orders/${id}`, { method: "DELETE" });
};

/* ---------------- Suppliers ---------------- */
export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const res = await request<{ suppliers: any[] }>("/suppliers");
  return normalizeList(res.suppliers);
};
export const createSupplierApi = async (
  data: Partial<Supplier>,
): Promise<Supplier> => {
  const res = await request<{ supplier: any }>("/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeId(res.supplier);
};
export const updateSupplierApi = async (
  id: string,
  data: Partial<Supplier>,
): Promise<Supplier> => {
  const res = await request<{ supplier: any }>(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return normalizeId(res.supplier);
};
export const deleteSupplierApi = async (id: string): Promise<void> => {
  await request(`/suppliers/${id}`, { method: "DELETE" });
};

/* ---------------- Purchases ---------------- */
export const fetchPurchases = async (): Promise<PurchaseEntry[]> => {
  const res = await request<{ purchases: any[] }>("/purchases");
  return normalizeList(res.purchases);
};
export const createPurchaseApi = async (data: {
  supplierId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }[];
  paidAmount?: number;
  paymentMethod?: string;
  note?: string;
}): Promise<PurchaseEntry> => {
  const res = await request<{ purchase: any }>("/purchases", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeId(res.purchase);
};
export const recordPurchasePaymentApi = async (
  id: string,
  amount: number,
): Promise<PurchaseEntry> => {
  const res = await request<{ purchase: any }>(`/purchases/${id}/pay`, {
    method: "PATCH",
    body: JSON.stringify({ amount }),
  });
  return normalizeId(res.purchase);
};
export const deletePurchaseApi = async (id: string): Promise<void> => {
  await request(`/purchases/${id}`, { method: "DELETE" });
};

/* ---------------- Expenses ---------------- */
export const fetchExpenses = async (): Promise<Expense[]> => {
  const res = await request<{ expenses: any[] }>("/expenses");
  return normalizeList(res.expenses);
};
export const fetchReportExpenses = async (): Promise<ReportExpense[]> => {
  const res = await request<{ expenses: ReportExpense[] }>("/reports/expenses");
  return res.expenses;
};
export const createExpenseApi = async (
  data: Partial<Expense>,
): Promise<Expense> => {
  const res = await request<{ expense: any }>("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeId(res.expense);
};
export const deleteExpenseApi = async (id: string): Promise<void> => {
  await request(`/expenses/${id}`, { method: "DELETE" });
};

/* ---------------- Account Summary ---------------- */
export const fetchAccountSummary = async () => {
  const res = await request<{ summary: any }>("/account/summary");
  return res.summary;
};

/* ---------------- Reviews ---------------- */
export const fetchReviews = async (): Promise<ReviewScreenshot[]> => {
  const res = await request<{ reviews: any[] }>("/reviews");
  return normalizeList(res.reviews);
};
export const createReviewApi = async (
  data: Partial<ReviewScreenshot>,
): Promise<ReviewScreenshot> => {
  const res = await request<{ review: any }>("/reviews/admin", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return normalizeId(res.review);
};
export const fetchProductReviews = async (
  productId: string,
): Promise<ReviewScreenshot[]> => {
  const res = await request<{ reviews: any[] }>(
    `/reviews?productId=${encodeURIComponent(productId)}`,
    {},
    "none",
  );
  return normalizeList(res.reviews);
};
export const createCustomerReviewApi = async (
  data: {
    productId: string;
    customerName: string;
    rating: number;
    comment: string;
    image?: string;
    imageAlt?: string;
  },
): Promise<ReviewScreenshot> => {
  const res = await request<{ review: any }>(
    "/reviews",
    { method: "POST", body: JSON.stringify(data) },
    "none",
  );
  return normalizeId(res.review);
};
export const updateReviewApi = async (
  id: string,
  data: Partial<ReviewScreenshot>,
): Promise<ReviewScreenshot> => {
  // Fixed: this used to PATCH /categories/:id by mistake
  const res = await request<{ review: any }>(`/reviews/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return normalizeId(res.review);
};
export const deleteReviewApi = async (id: string): Promise<void> => {
  await request(`/reviews/${id}`, { method: "DELETE" });
};

/* ---------------- Store Contact Settings ---------------- */
export const fetchStoreContactSettingsApi =
  async (): Promise<StoreContactSettings> => {
    const res = await request<{ settings: StoreContactSettings }>(
      "/store-settings",
      { cache: "no-store" },
      "none",
    );
    return res.settings;
  };

export const updateStoreContactSettingsApi = async (
  settings: StoreContactSettings,
): Promise<StoreContactSettings> => {
  const res = await request<{ settings: StoreContactSettings }>(
    "/store-settings",
    {
      method: "PUT",
      body: JSON.stringify(settings),
    },
  );
  return res.settings;
};

/* ---------------- Activity Log ---------------- */
export const fetchActivityLogs = async (
  filters: ActivityLogQuery = {},
): Promise<ActivityLogPage> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  const res = await request<ActivityLogPage & { logs: any[] }>(
    `/activity-logs${query ? `?${query}` : ""}`,
  );
  return { ...res, logs: normalizeList(res.logs) };
};

/* ---------------- Stock Notify ---------------- */
export const createStockNotifyApi = async (
  productId: string,
  productName: string,
  contact: string,
): Promise<void> => {
  await request("/stock-notify", {
    method: "POST",
    body: JSON.stringify({ productId, productName, contact }),
  });
};
