import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const memory = vi.hoisted(() => new Map());

vi.mock('@netlify/blobs', () => ({
  getStore: opts => {
    const name = typeof opts === 'string' ? opts : opts.name;
    if (!memory.has(name)) memory.set(name, new Map());
    const bucket = memory.get(name);
    return {
      get: async (key, o) => {
        const raw = bucket.get(key);
        if (raw === undefined) return null;
        if (o && o.type === 'json') return JSON.parse(raw);
        return raw;
      },
      setJSON: async (key, value) => {
        bucket.set(key, JSON.stringify(value));
      },
    };
  },
}));

const { default: handler } = await import('../../../netlify/functions/social-metrics.js');

const event = over => ({
  httpMethod: 'GET',
  path: '/api/v1/admin/social-metrics',
  queryStringParameters: {},
  headers: {},
  ...over,
});

const parse = res => JSON.parse(res.body);

const setConfig = async config => {
  const store = (await import('@netlify/blobs')).getStore({ name: 'experience' });
  await store.setJSON('config', config);
};

const mockFetch = payloads => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async url => {
      const match = payloads.find(p => url.includes(p.match));
      const body = match ? match.body : { error: { message: 'not mocked' } };
      return {
        ok: !!match && match.ok !== false,
        status: match && match.ok === false ? 400 : 200,
        text: async () => JSON.stringify(body),
      };
    })
  );
};

describe('netlify/functions/social-metrics', () => {
  beforeEach(() => memory.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('returns an empty account list when nothing is configured', async () => {
    const res = await handler(event());
    expect(res.statusCode).toBe(200);
    const data = parse(res);
    expect(data.accounts).toEqual([]);
    expect(data.summary.accounts).toBe(0);
  });

  it('marks providers without a metrics API as unsupported', async () => {
    await setConfig({ integrations: { social: { tiktok: [{ accessToken: 'x' }] } } });
    const data = parse(await handler(event()));
    const account = data.accounts.find(a => a.platform === 'tiktok');
    expect(account.supported).toBe(false);
    expect(account.ok).toBe(false);
  });

  it('reports an empty credential slot as not configured', async () => {
    await setConfig({ integrations: { social: { instagram: [{}] } } });
    const data = parse(await handler(event()));
    const account = data.accounts.find(a => a.platform === 'instagram');
    expect(account.supported).toBe(true);
    expect(account.configured).toBe(false);
    expect(account.ok).toBe(false);
  });

  it('pulls real YouTube statistics when credentials are present', async () => {
    await setConfig({
      integrations: { social: { youtube: [{ apiKey: 'KEY', channelId: 'CHAN' }] } },
    });
    mockFetch([
      {
        match: 'youtube/v3/channels',
        body: {
          items: [
            {
              snippet: { title: 'DALLI' },
              statistics: { subscriberCount: '1234', videoCount: '42', viewCount: '9000' },
            },
          ],
        },
      },
    ]);
    const data = parse(await handler(event()));
    const account = data.accounts.find(a => a.platform === 'youtube');
    expect(account.ok).toBe(true);
    expect(account.metrics.followers).toBe(1234);
    expect(account.metrics.videos).toBe(42);
    expect(data.summary.followers).toBe(1234);
    expect(data.summary.connected).toBe(1);
  });

  it('surfaces provider errors without throwing', async () => {
    await setConfig({
      integrations: { social: { instagram: [{ accessToken: 'bad', businessAccountId: '1' }] } },
    });
    mockFetch([
      { match: 'graph.facebook.com', ok: false, body: { error: { message: 'bad token' } } },
    ]);
    const data = parse(await handler(event()));
    const account = data.accounts.find(a => a.platform === 'instagram');
    expect(account.ok).toBe(false);
    expect(account.error).toBe('bad token');
  });
});
