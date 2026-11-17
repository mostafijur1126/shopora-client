import React, { useState, useRef } from "react";
import { Product, ActiveScreen, CategoryItem } from "../types";
import { promoBanners } from "../data/banners";
import { CategoryProductSection } from "./CategoryProductSection";
import { HeroCarousel } from "./HeroCarousel";
import { scrollElementIntoView } from "../utils/scroll";
import {
  ArrowRight,
  Truck,
  ShieldCheck,
  Banknote,
  Headphones,
  Shirt,
  Home,
  Briefcase,
  Apple,
  Tv,
  Flame,
  ShoppingBag,
} from "lucide-react";

interface HomeScreenProps {
  products?: Product[];
  categories?: CategoryItem[];
  onNavigate: (screen: ActiveScreen) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onSelectCategory?: (category: string) => void;
  onDirectOrder?: (product: Product) => void;
}

interface CategoryRowConfig {
  id: string;
  titleBn: string;
  titleEn: string;
  categorySlug: string;
  badgeText: string;
  icon: React.ComponentType<{ className?: string }>;
  filterFn: (p: Product) => boolean;
}

const CATEGORY_ROWS: CategoryRowConfig[] = [
  {
    id: "row-clothing-fashion",
    titleBn: "Clothing & Fashion",
    titleEn: "Clothing & Fashion",
    categorySlug: "Clothing & Fashion",
    badgeText: "Sarees & Apparel",
    icon: Shirt,
    filterFn: (p: Product) =>
      p.category === "Clothing & Fashion" ||
      p.category === "Fashion" ||
      Boolean(p.categoryBn?.includes("শাড়ি")) ||
      Boolean(p.categoryBn?.includes("Fashion")) ||
      Boolean(p.categoryBn?.includes("Panjabi")) ||
      Boolean(p.categoryBn?.includes("Clothing")),
  },
  {
    id: "row-home-kitchen",
    titleBn: "Home & Kitchen",
    titleEn: "Home & Kitchen",
    categorySlug: "Home & Kitchen",
    badgeText: "Dinner Sets & Crafts",
    icon: Home,
    filterFn: (p: Product) =>
      p.category === "Home & Kitchen" ||
      p.category === "Home & Living" ||
      Boolean(p.categoryBn?.includes("Home")) ||
      Boolean(p.categoryBn?.includes("Kitchen")) ||
      Boolean(p.categoryBn?.includes("Handicraft")) ||
      Boolean(p.categoryBn?.includes("Decor")),
  },
  {
    id: "row-leather-accessories",
    titleBn: "Leather & Accessories",
    titleEn: "Leather & Accessories",
    categorySlug: "Leather & Accessories",
    badgeText: "Wallet & Belt",
    icon: Briefcase,
    filterFn: (p: Product) =>
      p.category === "Leather & Accessories" ||
      p.category === "Leather" ||
      Boolean(p.categoryBn?.includes("Leather")) ||
      Boolean(p.categoryBn?.includes("Accessories")),
  },
  {
    id: "row-organic-food",
    titleBn: "Organic & Food Items",
    titleEn: "Organic & Food Items",
    categorySlug: "Organic & Food Items",
    badgeText: "Honey & Pure Foods",
    icon: Apple,
    filterFn: (p: Product) =>
      p.category === "Organic & Food Items" ||
      p.category === "Organic & Food" ||
      Boolean(p.categoryBn?.includes("Food")) ||
      Boolean(p.categoryBn?.includes("Honey")) ||
      Boolean(p.categoryBn?.includes("Organic")) ||
      Boolean(p.categoryBn?.includes("Ghee")),
  },
  {
    id: "row-electronics-gadgets",
    titleBn: "Electronics & Gadgets",
    titleEn: "Electronics & Gadgets",
    categorySlug: "Electronics & Gadgets",
    badgeText: "Smartwatch & Headphones",
    icon: Tv,
    filterFn: (p: Product) =>
      p.category === "Electronics & Gadgets" ||
      p.category === "Electronics" ||
      Boolean(p.categoryBn?.includes("Electronics")) ||
      Boolean(p.categoryBn?.includes("Gadgets")),
  },
  {
    id: "row-featured-trending",
    titleBn: "Featured & Trending Products",
    titleEn: "Featured & Trending Products",
    categorySlug: "Featured",
    badgeText: "Hot Deals",
    icon: Flame,
    filterFn: (p: Product) => p.isPopular === true || p.isFeatured === true,
  },
];

const hideScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

export const HomeScreen: React.FC<HomeScreenProps> = ({
  products = [],
  categories = [],
  onNavigate,
  onAddToCart,
  onSelectProduct,
  onSelectCategory,
  onDirectOrder,
}) => {
  const promoRef = useRef<HTMLDivElement>(null);
  const [activePromo, setActivePromo] = useState(0);

  // Opens the "All Collections" page with no category filter
  const handleViewAllCollections = () => {
    if (onSelectCategory) onSelectCategory("");
    onNavigate("categories");
  };

  const handleViewCategory = (categorySlug: string) => {
    if (onSelectCategory) {
      onSelectCategory(categorySlug);
    }
    onNavigate("categories");
  };

  /* ---------- promo banners ---------- */

  // A banner's category text might not match a real category exactly.
  // If it doesn't match anything, open All Collections instead of an empty page.
  const resolvePromoTarget = (rawCategory?: string): string => {
    const n = norm(rawCategory);
    if (!n) return "";
    if (n === "featured") return rawCategory as string;

    const cat = categories.find((c) =>
      [c.slug, c.name, c.nameEn].map(norm).includes(n),
    );
    if (cat) return cat.slug || cat.name;

    const hasProducts = products.some(
      (p) => norm(p.category) === n || norm(p.categoryBn) === n,
    );
    return hasProducts ? (rawCategory as string) : "";
  };

  const handlePromoClick = (category?: string) => {
    if (onSelectCategory) onSelectCategory(resolvePromoTarget(category));
    onNavigate("categories");
  };

  // Which banner is centred in the slider (for the dots)
  const handlePromoScroll = () => {
    const el = promoRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const node = child as HTMLElement;
      const dist = Math.abs(node.offsetLeft + node.offsetWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best !== activePromo) setActivePromo(best);
  };

  const scrollToPromo = (index: number) => {
    const node = promoRef.current?.children[index] as HTMLElement | undefined;
    scrollElementIntoView(node, {
      inline: "center",
      block: "nearest",
    });
  };

  const categorySections = categories
    .map((category) => {
      const keys = [category.slug, category.name, category.nameEn]
        .map(norm)
        .filter(Boolean);
      const config = CATEGORY_ROWS.find((row) =>
        keys.includes(norm(row.categorySlug)),
      );
      const rowProducts = products.filter(
        (product) =>
          keys.includes(norm(product.category)) ||
          keys.includes(norm(product.categoryBn)) ||
          Boolean(config?.filterFn(product)),
      );

      return {
        category,
        config,
        products: rowProducts,
      };
    })
    .filter((section) => section.products.length > 0);

  return (
    <div>
      <HeroCarousel onViewProducts={handleViewAllCollections} />
      <div className="w-full lg:w-[90%] mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8 space-y-7 md:space-y-14">
        {/* Hero banner */}

        {/* Promo banners: swipe slider on phones, one row of 3 from tablet up */}
        {promoBanners.length > 0 && (
          <section
            id="home-promo-banners-grid"
            aria-label="Offers and promotions"
          >
            <div
              ref={promoRef}
              onScroll={handlePromoScroll}
              className={`relative flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:snap-none ${hideScrollbar}`}
            >
              {promoBanners.map((banner) => {
                const title = banner.titleBn || banner.title;
                return (
                  <button
                    key={banner.id}
                    id={`promo-card-${banner.id}`}
                    type="button"
                    onClick={() => handlePromoClick(banner.category)}
                    aria-label={`${title}, shop now`}
                    className="group relative shrink-0 snap-center w-[85%] sm:w-[60%] md:w-auto h-40 sm:h-48 md:h-52 rounded-md overflow-hidden text-left bg-gray-200 border border-gray-200/80 shadow-sm md:hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00503a] focus-visible:ring-offset-2"
                  >
                    <img
                      src={banner.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover md:group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <span className="hidden sm:inline-block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#9ef4d0] bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs font-montserrat">
                        {banner.category}
                      </span>
                      <h3 className="text-lg sm:text-xl text-white font-bold font-bengali sm:mt-1 leading-tight line-clamp-2 drop-shadow-xs">
                        {title}
                      </h3>
                      <span className="mt-2 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white/95 text-[#00503a] text-xs font-bold font-bengali md:group-hover:bg-[#9ef4d0] transition-colors">
                        Shop Now
                        <ArrowRight className="w-3.5 h-3.5 md:group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Slider dots (phones and small tablets) */}
            {promoBanners.length > 1 && (
              <div className="md:hidden flex items-center justify-center gap-1.5 mt-3">
                {promoBanners.map((banner, idx) => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => scrollToPromo(idx)}
                    aria-label={`Go to offer ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === activePromo
                        ? "w-5 bg-[#00503a]"
                        : "w-1.5 bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Category product rows */}
        <div
          id="category-showcase-container"
          className="space-y-10 md:space-y-16"
        >
          {categorySections.map(({ category, config, products: rowProducts }) => {
            const categorySlug = category.slug || category.id;
            const sectionId = config?.id || `category-${category.id}`;
            const categoryName = config?.titleBn || category.name;
            const titleEn = config?.titleEn || category.nameEn || category.name;
            const IconComponent = config?.icon || ShoppingBag;

            return (
              <CategoryProductSection
                key={category.id}
                categoryId={category.id}
                categoryName={categoryName}
                categorySlug={categorySlug}
                titleEn={titleEn}
                badgeText={config?.badgeText || category.description || category.name}
                sectionId={sectionId}
                viewAllUrl={`?page=categories&category=${encodeURIComponent(categorySlug)}`}
                products={rowProducts}
                icon={IconComponent}
                onViewAll={() => handleViewCategory(categorySlug)}
                onAddToCart={onAddToCart}
                onSelectProduct={onSelectProduct}
                onDirectOrder={onDirectOrder}
              />
            );
          })}
        </div>

        {/* Trust strip */}
        <section
          id="home-trust-perks-strip"
          className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 font-bengali pt-2"
        >
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200/90 shadow-xs flex items-center gap-2.5 sm:gap-3 hover:border-[#00503a]/40 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#e7f6f0] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5 text-[#006a4e]" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                Fast Home Delivery
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Within 24-72 hours nationwide
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200/90 shadow-xs flex items-center gap-2.5 sm:gap-3 hover:border-[#00503a]/40 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Banknote className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                Cash on Delivery
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Pay on delivery
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200/90 shadow-xs flex items-center gap-2.5 sm:gap-3 hover:border-[#00503a]/40 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                100% Authentic Products
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Authentic heritage & top quality
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200/90 shadow-xs flex items-center gap-2.5 sm:gap-3 hover:border-[#00503a]/40 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Headphones className="w-5 h-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                24/7 Customer Service
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                24/7 support via WhatsApp
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
