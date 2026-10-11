/**
 * SEO Indexing Control Utilities
 * Provides meta robots tags and canonical URL helpers
 */

export const NOINDEX_PAGES = [
  // Auth & Account
  '/login.html',
  '/register.html',
  '/logout.html',
  '/password-reset.html',
  '/email-verification.html',
  '/profil.html',
  '/profile.html',
  '/account.html',
  
  // Cart & Checkout
  '/cart.html',
  '/checkout.html',
  '/korpa.html',
  '/placanje.html',
  
  // Admin
  '/admin.html',
  '/admin-login.html',
  '/admin/prijava.html',
  
  // Utility
  '/wishlist.html',
  '/compare.html',
  '/compare/',
  '/search.html',
  '/newsletter.html',
  '/password-reset.html',
  '/password-reset-confirm.html',
  
  // Error pages
  '/404.html',
  '/500.html',
  '/403.html',
  
  // API & Technical
  '/api/',
  '/graphql/',
  '/webhooks/',
];

export const NOFOLLOW_PAGES = [
  '/wishlist.html',
  '/compare.html',
  '/compare/',
];

/**
 * Check if a page should have noindex
 */
export function shouldNoindex(pathname) {
  const path = pathname.split('?')[0].toLowerCase();
  return NOINDEX_PAGES.some(p => path === p.toLowerCase() || path.startsWith(p.toLowerCase().replace('.html', '')));
}

/**
 * Check if a page should have nofollow
 */
export function shouldNofollow(pathname) {
  const path = pathname.split('?')[0].toLowerCase();
  return NOFOLLOW_PAGES.some(p => path === p.toLowerCase() || path.startsWith(p.toLowerCase().replace('.html', '')));
}

/**
 * Generate meta robots tag
 */
export function getMetaRobots(pathname) {
  const noindex = shouldNoindex(pathname);
  const nofollow = shouldNofollow(pathname);
  
  if (noindex && nofollow) return 'noindex, nofollow';
  if (noindex) return 'noindex, follow';
  if (nofollow) return 'index, nofollow';
  return 'index, follow';
}

/**
 * Generate canonical URL
 */
export function getCanonicalUrl(pathname, searchParams = {}) {
  const base = 'https://dalli.rs';
  const path = pathname.split('?')[0];
  
  // Clean search params for canonical
  const cleanParams = new URLSearchParams();
  const allowedParams = ['page', 'sort']; // Only these params in canonical
  
  for (const [key, value] of Object.entries(searchParams)) {
    if (allowedParams.includes(key)) {
      cleanParams.set(key, value);
    }
  }
  
  const query = cleanParams.toString();
  return `${base}${path}${query ? '?' + query : ''}`;
}

/**
 * Generate hreflang links
 */
export function getHreflangLinks(pathname) {
  const base = 'https://dalli.rs';
  const path = pathname.split('?')[0];
  
  return [
    { hreflang: 'sr', href: `${base}${path}` },
    { hreflang: 'sr-Latn', href: `${base}${path}` },
    { hreflang: 'sr-Cyrl', href: `${base}${path}` },
    { hreflang: 'en', href: `${base}${path}` }, // Future English version
    { hreflang: 'x-default', href: `${base}${path}` }
  ];
}

/**
 * Generate complete SEO head tags
 */
export function generateSEOHead(pathname, searchParams = {}) {
  const metaRobots = getMetaRobots(pathname);
  const canonical = getCanonicalUrl(pathname, searchParams);
  const hreflangLinks = getHreflangLinks(pathname);
  
  let html = `  <meta name="robots" content="${metaRobots}">\n`;
  html += `  <link rel="canonical" href="${canonical}">\n`;
  
  for (const link of hreflangLinks) {
    html += `  <link rel="alternate" hreflang="${link.hreflang}" href="${link.href}">\n`;
  }
  
  return html;
}

export default {
  shouldNoindex,
  shouldNofollow,
  getMetaRobots,
  getCanonicalUrl,
  getHreflangLinks,
  generateSEOHead
};