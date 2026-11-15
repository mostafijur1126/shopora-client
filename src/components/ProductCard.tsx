import React, { useState } from "react";
import { Product } from "../types";
import { formatPrice } from "../utils/format";
import { ShoppingBag, Star, Sparkles, Check, PackageCheck } from "lucide-react";

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
}) => {
  const [isAdded, setIsAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1200);
  };

  const handleCardClick = () => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
  };

  // Calculate discount percentage if originalPrice exists
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100,
        )
      : null;
  const reviewCount = product.reviewCount ?? 0;
  const averageRating = reviewCount > 0 ? product.ratingAverage ?? 0 : 0;

  return (
    <article
      id={`product-card-${product.id}`}
      onClick={handleCardClick}
      className={`group bg-white rounded-md border border-gray-200/80 hover:border-[#00503a]/40 shadow-[0_4px_18px_-2px_rgba(0,0,0,0.07),0_2px_6px_-1px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_35px_-8px_rgba(0,80,58,0.20),0_10px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col overflow-hidden relative ${
        onSelectProduct ? "cursor-pointer" : ""
      }`}
    >
      {/* 🖼️ Product Image with Badges and Overlay */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-[#f8faf9] to-[#edf3f0] after:absolute after:inset-0 after:pointer-events-none after:shadow-[inset_0_1px_3px_rgba(0,0,0,0.05),inset_0_-8px_16px_rgba(0,0,0,0.04)]">
        <img
          src={product.image}
          alt={product.imageAlt || product.name}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />

        {/* Top Badges Layer */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none z-10">
          {/* Stock / Popular Badge */}
          {product.inStock ? (
            <span className="bg-white/95 backdrop-blur-xs text-[#00503a] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-100 shadow-xs flex items-center gap-1 font-bengali">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              In Stock
            </span>
          ) : (
            <span className="bg-gray-800/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs font-bengali">
              Out of Stock
            </span>
          )}

          {/* Discount Badge */}
          {(discountPercent || product.discountBadge) && (
            <span className="bg-gradient-to-r from-[#e11d48] to-[#be123c] text-white text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs font-montserrat flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              {discountPercent
                ? `${discountPercent}% OFF`
                : product.discountBadge}
            </span>
          )}
        </div>

        {/* Floating Quick Action Button on Hover */}
        <div className="absolute inset-x-2.5 bottom-2.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hidden sm:flex justify-center z-10">
          <button
            onClick={handleAdd}
            className="w-full bg-white/95 hover:bg-[#00503a] text-[#00503a] hover:text-white backdrop-blur-sm py-1.5 px-3 rounded-lg text-xs font-bold font-bengali shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 group-hover:text-white" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Quick Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 📝 Content & Details Area (Compact Height) */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-grow justify-between bg-gradient-to-b from-white to-[#fafbfa] border-t border-gray-100/90 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] relative z-10">
        <div>
          {/* Title & Rating Row */}
          <div className="flex items-start justify-between gap-1.5 mb-1.5">
            <h3
              className="font-bold text-xs sm:text-sm text-[#191c1d] group-hover:text-[#00503a] transition-colors line-clamp-1 font-bengali flex-1"
              title={product.name}
            >
              {product.name}
            </h3>
            <div
              title={`${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`}
              className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50/90 border border-amber-200/70 shadow-xs px-1.5 py-0.5 rounded-md shrink-0"
            >
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{averageRating.toFixed(1)} ({reviewCount})</span>
            </div>
          </div>

          {/* Model info if present */}
          {product.model && (
            <p className="text-[9px] text-emerald-800 font-semibold truncate mb-1 bg-emerald-50/70 inline-block px-1.5 py-0.5 rounded border border-emerald-100">
              {product.model}
            </p>
          )}

          {/* Price Row */}
          <div className="flex items-baseline flex-wrap gap-1.5 mb-2.5">
            <span className="text-base sm:text-lg font-extrabold text-[#00503a] font-montserrat tracking-tight drop-shadow-[0_1px_1px_rgba(0,80,58,0.08)]">
              {formatPrice(product.price)}
            </span>

            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[11px] text-gray-400 line-through font-montserrat">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* 🛒 Action Button */}
        <div className="mt-auto pt-1">
          <button
            id={`product-direct-order-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onDirectOrder) {
                onDirectOrder(product);
              } else if (onSelectProduct) {
                onSelectProduct(product);
              }
            }}
            className="w-full bg-[#00503a] hover:bg-[#003d2c] text-white py-2.5 px-3 rounded-xl text-xs font-bold font-bengali shadow-[0_4px_12px_rgba(0,80,58,0.25),0_1px_2px_rgba(0,80,58,0.18)] hover:shadow-[0_6px_18px_rgba(0,80,58,0.38)] active:shadow-xs active:translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border-t border-emerald-400/30"
          >
            <PackageCheck className="w-3.5 h-3.5 text-[#9ef4d0] shrink-0" />
            <span>Order Now</span>
          </button>
        </div>
      </div>
    </article>
  );
};
