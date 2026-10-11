/**
 * Netlify Function - Get Redirects
 * Returns redirects from Netlify Blobs
 */

const { NetlifyBlobs } = require('@netlify/blobs');

const BLOB_STORE_NAME = 'redirects';

export default async function handler(event, context) {
  try {
    const blobs = new NetlifyBlobs({ 
      name: 'redirects', 
      siteID: process.env.NETLIFY_SITE_ID, 
      token: process.env.NETLIFY_AUTH_TOKEN 
    });

    const data = await blobs.get('redirects', { type: 'json' });
    
    if (!data) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          redirects: [], 
          lastDeploy: null 
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[Get Redirects] Error:', err);
    // Return empty on error (UI will fallback to localStorage)
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        redirects: [], 
        lastDeploy: null 
      }),
    };
  }
}