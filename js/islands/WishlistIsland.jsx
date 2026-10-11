/**
 * WishlistIsland — live stat strip liste želja (React island).
 *
 * Prikazuje broj sačuvanih proizvoda i približnu vrednost liste; sinhronizuje
 * se sa vanilla wishlist-om (localStorage 'dalli_wishlist'). Read-only —
 * toggle ostaje vanilla (app.jsx). Kad je lista prazna, island ne renderuje
 * ništa (pozorište ostaje prazno, bez duplog UI).
 *
 * Mount: <div data-island="wishlist"></div>
 */

import { usePrice, useWishlist } from './useStore.js';

export default function WishlistIsland() {
  const wishlist = useWishlist();
  const valueText = usePrice(wishlist.reduce((sum, w) => sum + Number(w.price || 0), 0));

  if (wishlist.length === 0) return null;

  const card = {
    marginBottom: 'var(--space-8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 'var(--space-4)',
    padding: 'var(--space-5) var(--space-6)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-divider)',
  };
  const stat = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    fontSize: 'var(--fs-sm)',
    color: 'var(--color-text-secondary)',
  };
  const value = {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--fw-light)',
    color: 'var(--color-text)',
  };
  const label = { fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' };

  return (
    <section className="island wishlist-status" aria-label="Statistika liste želja" style={card}>
      <div style={stat}>
        <span
          style={{
            display: 'inline-block',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-full)',
            fontWeight: 'var(--fw-semibold)',
            fontSize: 'var(--fs-sm)',
            background: 'var(--color-primary, #1a1a2e)',
            color: '#fff',
          }}
        >
          {wishlist.length}
        </span>
        <div>
          <div style={label}>Proizvoda u listi želja</div>
          <div style={value}>{valueText}</div>
        </div>
      </div>
      <a href="/proizvodi.html" className="btn btn-secondary">
        Nastavi kupovinu
      </a>
    </section>
  );
}
