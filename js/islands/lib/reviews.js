/**
 * reviews.js — čista logika recenzija (React ReviewsIsland).
 *
 * Ponaša se po ISTOM ugovoru kao vanilla ReviewSystem (js/app.jsx):
 *  - baza recenzija: data/reviews.json (fetch, keširan),
 *  - korisničke recenzije: localStorage 'dalli_reviews' (submit/glasovi),
 *  - polja recenzije: id, productId, variantId, userId, userName, userInitials,
 *    verifiedPurchase, rating, title, text, photos, videos, helpfulVotes,
 *    notHelpfulVotes, status, adminNote, createdAt, updatedAt.
 */

export const REVIEWS_DATA_URL = '/data/reviews.json';
export const REVIEWS_STORE_KEY = 'dalli_reviews';
export const REVIEW_VOTE_PREFIX = 'review_vote_';

export const DEFAULT_SETTINGS = {
  requireVerifiedPurchase: false,
  requireLoginToReview: true,
  allowPhotos: true,
  maxPhotosPerReview: 5,
  allowVideos: false,
  maxVideoDurationSeconds: 60,
  autoApproveVerifiedPurchases: false,
  moderationRequired: true,
  titleRequired: true,
  textMinLength: 20,
  textMaxLength: 2000,
  minRating: 1,
  maxRating: 5,
};

let basePromiseCache = null;

const sameProduct = (a, b) => String(a) === String(b);

/** Sigurno parsiranje localStorage zapisa. */
export function readStore(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`[islands] neispravan zapis "${key}":`, err);
    return null;
  }
}

/**
 * Učitava bazu recenzija (data/reviews.json) i vraća { reviews, settings }.
 * Kešira rezultat na nivou modula; nikad ne baca.
 */
export async function loadBaseReviews() {
  if (basePromiseCache) return basePromiseCache;
  basePromiseCache = (async () => {
    try {
      const res = await fetch(REVIEWS_DATA_URL, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return {
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
        settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
      };
    } catch (err) {
      console.warn('[islands] nije uspelo učitavanje data/reviews.json:', err);
      return { reviews: [], settings: { ...DEFAULT_SETTINGS } };
    }
  })();
  return basePromiseCache;
}

/** Čita korisnički store (dalli_reviews): { reviews, settings }. */
export function readStoredReviews() {
  const store = readStore(REVIEWS_STORE_KEY) || {};
  return {
    reviews: Array.isArray(store.reviews) ? store.reviews : [],
    settings: store.settings || null,
  };
}

/** Upisuje { reviews, settings } u localStorage (isti ugovor kao vanilla save()). */
export function saveStoredReviews(payload) {
  window.localStorage.setItem(REVIEWS_STORE_KEY, JSON.stringify(payload));
}

/** Spaja bazu i korisnički store — korisničke recenzije imaju prednost po id-ju. */
export function mergeReviews(baseReviews = [], storedReviews = []) {
  const byId = new Map();
  for (const r of baseReviews) byId.set(r.id, r);
  for (const r of storedReviews) byId.set(r.id, r);
  return Array.from(byId.values());
}

/** Recenzije za jedan proizvod; opciono filtrira po statusima. */
export function getProductReviews(reviews, productId, { allowedStatuses = null } = {}) {
  return reviews
    .filter(r => sameProduct(r.productId, productId))
    .filter(r => !allowedStatuses || allowedStatuses.includes(r.status));
}

/**
 * Statistika skupa recenzija: { averageRating, totalReviews, verifiedCount,
 * verifiedPercent, distribution {1..5} }. averageRating je broj (1 decimala).
 */
export function getReviewStats(reviews) {
  const visible = reviews.filter(r => r.status === 'approved');
  const totalReviews = visible.length;
  const verifiedCount = visible.filter(r => r.verifiedPurchase).length;
  const verifiedPercent = totalReviews === 0 ? 0 : Math.round((verifiedCount / totalReviews) * 100);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of visible) {
    const k = Number(r.rating);
    if (k >= 1 && k <= 5) distribution[k] += 1;
  }
  const sum = visible.reduce((acc, r) => acc + Number(r.rating || 0), 0);
  const averageRating = totalReviews === 0 ? 0 : Math.round((sum / totalReviews) * 10) / 10;
  return { averageRating, totalReviews, verifiedCount, verifiedPercent, distribution };
}

/** Da li je korisnik kupio proizvod (gleda u korisničke porudžbine). */
export function hasUserPurchased(userOrders = [], productId) {
  return userOrders.some(order => {
    const items = order?.items || [];
    return items.some(item => {
      const id = item.productId ?? item.id;
      return (
        (id !== undefined && sameProduct(id, productId)) ||
        (item.variantId || '').startsWith(`${productId}-`)
      );
    });
  });
}

/**
 * Provera da li korisnik može da recenzira proizvod (po vanilla ReviewSystem
 * canUserReview ugovoru): login_required / verified_purchase_required /
 * already_reviewed.
 */
export function canUserReview({ user, productId, reviews, settings = {}, userOrders = [] }) {
  if (settings.requireLoginToReview !== false && !user) {
    return { allowed: false, reason: 'login_required' };
  }
  const mine = (reviews || []).find(
    r => r.userId && user && r.userId === user.id && sameProduct(r.productId, productId)
  );
  if (mine) {
    return { allowed: false, reason: 'already_reviewed', existingReview: mine };
  }
  if (settings.requireVerifiedPurchase && user && !hasUserPurchased(userOrders, productId)) {
    return { allowed: false, reason: 'verified_purchase_required' };
  }
  return { allowed: true };
}

/** Validacija forme (po vanilla ReviewSystem.submitReview). Vraća { errors }. */
export function validateReview({ settings = {}, rating, title = '', text = '', photos = [] }) {
  const errors = {};
  const minRating = settings.minRating || 1;
  const maxRating = settings.maxRating || 5;
  const minText = settings.textMinLength || 20;
  const maxText = settings.textMaxLength || 2000;
  const maxPhotos = settings.maxPhotosPerReview || 5;

  if (!rating || Number(rating) < minRating || Number(rating) > maxRating) {
    errors.rating = `Ocena mora biti između ${minRating} i ${maxRating}.`;
  }
  if (settings.titleRequired !== false && String(title).trim().length < 3) {
    errors.title = 'Naslov mora imati najmanje 3 znaka.';
  }
  if (String(text).trim().length < minText) {
    errors.text = `Tekst recenzije mora imati najmanje ${minText} znakova.`;
  } else if (String(text).trim().length > maxText) {
    errors.text = `Tekst recenzije ne sme preći ${maxText} znakova.`;
  }
  if (settings.allowPhotos !== false && photos.length > maxPhotos) {
    errors.photos = `Maksimalno ${maxPhotos} slika po recenziji.`;
  }
  return { errors, valid: Object.keys(errors).length === 0 };
}

const initialsOf = name =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .map(part => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AN';

/**
 * Kreira i upisuje recenziju (isti shape kao vanilla). Vraća { review, status }.
 * verifiedPurchase se računa iz korisničkih porudžbina.
 */
export function submitReview({
  settings = {},
  user = null,
  productId,
  data = {},
  media = [],
  userOrders = [],
}) {
  const rating = Number(data.rating);
  const userName =
    user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Anonimni kupac';
  const verifiedPurchase = hasUserPurchased(userOrders, productId);
  const status = settings.autoApproveVerifiedPurchases && verifiedPurchase ? 'approved' : 'pending';
  const now = new Date().toISOString();
  const review = {
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    productId,
    variantId: data.variantId || null,
    userId: user?.id || null,
    userName,
    userInitials: initialsOf(userName),
    verifiedPurchase,
    orderId: data.orderId || null,
    rating,
    title: String(data.title || '').trim(),
    text: String(data.text || '').trim(),
    photos: media,
    videos: [],
    helpfulVotes: 0,
    notHelpfulVotes: 0,
    status,
    adminNote: '',
    createdAt: now,
    updatedAt: now,
  };
  const stored = readStoredReviews();
  stored.reviews.push(review);
  if (stored.settings === null) stored.settings = settings;
  saveStoredReviews(stored);
  return { review, status };
}

/**
 * Glas „pomaže" (po vanilla ReviewSystem.voteHelpful ugovoru): traži login i
 * jedan glas po recenziji (lokalni ključ review_vote_<id>). Vraća
 * { allowed, count?, error? } i upisuje povećani broj u store ako postoji.
 */
export function voteHelpful({ reviewId, user, storedReviews = [] }) {
  if (!user) return { allowed: false, error: 'login_required' };
  const key = `${REVIEW_VOTE_PREFIX}${reviewId}`;
  if (window.localStorage.getItem(key)) return { allowed: false, error: 'already_voted' };
  window.localStorage.setItem(key, user.id);

  const stored = readStoredReviews();
  let updated = false;
  for (const r of stored.reviews) {
    if (r.id === reviewId) {
      r.helpfulVotes = Number(r.helpfulVotes || 0) + 1;
      updated = true;
      break;
    }
  }
  if (updated) saveStoredReviews(stored);
  else if (storedReviews.some(r => r.id === reviewId)) {
    stored.reviews.push({ ...storedReviews.find(r => r.id === reviewId) });
    const mine = stored.reviews.find(r => r.id === reviewId);
    mine.helpfulVotes = Number(mine.helpfulVotes || 0) + 1;
    saveStoredReviews(stored);
  }
  return { allowed: true, count: 1 };
}
