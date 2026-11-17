import React, { useEffect, useRef, useState } from "react";
import { Product } from "../types";
import { formatPrice } from "../utils/format";
import { ShoppingBag, Star, Check, PackageCheck } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onDirectOrder?: (product: Product) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onSelectProduct,
  onDirectOrder,
  className,
}) => {
  const [isAdded, setIsAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the pending timeout if the card unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock) return;

    onAddToCart(product);
    setIsAdded(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsAdded(false), 1400);
  };

  const handleOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock) return;

    if (onDirectOrder) {
      onDirectOrder(product);
    } else if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  const handleCardClick = () => {
    onSelectProduct?.(product);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only react when the card itself is focused, not its inner buttons
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick();
    }
  };

  const hasDiscount =
    !!product.originalPrice && product.originalPrice > product.price;

  const discountPercent = hasDiscount
    ? Math.round(
        ((product.originalPrice! - product.price) / product.originalPrice!) *
          100,
      )
    : null;

  const reviewCount = product.reviewCount ?? 0;
  const averageRating = reviewCount > 0 ? (product.ratingAverage ?? 0) : 0;
  const clickable = !!onSelectProduct;

  return (
    <article
      id={`product-card-${product.id}`}
      onClick={handleCardClick}
      onKeyDown={clickable ? handleKeyDown : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={product.name}
      className={`group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00503a]/60 sm:hover:-translate-y-1 sm:hover:border-[#00503a]/30 sm:hover:shadow-[0_16px_32px_-10px_rgba(0,80,58,0.25)] ${
        clickable
          ? "cursor-pointer active:scale-[0.985] sm:active:scale-100"
          : ""
      } ${className || ""}`}
    >
      {/* ───────── Image ───────── */}
      <div className="relative aspect-square shrink-0 overflow-hidden bg-[#f3f6f4]">
        <img
          src={product.image}
          alt={product.imageAlt || product.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={`h-full w-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-105 ${
            product.inStock ? "" : "opacity-60 grayscale"
          }`}
        />

        {/* Discount badge (top-left) */}
        {(discountPercent || product.discountBadge) && (
          <span className="font-montserrat pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-[#e11d48] px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white shadow-sm sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-xs sm:leading-none">
            {discountPercent ? `-${discountPercent}%` : product.discountBadge}
          </span>
        )}

        {/* Stock badge (bottom-left, only when it matters) */}
        {!product.inStock && (
          <span className="font-bengali pointer-events-none absolute inset-x-1.5 bottom-1.5 rounded-md bg-gray-900/85 px-2 py-0.5 text-center text-[10px] font-semibold text-white backdrop-blur-sm sm:inset-x-2 sm:bottom-2 sm:rounded-lg sm:py-1 sm:text-xs">
            Out of Stock
          </span>
        )}

        {/* Desktop-only quick add on hover (mobile uses the always-visible cart button) */}
        {product.inStock && (
          <button
            type="button"
            onClick={handleAdd}
            tabIndex={-1}
            aria-hidden="true"
            className="font-bengali absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-[#00503a] opacity-0 shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-[#00503a] hover:text-white group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
          >
            {isAdded ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Added!
              </>
            ) : (
              <>
                <ShoppingBag className="h-3.5 w-3.5" />
                Quick Add
              </>
            )}
          </button>
        )}
      </div>

      {/* ───────── Content ───────── */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5 sm:gap-2.5 sm:p-4">
        <div className="flex flex-1 flex-col gap-1 sm:gap-1.5">
          {/* Title: single line, truncated with ellipsis */}
          <h3
            title={product.name}
            className="font-bengali truncate text-[12px] font-bold leading-4 text-[#191c1d] transition-colors sm:text-sm sm:leading-5 sm:group-hover:text-[#00503a]"
          >
            {product.name}
          </h3>

          {/* Rating */}
          <div
            className="flex items-center gap-0.5 text-[10px] text-gray-500 sm:gap-1 sm:text-xs"
            aria-label={
              reviewCount > 0
                ? `Rated ${averageRating.toFixed(1)} out of 5 from ${reviewCount} ${
                    reviewCount === 1 ? "review" : "reviews"
                  }`
                : "No reviews yet"
            }
          >
            <Star
              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                reviewCount > 0
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              }`}
            />
            {reviewCount > 0 ? (
              <>
                <span className="font-semibold text-gray-800">
                  {averageRating.toFixed(1)}
                </span>
                <span>({reviewCount})</span>
              </>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-montserrat text-[15px] font-extrabold leading-5 tracking-tight text-[#00503a] sm:text-lg sm:leading-6">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="font-montserrat text-[10px] text-gray-400 line-through sm:text-xs">
              {formatPrice(product.originalPrice!)}
            </span>
          )}
        </div>

        {/* Actions: stacked on mobile (one below the other), side by side from sm up */}
        <div className="flex flex-col items-stretch gap-1.5 pt-0.5 sm:flex-row sm:gap-2">
          <button
            id={`product-direct-order-${product.id}`}
            type="button"
            onClick={handleOrder}
            disabled={!product.inStock}
            className="font-bengali flex h-9 w-full min-w-0 items-center justify-center gap-1 rounded-lg bg-[#00503a] px-2 text-[12px] font-bold text-white shadow-[0_3px_8px_rgba(0,80,58,0.2)] transition-all duration-200 hover:bg-[#003d2c] active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none sm:h-11 sm:flex-1 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:text-[13px]"
          >
            <PackageCheck className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">
              {product.inStock ? "Order Now" : "Unavailable"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!product.inStock}
            aria-label={
              isAdded ? "Added to cart" : `Add ${product.name} to cart`
            }
            className={`font-bengali flex h-9 w-full shrink-0 items-center justify-center gap-1 rounded-lg border-[1.5px] text-[12px] font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 sm:h-11 sm:w-11 sm:rounded-xl sm:border-2 ${
              isAdded
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-[#00503a]/25 bg-white text-[#00503a] hover:border-[#00503a] hover:bg-[#00503a]/5"
            }`}
          >
            {isAdded ? (
              <Check className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            ) : (
              <ShoppingBag className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            )}
            {/* Label only on mobile; desktop keeps the compact icon button */}
            <span className="sm:hidden">
              {isAdded ? "Added" : "Add to Cart"}
            </span>
          </button>
        </div>
      </div>

      {/* Screen-reader confirmation */}
      <span className="sr-only" role="status" aria-live="polite">
        {isAdded ? `${product.name} added to cart` : ""}
      </span>
    </article>
  );
};
