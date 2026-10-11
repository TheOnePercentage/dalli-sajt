/**
 * Netlify Function - Get Languages
 * Returns languages from Netlify Blobs
 */

const { NetlifyBlobs } = require('@netlify/blobs');

const BLOB_STORE_NAME = 'languages';

export default async function handler(event, context) {
  try {
    const blobs = new NetlifyBlobs({ 
      name: 'languages', 
      siteID: process.env.NETLIFY_SITE_ID, 
      token: process.env.NETLIFY_AUTH_TOKEN 
    });

    const data = await blobs.get('languages', { type: 'json' });
    
    if (!data) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          languages: [], 
          lastUpdated: null 
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[Get Languages] Error:', err);
    // Return empty on error (UI will fallback to localStorage)
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        languages: [], 
        lastUpdated: null 
      }),
    };
  }
}