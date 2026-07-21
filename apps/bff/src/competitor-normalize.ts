export function computeEffectivePrice(input: {
  list_price?: number | null;
  sale_price?: number | null;
  shipping_addon?: number;
  include_shipping: boolean;
}): number {
  const base =
    input.sale_price ?? input.list_price ?? 0;
  if (!input.include_shipping) {
    return base;
  }
  return base + (input.shipping_addon ?? 0);
}
