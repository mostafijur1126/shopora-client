import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { getScrollBehavior } from "../utils/scroll";

interface CategoryProductSectionProps {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  titleEn: string;
  badgeText: string;
  sectionId: string;
  viewAllUrl: string;
  products: Product[];
  icon: React.ComponentType<{ className?: string }>;
  onViewAll: () => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  onDirectOrder?: (product: Product) => void;
}

export const CategoryProductSection: React.FC<CategoryProductSectionProps> = ({
  categoryId,
  categoryName,
  categorySlug,
  titleEn,
  badgeText,
  sectionId,
  viewAllUrl,
  products,
  icon: Icon,
  onViewAll,
  onAddToCart,
  onSelectProduct,
  onDirectOrder,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const pauseUntilRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const moveSlider = (direction: -1 | 1) => {
    const slider = sliderRef.current;
    const firstCard = slider?.firstElementChild as HTMLElement | null;
    if (!slider || !firstCard) return;

    pauseUntilRef.current = Date.now() + 6000;
    const gap = Number.parseFloat(getComputedStyle(slider).columnGap) || 0;
    slider.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: getScrollBehavior(),
    });
  };

  useEffect(() => {
    if (products.length < 2) return;

    const timer = window.setInterval(() => {
      const slider = sliderRef.current;
      if (
        !slider ||
        isHovered ||
        isFocused ||
        document.hidden ||
        Date.now() < pauseUntilRef.current
      ) {
        return;
      }

      const maxScroll = slider.scrollWidth - slider.clientWidth;
      if (maxScroll <= 1) return;

      const firstCard = slider.firstElementChild as HTMLElement | null;
      if (!firstCard) return;
      const gap = Number.parseFloat(getComputedStyle(slider).columnGap) || 0;
      const step = firstCard.getBoundingClientRect().width + gap;
      slider.scrollTo({
        left:
          slider.scrollLeft + step >= maxScroll - 1
            ? 0
            : slider.scrollLeft + step,
        behavior: getScrollBehavior(),
      });
    }, 4500);

    return () => window.clearInterval(timer);
  }, [isFocused, isHovered, products.length]);

  return (
    <section
      id={`showcase-${sectionId}`}
      aria-labelledby={`showcase-${sectionId}-title`}
      data-category-id={categoryId}
      data-category-slug={categorySlug}
      className="scroll-mt-6"
    >
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 border-b border-[#bec9c2]/60 pb-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e7f6f0] text-[#00503a] flex items-center justify-center shrink-0 shadow-xs border border-emerald-100">
            <Icon className="w-5 h-5 text-[#006a4e]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2
                id={`showcase-${sectionId}-title`}
                className="text-base sm:text-2xl font-bold text-[#191c1d] font-bengali tracking-tight truncate"
              >
                {categoryName}
              </h2>
              <span className="hidden sm:inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#00503a]/10 text-[#00503a] font-bengali shrink-0">
                {badgeText}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-montserrat hidden sm:block">
              {titleEn}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => moveSlider(-1)}
            aria-label={`Previous ${categoryName} products`}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg border border-gray-200 text-[#00503a] hover:bg-[#e7f6f0] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => moveSlider(1)}
            aria-label={`Next ${categoryName} products`}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg border border-gray-200 text-[#00503a] hover:bg-[#e7f6f0] transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href={viewAllUrl}
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              onViewAll();
            }}
            aria-label={`View all ${categoryName} products`}
            className="text-[#00503a] hover:text-[#003828] font-bold text-xs sm:text-sm flex items-center gap-1 font-bengali cursor-pointer transition-colors group px-2.5 sm:px-3 h-9 rounded-lg hover:bg-[#e7f6f0]"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#006a4e]" />
          </a>
        </div>
      </div>

      <div
        ref={sliderRef}
        role="region"
        aria-label={`${categoryName} products`}
        aria-roledescription="carousel"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsFocused(false);
          }
        }}
        onTouchStart={() => {
          pauseUntilRef.current = Date.now() + 6000;
        }}
        onTouchEnd={() => {
          pauseUntilRef.current = Date.now() + 6000;
        }}
        className="category-product-slider overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div key={product.id} className="min-w-0 snap-start">
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              onSelectProduct={onSelectProduct}
              onDirectOrder={onDirectOrder}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
