/**
 * SearchIsland — live pretraga prodavnice (overlay/rezultati) za generisane
 * SSG stranice bez app.jsx. Čita statički /search-index.json (generiše se
 * pri build-u), rankira po lib/search.js i vodi na postojeće product URL-ove.
 *
 * Mount: <div data-island="search" data-props="{}"></div>
 */

import { useEffect, useRef, useState } from 'react';

import { formatPrice } from '../state/locale.js';
import { displayPrice, productUrl, searchProducts } from './lib/search.js';

let searchCachePromise = null;

function loadIndex() {
  if (!searchCachePromise) {
    searchCachePromise = fetch('/search-index.json')
      .then(res => {
        if (!res.ok) throw new Error(`search-index ${res.status}`);
        return res.json();
      })
      .then(data => data.documents || [])
      .catch(err => {
        searchCachePromise = null;
        throw err;
      });
  }
  return searchCachePromise;
}

const STYLE_LABELS = {
  everyday: 'Svakodnevno',
  'luxury-essentials': 'Luksuzni',
  travel: 'Putovanje',
  'smart-casual': 'Smart casual',
  'street-style': 'Street',
  sports: 'Sport',
};

export default function SearchIsland() {
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open || docs) return;
    loadIndex()
      .then(setDocs)
      .catch(() => setError('Pretraga trenutno nije dostupna.'));
  }, [open, docs]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const results = docs ? searchProducts(docs, query) : [];
  const topStyles = docs && !query
    ? [...new Set(docs.flatMap(d => d.styleOccasion || []))].slice(0, 4)
    : [];

  const wrap = {
    position: 'relative',
    marginBottom: 'var(--space-5)',
  };
  const input = {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-btn)',
    fontSize: 'var(--fs-sm)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
  };
  const dropdown = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
    zIndex: 50,
    overflow: 'hidden',
  };
  const row = {
    display: 'flex',
    gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-3)',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-divider)',
    textDecoration: 'none',
    color: 'var(--color-text)',
  };

  return (
    <div style={wrap} ref={boxRef} data-region="search">
      <input
        type="search"
        placeholder="Pretraži kolekciju… (npr. majica, trenerka, hoodie)"
        value={query}
        aria-label="Pretraga proizvoda"
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={input}
      />

      {open && (
        <div style={dropdown}>
          {error && (
            <p style={{ padding: 'var(--space-4)', margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--color-text-tertiary)' }}>{error}</p>
          )}

          {!docs && !error && (
            <p style={{ padding: 'var(--space-4)', margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--color-text-tertiary)' }}>Učitavanje proizvoda…</p>
          )}

          {docs && !query && topStyles.length > 0 && (
            <div style={{ padding: 'var(--space-3)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 'var(--space-2)' }}>Popularno</div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {topStyles.map(s => (
                  <button key={s} type="button" style={{ padding: 'var(--space-1) var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', background: 'var(--color-bg)', fontSize: 'var(--fs-xs)', cursor: 'pointer' }} onClick={() => setQuery(STYLE_LABELS[s] || s)}>
                    {STYLE_LABELS[s] || s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {docs && query && results.length === 0 && (
            <p style={{ padding: 'var(--space-4)', margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--color-text-tertiary)' }}>
              Nema rezultata za „{query}”.
            </p>
          )}

          {results.map(doc => (
            <a key={doc.slug} href={productUrl(doc)} style={row} onMouseDown={e => e.preventDefault()}>
              <img src={doc.images && doc.images.main} alt={doc.name} width="40" height="50" loading="lazy" style={{ objectFit: 'cover', borderRadius: 'var(--radius-btn)', background: 'var(--color-bg)' }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 'var(--fw-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--fs-xs)', textTransform: 'capitalize' }}>{doc.collection} / {doc.category || doc.gender}</span>
              </span>
              <span style={{ fontWeight: 'var(--fw-semibold)', whiteSpace: 'nowrap' }}>{formatPrice(displayPrice(doc), doc.currency || 'RSD')}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}