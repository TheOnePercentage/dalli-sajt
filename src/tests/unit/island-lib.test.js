import { describe, it, expect } from 'vitest';

import { recommendSize, BODY_TYPES, FIT_LEVELS, SIZE_ORDER } from '../../../js/islands/lib/fit.js';
import { orderStats, orderStatusLabel, formatOrderDate } from '../../../js/islands/lib/orders.js';
import { productUrl, searchProducts, displayPrice } from '../../../js/islands/lib/search.js';

/**
 * Faza 2C — pure logika koju React islands koriste (size finder, order
 * statistika, search ranking). Testove držimo na čistom JS logikom da se
 * ne mešaju sa jsdom/React ekosistemom.
 */
describe('js/islands/lib/fit.js — size finder', () => {
  it('preporučuje M za prosečnu građu i standardni kroj', () => {
    const rec = recommendSize({ bodyType: 'medium', fit: 'regular', availableSizes: SIZE_ORDER.map(size => ({ size, available: true })) });
    expect(rec.size).toBe('M');
  });

  it('pomera nagore za oversize/slobodniji kroj', () => {
    const rec = recommendSize({ bodyType: 'medium', fit: 'loose', availableSizes: SIZE_ORDER.map(size => ({ size, available: true })) });
    expect(rec.size).toBe('L');
  });

  it('pomera nadole za priljubljeni kroj', () => {
    const rec = recommendSize({ bodyType: 'tall', fit: 'slim', availableSizes: SIZE_ORDER.map(size => ({ size, available: true })) });
    expect(rec.size).toBe('M');
  });

  it('ne preporučuje nedostupnu veličinu', () => {
    const available = SIZE_ORDER.filter(s => s !== 'M').map(size => ({ size, available: true }));
    const rec = recommendSize({ bodyType: 'medium', fit: 'regular', availableSizes: available });
    expect(rec.size).not.toBeUndefined();
    expect(SIZE_ORDER.includes(rec.size)).toBe(true);
  });

  it('koristi label repu (nota) uvek vraća veličinu', () => {
    const rec = recommendSize({ bodyType: 'petit', fit: 'loose', availableSizes: [] });
    expect(rec.note).toContain('veličina');
  });
});

describe('js/islands/lib/orders.js — order statistika', () => {
  const orders = [
    { id: 'o1', userId: 'u1', orderNumber: 'DALLI-001', status: 'delivered', createdAt: '2026-08-01', totals: { total: 2900 }, items: [] },
    { id: 'o2', userId: 'u1', orderNumber: 'DALLI-002', status: 'processing', createdAt: '2026-09-10', totals: { total: 1200 }, items: [] },
    { id: 'o3', userId: 'u2', orderNumber: 'DALLI-003', status: 'cancelled', createdAt: '2026-07-01', totals: { total: 999 }, items: [] }
  ];

  it('broji i sumira samo narudžbine tog korisnika', () => {
    const stats = orderStats(orders, 'u1');
    expect(stats.count).toBe(2);
    expect(stats.totalSpent).toBe(4100);
    expect(stats.active).toBe(1);
  });

  it('poslednja narudžbina je po datumu (desc)', () => {
    const stats = orderStats(orders, 'u1');
    expect(stats.lastOrder.id).toBe('o2');
  });

  it('status labela ima srpski prikaz', () => {
    expect(orderStatusLabel('delivered')).toBe('Isporučena');
    expect(orderStatusLabel('nepoznat')).toBe('nepoznat');
  });

  it('datUme formatira bez pada', () => {
    expect(formatOrderDate('2026-09-10')).toMatch(/10\.09\.2026\./);
    expect(formatOrderDate('bad')).toBe('');
  });
});

describe('js/islands/lib/search.js — pretraga kataloga', () => {
  const docs = [
    { slug: 'osnovna-majica', collection: 'casual', gender: 'unisex', category: 't-shirts', name: 'Osnovna Majica', price: 1290, salePrice: null },
    { slug: 'trenerka', collection: 'casual', gender: 'men', category: 'tracksuits', name: 'Sportska trenerka', price: 3500, salePrice: 2900, colors: [{ name: 'Crna' }] }
  ];

  it('gradi URL u skladu sa SSG putanjom', () => {
    expect(productUrl(docs[0])).toBe('/casual/unisex/t-shirts/osnovna-majica.html');
  });

  it('rankira tačan naziv više od opisa', () => {
    const results = searchProducts(docs, 'trenerka');
    expect(results[0].slug).toBe('trenerka');
  });

  it('pretraga ne vraća ništa bez query-ja', () => {
    expect(searchProducts(docs, '')).toEqual([]);
    expect(searchProducts(docs, '  ')).toEqual([]);
  });

  it('displayPrice uzima salePrice ako postoji', () => {
    expect(displayPrice(docs[1])).toBe(2900);
    expect(displayPrice(docs[0])).toBe(1290);
  });

  it('svakih od BODY_TYPES/FIT_LEVELS ima shift-logiku', () => {
    expect(BODY_TYPES.map(b => b.id)).toEqual(['petit', 'medium', 'tall']);
    expect(FIT_LEVELS.map(f => f.shift)).toEqual([-1, 0, 1]);
  });
});