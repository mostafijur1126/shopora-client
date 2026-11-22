import React, { useState, useRef, useEffect } from "react";
import { ActiveScreen, Product, CategoryItem } from "../types";
import { getWhatsAppOrderLink } from "../utils/whatsapp";
import { scrollToTop } from "../utils/scroll";
import shoporaLogo from "../assets/images/shopora-logo.png";
import {
  ShoppingCart,
  User,
  Search,
  Menu,
  X,
  Store,
  LayoutGrid,
  Sparkles,
  PhoneCall,
  Shirt,
  HeartHandshake,
  ChevronDown,
  Home,
  Tv,
  Apple,
  Briefcase,
  Gem,
  Watch,
  Utensils,
  Tag,
  Package,
  Layers,
  ArrowRight,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Info,
} from "lucide-react";

// Helper icon renderer for category items (also imported by other components)
export const renderCategoryIcon = (
  iconName?: string,
  className: string = "w-4 h-4",
) => {
  switch (iconName) {
    case "Shirt":
      return <Shirt className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Home":
      return <Home className={className} />;
    case "Tv":
      return <Tv className={className} />;
    case "Apple":
      return <Apple className={className} />;
    case "Briefcase":
      return <Briefcase className={className} />;
    case "Gem":
      return <Gem className={className} />;
    case "Watch":
      return <Watch className={className} />;
    case "Utensils":
      return <Utensils className={className} />;
    case "Layers":
      return <Layers className={className} />;
    case "Package":
      return <Package className={className} />;
    default:
      return <Tag className={className} />;
  }
};

// Official WhatsApp SVG icon
const WhatsAppIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const ANNOUNCEMENTS = [
  "🔥 Mega Seasonal Offer: Cash on Delivery Nationwide!",
  "⚡ Fastest home delivery within 24 to 48 hours!",
  "💬 Chat on WhatsApp for advice or to order directly!",
];

const PHONE_NUMBER = "01700-000000";

// Same width rules as the rest of the site so everything lines up
const CONTAINER = "w-full lg:w-[90%] mx-auto px-3 sm:px-4 md:px-8";

interface TopNavBarProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  products?: Product[];
  categories?: CategoryItem[];
  selectedCategoryFilter?: string | null;
  onSelectCategory?: (category: string) => void;
  /** Shows the Dashboard entry in the account menu. Only pass true for the admin role. */
  isAdmin?: boolean;
  /** Optional: when provided (and isAdmin), a Logout item is shown in the account menu. */
  onAdminLogout?: () => void;
  customerName?: string;
  onCustomerAuth?: () => void;
  onCustomerLogout?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeScreen,
  onNavigate,
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  categories = [],
  selectedCategoryFilter,
  onSelectCategory,
  isAdmin = false,
  onAdminLogout,
  customerName,
  onCustomerAuth,
  onCustomerLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [isFadingAnnouncement, setIsFadingAnnouncement] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Rotating announcement text
  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      setIsFadingAnnouncement(true);
      fadeTimer = setTimeout(() => {
        setAnnouncementIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
        setIsFadingAnnouncement(false);
      }, 300);
    }, 3500);
    return () => {
      clearInterval(timer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []);

  // Close dropdowns on outside click / tap, and everything on Escape
  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(target)
      ) {
        setCategoriesMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCategoriesMenuOpen(false);
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
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

  // Lock page scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // If the window grows to desktop size, make sure the drawer is closed
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setCategoriesMenuOpen(false);
  };

  const go = (screen: ActiveScreen) => {
    closeMenus();
    onNavigate(screen);
  };

  const showAllCollections = () => {
    onSelectCategory?.("");
    closeMenus();
    onNavigate("categories");
  };

  const handleCategoryClick = (cat: string) => {
    onSelectCategory?.(cat);
    if (activeScreen !== "categories") onNavigate("categories");
    else scrollToTop();
    closeMenus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0 && activeScreen !== "categories") {
      onNavigate("categories");
    }
    setMobileSearchOpen(false);
  };

  const isCategorySelected = (cat: CategoryItem) =>
    selectedCategoryFilter === cat.slug || selectedCategoryFilter === cat.name;

  const desktopLinkClass = (active: boolean) =>
    `px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
      active
        ? "bg-[#ecfdf5] text-[#00503a]"
        : "text-gray-700 hover:bg-gray-50 hover:text-[#00503a]"
    }`;

  // Shared pill search field (desktop bar + mobile expandable row)
  const searchField = (inputId: string, autoFocus = false) => (
    <div className="relative w-full flex items-center bg-[#f8faf9] hover:bg-white focus-within:bg-white border border-gray-200 hover:border-emerald-700/30 focus-within:border-[#00503a] rounded-full h-10 pl-3.5 pr-1 focus-within:ring-2 focus-within:ring-[#00503a]/15 transition-all duration-200">
      <Search className="w-4 h-4 text-gray-400 shrink-0" />
      <input
        id={inputId}
        type="text"
        enterKeyHint="search"
        autoFocus={autoFocus}
        value={searchQuery}
        onChange={(e) => {
          onSearchChange(e.target.value);
          if (activeScreen === "home" && e.target.value.trim().length > 0) {
            onNavigate("categories");
          }
        }}
        placeholder="Search for products..."
        className="flex-1 min-w-0 px-2.5 text-sm bg-transparent outline-none text-[#191c1d] placeholder-gray-400 font-bengali"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          aria-label="Clear search"
          className="p-1.5 mr-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/60 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="submit"
        aria-label="Search"
        className="h-8 px-3 sm:px-4 bg-gradient-to-r from-[#006a4e] to-[#00503a] hover:from-[#00503a] hover:to-[#003828] text-white text-xs font-semibold font-bengali rounded-full transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search</span>
      </button>
    </div>
  );

  const drawerLink = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    active = false,
  ) => (
    <button
      key={label}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left transition-colors cursor-pointer ${
        active
          ? "bg-[#ecfdf5] text-[#00503a]"
          : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
      }`}
    >
      <span className="text-[#006a4e]">{icon}</span>
      <span className="flex-1">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
    </button>
  );

  return (
    <>
      {/* 1. Announcement bar (scrolls away so the sticky header stays slim on phones) */}
      <div className="bg-[#003828] text-white font-bengali select-none">
        <div
          className={`${CONTAINER} h-9 flex items-center justify-between gap-4`}
        >
          <p
            className={`min-w-0 truncate text-[11px] sm:text-xs font-medium text-emerald-50 tracking-wide transition-all duration-300 ${
              isFadingAnnouncement
                ? "opacity-0 -translate-y-1"
                : "opacity-100 translate-y-0"
            }`}
          >
            {ANNOUNCEMENTS[announcementIndex]}
          </p>

          <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs font-semibold text-emerald-100 font-montserrat">
            <a
              href={`tel:${PHONE_NUMBER}`}
              className="flex items-center gap-1.5 hover:text-white transition-colors"
              title="Call our helpline"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#9ef4d0]" />
              <span>{PHONE_NUMBER}</span>
            </a>
            <span className="text-emerald-700/80">|</span>
            <a
              href={getWhatsAppOrderLink(
                "Assalamu Alaikum Shopora, I need some assistance.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-[#9ef4d0] transition-colors"
              title="WhatsApp Live Chat"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
              <span>WhatsApp Live Chat</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Sticky header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs">
        {/* Main row */}
        <div className={`${CONTAINER} h-16 flex items-center gap-1 sm:gap-4`}>
          {/* Hamburger (mobile / tablet) */}
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="lg:hidden -ml-1 w-9 h-10 rounded-xl flex items-center justify-center text-gray-700 hover:text-[#00503a] hover:bg-gray-100 transition-colors cursor-pointer shrink-0 sm:-ml-2 sm:w-10"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo */}
          <button
            id="brand-logo-btn"
            onClick={() => go("home")}
            aria-label="Shopora home"
            className="flex items-center gap-2 shrink-0 text-left cursor-pointer group focus:outline-none sm:gap-2.5"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-300">
              <img
                src={shoporaLogo}
                alt="Shopora Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="leading-none">
              <span className="block text-lg sm:text-2xl font-black tracking-tight font-montserrat bg-gradient-to-r from-[#003828] via-[#00503a] to-[#007b58] bg-clip-text text-transparent">
                Shopora
              </span>
              <span className="hidden sm:block text-[11px] text-[#006a4e] font-semibold tracking-wider font-bengali mt-1">
                Authentic Local Treasures
              </span>
            </div>
          </button>

          {/* Desktop / tablet search (centered) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xl mx-auto"
          >
            {searchField("top-search-input")}
          </form>

          {/* Actions */}
          <div className="ml-auto md:ml-0 flex items-center gap-0 sm:gap-2 shrink-0">
            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearchOpen((v) => !v)}
              aria-label="Toggle search"
              aria-expanded={mobileSearchOpen}
              className={`md:hidden w-9 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer sm:w-10 ${
                mobileSearchOpen
                  ? "bg-[#ecfdf5] text-[#00503a]"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {mobileSearchOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>

            {/* Cart */}
            <button
              id="top-cart-btn"
              onClick={onOpenCart}
              aria-label={`Open shopping bag, ${cartCount} items`}
              title="Shopping Bag"
              className="relative w-9 h-10 rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-100 hover:text-[#00503a] transition-colors cursor-pointer sm:w-10"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#bb0027] text-white text-[10px] font-bold font-montserrat flex items-center justify-center ring-2 ring-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* Account dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                id="top-account-btn"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                title="My Account"
                className={`h-10 w-9 justify-center flex items-center gap-1 rounded-xl px-0 transition-colors cursor-pointer sm:w-auto sm:justify-start sm:pl-1 sm:pr-2 ${
                  userMenuOpen ? "bg-gray-100" : "hover:bg-gray-100"
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-[#00503a] text-white flex items-center justify-center">
                  {isAdmin ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </span>
                <ChevronDown
                  className={`hidden sm:block w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 font-bengali"
                >
                  {/* Profile header */}
                  <div className="px-4 py-3.5 bg-[#f8faf9] border-b border-gray-100 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#00503a] text-white flex items-center justify-center shrink-0">
                      {isAdmin ? (
                        <ShieldCheck className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-500 leading-tight">
                        Welcome
                      </p>
                      <p className="text-sm font-bold text-[#00503a] truncate leading-tight mt-0.5">
                        {isAdmin ? "Admin" : customerName || "Shopora Customer"}
                      </p>
                    </div>
                    {isAdmin && (
                      <span className="ml-auto shrink-0 px-2 py-0.5 rounded-full bg-[#00503a] text-[#9ef4d0] text-[10px] font-bold tracking-wide">
                        ADMIN
                      </span>
                    )}
                  </div>

                  {/* Admin-only: dashboard */}
                  {isAdmin && (
                    <div className="p-2 border-b border-gray-100">
                      <button
                        id="account-menu-dashboard-btn"
                        role="menuitem"
                        onClick={() => go("admin")}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#ecfdf5] text-[#00503a] hover:bg-[#d7f5e9] transition-colors text-left cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-sm font-bold">
                          Dashboard
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Everyone */}
                  <div className="p-2">
                    <button
                      id="account-menu-orders-btn"
                      role="menuitem"
                      onClick={() => {
                        closeMenus();
                        onOpenCart();
                      }}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-sm text-[#191c1d] hover:bg-[#e7f6f0] hover:text-[#00503a] flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 text-[#00503a]" />
                      <span className="flex-1">My Shopping Bag</span>
                      {cartCount > 0 && (
                        <span className="text-[11px] font-bold bg-[#00503a] text-white rounded-full px-2 py-0.5">
                          {cartCount}
                        </span>
                      )}
                    </button>
                    <button
                      id="account-menu-contact-btn"
                      role="menuitem"
                      onClick={() => go("contact")}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-sm text-[#191c1d] hover:bg-[#e7f6f0] hover:text-[#00503a] flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <HeartHandshake className="w-4 h-4 text-[#00503a]" />
                      <span>Support & Contact</span>
                    </button>

                    {isAdmin && onAdminLogout && (
                      <button
                        id="account-menu-logout-btn"
                        role="menuitem"
                        onClick={() => {
                          closeMenus();
                          onAdminLogout();
                        }}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-[#bb0027] hover:bg-[#ffdad8]/50 flex items-center gap-3 border-t border-gray-100 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    )}
                    {!isAdmin && !customerName && onCustomerAuth && (
                      <button
                        id="account-menu-customer-login-btn"
                        role="menuitem"
                        onClick={() => {
                          closeMenus();
                          onCustomerAuth();
                        }}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-[#00503a] hover:bg-[#e7f6f0] flex items-center gap-3 border-t border-gray-100 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        <span>Customer Login / Sign up</span>
                      </button>
                    )}
                    {!isAdmin && customerName && onCustomerLogout && (
                      <button
                        id="account-menu-customer-logout-btn"
                        role="menuitem"
                        onClick={() => {
                          closeMenus();
                          onCustomerLogout();
                        }}
                        className="w-full mt-1 px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-[#bb0027] hover:bg-[#ffdad8]/50 flex items-center gap-3 border-t border-gray-100 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile expandable search row */}
        {mobileSearchOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <form
              onSubmit={handleSearchSubmit}
              className={`${CONTAINER} py-2.5`}
            >
              {searchField("mobile-search-input", true)}
            </form>
          </div>
        )}

        {/* Secondary nav (desktop only) */}
        <nav className="hidden lg:block border-t border-gray-100 bg-white font-bengali">
          <div className={`${CONTAINER} h-11 flex items-center gap-1`}>
            <button
              onClick={() => go("home")}
              className={desktopLinkClass(activeScreen === "home")}
            >
              <Store className="w-4 h-4" />
              <span>Home</span>
            </button>

            {/* Categories dropdown */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                id="header-categories-dropdown-btn"
                onClick={() => setCategoriesMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={categoriesMenuOpen}
                className={desktopLinkClass(categoriesMenuOpen)}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Categories</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    categoriesMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {categoriesMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 tracking-wide">
                      All Categories
                    </span>
                    <button
                      onClick={showAllCollections}
                      className="text-xs font-semibold text-[#00503a] hover:text-[#003828] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View all</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5 py-1.5 max-h-[360px] overflow-y-auto">
                    {categories.length === 0 && (
                      <p className="px-3 py-4 text-xs text-gray-400 text-center">
                        No categories yet
                      </p>
                    )}
                    {categories.map((cat) => {
                      const selected = isCategorySelected(cat);
                      return (
                        <button
                          key={cat.id}
                          id={`cat-dropdown-item-${cat.id}`}
                          onClick={() =>
                            handleCategoryClick(cat.slug || cat.name)
                          }
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer group border-l-2 ${
                            selected
                              ? "bg-[#ecfdf5] border-[#00503a] text-[#00503a] font-bold"
                              : "border-transparent hover:bg-[#ecfdf5] hover:border-[#00503a] text-gray-700 hover:text-[#00503a]"
                          }`}
                        >
                          <span className="text-sm font-medium truncate flex-1">
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={showAllCollections}
              className={desktopLinkClass(
                activeScreen === "categories" && !categoriesMenuOpen,
              )}
            >
              <Layers className="w-4 h-4" />
              <span>Collection</span>
            </button>

            <button
              onClick={() => go("about")}
              className={desktopLinkClass(activeScreen === "about")}
            >
              <Info className="w-4 h-4" />
              <span>About Us</span>
            </button>

            <button
              onClick={() => go("contact")}
              className={desktopLinkClass(activeScreen === "contact")}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Contact</span>
            </button>
          </div>
        </nav>
      </header>

      {/* 3. Mobile drawer (rendered outside the header so `fixed` is relative to the viewport) */}
      <div
        className={`lg:hidden fixed inset-0 z-50 ${
          mobileMenuOpen
            ? "visible"
            : "invisible pointer-events-none [transition:visibility_0s_300ms]"
        }`}
      >
        <div
          onClick={() => setMobileMenuOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          aria-label="Main menu"
          className={`absolute inset-y-0 left-0 w-[86%] max-w-sm bg-white shadow-2xl flex flex-col font-bengali transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
            <button
              onClick={() => go("home")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={shoporaLogo}
                  alt="Shopora Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-black tracking-tight font-montserrat bg-gradient-to-r from-[#003828] via-[#00503a] to-[#007b58] bg-clip-text text-transparent">
                Shopora
              </span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {/* Admin-only dashboard shortcut */}
            {isAdmin && (
              <button
                onClick={() => go("admin")}
                className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#006a4e] to-[#00503a] text-white p-3.5 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-bold">
                    Admin Dashboard
                  </span>
                  <span className="block text-[11px] text-emerald-100">
                    Orders, products & reports
                  </span>
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* Quick links */}
            <div className="space-y-0.5">
              {drawerLink(
                <Store className="w-5 h-5" />,
                "Home",
                () => go("home"),
                activeScreen === "home",
              )}
              {drawerLink(
                <LayoutGrid className="w-5 h-5" />,
                "All Collections",
                showAllCollections,
                activeScreen === "categories" && !selectedCategoryFilter,
              )}
              {drawerLink(<Info className="w-5 h-5" />, "About Us", () =>
                go("about"),
              )}
              {drawerLink(
                <HeartHandshake className="w-5 h-5" />,
                "Contact & Support",
                () => go("contact"),
              )}
            </div>

            {/* Categories */}
            <div>
              <p className="px-1 mb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Categories ({categories.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const selected = isCategorySelected(cat);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.slug || cat.name)}
                      className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold text-left flex items-center gap-2 border transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#ecfdf5] border-[#00503a] text-[#00503a]"
                          : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-[#e7f6f0] hover:text-[#00503a]"
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drawer footer: contact actions */}
          <div className="shrink-0 border-t border-gray-100 p-4 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <a
              href={getWhatsAppOrderLink(
                "Assalamu Alaikum Shopora, I would like to order directly via WhatsApp.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 bg-[#25D366] hover:bg-[#20b858] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              <span>Order via WhatsApp</span>
            </a>
            <a
              href={`tel:${PHONE_NUMBER}`}
              className="w-full h-11 bg-gray-50 hover:bg-gray-100 text-[#00503a] rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-gray-100 transition-colors"
            >
              <PhoneCall className="w-4 h-4" />
              <span className="font-montserrat">{PHONE_NUMBER}</span>
            </a>
          </div>
        </aside>
      </div>
    </>
  );
};
