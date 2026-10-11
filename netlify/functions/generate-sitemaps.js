/**
 * Netlify Function - Generate Sitemaps for all active countries
 * Runs as scheduled function or on-demand
 */

const { NetlifyBlobs } = require('@netlify/blobs');

const BLOB_STORE_NAME = 'sitemaps';

export default async function handler(event, context) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // In a real implementation, we'd import the countries config
    // For now, return the structure
    const countries = [
      { code: 'RS', name: 'Serbia', active: true, language: { code: 'sr' }, seo: { canonicalBase: 'https://dalli.rs' } },
      { code: 'DE', name: 'Germany', active: false, language: { code: 'de' }, seo: { canonicalBase: 'https://dalli.de' } },
      { code: 'AT', name: 'Austria', active: false, language: { code: 'de' }, seo: { canonicalBase: 'https://dalli.at' } },
      { code: 'FR', name: 'France', active: false, language: { code: 'fr' }, seo: { canonicalBase: 'https://dalli.fr' } },
      { code: 'IT', name: 'Italy', active: false, language: { code: 'it' }, seo: { canonicalBase: 'https://dalli.it' } },
      { code: 'ES', name: 'Spain', active: false, language: { code: 'es' }, seo: { canonicalBase: 'https://dalli.es' } },
      { code: 'HR', name: 'Croatia', active: false, language: { code: 'hr' }, seo: { canonicalBase: 'https://dalli.hr' } },
      { code: 'BA', name: 'Bosnia', active: false, language: { code: 'bs' }, seo: { canonicalBase: 'https://dalli.ba' } },
      { code: 'ME', name: 'Montenegro', active: false, language: { code: 'sr' }, seo: { canonicalBase: 'https://dalli.me' } },
      { code: 'SI', name: 'Slovenia', active: false, language: { code: 'sl' }, seo: { canonicalBase: 'https://dalli.si' } },
    ];

    const activeCountries = countries.filter(c => c.active);
    const results = [];

    for (const country of activeCountries) {
      try {
        const sitemap = generateSitemap(country);
        const robots = generateRobotsTxt(country.code);
        
        // In production, save to Netlify Blobs or deploy to CDN
        // For now, return the generated content
        results.push({
          country: country.code,
          sitemap: sitemap,
          robots: generateRobotsTxt(country.code),
        });
      } catch (e) {
        console.error(`[Sitemap] Error for ${country.code}:`, e.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        generated: results.length,
        sitemaps: results,
      }),
    };
  } catch (err) {
    console.error('[Generate Sitemaps] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}

function generateSitemap(country) {
  const baseUrl = country.seo?.canonicalBase || `https://dalli.${country.code.toLowerCase()}`;
  const lang = country.language?.code || 'en';
  const defaultLang = country.language?.code || 'en';
  const langPrefix = lang !== defaultLang ? `/${lang}` : '';

  // In a real implementation, this would fetch from database
  const pages = [
    { slug: 'osnovna-majica', updatedAt: '2024-01-15' },
    { slug: 'dugorukava-majica', updatedAt: '2024-01-15' },
    { slug: 'muska-sportska-trenerka', updatedAt: '2024-01-15' },
    { slug: 'zenska-kapuljaca-trenerka', updatedAt: '2024-01-15' },
    { slug: 'muska-duks-hoodie', updatedAt: '2024-01-15' },
    { slug: 'zenski-duks-hoodie', updatedAt: '2024-01-15' },
    { slug: 'carape', updatedAt: '2024-01-15' },
    { slug: 'salica-za-kafu', updatedAt: '2024-01-15' },
  ];

  const urls = [
    { url: `${baseUrl}${langPrefix}/`, changefreq: 'daily', priority: 1.0 },
    { url: `${baseUrl}${langPrefix}/products/`, changefreq: 'daily', priority: 0.9 },
    ...pages.map(page => ({
      url: `${baseUrl}${langPrefix}/proizvod-${page.slug}/`,
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: page.updatedAt,
    })),
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  urls.forEach(url => {
    xml += '  <url>\n';
    xml += `    <loc>${url.url}</loc>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    if (url.lastmod) xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    
    // Add hreflang for each active country
    const countries = [
      { code: 'RS', language: { code: 'sr' } },
      { code: 'DE', language: { code: 'de' } },
      { code: 'AT', language: { code: 'de' } },
      { code: 'FR', language: { code: 'fr' } },
      { code: 'IT', language: { code: 'it' } },
      { code: 'ES', language: { code: 'es' } },
      { code: 'HR', language: { code: 'hr' } },
      { code: 'BA', language: { code: 'bs' } },
      { code: 'ME', language: { code: 'sr' } },
      { code: 'SI', language: { code: 'sl' } },
    ];
    
    countries.forEach(country => {
      const lang = country.language?.code || 'en';
      const altUrl = getLocalizedUrl(url.url.replace(/^https?:\/\/[^\/]+/, ''), { 
        country: country.code, 
        lang 
      });
      xml += `    <xhtml:link rel="alternate" hreflang="${lang}-${country.code}" href="${altUrl}" />\n`;
    });
    xml += '    <xhtml:link rel="alternate" hreflang="x-default" href="' + getLocalizedUrl(url.url.replace(/^https?:\/\/[^\/]+/, ''), { country: 'RS', lang: 'sr' }) + '" />\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
}

function generateRobotsTxt(countryCode) {
  const country = countries.find(c => c.code === countryCode);
  if (!country) return '';
  
  const baseUrl = country.seo?.canonicalBase || `https://dalli.${countryCode.toLowerCase()}`;
  const lang = country.language?.code || 'en';
  const defaultLang = country.language?.code || 'en';
  const langPrefix = lang !== defaultLang ? `/${lang}` : '';

  let txt = `# ${country.name?.en || countryCode} - robots.txt\n`;
  txt += `# Generated: ${new Date().toISOString()}\n\n`;
  txt += `User-agent: *\n`;
  txt += `Allow: /\n\n`;
  txt += `Disallow: /admin/\n`;
  txt += `Disallow: /cart/\n`;
  txt += `Disallow: /checkout/\n`;
  txt += `Disallow: /account/\n`;
  txt += `Disallow: /api/\n`;
  txt += `Disallow: /*.json$\n\n`;
  txt += `Sitemap: ${baseUrl}${langPrefix}/sitemap.xml\n`;
  txt += `Host: ${new URL(baseUrl).hostname}\n`;

  return txt;
}

function getLocalizedUrl(path, options = {}) {
  const countryCode = options.country || 'RS';
  const lang = options.lang || 'sr';
  const countryConfig = COUNTRIES[countryCode];
  
  const baseUrl = countryConfig?.seo?.canonicalBase || `https://dalli.${countryCode.toLowerCase()}`;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  
  const defaultLang = countryConfig?.language?.code || 'en';
  const langPrefix = lang !== defaultLang ? `/${lang}` : '';
  
  return `${baseUrl}${langPrefix}${cleanPath}`;
}