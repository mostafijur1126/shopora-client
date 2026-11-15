import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  lazy,
  useRef,
} from "react";
import {
  Product,
  CartItem,
  ActiveScreen,
  ReviewScreenshot,
  CategoryItem,
  OrderItem,
  Supplier,
  PurchaseEntry,
  Expense,
  ReportExpense,
} from "./types";
import { ProductDetailScreen } from "./components/ProductDetailScreen";
import {
  fetchProducts,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  fetchCategories,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
  fetchOrders,
  createOrderApi,
  updateOrderStatusApi,
  updateOrderApi,
  deleteOrderApi,
  fetchSuppliers,
  createSupplierApi,
  updateSupplierApi,
  deleteSupplierApi,
  fetchPurchases,
  createPurchaseApi,
  recordPurchasePaymentApi,
  deletePurchaseApi,
  fetchExpenses,
  fetchReportExpenses,
  createExpenseApi,
  deleteExpenseApi,
  fetchReviews,
  createReviewApi,
  deleteReviewApi,
  updateReviewApi,
  createStockNotifyApi,
  getToken,
  getAdminSession,
  getCustomerToken,
  setCustomerToken,
  clearCustomerToken,
  authenticateCustomer,
  mergeCustomerGuestData,
  fetchCustomerSession,
  CUSTOMER_AUTH_EXPIRED_EVENT,
  CustomerProfile,
  ADMIN_AUTH_CHANGED_EVENT,
  CustomerDirectoryRecord,
  fetchCustomersApi,
} from "./services/api";
import { canAccessAdminSection } from "./utils/adminPermissions";
import { TopNavBar } from "./components/TopNavBar";
import { HomeScreen } from "./components/HomeScreen";
import { CategoryScreen } from "./components/CategoryScreen";
import { CustomerReviewSlider } from "./components/CustomerReviewSlider";
import { Footer } from "./components/Footer";
import { CartDrawer } from "./components/CartDrawer";
import { FloatingCartButton } from "./components/FloatingCartButton";
import { FloatingWhatsAppButton } from "./components/FloatingWhatsAppButton";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { CartItemOptions, getCartLineKey } from "./utils/cart";
import {
  createGuestData,
  GUEST_DATA_KEY,
  GuestData,
  loadGuestData,
} from "./utils/guestData";

// Lazy loaded non-critical screens & heavy modals for small initial bundle size
const AdminScreen = lazy(() =>
  import("./components/AdminScreen").then((m) => ({ default: m.AdminScreen })),
);
const DirectOrderModal = lazy(() =>
  import("./components/DirectOrderModal").then((m) => ({
    default: m.DirectOrderModal,
  })),
);
const CustomerAuthModal = lazy(() =>
  import("./components/CustomerAuthModal").then((m) => ({
    default: m.CustomerAuthModal,
  })),
);
const InfoModal = lazy(() =>
  import("./components/InfoModals").then((m) => ({ default: m.InfoModal })),
);

const ModalSuspenseFallback = () => null;

const ScreenSuspenseFallback = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
    <Loader2 className="w-8 h-8 text-[#00503a] animate-spin mb-3" />
    <p className="text-sm font-semibold text-gray-600 font-bengali">
      লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...
    </p>
  </div>
);

// Shown once, while the very first batch of data comes from the API
const InitialLoadScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa]">
    <Loader2 className="w-10 h-10 text-[#00503a] animate-spin mb-4" />
    <p className="text-sm font-semibold text-gray-600 font-bengali">
      Shopora লোড হচ্ছে...
    </p>
  </div>
);

// Shown if the very first API call fails — most likely the backend isn't running.
const InitialLoadError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f9fa] p-6 text-center">
    <AlertTriangle className="w-10 h-10 text-[#bb0027] mb-4" />
    <p className="text-sm font-bold text-gray-800 mb-1 font-bengali">
      সার্ভারের সাথে সংযোগ করা যায়নি
    </p>
    <p className="text-xs text-gray-500 mb-4 max-w-sm font-bengali">
      {message}
    </p>
    <button
      onClick={onRetry}
      className="px-5 py-2.5 rounded-xl bg-[#00503a] text-white text-sm font-bold hover:bg-[#006a4e] transition-colors cursor-pointer font-bengali"
    >
      আবার চেষ্টা করুন
    </button>
  </div>
);

// Safe localStorage JSON reader
function readStorage<T>(
  key: string,
  fallback: T,
  validate?: (v: any) => boolean,
): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return !validate || validate(parsed) ? (parsed as T) : fallback;
  } catch (e) {
    console.error(`Failed to parse "${key}" from localStorage`, e);
    return fallback;
  }
}

export default function App() {
  // ---- Catalog & content data (loaded from the API) ----
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [reviews, setReviews] = useState<ReviewScreenshot[]>([]);

  // ---- Admin-only data (loaded when the admin screen opens, or on manual refresh) ----
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [reportExpenses, setReportExpenses] = useState<ReportExpense[] | null>(
    null,
  );
  const [customers, setCustomers] = useState<CustomerDirectoryRecord[]>([]);
  const [adminAuthRevision, setAdminAuthRevision] = useState(0);
  const [isAdminRefreshing, setIsAdminRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // ---- Customer session ----
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [guestData, setGuestData] = useState<GuestData>(() => loadGuestData());
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);

  // ---- Initial load state ----
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0); // bump to retry

  const handledDeepLinkRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() =>
    readStorage<Product | null>("amarshop_selected_product", null),
  );

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.get("page") === "admin" ||
      window.location.hash === "#admin"
    ) {
      return "admin";
    }
    const savedScreen = localStorage.getItem("shopora_active_screen");
    return (savedScreen as ActiveScreen) || "home";
  });

  // Direct Order Modal state (single product or full cart checkout)
  const [directOrderData, setDirectOrderData] = useState<{
    isOpen: boolean;
    fromCart?: boolean;
    product?: Product;
    quantity?: number;
    cartItems?: CartItem[];
  }>({ isOpen: false });

  // ---- Client-only state kept in localStorage ----
  const [cart, setCart] = useState<CartItem[]>(() =>
    readStorage<CartItem[]>("amarshop_cart", []),
  );
  const [wishlist, setWishlist] = useState<string[]>(() =>
    readStorage<string[]>("amarshop_wishlist", [], Array.isArray),
  );
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() =>
    readStorage<string[]>("amarshop_recently_viewed", [], Array.isArray),
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<
    "about" | "contact" | "privacy" | "terms" | "faq" | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast (single timer, so toasts never cut each other short)
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  // Same friendly message for every failed API call
  const showApiError = (err: unknown, fallback: string) => {
    const message = err instanceof Error ? err.message : fallback;
    showToast(`❌ ${message}`);
    console.error(fallback, err);
  };

  // ---- Client-only state persistence ----
  useEffect(() => {
    if (selectedProduct) {
      localStorage.setItem(
        "amarshop_selected_product",
        JSON.stringify(selectedProduct),
      );
    }
  }, [selectedProduct]);

  useEffect(() => {
    localStorage.setItem("amarshop_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("amarshop_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem(
      "amarshop_recently_viewed",
      JSON.stringify(recentlyViewedIds),
    );
  }, [recentlyViewedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(guestData));
    } catch (error) {
      console.error("Could not persist guest checkout data", error);
      showToast("Guest data could not be saved in this browser.");
    }
  }, [guestData, showToast]);

  // ---- Restore customer session ----
  useEffect(() => {
    if (!getCustomerToken()) return;
    let cancelled = false;
    fetchCustomerSession()
      .then((profile) => {
        if (!cancelled) setCustomerProfile(profile);
      })
      .catch((error) => {
        if (!cancelled) {
          clearCustomerToken();
          setCustomerProfile(null);
          console.error("Could not restore customer session", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Initial public data load: products, categories, reviews ----
  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      setIsInitialLoading(true);
      setInitialLoadError(null);
      try {
        const [productsData, categoriesData, reviewsData] = await Promise.all([
          fetchProducts(),
          fetchCategories(),
          fetchReviews(),
        ]);
        if (cancelled) return;
        setProducts(productsData);
        setCategories(categoriesData);
        setReviews(reviewsData);
      } catch (err: any) {
        if (cancelled) return;
        setInitialLoadError(
          err?.message?.includes("Failed to fetch")
            ? "ব্যাকএন্ড সার্ভার চালু আছে কিনা দেখুন (npm run dev in the server/ folder), অথবা ইন্টারনেট সংযোগ পরীক্ষা করুন।"
            : err?.message || "অজানা এরর হয়েছে।",
        );
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    };

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  // ---- Admin data: fetched once on open + whenever "Refresh" is clicked (no auto polling) ----
  const loadAdminData = useCallback(async () => {
    if (!getToken()) return;
    setIsAdminRefreshing(true);
    try {
      const session = await getAdminSession();
      const canAccess = (section: Parameters<typeof canAccessAdminSection>[2]) =>
        canAccessAdminSection(session.role, session.staffRole, section);
      const canManageExpenses = canAccess("expenses");
      const canViewReports = canAccess("reports");
      if (!canManageExpenses) setExpenses([]);
      setReportExpenses(
        canViewReports && !canManageExpenses ? [] : null,
      );
      const load = async <T,>(
        enabled: boolean,
        fetchData: () => Promise<T>,
        saveData: (data: T) => void,
      ): Promise<boolean> => {
        if (!enabled) return false;
        try {
          saveData(await fetchData());
          return false;
        } catch (error) {
          console.error("Admin data refresh failed", error);
          return true;
        }
      };

      const failures = await Promise.all([
        load(canAccess("orders"), fetchOrders, setOrders),
        load(canAccess("purchases"), fetchSuppliers, setSuppliers),
        load(canAccess("purchases"), fetchPurchases, setPurchases),
        load(canManageExpenses, fetchExpenses, setExpenses),
        load(
          canViewReports && !canManageExpenses,
          fetchReportExpenses,
          setReportExpenses,
        ),
        load(
          canAccess("products") || canAccess("dashboard"),
          fetchProducts,
          setProducts,
        ),
        load(
          canAccess("categories") || canAccess("dashboard"),
          fetchCategories,
          setCategories,
        ),
        load(canAccess("reviews"), fetchReviews, setReviews),
        load(
          canAccess("customers") || canAccess("dashboard"),
          fetchCustomersApi,
          setCustomers,
        ),
      ]);

      if (failures.some(Boolean)) {
        console.error("Some permitted admin data failed to refresh");
        showToast("❌ কিছু ডাটা রিফ্রেশ করা যায়নি, আবার চেষ্টা করুন");
      } else {
        setLastRefreshedAt(new Date());
      }
    } catch (error) {
      console.error("Could not verify admin role before refreshing data", error);
      showToast("❌ Admin session could not be verified");
    } finally {
      setIsAdminRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeScreen !== "admin" || !getToken()) return;
    loadAdminData();
  }, [activeScreen, adminAuthRevision, loadAdminData]);

  useEffect(() => {
    const onAdminAuthChanged = () =>
      setAdminAuthRevision((revision) => revision + 1);
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, onAdminAuthChanged);
    return () =>
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, onAdminAuthChanged);
  }, []);

  useEffect(() => {
    const onCustomerAuthExpired = () => {
      setCustomerProfile(null);
      showToast("Your customer session expired. Please sign in again.");
    };
    window.addEventListener(CUSTOMER_AUTH_EXPIRED_EVENT, onCustomerAuthExpired);
    return () =>
      window.removeEventListener(
        CUSTOMER_AUTH_EXPIRED_EVENT,
        onCustomerAuthExpired,
      );
  }, [showToast]);

  // Deep-linking: ?page=admin, ?admin, #admin, /admin and ?product=ID
  useEffect(() => {
    const checkUrlRoute = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        const pathname = window.location.pathname;

        const pageParam =
          urlParams.get("page") ||
          urlParams.get("screen") ||
          urlParams.get("tab");
        const isAdminRequested =
          pageParam === "admin" ||
          urlParams.has("admin") ||
          hash === "#admin" ||
          pathname.endsWith("/admin");

        if (isAdminRequested) {
          setActiveScreen("admin");
          return;
        }

        const productId =
          urlParams.get("product") || hash.replace("#product-", "");
        if (productId && productId !== "admin") {
          const found = products.find(
            (p) => p.id === productId || p.sku === productId,
          );
          if (found && handledDeepLinkRef.current !== found.id) {
            handledDeepLinkRef.current = found.id;
            setSelectedProduct(found);
            setActiveScreen("product-detail");
          }
        }
      } catch (e) {
        console.error("Failed to parse URL route params", e);
      }
    };

    checkUrlRoute();
    window.addEventListener("popstate", checkUrlRoute);
    window.addEventListener("hashchange", checkUrlRoute);
    return () => {
      window.removeEventListener("popstate", checkUrlRoute);
      window.removeEventListener("hashchange", checkUrlRoute);
    };
  }, [products]);

  // ---------------- Storefront handlers ----------------

  const handleOpenProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setRecentlyViewedIds((prev) =>
      [product.id, ...prev.filter((id) => id !== product.id)].slice(0, 10),
    );
    setActiveScreen("product-detail");
    window.scrollTo(0, 0);
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [productId, ...prev],
    );
  };

  const handleNotifyStockRequest = async (
    product: Product,
    contact: string,
  ) => {
    try {
      await createStockNotifyApi(product.id, product.name, contact);
      showToast("আপনাকে জানিয়ে দেওয়া হবে!");
    } catch (err) {
      showApiError(err, "নোটিফাই রিকোয়েস্ট পাঠানো যায়নি");
    }
  };

  const handleAddToCart = (
    product: Product,
    quantity: number = 1,
    options: CartItemOptions = {},
  ) => {
    const line: CartItem = {
      product,
      quantity,
      selectedModel: options.selectedModel ?? product.model,
      selectedSize: options.selectedSize,
      selectedColor: options.selectedColor,
    };
    const key = getCartLineKey(line);
    setCart((prev) => {
      const existing = prev.find((item) => getCartLineKey(item) === key);
      if (existing) {
        return prev.map((item) =>
          getCartLineKey(item) === key
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...prev, line];
    });
    const details = [line.selectedModel, line.selectedSize, line.selectedColor]
      .filter(Boolean)
      .join(", ");
    showToast(
      `"${product.name}"${details ? ` (${details})` : ""} কার্টে যোগ করা হয়েছে!`,
    );
  };

  const handleOpenDirectOrder = (
    product: Product,
    quantity: number = 1,
    options: CartItemOptions = {},
  ) => {
    setDirectOrderData({
      isOpen: true,
      fromCart: false,
      cartItems: [
        {
          product,
          quantity,
          selectedModel: options.selectedModel ?? product.model,
          selectedSize: options.selectedSize,
          selectedColor: options.selectedColor,
        },
      ],
    });
  };

  const handleOpenCartDirectOrder = () => {
    if (cart.length === 0) {
      showToast("আপনার কার্ট খালি!");
      return;
    }
    setDirectOrderData({ isOpen: true, fromCart: true, cartItems: cart });
  };

  const handleRemoveCartItem = (lineKey: string) => {
    setCart((prev) => prev.filter((item) => getCartLineKey(item) !== lineKey));
    showToast("পণ্যটি কার্ট থেকে সরানো হয়েছে");
  };

  const handleUpdateCartQuantity = (lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(lineKey);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        getCartLineKey(item) === lineKey ? { ...item, quantity } : item,
      ),
    );
  };

  const handleClearCart = () => {
    setCart([]);
    showToast("কার্ট খালি করা হয়েছে");
  };

  // ---------------- Customer auth ----------------

  const normalizePhone = (phone: string) =>
    phone.replace(/[^\d+]/g, "").replace(/^\+?88/, "");

  const handleCustomerAuthenticate = async (
    mode: "login" | "signup",
    credentials: { name?: string; email: string; password: string },
  ) => {
    const freshGuestData = createGuestData();
    const session = await authenticateCustomer(mode, credentials);
    const gp = guestData.profile;
    const phone = normalizePhone(gp.phone);

    const merged = await mergeCustomerGuestData(session.token, {
      guestIdentity: guestData.identity,
      profile: {
        ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gp.email.trim())
          ? { email: gp.email.trim() }
          : {}),
        ...(/^01[3-9]\d{8}$/.test(phone) ? { phone } : {}),
        ...(gp.address.trim().length >= 8
          ? { address: gp.address.trim() }
          : {}),
        ...(gp.name.trim().length >= 2 ? { name: gp.name.trim() } : {}),
        ...(gp.district.trim() ? { district: gp.district.trim() } : {}),
      },
      cart: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        selectedModel: item.selectedModel,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
      })),
    });

    setCustomerToken(session.token);
    setCustomerProfile(merged.customer);
    localStorage.removeItem(GUEST_DATA_KEY);
    setGuestData(freshGuestData);
    setCart(
      merged.cart.flatMap((line) => {
        const product = products.find((item) => item.id === line.productId);
        return product ? [{ product, ...line }] : [];
      }),
    );
    showToast(`Welcome, ${merged.customer.name}!`);
  };

  const handleCustomerInfoChange = (profile: GuestData["profile"]) => {
    if (getCustomerToken()) {
      setCustomerProfile((previous) =>
        previous ? { ...previous, ...profile } : previous,
      );
    } else {
      setGuestData((previous) => ({
        ...previous,
        profile: { ...profile, phone: normalizePhone(profile.phone) },
      }));
    }
  };

  // ---------------- Orders ----------------

  // The order is created on the server first; we use exactly what the server
  // returns (real ID, verified totals) instead of the locally built draft.
  const handlePlaceOrder = async (
    draftOrder: OrderItem,
  ): Promise<OrderItem | null> => {
    try {
      const session = getCustomerToken()
        ? "customer"
        : activeScreen === "admin"
          ? "admin"
          : "none";
      const savedOrder = await createOrderApi(draftOrder, {
        session,
        ...(session === "none" ? { guestIdentity: guestData.identity } : {}),
      });
      setOrders((prev) => [savedOrder, ...prev]);

      if (session === "none") {
        setGuestData((previous) => ({
          ...previous,
          profile: {
            name: draftOrder.customerName,
            phone: draftOrder.phone,
            email: draftOrder.email || "",
            address: draftOrder.address,
            district: draftOrder.district || "Dhaka",
          },
          orders: [savedOrder, ...previous.orders].slice(0, 25),
        }));
      } else if (session === "customer") {
        setCustomerProfile((previous) =>
          previous
            ? {
                ...previous,
                name: draftOrder.customerName,
                phone: draftOrder.phone,
                email: draftOrder.email || previous.email,
                address: draftOrder.address,
                district: draftOrder.district,
              }
            : previous,
        );
      }

      // Reflect the stock decrease the server just made.
      setProducts((prev) =>
        prev.map((p) => {
          const sold = (savedOrder.orderedProducts || []).find(
            (op: any) => op.id === p.id || op.productId === p.id,
          );
          if (!sold) return p;
          const newQty = Math.max(0, (p.stockQty || 0) - sold.quantity);
          return { ...p, stockQty: newQty, inStock: newQty > 0 };
        }),
      );

      if (directOrderData.fromCart) setCart([]);
      showToast(
        `অর্ডার #${savedOrder.invoiceId || savedOrder.id} সফলভাবে সম্পন্ন হয়েছে!`,
      );
      return savedOrder;
    } catch (err) {
      showApiError(err, "অর্ডার প্লেস করা যায়নি");
      return null;
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: OrderItem["status"],
  ) => {
    try {
      const updated = await updateOrderStatusApi(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(`অর্ডার #${orderId} এর স্ট্যাটাস পরিবর্তন করা হয়েছে`);
    } catch (err) {
      showApiError(err, "স্ট্যাটাস আপডেট করা যায়নি");
    }
  };

  const handleUpdateOrder = async (updatedOrder: OrderItem) => {
    try {
      const saved = await updateOrderApi(updatedOrder.id, updatedOrder);
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? saved : o)),
      );
      showToast(`অর্ডার #${updatedOrder.id} সফলভাবে আপডেট করা হয়েছে`);
    } catch (err) {
      showApiError(err, "অর্ডার আপডেট করা যায়নি");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteOrderApi(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast(`অর্ডার #${orderId} মুছে ফেলা হয়েছে`);
    } catch (err) {
      showApiError(err, "অর্ডার মুছে ফেলা যায়নি");
    }
  };

  // ---------------- Products ----------------

  const handleAddProduct = async (newProduct: Product) => {
    try {
      const saved = await createProductApi(newProduct);
      setProducts((prev) => [saved, ...prev]);
      showToast("নতুন পণ্য সফলভাবে যোগ করা হয়েছে!");
    } catch (err) {
      showApiError(err, "পণ্য যোগ করা যায়নি");
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try {
      const saved = await updateProductApi(updatedProduct.id, updatedProduct);
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? saved : p)),
      );
      if (selectedProduct?.id === updatedProduct.id) setSelectedProduct(saved);
      showToast("পণ্য সফলভাবে আপডেট করা হয়েছে!");
    } catch (err) {
      showApiError(err, "পণ্য আপডেট করা যায়নি");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProductApi(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      if (selectedProduct?.id === productId) setSelectedProduct(null);
      showToast("পণ্য মুছে ফেলা হয়েছে");
    } catch (err) {
      showApiError(err, "পণ্য মুছে ফেলা যায়নি");
    }
  };

  // ---------------- Suppliers & Purchases ----------------

  const handleAddSupplier = async (newSupplier: Supplier) => {
    try {
      const saved = await createSupplierApi(newSupplier);
      setSuppliers((prev) => [saved, ...prev]);
      showToast("নতুন সাপ্লায়ার যোগ করা হয়েছে!");
    } catch (err) {
      showApiError(err, "সাপ্লায়ার যোগ করা যায়নি");
    }
  };

  const handleUpdateSupplier = async (updatedSupplier: Supplier) => {
    try {
      const saved = await updateSupplierApi(
        updatedSupplier.id,
        updatedSupplier,
      );
      setSuppliers((prev) =>
        prev.map((s) => (s.id === updatedSupplier.id ? saved : s)),
      );
      showToast("সাপ্লায়ার আপডেট করা হয়েছে!");
    } catch (err) {
      showApiError(err, "সাপ্লায়ার আপডেট করা যায়নি");
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      await deleteSupplierApi(supplierId);
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
      showToast("সাপ্লায়ার মুছে ফেলা হয়েছে");
    } catch (err) {
      showApiError(err, "সাপ্লায়ার মুছে ফেলা যায়নি");
    }
  };

  // The server increases product stock and supplier balances; we mirror that locally.
  const handleAddPurchase = async (newPurchase: PurchaseEntry) => {
    try {
      const saved = await createPurchaseApi({
        supplierId: newPurchase.supplierId,
        items: newPurchase.items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitCost: it.unitCost,
        })),
        paidAmount: newPurchase.paidAmount,
        paymentMethod: newPurchase.paymentMethod,
        note: newPurchase.note,
      });
      setPurchases((prev) => [saved, ...prev]);

      setProducts((prev) =>
        prev.map((p) => {
          const line = newPurchase.items.find((it) => it.productId === p.id);
          if (!line) return p;
          return {
            ...p,
            stockQty: (p.stockQty || 0) + line.quantity,
            inStock: true,
          };
        }),
      );

      setSuppliers(await fetchSuppliers());
      showToast("পারচেজ সফলভাবে যোগ হয়েছে, স্টক আপডেট হয়েছে!");
    } catch (err) {
      showApiError(err, "পারচেজ যোগ করা যায়নি");
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    try {
      await deletePurchaseApi(purchaseId);
      setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
      showToast("পারচেজ এন্ট্রি মুছে ফেলা হয়েছে");
    } catch (err) {
      showApiError(err, "পারচেজ মুছে ফেলা যায়নি");
    }
  };

  const handleRecordPurchasePayment = async (
    purchaseId: string,
    amount: number,
  ) => {
    try {
      const updated = await recordPurchasePaymentApi(purchaseId, amount);
      setPurchases((prev) =>
        prev.map((p) => (p.id === purchaseId ? updated : p)),
      );
      setSuppliers(await fetchSuppliers());
      showToast("পেমেন্ট রেকর্ড করা হয়েছে!");
    } catch (err) {
      showApiError(err, "পেমেন্ট রেকর্ড করা যায়নি");
    }
  };

  // ---------------- Expenses ----------------

  const handleAddExpense = async (newExpense: Expense) => {
    try {
      const saved = await createExpenseApi(newExpense);
      setExpenses((prev) => [saved, ...prev]);
      showToast("নতুন এক্সপেন্স যোগ করা হয়েছে!");
    } catch (err) {
      showApiError(err, "এক্সপেন্স যোগ করা যায়নি");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpenseApi(expenseId);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      showToast("এক্সপেন্স মুছে ফেলা হয়েছে");
    } catch (err) {
      showApiError(err, "এক্সপেন্স মুছে ফেলা যায়নি");
    }
  };

  // ---------------- Quick Sale (POS / Barcode) ----------------

  const handleCompleteQuickSale = async (
    items: {
      productId: string;
      name: string;
      quantity: number;
      price: number;
    }[],
    total: number,
  ) => {
    if (items.length === 0) return;

    try {
      const order = await createOrderApi({
        customerName: "Walk-in Customer",
        phone: "N/A",
        address: "In-store",
        paymentMethod: "cash",
        paidAmount: total,
        saleType: "POS / Manual Sale",
        orderedProducts: items.map((it) => ({
          id: it.productId,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
        })),
        subtotal: total,
        total,
      } as any);

      setOrders((prev) => [order, ...prev]);
      setProducts((prev) =>
        prev.map((p) => {
          const sold = items.find((it) => it.productId === p.id);
          if (!sold) return p;
          const newQty = Math.max(0, (p.stockQty || 0) - sold.quantity);
          return { ...p, stockQty: newQty, inStock: newQty > 0 };
        }),
      );
      showToast("সেল সম্পন্ন হয়েছে!");
    } catch (err) {
      showApiError(err, "সেল সম্পন্ন করা যায়নি");
    }
  };

  const refreshProductReviewStats = useCallback(async () => {
    try {
      const refreshedProducts = await fetchProducts();
      setProducts(refreshedProducts);
      setSelectedProduct((current) =>
        current
          ? refreshedProducts.find((product) => product.id === current.id) ||
            current
          : null,
      );
    } catch (error) {
      console.error("Could not refresh product review ratings", error);
    }
  }, []);

  const handleReviewAdded = useCallback((review: ReviewScreenshot) => {
    setReviews((previous) => [review, ...previous]);
  }, []);

  const handleReviewStatsChange = useCallback(
    (productId: string, ratingAverage: number, reviewCount: number) => {
      const updateStats = (product: Product): Product =>
        product.id === productId
          ? { ...product, ratingAverage, reviewCount }
          : product;
      setProducts((previous) => previous.map(updateStats));
      setSelectedProduct((previous) =>
        previous?.id === productId ? updateStats(previous) : previous,
      );
    },
    [],
  );

  // ---------------- Reviews ----------------

  const handleAddReview = async (newReview: ReviewScreenshot) => {
    try {
      const saved = await createReviewApi(newReview);
      setReviews((prev) => [saved, ...prev]);
      await refreshProductReviewStats();
      showToast("নতুন কাস্টমার রিভিউ স্ক্রিনশট সফলভাবে যোগ করা হয়েছে!");
      return saved;
    } catch (err) {
      showApiError(err, "রিভিউ যোগ করা যায়নি");
      throw err;
    }
  };

  const handleUpdateReview = async (updatedReview: ReviewScreenshot) => {
    try {
      const saved = await updateReviewApi(updatedReview.id, updatedReview);
      setReviews((prev) =>
        prev.map((r) => (r.id === updatedReview.id ? saved : r)),
      );
      await refreshProductReviewStats();
      showToast("রিভিউ আপডেট করা হয়েছে!");
      return saved;
    } catch (err) {
      showApiError(err, "রিভিউ আপডেট করা যায়নি");
      throw err;
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReviewApi(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      await refreshProductReviewStats();
      showToast("রিভিউ স্ক্রিনশট মুছে ফেলা হয়েছে");
    } catch (err) {
      showApiError(err, "রিভিউ মুছে ফেলা যায়নি");
      throw err;
    }
  };

  // ---------------- Categories ----------------

  const handleAddCategory = async (newCat: CategoryItem) => {
    try {
      const saved = await createCategoryApi(newCat);
      setCategories((prev) => [...prev, saved]);
      showToast(`নতুন ক্যাটাগরি "${newCat.name}" যোগ করা হয়েছে!`);
    } catch (err) {
      showApiError(err, "ক্যাটাগরি যোগ করা যায়নি");
    }
  };

  const handleUpdateCategory = async (updatedCat: CategoryItem) => {
    try {
      const saved = await updateCategoryApi(updatedCat.id, updatedCat);
      setCategories((prev) =>
        prev.map((c) => (c.id === updatedCat.id ? saved : c)),
      );
      showToast(`ক্যাটাগরি "${updatedCat.name}" আপডেট করা হয়েছে!`);
    } catch (err) {
      showApiError(err, "ক্যাটাগরি আপডেট করা যায়নি");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const target = categories.find((c) => c.id === categoryId);
    try {
      await deleteCategoryApi(categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      showToast(`ক্যাটাগরি "${target?.name || ""}" মুছে ফেলা হয়েছে`);
    } catch (err) {
      showApiError(err, "ক্যাটাগরি মুছে ফেলা যায়নি");
    }
  };

  // ---------------- Navigation ----------------

  const handleNavigate = (screen: ActiveScreen) => {
    if (screen === "about" || screen === "contact") {
      setActiveInfoModal(screen);
      return;
    }
    localStorage.setItem("shopora_active_screen", screen);

    try {
      if (screen === "admin") {
        window.history.pushState(null, "", "?page=admin");
      } else if (
        window.location.search.includes("product=") ||
        window.location.search.includes("admin") ||
        window.location.search.includes("page=") ||
        window.location.hash.includes("admin")
      ) {
        window.history.pushState(null, "", window.location.pathname);
      }
    } catch (e) {
      console.error(e);
    }

    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectCategory = (cat: string | null) => {
    setSelectedCategoryFilter(cat);
    setActiveScreen("categories");
  };

  const totalCartItemsCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // Block rendering until we know the backend is reachable
  if (isInitialLoading) return <InitialLoadScreen />;
  if (initialLoadError) {
    return (
      <InitialLoadError
        message={initialLoadError}
        onRetry={() => setLoadAttempt((n) => n + 1)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#191c1d] selection:bg-[#00503a] selection:text-white">
      {/* Top Navbar (customer-facing screens only) */}
      {activeScreen !== "admin" && (
        <TopNavBar
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
          cartCount={totalCartItemsCount}
          onOpenCart={() => setIsCartOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          products={products}
          categories={categories}
          selectedCategoryFilter={selectedCategoryFilter}
          onSelectCategory={handleSelectCategory}
          isAdmin={!!getToken()}
          customerName={customerProfile?.name}
          onCustomerAuth={() => setIsCustomerAuthOpen(true)}
          onCustomerLogout={() => {
            clearCustomerToken();
            setCustomerProfile(null);
            showToast("You have been signed out.");
          }}
        />
      )}

      {/* Main content */}
      <div className="flex-1">
        {activeScreen === "home" && (
          <HomeScreen
            products={products}
            categories={categories}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleOpenProductDetail}
            onDirectOrder={handleOpenDirectOrder}
            onSelectCategory={handleSelectCategory}
          />
        )}

        {activeScreen === "categories" && (
          <CategoryScreen
            products={products}
            categories={categories}
            onNavigate={handleNavigate}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleOpenProductDetail}
            onDirectOrder={handleOpenDirectOrder}
            searchQuery={searchQuery}
            selectedCategoryFilter={selectedCategoryFilter}
            onResetCategoryFilter={() => setSelectedCategoryFilter(null)}
          />
        )}

        {activeScreen === "product-detail" && selectedProduct && (
          <ProductDetailScreen
            product={selectedProduct}
            allProducts={products}
            wishlist={wishlist}
            recentlyViewedIds={recentlyViewedIds}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onDirectOrder={handleOpenDirectOrder}
            onSelectProduct={handleOpenProductDetail}
            onNotifyStockRequest={handleNotifyStockRequest}
            canDeleteReviews={Boolean(getToken())}
            onDeleteReview={handleDeleteReview}
            onReviewAdded={handleReviewAdded}
            onReviewStatsChange={handleReviewStatsChange}
            onBack={() => setActiveScreen("home")}
          />
        )}

        {activeScreen === "admin" && (
          <Suspense fallback={<ScreenSuspenseFallback />}>
            <AdminScreen
              products={products}
              categories={categories}
              reviews={reviews}
              orders={orders}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              suppliers={suppliers}
              purchases={purchases}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onAddPurchase={handleAddPurchase}
              onDeletePurchase={handleDeletePurchase}
              onRecordPurchasePayment={handleRecordPurchasePayment}
              expenses={expenses}
              reportExpenses={reportExpenses}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              customers={customers}
              onAddReview={handleAddReview}
              onUpdateReview={handleUpdateReview}
              onDeleteReview={handleDeleteReview}
              onAddOrder={handlePlaceOrder}
              onUpdateOrder={handleUpdateOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onDeleteOrder={handleDeleteOrder}
              onNavigate={handleNavigate}
              onRefresh={loadAdminData}
              isRefreshing={isAdminRefreshing}
              lastRefreshedAt={lastRefreshedAt}
            />
          </Suspense>
        )}
      </div>

      {/* Review slider & footer (customer screens only) */}
      {activeScreen !== "admin" && (
        <>
          <CustomerReviewSlider reviews={reviews} />
          <Footer
            onOpenPolicy={(type) =>
              setActiveInfoModal(type as "privacy" | "terms" | "faq")
            }
          />
        </>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onDirectCheckout={handleOpenCartDirectOrder}
      />

      {directOrderData.isOpen && (
        <Suspense fallback={<ModalSuspenseFallback />}>
          <DirectOrderModal
            isOpen={directOrderData.isOpen}
            onClose={() => setDirectOrderData({ isOpen: false })}
            product={directOrderData.product}
            quantity={directOrderData.quantity || 1}
            cartItems={directOrderData.cartItems}
            onPlaceOrder={handlePlaceOrder}
            customerProfile={customerProfile ?? guestData.profile}
            onCustomerInfoChange={handleCustomerInfoChange}
          />
        </Suspense>
      )}

      {isCustomerAuthOpen && (
        <Suspense fallback={<ModalSuspenseFallback />}>
          <CustomerAuthModal
            onClose={() => setIsCustomerAuthOpen(false)}
            onAuthenticate={handleCustomerAuthenticate}
          />
        </Suspense>
      )}

      {!isCartOpen && activeScreen !== "admin" && (
        <FloatingCartButton
          cart={cart}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}

      {activeScreen === "home" && <FloatingWhatsAppButton />}

      {activeInfoModal && (
        <Suspense fallback={<ModalSuspenseFallback />}>
          <InfoModal
            type={activeInfoModal}
            onClose={() => setActiveInfoModal(null)}
          />
        </Suspense>
      )}

      {toastMessage && (
        <div className="fixed top-20 inset-x-4 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 z-50 bg-[#00503a] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold font-bengali">
          <CheckCircle className="w-4 h-4 text-[#9ef4d0]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
