import { CartItem } from "../types";

/** Variant choices a customer makes on the product page. */
export interface CartItemOptions {
  selectedModel?: string;
  selectedSize?: string;
  selectedColor?: string;
}

/**
 * One cart line = product + model + size + color.
 * "T-shirt / M / Red" and "T-shirt / L / Red" are two different lines.
 */
export const getCartLineKey = (
  item: Pick<
    CartItem,
    "product" | "selectedModel" | "selectedSize" | "selectedColor"
  >,
): string =>
  [
    item.product.id,
    item.selectedModel || "",
    item.selectedSize || "",
    item.selectedColor || "",
  ].join("::");
