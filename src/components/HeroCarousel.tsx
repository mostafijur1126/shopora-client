import React, { useState, useEffect, useRef } from "react";
import { heroSlides } from "../data/banners";
import {
  ShoppingBag,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";

interface HeroCarouselProps {
  /** Called when the "View Products" button is pressed */
  onViewProducts: () => void;
}

const AUTOPLAY_MS = 5500;

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  onViewProducts,
}) => {
  const total = heroSlides.length;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goNext = () => setCurrent((p) => (p + 1) % total);
  const goPrev = () => setCurrent((p) => (p - 1 + total) % total);

  // Autoplay. The timer restarts after every change, so a manual click
  // always gets a full 5.5 seconds before the next automatic slide.
  useEffect(() => {
    if (paused || total < 2) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = setTimeout(() => {
      setCurrent((p) => (p + 1) % total);
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [current, paused, total]);

  // Swipe on touch screens
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  if (total === 0) return null;

  return (
    <section
      id="home-hero-carousel-section"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      className="relative  overflow-hidden  select-none"
      // Pause only for a real mouse. Touch screens fake "mouse enter" on tap,
      // which would stop the autoplay forever.
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setPaused(true);
      }}
      onPointerLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-[220px] sm:h-[460px] md:h-[520px] lg:h-[550px] w-full overflow-hidden bg-gray-900">
        {/* Slides sit side by side and the whole strip moves */}
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {heroSlides.map((slide, index) => {
            const isActive = index === current;
            return (
              <div
                key={`${slide.id}-${index}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${total}`}
                aria-hidden={!isActive}
                className="relative w-full h-full shrink-0"
              >
                <img
                  src={slide.image}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Phone: soft gradient from the bottom so the photo stays visible */}
                <div className="sm:hidden absolute inset-0 bg-gradient-to-t from-[#002116]/90 via-[#002116]/40 to-[#002116]/5" />
                {/* Tablet / desktop: gradient from the left */}
                <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-[#002116]/90 via-[#002116]/65 to-transparent/20" />

                {/* Slide content */}
                <div className="absolute inset-0 flex flex-col justify-end sm:justify-center px-5 pb-12 sm:pb-0 sm:px-10 md:px-16 lg:px-20">
                  <div className="max-w-2xl text-white space-y-3 sm:space-y-4">
                    {/* Badges: hidden on phones to keep the banner clean */}
                    <div className="hidden sm:flex flex-wrap items-center gap-3">
                      <span className="bg-[#9ef4d0] text-[#003828] text-sm font-extrabold px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-md uppercase tracking-wide font-bengali">
                        <Sparkles className="w-3.5 h-3.5 text-[#006a4e]" />
                        {slide.badge}
                      </span>

                      <span className="bg-[#bb0027] text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm font-montserrat">
                        <Tag className="w-3.5 h-3.5" />
                        {slide.discountText}
                      </span>

                      <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        4.9/5 Customer Satisfaction
                      </span>
                    </div>

                    <h1 className="text-[26px] leading-tight sm:text-4xl md:text-5xl sm:leading-[1.2] font-extrabold sm:font-black text-white font-bengali tracking-tight drop-shadow-md line-clamp-2 sm:line-clamp-none">
                      {slide.titleBn}
                    </h1>

                    {/* Subtitle: tablet / desktop only */}
                    <p className="hidden sm:block text-base md:text-lg text-emerald-50/90 leading-relaxed font-bengali max-w-xl font-normal drop-shadow-xs">
                      {slide.subtitleBn}
                    </p>

                    <div className="pt-1 sm:pt-3">
                      <button
                        type="button"
                        id={index === 0 ? "hero-shop-now-btn" : undefined}
                        tabIndex={isActive ? 0 : -1}
                        onClick={onViewProducts}
                        className="bg-[#9ef4d0] text-[#003828] hover:bg-white hover:text-[#00503a] h-11 sm:h-12 px-6 sm:px-9 rounded-full sm:rounded-xl font-bold text-base transition-colors duration-300 shadow-lg inline-flex items-center gap-2.5 group cursor-pointer active:scale-95"
                      >
                        <ShoppingBag className="hidden sm:block w-5 h-5 text-[#00503a]" />
                        <span>View Products</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrows (tablet / desktop). On phones you swipe. */}
        {total > 1 && (
          <>
            <button
              type="button"
              id="hero-slider-prev-btn"
              onClick={goPrev}
              aria-label="Previous slide"
              className="hidden sm:flex absolute left-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/20 backdrop-blur-md items-center justify-center transition-colors cursor-pointer shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef4d0]"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              id="hero-slider-next-btn"
              onClick={goNext}
              aria-label="Next slide"
              className="hidden sm:flex absolute right-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/30 hover:bg-black/60 text-white border border-white/20 backdrop-blur-md items-center justify-center transition-colors cursor-pointer shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9ef4d0]"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3.5 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:bg-black/40 sm:backdrop-blur-md sm:px-3.5 sm:py-1.5 rounded-full sm:border sm:border-white/10">
              {heroSlides.map((slide, idx) => (
                <button
                  key={`${slide.id}-dot-${idx}`}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={idx === current}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === current
                      ? "w-6 sm:w-8 bg-[#9ef4d0]"
                      : "w-1.5 sm:w-2 bg-white/50 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
