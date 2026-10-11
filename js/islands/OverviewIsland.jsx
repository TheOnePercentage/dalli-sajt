/**
 * OverviewIsland — Pregled naloga (KPI kartice, loyalty status, brze akcije)
 * Mount: <div data-island="overview" data-props="{}"></div>
 */

import { useUser } from './useStore.js';
import { orderStats, readOrders } from './lib/orders.js';
import { useCartTotals, usePrice, useWishlist } from './useStore.js';

export default function OverviewIsland() {
  const user = useUser();
  const totals = useCartTotals();
  const wishlist = useWishlist();
  const stats = orderStats(readOrders(), user?.id);

  if (!user) {
    return (
      <section style={{
        padding: 'var(--space-6)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        textAlign: 'center'
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-3)' }}>
          Dobrodošli na DALLI
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Prijavite se da biste videli pregled svog naloga.
        </p>
        <button className="btn btn-primary" data-action="login">Prijavi se</button>
      </section>
    );
  }

  const statsData = orderStats(readOrders(), user.id);
  const items = [
    { label: 'Narudžbine', value: String(stats.count), href: '/orders.html' },
    { label: 'Potrošeno', value: usePrice(stats.totalSpent), href: '/orders.html' },
    { label: 'Korpa', value: String(totals.itemCount), href: '/cart.html' },
    { label: 'Lista želja', value: String(wishlist.length), href: '/wishlist.html' },
  ];

  return (
    <section style={{
      marginBottom: 'var(--space-8)',
      padding: 'var(--space-6)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)'
    }} data-region="overview">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)' }}>
          Pregled naloga
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
        {items.map(item => (
          <a key={item.label} href={item.href} style={{ textDecoration: 'none', color: 'inherit', padding: 'var(--space-4)', background: 'var(--color-bg)', borderRadius: 'var(--radius-btn)', border: '1px solid var(--color-divider)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-medium)', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>{item.value}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
          </a>
        ))}
      </div>
    </section>
  );
}