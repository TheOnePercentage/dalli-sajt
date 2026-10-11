/**
 * ConfiguratorIsland — React „konfigurator proizvoda" za generisane SSG
 * product stranice (koje inače NEMAJU app.jsx i čiji su vanilla ATC dućmi
 * mrtvi). Prvo React mesto na kome korisnik uopšte može da kupi direktno.
 *
 * Aditivno + sigurno:
 *  - čita veličine/boje iz postojećeg mrtvog vanilla markupa (.size-btn,
 *    .color-swatch) — bez duplikacije podataka,
 *  - upisuje u ZAJEDNIČKI signal store (addToCart) — korpa i all na ostalim
 *    stranicama (cart.html, checkout, drawer) se ažuriraju istog momenta,
 *  - sadrži i „Pronađi svoju veličinu" mini-quiz iz islands/lib/fit.js.
 *
 * Mount: <div data-island="configurator" data-props="{ id, name, price,
 *        basePrice, currency, image, inStock, preorder }"></div>
 */

import { useCallback, useMemo, useState } from 'react';

import { addToCart } from '../state/cart.js';
import { recommendSize, FIT_LEVELS, BODY_TYPES, SIZE_ORDER } from './lib/fit.js';
import { useCartTotals, usePrice, useWishlist } from './useStore.js';

const WISHLIST_KEY = 'dalli_wishlist';

function readSizeOptions() {
  const btns = Array.from(document.querySelectorAll('.size-btn')).filter(
    b => typeof b.dataset.size === 'string' && b.dataset.size.trim() !== ''
  );
  const sizes = btns.map(b => ({
    size: b.dataset.size,
    available: !(b.classList.contains('unavailable') || b.disabled),
    stock: Number(b.dataset.stock) || 0,
  }));
  return sizes.length > 0 ? sizes : SIZE_ORDER.map(size => ({ size, available: true, stock: 0 }));
}

function readColorOptions() {
  const swatches = Array.from(document.querySelectorAll('.color-swatch'));
  return swatches.map(s => {
    const match = /background:\s*([^;]+)/.exec(s.getAttribute('style') || '');
    return { name: s.dataset.color || 'N/A', hex: (match && match[1].trim()) || null };
  });
}

function toggleWishlist(item) {
  try {
    const list = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) || '[]');
    const has = list.some(w => w.variantId === item.variantId);
    const next = has ? list.filter(w => w.variantId !== item.variantId) : [item, ...list];
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    return !has;
  } catch (err) {
    console.warn('[islands] wishlist write error:', err);
    return false;
  }
}

export default function ConfiguratorIsland(props = {}) {
  const [sizes] = useState(readSizeOptions);
  const [colors] = useState(readColorOptions);

  const product = useMemo(() => {
    const price = Number(props.price || props.basePrice || 0);
    return {
      id: props.id || '',
      name: props.name || '',
      price,
      images: { main: props.image || '/images/placeholder.jpg' },
    };
  }, [props.id, props.name, props.price, props.basePrice, props.image]);

  const availableSizes = useMemo(() => sizes.filter(s => s.available), [sizes]);
  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState(() => availableSizes[0]?.size || '');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [fitOpen, setFitOpen] = useState(false);
  const [fitState, setFitState] = useState({ bodyType: 'medium', fit: 'regular' });

  const selectedColor = colors[colorIndex] || { name: 'N/A', hex: null };
  const variant = useMemo(
    () => ({
      color: selectedColor.name,
      size,
      image: props.image || '/images/placeholder.jpg',
      price: product.price,
    }),
    [selectedColor.name, size, props.image, product.price]
  );

  const totals = useCartTotals();
  const subtotalText = usePrice(totals.subtotal);
  const freeShippingText = usePrice(totals.freeShippingRemaining);
  const wishlist = useWishlist();
  const wishCount = wishlist.length;

  const inStock = props.inStock !== false;
  const isPreorder = props.preorder === true;

  const handleAdd = useCallback(() => {
    if (!inStock || !product.id) return;
    addToCart(product, variant, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 3000);
  }, [inStock, product, variant, qty]);

  const handleWishlist = useCallback(() => {
    const wasAdded = toggleWishlist({
      id: product.id,
      variantId: `${product.id}-${selectedColor.name || 'one'}-${size}`,
      name: product.name,
      image: props.image || '/images/placeholder.jpg',
      price: product.price,
      color: selectedColor.name,
      size,
      savedAt: Date.now(),
    });
    window.dispatchEvent(new window.Event('storage'));
    window.dispatchEvent(new window.CustomEvent('dalli:wishlist:island', { detail: { added: wasAdded } }));
  }, [product.id, product.name, product.price, selectedColor.name, size, props.image]);

  const rec = useMemo(() => {
    if (!fitOpen) return null;
    return recommendSize({ ...fitState, availableSizes });
  }, [fitOpen, fitState, availableSizes]);

  const applyRecommended = () => {
    if (rec) setSize(rec.size);
  };

  const baseStyles = {
    marginBottom: 'var(--space-5)',
    padding: 'var(--space-5)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-divider)',
    borderRadius: 'var(--radius-card)',
  };
  const label = {
    display: 'block',
    fontSize: 'var(--fs-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-tertiary)',
    marginBottom: 'var(--space-2)',
  };
  const chip = (active) => ({
    border: active ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
    background: active ? 'var(--color-primary)' : 'var(--color-surface)',
    color: active ? '#fff' : 'var(--color-text)',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    fontSize: 'var(--fs-sm)',
  });

  if (!props.id) return null;

  return (
    <div style={baseStyles} data-region="configurator">
      {colors.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <span style={label}>Boja</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {colors.map((c, i) => (
              <button type="button" key={c.name || i} style={chip(i === colorIndex)} onClick={() => setColorIndex(i)} aria-pressed={i === colorIndex}>
                {c.hex ? <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: c.hex, marginRight: 6, verticalAlign: -1 }} /> : null}
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {availableSizes.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <span style={label}>Veličina</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {availableSizes.map(s => (
              <button type="button" key={s.size} style={chip(s.size === size)} onClick={() => setSize(s.size)} aria-pressed={s.size === size}>
                {s.size}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button type="button" style={{ width: 36, height: 36, border: '1px solid var(--color-border)', background: 'var(--color-bg)', borderRadius: 'var(--radius-btn)', cursor: 'pointer', fontSize: 'var(--text-lg)' }} onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Smanji količinu">−</button>
          <span style={{ minWidth: 48, textAlign: 'center', fontWeight: 'var(--fw-semibold)' }}>{qty}</span>
          <button type="button" style={{ width: 36, height: 36, border: '1px solid var(--color-border)', background: 'var(--color-bg)', borderRadius: 'var(--radius-btn)', cursor: 'pointer', fontSize: 'var(--text-lg)' }} onClick={() => setQty(q => q + 1)} aria-label="Povećaj količinu">+</button>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: '1', minWidth: 180 }}
          onClick={handleAdd}
          disabled={!inStock}
        >
          {isPreorder ? 'Prednaruči' : inStock ? 'Dodaj u korpu' : 'Nije dostupno'}
        </button>
        <button type="button" className="btn btn-ghost" style={{ minWidth: 140 }} onClick={handleWishlist}>
          {wishCount ? 'Lista želja ✓' : 'Sačuvaj'}
        </button>
      </div>

      {added && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--color-success)' + '18', borderRadius: 'var(--radius-btn)', marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
          Dodato u korpu. Trenutno u korpi: <strong>{subtotalText}</strong>
          {totals.freeShippingRemaining > 0 ? ` — još ${freeShippingText} do besplatne dostave.` : ' — besplatna dostava!'}{' '}
          <a href="/cart.html" style={{ color: 'var(--color-primary)', fontWeight: 'var(--fw-semibold)' }}>Idi u korpu →</a>
        </div>
      )}

      {!inStock && (
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--fs-sm)' }}>
          Proizvod trenutno nije dostupan. Pogledajte slične proizvode u kolekciji.
        </p>
      )}

      <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-3)' }}>
        <button type="button" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--fs-sm)', padding: 0 }} onClick={() => setFitOpen(o => !o)}>
          {fitOpen ? '▲' : '▼'} Pronađi svoju veličinu
        </button>

        {fitOpen && (
          <div style={{ marginTop: 'var(--space-3)', display: 'grid', gap: 'var(--space-3)' }}>
            <div>
              <span style={label}>Građa</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {BODY_TYPES.map(b => (
                  <button type="button" key={b.id} style={chip(fitState.bodyType === b.id)} onClick={() => setFitState(f => ({ ...f, bodyType: b.id }))}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span style={label}>Kako voliš da stoji?</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {FIT_LEVELS.map(f => (
                  <button type="button" key={f.id} style={chip(fitState.fit === f.id)} onClick={() => setFitState(s => ({ ...s, fit: f.id }))}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {rec && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-btn)', fontStyle: 'normal' }}>
                <strong>Preporučena veličina: {rec.size}</strong>
                <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>{rec.note}</p>
                <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={applyRecommended}>
                  Izaberi {rec.size}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}