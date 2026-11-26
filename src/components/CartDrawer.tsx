import React, { useEffect, useState } from "react";
import { CartItem } from "../types";
import { getWhatsAppCartOrderLink } from "../utils/whatsapp";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  PackageCheck,
  ArrowRight,
} from "lucide-react";
import { formatPrice } from "../utils/format";
import {
  getCartItemPrice,
  getCartItemVariant,
  getCartItemStockQty,
  getCartLineKey,
} from "../utils/cart";

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

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onDirectCheckout?: () => void;
}

const variantChips = (item: CartItem): string[] => {
  const chips: string[] = [];
  const model = item.selectedModel || item.product.model;
  if (model) chips.push(model);
  if (item.selectedSize) chips.push(`Size: ${item.selectedSize}`);
  if (item.selectedColor) chips.push(item.selectedColor);
  Object.entries(item.selectedVariantAttributes || {}).forEach(([name, value]) =>
    chips.push(`${name}: ${value}`),
  );
  return chips;
};

const maxQtyFor = (item: CartItem) => {
  const variant = getCartItemVariant(item);
  if (variant) return variant.stockQty;
  return item.product.stockQty && item.product.stockQty > 0
    ? getCartItemStockQty(item)
    : 99;
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onDirectCheckout,
}) => {
  // "Clear cart" needs a second tap so a thumb slip doesn't wipe the whole cart
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!isOpen) setConfirmClear(false);
  }, [isOpen]);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  // Lock page scroll behind the drawer and close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + getCartItemPrice(item) * item.quantity,
    0,
  );

  const cartPayload = cartItems.map((item) => ({
    name: item.product.name,
    quantity: item.quantity,
    price: getCartItemPrice(item),
    sku: item.product.sku,
    id: item.product.id,
    variant: [
      item.selectedModel,
      item.selectedSize && `Size: ${item.selectedSize}`,
      item.selectedColor,
      ...Object.entries(item.selectedVariantAttributes || {}).map(
        ([name, value]) => `${name}: ${value}`,
      ),
    ]
      .filter(Boolean)
      .join(", "),
  }));

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    onClearCart();
  };

  return (
    <div
      className={`fixed inset-0 z-50 font-bengali ${
        isOpen
          ? "visible"
          : "invisible pointer-events-none [transition:visibility_0s_300ms]"
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel: full screen on phones, side drawer from sm up */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute inset-y-0 right-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-16 shrink-0 px-4 sm:px-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#ecfdf5] flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#00503a]" />
            </span>
            <div className="leading-tight">
              <h2 className="text-base font-bold text-[#191c1d] font-montserrat">
                Shopping Cart
              </h2>
              {totalQty > 0 && (
                <p className="text-[11px] text-gray-500">
                  {totalQty} {totalQty === 1 ? "item" : "items"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-[#f8f9fa] px-4 sm:px-5 py-4">
          {cartItems.length === 0 ? (
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center px-6">
              <span className="w-20 h-20 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4">
                <ShoppingBag className="w-9 h-9 text-gray-300" />
              </span>
              <p className="text-base font-bold text-gray-800 font-montserrat">
                Your cart is empty
              </p>
              <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
                Add your favorite products and they will show up here.
              </p>
              <button
                onClick={onClose}
                className="mt-5 h-11 px-6 rounded-xl bg-[#00503a] hover:bg-[#003828] text-white text-sm font-bold transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {cartItems.map((item) => {
                const chips = variantChips(item);
                const max = maxQtyFor(item);
                const atMax = item.quantity >= max;

                return (
                  <li
                    key={`${item.product.id}-${chips.join("|")}`}
                    className="flex gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-xs"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-[72px] h-[72px] rounded-xl object-cover border border-gray-100 shrink-0 bg-gray-50"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(getCartLineKey(item))}
                          aria-label={`Remove ${item.product.name}`}
                          title="Remove"
                          className="-mt-1 -mr-1 w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {chips.map((chip) => (
                            <span
                              key={chip}
                              className="text-[10px] bg-emerald-50 text-[#00503a] font-bold px-1.5 py-0.5 rounded border border-emerald-200"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-500 mt-1">
                        {formatPrice(getCartItemPrice(item))} each
                      </p>

                      <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
                        {/* Quantity stepper */}
                        <div className="flex items-center border border-gray-200 rounded-xl bg-white">
                          <button
                            onClick={() =>
                              onUpdateQuantity(
                                getCartLineKey(item),
                                item.quantity - 1,
                              )
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                            className="w-9 h-9 rounded-l-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-[#00503a]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              onUpdateQuantity(
                                getCartLineKey(item),
                                item.quantity + 1,
                              )
                            }
                            disabled={atMax}
                            aria-label="Increase quantity"
                            className="w-9 h-9 rounded-r-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-extrabold text-[#00503a] font-montserrat">
                          {formatPrice(getCartItemPrice(item) * item.quantity)}
                        </span>
                      </div>

                      {atMax && max < 99 && (
                        <p className="text-[11px] font-semibold text-amber-600 mt-1.5">
                          Only {max} in stock
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-4 sm:px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.12)] space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-gray-600">
                Subtotal
              </span>
              <span className="text-xl font-extrabold text-[#00503a] font-montserrat">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 -mt-1.5">
              Delivery charge is added at checkout.
            </p>

            {onDirectCheckout && (
              <button
                id="cart-direct-checkout-btn"
                onClick={() => {
                  onClose();
                  onDirectCheckout();
                }}
                className="w-full h-12 bg-[#00503a] hover:bg-[#003828] text-white rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.98]"
              >
                <PackageCheck className="w-5 h-5 text-[#9ef4d0]" />
                <span>Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <a
              id="cart-whatsapp-checkout-btn"
              href={getWhatsAppCartOrderLink(cartPayload, totalAmount)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 bg-[#25D366] hover:bg-[#20b858] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              <span>Send Order via WhatsApp</span>
            </a>

            <button
              onClick={handleClear}
              className={`w-full h-9 text-xs font-semibold text-center cursor-pointer transition-colors rounded-lg ${
                confirmClear
                  ? "bg-red-50 text-red-600"
                  : "text-gray-500 hover:text-red-600"
              }`}
            >
              {confirmClear ? "Tap again to remove all items" : "Clear Cart"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
