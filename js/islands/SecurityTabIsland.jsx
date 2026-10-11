/**
 * SecurityTabIsland — Tab za bezbednost (2FA, sesije, uređaji, promena lozinke)
 * Mount: <div data-island="security-tab" data-props="{}"></div>
 */

import { useState, useEffect } from 'react';
import { useUser } from './useStore.js';
import { updateUser, logoutUser } from '../state/user.js';

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

export default function SecurityTabIsland() {
  const user = useUser();
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [twoFA, setTwoFA] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    if (user) {
      setTwoFA(user.twoFAEnabled === true);
      // Load sessions and devices from API
    }
  }, [user]);

  const toggle2FA = async () => {
    try {
      const newValue = !twoFA;
      await updateUser({ twoFAEnabled: newValue });
      setTwoFA(newValue);
      window.showToast?.(newValue ? 'Dvostepena verifikacija uključenja' : 'Dvostepena verifikacija isključena', 'success');
    } catch (err) {
      console.error('2FA toggle error:', err);
      window.showToast?.('Greška', 'error');
    }
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

  const revokeSession = async (sessionId) => {
    if (!confirm('Da li ste sigurni da želite da odjavite ovaj uređaj?')) return;
    // TODO: API call to revoke session
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    window.showToast?.('Sesija otkazana', 'success');
  };

  const revokeDevice = async (deviceId) => {
    if (!confirm('Da li ste sigurni da želite da uklonite ovaj uređaj?')) return;
    // TODO: API call to revoke device
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    window.showToast?.('Uređaj uklonjen', 'success');
  };

  const revokeAllSessions = async () => {
    if (!confirm('Da li ste sigurni da želite da odjavite sve uređaje?')) return;
    await logoutUser();
    window.showToast?.('Sve sesije su otkazane', 'success');
  };

  if (!user) {
    return (
      <section style={{ padding: 'var(--space-8)', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-light)', marginBottom: 'var(--space-3)' }}>
          Bezbednost
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Prijavite se da biste upravljali bezbednošću naloga.
        </p>
        <button className="btn btn-primary" data-action="login">Prijavi se</button>
      </section>
    );
  }

  return (
    <section data-region="security" style={{ marginBottom: 'var(--space-8)' }}>
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
        <h2 style={titleStyle}>Dvostepena verifikacija (2FA)</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Dodajte dodatni sloj bezbednosti svom nalogu. Prilikom prijavljivanja će vam biti zahtevan kod sa aplikacije autentifikatora.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--color-text)' }}>
          <input
            type="checkbox"
            checked={twoFA}
            onChange={toggle2FA}
            style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
          />
          <span>Dvostepena verifikacija (2FA) je {twoFA ? 'uključena' : 'isključena'}</span>
        </label>
      </div>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Promena lozinke</h2>
        <form onSubmit={changePassword} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
              <label style={labelStyle}>Trenutna lozinka</label>
              <input
                type="password"
                value={password.current}
                onChange={e => setPassword(prev => ({ ...prev, current: e.target.value }))}
                style={inputStyle}
                autoComplete="current-password"
              />
              {errors.current && <small style={{ color: '#b91c1c' }}>{errors.current}</small>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 'var(--space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
              <label style={labelStyle}>Nova lozinka</label>
              <input
                type="password"
                value={password.next}
                onChange={e => setPassword(prev => ({ ...prev, next: e.target.value }))}
                style={inputStyle}
                autoComplete="new-password"
              />
              {errors.next && <small style={{ color: '#b91c1c' }}>{errors.next}</small>}
            </div>
            <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
              <label style={labelStyle}>Potvrda lozinke</label>
              <input
                type="password"
                value={password.confirm}
                onChange={e => setPassword(prev => ({ ...prev, confirm: e.target.value }))}
                style={inputStyle}
                autoComplete="new-password"
              />
              {errors.confirm && <small style={{ color: '#b91c1c' }}>{errors.confirm}</small>}
            </div>
          </div>
          <div>
            <button type="submit" style={btnPrimary}>
              Promeni lozinku
            </button>
          </div>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Aktivne sesije</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Upravljajte uređajima na kojima ste prijavljeni.
        </p>
        {sessions.length === 0 ? (
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--fs-sm)' }}>Nema aktivnih sesija.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {sessions.map(session => (
              <div key={session.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 'var(--fw-bold)' }}>
                    {session.deviceType === 'mobile' ? '📱' : session.deviceType === 'tablet' ? '📟' : '💻'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>{session.deviceName || 'Nepoznat uređaj'}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>
                      {session.location} · {session.browser} · Poslednja aktivnost: {new Date(session.lastActivity).toLocaleString('sr-RS')}
                    </div>
                  </div>
                  {session.current ? (
                    <span style={{ padding: 'var(--space-1) var(--space-2)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)' }}>Trenutni</span>
                  ) : (
                    <button type="button" onClick={() => revokeSession(session.id)} className="btn btn-ghost btn-sm" style={{ fontSize: 'var(--fs-xs)' }}>Odjavi</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

          <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="btn btn-outline" onClick={revokeAllSessions}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 'var(--space-2)' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Odjavi se sa svih uređaja
            </button>
          </div>
        </div>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Pouzdani uređaji</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Ovi uređaji neće zahtevati 2FA kod prilikom budućih prijava.
        </p>
        {devices.length === 0 ? (
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--fs-sm)' }}>Nemate dodatnih pouzdanih uređaja.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {devices.map(device => (
              <div key={device.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 'var(--fw-bold)' }}>
                    {device.type === 'mobile' ? '📱' : device.type === 'tablet' ? '📟' : '💻'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--color-text)' }}>{device.name}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>Dodat: {new Date(device.trustedAt).toLocaleDateString('sr-RS')}</div>
                  </div>
                  <button type="button" onClick={() => revokeDevice(device.id)} className="btn btn-ghost btn-sm" style={{ fontSize: 'var(--fs-xs)' }}>Ukloni</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={titleStyle}>Upravljanje nalogom</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <button type="button" className="btn btn-outline" style={{ justifyContent: 'flex-start', color: 'var(--color-error)', borderColor: 'var(--color-error)' }} onClick={() => {
            if (confirm('Da li ste sigurni da želite da OBRIŠETE svoj nalog? Ova akcija je nepovratna.')) {
              // TODO: API call to delete account
              window.showToast?.('Brisanje naloga nije implementirano', 'info');
            }
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 'var(--space-2)' }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M18 11v6"/></svg>
            Obriši nalog
          </button>
        </div>
      </div>
    </section>
  );
}