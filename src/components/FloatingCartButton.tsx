import React from "react";
import { ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { CartItem } from "../types";
import { formatPrice } from "../utils/format";

interface FloatingCartButtonProps {
  cart: CartItem[];
  onOpenCart: () => void;
  /** Lets a screen with its own sticky bottom bar hide this button. */
  hidden?: boolean;
}

export const FloatingCartButton: React.FC<FloatingCartButtonProps> = ({
  cart,
  onOpenCart,
  hidden = false,
}) => {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  // Nothing in the cart yet: the navbar cart icon is enough
  if (hidden || totalCount === 0) return null;

  return (
    <>
      {/* Mobile: slim bottom bar, easy to reach with a thumb */}
      <div
        id="floating-cart-popup-container"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none font-bengali select-none"
      >
        <button
          id="floating-cart-bar-btn"
          onClick={onOpenCart}
          aria-label={`View cart, ${totalCount} items, ${formatPrice(totalPrice)}`}
          className="pointer-events-auto w-full h-14 flex items-center justify-between gap-3 pl-3 pr-4 rounded-2xl bg-gradient-to-r from-[#006a4e] via-[#00503a] to-[#003828] text-white shadow-2xl border border-emerald-400/30 active:scale-[0.98] transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="relative w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-[#9ef4d0]" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#bb0027] text-[10px] font-black font-montserrat flex items-center justify-center ring-2 ring-[#00503a]">
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            </span>
            <span className="text-sm font-bold truncate">View Cart</span>
          </span>

          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm font-extrabold text-[#9ef4d0] font-montserrat">
              {formatPrice(totalPrice)}
            </span>
            <ChevronRight className="w-4 h-4 text-emerald-200" />
          </span>
        </button>
      </div>

      {/* Tablet / desktop: compact side tab */}
      <div className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 items-center font-bengali select-none">
        <button
          id="floating-cart-popup-btn"
          onClick={onOpenCart}
          aria-label={`Shopping Bag with ${totalCount} items`}
          title="Open Shopping Bag"
          className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#006a4e] via-[#00503a] to-[#003828] hover:from-[#007a5a] hover:to-[#004834] text-white p-3 rounded-l-2xl shadow-2xl border-y border-l border-emerald-400/30 transition-all duration-300 hover:-translate-x-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <span className="absolute -top-2 -left-2 min-w-[20px] h-5 px-1 rounded-full bg-[#bb0027] text-[10px] font-black text-white font-montserrat flex items-center justify-center shadow-xs ring-2 ring-white">
            {totalCount > 99 ? "99+" : totalCount}
          </span>

          <ShoppingBag className="w-6 h-6 text-[#9ef4d0] mb-1 group-hover:scale-110 transition-transform duration-200" />

          <span className="text-xs font-bold leading-tight text-emerald-100">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </span>

          <span className="mt-1 bg-emerald-950/70 border border-emerald-400/20 px-2 py-0.5 rounded-md text-[11px] font-extrabold text-[#9ef4d0] font-montserrat tracking-tight whitespace-nowrap shadow-inner">
            {formatPrice(totalPrice)}
          </span>

          <ChevronLeft className="mt-1 w-3.5 h-3.5 text-emerald-300/80 group-hover:text-white transition-colors" />
        </button>
      </div>
    </>
  );
};
