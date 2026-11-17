import React, { useState, useRef, useEffect } from 'react';
import { ReviewScreenshot } from '../types';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CheckCircle2,
  X,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { getScrollBehavior } from "../utils/scroll";
import { Skeleton } from "./Skeletons";

interface CustomerReviewSliderProps {
  reviews?: ReviewScreenshot[];
  isLoading?: boolean;
}

export const CustomerReviewSlider: React.FC<CustomerReviewSliderProps> = ({
  reviews = [],
  isLoading = false,
}) => {
  const [selectedReview, setSelectedReview] = useState<ReviewScreenshot | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);

  const reviewList = Array.isArray(reviews) ? reviews : [];

  // Autoplay effect
  useEffect(() => {
    if (!isAutoPlay || reviewList.length <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlay, reviewList.length]);

  if (reviewList.length === 0 && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading customer reviews"
        className="w-full lg:w-[90%] mx-auto px-4 md:px-8 py-8 md:py-12"
      >
        <span className="sr-only">Loading customer reviews…</span>
        <Skeleton className="mb-5 h-7 w-72 max-w-full" />
        <Skeleton className="mb-6 h-4 w-2/3 max-w-xl" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-52 w-[220px] sm:w-[240px] shrink-0 rounded-xl"
            />
          ))}
        </div>
      </section>
    );
  }

  // Handle smooth scroll next / prev
  const handlePrev = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: -260,
        behavior: getScrollBehavior(),
      });
    }
    setCurrentIndex((prev) => (prev === 0 ? Math.max(0, reviewList.length - 1) : prev - 1));
  };

  const handleNext = () => {
    if (sliderRef.current) {
      // Check if reached end
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        sliderRef.current.scrollTo({ left: 0, behavior: getScrollBehavior() });
      } else {
        sliderRef.current.scrollBy({
          left: 260,
          behavior: getScrollBehavior(),
        });
      }
    }
    setCurrentIndex((prev) => (prev >= reviewList.length - 1 ? 0 : prev + 1));
  };

  return (
    <section
      id="customer-review-slider-section"
      className="w-full lg:w-[90%] mx-auto px-4 md:px-8 py-8 md:py-12 font-bengali"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* Section Header (Default size & typography) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 md:mb-8 border-b border-gray-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#e7f6f0] text-[#00503a] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#00503a]/20">
              <ShieldCheck className="w-3.5 h-3.5 text-[#006a4e]" />
              100% Genuine Customer Feedback
            </span>
            <span className="text-xs text-gray-500 font-medium hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Verified Delivery
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#191c1d] tracking-tight">
            Real snapshots and reviews of customer satisfaction
          </h2>
          <p className="text-xs sm:text-sm text-[#3f4944] mt-1">
            Real Facebook and WhatsApp screenshots from our valued customers after receiving their products
          </p>
        </div>

        {/* Carousel Navigation Arrows */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="review-prev-btn"
            onClick={handlePrev}
            aria-label="Previous review"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-[#e7f6f0] hover:text-[#00503a] hover:border-[#00503a]/30 transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            id="review-next-btn"
            onClick={handleNext}
            aria-label="Next review"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-[#e7f6f0] hover:text-[#00503a] hover:border-[#00503a]/30 transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Single-line Compact Reviews Slider (Horizontal Scroll) */}
      <div
        ref={sliderRef}
        className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-2 px-1"
      >
        {reviews.map((rev) => {
          return (
            <div
              key={rev.id}
              id={`review-card-${rev.id}`}
              className="w-[220px] sm:w-[240px] shrink-0 snap-start bg-white rounded-xl border border-gray-200/90 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group hover:border-[#00503a]/40"
            >
              {/* Screenshot Image Container with Overlay Zoom button */}
              <div
                className="relative bg-gray-100 aspect-[4/3] overflow-hidden cursor-pointer group/img select-none shrink-0"
                onClick={() => setSelectedReview(rev)}
                title="View screenshot in full size"
              >
                {rev.image ? (
                  <img
                    src={rev.image}
                    alt={rev.imageAlt || `${rev.customerName}'s review image`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                    No photo attached
                  </div>
                )}

                {/* Dark Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                  <span className="text-white text-[10px] font-semibold flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/20">
                    <Maximize2 className="w-3 h-3" />
                    Enlarge
                  </span>
                  {rev.verified !== false && (
                    <span className="bg-[#25D366] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Verified Badge on top right */}
                {rev.verified !== false && (
                  <div className="absolute top-2 right-2 bg-[#00503a]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs backdrop-blur-xs">
                    <CheckCircle2 className="w-2.5 h-2.5 text-[#9ef4d0]" />
                    <span>Verified</span>
                  </div>
                )}
              </div>

              {/* Review Card Info & Text */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2 bg-white">
                {/* Rating & Product name */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < (rev.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {rev.date && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {rev.date}
                      </span>
                    )}
                  </div>

                  {rev.productName && (
                    <p className="text-xs font-semibold text-[#00503a] truncate mb-1">
                      {rev.productName}
                    </p>
                  )}

                  {rev.comment && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed italic relative pl-2 border-l-2 border-[#00503a]/30">
                      "{rev.comment}"
                    </p>
                  )}
                </div>

                {/* Customer Identity Footer */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[#e7f6f0] text-[#00503a] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#00503a]/20">
                      {rev.customerName ? rev.customerName.charAt(0) : 'C'}
                    </div>
                    <p className="font-bold text-gray-900 truncate text-xs">
                      {rev.customerName}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedReview(rev)}
                    className="text-[10px] text-[#00503a] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer shrink-0"
                  >
                    <span>View</span>
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Indicators */}
      {reviews.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-6">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-6 bg-[#00503a]'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* Lightbox Modal for Full View */}
      {selectedReview && (
        <div
          id="review-lightbox-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-50"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#00503a] text-white flex items-center justify-center font-bold text-xs">
                  {selectedReview.customerName ? selectedReview.customerName.charAt(0) : 'C'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <span>{selectedReview.customerName}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Verified Buyer
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {selectedReview.customerLocation ? `${selectedReview.customerLocation} • ` : ''}
                    {selectedReview.date || 'Recent Reviews'}
                  </p>
                </div>
              </div>

              <button
                id="review-lightbox-close-btn"
                onClick={() => setSelectedReview(null)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body with Full Screenshot Image */}
            <div className="overflow-y-auto p-4 max-h-[70vh] flex flex-col items-center bg-gray-900/5">
              {selectedReview.image && (
                <img
                  src={selectedReview.image}
                  alt={selectedReview.imageAlt || selectedReview.customerName}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="rounded-lg object-contain max-h-[55vh] w-auto shadow-md border border-gray-200"
                />
              )}

              {/* Review details */}
              <div className="mt-4 w-full bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (selectedReview.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {selectedReview.productName && (
                    <span className="text-xs font-bold text-[#00503a] bg-[#e7f6f0] px-2.5 py-0.5 rounded-full">
                      {selectedReview.productName}
                    </span>
                  )}
                </div>

                {selectedReview.comment && (
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                    "{selectedReview.comment}"
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedReview(null)}
                className="px-4 py-1.5 rounded-lg bg-[#00503a] text-white text-xs font-semibold hover:bg-[#046c50] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
