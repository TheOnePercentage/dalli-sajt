/**
 * ConciergeIsland — plutajući „Concierge" widget (React island).
 *
 * Bezbedna, aditivna komponenta: pruža direktan kanal za pomoć/luksuz servis
 * (WhatsApp / e-mail / telefon) bez menjanja postojećeg layout-a.
 * React runtime se učitava tek kada island postoji na stranici.
 *
 * Mount: <div data-island="concierge"></div>
 * data-props (opciono): { title, subtitle, whatsapp, email, phone, hours }
 */

import { useState } from 'react';

const DEFAULTS = {
  title: 'Concierge',
  subtitle: 'Personalni asistent DALLI',
  whatsapp: 'https://wa.me/381600000000',
  email: 'concierge@dalli.rs',
  phone: '+381 60 000 0000',
  hours: 'Pon–Pet 09–21 · Sub 10–18',
};

export default function ConciergeIsland(props = {}) {
  const config = { ...DEFAULTS, ...props };
  const [open, setOpen] = useState(false);

  const fab = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    cursor: 'pointer',
    background: 'var(--color-primary, #1a1a2e)',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: 'var(--fs-sm)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  };

  const panel = {
    position: 'fixed',
    bottom: '84px',
    right: '24px',
    width: '280px',
    zIndex: 999,
    padding: 'var(--space-4)',
    borderRadius: 'var(--radius-card)',
    background: 'var(--color-bg, #fff)',
    border: '1px solid var(--color-divider)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
    fontFamily: 'inherit',
  };

  const link = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-2) 0',
    color: 'var(--color-text, #111)',
    textDecoration: 'none',
    fontSize: 'var(--fs-sm)',
  };

  return (
    <div className="island concierge-widget">
      {open && (
        <div role="dialog" aria-label={config.title} style={panel}>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 'var(--fw-light)',
                fontSize: 'var(--text-lg)',
              }}
            >
              {config.title}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-secondary)' }}>
              {config.subtitle}
            </div>
          </div>

          <a style={link} href={config.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <a style={link} href={`mailto:${config.email}`}>
            {config.email}
          </a>
          <a style={link} href={`tel:${config.phone.replace(/\s/g, '')}`}>
            {config.phone}
          </a>

          <div
            style={{
              marginTop: 'var(--space-2)',
              paddingTop: 'var(--space-2)',
              borderTop: '1px solid var(--color-border)',
              fontSize: 'var(--fs-xs)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {config.hours}
          </div>
        </div>
      )}

      <button
        type="button"
        style={fab}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>{open ? 'Zatvori' : config.title}</span>
      </button>
    </div>
  );
}
