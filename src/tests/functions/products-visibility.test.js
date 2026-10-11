import { describe, it, expect, beforeEach, vi } from 'vitest';

const memory = new Map();

vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    get: async (key, opts) => {
      const raw = memory.get(key);
      if (raw === undefined) return null;
      if (opts && opts.type === 'json') return JSON.parse(raw);
      return raw;
    },
    setJSON: async (key, value) => {
      memory.set(key, JSON.stringify(value));
    },
  }),
}));

const { default: handler } = await import('../../../netlify/functions/products-visibility.js');

const event = (over = {}) => ({
  httpMethod: 'GET',
  path: '/api/products-visibility',
  headers: {},
  body: null,
  ...over,
});

const adminHeaders = { 'x-admin-role': 'vlasnik', 'x-admin-name': 'Vlasnik' };

const parse = res => JSON.parse(res.body);

describe('netlify/functions/products-visibility', () => {
  beforeEach(() => memory.clear());

  it('public read returns empty lists by default', async () => {
    const res = await handler(event());
    expect(res.statusCode).toBe(200);
    expect(parse(res)).toEqual({ hidden: [], archived: [] });
  });

  it('admin can hide a product from the main page', async () => {
    const patch = await handler(
      event({
        httpMethod: 'PATCH',
        path: '/api/v1/admin/products-visibility/1',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'hidden' }),
      })
    );
    expect(patch.statusCode).toBe(200);
    expect(parse(patch).success).toBe(true);

    const pub = await handler(event());
    expect(parse(pub).hidden).toContain('1');
    expect(parse(pub).archived).not.toContain('1');
  });

  it('admin can archive a product (removed everywhere)', async () => {
    await handler(
      event({
        httpMethod: 'PATCH',
        path: '/api/v1/admin/products-visibility/7',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'archived' }),
      })
    );
    const pub = await handler(event());
    expect(parse(pub).archived).toContain('7');
  });

  it('setting published resets the override', async () => {
    await handler(
      event({
        httpMethod: 'PATCH',
        path: '/api/v1/admin/products-visibility/3',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'hidden' }),
      })
    );
    await handler(
      event({
        httpMethod: 'PATCH',
        path: '/api/v1/admin/products-visibility/3',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'published' }),
      })
    );
    const pub = await handler(event());
    expect(parse(pub).hidden).not.toContain('3');
  });

  it('rejects an unknown status', async () => {
    const res = await handler(
      event({
        httpMethod: 'PATCH',
        path: '/api/v1/admin/products-visibility/1',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'gone' }),
      })
    );
    expect(res.statusCode).toBe(400);
  });

  it('admin write without a role header is forbidden', async () => {
    const res = await handler(
      event({
        httpMethod: 'PATCH',
        path: '/api/v1/admin/products-visibility/1',
        headers: {},
        body: JSON.stringify({ status: 'hidden' }),
      })
    );
    expect(res.statusCode).toBe(403);
  });

  it('admin list returns the override map', async () => {
    await handler(
      event({
        httpMethod: 'PATCH',
        path: '/api/v1/admin/products-visibility/9',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'hidden' }),
      })
    );
    const res = await handler(
      event({ httpMethod: 'GET', path: '/api/v1/admin/products-visibility', headers: adminHeaders })
    );
    expect(res.statusCode).toBe(200);
    expect(parse(res).overrides['9'].status).toBe('hidden');
  });
});
