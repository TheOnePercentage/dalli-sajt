/**
 * Netlify Function - Save Languages
 * Saves language configurations to Netlify Blobs
 */

const { NetlifyBlobs } = require('@netlify/blobs');

const BLOB_STORE_NAME = 'languages';

export default async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { languages } = JSON.parse(event.body);
    
    if (!Array.isArray(languages)) {
      return { statusCode: 400, body: 'Invalid languages format' };
    }

    // Validate languages
    const validated = validateLanguages(languages);
    
    // Save to Netlify Blobs
    const blobs = new NetlifyBlobs({ 
      name: 'languages', 
      siteID: process.env.NETLIFY_SITE_ID, 
      token: process.env.NETLIFY_AUTH_TOKEN 
    });
    
    await blobs.set('languages', JSON.stringify(validated), {
      metadata: {
        updatedAt: new Date().toISOString(),
        count: validated.length.toString(),
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        count: validated.length,
        message: 'Languages saved to Netlify Blobs' 
      }),
    };
  } catch (err) {
    console.error('[Save Languages] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}

function validateLanguages(languages) {
  return languages.map((l, i) => ({
    id: l.id || `lang-${Date.now()}-${i}`,
    code: l.code?.toLowerCase().trim(),
    name: l.name?.trim(),
    nativeName: l.nativeName?.trim(),
    locale: l.locale?.trim(),
    flag: l.flag?.trim(),
    rtl: !!l.rtl,
    rtlSupport: !!l.rtlSupport,
    enabled: l.enabled !== false,
    fallback: Array.isArray(l.fallback) ? l.fallback : [],
    dateFormat: l.dateFormat || 'DD.MM.YYYY',
    timeFormat: l.timeFormat || 'HH:mm',
    numberFormat: l.numberFormat || { decimal: ',', thousand: '.', grouping: 3 },
    currency: l.currency?.toUpperCase() || 'EUR',
    currencySymbol: l.currencySymbol || '€',
    createdAt: l.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })).filter(l => l.code && l.name && l.nativeName && l.locale);
}