export interface WhatsAppProductOrderOptions {
  name: string;
  price?: number;
  sku?: string;
  quantity?: number;
  productId?: string;
  link?: string;
}

/**
 * Generates direct link for a product page on Shopora
 */
export const getProductPageUrl = (productId: string) => {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?product=${encodeURIComponent(productId)}`;
  }
  return `https://Shopora.com/?product=${encodeURIComponent(productId)}`;
};

/**
 * Builds WhatsApp direct order link containing:
 * - Product Name (পণ্যের নাম)
 * - Product Model / SKU (মডেল / কোড)
 * - Direct Product Link (প্রোডাক্ট লিংক)
 * - Price, Quantity & Total Amount
 */
export const getWhatsAppOrderLink = (
  nameOrOptions: string | WhatsAppProductOrderOptions,
  price?: number,
  sku?: string,
  quantity: number = 1,
  productId?: string
) => {
  const phone = '8801700000000'; // Default store WhatsApp number

  let name = '';
  let itemPrice = price;
  let itemSku = sku;
  let qty = quantity;
  let directLink = '';

  if (typeof nameOrOptions === 'object') {
    name = nameOrOptions.name;
    itemPrice = nameOrOptions.price;
    itemSku = nameOrOptions.sku;
    qty = nameOrOptions.quantity || 1;
    directLink =
      nameOrOptions.link ||
      (nameOrOptions.productId ? getProductPageUrl(nameOrOptions.productId) : '');
  } else {
    name = nameOrOptions;
    if (productId) {
      directLink = getProductPageUrl(productId);
    } else if (typeof window !== 'undefined' && window.location?.href) {
      directLink = window.location.href;
    }
  }

  // Fallback for direct link if not generated
  if (!directLink && typeof window !== 'undefined' && window.location?.href) {
    directLink = window.location.href;
  }

  const modelOrSku = itemSku && itemSku.trim() !== '' ? itemSku : 'N/A';
  const totalAmount = itemPrice !== undefined ? itemPrice * qty : undefined;

  let text = `আসসালামুআলাইকুম Shopora,\nআমি সরাসরি এই পণ্যটি অর্ডার করতে চাই:\n\n`;
  text += `📌 পণ্যের নাম: ${name}\n`;
  text += `🔖 মডেল / কোড: ${modelOrSku}\n`;
  if (directLink) {
    text += `🔗 প্রোডাক্ট লিংক: ${directLink}\n`;
  }
  if (itemPrice !== undefined) {
    text += `💰 একক মূল্য: ${itemPrice.toLocaleString()} tk\n`;
  }
  if (qty > 1) {
    text += `🔢 পরিমাণ: ${qty} টি\n`;
  }
  if (totalAmount !== undefined) {
    text += `💵 সর্বমোট মূল্য: ${totalAmount.toLocaleString()} tk\n`;
  }
  text += `\nঅনুগ্রহ করে আমার অর্ডারটি কনফার্ম করুন ও ডেলিভারি ডিটেইলস জানান।`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

/**
 * Builds WhatsApp cart checkout link
 */
export const getWhatsAppCartOrderLink = (
  items: { name: string; quantity: number; price: number; sku?: string; id?: string }[],
  total: number
) => {
  const phone = '8801700000000';
  let text = `আসসালামুআলাইকুম Shopora,\nআমি কার্ট থেকে নিচের পণ্যগুলো অর্ডার করতে চাই:\n\n`;

  items.forEach((item, idx) => {
    const itemSku = item.sku ? ` [মডেল: ${item.sku}]` : '';
    const itemLink = item.id ? `\n   লিংক: ${getProductPageUrl(item.id)}` : '';
    text += `${idx + 1}. ${item.name}${itemSku} x ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} tk${itemLink}\n`;
  });

  text += `\n💵 সর্বমোট প্রদেয় মূল্য: ${total.toLocaleString()} tk\n\nঅনুগ্রহ করে আমার অর্ডারটি কনফার্ম করুন।`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};
