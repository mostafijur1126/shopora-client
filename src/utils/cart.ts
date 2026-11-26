import { CartItem } from "../types";

/** Variant choices a customer makes on the product page. */
export interface CartItemOptions {
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedVariantKey?: string;
  selectedVariantAttributes?: Record<string, string>;
}

export const getProductVariantKey = (attributes: Record<string, string>) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(attributes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
  );

export const getCartItemVariant = (item: CartItem) =>
  item.product.variants?.find(
    (variant) => variant.key === item.selectedVariantKey,
  );

export const getCartItemPrice = (item: CartItem) => {
  const variant = getCartItemVariant(item);
  return variant ? (variant.salePrice ?? variant.regularPrice) : item.product.price;
};

export const getCartItemStockQty = (item: CartItem) =>
  getCartItemVariant(item)?.stockQty ?? item.product.stockQty ?? 0;

/**
 * One cart line = product + all selected variant choices.
 * "T-shirt / M / Red" and "T-shirt / L / Red" are two different lines.
 */
export const getCartLineKey = (
  item: Pick<
    CartItem,
    | "product"
    | "selectedModel"
    | "selectedSize"
    | "selectedColor"
    | "selectedVariantKey"
  >,
): string =>
  [
    item.product.id,
    item.selectedModel || "",
    item.selectedSize || "",
    item.selectedColor || "",
    item.selectedVariantKey || "",
  ].join("::");
