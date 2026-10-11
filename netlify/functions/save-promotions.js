/**
 * Netlify Function - Save Promotions
 * Saves promotions to Netlify Blobs (core platform storage)
 */

const { getStore } = require('@netlify/blobs');

const BLOB_STORE_NAME = 'promotions';
const PROMOTIONS_KEY = 'promotions';

function getPromotionsStore() {
  const options = { name: BLOB_STORE_NAME };
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
    options.siteID = process.env.NETLIFY_SITE_ID;
    options.token = process.env.NETLIFY_AUTH_TOKEN;
  }
  return getStore(options);
}

export default async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { promotions } = JSON.parse(event.body);

    if (!Array.isArray(promotions)) {
      return { statusCode: 400, body: 'Invalid promotions format' };
    }

    // Validate promotions
    const validated = validatePromotions(promotions);

    // Save to Netlify Blobs
    const store = getPromotionsStore();

    await store.set(PROMOTIONS_KEY, JSON.stringify(validated), {
      metadata: {
        updatedAt: new Date().toISOString(),
        count: validated.length.toString(),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: validated.length,
        message: 'Promotions saved to Netlify Blobs',
      }),
    };
  } catch (err) {
    console.error('[Save Promotions] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}

function validatePromotions(promotions) {
  return promotions.map((p, i) => ({
    id: p.id || `PROMO-${Date.now()}-${i}`,
    code: p.code?.trim().toUpperCase(),
    name: p.name?.trim(),
    type: p.type || 'percentage',
    value: p.value ? parseFloat(p.value) : 0,
    maxUses: p.maxUses ? parseInt(p.maxUses) : 0,
    usedCount: p.usedCount ? parseInt(p.usedCount) : 0,
    minCartValue: p.minCartValue ? parseFloat(p.minCartValue) : 0,
    maxDiscount: p.maxDiscount ? parseFloat(p.maxDiscount) : 0,
    startsAt: p.startsAt || null,
    endsAt: p.endsAt || null,
    active: p.active !== false,
    stackable: p.stackable === true,
    appliesTo: p.appliesTo || 'all',
    conditions: p.conditions || {},
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })).filter(p => p.code && p.name);
}
