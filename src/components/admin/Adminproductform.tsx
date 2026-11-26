import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Product,
  CategoryItem,
  ColorVariant,
  ProductVariant,
  ProductVariantAttribute,
} from "../../types";

import {
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  UploadCloud,
  Loader2,
  Palette,
  Ruler,
  Layers,
  CheckCircle2,
  Video,
  MoveUp,
  MoveDown,
  Link as LinkIcon,
} from "lucide-react";
import { compressImage } from "@/src/utils/Image";
import { uploadProductMediaApi } from "@/src/utils/uploadImage";
import { scrollElementIntoView } from "../../utils/scroll";

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
const MAX_VIDEOS = 5;
const MAX_VARIANTS = 200;
const MAX_FEATURES = 12;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

// Used to clear a field on update (JSON `null` makes the server unset it)
const CLEAR = null as unknown as undefined;

/* ------------------------------------------------------------------ */
/* form state                                                          */
/* ------------------------------------------------------------------ */

interface SpecRow {
  key: string;
  value: string;
}

interface VariantDraft {
  key: string;
  attributes: Record<string, string>;
  regularPrice: string;
  salePrice: string;
  stockQty: string;
  sku: string;
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
  brand: string;
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
  videos: string[];
  variantAttributes: ProductVariantAttribute[];
  variants: VariantDraft[];
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
  | "images"
  | "variants";

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
  "variants",
];

const emptyState = (): FormState => ({
  name: "",
  nameEn: "",
  brand: "",
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
  videos: [],
  variantAttributes: [],
  variants: [],
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
    brand: p.brand || "",
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
    videos: p.videos ? [...p.videos] : [],
    variantAttributes: p.variantAttributes
      ? p.variantAttributes.map((attribute) => ({
          name: attribute.name,
          values: [...attribute.values],
        }))
      : [],
    variants: p.variants
      ? p.variants.map((variant) => ({
          ...variant,
          regularPrice: String(variant.regularPrice),
          salePrice: variant.salePrice === undefined ? "" : String(variant.salePrice),
          stockQty: String(variant.stockQty),
          sku: variant.sku || "",
        }))
      : [],
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

const makeVariantKey = (attributes: Record<string, string>) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(attributes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  );

const getYoutubeEmbedUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    }
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) {
      return null;
    }
    const id =
      url.searchParams.get("v") ||
      url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
};

const generateVariantDrafts = (
  attributes: ProductVariantAttribute[],
  current: VariantDraft[],
  defaults: Pick<VariantDraft, "regularPrice" | "stockQty"> = {
    regularPrice: "",
    stockQty: "0",
  },
): VariantDraft[] => {
  if (!attributes.length) return [];
  const count = attributes.reduce(
    (total, attribute) => total * attribute.values.length,
    1,
  );
  if (count > MAX_VARIANTS) {
    throw new Error(`A product can have up to ${MAX_VARIANTS} combinations.`);
  }

  const existing = new Map(current.map((variant) => [variant.key, variant]));
  let combinations: Record<string, string>[] = [{}];
  for (const attribute of attributes) {
    combinations = combinations.flatMap((combination) =>
      attribute.values.map((value) => ({
        ...combination,
        [attribute.name]: value,
      })),
    );
  }

  const hasExistingCombination = combinations.some((values) =>
    existing.has(makeVariantKey(values)),
  );
  return combinations.map((values, index) => {
    const key = makeVariantKey(values);
    const previous = existing.get(key);
    return previous
      ? { ...previous, key, attributes: values }
      : {
          key,
          attributes: values,
          regularPrice: defaults.regularPrice,
          salePrice: "",
          stockQty:
            !hasExistingCombination && index === 0 ? defaults.stockQty : "0",
          sku: "",
        };
  });
};

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
  onBack: () => void;
}

export const AdminProductForm: React.FC<AdminProductFormProps> = ({
  product,
  categories,
  existingProducts,
  onSubmit,
  onBack,
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

  // draft inputs for the "add" rows
  const [newFeature, setNewFeature] = useState("");
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#007A55");
  const [sizeInput, setSizeInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [variantAttributeName, setVariantAttributeName] = useState("");
  const [variantAttributeValue, setVariantAttributeValue] = useState("");
  const [variantValueInputs, setVariantValueInputs] = useState<
    Record<string, string>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  const requestBack = () => {
    if (saving) return;
    if (dirty && !window.confirm("Discard your changes?")) return;
    onBack();
  };

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

        const finalUrl = await uploadProductMediaApi(processed.blob);
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

  const moveMedia = (media: "images" | "videos", index: number, direction: -1 | 1) => {
    const items = [...form[media]];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    patch({ [media]: items });
  };

  const removeImage = (index: number) =>
    patch({ images: form.images.filter((_, i) => i !== index) });

  const handleVideoFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const remaining = Math.max(0, MAX_VIDEOS - form.videos.length);
    const files = Array.from(fileList).slice(0, remaining);
    if (files.length < fileList.length) {
      setUploadMessages([`You can add up to ${MAX_VIDEOS} videos per product.`]);
    } else {
      setUploadMessages([]);
    }

    setUploading((count) => count + files.length);
    for (const file of files) {
      try {
        if (!file.type.startsWith("video/")) {
          throw new Error(`${file.name}: please choose a video file.`);
        }
        if (file.size > MAX_VIDEO_BYTES) {
          throw new Error(`${file.name}: videos must be 100 MB or smaller.`);
        }
        const url = await uploadProductMediaApi(file);
        setForm((previous) =>
          previous.videos.length < MAX_VIDEOS
            ? { ...previous, videos: [...previous.videos, url] }
            : previous,
        );
        setDirty(true);
      } catch (error) {
        setUploadMessages((messages) => [
          ...messages,
          error instanceof Error ? error.message : "Video upload failed.",
        ]);
      } finally {
        setUploading((count) => count - 1);
      }
    }
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const addVideoUrl = () => {
    const value = videoUrlInput.trim();
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      showFlash("Enter a valid YouTube video URL.");
      return;
    }
    const isYoutube =
      ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
        url.hostname.toLowerCase(),
      ) &&
      (url.hostname.toLowerCase() === "youtu.be" ||
        url.pathname === "/watch" ||
        url.pathname.startsWith("/embed/") ||
        url.pathname.startsWith("/shorts/"));
    if (!isYoutube) {
      showFlash("Only YouTube video URLs are supported.");
      return;
    }
    if (form.videos.length >= MAX_VIDEOS) {
      showFlash(`You can add up to ${MAX_VIDEOS} videos per product.`);
      return;
    }
    if (form.videos.some((existing) => norm(existing) === norm(value))) {
      showFlash("This video is already added.");
      return;
    }
    patch({ videos: [...form.videos, value] });
    setVideoUrlInput("");
  };

  const updateVariantAttributes = (attributes: ProductVariantAttribute[]) => {
    try {
      const defaults = {
        regularPrice: form.price,
        stockQty: form.stockQty || "0",
      };
      patch({
        variantAttributes: attributes,
        variants: generateVariantDrafts(attributes, form.variants, defaults),
      });
    } catch (error) {
      showFlash(error instanceof Error ? error.message : "Too many variants.");
    }
  };

  const addVariantAttribute = () => {
    const name = variantAttributeName.trim();
    const value = variantAttributeValue.trim();
    if (!name || !value) {
      showFlash("Enter both a variant name and its first value.");
      return;
    }
    if (/[.$]/.test(name)) {
      showFlash('Variant names cannot contain "." or "$".');
      return;
    }
    if (form.variantAttributes.some((attribute) => norm(attribute.name) === norm(name))) {
      showFlash("That variant attribute already exists.");
      return;
    }
    updateVariantAttributes([
      ...form.variantAttributes,
      { name, values: [value] },
    ]);
    setVariantAttributeName("");
    setVariantAttributeValue("");
  };

  const addVariantValue = (attributeName: string) => {
    const value = variantValueInputs[attributeName]?.trim();
    if (!value) return;
    const attributes = form.variantAttributes.map((attribute) =>
      attribute.name === attributeName &&
      !attribute.values.some((existing) => norm(existing) === norm(value))
        ? { ...attribute, values: [...attribute.values, value] }
        : attribute,
    );
    if (attributes.every((attribute, index) =>
      attribute.values.length === form.variantAttributes[index]?.values.length
    )) {
      showFlash("Enter a new value for this attribute.");
      return;
    }
    updateVariantAttributes(attributes);
    setVariantValueInputs((values) => ({ ...values, [attributeName]: "" }));
  };

  const removeVariantValue = (attributeName: string, value: string) => {
    const attributes = form.variantAttributes
      .map((attribute) =>
        attribute.name === attributeName
          ? {
              ...attribute,
              values: attribute.values.filter((item) => item !== value),
            }
          : attribute,
      )
      .filter((attribute) => attribute.values.length > 0);
    updateVariantAttributes(attributes);
  };

  const updateVariant = (key: string, changes: Partial<VariantDraft>) =>
    patch({
      variants: form.variants.map((variant) =>
        variant.key === key ? { ...variant, ...changes } : variant,
      ),
    });

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
    const hasCustomVariants = form.variantAttributes.length > 0;
    const priceOk = price !== undefined && !Number.isNaN(price) && price > 0;

    if (form.name.trim().length < 2) next.name = "Enter the product name.";
    if (!form.category) next.category = "Choose a category.";
    if (!hasCustomVariants && !priceOk)
      next.price = "Enter a selling price above 0.";

    if (!hasCustomVariants && original !== undefined) {
      if (Number.isNaN(original) || original <= 0)
        next.originalPrice = "Enter a valid price.";
      else if (priceOk && original < (price as number))
        next.originalPrice =
          "Regular price should be higher than the selling price, or leave it empty.";
    }
    if (!hasCustomVariants && promo !== undefined) {
      if (Number.isNaN(promo) || promo <= 0)
        next.promotionalPrice = "Enter a valid price.";
      else if (priceOk && promo >= (price as number))
        next.promotionalPrice =
          "Offer price must be lower than the selling price.";
    }
    if (cost !== undefined && (Number.isNaN(cost) || cost < 0))
      next.costPrice = "Enter a valid cost.";

    if (!hasCustomVariants && stock === undefined)
      next.stockQty = "Enter the stock quantity (0 if none).";
    else if (
      !hasCustomVariants &&
      (Number.isNaN(stock) || (stock as number) < 0 || !Number.isInteger(stock))
    )
      next.stockQty = "Stock must be a whole number, 0 or more.";

    if (
      low !== undefined &&
      (Number.isNaN(low) || low < 0 || !Number.isInteger(low))
    )
      next.lowStockThreshold = "Enter a whole number, 0 or more.";

    const sku = norm(form.sku);
    if (
      sku &&
      existingProducts.some(
        (p) =>
          p.id !== product?.id &&
          (norm(p.sku) === sku ||
            p.variants?.some((variant) => norm(variant.sku) === sku)),
      )
    ) {
      next.sku = "Another product already uses this SKU.";
    }

    if (form.images.length === 0)
      next.images = "Add at least one product photo.";

    const attributeNames = new Set<string>();
    for (const attribute of form.variantAttributes) {
      const name = norm(attribute.name);
      if (!name || attributeNames.has(name)) {
        next.variants = "Variant attribute names must be unique.";
      }
      attributeNames.add(name);
      if (
        attribute.values.length === 0 ||
        new Set(attribute.values.map(norm)).size !== attribute.values.length
      ) {
        next.variants = "Each variant attribute needs unique values.";
      }
    }
    const variantSkus = new Set([norm(form.sku)].filter(Boolean));
    for (const variant of form.variants) {
      const regular = parseNum(variant.regularPrice);
      const sale = parseNum(variant.salePrice);
      const qty = parseNum(variant.stockQty);
      if (regular === undefined || !Number.isFinite(regular) || regular <= 0) {
        next.variants = "Enter a regular price above 0 for every combination.";
      } else if (sale !== undefined && (!Number.isFinite(sale) || sale <= 0 || sale >= regular)) {
        next.variants = "Sale price must be above 0 and lower than regular price.";
      }
      if (qty === undefined || !Number.isInteger(qty) || qty < 0) {
        next.variants = "Enter a whole stock quantity (0 or more) for every combination.";
      }
      const variantSku = norm(variant.sku);
      if (!variantSku) continue;
      if (
        variantSkus.has(variantSku) ||
        existingProducts.some(
          (p) =>
            p.id !== product?.id &&
            (norm(p.sku) === variantSku ||
              p.variants?.some((existing) => norm(existing.sku) === variantSku)),
        )
      ) {
        next.variants = "Each variant SKU must be unique.";
      }
      variantSkus.add(variantSku);
    }

    setErrors(next);
    const firstKey = ERROR_ORDER.find((k) => next[k]);
    if (firstKey) {
      const el = document.getElementById(`pf-${firstKey}`);
      scrollElementIntoView(el, { block: "center" });
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

    const enteredPrice = parseNum(form.price) as number;
    const original = parseNum(form.originalPrice);
    const promo = parseNum(form.promotionalPrice);
    const cost = parseNum(form.costPrice);
    const enteredStockQty = parseNum(form.stockQty) as number;
    const lowStockThreshold = parseNum(form.lowStockThreshold) ?? 10;
    const variants: ProductVariant[] = form.variants.map((variant) => ({
      key: variant.key,
      attributes: variant.attributes,
      regularPrice: parseNum(variant.regularPrice) as number,
      salePrice: parseNum(variant.salePrice),
      stockQty: parseNum(variant.stockQty) as number,
      sku: variant.sku.trim() || undefined,
    }));
    const price = variants.length
      ? Math.min(...variants.map((variant) => variant.salePrice ?? variant.regularPrice))
      : enteredPrice;
    const originalPrice = variants.length
      ? Math.min(...variants.map((variant) => variant.regularPrice))
      : original;
    const stockQty = variants.length
      ? variants.reduce((total, variant) => total + variant.stockQty, 0)
      : enteredStockQty;

    const optNum = (v: number | undefined) =>
      v !== undefined ? v : isEdit ? CLEAR : undefined;
    const optStr = (v: string) =>
      v.trim() ? v.trim() : isEdit ? "" : undefined;

    let discountBadge: string | undefined;
    const effectivePromo = variants.length ? undefined : promo;
    if (effectivePromo && effectivePromo < price) {
      const base = originalPrice || price;
      const pct = Math.round(((base - effectivePromo) / base) * 100);
      discountBadge = pct > 0 ? `Offer ${pct}% Off` : "Special Offer";
    } else if (originalPrice && originalPrice > price) {
      discountBadge = `Save ${Math.round(((originalPrice - price) / originalPrice) * 100)}%`;
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
      brand: optStr(form.brand) ?? (isEdit ? null : undefined),
      sku: form.sku.trim() || (isEdit ? product?.sku : undefined),
      category: form.category,
      categoryBn,
      price,
      originalPrice: optNum(originalPrice > price ? originalPrice : undefined),
      promotionalPrice: optNum(effectivePromo),
      costPrice: optNum(cost),
      discountBadge: discountBadge ?? (isEdit ? "" : undefined),
      image: form.images[0],
      images: form.images.length > 1 ? form.images : [],
      videos: form.videos,
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
      variantAttributes: form.variantAttributes,
      variants,
      pdpSectionVisibility: form.pdp,
    };

    setSaving(true);
    try {
      const saved = await onSubmit(payload);
      if (saved) {
        onBack();
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
  const stockNum = form.variantAttributes.length
    ? form.variants.reduce(
        (total, variant) => total + (parseNum(variant.stockQty) ?? 0),
        0,
      )
    : parseNum(form.stockQty);
  const stockIsZero = stockNum === 0;

  /* ---------- render ---------- */
  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Page Header */}
        <div className="bg-[#00503a] text-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            onClick={requestBack}
            className="min-h-11 w-full sm:w-auto shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center gap-2 px-4 cursor-pointer text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </button>
        </div>

        {/* Body */}
        <form
          id="product-form"
          onSubmit={handleSubmit}
          noValidate
          className="bg-[#f8f9fa] p-3 sm:p-5 lg:p-6 space-y-4"
        >
          {/* 1. Basic info */}
          <Section title="Basic information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Field id="pf-brand" label="Brand">
                <input
                  id="pf-brand"
                  type="text"
                  maxLength={100}
                  value={form.brand}
                  onChange={(e) => patch({ brand: e.target.value })}
                  placeholder="e.g. North Star"
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
                hint={
                  isEdit
                    ? "This identifier must remain unique."
                    : "A unique SKU is generated automatically when saved."
                }
              >
                <input
                  id="pf-sku"
                  type="text"
                  value={form.sku}
                  readOnly={!isEdit}
                  onChange={(e) => {
                    patch({ sku: e.target.value });
                    clearError("sku");
                  }}
                  placeholder={isEdit ? "e.g. JS-1002" : "Generated on save"}
                  className={`${inputCls(Boolean(errors.sku))} font-mono ${!isEdit ? "bg-gray-100 text-gray-500" : ""}`}
                />
              </Field>
            </div>
          </Section>

          {/* 2. Price and stock */}
          <Section title="Price and stock">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                id="pf-price"
                label="Selling price (tk)"
                required={!form.variantAttributes.length}
                error={errors.price}
                hint={
                  form.variantAttributes.length
                    ? "Variant prices are managed in the combinations below."
                    : "The price customers pay."
                }
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
              {!form.variantAttributes.length && (
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
              )}
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
              {!form.variantAttributes.length && (
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
              )}
              <Field
                id="pf-stockQty"
                label="Stock quantity"
                required={!form.variantAttributes.length}
                error={errors.stockQty}
                hint={
                  form.variantAttributes.length
                    ? "Calculated from the stock quantities of all variants."
                    : undefined
                }
              >
                <input
                  id="pf-stockQty"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={
                    form.variantAttributes.length
                      ? String(stockNum ?? 0)
                      : form.stockQty
                  }
                  readOnly={Boolean(form.variantAttributes.length)}
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
            hint={`The first photo is the main one. Up to ${MAX_IMAGES} photos, resized and uploaded securely.`}
          >
            <div id="pf-images" tabIndex={-1} className="outline-none">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
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
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveMedia("images", index, -1)}
                          disabled={index === 0}
                          aria-label="Move photo earlier"
                          title="Move earlier"
                          className="w-9 h-9 rounded-lg bg-white/90 text-gray-700 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                        >
                          <MoveUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMedia("images", index, 1)}
                          disabled={index === form.images.length - 1}
                          aria-label="Move photo later"
                          title="Move later"
                          className="w-9 h-9 rounded-lg bg-white/90 text-gray-700 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                        >
                          <MoveDown className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        aria-label="Remove photo"
                        title="Remove"
                        className="w-10 h-10 rounded-lg bg-white/90 text-red-600 flex items-center justify-center cursor-pointer"
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
          </Section>

          {/* Product videos */}
          <Section
            title="Product videos"
            hint={`Upload up to ${MAX_VIDEOS} videos (100 MB each) or add a YouTube link.`}
          >
            {form.videos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {form.videos.map((src, index) => {
                  const embedUrl = getYoutubeEmbedUrl(src);
                  return (
                    <div
                      key={`${src}-${index}`}
                      className="rounded-xl overflow-hidden border border-gray-200 bg-white"
                    >
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          title={`Product video ${index + 1}`}
                          className="w-full aspect-video"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={src}
                          controls
                          preload="metadata"
                          className="w-full aspect-video bg-black"
                        />
                      )}
                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="text-[11px] text-gray-500 truncate">
                          {embedUrl ? "YouTube video" : "Uploaded video"}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveMedia("videos", index, -1)}
                            disabled={index === 0}
                            aria-label="Move video earlier"
                            className="w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                          >
                            <MoveUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMedia("videos", index, 1)}
                            disabled={index === form.videos.length - 1}
                            aria-label="Move video later"
                            className="w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                          >
                            <MoveDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              patch({
                                videos: form.videos.filter((_, i) => i !== index),
                              })
                            }
                            aria-label="Remove video"
                            className="w-9 h-9 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(event) => setVideoUrlInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addVideoUrl();
                    }
                  }}
                  placeholder="Paste a YouTube video URL"
                  aria-label="YouTube video URL"
                  className={`${inputCls()} pl-10`}
                />
              </div>
              <button
                type="button"
                onClick={addVideoUrl}
                className="h-11 px-4 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add YouTube
              </button>
            </div>

            {form.videos.length < MAX_VIDEOS && (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="min-h-11 w-full sm:w-auto px-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#00503a] hover:bg-emerald-50/50 text-gray-600 hover:text-[#00503a] text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                Upload video from device
              </button>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={(event) => handleVideoFiles(event.target.files)}
              className="hidden"
            />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="w-9 h-9 -my-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
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
                      className="w-9 h-9 shrink-0 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
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
            hint="Add custom attributes for combinations with their own price, SKU, and inventory. Legacy color, size, and model selectors remain available."
          >
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Custom variant attributes
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Add attributes such as Size, Color, Material, or Weight. The
                  combinations and their pricing/inventory are generated below.
                </p>
              </div>

              {form.variantAttributes.map((attribute) => (
                <div
                  key={attribute.name}
                  className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800">
                      {attribute.name}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        updateVariantAttributes(
                          form.variantAttributes.filter(
                            (item) => item.name !== attribute.name,
                          ),
                        )
                      }
                      className="min-h-9 px-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove attribute
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {attribute.values.map((value) => (
                      <span
                        key={`${attribute.name}-${value}`}
                        className="inline-flex items-center gap-1 pl-2.5 pr-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold"
                      >
                        {value}
                        <button
                          type="button"
                          onClick={() => removeVariantValue(attribute.name, value)}
                          aria-label={`Remove ${value} from ${attribute.name}`}
                          className="w-8 h-8 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input
                      type="text"
                      value={variantValueInputs[attribute.name] || ""}
                      onChange={(event) =>
                        setVariantValueInputs((values) => ({
                          ...values,
                          [attribute.name]: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addVariantValue(attribute.name);
                        }
                      }}
                      placeholder={`Add another ${attribute.name.toLowerCase()} value`}
                      aria-label={`New ${attribute.name} value`}
                      className={inputCls()}
                    />
                    <button
                      type="button"
                      onClick={() => addVariantValue(attribute.name)}
                      className="h-11 px-4 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add value
                    </button>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={variantAttributeName}
                  onChange={(event) => setVariantAttributeName(event.target.value)}
                  placeholder="Attribute name (e.g. Material)"
                  aria-label="New variant attribute name"
                  className={inputCls()}
                />
                <input
                  type="text"
                  value={variantAttributeValue}
                  onChange={(event) => setVariantAttributeValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addVariantAttribute();
                    }
                  }}
                  placeholder="First value (e.g. Cotton)"
                  aria-label="First variant attribute value"
                  className={inputCls()}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["Size", "Color", "Material", "Weight"].map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setVariantAttributeName(name)}
                    className="h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-emerald-50 hover:text-[#00503a] text-gray-600 cursor-pointer"
                  >
                    + {name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addVariantAttribute}
                  className="h-8 px-3 rounded-lg text-[11px] font-bold bg-[#00503a] hover:bg-[#003828] text-white cursor-pointer"
                >
                  Add attribute
                </button>
              </div>

              {errors.variants && (
                <p
                  id="pf-variants"
                  role="alert"
                  tabIndex={-1}
                  className="text-xs font-semibold text-red-600 outline-none"
                >
                  {errors.variants}
                </p>
              )}

              {form.variants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                    <p className="text-sm font-bold text-gray-800">
                      {form.variants.length} combination
                      {form.variants.length === 1 ? "" : "s"}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Product listing price and stock are calculated from these.
                    </p>
                  </div>
                  {form.variants.map((variant) => (
                    <div
                      key={variant.key}
                      className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-3"
                    >
                      <p className="text-xs font-bold text-[#00503a]">
                        {Object.entries(variant.attributes)
                          .map(([name, value]) => `${name}: ${value}`)
                          .join(" / ")}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <label className="text-[11px] font-semibold text-gray-600">
                          Regular price (tk) *
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={variant.regularPrice}
                            onChange={(event) =>
                              updateVariant(variant.key, {
                                regularPrice: event.target.value,
                              })
                            }
                            className={`${inputCls(Boolean(errors.variants))} mt-1`}
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-gray-600">
                          Sale price (tk)
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={variant.salePrice}
                            onChange={(event) =>
                              updateVariant(variant.key, {
                                salePrice: event.target.value,
                              })
                            }
                            className={`${inputCls(Boolean(errors.variants))} mt-1`}
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-gray-600">
                          Stock quantity *
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={variant.stockQty}
                            onChange={(event) =>
                              updateVariant(variant.key, {
                                stockQty: event.target.value,
                              })
                            }
                            className={`${inputCls(Boolean(errors.variants))} mt-1`}
                          />
                        </label>
                        <label className="text-[11px] font-semibold text-gray-600">
                          SKU (optional)
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(event) =>
                              updateVariant(variant.key, {
                                sku: event.target.value,
                              })
                            }
                            className={`${inputCls(Boolean(errors.variants))} mt-1 font-mono`}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                            className="w-9 h-9 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-2">
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
                      className={`${inputCls()} min-w-0`}
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
                            className="w-9 h-9 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
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
                        className="w-9 h-9 rounded-md hover:bg-black/10 flex items-center justify-center cursor-pointer"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
        <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4 space-y-2.5">
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
          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
            <button
              type="button"
              onClick={requestBack}
              disabled={saving}
              className="min-h-11 w-full md:w-auto px-5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 text-sm font-bold cursor-pointer"
            >
              Back to Products
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={saving || uploading > 0}
              className="min-h-11 w-full md:w-auto px-6 rounded-xl bg-[#00503a] hover:bg-[#003828] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer min-w-[140px] justify-center"
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
  );
};
