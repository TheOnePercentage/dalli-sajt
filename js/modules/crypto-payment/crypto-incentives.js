import { getCryptoDiscountRate } from '../../services/payment-incentives.js';

export async function calculateCryptoDiscount(subtotal, opts = {}) {
  const rate = opts.discountRate !== undefined ? opts.discountRate : await getCryptoDiscountRate(opts.countryCode, opts.collectionId, opts.productId);
  return Math.round(subtotal * rate);
}
