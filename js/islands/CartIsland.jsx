/**
 * CartIsland — live „Korpa status" panel (React island, data-synced).
 *
 * Čita postojeće stanje korpe kroz zajednički signal store (isto kao vanilla
 * UI), tako da se sve ažurira u realnom vremenu bez duplikacije logike.
 * „Prazni korpu" upisuje kroz clearCart() — vanilla brojač se ažurira odmah
 * (dokaz bidirekcionog bridge-a).
 *
 * Mount: <div data-island="cart"></div>
 * data-props (opciono): { actions: false } — sakrij primarne CTA (npr. na čekautu)
 */

import { clearCart, FREE_SHIPPING_THRESHOLD } from '../state/cart.js';

import { useCartTotals, usePrice } from './useStore.js';

export default function CartIsland(props = {}) {
  const totals = useCartTotals();
  const remainingText = usePrice(totals.freeShippingRemaining);
  const subtotalText = usePrice(totals.subtotal);
  const shippingText = usePrice(totals.shipping);
  const totalText = usePrice(totals.total);
  const cryptoText = usePrice(totals.cryptoDiscount);

  const showActions = props.actions !== false;
  const pct = Math.min(100, (totals.subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const isFree = totals.freeShippingRemaining <= 0;

  const card = {
    marginBottom: 'var(--space-8)',
    padding: 'var(--space-6)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-divider)',
  };
  const title = {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--fw-light)',
    marginBottom: 'var(--space-4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };
  const row = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: 'var(--space-2) 0',
    fontSize: 'var(--fs-sm)',
    color: 'var(--color-text-secondary)',
  };
  const totalRow = {
    ...row,
    borderTop: '1px solid var(--color-border)',
    marginTop: 'var(--space-2)',
    paddingTop: 'var(--space-3)',
    fontWeight: 'var(--fw-semibold)',
    color: 'var(--color-text)',
  };
  const badge = {
    padding: '2px var(--space-3)',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--fs-xs)',
    fontWeight: 'var(--fw-semibold)',
    background: totals.itemCount > 0 ? 'var(--color-primary, #1a1a2e)' : 'var(--color-border)',
    color: totals.itemCount > 0 ? '#fff' : 'var(--color-text-tertiary)',
  };

  return (
    <section className="island cart-status" aria-label="Status korpe" style={card}>
      <h3 style={title}>
        <span>Korpa — status</span>
        <span style={badge}>{totals.itemCount} st.</span>
      </h3>

      {totals.itemCount === 0 ? (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
          Korpa je trenutno prazna.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
                fontSize: 'var(--fs-sm)',
              }}
            >
              <span>{isFree ? '✓ Besplatna dostava' : 'Besplatna dostava iznad 5.000 RSD'}</span>
              <span style={{ fontWeight: 'var(--fw-semibold)' }}>
                {isFree ? '0 RSD' : `${Math.round(pct)}%`}
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: 'var(--color-border)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 'var(--radius-full)',
                  background: isFree
                    ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                    : 'linear-gradient(90deg, #6B7280, #F59E0B)',
                  transition: 'width .5s var(--ease-out)',
                }}
              />
            </div>
            <div
              style={{
                marginTop: 'var(--space-2)',
                fontSize: 'var(--fs-xs)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {isFree ? 'Dostava je besplatna.' : `Još ${remainingText} do besplatne dostave.`}
            </div>
          </div>

          <div style={row}>
            <span>Artikli</span>
            <span>{totals.itemCount} kom.</span>
          </div>
          <div style={row}>
            <span>Međuzbir</span>
            <span>{subtotalText}</span>
          </div>
          <div style={row}>
            <span>Dostava</span>
            <span>{shippingText}</span>
          </div>
          {totals.cryptoDiscount > 0 && (
            <div style={{ ...row, color: 'var(--color-success, #16a34a)' }}>
              <span>Kripto popust (15%)</span>
              <span>−{cryptoText}</span>
            </div>
          )}
          <div style={totalRow}>
            <span>Ukupno</span>
            <span>{totalText}</span>
          </div>

          {showActions && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <a href="/checkout.html" className="btn btn-primary" style={{ flex: 1 }}>
                Nastavite na Čekaut
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => clearCart()}
                aria-label="Prazni korpu"
              >
                Prazni
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
