/**
 * CartDrawerIsland — React „korpa uklizava sa desne strane" (drawer).
 *
 * Dodaje drawer na stranice KOJE nemaju vanilla drawer: SSG produkt stranice
 * (product-template.html), orders.html, profile.html i wishlist.html.
 * Postojeći header triger korpe se preuzima (link se otvara kao drawer osim
 * pri modifikovanom kliku), a #cartCount se ažurira u živo.
 *
 * Mount: <div data-island="cart-drawer"></div>
 *
 * Na stranicama sa app.jsx (orders/profile/wishlist) koristi se klik handler
 * preko useEffect-a sa stopPropagation, da ne dođe u konflikt sa vanilla
 * handlerom [data-action="cart"] (zatvaranje drawer-a).
 */

import { useEffect, useRef, useState } from 'react';

import { FREE_SHIPPING_THRESHOLD, removeFromCart, updateCartQty } from '../state/cart.js';
import { useCart, useCartTotals, usePrice, useUser } from './useStore.js';

const TRIGGER_SELECTORS = ['[data-action="cart"]', '#cartBtn', '.header__cart', '.cart-link'];

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 9998,
};
const panelStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  height: '100%',
  width: 'min(420px, 100vw)',
  background: 'var(--color-bg, #fff)',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
};
const headStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 'var(--space-5) var(--space-6)',
  borderBottom: '1px solid var(--color-border)',
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--text-h3)',
  fontWeight: 'var(--fw-light)',
};
const closeBtn = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '50%',
  width: 36,
  height: 36,
  cursor: 'pointer',
  fontSize: '1.1rem',
  color: 'var(--color-text)',
};

export default function CartDrawerIsland() {
  const cart = useCart();
  const totals = useCartTotals();
  const user = useUser();
  const subtotalText = usePrice(totals.subtotal);
  const shippingText = usePrice(totals.shipping);
  const totalText = usePrice(totals.total);
  const cryptoText = usePrice(totals.cryptoDiscount);
  const remainingText = usePrice(totals.freeShippingRemaining);

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const pct = Math.min(100, (totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const isFree = totals.freeShippingRemaining <= 0;

  useEffect(() => {
    const onTrigger = e => {
      const isModified = e.metaKey || e.ctrlKey || e.shiftKey || (e.button && e.button !== 0);
      if (isModified) return;
      const tag = (e.currentTarget && e.currentTarget.tagName || '').toLowerCase();
      if (tag === 'a' || e.currentTarget?.matches?.('a')) {
        e.preventDefault();
      }
      e.stopPropagation();
      setOpen(prev => !prev);
    };
    const nodes = [];
    TRIGGER_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(node => {
        node.addEventListener('click', onTrigger);
        nodes.push({ node, onTrigger });
      });
    });
    return () => nodes.forEach(({ node, handler }) => node.removeEventListener('click', handler));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    const count = totals.itemCount || 0;
    const el = document.getElementById('cartCount');
    if (el) el.textContent = String(count);
    const el2 = document.getElementById('cartItemCount');
    if (el2) el2.textContent = String(count);
    document.dispatchEvent(new CustomEvent('cart-drawer:count', { detail: count }));
  }, [totals.itemCount]);

  if (!open) return null;

  return (
    <div data-region="cart-drawer" role="dialog" aria-modal="true" aria-label="Korpa">
      <div style={overlayStyle} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside ref={panelRef} style={panelStyle}>
        <header style={headStyle}>
          <span>Korpa</span>
          <button type="button" onClick={() => setOpen(false)} style={closeBtn} aria-label="Zatvori korpu">
            ✕
          </button>
        </header>

        {cart.length === 0 ? (
          <div style={{ padding: 'var(--space-10) var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--fs-sm)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>🛒</div>
            <p>Vaša korpa je prazna.</p>
            <a href="/catalog.html" className="btn btn-primary" style={{ marginTop: 'var(--space-6)', display: 'inline-flex' }}>
              Pregledajte proizvode
            </a>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-4) var(--space-6)' }}>
              {cart.map(item => (
                <CartRow key={item.variantId} item={item} />
              ))}
            </div>

            <footer style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-4) var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
                <span>{isFree ? '✓ Besplatna dostava' : 'Besplatna dostava iznad 5.000 RSD'}</span>
                <span style={{ fontWeight: 'var(--fw-semibold)' }}>{isFree ? '0 RSD' : `${Math.round(pct)}%`}</span>
              </div>
              <div style={{ height: 8, background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 'var(--space-2)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 'var(--radius-full)',
                    background: isFree ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #6B7280, #F59E0B)',
                    transition: 'width .5s var(--ease-out)',
                  }}
                />
              </div>
              {!isFree && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
                  Još {remainingText} do besplatne dostave.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', padding: 'var(--space-1) 0' }}>
                <span>Međuzbir</span>
                <span>{subtotalText}</span>
              </div>
              {totals.cryptoDiscount > 0 && user?.cryptoWallet && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', color: 'var(--color-success, #16a34a)', padding: 'var(--space-1) 0' }}>
                  <span>Kripto popust (15%)</span>
                  <span>−{cryptoText}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)', padding: 'var(--space-2) 0' }}>
                <span>Ukupno</span>
                <span>{totalText}</span>
              </div>

              <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <a href="/checkout.html" className="btn btn-primary" style={{ textAlign: 'center' }}>
                  Nastavite na Čekaut
                </a>
                <a href="/cart.html" className="btn btn-outline" style={{ textAlign: 'center' }}>
                  Prikaži korpu
                </a>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

function CartRow({ item }) {
  const priceText = usePrice(item.price);
  const qtyBtn = (disabled) => ({
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-btn)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    fontFamily: 'inherit',
  });
  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr auto',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) 0',
        borderBottom: '1px solid var(--color-divider)',
        alignItems: 'center',
      }}
    >
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-btn)', border: '1px solid var(--color-border)' }}
      />
      <div>
        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)' }}>{item.name}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
          {item.size} · {item.color}
        </div>
        <div style={{ fontSize: 'var(--fs-sm)', marginTop: 4 }}>
          {priceText} × {item.qty}
        </div>
        <div style={{ display: 'inline-flex', gap: 'var(--space-2)', marginTop: 6 }}>
          <button type="button" aria-label="Manja količina" style={qtyBtn(item.qty <= 1)} onClick={() => updateCartQty(item.variantId, -1)}>
            −
          </button>
          <button type="button" aria-label="Veća količina" style={qtyBtn(false)} onClick={() => updateCartQty(item.variantId, 1)}>
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Ukloni iz korpe"
        onClick={() => removeFromCart(item.variantId)}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: '1rem' }}
      >
        ✕
      </button>
    </article>
  );
}