/**
 * OrdersIsland — React „order history" panel: venue statistika narudžbina
 * (broj, potrošeno, aktivne, poslednja status) nad dalli_orders + shared
 * user. Aditivno — vanilla lista narudžbina ostaje netaknuta.
 *
 * Mount: <div data-island="orders" data-props="{}"></div>
 */

import { usePrice, useUser } from './useStore.js';
import { orderStats, orderStatusLabel, readOrders } from './lib/orders.js';

export default function OrdersIsland() {
  const user = useUser();
  const stats = orderStats(readOrders(), user?.id);
  const totalText = usePrice(stats.totalSpent);

  const card = {
    marginBottom: 'var(--space-8)',
    padding: 'var(--space-5)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-divider)',
  };
  const kpi = (label, value, extra) => (
    <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-btn)', border: '1px solid var(--color-divider)' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-medium)' }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      {extra && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-primary)', marginTop: 2 }}>{extra}</div>}
    </div>
  );

  return (
    <div style={card} data-region="orders">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
        {kpi('Narudžbine', stats.count)}
        {kpi('Ukupno potrošeno', totalText)}
        {kpi('Aktivne', stats.active)}
        {stats.lastOrder
          ? kpi('Poslednja', orderStatusLabel(stats.lastOrder.status), stats.lastOrder.orderNumber ? `#${stats.lastOrder.orderNumber}` : undefined)
          : kpi('Poslednja', '—')}
      </div>
      {stats.lastOrder && (
        <p style={{ margin: 'var(--space-3) 0 0', fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>
          Porudžbina #{stats.lastOrder.orderNumber || stats.lastOrder.id} — {orderStatusLabel(stats.lastOrder.status)}
        </p>
      )}
    </div>
  );
}