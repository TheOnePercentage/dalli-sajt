/**
 * Netlify Function - Save Redirects
 * Saves redirects to Netlify Blobs and optionally updates netlify.toml
 */

const { NetlifyBlobs } = require('@netlify/blobs');

const BLOB_STORE_NAME = 'redirects';

export default async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { redirects } = JSON.parse(event.body);
    
    if (!Array.isArray(redirects)) {
      return { statusCode: 400, body: 'Invalid redirects format' };
    }

    // Validate redirects
    const validated = validateRedirects(redirects);
    
    // Save to Netlify Blobs
    const blobs = new NetlifyBlobs({ 
      name: 'redirects', 
      siteID: process.env.NETLIFY_SITE_ID, 
      token: process.env.NETLIFY_AUTH_TOKEN 
    });
    
    await blobs.set('redirects', JSON.stringify(validated), {
      metadata: {
        updatedAt: new Date().toISOString(),
        count: validated.length.toString(),
      }
    });

    // Try to update netlify.toml via Netlify API (optional)
    // This would require a build hook or Netlify API token with write access

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        count: validated.length,
        message: 'Redirects saved to Netlify Blobs' 
      }),
    };
  } catch (err) {
    console.error('[Save Redirects] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}

function validateRedirects(redirects) {
  return redirects.map((r, i) => ({
    id: r.id || `redirect-${Date.now()}-${i}`,
    from: r.from?.trim(),
    to: r.to?.trim(),
    status: parseInt(r.status) || 301,
    force: !!r.force,
    conditions: r.conditions || {},
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })).filter(r => r.from && r.to);
}