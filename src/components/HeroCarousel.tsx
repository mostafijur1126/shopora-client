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

  const goNext = () => {
    setCurrent((prev) => (prev + 1) % total);
  };

  const goPrev = () => {
    setCurrent((prev) => (prev - 1 + total) % total);
  };

  // Autoplay
  useEffect(() => {
    if (paused || total < 2) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % total);
    }, AUTOPLAY_MS);

    return () => clearTimeout(timer);
  }, [current, paused, total]);

  // Touch swipe
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
      className="relative w-full overflow-hidden select-none bg-white"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setPaused(true);
      }}
      onPointerLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full Width Fluid Container */}
      <div
        className="
          relative
          w-full
          h-[240px]
          sm:h-[340px]
          md:h-[420px]
          lg:h-auto
          lg:aspect-[16/6]
          lg:min-h[480px]
          lg:max-h[760px]
          overflow-hidden
          bg-gray-900
        "
      >
        {/* Slides Wrapper */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-in-out motion-reduce:transition-none"
          style={{
            transform: `translateX(-${current * 100}%)`,
          }}
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
                className="relative w-full h-full shrink-0 overflow-hidden"
              >
                {/* Background Image */}
                <img
                  src={slide.image}
                  alt=""
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="
                    absolute inset-0
                    w-full h-full
                    object-cover
                    object-center
                    lg:object-[center_20%]
                    pointer-events-none
                  "
                />

                {/* Mobile Overlay */}
                <div
                  className="
                    absolute inset-0
                    sm:hidden
                    bg-gradient-to-t
                    from-black/85
                    via-black/35
                    to-black/5
                  "
                />

                {/* Desktop Overlay */}
                <div
                  className="
                    hidden sm:block
                    absolute inset-0
                    bg-gradient-to-r
                    from-black/85
                    via-black/55
                    to-black/5
                  "
                />

                {/* Content Container */}
                <div
                  className="
                    absolute inset-0
                    flex flex-col
                    justify-end
                    sm:justify-center
                    px-5
                    pb-12
                    sm:pb-0
                    sm:px-10
                    md:px-14
                    lg:px-20
                    xl:px-28
                    2xl:px-36
                  "
                >
                  <div className="w-full max-w-2xl text-white space-y-2.5 sm:space-y-4">
                    {/* Promotional Badges */}
                    <div className="hidden sm:flex flex-wrap items-center gap-2.5">
                      <span
                        className="
                        inline-flex items-center gap-1.5
                        bg-white text-black
                        text-xs md:text-sm
                        font-bold
                        px-3 py-1.5
                        rounded-full
                        shadow-md
                        uppercase tracking-wide
                        font-bengali
                      "
                      >
                        <Sparkles className="w-4 h-4" />
                        {slide.badge}
                      </span>

                      <span
                        className="
                        inline-flex items-center gap-1.5
                        bg-red-600 text-white
                        text-xs md:text-sm
                        font-bold
                        px-3 py-1.5
                        rounded-full
                        shadow-md
                      "
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {slide.discountText}
                      </span>

                      <span
                        className="
                        inline-flex items-center gap-1.5
                        bg-black/30
                        backdrop-blur-md
                        text-white
                        text-xs
                        font-semibold
                        px-3 py-1.5
                        rounded-full
                        border border-white/20
                      "
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        4.9/5 Customer Satisfaction
                      </span>
                    </div>

                    {/* Main Title */}
                    <h1
                      className="
                        text-2xl
                        leading-tight
                        sm:text-3xl
                        md:text-4xl
                        lg:text-5xl
                        xl:text-6xl
                        sm:leading-[1.15]
                        font-extrabold
                        tracking-tight
                        font-bengali
                        drop-shadow-lg
                        line-clamp-2
                        sm:line-clamp-none
                      "
                    >
                      {slide.titleBn}
                    </h1>

                    {/* Subtitle */}
                    <p
                      className="
                        hidden sm:block
                        text-sm
                        md:text-base
                        lg:text-lg
                        text-white/90
                        leading-relaxed
                        font-bengali
                        max-w-xl
                        drop-shadow-md
                      "
                    >
                      {slide.subtitleBn}
                    </p>

                    {/* CTA Button */}
                    <div className="pt-1 sm:pt-3">
                      <button
                        type="button"
                        id={index === 0 ? "hero-shop-now-btn" : undefined}
                        tabIndex={isActive ? 0 : -1}
                        onClick={onViewProducts}
                        className="
                          inline-flex items-center justify-center
                          gap-2.5
                          h-10
                          sm:h-12
                          px-5
                          sm:px-8
                          rounded-full
                          bg-white
                          text-black
                          hover:bg-black
                          hover:text-white
                          border border-white
                          font-bold
                          text-sm
                          sm:text-base
                          shadow-lg
                          transition-all duration-300
                          group
                          cursor-pointer
                          active:scale-95
                        "
                      >
                        <ShoppingBag className="hidden sm:block w-5 h-5" />

                        <span>View Products</span>

                        <ArrowRight
                          className="
                            w-4 h-4
                            sm:w-5 sm:h-5
                            group-hover:translate-x-1.5
                            transition-transform duration-300
                          "
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Controls */}
        {total > 1 && (
          <>
            {/* Previous */}
            <button
              type="button"
              id="hero-slider-prev-btn"
              onClick={goPrev}
              aria-label="Previous slide"
              className="
                hidden sm:flex
                absolute left-4 lg:left-7
                top-1/2 -translate-y-1/2
                z-20
                w-10 h-10
                lg:w-12 lg:h-12
                rounded-full
                bg-black/30
                hover:bg-white
                text-white
                hover:text-black
                border border-white/30
                backdrop-blur-md
                items-center justify-center
                transition-all duration-300
                cursor-pointer
                shadow-lg
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-white
              "
            >
              <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>

            {/* Next */}
            <button
              type="button"
              id="hero-slider-next-btn"
              onClick={goNext}
              aria-label="Next slide"
              className="
                hidden sm:flex
                absolute right-4 lg:right-7
                top-1/2 -translate-y-1/2
                z-20
                w-10 h-10
                lg:w-12 lg:h-12
                rounded-full
                bg-black/30
                hover:bg-white
                text-white
                hover:text-black
                border border-white/30
                backdrop-blur-md
                items-center justify-center
                transition-all duration-300
                cursor-pointer
                shadow-lg
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-white
              "
            >
              <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>

            {/* Pagination Dots */}
            <div
              className="
                absolute
                bottom-3
                sm:bottom-5
                left-1/2
                -translate-x-1/2
                z-20
                flex items-center gap-2
                bg-black/30
                backdrop-blur-md
                px-3 py-2
                rounded-full
                border border-white/10
              "
            >
              {heroSlides.map((slide, idx) => (
                <button
                  key={`${slide.id}-dot-${idx}`}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={idx === current}
                  className={`
                    h-1.5 sm:h-2
                    rounded-full
                    transition-all duration-300
                    cursor-pointer
                    ${
                      idx === current
                        ? "w-6 sm:w-8 bg-white"
                        : "w-1.5 sm:w-2 bg-white/50 hover:bg-white"
                    }
                  `}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
