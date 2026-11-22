import React, { useState, useMemo } from "react";
import { Product, CategoryItem } from "../../types";
import {
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package,
  Sparkles,
  X,
} from "lucide-react";
import { AdminProductForm, LEGACY_CATEGORIES } from "./Adminproductform";

type SaveResult = void | boolean | Promise<void | boolean>;

interface AdminProductManagementProps {
  products?: Product[];
  categories?: CategoryItem[];
  /** May return a Promise<boolean>. `false` means the server rejected it. */
  onAddProduct: (product: Product) => SaveResult;
  onUpdateProduct: (product: Product) => SaveResult;
  onDeleteProduct: (productId: string) => void;
}

type StockFilter = "all" | "low" | "in_stock" | "out_of_stock";

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Only the fields that really changed, so a small edit never re-uploads big images
const diffProduct = (original: Product, next: Product): Partial<Product> => {
  const changes: Record<string, unknown> = {};
  (Object.keys(next) as (keyof Product)[]).forEach((key) => {
    if (key === "id") return;
    const value = next[key];
    if (value === undefined) return;
    if (!sameValue(original[key], value)) changes[key as string] = value;
  });
  return changes as Partial<Product>;
};

const getStockInfo = (p: Product) => {
  const qty = p.stockQty ?? 0;
  const threshold = p.lowStockThreshold ?? 10;
  const out = !p.inStock || qty <= 0;
  const low = !out && qty <= threshold;
  return { qty, out, low };
};

export const AdminProductManagement: React.FC<AdminProductManagementProps> = ({
  products = [],
  categories = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const openAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  // The form stays open until this resolves true
  const handleFormSubmit = async (payload: Product): Promise<boolean> => {
    console.log("PAYLOAD", payload);
    if (editingProduct) {
      const changes = diffProduct(editingProduct, payload);
      if (Object.keys(changes).length === 0) {
        showNotice("No changes to save.");
        return true;
      }
      const result = await onUpdateProduct({
        ...changes,
        id: editingProduct.id,
      } as Product);
      return result !== false;
    }
    const result = await onAddProduct(payload);
    return result !== false;
  };

  // Quick stock buttons send only the two fields that change
  const handleQuickAdjustStock = (product: Product, delta: number) => {
    const newStock = Math.max(0, (product.stockQty ?? 0) + delta);
    onUpdateProduct({
      id: product.id,
      stockQty: newStock,
      inStock: newStock > 0,
    } as Product);
  };

  const handleDelete = (product: Product) => {
    if (
      window.confirm(
        `Delete "${product.nameEn || product.name}"? This cannot be undone.`,
      )
    ) {
      onDeleteProduct(product.id);
    }
  };

  // Category filter options: same list the product form uses
  const categoryFilterOptions = useMemo(() => {
    const legacyValues = LEGACY_CATEGORIES.map((c) => c.value);
    const opts = LEGACY_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
    }));
    categories
      .filter((c) => !legacyValues.includes(c.name))
      .forEach((c) => opts.push({ value: c.name, label: c.nameEn || c.name }));
    return opts;
  }, [categories]);

  const matchesCategory = (p: Product, selected: string) => {
    if (selected === "all") return true;
    const n = norm(selected);
    const cat = categories.find((c) =>
      [c.slug, c.name, c.nameEn].map(norm).includes(n),
    );
    const keys = cat
      ? [cat.slug, cat.name, cat.nameEn].map(norm).filter(Boolean)
      : [n];
    return keys.includes(norm(p.category)) || keys.includes(norm(p.categoryBn));
  };

  const filteredProducts = useMemo(() => {
    const q = norm(searchQuery);
    return products.filter((product) => {
      const matchesSearch =
        !q ||
        norm(product.name).includes(q) ||
        norm(product.nameEn).includes(q) ||
        norm(product.sku).includes(q) ||
        norm(product.category).includes(q);
      if (!matchesSearch) return false;
      if (!matchesCategory(product, selectedCategory)) return false;

      const { out, low } = getStockInfo(product);
      if (stockFilter === "low") return low || out;
      if (stockFilter === "in_stock") return !out && !low;
      if (stockFilter === "out_of_stock") return out;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, categories, searchQuery, selectedCategory, stockFilter]);

  /* ---------- small shared pieces ---------- */
  const renderStatusBadge = (product: Product) => {
    const { out, low } = getStockInfo(product);
    if (out) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3" /> Out of Stock
        </span>
      );
    }
    if (low) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
          <AlertTriangle className="w-3 h-3" /> Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
        <CheckCircle2 className="w-3 h-3" /> In Stock
      </span>
    );
  };

  const renderStockControls = (product: Product) => {
    const { qty, out, low } = getStockInfo(product);
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`font-black font-montserrat px-2.5 py-1 rounded-lg text-xs ${
            out
              ? "bg-red-100 text-red-700 border border-red-200"
              : low
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {qty} units
        </span>
        <div className="inline-flex items-center rounded-xl bg-gray-100 p-0.5 border border-gray-200">
          <button
            type="button"
            onClick={() => handleQuickAdjustStock(product, -1)}
            disabled={qty <= 0}
            aria-label="Decrease stock by 1"
            className="w-9 h-9 rounded-lg bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 disabled:opacity-40 font-bold text-xs flex items-center justify-center cursor-pointer"
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdjustStock(product, 5)}
            aria-label="Increase stock by 5"
            className="w-9 h-9 rounded-lg bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 font-bold text-xs flex items-center justify-center cursor-pointer ml-0.5"
          >
            +5
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdjustStock(product, 10)}
            aria-label="Increase stock by 10"
            className="w-10 h-9 rounded-lg bg-[#00503a] hover:bg-[#003828] text-white font-bold text-xs flex items-center justify-center cursor-pointer ml-0.5"
          >
            +10
          </button>
        </div>
      </div>
    );
  };

  const renderPrice = (product: Product) => (
    <div>
      <p className="font-black text-[#00503a] font-montserrat">
        {product.price.toLocaleString()} tk
      </p>
      {product.originalPrice && product.originalPrice > product.price && (
        <p className="text-[11px] text-gray-400 line-through font-montserrat">
          {product.originalPrice.toLocaleString()} tk
        </p>
      )}
      {product.promotionalPrice && product.promotionalPrice < product.price && (
        <p className="text-[10px] font-bold text-rose-600">
          Offer {product.promotionalPrice.toLocaleString()} tk
        </p>
      )}
    </div>
  );

  const renderActions = (product: Product) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => openEdit(product)}
        aria-label={`Edit ${product.name}`}
        title="Edit"
        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-[#00503a] hover:text-white text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => handleDelete(product)}
        aria-label={`Delete ${product.name}`}
        title="Delete"
        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const stockTabs: { key: StockFilter; label: string }[] = [
    { key: "all", label: `All (${products.length})` },
    { key: "low", label: "Low stock" },
    { key: "in_stock", label: "In stock" },
    { key: "out_of_stock", label: "Out of stock" },
  ];

  if (isFormOpen) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <AdminProductForm
          product={editingProduct}
          categories={categories}
          existingProducts={products}
          onSubmit={handleFormSubmit}
          onBack={closeForm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#191c1d] font-montserrat">
            Product Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage inventory, prices, stock alerts and product listings
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {notice && (
            <div className="bg-[#e7f6f0] text-[#00503a] text-xs font-bold px-3 py-2 rounded-xl border border-[#00503a]/20">
              {notice}
            </div>
          )}
          <button
            id="admin-add-product-btn"
            type="button"
            onClick={openAdd}
            className="flex-1 sm:flex-none h-11 flex items-center justify-center gap-2 bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold px-5 rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#9ef4d0]" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, SKU or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00503a] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="h-11 bg-gray-50 border border-gray-200 text-gray-800 text-base sm:text-sm font-semibold rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#00503a] cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categoryFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {stockTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStockFilter(tab.key)}
              className={`h-9 px-3.5 shrink-0 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                stockFilter === tab.key
                  ? tab.key === "low" || tab.key === "out_of_stock"
                    ? "bg-red-600 text-white"
                    : "bg-[#00503a] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 py-12 text-center text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="font-semibold text-gray-600">No products found</p>
          <p className="text-xs text-gray-400 mt-1">
            Try different filters or add a new product.
          </p>
        </div>
      )}

      {/* Mobile: cards */}
      {filteredProducts.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-3.5 space-y-3"
            >
              <div className="flex gap-3">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0 bg-gray-100"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 truncate">
                    {product.nameEn || product.name}
                  </p>
                  {product.nameEn && (
                    <p className="text-[11px] text-gray-400 truncate">
                      {product.name}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="bg-gray-100 text-gray-700 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                      {product.category}
                    </span>
                    {product.isPopular && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                        <Sparkles className="w-2.5 h-2.5" /> Popular
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">
                    SKU: {product.sku || "-"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {renderPrice(product)}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {renderStatusBadge(product)}
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                {renderStockControls(product)}
                {renderActions(product)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tablet / desktop: table */}
      {filteredProducts.length > 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8faf9] text-gray-600 font-bold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-3">Category & SKU</th>
                  <th className="py-3.5 px-3">Price</th>
                  <th className="py-3.5 px-3">Stock</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0 bg-gray-100"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 group-hover:text-[#00503a] transition-colors truncate max-w-[220px]">
                            {product.nameEn || product.name}
                          </p>
                          {product.nameEn && (
                            <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                              {product.name}
                            </p>
                          )}
                          {product.isPopular && (
                            <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 border border-amber-200">
                              <Sparkles className="w-2.5 h-2.5" /> Popular
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block bg-gray-100 text-gray-700 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                        {product.category}
                      </span>
                      <p className="text-[10px] text-gray-400 font-mono mt-1">
                        SKU: {product.sku || "-"}
                      </p>
                      {product.model && (
                        <span className="inline-flex text-[10px] font-bold bg-emerald-50 text-[#00503a] px-1.5 py-0.5 rounded border border-emerald-200 mt-1">
                          Model: {product.model}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">{renderPrice(product)}</td>
                    <td className="py-3 px-3">
                      {renderStockControls(product)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {renderStatusBadge(product)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        {renderActions(product)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
