/**
 * useStore.js — React bridge nad vanilla signal store-ima DALLI-ja.
 *
 * KLJUČ DIZAJNA: islands dijele ISTE module instance (state/core/locale)
 * kao i vanilla app.jsx (isti bundle, ESM singletoni), pa:
 *   - React island čita isti cart/user signal kao vanilla UI,
 *   - React island MOŽE pisati u cart (clearCart/updateCartQty) i vanilla UI
 *     se ažurira trenutno (istog subscribe lanca),
 *   - nema duplikacije business logike — samo se predstavlja postojeće stanje.
 *
 * UI NAPOMENA: react islands chunk se učitava dinamički (jer loader koristi
 * import('react')), ali state/core chunks su već prisutni na svakoj stranici
 * (app.jsx ih već puni), pa ovaj bridge NE dodaje initial bytes.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';

import { getCart, getCartTotals, subscribeToCart } from '../state/cart.js';
import { formatPrice, getCurrency, subscribeToCurrency } from '../state/locale.js';
import { getUser, subscribeToUser } from '../state/user.js';

const WISHLIST_KEY = 'dalli_wishlist';

const readWishlist = () => {
  try {
    return JSON.parse(window.localStorage.getItem(WISHLIST_KEY) || '[]');
  } catch (err) {
    console.warn('[islands] neispravan dalli_wishlist:', err);
    return [];
  }
};

/** Live stanje korpe (najnoviji snapshot). */
export function useCart() {
  return useSyncExternalStore(
    callback => subscribeToCart(callback),
    () => getCart()
  );
}

/** Live kalkulisani totali korpe (uklj. crypto popust preko korisnika). */
export function useCartTotals() {
  // Subscribi polje korpe (i korisnika) da se totali preračunaju na svaku promenu.
  const cart = useCart();
  const user = useUser();
  void cart;
  return getCartTotals(!!user?.cryptoWallet);
}

/** Live korisnik (ili null za gosta). */
export function useUser() {
  return useSyncExternalStore(
    callback => subscribeToUser(callback),
    () => getUser()
  );
}

/** Live formatiran cena (reaguje i na promenu valute). */
export function usePrice(amount) {
  const currency = useSyncExternalStore(
    callback => subscribeToCurrency(callback),
    () => getCurrency()
  );
  return formatPrice(amount, currency);
}

/**
 * Live wishlist. Nema zaseban signal store (vanilla piše direktno u
 * localStorage), pa se re-sinhronizuje posle:
 *  - storage događaja (druge kartice),
 *  - fokus na tab (korisnik se vrati),
 *  - klika na bilo koji [data-action="wishlist"],
 *  - tihog heartbeata dok je island montiran.
 * setState se poziva samo kada se content stvarno promeni.
 */
export function useWishlist() {
  const [items, setItems] = useState(() => readWishlist());

  useEffect(() => {
    let lastKey = items.map(w => w.variantId || w.id).join('|');

    const sync = () => {
      const next = readWishlist();
      const key = next.map(w => w.variantId || w.id).join('|');
      if (key !== lastKey) {
        lastKey = key;
        setItems(next);
      }
    };

    const onDocumentClick = event => {
      const target =
        event.target && typeof event.target.closest === 'function'
          ? event.target.closest('[data-action="wishlist"]')
          : null;
      if (target) sync();
    };

    const interval = window.setInterval(sync, 2000);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('click', onDocumentClick);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  return items;
}

const ORDERS_STORAGE_KEY = 'dalli_orders';

const readOrdersList = () => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (err) {
    console.warn('[islands] neispravan dalli_orders:', err);
    return [];
  }
};

/**
 * Live lista narudžbina (vanilla app.jsx piše `dalli_orders`, bez signal
 * store-a). Re-sinhronizuje se kao i wishlist: heartbeat + storage/focus.
 */
export function useOrders() {
  const [orders, setOrders] = useState(() => readOrdersList());

  useEffect(() => {
    let lastKey = orders.map(o => o.id).join('|');

    const sync = () => {
      const next = readOrdersList();
      const key = next.map(o => o.id).join('|');
      if (key !== lastKey) {
        lastKey = key;
        setOrders(next);
      }
    };

    const interval = window.setInterval(sync, 2000);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return orders;
}
