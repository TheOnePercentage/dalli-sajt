import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildReorderItems,
  canCancelOrder,
  canReorderOrder,
  getPaymentMethodLabel,
  saveOrders,
  updateOrderStatus,
} from '../../../js/islands/lib/orders.js';
import {
  REVIEW_VOTE_PREFIX,
  canUserReview,
  getProductReviews,
  getReviewStats,
  hasUserPurchased,
  mergeReviews,
  readStoredReviews,
  submitReview,
  validateReview,
  voteHelpful,
} from '../../../js/islands/lib/reviews.js';

/**
 * Faza 2D — pure logika koju novi React islands koriste:
 *  - reviews (statistika, validacija, submit, glasanje),
 *  - orders management (statusi, otkazivanje, ponovna kupovina).
 */

const SETTINGS = {
  requireVerifiedPurchase: true,
  requireLoginToReview: true,
  allowPhotos: true,
  maxPhotosPerReview: 5,
  autoApproveVerifiedPurchases: false,
  titleRequired: true,
  textMinLength: 2,
  textMaxLength: 2000,
  minRating: 1,
  maxRating: 5,
};

const BASE_REVIEWS = [
  {
    id: 'r1',
    productId: 5,
    userId: 'u1',
    userName: 'Ana',
    rating: 5,
    status: 'approved',
    verifiedPurchase: true,
    title: 'Odlično',
    text: 'Odlično',
    helpfulVotes: 3,
    createdAt: '2026-01-01',
  },
  {
    id: 'r2',
    productId: 5,
    userId: 'u2',
    userName: 'Marko',
    rating: 3,
    status: 'approved',
    verifiedPurchase: false,
    title: 'OK',
    text: 'OK',
    helpfulVotes: 1,
    createdAt: '2026-02-01',
  },
  {
    id: 'r3',
    productId: 6,
    userId: 'u3',
    userName: 'Jelena',
    rating: 2,
    status: 'approved',
    verifiedPurchase: false,
    title: 'Loše',
    text: 'Loše',
    helpfulVotes: 0,
    createdAt: '2026-03-01',
  },
  {
    id: 'r4',
    productId: 5,
    userId: 'u4',
    userName: 'Petar',
    rating: 3,
    status: 'pending',
    verifiedPurchase: true,
    title: 'Na čekanju',
    text: 'Na čekanju',
    helpfulVotes: 0,
    createdAt: '2026-04-01',
  },
];

const ORDERS = [
  {
    id: 'dalli-1',
    userId: 'u1',
    orderNumber: 'DALLI-100',
    status: 'delivered',
    createdAt: '2026-01-10',
    totals: { subtotal: 2900, shipping: 0, discount: 0, total: 2900 },
    items: [
      {
        productId: 5,
        variantId: '5-black-M',
        name: 'Majica',
        color: 'black',
        size: 'M',
        price: 2900,
        qty: 1,
        image: '/images/x.jpg',
      },
    ],
    paymentMethod: 'crypto',
    shippingMethod: 'Kurirska služba',
  },
  {
    id: 'dalli-2',
    userId: 'u1',
    orderNumber: 'DALLI-101',
    status: 'pending',
    createdAt: '2026-09-01',
    totals: { subtotal: 1200, shipping: 290, discount: 0, total: 1490 },
    items: [
      {
        productId: 7,
        variantId: '7-white-L',
        name: 'Šorc',
        color: 'white',
        size: 'L',
        price: 1200,
        qty: 1,
        image: '/images/y.jpg',
      },
    ],
    paymentMethod: 'cod',
  },
];

describe('js/islands/lib/reviews.js — statistika', () => {
  it('računa prosečnu ocenu, broj, verifikovane i raspodelu (samo approved)', () => {
    const stats = getReviewStats(BASE_REVIEWS);
    expect(stats.totalReviews).toBe(3);
    expect(stats.averageRating).toBe(3.3);
    expect(stats.verifiedCount).toBe(1);
    expect(stats.verifiedPercent).toBe(33);
    expect(stats.distribution[5]).toBe(1);
    expect(stats.distribution[2]).toBe(1);
  });

  it('mergeReviews spaja bazu i store, store ima prednost po id', () => {
    const merged = mergeReviews(BASE_REVIEWS, [
      {
        id: 'r1',
        productId: 5,
        userId: 'u1',
        rating: 1,
        status: 'approved',
        title: 'Promenjeno',
        text: 'Promenjeno',
      },
    ]);
    const r1 = merged.find(r => r.id === 'r1');
    expect(merged.length).toBe(4);
    expect(r1.rating).toBe(1);
  });

  it('getProductReviews filtrira po proizvodu i statusima', () => {
    const approved = getProductReviews(BASE_REVIEWS, 5, { allowedStatuses: ['approved'] });
    expect(approved.map(r => r.id)).toEqual(['r1', 'r2']);
  });

  it('hasUserPurchased prepoznaje kupvinu po productId ili variantId prefiksu', () => {
    expect(hasUserPurchased(ORDERS, 5)).toBe(true);
    expect(hasUserPurchased(ORDERS, '7')).toBe(true);
    expect(hasUserPurchased(ORDERS, 99)).toBe(false);
  });
});

describe('js/islands/lib/reviews.js — canUserReview', () => {
  it('traži login kada settings.requireLoginToReview = true', () => {
    const res = canUserReview({
      user: null,
      productId: 5,
      reviews: [],
      settings: SETTINGS,
      userOrders: ORDERS,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('login_required');
  });

  it('traži verifikovanu kupovinu kada je obavezna', () => {
    const user = { id: 'u2', firstName: 'Marko', lastName: 'M' };
    const res = canUserReview({
      user,
      productId: 99,
      reviews: BASE_REVIEWS,
      settings: SETTINGS,
      userOrders: ORDERS,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('verified_purchase_required');
  });

  it('dozvoljava VERIFIkovanom kupcu proizvod koji je kupio', () => {
    const user = { id: 'nf', firstName: 'Nova', lastName: 'Kupac' };
    const res = canUserReview({
      user,
      productId: 5,
      reviews: BASE_REVIEWS,
      settings: SETTINGS,
      userOrders: [{ items: [{ productId: 5, variantId: '5-black-M', qty: 1 }] }],
    });
    expect(res.allowed).toBe(true);
  });

  it('blokira ponovnu recenziju istog proizvoda', () => {
    const user = { id: 'u1', firstName: 'Ana', lastName: 'A' };
    const reviews = mergeReviews(BASE_REVIEWS, readStoredReviews().reviews);
    const res = canUserReview({
      user,
      productId: 5,
      reviews,
      settings: SETTINGS,
      userOrders: ORDERS,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('already_reviewed');
  });
});

describe('js/islands/lib/reviews.js — validateReview', () => {
  const settings = { ...SETTINGS, requireLoginToReview: false };

  it('propušta validnu recenziju', () => {
    const { valid, errors } = validateReview({
      settings,
      rating: 5,
      title: 'Super',
      text: 'Odličan kvalitet materijala.',
      photos: [],
    });
    expect(valid).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('odbacuje nisku ocenu, kratak naslov i prekratak tekst', () => {
    const { errors } = validateReview({ settings, rating: 0, title: 'X', text: 'a' });
    expect(errors.rating).toBeDefined();
    expect(errors.title).toBeDefined();
    expect(errors.text).toBeDefined();
  });

  it('ograničava broj fotografija na maxPhotosPerReview', () => {
    const { errors } = validateReview({
      settings,
      rating: 5,
      title: 'Super',
      text: 'Dobar tekst recenzije.',
      photos: Array.from({ length: 6 }, (_, i) => `/img/${i}.jpg`),
    });
    expect(errors.photos).toContain('5');
  });
});

describe('js/islands/lib/reviews.js — submit + store', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('upisuje recenziju u dalli_reviews i vraća pending status bez auto-aprube', () => {
    const user = { id: 'u1', firstName: 'Ana', lastName: 'A' };
    const { review, status } = submitReview({
      settings: SETTINGS,
      user,
      productId: 5,
      data: {
        rating: 5,
        title: 'Vrhunski',
        text: 'Odličan materijal i kroj.',
        variantId: '5-black-M',
      },
      media: ['/images/reviews/t1.jpg'],
      userOrders: ORDERS,
    });
    expect(status).toBe('pending');
    expect(review.userId).toBe('u1');
    expect(review.verifiedPurchase).toBe(true);
    expect(review.userInitials).toBe('AA');
    const stored = readStoredReviews();
    expect(stored.reviews).toContainEqual(review);
  });

  it('auto-odobrava recenziju verifikovanog kupca kada je autoApproveVerifiedPurchases', () => {
    const user = { id: 'u1', firstName: 'Ana', lastName: 'A' };
    const { status } = submitReview({
      settings: { ...SETTINGS, autoApproveVerifiedPurchases: true },
      user,
      productId: 5,
      data: { rating: 5, title: 'Vrhunski', text: 'Odličan materijal i kroj.' },
      media: [],
      userOrders: ORDERS,
    });
    expect(status).toBe('approved');
  });

  it('voteHelpful traži login i dozvoljava samo jedan glas po recenziji', () => {
    const user = { id: 'u9', firstName: 'Neo', lastName: 'N' };
    const first = voteHelpful({ reviewId: 'r1', user, storedReviews: BASE_REVIEWS });
    expect(first.allowed).toBe(true);
    const dbg = readStoredReviews().reviews.find(r => r.id === 'r1');
    expect(dbg.helpfulVotes).toBe(4);
    const second = voteHelpful({ reviewId: 'r1', user, storedReviews: BASE_REVIEWS });
    expect(second.allowed).toBe(false);
    expect(second.error).toBe('already_voted');
    expect(window.localStorage.getItem(`${REVIEW_VOTE_PREFIX}r1`)).toBe('u9');
  });

  it('voteHelpful bez korisnika traži login', () => {
    const res = voteHelpful({ reviewId: 'r1', user: null, storedReviews: BASE_REVIEWS });
    expect(res.error).toBe('login_required');
  });
});

describe('js/islands/lib/orders.js — management', () => {
  it('otkazivanje je moguće samo za pending/confirmed', () => {
    expect(canCancelOrder('pending')).toBe(true);
    expect(canCancelOrder('confirmed')).toBe(true);
    expect(canCancelOrder('processing')).toBe(false);
    expect(canCancelOrder('delivered')).toBe(false);
  });

  it('ponovna kupovina je moguća samo za delivered', () => {
    expect(canReorderOrder('delivered')).toBe(true);
    expect(canReorderOrder('pending')).toBe(false);
    expect(canReorderOrder('shipped')).toBe(false);
  });

  it('updateOrderStatus menja status i vraća izmenjenu/listu bez mutacije', () => {
    const { orders, order, changed } = updateOrderStatus(ORDERS, 'dalli-2', 'cancelled');
    expect(changed).toBe(true);
    expect(order.status).toBe('cancelled');
    expect(orders.find(o => o.id === 'dalli-2').status).toBe('cancelled');
    expect(ORDERS.find(o => o.id === 'dalli-2').status).toBe('pending');
  });

  it('updateOrderStatus podržava i orderNumber', () => {
    const { changed } = updateOrderStatus(ORDERS, 'DALLI-100', 'cancelled');
    expect(changed).toBe(true);
  });

  it('buildReorderItems pravi reproduktivni payload za addToCart', () => {
    const order = ORDERS[0];
    const items = buildReorderItems(order);
    expect(items).toHaveLength(1);
    expect(items[0].product).toEqual({
      id: 5,
      name: 'Majica',
      price: 2900,
      image: '/images/x.jpg',
    });
    expect(items[0].variant).toEqual({ color: 'black', size: 'M', price: 2900 });
    expect(items[0].qty).toBe(1);
  });

  it('saveOrders upisuje u dalli_orders', () => {
    window.localStorage.clear();
    saveOrders(ORDERS);
    const stored = JSON.parse(window.localStorage.getItem('dalli_orders'));
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe('dalli-1');
  });

  it('getPaymentMethodLabel vraća srpske etikete', () => {
    expect(getPaymentMethodLabel('crypto')).toBe('Kripto plaćanje');
    expect(getPaymentMethodLabel('cod')).toBe('Plaćanje pouzećem');
    expect(getPaymentMethodLabel('weird')).toBe('weird');
  });
});
