/**
 * ProfileTabIsland — Tab za profil (lični podaci, adrese, načini plaćanja, obaveštenja)
 * Mount: <div data-island="profile-tab" data-props="{}"></div>
 */

import { useState, useEffect } from 'react';
import { useUser } from './useStore.js';
import { updateUser, setCryptoWallet } from '../state/user.js';

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
const btnPrimary = {
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-btn)',
  padding: 'var(--space-3) var(--space-6)',
  cursor: 'pointer',
  fontWeight: 'var(--fw-semibold)',
  fontFamily: 'inherit',
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

function Field({ label, children, hint }) {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <small style={{ color: 'var(--color-text-tertiary)' }}>{hint}</small>}
    </div>
  );
}

export default function ProfileTabIsland() {
  const user = useUser();
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '', marketingConsent: false });
  const [initialized, setInitialized] = useState(false);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (user && !initialized) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        marketingConsent: user.marketingConsent === true,
      });
      setInitialized(true);
    }
  }, [user, initialized]);

  const saveProfile = e => {
    e.preventDefault();
    const errs = {};
    if (String(profile.firstName).trim().length < 2) errs.firstName = 'Ime mora imati najmanje 2 znaka.';
    if (String(profile.lastName).trim().length < 2) errs.lastName = 'Prezime mora imati najmanje 2 znaka.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setNotice({ type: 'error', text: 'Proverite označena polja.' });
      return;
    }
    updateUser({
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      phone: profile.phone.trim(),
      marketingConsent: profile.marketingConsent,
    });
    setNotice({ type: 'success', text: 'Profil je sačuvan.' });
  };

  const changePassword = e => {
    e.preventDefault();
    const errs = {};
    if (String(password.current).length < 6) errs.current = 'Unesite trenutnu lozinku (min. 6 znakova).';
    if (String(password.next).length < 8) errs.next = 'Nova lozinka mora imati najmanje 8 znakova.';
    if (password.next !== password.confirm) errs.confirm = 'Lozinke se ne poklapaju.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setNotice({ type: 'error', text: 'Proverite označena polja.' });
      return;
    }
    setPassword({ current: '', next: '', confirm: '' });
    setNotice({ type: 'success', text: 'Lozinka je promenjena (demo — bez poziva na backend).' });
  };

  const toggleCrypto = () => {
    setCryptoWallet(!(user?.cryptoWallet === true));
    setNotice({
      type: 'success',
      text: user?.cryptoWallet ? 'Kripto plaćanje je isključeno.' : 'Kripto plaćanje je uključeno — 15% popusta na svaku porudžbinu.',
    });
  };

  if (!user) {
    return (
      <section style={{ padding: 'var(--space-8)', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-3)' }}>
          Profil
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Prijavite se da biste uređivali podatke profila.
        </p>
        <button className="btn btn-primary" data-action="login">Prijavi se</button>
      </section>
    );
  }

  return (
    <section data-region="profile" style={{ marginBottom: 'var(--space-8)' }}>
      {notice && (
        <div
          role="status"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-btn)',
            marginBottom: 'var(--space-4)',
            fontSize: 'var(--fs-sm)',
            background: notice.type === 'success' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
            color: notice.type === 'success' ? '#166534' : '#b91c1c',
            border: `1px solid ${notice.type === 'success' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {notice.text}
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={titleStyle}>Lični podaci</h2>
        <form onSubmit={saveProfile} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Field label="Ime">
              <input
                type="text"
                value={profile.firstName}
                onChange={e => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                style={inputStyle}
              />
              {errors.firstName && <small style={{ color: '#b91c1c' }}>{errors.firstName}</small>}
            </Field>
            <Field label="Prezime">
              <input
                type="text"
                value={profile.lastName}
                onChange={e => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                style={inputStyle}
              />
              {errors.lastName && <small style={{ color: '#b91c1c' }}>{errors.lastName}</small>}
            </Field>
          </div>
          <Field label="E-mail" hint="E-mail adresa se ne može menjati u samostalnoj instalaciji.">
            <input type="email" value={user.email || ''} disabled style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
          </Field>
          <Field label="Telefon">
            <input
              type="tel"
              value={profile.phone}
              onChange={e => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              style={inputStyle}
              placeholder="+381 6X XXX-XXXX"
            />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={profile.marketingConsent}
              onChange={e => setProfile(prev => ({ ...prev, marketingConsent: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
            />
            Želim da primam obaveštenja o novim proizvodima i promo akcijama.
          </label>
          <div>
            <button type="submit" style={btnPrimary}>
              Sačuvaj izmene
            </button>
          </div>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Lozinka</h2>
        <form onSubmit={changePassword} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <Field label="Trenutna lozinka">
            <input
              type="password"
              value={password.current}
              onChange={e => setPassword(prev => ({ ...prev, current: e.target.value }))}
              style={inputStyle}
              autoComplete="current-password"
            />
            {errors.current && <small style={{ color: '#b91c1c' }}>{errors.current}</small>}
          </Field>
          <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Field label="Nova lozinka">
              <input
                type="password"
                value={password.next}
                onChange={e => setPassword(prev => ({ ...prev, next: e.target.value }))}
                style={inputStyle}
                autoComplete="new-password"
              />
              {errors.next && <small style={{ color: '#b91c1c' }}>{errors.next}</small>}
            </Field>
            <Field label="Potvrda lozinke">
              <input
                type="password"
                value={password.confirm}
                onChange={e => setPassword(prev => ({ ...prev, confirm: e.target.value }))}
                style={inputStyle}
                autoComplete="new-password"
              />
              {errors.confirm && <small style={{ color: '#b91c1c' }}>{errors.confirm}</small>}
            </Field>
          </div>
          <div>
            <button type="submit" style={btnPrimary}>
              Promeni lozinku
            </button>
          </div>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Kripto plaćanje</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Uključite plaćanje kriptovalutama i osvojite 15% popusta na svaku porudžbinu.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--color-text)' }}>
          <input
            type="checkbox"
            checked={user?.cryptoWallet === true}
            onChange={toggleCrypto}
            style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
          />
          Kripto plaćanje je {user?.cryptoWallet === true ? 'uključeno' : 'isključeno'}
        </label>
      </div>
    </section>
  );
}