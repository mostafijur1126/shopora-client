import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  Product,
  ActiveScreen,
  OrderItem,
  ReviewScreenshot,
  CategoryItem,
  Supplier,
  PurchaseEntry,
  Expense,
  ReportExpense,
} from "../types";
import { AdminLoginCard } from "./AdminLoginCard";
import {
  clearToken,
  getToken,
  getAdminSession,
  AUTH_EXPIRED_EVENT,
  CustomerDirectoryRecord,
  AdminSession,
} from "../services/api";
import { AdminDashboardOverview } from "./admin/AdminDashboardOverview";
import { StaffRole } from "../types";
import {
  AdminSection,
  canAccessAdminSection,
} from "../utils/adminPermissions";

import {
  LayoutGrid,
  Boxes,
  ShoppingBag,
  Users,
  Shield,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  Menu,
  X,
  Store,
  Layers,
  Star,
  Loader2,
  Truck,
  Wallet,
  AlertTriangle,
  Landmark,
  FileText,
  History,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";

// Lazy load admin secondary tabs to keep dashboard ultra lightweight
const AdminProductManagement = lazy(() =>
  import("./admin/AdminProductManagement").then((m) => ({
    default: m.AdminProductManagement,
  })),
);
const AdminOrderManagementDashboard = lazy(() =>
  import("./admin/AdminOrderManagementDashboard").then((m) => ({
    default: m.AdminOrderManagementDashboard,
  })),
);
const AdminCustomerCRM = lazy(() =>
  import("./admin/AdminCustomerCRM").then((m) => ({
    default: m.AdminCustomerCRM,
  })),
);
const AdminStaffPermissions = lazy(() =>
  import("./admin/AdminStaffPermissions").then((m) => ({
    default: m.AdminStaffPermissions,
  })),
);
const AdminStoreSettings = lazy(() =>
  import("./admin/AdminStoreSettings").then((m) => ({
    default: m.AdminStoreSettings,
  })),
);
const AdminReviewsTab = lazy(() =>
  import("./admin/AdminReviewsTab").then((m) => ({
    default: m.AdminReviewsTab,
  })),
);
const AdminCategoriesTab = lazy(() =>
  import("./AdminCategoriesTab").then((m) => ({
    default: m.AdminCategoriesTab,
  })),
);
const AdminPurchaseSupplierTab = lazy(() =>
  import("./admin/AdminPurchaseSupplierTab").then((m) => ({
    default: m.AdminPurchaseSupplierTab,
  })),
);
const AdminExpenseTab = lazy(() =>
  import("./admin/AdminExpenseTab").then((m) => ({
    default: m.AdminExpenseTab,
  })),
);
const AdminAccountCashFlow = lazy(() =>
  import("./admin/AdminAccountCashFlow").then((m) => ({
    default: m.AdminAccountCashFlow,
  })),
);
const AdminReportsTab = lazy(() =>
  import("./admin/AdminReportsTab").then((m) => ({
    default: m.AdminReportsTab,
  })),
);
const AdminActivityLogTab = lazy(() =>
  import("./admin/AdminActivityLogTab").then((m) => ({
    default: m.AdminActivityLogTab,
  })),
);

const TabLoaderFallback = () => (
  <div className="flex items-center justify-center p-12 text-center text-gray-500 font-montserrat">
    <Loader2 className="w-6 h-6 animate-spin text-[#00503a] mr-2" />
    <span className="text-sm font-semibold">Loading...</span>
  </div>
);

// If one tab crashes, show a message instead of a white screen for the whole admin
class TabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Admin tab crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl border border-red-100 p-8 text-center max-w-md mx-auto mt-6">
          <AlertTriangle className="w-10 h-10 text-[#bb0027] mx-auto mb-3" />
          <p className="font-bold text-gray-900">
            Something went wrong in this section
          </p>
          <p className="text-sm text-gray-500 mt-1">
            The rest of the admin panel still works. Try again, or open another
            section.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 h-11 px-6 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type SaveResult = void | boolean | Promise<void | boolean>;

interface AdminScreenProps {
  products: Product[];
  categories?: CategoryItem[];
  reviews: ReviewScreenshot[];
  orders?: OrderItem[];
  customers?: CustomerDirectoryRecord[];
  onAddProduct: (product: Product) => SaveResult;
  onUpdateProduct: (product: Product) => SaveResult;
  onDeleteProduct: (productId: string) => void;
  onAddCategory?: (category: CategoryItem) => void;
  onUpdateCategory?: (category: CategoryItem) => void;
  onDeleteCategory?: (categoryId: string) => void;
  suppliers?: Supplier[];
  purchases?: PurchaseEntry[];
  onAddSupplier?: (supplier: Supplier) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplierId: string) => void;
  onAddPurchase?: (purchase: PurchaseEntry) => void;
  onDeletePurchase?: (purchaseId: string) => void;
  onRecordPurchasePayment?: (purchaseId: string, amount: number) => void;
  expenses?: Expense[];
  reportExpenses?: ReportExpense[] | null;
  onAddExpense?: (expense: Expense) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onAddReview: (review: ReviewScreenshot) => void;
  onUpdateReview: (review: ReviewScreenshot) => void;
  onDeleteReview: (reviewId: string) => void;
  onAddOrder?: (newOrder: OrderItem) => void;
  onUpdateOrder?: (updatedOrder: OrderItem) => void;
  onUpdateOrderStatus?: (orderId: string, status: OrderItem["status"]) => void;
  onDeleteOrder?: (orderId: string) => void;
  onNavigate: (screen: ActiveScreen) => void;
  // Manual refresh (no auto polling): data loads when admin opens + on click
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefreshedAt?: Date | null;
}

export type AdminTab = AdminSection;

/* ------------------------------------------------------------------ */
/* navigation structure                                                */
/* ------------------------------------------------------------------ */

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Sales",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
      { id: "orders", label: "Orders", icon: ShoppingBag },
      { id: "customers", label: "Customers", icon: Users },
      { id: "reviews", label: "Customer Reviews", icon: Star },
    ],
  },
  {
    title: "Inventory",
    items: [
      { id: "products", label: "Products", icon: Boxes },
      { id: "categories", label: "Categories", icon: Layers },
      { id: "purchases", label: "Purchase & Supplier", icon: Truck },
    ],
  },
  {
    title: "Finance",
    items: [
      { id: "expenses", label: "Expenses", icon: Wallet },
      { id: "account", label: "Account & Cash Flow", icon: Landmark },
      { id: "reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "Store",
    items: [
      { id: "staff", label: "Staff & Roles", icon: Shield },
      { id: "activity", label: "Activity Log", icon: History },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const ALL_TABS = ALL_NAV_ITEMS.map((i) => i.id);
const TAB_LABELS = Object.fromEntries(
  ALL_NAV_ITEMS.map((i) => [i.id, i.label]),
) as Record<AdminTab, string>;

// The four tabs shown in the phone's bottom bar. Everything else is under "More".
const BOTTOM_TABS: AdminTab[] = [
  "dashboard",
  "orders",
  "products",
  "customers",
];

const SESSION_KEY = "amarshop_admin_session";
const ACTIVE_TAB_KEY = "amarshop_admin_active_tab";

const loadSavedTab = (): AdminTab => {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_KEY) as AdminTab | null;
    if (saved && ALL_TABS.includes(saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return "dashboard";
};

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export const AdminScreen: React.FC<AdminScreenProps> = ({
  products,
  categories = [],
  reviews,
  orders = [],
  customers = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory = () => {},
  onUpdateCategory = () => {},
  onDeleteCategory = () => {},
  suppliers = [],
  purchases = [],
  onAddSupplier = () => {},
  onUpdateSupplier = () => {},
  onDeleteSupplier = () => {},
  onAddPurchase = () => {},
  onDeletePurchase = () => {},
  onRecordPurchasePayment = () => {},
  expenses = [],
  reportExpenses = null,
  onAddExpense = () => {},
  onDeleteExpense = () => {},
  onAddReview,
  onUpdateReview,
  onDeleteReview,
  onAddOrder,
  onUpdateOrder,
  onUpdateOrderStatus = () => {},
  onDeleteOrder = () => {},
  onNavigate,
  onRefresh,
  isRefreshing = false,
  lastRefreshedAt = null,
}) => {
  // Admin authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        return Boolean(parsed.isLoggedIn) && Boolean(getToken());
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  });
  const [isValidatingSession, setIsValidatingSession] =
    useState<boolean>(() => isAuthenticated);
  const [sessionValidationError, setSessionValidationError] = useState<
    string | null
  >(null);
  const [sessionValidationAttempt, setSessionValidationAttempt] = useState(0);
  const [accountRole, setAccountRole] = useState<AdminSession["role"] | null>(
    null,
  );
  const [staffRole, setStaffRole] = useState<StaffRole>();

  const [adminName, setAdminName] = useState<string>(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.adminName || "Admin";
      }
    } catch (e) {
      console.error(e);
    }
    return "Admin";
  });

  // The open tab survives a page reload (and an unknown saved value falls back to the dashboard)
  const [activeTab, setActiveTab] = useState<AdminTab>(loadSavedTab);
  const canAccessTab = (tab: AdminTab) =>
    canAccessAdminSection(accountRole, staffRole, tab);
  const currentTab = canAccessTab(activeTab) ? activeTab : "dashboard";
  const availableNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessTab(item.id)),
  })).filter((group) => group.items.length > 0);
  const visibleBottomTabs = BOTTOM_TABS.filter(canAccessTab);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<null | "notif" | "user">(null);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  // Every tab change starts at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab]);

  useEffect(() => {
    if (
      accountRole &&
      !canAccessAdminSection(accountRole, staffRole, activeTab)
    ) {
      setActiveTab("dashboard");
    }
  }, [accountRole, staffRole, activeTab]);

  // If the API says the token is invalid/expired, drop back to the login form.
  useEffect(() => {
    const onAuthExpired = () => {
      localStorage.removeItem(SESSION_KEY);
      setIsAuthenticated(false);
      setAccountRole(null);
      setStaffRole(undefined);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsValidatingSession(false);
      return;
    }

    let cancelled = false;
    setIsValidatingSession(true);
    setSessionValidationError(null);
    getAdminSession()
      .then((user) => {
        if (!cancelled) {
          setAdminName(user.name);
          setAccountRole(user.role);
          setStaffRole(user.staffRole);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (!getToken()) {
          localStorage.removeItem(SESSION_KEY);
          setIsAuthenticated(false);
        } else {
          setSessionValidationError(
            error instanceof Error
              ? error.message
              : "Could not verify the admin session.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsValidatingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, sessionValidationAttempt]);

  // Close the header menus on an outside tap, and everything on Escape
  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-admin-menu]")) setOpenMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setIsDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Lock page scroll behind the phone menu
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  const selectTab = (tab: AdminTab) => {
    setActiveTab(canAccessTab(tab) ? tab : "dashboard");
    setIsDrawerOpen(false);
    setOpenMenu(null);
  };

  const handleLoginSuccess = (user: AdminSession) => {
    setAdminName(user.name);
    setAccountRole(user.role);
    setStaffRole(user.staffRole);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ACTIVE_TAB_KEY);
    } catch {
      // ignore storage errors
    }
    clearToken();
    setIsDrawerOpen(false);
    setOpenMenu(null);
    setIsAuthenticated(false);
    setAccountRole(null);
    setStaffRole(undefined);
    onNavigate("home");
  };

  if (isValidatingSession) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm font-semibold text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin text-[#00503a]" />
        Verifying admin session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLoginCard
        onLoginSuccess={handleLoginSuccess}
        onBackToStore={() => onNavigate("home")}
      />
    );
  }

  if (sessionValidationError) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <p className="font-bold text-gray-900">Unable to verify your session</p>
        <p className="mt-2 text-sm text-gray-600">{sessionValidationError}</p>
        <button
          onClick={() => setSessionValidationAttempt((attempt) => attempt + 1)}
          className="mt-4 rounded-xl bg-[#00503a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003828]"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ---------- badges + notifications ---------- */
  const pendingOrdersCount = orders.filter(
    (o) => o.status === "pending",
  ).length;
  const lowStockCount = products.filter((p) => {
    const qty = p.stockQty ?? 0;
    return !p.inStock || qty <= (p.lowStockThreshold ?? 10);
  }).length;
  const duePurchasesCount = purchases.filter((p) => p.dueAmount > 0).length;

  const badges: Partial<Record<AdminTab, { text: string; cls: string }>> = {};
  if (pendingOrdersCount > 0)
    badges.orders = {
      text: String(pendingOrdersCount),
      cls: "bg-amber-500 text-white",
    };
  if (lowStockCount > 0)
    badges.products = {
      text: String(lowStockCount),
      cls: "bg-[#bb0027] text-white",
    };
  if (duePurchasesCount > 0)
    badges.purchases = {
      text: String(duePurchasesCount),
      cls: "bg-[#bb0027] text-white",
    };

  const notifications: {
    tab: AdminTab;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }[] = [];
  if (pendingOrdersCount > 0)
    notifications.push({
      tab: "orders",
      text: `${pendingOrdersCount}টি নতুন অর্ডার পেন্ডিং`,
      icon: ShoppingBag,
      tone: "bg-amber-50 text-amber-600",
    });
  if (lowStockCount > 0)
    notifications.push({
      tab: "products",
      text: `${lowStockCount}টি প্রোডাক্ট লো-স্টকে`,
      icon: AlertTriangle,
      tone: "bg-red-50 text-[#bb0027]",
    });
  if (duePurchasesCount > 0)
    notifications.push({
      tab: "purchases",
      text: `${duePurchasesCount}টি পারচেজে বকেয়া আছে`,
      icon: Truck,
      tone: "bg-red-50 text-[#bb0027]",
    });
  const notificationCount =
    pendingOrdersCount + lowStockCount + duePurchasesCount;

  const initial = adminName.trim().charAt(0).toUpperCase() || "A";
  const isBottomTab = visibleBottomTabs.includes(currentTab);

  /* ---------- shared navigation list (sidebar + phone menu) ---------- */
  const renderNav = (roomy: boolean) => (
    <nav aria-label="Admin sections" className="space-y-5">
      {availableNavGroups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const badge = badges[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 rounded-xl text-sm transition-colors cursor-pointer ${
                    roomy ? "min-h-[46px]" : "min-h-[42px]"
                  } ${
                    isActive
                      ? "bg-[#00503a] text-white font-bold shadow-xs"
                      : "text-gray-700 font-medium hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-gray-500"}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isActive ? "bg-white text-[#00503a]" : badge.cls
                      }`}
                    >
                      {badge.text}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-[#00503a] text-[#9ef4d0] flex items-center justify-center shrink-0">
        <ShoppingBag className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h2 className="font-bold text-sm text-[#00503a] font-montserrat leading-tight">
          Admin Panel
        </h2>
        <p className="text-[11px] text-gray-400">Shopora Management</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col bg-[#f8f9fa] text-[#191c1d] font-sans antialiased">
      {/* ================= Header ================= */}
      <header className="sticky top-0 z-40 h-14 sm:h-16 bg-white border-b border-gray-200/90 px-3 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
            className="lg:hidden w-10 h-10 -ml-1 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <p className="hidden sm:block text-[11px] text-gray-400 font-montserrat leading-none mb-0.5">
              Admin Portal
              {lastRefreshedAt && (
                <span> · Updated {lastRefreshedAt.toLocaleTimeString()}</span>
              )}
            </p>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 font-montserrat truncate leading-tight">
              {TAB_LABELS[currentTab]}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Manual refresh: reloads all admin data from the database */}
          {onRefresh && (
            <button
              id="admin-refresh-btn"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh data"
              title={
                lastRefreshedAt
                  ? `Last updated ${lastRefreshedAt.toLocaleTimeString()}`
                  : "Refresh data"
              }
              className="flex items-center gap-1.5 h-10 px-3 sm:px-3.5 text-xs font-bold text-[#00503a] hover:bg-emerald-50 rounded-xl border border-[#00503a]/25 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </span>
            </button>
          )}

          {/* Storefront (desktop and tablet; phones use the account menu) */}
          <button
            id="admin-live-storefront-btn"
            type="button"
            onClick={() => onNavigate("home")}
            title="Open the customer store"
            className="hidden sm:flex items-center gap-1.5 h-10 px-3.5 text-xs font-bold text-[#00503a] hover:bg-emerald-50 rounded-xl border border-[#00503a]/25 transition-colors cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>Storefront</span>
          </button>

          {/* Notifications */}
          <div data-admin-menu className="relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu((m) => (m === "notif" ? null : "notif"))
              }
              aria-label={`Notifications${notificationCount ? `, ${notificationCount} new` : ""}`}
              aria-expanded={openMenu === "notif"}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#bb0027] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>

            {openMenu === "notif" && (
              <div className="fixed inset-x-3 top-[3.75rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 p-2 max-h-[70vh] overflow-y-auto">
                <p className="text-xs font-bold text-gray-500 px-2.5 py-2">
                  নোটিফিকেশন
                </p>
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-400 px-2.5 py-6 text-center">
                    কোনো নতুন নোটিফিকেশন নেই।
                  </p>
                ) : (
                  notifications.map((n) => {
                    const Icon = n.icon;
                    return (
                      <button
                        key={n.tab}
                        type="button"
                        onClick={() => selectTab(n.tab)}
                        className="w-full text-left px-2.5 min-h-[48px] rounded-xl hover:bg-gray-50 text-sm flex items-center gap-3 cursor-pointer"
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.tone}`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-gray-800">{n.text}</span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Account menu */}
          <div data-admin-menu className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === "user" ? null : "user"))}
              aria-label="Account menu"
              aria-expanded={openMenu === "user"}
              className="flex items-center gap-2 h-10 pl-1 pr-1 sm:pr-2.5 rounded-xl hover:bg-gray-100 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-full bg-[#00503a] text-white text-sm font-bold flex items-center justify-center">
                {initial}
              </span>
              <span className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-gray-900 max-w-[120px] truncate">
                  {adminName}
                </span>
                <span className="text-[10px] text-gray-500">
                  {staffRole || "Administrator"}
                </span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
            </button>

            {openMenu === "user" && (
              <div className="fixed inset-x-3 top-[3.75rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {adminName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {staffRole || "Administrator"}
                  </p>
                </div>
                <div className="p-1.5">
                  {canAccessTab("settings") && (
                    <button
                      type="button"
                      onClick={() => selectTab("settings")}
                      className="w-full text-left px-3 min-h-[44px] rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      <span>Store Settings</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      onNavigate("home");
                    }}
                    className="w-full text-left px-3 min-h-[44px] rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 cursor-pointer"
                  >
                    <Store className="w-4 h-4 text-gray-400" />
                    <span>View Storefront</span>
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 min-h-[44px] rounded-xl text-sm font-semibold text-[#bb0027] hover:bg-red-50 flex items-center gap-3 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= Body ================= */}
      <div className="flex-1 flex w-full max-w-[1700px] mx-auto">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-gray-200/90 sticky top-16 self-start h-[calc(100dvh-4rem)]">
          <div className="p-5 pb-3">{brand}</div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {renderNav(false)}
          </div>
          <div className="p-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 min-h-[44px] rounded-xl text-sm font-semibold text-[#bb0027] hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main content. min-w-0 stops wide tables from stretching the page. */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <TabErrorBoundary key={currentTab}>
            <Suspense fallback={<TabLoaderFallback />}>
              {currentTab === "dashboard" && (
                <AdminDashboardOverview
                  products={products}
                  orders={orders}
                  customersCount={customers.length}
                  onNavigateTab={(tab) => selectTab(tab)}
                  onAddOrder={onAddOrder}
                  onUpdateOrder={onUpdateOrder}
                  onUpdateOrderStatus={onUpdateOrderStatus}
                />
              )}

              {currentTab === "products" && (
                <AdminProductManagement
                  products={products}
                  categories={categories}
                  onAddProduct={onAddProduct}
                  onUpdateProduct={onUpdateProduct}
                  onDeleteProduct={onDeleteProduct}
                />
              )}

              {currentTab === "categories" && (
                <AdminCategoriesTab
                  categories={categories}
                  products={products}
                  onAddCategory={onAddCategory}
                  onUpdateCategory={onUpdateCategory}
                  onDeleteCategory={onDeleteCategory}
                />
              )}

              {currentTab === "orders" && (
                <AdminOrderManagementDashboard
                  orders={orders}
                  products={products}
                  onUpdateOrderStatus={onUpdateOrderStatus}
                  onAddOrder={onAddOrder}
                  onUpdateOrder={onUpdateOrder}
                  onDeleteOrder={onDeleteOrder}
                />
              )}

              {currentTab === "purchases" && (
                <AdminPurchaseSupplierTab
                  products={products}
                  suppliers={suppliers}
                  purchases={purchases}
                  onAddSupplier={onAddSupplier}
                  onUpdateSupplier={onUpdateSupplier}
                  onDeleteSupplier={onDeleteSupplier}
                  onAddPurchase={onAddPurchase}
                  onDeletePurchase={onDeletePurchase}
                  onRecordPurchasePayment={onRecordPurchasePayment}
                />
              )}

              {currentTab === "customers" && (
                <AdminCustomerCRM customers={customers} />
              )}

              {currentTab === "expenses" && (
                <AdminExpenseTab
                  expenses={expenses}
                  onAddExpense={onAddExpense}
                  onDeleteExpense={onDeleteExpense}
                />
              )}

              {currentTab === "account" && (
                <AdminAccountCashFlow
                  products={products}
                  orders={orders}
                  purchases={purchases}
                  expenses={expenses}
                />
              )}

              {currentTab === "reports" && (
                <AdminReportsTab
                  orders={orders}
                  purchases={purchases}
                  expenses={reportExpenses ?? expenses}
                />
              )}

              {currentTab === "activity" && (
                <AdminActivityLogTab />
              )}

              {currentTab === "staff" && <AdminStaffPermissions />}

              {currentTab === "reviews" && (
                <AdminReviewsTab
                  reviews={reviews}
                  products={products}
                  onAddReview={onAddReview}
                  onUpdateReview={onUpdateReview}
                  onDeleteReview={onDeleteReview}
                />
              )}

              {currentTab === "settings" && <AdminStoreSettings />}
            </Suspense>
          </TabErrorBoundary>
        </main>
      </div>

      {/* ================= Phone bottom bar ================= */}
      <nav
        aria-label="Quick navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${visibleBottomTabs.length + 1}, minmax(0, 1fr))`,
          }}
        >
          {visibleBottomTabs.map((id) => {
            const item = ALL_NAV_ITEMS.find((n) => n.id === id)!;
            const Icon = item.icon;
            const isActive = currentTab === id;
            const badge = badges[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer transition-colors ${
                  isActive ? "text-[#00503a]" : "text-gray-500"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 inset-x-5 h-0.5 rounded-b-full bg-[#00503a]" />
                )}
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {badge && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${badge.cls}`}
                    >
                      {badge.text}
                    </span>
                  )}
                </span>
                <span>{item.label.split(" ")[0]}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`relative h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer transition-colors ${
              !isBottomTab ? "text-[#00503a]" : "text-gray-500"
            }`}
          >
            {!isBottomTab && (
              <span className="absolute top-0 inset-x-5 h-0.5 rounded-b-full bg-[#00503a]" />
            )}
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* ================= Phone menu (slides in from the left) ================= */}
      <div
        className={`lg:hidden fixed inset-0 z-50 ${
          isDrawerOpen
            ? "visible"
            : "invisible pointer-events-none [transition:visibility_0s_300ms]"
        }`}
      >
        <div
          onClick={() => setIsDrawerOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            isDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          className={`absolute inset-y-0 left-0 w-[86%] max-w-xs bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="shrink-0 h-16 px-4 flex items-center justify-between border-b border-gray-100">
            {brand}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close menu"
              className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#00503a] text-white font-bold flex items-center justify-center">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {adminName}
              </p>
              <p className="text-xs text-gray-500">
                {staffRole || "Administrator"}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
            {renderNav(true)}
          </div>

          <div className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-100 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                onNavigate("home");
              }}
              className="h-11 rounded-xl border border-[#00503a]/25 text-[#00503a] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-50"
            >
              <Store className="w-4 h-4" />
              Storefront
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="h-11 rounded-xl bg-red-50 text-[#bb0027] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-red-100"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
