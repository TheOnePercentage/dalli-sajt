/**
 * LoyaltyIsland — „Status roadmap" kartica (React island).
 *
 * Dodatna, sabežljiva komponenta: ne menja postojeći vanilla loyalty UI,
 * već prikazuje put kroz tierove (member → silver → gold → black).
 * Podaci se mogu proslediti preko data-props (spent, currentTier) ili
 * koristiti interne vrednosti (iz data/loyalty.json).
 *
 * Mount: <div data-island="loyalty"></div>
 */

const TIERS = [
  {
    id: 'member',
    name: 'Član',
    minSpent: 0,
    minOrders: 0,
    discount: 10,
    color: '#6B7280',
    nextLabel: 'do Srebra',
  },
  {
    id: 'silver',
    name: 'Srebro',
    minSpent: 100000,
    minOrders: 3,
    discount: 12,
    color: '#9CA3AF',
    nextLabel: 'do Zlata',
  },
  {
    id: 'gold',
    name: 'Zlato',
    minSpent: 500000,
    minOrders: 8,
    discount: 15,
    color: '#F59E0B',
    nextLabel: 'do Black',
  },
  {
    id: 'black',
    name: 'Black',
    minSpent: 1000000,
    minOrders: 15,
    discount: 20,
    color: '#111827',
    nextLabel: 'maksimalni status',
  },
];

const formatRsd = amount => Number(amount || 0).toLocaleString('sr-RS');

function currentTierIndex(spent, tiers) {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (spent >= tiers[i].minSpent) return i;
  }
  return 0;
}

function progressPercent(spent, tier, nextTier) {
  if (!nextTier) return 100;
  const span = nextTier.minSpent - tier.minSpent;
  if (span <= 0) return 100;
  const into = Math.max(0, spent - tier.minSpent);
  return Math.min(100, Math.round((into / span) * 100));
}

export default function LoyaltyIsland(props = {}) {
  const spent = Number(props.spent) || 0;
  const idx = currentTierIndex(spent, TIERS);
  const current = TIERS[idx];
  const next = TIERS[idx + 1];
  const pct = progressPercent(spent, current, next);

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
  };
  const row = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-2) 0',
    borderTop: '1px solid var(--color-border)',
    fontSize: 'var(--fs-sm)',
    color: 'var(--color-text-secondary)',
  };

  return (
    <section
      className="island loyalty-roadmap"
      aria-label="Tvoj put kroz DALLI status"
      style={card}
    >
      <h3 style={title}>Put do Black — status roadmap</h3>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-2)',
            fontSize: 'var(--fs-sm)',
          }}
        >
          <span>
            Trenutno: <strong>{current.name}</strong>{' '}
            {next ? ` · ${next.nextLabel}` : ' · najviši status'}
          </span>
          <span style={{ fontWeight: 'var(--fw-semibold)' }}>{pct}%</span>
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
              background: 'linear-gradient(90deg, #6B7280, #F59E0B)',
              transition: 'width .5s var(--ease-out)',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 'var(--space-2)',
            fontSize: 'var(--fs-xs)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          <span>Potrošeno: {formatRsd(spent)} RSD</span>
          {next ? (
            <span>
              Preostalo: {formatRsd(Math.max(0, next.minSpent - spent))} RSD do {next.name}
            </span>
          ) : (
            <span>Najviši status dostignut</span>
          )}
        </div>
      </div>

      <div className="loyalty-roadmap__tiers">
        {TIERS.map(tier => {
          const isActive = tier.id === current.id;
          const badge = isActive
            ? {
                padding: '2px var(--space-3)',
                borderRadius: 'var(--radius-full)',
                fontWeight: 'var(--fw-semibold)',
                fontSize: 'var(--fs-xs)',
                color: '#fff',
                backgroundColor: tier.color,
                border: 'none',
              }
            : {
                padding: '2px var(--space-3)',
                borderRadius: 'var(--radius-full)',
                fontWeight: 'var(--fw-semibold)',
                fontSize: 'var(--fs-xs)',
                color: tier.color === '#111827' ? '#fff' : 'var(--color-text-tertiary)',
                backgroundColor: tier.color === '#111827' ? '#111827' : 'transparent',
                border: '1px solid var(--color-border)',
              };
          return (
            <div key={tier.id} style={row}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={badge}>{tier.name}</span>
                <span>{tier.discount}% popusta</span>
              </span>
              <span>od {formatRsd(tier.minSpent)} RSD</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
