import React from "react";
import { ActiveScreen } from "../types";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div
    aria-hidden="true"
    className={`skeleton-pulse rounded-lg bg-[#e7ece9] ${className}`}
  />
);

export const ProductCardSkeleton: React.FC = () => (
  <article
    aria-hidden="true"
    className="bg-white rounded-md border border-gray-200/80 shadow-xs overflow-hidden flex flex-col"
  >
    <Skeleton className="aspect-square w-full rounded-none" />
    <div className="p-3 sm:p-3.5 flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-6 w-2/5" />
      <Skeleton className="mt-auto h-10 w-full rounded-xl" />
    </div>
  </article>
);

interface ProductGridSkeletonProps {
  count?: number;
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  count = 8,
}) => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
    {Array.from({ length: count }, (_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

export const ProductSliderSkeleton: React.FC = () => (
  <div className="category-product-slider overflow-hidden">
    {Array.from({ length: 5 }, (_, index) => (
      <div key={index} className="min-w-0">
        <ProductCardSkeleton />
      </div>
    ))}
  </div>
);

export const CategorySectionSkeleton: React.FC = () => (
  <section aria-hidden="true" className="space-y-4">
    <div className="flex items-center justify-between gap-3 border-b border-[#bec9c2]/60 pb-3">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 max-w-[42vw]" />
          <Skeleton className="hidden sm:block h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
    </div>
    <ProductSliderSkeleton />
  </section>
);

const HeaderSkeleton: React.FC = () => (
  <header
    aria-hidden="true"
    className="sticky top-0 z-40 h-16 lg:h-28 bg-white border-b border-gray-100 px-4 sm:px-8 flex items-center justify-between"
  >
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="hidden sm:block h-3 w-36" />
      </div>
    </div>
    <Skeleton className="hidden md:block h-10 w-64 rounded-xl" />
    <Skeleton className="h-10 w-24 rounded-xl" />
  </header>
);

export const HomePageSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Loading homepage">
    <span className="sr-only">Loading homepage content…</span>
    <div className="relative h-[220px] sm:h-[460px] md:h-[520px] lg:h-[550px] w-full overflow-hidden bg-[#e7ece9]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-x-5 bottom-10 sm:inset-y-0 sm:left-10 sm:right-auto sm:flex sm:max-w-2xl sm:flex-col sm:justify-center md:left-16 lg:left-20 space-y-3">
        <Skeleton className="hidden sm:block h-7 w-32 rounded-full" />
        <Skeleton className="h-8 sm:h-12 w-4/5 sm:w-[30rem] max-w-full" />
        <Skeleton className="hidden sm:block h-5 w-3/4 max-w-md" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    </div>
    <main className="w-full lg:w-[90%] mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8 space-y-7 md:space-y-14">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton
            key={index}
            className="h-40 sm:h-48 md:h-52 w-full rounded-md"
          />
        ))}
      </div>
      <div className="space-y-10 md:space-y-16">
        {Array.from({ length: 3 }, (_, index) => (
          <CategorySectionSkeleton key={index} />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
    </main>
  </div>
);

export const CategoryPageSkeleton: React.FC = () => (
  <main
    aria-busy="true"
    aria-label="Loading product collection"
    className="w-full lg:w-[90%] mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-6"
  >
    <span className="sr-only">Loading collection…</span>
    <Skeleton className="mb-5 h-4 w-48" />
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <aside className="hidden lg:block w-72 shrink-0 rounded-2xl border border-gray-200 bg-white p-5 space-y-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
      </aside>
      <section className="w-full min-w-0 lg:flex-1 space-y-4">
        <Skeleton className="h-8 w-56 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
        <ProductGridSkeleton count={8} />
      </section>
    </div>
  </main>
);

export const ProductDetailsSkeleton: React.FC = () => (
  <main
    aria-busy="true"
    aria-label="Loading product details"
    className="w-full lg:w-[90%] mx-auto px-3 sm:px-4 md:px-8 py-5 md:py-8"
  >
    <span className="sr-only">Loading product details…</span>
    <Skeleton className="mb-5 h-4 w-52" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
      <div className="space-y-3">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-16 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  </main>
);

export const CartSkeleton: React.FC = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading shopping cart"
    className="fixed inset-0 z-50 font-bengali"
  >
    <span className="sr-only">Loading shopping cart…</span>
    <div className="absolute inset-0 bg-black/50" />
    <aside className="absolute inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col p-5">
      <div className="h-16 shrink-0 flex items-center justify-between border-b border-gray-100">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="flex-1 space-y-4 py-5">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex gap-3 rounded-xl border border-gray-100 bg-[#f8f9fa] p-3"
          >
            <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-3 py-1">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </aside>
  </div>
);

export const CheckoutSkeleton: React.FC = () => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading checkout"
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
  >
    <span className="sr-only">Loading checkout…</span>
    <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-7 space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  </div>
);

interface PageLoadingSkeletonProps {
  screen: ActiveScreen;
}

export const PageLoadingSkeleton: React.FC<PageLoadingSkeletonProps> = ({
  screen,
}) => {
  if (screen === "categories") {
    return (
      <>
        <HeaderSkeleton />
        <CategoryPageSkeleton />
      </>
    );
  }
  if (screen === "product-detail") {
    return (
      <>
        <HeaderSkeleton />
        <ProductDetailsSkeleton />
      </>
    );
  }
  if (screen === "admin") {
    return (
      <main
        aria-busy="true"
        aria-label="Loading dashboard"
        className="min-h-screen bg-[#f8f9fa] p-4 sm:p-8 space-y-6"
      >
        <span className="sr-only">Loading dashboard…</span>
        <Skeleton className="h-10 w-52" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </main>
    );
  }
  return (
    <>
      <HeaderSkeleton />
      <HomePageSkeleton />
    </>
  );
};
