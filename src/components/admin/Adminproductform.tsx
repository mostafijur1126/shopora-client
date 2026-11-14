import React, { useState, useMemo, useRef, useEffect } from "react";
import { Product, CategoryItem, ColorVariant } from "../../types";

import {
  X,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  UploadCloud,
  Star,
  Loader2,
  Palette,
  Ruler,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { compressImage } from "@/src/utils/Image";
import { uploadImageApi } from "@/src/utils/uploadImage";

/* ------------------------------------------------------------------ */
/* constants                                                           */
/* ------------------------------------------------------------------ */

export const LEGACY_CATEGORIES = [
  { value: "Fashion", label: "Fashion & Apparel", bn: "ফ্যাশন ও পোশাক" },
  {
    value: "Home & Living",
    label: "Home & Living",
    bn: "হস্তশিল্প ও গৃহসজ্জা",
  },
  {
    value: "Electronics",
    label: "Electronics & Gadgets",
    bn: "ইলেকট্রনিক্স ও গ্যাজেট",
  },
  { value: "Organic", label: "Organic & Food", bn: "খাঁটি খাবার ও অর্গানিক" },
  {
    value: "Leather",
    label: "Leather & Shoes",
    bn: "লেদার ও প্রিমিয়াম ফুটওয়্যার",
  },
];

const DEFAULT_COLOR_MAP: Record<string, string> = {
  "emerald green": "#007A55",
  emerald: "#007A55",
  green: "#007A55",
  maroon: "#800000",
  navy: "#000080",
  "navy blue": "#000080",
  black: "#111827",
  white: "#ffffff",
  gold: "#d97706",
  red: "#bb0027",
  "royal blue": "#1e40af",
  olive: "#556b2f",
  pink: "#db2777",
};

const PRESET_COLORS: ColorVariant[] = [
  { name: "Emerald Green", hex: "#007A55" },
  { name: "Maroon", hex: "#800000" },
  { name: "Navy Blue", hex: "#000080" },
  { name: "Classic Black", hex: "#111827" },
  { name: "Pure White", hex: "#FFFFFF" },
  { name: "Royal Gold", hex: "#D97706" },
  { name: "Ruby Red", hex: "#BB0027" },
  { name: "Rose Pink", hex: "#DB2777" },
];

const PRESET_SIZES = [
  "Standard",
  "Free Size",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "38",
  "40",
  "42",
  "44",
];

const MAX_IMAGES = 6;
const MAX_FEATURES = 12;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

// Used to clear a field on update (JSON `null` makes the server unset it)
const CLEAR = null as unknown as undefined;

/* ------------------------------------------------------------------ */
/* form state                                                          */
/* ------------------------------------------------------------------ */

interface SpecRow {
  key: string;
  value: string;
}

interface PdpVisibility {
  description: boolean;
  specifications: boolean;
  reviews: boolean;
  relatedProducts: boolean;
  recentlyViewed: boolean;
}

interface FormState {
  name: string;
  nameEn: string;
  category: string;
  sku: string;
  price: string;
  originalPrice: string;
  costPrice: string;
  promotionalPrice: string;
  stockQty: string;
  lowStockThreshold: string;
  description: string;
  detailedDescription: string;
  deliveryTime: string;
  materialOrOrigin: string;
  features: string[];
  specs: SpecRow[];
  hasColors: boolean;
  colors: ColorVariant[];
  hasSizes: boolean;
  sizes: string[];
  model: string;
  models: string[];
  images: string[];
  inStock: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  pdp: PdpVisibility;
}

type ErrorKey =
  | "name"
  | "category"
  | "price"
  | "originalPrice"
  | "promotionalPrice"
  | "costPrice"
  | "stockQty"
  | "lowStockThreshold"
  | "sku"
  | "images";

type Errors = Partial<Record<ErrorKey, string>>;

const ERROR_ORDER: ErrorKey[] = [
  "name",
  "category",
  "price",
  "originalPrice",
  "promotionalPrice",
  "costPrice",
  "stockQty",
  "lowStockThreshold",
  "sku",
  "images",
];

const emptyState = (): FormState => ({
  name: "",
  nameEn: "",
  category: LEGACY_CATEGORIES[0].value,
  sku: "",
  price: "",
  originalPrice: "",
  costPrice: "",
  promotionalPrice: "",
  stockQty: "",
  lowStockThreshold: "10",
  description: "",
  detailedDescription: "",
  deliveryTime: "",
  materialOrOrigin: "",
  features: [],
  specs: [],
  hasColors: true,
  colors: [],
  hasSizes: true,
  sizes: [],
  model: "",
  models: [],
  images: [],
  inStock: true,
  isPopular: false,
  isFeatured: false,
  pdp: {
    description: true,
    specifications: true,
    reviews: true,
    relatedProducts: true,
    recentlyViewed: true,
  },
});

const fromProduct = (p: Product): FormState => {
  let colors: ColorVariant[] = [];
  if (p.colorVariants && p.colorVariants.length > 0) {
    colors = p.colorVariants.map((c) => ({ ...c }));
  } else if (p.colors && p.colors.length > 0) {
    colors = p.colors.map((c) => {
      if (typeof c === "object" && c !== null && "name" in c) {
        return {
          name: c.name,
          hex: c.hex || DEFAULT_COLOR_MAP[c.name.toLowerCase()] || "#007A55",
        };
      }
      const name = String(c);
      return { name, hex: DEFAULT_COLOR_MAP[name.toLowerCase()] || "#007A55" };
    });
  }

  const gallery =
    p.images && p.images.length > 0 ? p.images : p.image ? [p.image] : [];

  return {
    name: p.name || "",
    nameEn: p.nameEn || "",
    category: p.category || LEGACY_CATEGORIES[0].value,
    sku: p.sku || "",
    price: p.price ? String(p.price) : "",
    originalPrice: p.originalPrice ? String(p.originalPrice) : "",
    costPrice:
      p.costPrice !== undefined && p.costPrice !== null
        ? String(p.costPrice)
        : "",
    promotionalPrice: p.promotionalPrice ? String(p.promotionalPrice) : "",
    stockQty:
      p.stockQty !== undefined && p.stockQty !== null ? String(p.stockQty) : "",
    lowStockThreshold: String(p.lowStockThreshold ?? 10),
    description: p.description || "",
    detailedDescription: p.detailedDescription || "",
    deliveryTime: p.deliveryTime || "",
    materialOrOrigin: p.materialOrOrigin || "",
    features: p.features ? [...p.features] : [],
    specs: Object.entries(p.specifications || {}).map(([key, value]) => ({
      key,
      value: String(value),
    })),
    hasColors: p.hasColors !== false,
    colors,
    hasSizes: p.hasSizes !== false,
    sizes: p.sizes ? [...p.sizes] : [],
    model: p.model || p.models?.[0] || "",
    models:
      p.models && p.models.length > 0
        ? [...p.models]
        : p.model
          ? [p.model]
          : [],
    images: gallery,
    inStock: p.inStock,
    isPopular: Boolean(p.isPopular),
    isFeatured: Boolean(p.isFeatured),
    pdp: {
      description: p.pdpSectionVisibility?.description !== false,
      specifications: p.pdpSectionVisibility?.specifications !== false,
      reviews: p.pdpSectionVisibility?.reviews !== false,
      relatedProducts: p.pdpSectionVisibility?.relatedProducts !== false,
      recentlyViewed: p.pdpSectionVisibility?.recentlyViewed !== false,
    },
  };
};

/* ------------------------------------------------------------------ */
/* small helpers + presentational pieces (defined outside the form so  */
/* inputs never lose focus while typing)                               */
/* ------------------------------------------------------------------ */

const norm = (s?: string | null) => (s || "").trim().toLowerCase();

// '' -> undefined, '12' -> 12, 'abc' -> NaN
const parseNum = (s: string): number | undefined => {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

const inputCls = (bad?: boolean) =>
  `w-full h-11 px-3.5 bg-white border rounded-xl text-base sm:text-sm text-gray-900 outline-none transition-colors placeholder-gray-400 ${
    bad
      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
      : "border-gray-300 focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15"
  }`;

const textareaCls =
  "w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-base sm:text-sm text-gray-900 outline-none transition-colors placeholder-gray-400 focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15 resize-y leading-relaxed";

const Section: React.FC<{
  title: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ title, hint, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
    <div>
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
    </div>
    {children}
  </section>
);

const Field: React.FC<{
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ id, label, required, hint, error, children }) => (
  <div>
    <label
      htmlFor={id}
      className="block text-xs font-bold text-gray-700 mb-1.5"
    >
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
    {error && (
      <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
        {error}
      </p>
    )}
  </div>
);

const Switch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#00503a] ${
      checked ? "bg-[#007A55]" : "bg-gray-300"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

interface AdminProductFormProps {
  /** null = create a new product */
  product: Product | null;
  categories: CategoryItem[];
  existingProducts: Product[];
  /** Resolve true once the server has saved the product. The form closes only then. */
  onSubmit: (payload: Product) => Promise<boolean>;
  onClose: () => void;
}

export const AdminProductForm: React.FC<AdminProductFormProps> = ({
  product,
  categories,
  existingProducts,
  onSubmit,
  onClose,
}) => {
  const isEdit = Boolean(product);

  const [form, setForm] = useState<FormState>(() =>
    product ? fromProduct(product) : emptyState(),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [flash, setFlash] = useState("");

  const [uploading, setUploading] = useState(0);
  const [uploadMessages, setUploadMessages] = useState<string[]>([]);
  const [inlineImages, setInlineImages] = useState(false);

  // draft inputs for the "add" rows
  const [newFeature, setNewFeature] = useState("");
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#007A55");
  const [sizeInput, setSizeInput] = useState("");
  const [modelInput, setModelInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const patch = (changes: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...changes }));
    setDirty(true);
  };

  const showFlash = (msg: string) => {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(""), 2600);
  };

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const requestClose = () => {
    if (saving) return;
    if (dirty && !window.confirm("Discard your changes?")) return;
    onClose();
  };

  // Lock page scroll and close on Escape
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  const clearError = (key: ErrorKey) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /* ---------- category options ---------- */
  const categoryOptions = useMemo(() => {
    const legacyValues = LEGACY_CATEGORIES.map((c) => c.value);
    const opts = LEGACY_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      bn: c.bn,
    }));
    categories
      .filter((c) => !legacyValues.includes(c.name))
      .forEach((c) =>
        opts.push({
          value: c.name,
          label: c.nameEn ? `${c.nameEn} (${c.name})` : c.name,
          bn: c.name,
        }),
      );
    if (form.category && !opts.some((o) => o.value === form.category)) {
      opts.push({
        value: form.category,
        label: form.category,
        bn: product?.categoryBn || form.category,
      });
    }
    return opts;
  }, [categories, form.category, product]);

  /* ---------- photos ---------- */
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const slots = Math.max(0, MAX_IMAGES - form.images.length);
    const files = Array.from(fileList).slice(0, slots);
    setUploadMessages(
      fileList.length > files.length
        ? [`You can add up to ${MAX_IMAGES} photos per product.`]
        : [],
    );
    clearError("images");
    setUploading((c) => c + files.length);

    for (const file of files) {
      try {
        if (file.size > MAX_SOURCE_BYTES)
          throw new Error(`${file.name}: the file is larger than 15 MB.`);
        const processed = await compressImage(file);

        let url = await uploadImageApi(processed.blob, processed.name);
        if (!url) {
          // No upload endpoint on the server: keep the compressed image inline
          url = processed.dataUrl;
          setInlineImages(true);
        }
        const finalUrl = url;
        setForm((prev) =>
          prev.images.length < MAX_IMAGES
            ? { ...prev, images: [...prev.images, finalUrl] }
            : prev,
        );
        setDirty(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        setUploadMessages((prev) => [...prev, message]);
      } finally {
        setUploading((c) => c - 1);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const makeMainImage = (index: number) => {
    if (index === 0) return;
    const next = [...form.images];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    patch({ images: next });
  };

  const removeImage = (index: number) =>
    patch({ images: form.images.filter((_, i) => i !== index) });

  /* ---------- features ---------- */
  const addFeature = () => {
    const text = newFeature.trim();
    if (!text) return;
    if (form.features.length >= MAX_FEATURES) {
      showFlash(`You can add up to ${MAX_FEATURES} features.`);
      return;
    }
    if (form.features.some((f) => norm(f) === norm(text))) {
      showFlash("This feature is already added.");
      return;
    }
    patch({ features: [...form.features, text] });
    setNewFeature("");
  };

  /* ---------- specifications ---------- */
  const addSpec = () => {
    const key = specKey.trim();
    const value = specValue.trim();
    if (!key || !value) {
      showFlash("Enter both the specification name and its value.");
      return;
    }
    if (/[.$]/.test(key)) {
      showFlash('The specification name cannot contain "." or "$".');
      return;
    }
    const existing = form.specs.findIndex((s) => norm(s.key) === norm(key));
    const next = [...form.specs];
    if (existing >= 0) next[existing] = { key, value };
    else next.push({ key, value });
    patch({ specs: next });
    setSpecKey("");
    setSpecValue("");
  };

  /* ---------- colors / sizes / models ---------- */
  const addColor = () => {
    const name = colorName.trim();
    if (!name) {
      showFlash("Enter a color name, for example Emerald Green.");
      return;
    }
    if (form.colors.some((c) => norm(c.name) === norm(name))) {
      showFlash(`"${name}" is already added.`);
      return;
    }
    patch({ colors: [...form.colors, { name, hex: colorHex }] });
    setColorName("");
  };

  const addSize = (custom?: string) => {
    const size = (custom ?? sizeInput).trim();
    if (!size) {
      showFlash("Enter a size, for example M, L or XL.");
      return;
    }
    if (form.sizes.includes(size)) {
      showFlash(`Size "${size}" is already added.`);
      return;
    }
    patch({ sizes: [...form.sizes, size] });
    if (custom === undefined) setSizeInput("");
  };

  const addModel = () => {
    const model = modelInput.trim();
    if (!model) return;
    if (!form.models.includes(model)) {
      patch({ models: [...form.models, model], model: form.model || model });
    }
    setModelInput("");
  };

  const removeModel = (model: string) => {
    const remaining = form.models.filter((m) => m !== model);
    patch({
      models: remaining,
      model: form.model === model ? remaining[0] || "" : form.model,
    });
  };

  /* ---------- validation ---------- */
  const validate = (): boolean => {
    const next: Errors = {};
    const price = parseNum(form.price);
    const original = parseNum(form.originalPrice);
    const promo = parseNum(form.promotionalPrice);
    const cost = parseNum(form.costPrice);
    const stock = parseNum(form.stockQty);
    const low = parseNum(form.lowStockThreshold);
    const priceOk = price !== undefined && !Number.isNaN(price) && price > 0;

    if (form.name.trim().length < 2) next.name = "Enter the product name.";
    if (!form.category) next.category = "Choose a category.";
    if (!priceOk) next.price = "Enter a selling price above 0.";

    if (original !== undefined) {
      if (Number.isNaN(original) || original <= 0)
        next.originalPrice = "Enter a valid price.";
      else if (priceOk && original < (price as number))
        next.originalPrice =
          "Regular price should be higher than the selling price, or leave it empty.";
    }
    if (promo !== undefined) {
      if (Number.isNaN(promo) || promo <= 0)
        next.promotionalPrice = "Enter a valid price.";
      else if (priceOk && promo >= (price as number))
        next.promotionalPrice =
          "Offer price must be lower than the selling price.";
    }
    if (cost !== undefined && (Number.isNaN(cost) || cost < 0))
      next.costPrice = "Enter a valid cost.";

    if (stock === undefined)
      next.stockQty = "Enter the stock quantity (0 if none).";
    else if (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock))
      next.stockQty = "Stock must be a whole number, 0 or more.";

    if (
      low !== undefined &&
      (Number.isNaN(low) || low < 0 || !Number.isInteger(low))
    )
      next.lowStockThreshold = "Enter a whole number, 0 or more.";

    const sku = norm(form.sku);
    if (
      sku &&
      existingProducts.some((p) => p.id !== product?.id && norm(p.sku) === sku)
    )
      next.sku = "Another product already uses this SKU.";

    if (form.images.length === 0)
      next.images = "Add at least one product photo.";

    setErrors(next);
    const firstKey = ERROR_ORDER.find((k) => next[k]);
    if (firstKey) {
      const el = document.getElementById(`pf-${firstKey}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
      return false;
    }
    return true;
  };

  /* ---------- submit ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploading > 0) return;
    setSaveError("");
    if (!validate()) return;

    const price = parseNum(form.price) as number;
    const original = parseNum(form.originalPrice);
    const promo = parseNum(form.promotionalPrice);
    const cost = parseNum(form.costPrice);
    const stockQty = parseNum(form.stockQty) as number;
    const lowStockThreshold = parseNum(form.lowStockThreshold) ?? 10;

    const optNum = (v: number | undefined) =>
      v !== undefined ? v : isEdit ? CLEAR : undefined;
    const optStr = (v: string) =>
      v.trim() ? v.trim() : isEdit ? "" : undefined;

    let discountBadge: string | undefined;
    if (promo && promo < price) {
      const base = original || price;
      const pct = Math.round(((base - promo) / base) * 100);
      discountBadge = pct > 0 ? `Offer ${pct}% Off` : "Special Offer";
    } else if (original && original > price) {
      discountBadge = `Save ${Math.round(((original - price) / original) * 100)}%`;
    }

    const selectedOption = categoryOptions.find(
      (o) => o.value === form.category,
    );
    const categoryBn =
      product && product.category === form.category && product.categoryBn
        ? product.categoryBn
        : selectedOption?.bn || form.category;

    const models = form.models;
    const model = form.model.trim() || models[0] || "";

    const specifications: Record<string, string> = {};
    form.specs.forEach((s) => {
      specifications[s.key] = s.value;
    });

    const payload: Product = {
      ...(product ?? ({} as Product)),
      id: product?.id ?? `prod-${Date.now()}`,
      name: form.name.trim(),
      nameEn: optStr(form.nameEn),
      sku:
        form.sku.trim() ||
        product?.sku ||
        `SKU-${Date.now().toString(36).toUpperCase()}`,
      category: form.category,
      categoryBn,
      price,
      originalPrice: optNum(original),
      promotionalPrice: optNum(promo),
      costPrice: optNum(cost),
      discountBadge: discountBadge ?? (isEdit ? "" : undefined),
      image: form.images[0],
      images: form.images.length > 1 ? form.images : [],
      stockQty,
      lowStockThreshold,
      // A product with 0 stock can never be "available"
      inStock: form.inStock && stockQty > 0,
      isPopular: form.isPopular,
      isFeatured: form.isFeatured,
      description: form.description.trim(),
      detailedDescription: form.detailedDescription.trim(),
      features: form.features,
      specifications,
      deliveryTime: optStr(form.deliveryTime),
      materialOrOrigin: optStr(form.materialOrOrigin),
      model: model || (isEdit ? "" : undefined),
      models,
      hasColors: form.hasColors,
      colors: form.colors,
      colorVariants: form.colors,
      hasSizes: form.hasSizes,
      sizes: form.sizes,
      pdpSectionVisibility: form.pdp,
    };

    setSaving(true);
    try {
      const saved = await onSubmit(payload);
      if (saved) {
        onClose();
        return;
      }
      setSaveError(
        "The product could not be saved. Your changes are still here, please try again.",
      );
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "The product could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- derived ---------- */
  const priceNum = parseNum(form.price);
  const costNum = parseNum(form.costPrice);
  const showProfit =
    costNum !== undefined &&
    priceNum !== undefined &&
    !Number.isNaN(costNum) &&
    !Number.isNaN(priceNum) &&
    costNum > 0;
  const stockNum = parseNum(form.stockQty);
  const stockIsZero = stockNum === 0;

  /* ---------- render ---------- */
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-6"
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[96dvh] sm:max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 bg-[#00503a] text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="product-form-title"
              className="font-bold text-lg font-montserrat truncate"
            >
              {isEdit ? "Edit Product" : "Add New Product"}
            </h3>
            <p className="text-xs text-emerald-200 truncate">
              Fill in as much as you can. Customers see all of it on the product
              page.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="w-10 h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          id="product-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto overscroll-contain bg-[#f8f9fa] p-3 sm:p-5 space-y-4"
        >
          {/* 1. Basic info */}
          <Section title="Basic information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id="pf-name"
                label="Product name"
                required
                error={errors.name}
              >
                <input
                  id="pf-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    patch({ name: e.target.value });
                    clearError("name");
                  }}
                  placeholder="e.g. Traditional Jamdani Saree"
                  className={inputCls(Boolean(errors.name))}
                />
              </Field>
              <Field
                id="pf-nameEn"
                label="English name"
                hint="Shown under the name and used for search."
              >
                <input
                  id="pf-nameEn"
                  type="text"
                  value={form.nameEn}
                  onChange={(e) => patch({ nameEn: e.target.value })}
                  placeholder="e.g. Jamdani Saree"
                  className={inputCls()}
                />
              </Field>
              <Field
                id="pf-category"
                label="Category"
                required
                error={errors.category}
              >
                <select
                  id="pf-category"
                  value={form.category}
                  onChange={(e) => {
                    patch({ category: e.target.value });
                    clearError("category");
                  }}
                  className={`${inputCls(Boolean(errors.category))} cursor-pointer`}
                >
                  {categoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="pf-sku"
                label="SKU code"
                error={errors.sku}
                hint="Leave empty to generate one automatically."
              >
                <input
                  id="pf-sku"
                  type="text"
                  value={form.sku}
                  onChange={(e) => {
                    patch({ sku: e.target.value });
                    clearError("sku");
                  }}
                  placeholder="e.g. JS-1002"
                  className={`${inputCls(Boolean(errors.sku))} font-mono`}
                />
              </Field>
            </div>
          </Section>

          {/* 2. Price and stock */}
          <Section title="Price and stock">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id="pf-price"
                label="Selling price (tk)"
                required
                error={errors.price}
                hint="The price customers pay."
              >
                <input
                  id="pf-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.price}
                  onChange={(e) => {
                    patch({ price: e.target.value });
                    clearError("price");
                  }}
                  placeholder="3800"
                  className={`${inputCls(Boolean(errors.price))} font-bold`}
                />
              </Field>
              <Field
                id="pf-originalPrice"
                label="Regular price (tk)"
                error={errors.originalPrice}
                hint="Higher than the selling price shows a discount badge."
              >
                <input
                  id="pf-originalPrice"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.originalPrice}
                  onChange={(e) => {
                    patch({ originalPrice: e.target.value });
                    clearError("originalPrice");
                  }}
                  placeholder="4800"
                  className={inputCls(Boolean(errors.originalPrice))}
                />
              </Field>
              <Field
                id="pf-costPrice"
                label="Cost price (tk)"
                error={errors.costPrice}
                hint="Only you see this. Used for profit reports."
              >
                <input
                  id="pf-costPrice"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.costPrice}
                  onChange={(e) => {
                    patch({ costPrice: e.target.value });
                    clearError("costPrice");
                  }}
                  placeholder="2800"
                  className={inputCls(Boolean(errors.costPrice))}
                />
                {showProfit && (
                  <p
                    className={`text-[11px] font-bold mt-1 ${
                      (priceNum as number) - (costNum as number) >= 0
                        ? "text-[#00503a]"
                        : "text-[#bb0027]"
                    }`}
                  >
                    লাভ: ৳
                    {(
                      (priceNum as number) - (costNum as number)
                    ).toLocaleString("en-BD")}{" "}
                    (
                    {(
                      (((priceNum as number) - (costNum as number)) /
                        (costNum as number)) *
                      100
                    ).toFixed(1)}
                    %)
                  </p>
                )}
              </Field>
              <Field
                id="pf-promotionalPrice"
                label="Offer price (tk)"
                error={errors.promotionalPrice}
                hint="Record only: customers still pay the selling price."
              >
                <input
                  id="pf-promotionalPrice"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.promotionalPrice}
                  onChange={(e) => {
                    patch({ promotionalPrice: e.target.value });
                    clearError("promotionalPrice");
                  }}
                  placeholder="3500"
                  className={inputCls(Boolean(errors.promotionalPrice))}
                />
              </Field>
              <Field
                id="pf-stockQty"
                label="Stock quantity"
                required
                error={errors.stockQty}
              >
                <input
                  id="pf-stockQty"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={form.stockQty}
                  onChange={(e) => {
                    patch({ stockQty: e.target.value });
                    clearError("stockQty");
                  }}
                  placeholder="10"
                  className={`${inputCls(Boolean(errors.stockQty))} font-bold`}
                />
              </Field>
              <Field
                id="pf-lowStockThreshold"
                label="Low stock alert at"
                error={errors.lowStockThreshold}
                hint="You get a warning when stock drops to this number."
              >
                <input
                  id="pf-lowStockThreshold"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={form.lowStockThreshold}
                  onChange={(e) => {
                    patch({ lowStockThreshold: e.target.value });
                    clearError("lowStockThreshold");
                  }}
                  className={inputCls(Boolean(errors.lowStockThreshold))}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">
                  Available for sale
                </p>
                <p className="text-xs text-gray-500">
                  {stockIsZero
                    ? "Stock is 0, so this product shows as Out of Stock."
                    : "Turn off to hide the buy buttons without changing stock."}
                </p>
              </div>
              <Switch
                checked={form.inStock}
                onChange={(v) => patch({ inStock: v })}
                label="Available for sale"
              />
            </div>
          </Section>

          {/* 3. Photos */}
          <Section
            title="Photos"
            hint={`The first photo is the main one. Up to ${MAX_IMAGES} photos, resized automatically.`}
          >
            <div id="pf-images" tabIndex={-1} className="outline-none">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {form.images.map((src, index) => (
                  <div
                    key={`${index}-${src.slice(-24)}`}
                    className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100 group"
                  >
                    <img
                      src={src}
                      alt={`Product photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    {index === 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-[#00503a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Main
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                      {index !== 0 ? (
                        <button
                          type="button"
                          onClick={() => makeMainImage(index)}
                          aria-label="Make this the main photo"
                          title="Make main"
                          className="w-8 h-8 rounded-lg bg-white/90 text-amber-600 flex items-center justify-center cursor-pointer"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        aria-label="Remove photo"
                        title="Remove"
                        className="w-8 h-8 rounded-lg bg-white/90 text-red-600 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {Array.from({ length: uploading }).map((_, i) => (
                  <div
                    key={`uploading-${i}`}
                    className="aspect-square rounded-xl border border-dashed border-gray-300 bg-white flex items-center justify-center"
                  >
                    <Loader2 className="w-6 h-6 text-[#00503a] animate-spin" />
                  </div>
                ))}

                {form.images.length + uploading < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#00503a] hover:bg-emerald-50/50 bg-white flex flex-col items-center justify-center gap-1.5 text-gray-500 hover:text-[#00503a] transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-6 h-6" />
                    <span className="text-xs font-bold">Add photos</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {errors.images && (
              <p role="alert" className="text-xs font-semibold text-red-600">
                {errors.images}
              </p>
            )}
            {uploadMessages.map((m, i) => (
              <p
                key={i}
                className="text-xs font-semibold text-red-600 flex items-start gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{m}</span>
              </p>
            ))}
            {inlineImages && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                The server has no image upload route yet, so photos are saved
                inside the product record (already compressed). Add the upload
                route before going live.
              </p>
            )}
          </Section>

          {/* 4. Descriptions */}
          <Section title="Descriptions and delivery">
            <Field
              id="pf-description"
              label="Short description"
              hint="One or two lines that sum up the product."
            >
              <textarea
                id="pf-description"
                rows={2}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="e.g. Original Nike shoes, 1:1 first copy"
                className={textareaCls}
              />
            </Field>
            <Field
              id="pf-detailedDescription"
              label="Full description"
              hint="Shown on the product page. Line breaks are kept."
            >
              <textarea
                id="pf-detailedDescription"
                rows={6}
                value={form.detailedDescription}
                onChange={(e) => patch({ detailedDescription: e.target.value })}
                placeholder="Material, fit, care instructions, what is in the box..."
                className={textareaCls}
              />
              <p className="text-right text-[11px] text-gray-400 mt-1">
                {form.detailedDescription.length} characters
              </p>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id="pf-deliveryTime"
                label="Delivery time"
                hint="e.g. 2-3 working days"
              >
                <input
                  id="pf-deliveryTime"
                  type="text"
                  value={form.deliveryTime}
                  onChange={(e) => patch({ deliveryTime: e.target.value })}
                  placeholder="Delivery in 2-3 days"
                  className={inputCls()}
                />
              </Field>
              <Field
                id="pf-materialOrOrigin"
                label="Material / origin"
                hint="e.g. Pure cotton, Made in Rajshahi"
              >
                <input
                  id="pf-materialOrOrigin"
                  type="text"
                  value={form.materialOrOrigin}
                  onChange={(e) => patch({ materialOrOrigin: e.target.value })}
                  placeholder="e.g. Genuine leather"
                  className={inputCls()}
                />
              </Field>
            </div>
          </Section>

          {/* 5. Features */}
          <Section
            title="Key features"
            hint="Short selling points. They appear as a tick list on the product page."
          >
            {form.features.length > 0 && (
              <ul className="space-y-2">
                {form.features.map((f, i) => (
                  <li
                    key={`${f}-${i}`}
                    className="flex items-start gap-2.5 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#00503a] mt-0.5 shrink-0" />
                    <span className="flex-1 text-sm text-gray-800 break-words">
                      {f}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          features: form.features.filter((_, idx) => idx !== i),
                        })
                      }
                      aria-label={`Remove feature ${f}`}
                      className="w-7 h-7 -my-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
                placeholder="e.g. Breathable mesh upper"
                aria-label="New feature"
                className={inputCls()}
              />
              <button
                type="button"
                onClick={addFeature}
                className="h-11 px-4 shrink-0 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </Section>

          {/* 6. Specifications */}
          <Section
            title="Specifications"
            hint="Name and value pairs, shown as a table on the product page."
          >
            {form.specs.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {form.specs.map((s, i) => (
                  <div
                    key={`${s.key}-${i}`}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-sm odd:bg-gray-50"
                  >
                    <span className="w-2/5 text-gray-500 break-words">
                      {s.key}
                    </span>
                    <span className="flex-1 font-semibold text-gray-800 break-words">
                      {s.value}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        patch({
                          specs: form.specs.filter((_, idx) => idx !== i),
                        })
                      }
                      aria-label={`Remove ${s.key}`}
                      className="w-7 h-7 shrink-0 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="text"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                placeholder="Name (e.g. Weight)"
                aria-label="Specification name"
                className={inputCls()}
              />
              <input
                type="text"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpec();
                  }
                }}
                placeholder="Value (e.g. 450 g)"
                aria-label="Specification value"
                className={inputCls()}
              />
              <button
                type="button"
                onClick={addSpec}
                className="h-11 px-4 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </Section>

          {/* 7. Variants */}
          <Section
            title="Options customers can choose"
            hint="Optional. Leave empty if the product has no color, size or model choice."
          >
            {/* Colors */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Palette className="w-4 h-4 text-[#00503a] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">Colors</p>
                    <p className="text-[11px] text-gray-500">
                      {form.colors.length} added
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.hasColors}
                  onChange={(v) => patch({ hasColors: v })}
                  label="Show colors"
                />
              </div>

              {form.hasColors && (
                <>
                  {form.colors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.colors.map((c, i) => (
                        <span
                          key={`${c.name}-${i}`}
                          className="inline-flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-xl text-xs font-bold bg-white border border-gray-200"
                        >
                          <span
                            style={{ backgroundColor: c.hex }}
                            className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0"
                          />
                          {c.name}
                          <button
                            type="button"
                            onClick={() =>
                              patch({
                                colors: form.colors.filter(
                                  (_, idx) => idx !== i,
                                ),
                              })
                            }
                            aria-label={`Remove ${c.name}`}
                            className="w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-[3rem_1fr_auto] gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      aria-label="Pick a color"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addColor();
                        }
                      }}
                      placeholder="Color name"
                      aria-label="Color name"
                      className={inputCls()}
                    />
                    <button
                      type="button"
                      onClick={addColor}
                      className="h-11 px-4 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">
                      Presets
                    </span>
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setColorName(preset.name);
                          setColorHex(preset.hex);
                        }}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-medium bg-white border border-gray-200 hover:border-[#00503a] cursor-pointer text-gray-700"
                      >
                        <span
                          style={{ backgroundColor: preset.hex }}
                          className="w-2.5 h-2.5 rounded-full border border-gray-300"
                        />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sizes */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Ruler className="w-4 h-4 text-[#00503a] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">Sizes</p>
                    <p className="text-[11px] text-gray-500">
                      {form.sizes.length} added
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.hasSizes}
                  onChange={(v) => patch({ hasSizes: v })}
                  label="Show sizes"
                />
              </div>

              {form.hasSizes && (
                <>
                  {form.sizes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.sizes.map((s, i) => (
                        <span
                          key={`${s}-${i}`}
                          className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-xl text-xs font-bold bg-white border border-gray-200"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              patch({
                                sizes: form.sizes.filter((_, idx) => idx !== i),
                              })
                            }
                            aria-label={`Remove size ${s}`}
                            className="w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSize();
                        }
                      }}
                      placeholder="e.g. XXL, 38, 40"
                      aria-label="New size"
                      className={inputCls()}
                    />
                    <button
                      type="button"
                      onClick={() => addSize()}
                      className="h-11 px-4 shrink-0 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">
                      Quick add
                    </span>
                    {PRESET_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => addSize(size)}
                        className="h-8 px-2.5 rounded-lg text-[11px] font-medium bg-white border border-gray-200 hover:border-[#00503a] cursor-pointer text-gray-700"
                      >
                        +{size}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Models */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00503a] shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Models / editions
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Tap a model to make it the default (★). Customers choose
                    when there are 2 or more.
                  </p>
                </div>
              </div>
              {form.models.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.models.map((m) => (
                    <span
                      key={m}
                      className={`inline-flex items-center gap-1 pl-1 pr-1 py-1 rounded-xl text-xs font-semibold border ${
                        form.model === m
                          ? "bg-[#00503a] text-white border-[#00503a]"
                          : "bg-white text-gray-800 border-gray-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => patch({ model: m })}
                        className="h-7 px-2 cursor-pointer"
                        title="Set as default"
                      >
                        {m} {form.model === m && "★"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeModel(m)}
                        aria-label={`Remove model ${m}`}
                        className="w-7 h-7 rounded-md hover:bg-black/10 flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addModel();
                    }
                  }}
                  placeholder="e.g. 64GB, Special Edition"
                  aria-label="New model"
                  className={inputCls()}
                />
                <button
                  type="button"
                  onClick={addModel}
                  className="h-11 px-4 shrink-0 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>
            </div>
          </Section>

          {/* 8. Display options */}
          <Section title="Display options">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 cursor-pointer">
                <span className="text-sm font-semibold text-gray-800">
                  Popular badge
                </span>
                <Switch
                  checked={form.isPopular}
                  onChange={(v) => patch({ isPopular: v })}
                  label="Popular"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 cursor-pointer">
                <span className="text-sm font-semibold text-gray-800">
                  Featured on home page
                </span>
                <Switch
                  checked={form.isFeatured}
                  onChange={(v) => patch({ isFeatured: v })}
                  label="Featured"
                />
              </label>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Product page sections
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    ["description", "Description and features"],
                    ["specifications", "Specifications"],
                    ["relatedProducts", "Related products"],
                    ["recentlyViewed", "Recently viewed"],
                  ] as [keyof PdpVisibility, string][]
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.pdp[key]}
                      onChange={(e) =>
                        patch({ pdp: { ...form.pdp, [key]: e.target.checked } })
                      }
                      className="w-4 h-4 accent-[#00503a]"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </Section>
        </form>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-gray-200 px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2.5">
          {(saveError || flash) && (
            <div
              role="alert"
              className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 flex items-start gap-2 ${
                saveError
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-amber-50 border border-amber-200 text-amber-800"
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{saveError || flash}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="h-12 px-5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 text-sm font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={saving || uploading > 0}
              className="h-12 px-6 rounded-xl bg-[#00503a] hover:bg-[#003828] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer min-w-[140px] justify-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : uploading > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEdit ? "Save Changes" : "Add Product"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
