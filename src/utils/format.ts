export const formatPrice = (price: number | string): string => {
  const num = typeof price === "string" ? parseFloat(price) || 0 : price;
  return `${num} tk`;
};
