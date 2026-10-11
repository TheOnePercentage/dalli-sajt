/**
 * Netlify Function - Get Promotions
 * Returns promotions from Netlify Blobs (core platform storage)
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
  try {
    const store = getPromotionsStore();

    const data = await store.get(PROMOTIONS_KEY, { type: 'json' });

    if (!data) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          promotions: [],
          lastUpdated: null,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[Get Promotions] Error:', err);
    return {
      statusCode: 200,
      body: JSON.stringify({
        promotions: [],
        lastUpdated: null,
      }),
    };
  }
}
