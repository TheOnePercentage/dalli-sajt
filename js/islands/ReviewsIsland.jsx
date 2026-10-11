/**
 * ReviewsIsland — interaktivni blok „Pišite recenziju" (React island).
 *
 * Aditivno, na SSG stranicama proizvoda. Statistički sažetak i lista recenzija
 * ostaju server-rendered (SEO); ovaj island dodaje živi deo:
 *  - živi sažetak (broj recenzija / prosečna ocena / % verifikovanih),
 *  - formu za pisanje recenzije sa validacijom po data/reviews.json settings,
 *  - prikaz poslatih recenzija (status Na čekanju / Objavljena),
 *  - glas „Pomaže" (login + jedan glas po recenziji).
 *
 * Persistencija: localStorage 'dalli_reviews' (isti ugovor kao vanilla
 * ReviewSystem). JSX koristi postojeći `<button data-action="login">` za login
 * poziv (obrađuje ga vanilla login modal na sajtovima čekauta; na SSG
 * stranicama skače na kartice gde login postoji).
 *
 * Mount: <div data-island="reviews" data-props="{ &quot;productId&quot;:.., &quot;productName&quot;:.. }"></div>
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  canUserReview,
  getProductReviews,
  getReviewStats,
  loadBaseReviews,
  mergeReviews,
  readStoredReviews,
  submitReview,
  validateReview,
  voteHelpful,
} from './lib/reviews.js';
import { useOrders, useUser } from './useStore.js';

const REVIEW_STATUS_LABEL = { approved: 'Objavljena', pending: 'Na čekanju', rejected: 'Odbijena' };
const STATUS_COLOR = { approved: '#16a34a', pending: '#D97706', rejected: '#dc2626' };

const row = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  alignItems: 'center',
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
const btnSecondary = {
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-btn)',
  padding: 'var(--space-3) var(--space-6)',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function Stars({ value, onChange, readOnly }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)', fontSize: '1.5rem' }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= Math.round(value || 0);
        const star = (
          <span style={{ color: filled ? '#F59E0B' : 'var(--color-border)', cursor: readOnly ? 'default' : 'pointer' }}>
            ★
          </span>
        );
        return readOnly ? (
          <span key={n}>{star}</span>
        ) : (
          <button
            key={n}
            type="button"
            aria-label={`Ocena ${n} od 5`}
            aria-pressed={filled}
            onClick={() => onChange(n)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1 }}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewsIsland(props = {}) {
  const user = useUser();
  const orders = useOrders();
  const productId = props.productId;
  const productName = props.productName || 'ovaj proizvod';
  const fileRef = useRef(null);

  const [loaded, setLoaded] = useState(null);
  const [form, setForm] = useState({ rating: 5, title: '', text: '' });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [myReviews, setMyReviews] = useState([]);
  const [voted, setVoted] = useState({});

  useEffect(() => {
    let alive = true;
    loadBaseReviews().then(base => {
      if (!alive) return;
      const stored = readStoredReviews();
      setLoaded({ base, stored });
      const mine = (stored.reviews || []).filter(r => String(r.productId) === String(productId));
      setMyReviews(mine);
    });
    return () => {
      alive = false;
    };
  }, [productId]);

  const uid = user?.id || null;

  useEffect(() => {
    const votes = {};
    for (const r of myReviews) votes[r.id] = (window.localStorage.getItem(`review_vote_${r.id}`) || '') === uid;
    setVoted(votes);
  }, [myReviews, uid]);

  const merged = useMemo(() => {
    if (!loaded) return [];
    return mergeReviews(loaded.base.reviews, loaded.stored.reviews);
  }, [loaded]);

  const settings = loaded?.base.settings || {};
  const productReviews = useMemo(
    () => getProductReviews(merged, productId, { allowedStatuses: ['approved'] }),
    [merged, productId],
  );
  const stats = useMemo(() => getReviewStats(merged), [merged]);

  const eligibility = useMemo(() => {
    if (!loaded) return { allowed: false };
    return canUserReview({
      user,
      productId,
      reviews: merged,
      settings,
      userOrders: orders,
    });
  }, [loaded, user, productId, merged, settings, orders]);

  const onPickFiles = e => {
    const files = Array.from(e.target.files || []).slice(0, settings.maxPhotosPerReview || 5);
    setPhotos(prev => [...prev, ...files].slice(0, settings.maxPhotosPerReview || 5));
    e.target.value = '';
  };

  const onSubmit = e => {
    e.preventDefault();
    const result = validateReview({
      settings,
      rating: form.rating,
      title: form.title,
      text: form.text,
      photos,
    });
    setErrors(result.errors);
    if (!result.valid) {
      setNotice({ type: 'error', text: 'Proverite označena polja.' });
      return;
    }
    setBusy(true);
    const media = photos.map((_, i) => `/images/reviews/temp_${Date.now()}_${i}.jpg`);
    try {
      const { review } = submitReview({
        settings,
        user,
        productId,
        data: form,
        media,
        userOrders: orders,
      });
      setMyReviews(prev => [...prev, review]);
      setForm({ rating: 5, title: '', text: '' });
      setPhotos([]);
      setNotice({
        type: 'success',
        text: review.status === 'approved'
          ? 'Hvala! Vaša recenzija je objavljena.'
          : 'Hvala! Recenzija je poslata i čeka odobrenje.',
      });
      const stored = readStoredReviews();
      setLoaded(prev => ({ ...prev, stored }));
    } finally {
      setBusy(false);
    }
  };

  const onVote = e => {
    e.preventDefault();
    const id = e.currentTarget.dataset.reviewId;
    const result = voteHelpful({ reviewId: id, user, storedReviews: merged });
    if (result.error === 'login_required') {
      window.dispatchEvent(new CustomEvent('auth:required'));
      return;
    }
    setVoted(prev => ({ ...prev, [id]: result.allowed }));
    setLoaded(prev => ({ ...prev, stored: readStoredReviews() }));
  };

  if (!loaded) {
    return (
      <section className="island reviews" data-region="reviews" aria-label="Recenzije" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--fs-sm)' }}>
        Učitavanje recenzija…
      </section>
    );
  }

  const card = {
    marginTop: 'var(--space-6)',
    padding: 'var(--space-6)',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-card)',
    border: '1px solid var(--color-divider)',
  };
  const heading = {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    fontWeight: 'var(--fw-light)',
    marginBottom: 'var(--space-4)',
  };

  return (
    <section className="island reviews" data-region="reviews" aria-label="Pišite recenziju" style={card}>
      <h3 style={heading}>Pišite recenziju</h3>

      <div style={{ ...row, marginBottom: 'var(--space-4)', fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
        <span>Recenzija: <strong style={{ color: 'var(--color-text)' }}>{stats.totalReviews}</strong></span>
        <span>Prosečna ocena: <strong style={{ color: 'var(--color-text)' }}>{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}</strong></span>
        <span>Verifikovano: <strong style={{ color: 'var(--color-text)' }}>{stats.verifiedPercent}%</strong></span>
      </div>

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

      {eligibility.reason === 'login_required' && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', ...row }}>
          <span>Morate biti prijavljeni da biste ostavili recenziju.</span>
          <button type="button" className="btn btn-primary" style={{ ...btnPrimary, fontSize: 'var(--fs-sm)' }} data-action="login">
            Prijavite se
          </button>
        </div>
      )}

      {eligibility.reason === 'verified_purchase_required' && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
          Recenzije mogu da ostave samo kupci koji su kupili {productName}. Za recenziranje je potrebna verifikovana kupovina.
        </div>
      )}

      {eligibility.reason === 'already_reviewed' && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
          ✓ Već ste poslali recenziju za {productName}.
        </div>
      )}

      {eligibility.allowed && (
        <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ ...row, justifyContent: 'flex-start', marginBottom: 'var(--space-1)' }}>
              <label style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>Vaša ocena</label>
              <Stars value={form.rating} onChange={n => setForm(prev => ({ ...prev, rating: n }))} />
            </div>
            {errors.rating && <small style={{ color: '#b91c1c' }}>{errors.rating}</small>}
          </div>

          <div>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Naslov recenzije"
              style={inputStyle}
            />
            {errors.title && <small style={{ color: '#b91c1c' }}>{errors.title}</small>}
          </div>

          <div>
            <textarea
              rows="5"
              value={form.text}
              onChange={e => setForm(prev => ({ ...prev, text: e.target.value }))}
              placeholder={`Podelite utiske o ${productName}…`}
              style={inputStyle}
            />
            <small style={{ display: 'block', marginTop: 'var(--space-1)', color: 'var(--color-text-tertiary)' }}>
              {form.text.length}/{settings.textMaxLength || 2000} znakova
            </small>
            {errors.text && <small style={{ color: '#b91c1c' }}>{errors.text}</small>}
          </div>

          {settings.allowPhotos !== false && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickFiles} />
              <button type="button" style={btnSecondary} onClick={() => fileRef.current?.click()}>
                Dodajte fotografije ({photos.length}/{settings.maxPhotosPerReview || 5})
              </button>
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {photos.map((f, i) => (
                    <span key={i} style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-btn)', padding: '2px var(--space-2)' }}>
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
              {errors.photos && <small style={{ color: '#b91c1c' }}>{errors.photos}</small>}
            </div>
          )}

          <div>
            <button type="submit" style={btnPrimary} disabled={busy}>
              {busy ? 'Slanje…' : 'Objavite recenziju'}
            </button>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-3)' }}>
              {settings.autoApproveVerifiedPurchases
                ? 'Vaša recenzija će se odmah objaviti.'
                : 'Vaša recenzija će se pojaviti nakon provere.'}
            </span>
          </div>
        </form>
      )}

      {myReviews.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', marginBottom: 'var(--space-3)' }}>
            Vaše recenzije
          </div>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {myReviews.slice().reverse().map(r => (
              <article key={r.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-4)' }}>
                <div style={{ ...row, marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 'var(--fs-sm)' }}>{r.title}</strong>
                  <span style={{ fontSize: 'var(--fs-xs)', padding: '2px var(--space-2)', borderRadius: 'var(--radius-full)', color: '#fff', background: STATUS_COLOR[r.status] || 'var(--color-border)' }}>
                    {REVIEW_STATUS_LABEL[r.status] || r.status}
                  </span>
                </div>
                <Stars value={r.rating} readOnly />
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>{r.text}</p>
                <div style={{ ...row, justifyContent: 'flex-start', fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
                  <button
                    type="button"
                    data-review-id={r.id}
                    onClick={onVote}
                    disabled={!user || voted[r.id]}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: voted[r.id] || !user ? 'default' : 'pointer',
                      color: voted[r.id] ? '#F59E0B' : 'var(--color-text-tertiary)',
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                      padding: 0,
                    }}
                  >
                    Pomaže ({r.helpfulVotes || 0})
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}