/**
 * ProfileIsland — React „dashboard" nad nalogom: KPI kartice (narudžbine,
 * potrošeno, korpa, želje) iz zajedničkog stanja i localStorage-a.
 * Aditivno — ne dira postojeće forme.
 *
 * Mount: <div data-island="profile" data-props="{}"></div>
 */

import { readOrders, orderStats, formatOrderDate } from './lib/orders.js';
import { useCartTotals, usePrice, useUser, useWishlist } from './useStore.js';

export default function ProfileIsland() {
  const user = useUser();
  const totals = useCartTotals();
  const wishlist = useWishlist();
  const stats = orderStats(readOrders(), user?.id);

  const items = [
    { label: 'Narudžbine', value: String(stats.count), href: '/orders.html' },
    { label: 'Potrošeno', value: usePrice(stats.totalSpent), href: '/orders.html' },
    { label: 'Korpa', value: String(totals.itemCount), href: '/cart.html' },
    { label: 'Lista želja', value: String(wishlist.length), href: '/wishlist.html' },
  ];

  const card = {
    marginBottom: 'var(--space-8)',
    padding: 'var(--space-5)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-divider)',
  };

  return (
    <div style={card} data-region="profile">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)' }}>
          {user ? `Dobrodošli nazad, ${(user.name || 'korisniče').split(' ')[0]}` : 'Pregled naloga'}
        </strong>
        {stats.lastOrder && (
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>
            Poslednja porudžbina: {formatOrderDate(stats.lastOrder.createdAt)}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
        {items.map(item => (
          <a key={item.label} href={item.href} style={{ textDecoration: 'none', color: 'inherit', padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-btn)', border: '1px solid var(--color-divider)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-medium)', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>{item.value}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
          </a>
        ))}
      </div>
    </div>
  );
}