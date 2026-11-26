import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Product, ColorVariant, ReviewScreenshot } from "../types";
import { formatPrice } from "../utils/format";
import { getWhatsAppOrderLink } from "../utils/whatsapp";
import { CartItemOptions, getProductVariantKey } from "../utils/cart";
import { ProductCard } from "./ProductCard";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  X,
  Truck,
  RotateCcw,
  BadgeCheck,
  BellRing,
  CheckCircle2,
  AlertCircle,
  Check,
  Flame,
  Sparkles,
  Star,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  createCustomerReviewApi,
  fetchProductReviews,
} from "../services/api";
import { compressImage } from "../utils/Image";
import { uploadImageApi } from "../utils/uploadImage";
import { getScrollBehavior } from "../utils/scroll";
import { Skeleton } from "./Skeletons";

interface ProductDetailScreenProps {
  product: Product;
  allProducts: Product[];
  wishlist: string[];
  recentlyViewedIds: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (
    product: Product,
    quantity: number,
    options?: CartItemOptions,
  ) => void;
  onDirectOrder: (
    product: Product,
    quantity: number,
    options?: CartItemOptions,
  ) => void;
  onSelectProduct: (product: Product) => void;
  onNotifyStockRequest: (product: Product, contact: string) => void;
  canDeleteReviews: boolean;
  onDeleteReview: (reviewId: string) => Promise<unknown>;
  onReviewAdded: (review: ReviewScreenshot) => void;
  onReviewStatsChange: (
    productId: string,
    ratingAverage: number,
    reviewCount: number,
  ) => void;
  onBack: () => void;
}

const DEFAULT_VISIBILITY = {
  description: true,
  specifications: true,
  reviews: true,
  relatedProducts: true,
  recentlyViewed: true,
};

const hideScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const LONG_DESCRIPTION_CHARS = 320;

const getColorOptions = (product: Product): ColorVariant[] => {
  if (product.colorVariants && product.colorVariants.length > 0)
    return product.colorVariants;
  return (product.colors || []).map((c) =>
    typeof c === "string" ? { name: c, hex: "" } : c,
  );
};

const getYoutubeEmbedUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "youtu.be")
      return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname))
      return null;
    const id =
      url.searchParams.get("v") ||
      url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
};

const WhatsAppIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Defined outside so it keeps its state when the page re-renders
const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
    <h2 className="text-base font-bold text-gray-900 font-montserrat mb-3">
      {title}
    </h2>
    {children}
  </section>
);

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  allProducts,
  wishlist,
  recentlyViewedIds,
  onToggleWishlist,
  onAddToCart,
  onDirectOrder,
  onSelectProduct,
  onNotifyStockRequest,
  canDeleteReviews,
  onDeleteReview,
  onReviewAdded,
  onReviewStatsChange,
  onBack,
}) => {
  const visibility = {
    ...DEFAULT_VISIBILITY,
    ...(product.pdpSectionVisibility || {}),
  };
  const images = useMemo(
    () =>
      product.images && product.images.length > 0
        ? product.images
        : [product.image],
    [product],
  );
  const variantAttributes = product.variantAttributes ?? [];
  const showDynamicVariants = variantAttributes.length > 0;
  const colorOptions = useMemo(() => getColorOptions(product), [product]);
  const hasVariantAttribute = (name: string) =>
    variantAttributes.some(
      (attribute) => attribute.name.trim().toLowerCase() === name,
    );

  const showColors =
    product.hasColors !== false &&
    colorOptions.length > 0 &&
    !hasVariantAttribute("color");
  const showSizes =
    product.hasSizes !== false &&
    Boolean(product.sizes && product.sizes.length > 0) &&
    !hasVariantAttribute("size");
  const showModels =
    Boolean(product.models && product.models.length > 1) &&
    !hasVariantAttribute("model");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedVariantAttributes, setSelectedVariantAttributes] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      variantAttributes.map((attribute) => [
        attribute.name,
        attribute.values[0] || "",
      ]),
    ),
  );
  const [descExpanded, setDescExpanded] = useState(false);

  const [notifyContact, setNotifyContact] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifyError, setNotifyError] = useState("");

  const [shareFeedback, setShareFeedback] = useState("");
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [productReviews, setProductReviews] = useState<ReviewScreenshot[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewImage, setReviewImage] = useState("");
  const [reviewImageUploading, setReviewImageUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState("");

  const galleryRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const reviewRequestRef = useRef(0);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const refreshProductReviews = useCallback(async () => {
    const requestId = ++reviewRequestRef.current;
    setReviewsLoading(true);
    setReviewError("");
    try {
      const loadedReviews = await fetchProductReviews(product.id);
      if (requestId !== reviewRequestRef.current) return;
      setProductReviews(loadedReviews);
      const ratingAverage = loadedReviews.length
        ? loadedReviews.reduce((sum, review) => sum + review.rating, 0) /
          loadedReviews.length
        : 0;
      onReviewStatsChange(product.id, ratingAverage, loadedReviews.length);
    } catch (error) {
      if (requestId !== reviewRequestRef.current) return;
      setReviewError(
        error instanceof Error ? error.message : "Could not load reviews.",
      );
    } finally {
      if (requestId === reviewRequestRef.current) setReviewsLoading(false);
    }
  }, [product.id, onReviewStatsChange]);

  useEffect(() => {
    setProductReviews([]);
    setReviewerName("");
    setReviewComment("");
    setReviewRating(5);
    setReviewImage("");
    setReviewSuccess("");
    setReviewError("");
    void refreshProductReviews();
    return () => {
      reviewRequestRef.current += 1;
    };
  }, [product.id, refreshProductReviews]);

  // Reset local selection state whenever the viewed product changes
  useEffect(() => {
    setActiveImageIdx(0);
    galleryRef.current?.scrollTo({ left: 0 });
    setQuantity(1);
    setDescExpanded(false);
    setNotifySubmitted(false);
    setNotifyError("");
    setShareFeedback("");
    setSelectedColor(getColorOptions(product)[0]?.name || "");
    setSelectedModel(product.models?.[0] || product.model || "");
    setSelectedSize(product.sizes?.[0] || "");
    setSelectedVariantAttributes(
      Object.fromEntries(
        (product.variantAttributes ?? []).map((attribute) => [
          attribute.name,
          attribute.values[0] || "",
        ]),
      ),
    );
  }, [product.id]);

  const variantSelectionComplete =
    showDynamicVariants &&
    variantAttributes.every((attribute) =>
      Boolean(selectedVariantAttributes[attribute.name]),
    );
  const selectedVariant = variantSelectionComplete
    ? product.variants?.find(
        (variant) =>
          variant.key === getProductVariantKey(selectedVariantAttributes),
      )
    : undefined;
  const effectivePrice =
    selectedVariant?.salePrice ?? selectedVariant?.regularPrice ?? product.price;
  const effectiveRegularPrice =
    selectedVariant?.regularPrice ?? product.originalPrice;
  const effectiveStockQty = showDynamicVariants
    ? selectedVariant?.stockQty ?? 0
    : product.stockQty ?? 0;
  const isOutOfStock = showDynamicVariants
    ? !selectedVariant || effectiveStockQty <= 0
    : !product.inStock || (product.stockQty !== undefined && product.stockQty <= 0);
  const isWishlisted = wishlist.includes(product.id);
  const maxQty =
    showDynamicVariants
      ? effectiveStockQty
      : product.stockQty && product.stockQty > 0
        ? product.stockQty
        : 99;
  const lowStock =
    !isOutOfStock &&
    effectiveStockQty > 0 &&
    effectiveStockQty <= (product.lowStockThreshold ?? 5);

  // Sticky mobile action bar: visible whenever the main buttons are not on screen
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) {
      setShowStickyBar(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product.id, isOutOfStock]);

  // Lightbox: lock page scroll, Esc / arrow keys
  useEffect(() => {
    if (!isZoomOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsZoomOpen(false);
      if (e.key === "ArrowRight")
        setActiveImageIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft")
        setActiveImageIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isZoomOpen, images.length]);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    };
  }, []);

  const relatedProducts = useMemo(
    () =>
      visibility.relatedProducts
        ? allProducts
            .filter(
              (p) => p.category === product.category && p.id !== product.id,
            )
            .slice(0, 10)
        : [],
    [allProducts, product, visibility.relatedProducts],
  );

  const recentlyViewedProducts = useMemo(() => {
    if (!visibility.recentlyViewed) return [];
    return recentlyViewedIds
      .filter((id) => id !== product.id)
      .map((id) => allProducts.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 10);
  }, [allProducts, recentlyViewedIds, product.id, visibility.recentlyViewed]);

  /* ---------- gallery ---------- */
  const handleGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeImageIdx) setActiveImageIdx(idx);
  };

  const goToImage = (idx: number) => {
    setActiveImageIdx(idx);
    const el = galleryRef.current;
    if (el)
      el.scrollTo({
        left: idx * el.clientWidth,
        behavior: getScrollBehavior(),
      });
  };

  /* ---------- actions ---------- */
  const buildOptions = (): CartItemOptions => ({
    selectedModel: selectedModel || undefined,
    selectedSize: showSizes ? selectedSize || undefined : undefined,
    selectedColor: showColors ? selectedColor || undefined : undefined,
    selectedVariantKey: selectedVariant?.key,
    selectedVariantAttributes: selectedVariant?.attributes,
  });

  const handleAddToCartClick = () =>
    onAddToCart(product, quantity, buildOptions());
  const handleBuyNowClick = () =>
    onDirectOrder(product, quantity, buildOptions());

  const productUrl = `${window.location.origin}${window.location.pathname}?product=${product.id}`;

  const showShareFeedback = (text: string) => {
    setShareFeedback(text);
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    shareTimerRef.current = setTimeout(() => setShareFeedback(""), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: `${product.name} — ${formatPrice(effectivePrice)}`,
      url: productUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(productUrl);
      showShareFeedback("Link copied!");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return; // user closed the share sheet
      try {
        await navigator.clipboard.writeText(productUrl);
        showShareFeedback("Link copied!");
      } catch {
        showShareFeedback("Could not share");
      }
    }
  };

  const whatsappUrl = getWhatsAppOrderLink(
    `Assalamu Alaikum, I would like to know more about this product:\n${product.name} (${formatPrice(effectivePrice)})\n${productUrl}`,
  );

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = notifyContact.trim();
    if (!cleaned || cleaned.length < 5) {
      setNotifyError("Please enter a valid phone number or email.");
      return;
    }
    setNotifyError("");
    onNotifyStockRequest(product, cleaned);
    setNotifySubmitted(true);
    setNotifyContact("");
  };

  const handleReviewImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReviewImageUploading(true);
    setReviewError("");
    try {
      const processed = await compressImage(file);
      const uploadedUrl = await uploadImageApi(processed.blob, processed.name);
      setReviewImage(uploadedUrl || processed.dataUrl);
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Could not upload this image.",
      );
    } finally {
      setReviewImageUploading(false);
    }
  };

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setReviewError("");
    setReviewSuccess("");
    setReviewSubmitting(true);
    try {
      const createdReview = await createCustomerReviewApi({
        productId: product.id,
        customerName: reviewerName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim(),
        image: reviewImage || undefined,
        imageAlt: reviewImage ? `${reviewerName.trim()}'s review` : undefined,
      });
      onReviewAdded(createdReview);
      setReviewerName("");
      setReviewComment("");
      setReviewRating(5);
      setReviewImage("");
      setReviewSuccess("Thank you! Your review has been submitted.");
      await refreshProductReviews();
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Could not submit your review.",
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReviewDelete = async (review: ReviewScreenshot) => {
    if (!confirm(`Delete the review from ${review.customerName}?`)) return;
    setReviewError("");
    setDeletingReviewId(review.id);
    try {
      await onDeleteReview(review.id);
      setReviewSuccess("Review deleted.");
      await refreshProductReviews();
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Could not delete this review.",
      );
    } finally {
      setDeletingReviewId("");
    }
  };

  /* ---------- derived display data ---------- */
  const hasDiscount = Boolean(
    effectiveRegularPrice && effectiveRegularPrice > effectivePrice,
  );
  const discountPercent = hasDiscount
    ? Math.round(
        ((effectiveRegularPrice! - effectivePrice) / effectiveRegularPrice!) *
          100,
      )
    : null;
  const savings = hasDiscount ? effectiveRegularPrice! - effectivePrice : 0;

  // Quick facts: only the ones this product actually has
  const quickFacts: { label: string; value: string }[] = [];
  const categoryLabel = product.categoryBn || product.category;
  if (categoryLabel)
    quickFacts.push({ label: "Category", value: categoryLabel });
  if (selectedVariant?.sku || product.sku)
    quickFacts.push({ label: "SKU", value: selectedVariant?.sku || product.sku! });
  if (product.model && !showModels)
    quickFacts.push({ label: "Model", value: product.model });
  if (product.materialOrOrigin)
    quickFacts.push({
      label: "Material / Origin",
      value: product.materialOrOrigin,
    });

  const descriptionText = (
    product.detailedDescription ||
    product.description ||
    ""
  ).trim();
  const isLongDescription = descriptionText.length > LONG_DESCRIPTION_CHARS;
  const features = (product.features || []).filter((f) => f && f.trim());
  const specEntries = Object.entries(product.specifications || {}).filter(
    ([k, v]) => k && v,
  );
  const productRatingAverage = productReviews.length
    ? productReviews.reduce((sum, review) => sum + review.rating, 0) /
      productReviews.length
    : 0;

  const showDescription = visibility.description && descriptionText.length > 0;
  const showFeatures = visibility.description && features.length > 0;
  const showSpecs = visibility.specifications && specEntries.length > 0;

  const optionBtn = (selected: boolean) =>
    `min-w-[44px] h-10 px-3.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
      selected
        ? "bg-[#00503a] text-white border border-[#00503a]"
        : "bg-white border border-gray-200 text-gray-700 hover:border-[#00503a]"
    }`;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-6 font-bengali  lg:pb-10">
      {/* Back + category */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-3">
        <button
          onClick={onBack}
          className="h-9 -ml-1 pr-2 flex items-center gap-1 text-gray-700 hover:text-[#00503a] cursor-pointer font-semibold"
        >
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="truncate">{categoryLabel}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 lg:gap-10">
        {/* ============ Gallery (stays in view on desktop while details scroll) ============ */}
        <div className="lg:w-1/2 min-w-0 lg:sticky lg:top-28 lg:self-start">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#f8faf9] to-[#edf3f0] border border-gray-100">
            <div
              ref={galleryRef}
              onScroll={handleGalleryScroll}
              className={`flex overflow-x-auto snap-x snap-mandatory ${hideScrollbar}`}
            >
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setIsZoomOpen(true)}
                  aria-label="Zoom image"
                  className="w-full shrink-0 snap-center aspect-square block cursor-zoom-in"
                >
                  <img
                    src={img}
                    alt={product.imageAlt || product.name}
                    className={`w-full h-full object-cover ${isOutOfStock ? "grayscale opacity-80" : ""}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    draggable={false}
                  />
                </button>
              ))}
            </div>

            {(discountPercent || product.discountBadge) && (
              <span className="absolute top-3 left-3 bg-gradient-to-r from-[#e11d48] to-[#be123c] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs font-montserrat pointer-events-none">
                {discountPercent
                  ? `${discountPercent}% OFF`
                  : product.discountBadge}
              </span>
            )}

            {/* Wishlist + share, floating on the image so they are easy to reach */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button
                onClick={() => onToggleWishlist(product.id)}
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
                className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center cursor-pointer transition-colors ${
                  isWishlisted
                    ? "bg-white text-[#bb0027]"
                    : "bg-white/95 text-gray-500 hover:text-[#bb0027]"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${isWishlisted ? "fill-[#bb0027]" : ""}`}
                />
              </button>
              <button
                onClick={handleShare}
                aria-label="Share"
                className="w-10 h-10 rounded-full shadow-md bg-white/95 text-gray-500 hover:text-[#00503a] flex items-center justify-center cursor-pointer transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {shareFeedback && (
              <span
                role="status"
                className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                {shareFeedback}
              </span>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <span className="absolute bottom-3 right-3 bg-black/55 text-white text-xs font-semibold px-2.5 py-1 rounded-full font-montserrat pointer-events-none">
                {activeImageIdx + 1} / {images.length}
              </span>
            )}
          </div>

          {/* Thumbnails: tap to jump to an image */}
          {images.length > 1 && (
            <div
              className={`flex gap-2 mt-3 overflow-x-auto pb-1 ${hideScrollbar}`}
            >
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  onClick={() => goToImage(idx)}
                  aria-label={`Show image ${idx + 1}`}
                  aria-current={idx === activeImageIdx}
                  className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-colors ${
                    idx === activeImageIdx
                      ? "border-[#00503a]"
                      : "border-gray-200 opacity-80"
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          {product.videos && product.videos.length > 0 && (
            <div className="mt-4 space-y-3">
              {product.videos.map((video, index) => {
                const embedUrl = getYoutubeEmbedUrl(video);
                return embedUrl ? (
                  <iframe
                    key={`${video}-${index}`}
                    src={embedUrl}
                    title={`${product.name} video ${index + 1}`}
                    className="w-full aspect-video rounded-2xl border border-gray-100"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={`${video}-${index}`}
                    src={video}
                    controls
                    preload="metadata"
                    className="w-full aspect-video rounded-2xl bg-black"
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ============ Right column: buy box + all the details ============ */}
        <div className="lg:w-1/2 min-w-0 space-y-4">
          {/* Buy box */}
          <div>
            {(product.isPopular || product.isFeatured) && (
              <div className="flex flex-wrap gap-2 mb-2">
                {product.isPopular && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    <Flame className="w-3 h-3" /> Popular
                  </span>
                )}
                {product.isFeatured && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00503a] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" /> Featured
                  </span>
                )}
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-bengali leading-snug">
              {product.name}
            </h1>
            {product.nameEn && product.nameEn !== product.name && (
              <p className="text-sm text-gray-500 mt-0.5">{product.nameEn}</p>
            )}

            {/* Price */}
            <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1 mt-3">
              <span className="text-3xl font-extrabold text-[#bb0027] font-montserrat">
                {formatPrice(effectivePrice)}
              </span>
              {hasDiscount && effectiveRegularPrice && (
                <>
                  <span className="text-base text-gray-400 line-through font-montserrat">
                    {formatPrice(effectiveRegularPrice)}
                  </span>
                  <span className="text-xs font-bold text-[#00503a] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Save {formatPrice(savings)}
                  </span>
                </>
              )}
            </div>

            {/* Stock */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {isOutOfStock ? (
                <span className="inline-flex items-center text-xs font-bold text-white bg-gray-700 px-2.5 py-1 rounded-full">
                  Out of Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00503a] bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  In Stock
                </span>
              )}
              {lowStock && (
                <span className="text-xs font-semibold text-amber-600">
                  Only {effectiveStockQty} left, order soon
                </span>
              )}
            </div>
          </div>

          {/* Quick facts */}
          {quickFacts.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 bg-[#f8faf9] border border-gray-100 rounded-2xl p-4">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {fact.label}
                  </dt>
                  <dd className="text-sm font-semibold text-gray-800 mt-0.5 break-words">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* Options */}
          {(showColors || showModels || showSizes || showDynamicVariants) && (
            <div className="space-y-5">
              {showDynamicVariants &&
                variantAttributes.map((attribute) => (
                  <div key={attribute.name}>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {attribute.name}
                      {selectedVariantAttributes[attribute.name] && (
                        <span className="font-bold text-[#00503a]">
                          : {selectedVariantAttributes[attribute.name]}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attribute.values.map((value) => (
                        <button
                          key={`${attribute.name}-${value}`}
                          type="button"
                          onClick={() =>
                            setSelectedVariantAttributes((previous) => ({
                              ...previous,
                              [attribute.name]: value,
                            }))
                          }
                          aria-pressed={
                            selectedVariantAttributes[attribute.name] === value
                          }
                          className={optionBtn(
                            selectedVariantAttributes[attribute.name] === value,
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

              {showColors && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Color
                    {selectedColor && (
                      <span className="font-bold text-[#00503a]">
                        : {selectedColor}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {colorOptions.map((c) =>
                      c.hex ? (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColor(c.name)}
                          title={c.name}
                          aria-label={c.name}
                          aria-pressed={selectedColor === c.name}
                          className={`w-10 h-10 rounded-full cursor-pointer transition-all flex items-center justify-center ${
                            selectedColor === c.name
                              ? "ring-2 ring-offset-2 ring-[#00503a]"
                              : "ring-1 ring-gray-300"
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {selectedColor === c.name && (
                            <Check className="w-4 h-4 text-white drop-shadow" />
                          )}
                        </button>
                      ) : (
                        <button
                          key={c.name}
                          onClick={() => setSelectedColor(c.name)}
                          aria-pressed={selectedColor === c.name}
                          className={optionBtn(selectedColor === c.name)}
                        >
                          {c.name}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              {showModels && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Model
                    {selectedModel && (
                      <span className="font-bold text-[#00503a]">
                        : {selectedModel}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.models!.map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedModel(m)}
                        aria-pressed={selectedModel === m}
                        className={optionBtn(selectedModel === m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showSizes && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Size
                    {selectedSize && (
                      <span className="font-bold text-[#00503a]">
                        : {selectedSize}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes!.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        aria-pressed={selectedSize === s}
                        className={optionBtn(selectedSize === s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity + actions, or notify-me */}
          {!isOutOfStock ? (
            <div ref={ctaRef}>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-200 rounded-xl bg-white shrink-0">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="w-11 h-12 rounded-l-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-base font-bold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    aria-label="Increase quantity"
                    className="w-11 h-12 rounded-r-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCartClick}
                  className="flex-1 h-12 border-2 border-[#00503a] text-[#00503a] hover:bg-[#00503a] hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
              </div>

              {quantity > 1 && (
                <p className="text-sm text-gray-600 mt-2.5">
                  Total for {quantity}:{" "}
                  <span className="font-extrabold text-[#bb0027] font-montserrat">
                    {formatPrice(effectivePrice * quantity)}
                  </span>
                </p>
              )}

              <button
                onClick={handleBuyNowClick}
                className="w-full mt-3 h-12 bg-[#bb0027] hover:bg-[#93001f] text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all"
              >
                <Zap className="w-5 h-5" /> Buy Now
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              {!notifySubmitted ? (
                <form
                  onSubmit={handleNotifySubmit}
                  className="space-y-3"
                  noValidate
                >
                  <p className="text-sm font-semibold text-gray-700 flex items-start gap-2">
                    <BellRing className="w-4 h-4 text-[#00503a] mt-0.5 shrink-0" />
                    <span>
                      Want to know when it is back in stock? Leave your phone
                      number or email.
                    </span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={notifyContact}
                      onChange={(e) => {
                        setNotifyContact(e.target.value);
                        if (notifyError) setNotifyError("");
                      }}
                      inputMode="text"
                      autoComplete="tel"
                      placeholder="01XXXXXXXXX or email"
                      aria-invalid={Boolean(notifyError)}
                      className="flex-1 h-12 px-3.5 rounded-xl border border-gray-300 text-base sm:text-sm bg-white focus:outline-none focus:border-[#00503a] focus:ring-2 focus:ring-[#00503a]/15"
                    />
                    <button
                      type="submit"
                      className="h-12 px-6 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold cursor-pointer whitespace-nowrap"
                    >
                      Notify Me
                    </button>
                  </div>
                  {notifyError && (
                    <p
                      role="alert"
                      className="text-xs font-semibold text-[#bb0027] flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" /> {notifyError}
                    </p>
                  )}
                </form>
              ) : (
                <p className="text-sm font-semibold text-[#00503a] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Thank you! We will let
                  you know when it is back in stock.
                </p>
              )}
            </div>
          )}

          {/* Ask on WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-xl border border-[#25D366] text-[#128C4A] hover:bg-[#25D366] hover:text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <WhatsAppIcon className="w-5 h-5" />
            <span>Ask about this product on WhatsApp</span>
          </a>

          {/* Delivery / payment assurances */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="flex flex-col items-center text-center gap-1.5 bg-white border border-gray-100 rounded-2xl p-3">
              <Truck className="w-5 h-5 text-[#00503a]" />
              <span className="text-[11px] text-gray-700 font-semibold leading-tight">
                {product.deliveryTime || "Delivery in 2-3 days"}
              </span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 bg-white border border-gray-100 rounded-2xl p-3">
              <BadgeCheck className="w-5 h-5 text-[#00503a]" />
              <span className="text-[11px] text-gray-700 font-semibold leading-tight">
                Cash on Delivery
              </span>
              <span className="text-[10px] text-gray-400 leading-tight">
                Check before you pay
              </span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 bg-white border border-gray-100 rounded-2xl p-3">
              <RotateCcw className="w-5 h-5 text-[#00503a]" />
              <span className="text-[11px] text-gray-700 font-semibold leading-tight">
                Easy Returns
              </span>
            </div>
          </div>

          {/* Description */}
          {showDescription && (
            <SectionCard title="Description">
              <p
                className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${
                  isLongDescription && !descExpanded ? "line-clamp-5" : ""
                }`}
              >
                {descriptionText}
              </p>
              {isLongDescription && (
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 h-9 text-sm font-bold text-[#00503a] hover:underline cursor-pointer"
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </SectionCard>
          )}

          {/* Key features */}
          {showFeatures && (
            <SectionCard title="Key Features">
              <ul className="space-y-2.5">
                {features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-gray-700"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#00503a] mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Specifications */}
          {showSpecs && (
            <SectionCard title="Specifications">
              <dl className="rounded-xl overflow-hidden border border-gray-100">
                {specEntries.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-4 px-3.5 py-2.5 text-sm odd:bg-gray-50"
                  >
                    <dt className="text-gray-500 shrink-0 max-w-[45%]">{k}</dt>
                    <dd className="font-semibold text-gray-800 text-right break-words">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          )}
        </div>
      </div>

      {visibility.reviews && (
        <section className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 font-montserrat">
                Customer Reviews ({productReviews.length})
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                <span className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`w-4 h-4 ${
                        index < Math.round(productRatingAverage)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </span>
                <span>
                  {productRatingAverage.toFixed(1)}{" "}
                  · {productReviews.length}{" "}
                  {productReviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>
            </div>
          </div>

          {reviewError && (
            <p role="alert" className="mb-3 text-sm font-medium text-red-600">
              {reviewError}
            </p>
          )}
          {reviewSuccess && (
            <p role="status" className="mb-3 text-sm font-medium text-[#00503a]">
              {reviewSuccess}
            </p>
          )}

          {reviewsLoading ? (
            <div
              aria-busy="true"
              aria-label="Loading reviews"
              className="space-y-4 py-4"
            >
              <span className="sr-only">Loading reviews…</span>
              {Array.from({ length: 2 }, (_, index) => (
                <div
                  key={index}
                  className="flex gap-3 border-b border-gray-100 pb-4"
                >
                  <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : productReviews.length === 0 ? (
            <p className="py-5 text-sm text-gray-500">
              No reviews yet. Be the first to review this product.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {productReviews.map((review) => (
                <article
                  key={review.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row gap-3"
                >
                  {review.image && (
                    <img
                      src={review.image}
                      alt={review.imageAlt || `${review.customerName}'s review`}
                      className="w-full sm:w-24 h-40 sm:h-24 rounded-xl object-cover border border-gray-100 shrink-0"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {review.customerName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center text-amber-500">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`w-3.5 h-3.5 ${
                                  index < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </span>
                          <time className="text-xs text-gray-400">
                            {review.date
                              ? new Date(
                                  `${review.date.slice(0, 10)}T00:00:00`,
                                ).toLocaleDateString()
                              : "Recent"}
                          </time>
                        </div>
                      </div>
                      {canDeleteReviews && (
                        <button
                          type="button"
                          onClick={() => void handleReviewDelete(review)}
                          disabled={Boolean(deletingReviewId)}
                          aria-label={`Delete review from ${review.customerName}`}
                          title="Delete review"
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingReviewId === review.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                      {review.comment}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}

          <form
            onSubmit={handleReviewSubmit}
            className="mt-6 pt-5 border-t border-gray-100 space-y-3"
          >
            <h3 className="text-sm font-bold text-gray-900">
              Write a review
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-gray-700">
                Your name *
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={reviewerName}
                  onChange={(event) => setReviewerName(event.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00503a]"
                  placeholder="Your name"
                />
              </label>
              <label className="block text-xs font-semibold text-gray-700">
                Rating *
                <select
                  required
                  value={reviewRating}
                  onChange={(event) =>
                    setReviewRating(Number(event.target.value))
                  }
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00503a]"
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} star{rating === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs font-semibold text-gray-700">
              Your review *
              <textarea
                required
                rows={4}
                maxLength={1000}
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00503a]"
                placeholder="Share your experience with this product"
              />
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <ImageIcon className="w-4 h-4 text-[#00503a]" />
                <span>
                  {reviewImageUploading
                    ? "Processing image..."
                    : reviewImage
                      ? "Change review image"
                      : "Add a photo (optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleReviewImageChange}
                  disabled={reviewImageUploading || reviewSubmitting}
                />
              </label>
              {reviewImage && (
                <div className="flex items-center gap-2">
                  <img
                    src={reviewImage}
                    alt="Review upload preview"
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setReviewImage("")}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove photo
                  </button>
                </div>
              )}
              <button
                type="submit"
                disabled={reviewSubmitting || reviewImageUploading}
                className="sm:ml-auto h-10 px-5 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {reviewSubmitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ============ Related ============ */}
      {relatedProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 font-montserrat mb-3">
            You May Also Like
          </h2>
          <div
            className={`flex gap-3 overflow-x-auto snap-x pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 ${hideScrollbar}`}
          >
            {relatedProducts.map((p) => (
              <div key={p.id} className="w-40 sm:w-48 shrink-0 snap-start">
                <ProductCard
                  product={p}
                  onAddToCart={(prod) => onAddToCart(prod, 1)}
                  onSelectProduct={onSelectProduct}
                  onDirectOrder={(prod) => onDirectOrder(prod, 1)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {recentlyViewedProducts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 font-montserrat mb-3">
            Recently Viewed
          </h2>
          <div
            className={`flex gap-3 overflow-x-auto snap-x pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 ${hideScrollbar}`}
          >
            {recentlyViewedProducts.map((p) => (
              <div key={p.id} className="w-40 sm:w-48 shrink-0 snap-start">
                <ProductCard
                  product={p}
                  onAddToCart={(prod) => onAddToCart(prod, 1)}
                  onSelectProduct={onSelectProduct}
                  onDirectOrder={(prod) => onDirectOrder(prod, 1)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ Sticky action bar (below lg) ============ */}
      {showStickyBar && !isOutOfStock && (
        <div className="fixed bottom-0 inset-x-0 lg:hidden z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.1)] px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center gap-2">
          <div className="shrink-0 min-w-0">
            <p className="text-[10px] text-gray-500 leading-none">
              {quantity > 1 ? `Total (×${quantity})` : "Price"}
            </p>
            <p className="text-base font-extrabold text-[#bb0027] font-montserrat leading-tight mt-1">
              {formatPrice(effectivePrice * quantity)}
            </p>
          </div>
          <button
            onClick={handleAddToCartClick}
            className="flex-1 h-11 border-2 border-[#00503a] text-[#00503a] rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer active:bg-emerald-50"
          >
            <ShoppingCart className="w-4 h-4" /> Add
          </button>
          <button
            onClick={handleBuyNowClick}
            className="flex-1 h-11 bg-[#bb0027] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <Zap className="w-4 h-4" /> Buy Now
          </button>
        </div>
      )}

      {/* ============ Lightbox ============ */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIdx(
                    (i) => (i - 1 + images.length) % images.length,
                  );
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIdx((i) => (i + 1) % images.length);
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={images[activeImageIdx]}
            alt={product.name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
};
