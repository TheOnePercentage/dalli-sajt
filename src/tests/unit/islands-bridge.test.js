import { describe, it, expect, beforeEach } from 'vitest';

import {
  CART_STORAGE_KEY,
  addToCart,
  clearCart,
  getCart,
  getCartTotals,
  removeFromCart,
  subscribeToCart,
  updateCartQty
} from '../../../js/state/cart.js';

import { formatPrice } from '../../../js/state/locale.js';

/**
 * Faza 2B — test reflektuje deo koji React islands dele sa vanilla store-om
 * (isti ESM signletoni). Proverava upravo ono na čemu CartIsland/WishlistIsland
 * grade: čitanje zajedničkog stanja + pisanje (clearCart) sa propagacijom.
 */
describe('React Islands bridge — zajednički signal store (Faza 2B)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCart();
  });

  it('dodaje proizvod u zajednički store i objavljuje promenu', () => {
    const seen = [];
    const unsubscribe = subscribeToCart((cart) => seen.push(cart));

    addToCart(
      { id: 'p1', name: 'Duks', price: 2900, images: { main: '/x.jpg' } },
      { color: 'black', size: 'M', price: 2900, image: '/x.jpg' }
    );

    expect(getCart()).toHaveLength(1);
    expect(seen.length).toBeGreaterThan(0);

    const persisted = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    expect(persisted).toHaveLength(1);

    unsubscribe();
  });

  it('getCartTotals daje besplatnu dostavu preko praga (FREE_SHIPPING_THRESHOLD)', () => {
    addToCart(
      { id: 'p2', name: 'Odelo', price: 6000, images: { main: '/x.jpg' } },
      { color: 'navy', size: 'L', price: 6000, image: '/x.jpg' }
    );

    const totals = getCartTotals(false);
    expect(totals.itemCount).toBe(1);
    expect(totals.shipping).toBe(0);
    expect(totals.freeShippingRemaining).toBe(0);
  });

  it('updateCartQty i removeFromCart prolaze kroz isti signal (qty steppers)', () => {
    addToCart(
      { id: 'p3', name: 'Majica', price: 1900, images: { main: '/x.jpg' } },
      { color: 'white', size: 'S', price: 1900, image: '/x.jpg' }
    );

    updateCartQty('p3-white-S', 1);
    expect(getCart()[0].qty).toBe(2);

    removeFromCart('p3-white-S');
    expect(getCart()).toHaveLength(0);
  });

  it('clearCart prazni store i localStorage (dugme „Prazni" u CartIsland)', () => {
    addToCart(
      { id: 'p4', name: 'Duksevi', price: 2500, images: { main: '/x.jpg' } },
      { color: 'grey', size: 'M', price: 2500, image: '/x.jpg' }
    );

    clearCart();
    expect(getCart()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]')).toHaveLength(0);
  });

  it('formatPrice vraća formatiran string bez obzira na valutu', () => {
    expect(typeof formatPrice(0)).toBe('string');
    expect(typeof formatPrice(1234)).toBe('string');
  });
});