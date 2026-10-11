/**
 * AuthIsland — React „nalog" kartica (autentifikacija + brze akcije).
 *
 * Živi na profile.html (koji ima app.jsx, pa data-action="login" pokreće
 * vanilla login modal). Odjava se vrši kroz shared store (logoutUser) —
 * vanilla UI se ažurira preko istog signal lanca.
 *
 * Mount: <div data-island="auth" data-props="{}"></div>
 */

import { logoutUser } from '../state/user.js';
import { useUser } from './useStore.js';

export default function AuthIsland() {
  const user = useUser();

  const card = {
    marginBottom: 'var(--space-6)',
    padding: 'var(--space-5)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-divider)',
  };
  const chip = {
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    fontSize: 'var(--fs-xs)',
    color: 'var(--color-text-secondary)',
  };
  const link = {
    color: 'var(--color-text)',
    textDecoration: 'none',
    fontSize: 'var(--fs-sm)',
  };

  if (!user) {
    return (
      <div style={card} data-region="auth">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div>
            <strong style={{ fontSize: 'var(--fs-sm)' }}>Niste prijavljeni</strong>
            <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
              Prijavite se za 15% kripto popust, loyalty poene i istoriju narudžbina.
            </p>
          </div>
          <button type="button" className="btn btn-outline btn-sm" data-action="login" style={{ fontSize: 'var(--fs-sm)' }}>
            Prijavi se
          </button>
        </div>
      </div>
    );
  }

  const initials = (user.name || user.email || 'N') .trim().charAt(0).toUpperCase();
  const tier = user.loyalty?.tierLabel || user.tierLabel || (user.discount ? `Popust ${user.discount}%` : 'Član');

  return (
    <div style={card} data-region="auth">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--text-lg)' }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)' }}>{user.name || user.email}</strong>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={chip}>⭐ {tier}</span>
            {user.cryptoWallet && <span style={chip}>₿ Kripto 15%</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <a href="/orders.html" style={link} className="btn btn-ghost btn-sm">Narudžbine</a>
          <a href="/wishlist.html" style={link} className="btn btn-ghost btn-sm">Želje</a>
          <a href="/settings.html" style={link} className="btn btn-ghost btn-sm">Podešavanja</a>
          <button type="button" className="btn btn-outline btn-sm" style={{ fontSize: 'var(--fs-sm)' }}
            onClick={() => {
              logoutUser();
              window.dispatchEvent(new window.Event('dalli:user:logout-island'));
            }}>
            Odjavi se
          </button>
        </div>
      </div>
    </div>
  );
}