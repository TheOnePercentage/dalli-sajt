/**
 * WishlistTabIsland — Tab za listu želja
 * Mount: <div data-island="wishlist-tab" data-props="{}"></div>
 */

import { useState, useEffect } from 'react';
import { useWishlist, useUser } from './useStore.js';
import { formatPrice } from '../utils/format.js';

export default function WishlistTabIsland() {
  const user = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadWishlist();
  }, [user]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/wishlist');
      if (!response.ok) throw new Error('Greška pri učitavanju');
      const data = await response.json();
      setItems(data.items || data.wishlist || []);
    } catch (err) {
      console.error('Load wishlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== productId));
        window.showToast?.('Uklonjeno sa liste želja', 'info');
      }
    } catch (err) {
      console.error('Remove wishlist error:', err);
      window.showToast?.('Greška pri uklanjanju', 'error');
    }
  };

  const moveToCart = async (productId) => {
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, qty: 1 })
      });
      if (response.ok) {
        window.showToast?.('Dodato u korpu', 'success');
      }
    } catch (err) {
      console.error('Move to cart error:', err);
      window.showToast?.('Greška', 'error');
    }
  };

  const shareProduct = (productId) => {
    const url = `${window.location.origin}/proizvod.html?id=${productId}`;
    if (navigator.share) {
      navigator.share({ title: 'DALLI proizvod', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        window.showToast?.('Link kopiran', 'success');
      });
    }
  };

  if (!user) {
    return (
      <section style={{ padding: 'var(--space-8)', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-3)' }}>
          Lista želja
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Prijavite se da biste videli अपनी listu želja.
        </p>
        <button className="btn btn-primary" data-action="login">Prijavi se</button>
      </section>
    );
  }

  return (
    <section data-region="wishlist" style={{ marginBottom: 'var(--space-8)' }}>
      <header style={{ display: 'flex', justifyContent: 'spaceBetween', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-light)' }}>
          Lista želja
        </h2>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-tertiary)' }}>
          {items.length} proizvoda
        </span>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-text-tertiary)', margin: '0 auto var(--space-4)' }} aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-light)', color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
            Lista želja je prazna
          </h3>
          <p style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-6)' }}>
            Dodajte proizvode koje vam se sviđaju i kupite ih kada budete spremni.
          </p>
          <a href="/proizvodi.html" className="btn btn-primary" style={{ display: 'inline-flex' }}>Počnite kupovinu</a>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
            {items.map(item => (
              <article key={item.id} className="wishlist-item animate-reveal" data-product-id={item.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', transition: 'box-shadow var(--duration-normal) var(--ease-out)', role: 'listitem' }}>
                <div className="wishlist-item__media" style={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden', background: 'var(--color-bg-subtle)' }}>
                  <img className="wishlist-item__image" src={item.images?.main640 || item.images?.main} alt={item.name} loading="lazy" width="400" height="500" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform var(--duration-slow) var(--ease-out)' }} />
                  {item.images?.badge && <div className="wishlist-item__badge" style={{ position: 'absolute', top: 'var(--space-3)', left: 'var(--space-3)', padding: 'var(--space-1) var(--space-2)', background: 'var(--color-primary)', color: 'var(--color-text-inverse)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)' }}>{item.images.badge}</div>}
                  <button className="wishlist-item__remove" data-action="remove-wishlist" data-product-id={item.id} aria-label={`Ukloni ${item.name} sa liste želja`} style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--duration-fast)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="wishlist-item__content" style={{ padding: 'var(--space-4)' }}>
                  <div className="wishlist-item__header" style={{ display: 'flex', alignItems: 'flexStart', justifyContent: 'spaceBetween', marginBottom: 'var(--space-2)' }}>
                    <span className="wishlist-item__category" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.categoryName || item.category}</span>
                    <div className="wishlist-item__actions" style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn-sm btn-secondary" data-action="move-to-cart" data-product-id={item.id} ariaLabel="Premesti u korpu" style={{ fontSize: 'var(--fs-xs)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 'var(--space-1)' }}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>U korpu</button>
                      <button className="wishlist-item__share" data-action="share-wishlist" data-product-id={item.id} ariaLabel="Podeli" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51a5 5 0 0 1 0 7.07"/><path d="M15.49 13.51a5 5 0 0 1-7.07 0"/></svg>
                      </button>
                    </div>
                  </div>
                  <h3 className="wishlist-item__name" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-medium)', color: 'var(--color-text)', marginBottom: 'var(--space-1)', lineHeight: 1.3 }}>{item.name}</h3>
                  <div className="wishlist-item__meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                    {item.color && <span>{item.color}</span>}
                    {item.size && <span>{item.size}</span>}
                    <span>{item.categoryName || item.category}</span>
                  </div>
                  <div className="wishlist-item__price-row" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'spaceBetween', marginTop: 'var(--space-3)' }}>
                    <div className="wishlist-item__price" style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>
                      {item.salePrice ? <span style={{ textDecoration: 'line-through', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)', marginRight: 'var(--space-2)' }}>{item.price.toLocaleString('sr-RS')} RSD</span> : ''}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-bold)', color: 'var(--color-primary)' }}>{formatPrice(item.salePrice || item.price)} RSD</span>
                    </div>
                    <button className="btn btn-primary btn-sm" data-action="quick-add-wishlist" data-product-id={item.id} style={{ minWidth: '100px' }}>U korpu</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}