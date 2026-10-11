/**
 * NotificationsTabIsland — Tab za obaveštenja (email, push, SMS podešavanja)
 * Mount: <div data-island="notifications-tab" data-props="{}"></div>
 */

import { useState, useEffect } from 'react';
import { useUser } from './useStore.js';
import { updateUser } from '../state/user.js';

const labelStyle = {
  display: 'block',
  fontSize: 'var(--fs-xs)',
  color: 'var(--color-text-secondary)',
  marginBottom: 'var(--space-1)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
const inputStyle = {
  width: '100%',
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-btn)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontFamily: 'inherit',
  fontSize: 'var(--fs-sm)',
};
const cardStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-card)',
  padding: 'var(--space-6)',
  marginBottom: 'var(--space-6)',
};
const titleStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: 'var(--text-lg)',
  fontWeight: 'var(--fw-light)',
  marginBottom: 'var(--space-4)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

function Switch({ label, description, checked, onChange, disabled = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, transition: 'background var(--duration-fast)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>{label}</div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-tertiary)' }}>{description}</div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
        />
        <span className="switch-slider" style={{ width: 40, height: 22, borderRadius: 11, background: checked ? 'var(--color-primary)' : 'var(--color-border)', border: '1px solid var(--color-border)', position: 'relative', display: 'inline-block', transition: 'background var(--duration-fast)', flexShrink: 0 }} />
      </label>
    </div>
  );
}

export default function NotificationsTabIsland() {
  const user = useUser();
  const [prefs, setPrefs] = useState({
    emailOrders: true,
    emailPromos: true,
    emailNewsletter: true,
    emailBackInStock: true,
    pushOrders: true,
    pushPromos: false,
    pushPriceDrop: true,
    pushBackInStock: true,
    smsOrders: false,
    smsDelivery: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      // Load preferences from user object or API
      const saved = user.notificationPrefs || {};
      setPrefs(prev => ({ ...prev, ...saved }));
    }
  }, [user]);

  const savePrefs = async () => {
    setSaving(true);
    try {
      await updateUser({ notificationPrefs: prefs });
      window.showToast?.('Podešavanja sačuvana', 'success');
    } catch (err) {
      console.error('Save prefs error:', err);
      window.showToast?.('Greška pri čuvanju', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  if (!user) {
    return (
      <section style={{ padding: 'var(--space-8)', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-3)' }}>
          Obaveštenja
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Prijavite se da biste upravljali obaveštenjima.
        </p>
        <button className="btn btn-primary" data-action="login">Prijavi se</button>
      </section>
    );
  }

  return (
    <section data-region="notifications" style={{ marginBottom: 'var(--space-8)' }}>
      <header style={{ display: 'flex', justifyContent: 'spaceBetween', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-light)' }}>
          Obaveštenja
        </h2>
        <button className="btn btn-primary" onClick={savePrefs} disabled={saving} style={{ marginLeft: 'auto' }}>
          {saving ? 'Snimanje...' : 'Sačuvaj izmene'}
        </button>
      </header>

      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-6)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-4)' }}>
            Email obaveštenja
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-4)' }}>
            Upravljajte kakva obaveštenja želite da primate na email.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Switch
              label="Status narudžbine"
              description="Potvrda porudžbine, slanje, isporuka, vraćanja"
              checked={prefs.emailOrders}
              onChange={v => handleChange('emailOrders', v)}
            />
            <Switch
              label="Promocije i popusti"
              description="Ekskluzivni popusti, flash prodaje, sezonske akcije"
              checked={prefs.emailPromos}
              onChange={v => handleChange('emailPromos', v)}
            />
            <Switch
              label="Newsletter"
              description="Nedeljni pregledi novih kolekcija i trendova"
              checked={prefs.emailNewsletter}
              onChange={v => handleChange('emailNewsletter', v)}
            />
            <Switch
              label="Vraćanje na stanje"
              description="Obaveštenje kada proizvod bude ponovo na stanju"
              checked={prefs.emailBackInStock}
              onChange={v => handleChange('emailBackInStock', v)}
            />
          </div>
        </section>

        <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-6)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-4)' }}>
            Push obaveštenja (mobilna aplikacija)
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-4)' }}>
            Upravljajte push obaveštenjima na mobilnom uređaju.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Switch
              label="Status narudžbine"
              description="Promene statusa porudžbine u realnom vremenu"
              checked={prefs.pushOrders}
              onChange={v => handleChange('pushOrders', v)}
            />
            <Switch
              label="Promocije"
              description="Specijalne ponude i limitirane akcije"
              checked={prefs.pushPromos}
              onChange={v => handleChange('pushPromos', v)}
            />
            <Switch
              label="Pad cene"
              description="Obaveštenje kada cena proizvoda sa liste želja padne"
              checked={prefs.pushPriceDrop}
              onChange={v => handleChange('pushPriceDrop', v)}
            />
            <Switch
              label="Vraćanje na stanje"
              description="Kada proizvod bude ponovo dostupan"
              checked={prefs.pushBackInStock}
              onChange={v => handleChange('pushBackInStock', v)}
            />
          </div>
        </section>

        <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-6)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-4)' }}>
            SMS obaveštenja
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-4)' }}>
            SMS obaveštenja su opcionalna i mogu se naplatiti po vašim tarifama operatera.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Switch
              label="Status narudžbine"
              description="SMS obaveštenja za ključne promene statusa"
              checked={prefs.smsOrders}
              onChange={v => handleChange('smsOrders', v)}
            />
            <Switch
              label="Isporuke"
              description="SMS kod isporuke pošiljke"
              checked={prefs.smsDelivery}
              onChange={v => handleChange('smsDelivery', v)}
            />
          </div>
        </section>

        <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-6)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-4)' }}>
            Frekvencija slanja
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="frequency"
                value="immediate"
                checked={prefs.frequency === 'immediate'}
                onChange={e => handleChange('frequency', e.target.value)}
                style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
              />
              <div>
                <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>Odmah</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>Primi obaveštenje odmah kada se desi</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="frequency"
                value="digest"
                checked={prefs.frequency === 'digest'}
                onChange={e => handleChange('frequency', e.target.value)}
                style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
              />
              <div>
                <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>Dnevni sažetak</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>Jedna poruka dnevno u 09:00h sa svim obaveštenjima</div>
              </div>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              <input
                type="radio"
                name="frequency"
                value="weekly"
                checked={prefs.frequency === 'weekly'}
                onChange={e => handleChange('frequency', e.target.value)}
                style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
              />
              <div>
                <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>Nedeljni sažetak</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>Jedna poruka nedeljno u ponedeljak u 09:00h</div>
              </div>
            </label>
          </div>
        </section>

        <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-6)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-4)' }}>
            Tihi režim
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-4)' }}>
            Privremeno onemogućite sva obaveštenja.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs.doNotDisturb}
              onChange={e => handleChange('doNotDisturb', e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
            />
            <div>
              <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>Tihi režim</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>Ne primajte nikakva obaveštenja do ručno uključenja</div>
            </div>
          </label>
        </section>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-divider)' }}>
          <button className="btn btn-primary" onClick={savePrefs} disabled={saving} style={{ minWidth: 200 }}>
            {saving ? 'Snimanje...' : 'Sačuvaj sve izmene'}
          </button>
        </div>
      </div>
    </section>
  );
}
