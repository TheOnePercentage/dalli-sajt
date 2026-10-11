/**
 * CheckoutIsland — React „checkout widgeti": kripto-popust toggle (piše u
 * zajednički user store preko setCryptoWallet, računa live uštedu kroz
 * useCartTotals) + trust strip. Aditivno; originalni checkout form ostaje.
 *
 * Mount: <div data-island="checkout" data-props="{}"></div>
 */

import { setCryptoWallet } from '../state/user.js';
import { useCartTotals, usePrice, useUser } from './useStore.js';

export default function CheckoutIsland() {
  const user = useUser();
  const totals = useCartTotals();
  const savingsText = usePrice(totals.cryptoDiscount);
  const cryptoEnabled = !!user?.cryptoWallet;

  const card = {
    marginBottom: 'var(--space-6)',
    padding: 'var(--space-5)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-divider)',
  };

  const toggle = () => {
    if (!user) return;
    setCryptoWallet(!cryptoEnabled);
  };

  return (
    <div style={card} data-region="checkout">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <input
          type="checkbox"
          id="islandCryptoToggle"
          checked={cryptoEnabled}
          onChange={toggle}
          disabled={!user}
          style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
        />
        <label htmlFor="islandCryptoToggle" style={{ flex: 1, minWidth: 180, cursor: user ? 'pointer' : 'not-allowed', fontSize: 'var(--fs-sm)' }}>
          <strong>Plati kriptom i uštedi 15%</strong>
          <span style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: 'var(--fs-xs)' }}>
            {cryptoEnabled ? `Odobren kripto popust — ušteda na ovoj porudžbini: ${savingsText}` : 'Uključite da vidite trenutnu uštedu na vašoj porudžbini.'}
            {!user ? ' (potrebna prijava za kripto popust)' : ''}
          </span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap', fontSize: 'var(--fs-xs)', color: 'var(--color-text-secondary)' }}>
        <span>🔒 Sigurna naplata (SSL)</span>
        <span>↩️ 30 dana za vraćanje</span>
        <span>📦 Besplatna dostava preko 5.000 RSD</span>
        <span>💬 Podrška uživo radnim danima</span>
      </div>
    </div>
  );
}