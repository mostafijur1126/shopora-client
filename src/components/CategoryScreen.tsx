import React, { useState, useMemo, useEffect } from "react";
import { Product, ActiveScreen, CategoryItem } from "../types";
import { ProductCard } from "./ProductCard";
import { ChevronRight, Filter, RotateCcw, X, SearchX } from "lucide-react";
import { renderCategoryIcon } from "./TopNavBar";
import { formatPrice } from "../utils/format";

interface CategoryScreenProps {
  products?: Product[];
  categories?: CategoryItem[];
  onNavigate: (screen: ActiveScreen) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onDirectOrder?: (product: Product) => void;
  searchQuery?: string;
  selectedCategoryFilter?: string | null;
  onResetCategoryFilter?: () => void;
}

type SortKey = "default" | "price-asc" | "price-desc" | "name";

const PAGE_SIZE = 12;

const norm = (s?: string | null) => (s || "").trim().toLowerCase();
// Every name a category can be referred to by (slug, Bengali name, English name)
const catKeys = (cat: CategoryItem) =>
  [cat.slug, cat.name, cat.nameEn].map(norm).filter(Boolean);

export const CategoryScreen: React.FC<CategoryScreenProps> = ({
  products = [],
  categories = [],
  onNavigate,
  onAddToCart,
  onSelectProduct,
  onDirectOrder,
  searchQuery = "",
  selectedCategoryFilter,
  onResetCategoryFilter,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    selectedCategoryFilter ? [selectedCategoryFilter] : [],
  );
  // null = no price limit
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Keep in sync with the category picked in the navbar / home page
  useEffect(() => {
    setSelectedCategories(
      selectedCategoryFilter ? [selectedCategoryFilter] : [],
    );
  }, [selectedCategoryFilter]);

  // Lock page scroll while the mobile filter sheet is open
  useEffect(() => {
    if (!filterSheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterSheetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filterSheetOpen]);

  /* ---------- category helpers ---------- */
  const updateCategories = (next: string[]) => {
    setSelectedCategories(next);
    if (next.length === 0 && onResetCategoryFilter) onResetCategoryFilter();
  };

  const isCatSelected = (cat: CategoryItem) => {
    const keys = catKeys(cat);
    return selectedCategories.some((s) => keys.includes(norm(s)));
  };

  const toggleCategory = (cat: CategoryItem) => {
    const keys = catKeys(cat);
    if (isCatSelected(cat)) {
      updateCategories(
        selectedCategories.filter((s) => !keys.includes(norm(s))),
      );
    } else {
      updateCategories([...selectedCategories, cat.slug || cat.name]);
    }
  };

  const labelForSelected = (selected: string) => {
    const n = norm(selected);
    const cat = categories.find((c) => catKeys(c).includes(n));
    return cat ? cat.name : selected;
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => {
      const keys = catKeys(cat);
      counts[cat.id] = products.filter(
        (p) =>
          keys.includes(norm(p.category)) || keys.includes(norm(p.categoryBn)),
      ).length;
    });
    return counts;
  }, [products, categories]);

  /* ---------- price range based on real product prices ---------- */
  const priceCeiling = useMemo(() => {
    const max = products.reduce((m, p) => Math.max(m, p.price), 0);
    return Math.max(500, Math.ceil(max / 100) * 100);
  }, [products]);
  const priceStep = priceCeiling > 5000 ? 100 : 50;
  const effectiveMax =
    maxPrice === null ? priceCeiling : Math.min(maxPrice, priceCeiling);
  const isPriceFiltered = maxPrice !== null && maxPrice < priceCeiling;

  const activeFilterCount =
    selectedCategories.length +
    (isPriceFiltered ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setMaxPrice(null);
    setInStockOnly(false);
    if (onResetCategoryFilter) onResetCategoryFilter();
  };

  /* ---------- filtering + sorting ---------- */
  const selectedMatchers = useMemo(
    () =>
      selectedCategories.map((s) => {
        const n = norm(s);
        const cat = categories.find((c) => catKeys(c).includes(n));
        return { keys: cat ? catKeys(cat) : [n], featured: n === "featured" };
      }),
    [selectedCategories, categories],
  );

  const sortedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const result = products.filter((p) => {
      if (selectedMatchers.length > 0) {
        const pc = norm(p.category);
        const pb = norm(p.categoryBn);
        const ok = selectedMatchers.some(
          (m) =>
            m.keys.includes(pc) ||
            m.keys.includes(pb) ||
            (m.featured && (p.isPopular || p.isFeatured)),
        );
        if (!ok) return false;
      }
      if (isPriceFiltered && p.price > effectiveMax) return false;
      if (inStockOnly && !p.inStock) return false;
      if (q) {
        const hit =
          p.name.toLowerCase().includes(q) ||
          Boolean(p.nameEn?.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q) ||
          Boolean(p.categoryBn?.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });

    const sorted = [...result];
    if (sortBy === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === "name")
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [
    products,
    selectedMatchers,
    isPriceFiltered,
    effectiveMax,
    inStockOnly,
    searchQuery,
    sortBy,
  ]);

  // Start from the first page again whenever the result set changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategories, maxPrice, inStockOnly, searchQuery, sortBy]);

  const visibleProducts = sortedProducts.slice(0, visibleCount);
  const hasMore = sortedProducts.length > visibleCount;

  const pageTitle =
    selectedCategories.length === 1
      ? labelForSelected(selectedCategories[0])
      : "All Collections";

  /* ---------- shared filter controls (desktop sidebar + mobile sheet) ---------- */
  const renderFilters = (prefix: string) => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 font-montserrat">
            Categories ({categories.length})
          </h3>
          {selectedCategories.length > 0 && (
            <button
              onClick={() => updateCategories([])}
              className="text-[11px] font-semibold text-[#00503a] hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const isChecked = isCatSelected(cat);
            return (
              <label
                key={cat.id}
                id={`${prefix}-cat-label-${cat.id}`}
                className={`flex items-center justify-between gap-2 px-2.5 min-h-[44px] rounded-xl cursor-pointer select-none transition-colors group ${
                  isChecked
                    ? "bg-[#e7f6f0] text-[#00503a] font-bold"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCategory(cat)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#00503a] cursor-pointer shrink-0"
                  />
                  <span className="text-[#006a4e] shrink-0">
                    {renderCategoryIcon(cat.iconName, "w-4 h-4")}
                  </span>
                  <span className="text-sm truncate">{cat.name}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ${
                    isChecked
                      ? "bg-[#00503a] text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {categoryCounts[cat.id] ?? 0}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 font-montserrat">
          Max price
        </h3>
        <input
          id={`${prefix}-price-slider`}
          type="range"
          min={0}
          max={priceCeiling}
          step={priceStep}
          value={effectiveMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            setMaxPrice(v >= priceCeiling ? null : v);
          }}
          className="w-full accent-[#00503a] cursor-pointer h-6"
          aria-label="Maximum price"
        />
        <div className="flex justify-between text-xs text-gray-600 font-medium mt-1 font-montserrat">
          <span>{formatPrice(0)}</span>
          <span className="text-[#00503a] font-bold">
            {isPriceFiltered
              ? `Up to ${formatPrice(effectiveMax)}`
              : "Any price"}
          </span>
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 font-montserrat">
          Availability
        </h3>
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer group select-none">
          <input
            id={`${prefix}-stock-only`}
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-[#00503a] cursor-pointer"
          />
          <span className="text-sm text-gray-800 group-hover:text-[#00503a] transition-colors">
            In stock only
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="w-full lg:w-[90%] mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-6 space-y-4 md:space-y-5 font-bengali">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="text-xs sm:text-sm text-[#3f4944]"
      >
        <ol className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li>
            <button
              id="breadcrumb-home"
              onClick={() => onNavigate("home")}
              className="hover:text-[#00503a] transition-colors cursor-pointer"
            >
              Home
            </button>
          </li>
          <li>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </li>
          <li>
            <button
              id="breadcrumb-shop"
              onClick={() => {
                handleResetFilters();
                onNavigate("categories");
              }}
              className={`transition-colors cursor-pointer ${
                selectedCategories.length === 1
                  ? "hover:text-[#00503a]"
                  : "font-semibold text-[#191c1d]"
              }`}
            >
              Collection
            </button>
          </li>
          {selectedCategories.length === 1 && (
            <>
              <li>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </li>
              <li aria-current="page" className="text-[#00503a] font-bold">
                {pageTitle}
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Desktop sidebar */}
        <aside
          id="category-sidebar-filters"
          className="hidden lg:block w-72 shrink-0 sticky top-28 self-start max-h-[calc(100dvh-8rem)] overflow-y-auto bg-white rounded-2xl p-5 shadow-xs border border-gray-200/80"
        >
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-base font-bold text-[#00503a] flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </h2>
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#bb0027] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset all</span>
              </button>
            )}
          </div>
          {renderFilters("filter")}
        </aside>

        {/* Results */}
        <main className="w-full min-w-0 lg:flex-1">
          {/* Title + toolbar (sticky on phones so Filter / Sort stay reachable) */}
          <div className="mb-3">
            <h1 className="text-lg sm:text-2xl font-bold text-[#191c1d] font-montserrat truncate">
              {pageTitle}
            </h1>
            {searchQuery.trim() && (
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Results for “{searchQuery.trim()}”
              </p>
            )}
          </div>

          <div className="sticky top-16 lg:static z-30 -mx-3 px-3 sm:mx-0 sm:px-0 py-2 lg:py-0 bg-[#f8f9fa]/95 backdrop-blur lg:backdrop-blur-none mb-3">
            <div className="flex items-center justify-between gap-2">
              <p className="hidden sm:block text-sm text-gray-600">
                <span className="font-bold text-[#191c1d]">
                  {sortedProducts.length}
                </span>{" "}
                {sortedProducts.length === 1 ? "product" : "products"}
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setFilterSheetOpen(true)}
                  className="lg:hidden flex-1 sm:flex-none h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-800 cursor-pointer active:bg-gray-50"
                >
                  <Filter className="w-4 h-4 text-[#00503a]" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#00503a] text-white text-[11px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <label className="flex-1 sm:flex-none">
                  <span className="sr-only">Sort by</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="w-full h-10 pl-3 pr-8 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15 cursor-pointer"
                  >
                    <option value="default">Sort: Default</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </label>
              </div>
            </div>
            <p className="sm:hidden text-xs text-gray-500 mt-1.5">
              {sortedProducts.length}{" "}
              {sortedProducts.length === 1 ? "product" : "products"}
            </p>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {selectedCategories.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    updateCategories(selectedCategories.filter((x) => x !== s))
                  }
                  className="h-8 pl-3 pr-2 rounded-full bg-[#e7f6f0] text-[#00503a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#d7f5e9]"
                >
                  <span>{labelForSelected(s)}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              ))}
              {isPriceFiltered && (
                <button
                  onClick={() => setMaxPrice(null)}
                  className="h-8 pl-3 pr-2 rounded-full bg-[#e7f6f0] text-[#00503a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#d7f5e9]"
                >
                  <span>Up to {formatPrice(effectiveMax)}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {inStockOnly && (
                <button
                  onClick={() => setInStockOnly(false)}
                  className="h-8 pl-3 pr-2 rounded-full bg-[#e7f6f0] text-[#00503a] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#d7f5e9]"
                >
                  <span>In stock</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleResetFilters}
                className="text-xs font-semibold text-[#bb0027] hover:underline cursor-pointer px-1"
              >
                Clear all
              </button>
            </div>
          )}

          {sortedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-gray-200">
              <SearchX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base sm:text-lg font-semibold text-gray-700">
                No products found
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Try removing a filter or searching for something else.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-5 h-11 bg-[#00503a] text-white px-6 rounded-xl text-sm font-bold hover:bg-[#003828] cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              {/* 2 columns on phones, 3 on tablets, 4 on large desktops */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onSelectProduct={onSelectProduct}
                    onDirectOrder={onDirectOrder}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-7 text-center">
                  <p className="text-xs text-gray-500 mb-2.5">
                    Showing {visibleProducts.length} of {sortedProducts.length}
                  </p>
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="h-11 px-8 rounded-xl border-2 border-[#00503a] text-[#00503a] text-sm font-bold hover:bg-[#00503a] hover:text-white transition-colors cursor-pointer"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile / tablet filter sheet */}
      <div
        className={`lg:hidden fixed inset-0 z-50 font-bengali ${
          filterSheetOpen
            ? "visible"
            : "invisible pointer-events-none [transition:visibility_0s_300ms]"
        }`}
      >
        <div
          onClick={() => setFilterSheetOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            filterSheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={`absolute inset-x-0 bottom-0 max-h-[88dvh] bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
            filterSheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="shrink-0 px-4 pt-2 pb-3 border-b border-gray-100">
            <div className="flex justify-center mb-2">
              <span className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#00503a] flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h2>
              <button
                onClick={() => setFilterSheetOpen(false)}
                aria-label="Close filters"
                className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {renderFilters("sheet")}
          </div>

          <div className="shrink-0 border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2.5">
            <button
              onClick={handleResetFilters}
              disabled={activeFilterCount === 0}
              className="h-12 px-5 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 disabled:opacity-40 cursor-pointer"
            >
              Reset
            </button>
            <button
              onClick={() => setFilterSheetOpen(false)}
              className="flex-1 h-12 rounded-xl bg-[#00503a] text-white text-sm font-bold cursor-pointer active:scale-[0.98] transition-transform"
            >
              Show {sortedProducts.length}{" "}
              {sortedProducts.length === 1 ? "product" : "products"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
