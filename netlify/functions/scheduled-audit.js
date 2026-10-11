/**
 * Netlify Scheduled Function - Daily Link Audit
 * Runs at 03:00 UTC via Netlify Scheduled Functions
 * 
 * Deploy: netlify deploy --prod
 * Schedule: Configured in netlify.toml [[functions]] schedule = "0 3 * * *"
 */

const { NetlifyBlobs } = require('@netlify/blobs');

const SITE_URL = process.env.SITE_URL || 'https://dalli.rs';
const BLOB_STORE_NAME = 'link-audit-results';
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL; // Slack/Discord/Email webhook

// Import the audit logic (we'll inline it since Netlify Functions can't easily import ES modules)
async function runLinkAudit() {
  const results = {
    timestamp: new Date().toISOString(),
    siteUrl: SITE_URL,
    pages: [],
    links: [],
    orphans: [],
    broken: [],
    excessive: [],
    opportunities: [],
    stats: {},
    errors: [],
  };

  try {
    // Step 1: Get all pages to scan
    const pagesToScan = await getPagesToScan();
    console.log(`[Audit] Scanning ${pagesToScan.length} pages...`);

    // Step 2: Scan each page
    for (const pageUrl of pagesToScan) {
      try {
        const pageData = await scanPage(pageUrl);
        if (pageData) {
          results.pages.push(pageData);
          results.links.push(...pageData.links);
        }
      } catch (err) {
        results.errors.push({ url: pageUrl, error: err.message });
      }
    }

    // Step 3: Calculate inbound links
    calculateInboundLinks(results);

    // Step 4: Detect orphans
    results.orphans = detectOrphans(results);

    // Step 5: Check broken links (sample for speed in scheduled run)
    results.broken = await checkBrokenLinks(results);

    // Step 6: Detect excessive links
    results.excessive = detectExcessive(results);

    // Step 7: Find opportunities
    results.opportunities = findOpportunities(results);

    // Calculate stats
    results.stats = {
      totalPages: results.pages.length,
      totalLinks: results.links.length,
      orphans: results.orphans.length,
      broken: results.broken.length,
      excessive: results.excessive.filter(e => !e.issue).length,
      opportunities: results.opportunities.reduce((sum, o) => sum + o.opportunities.length, 0),
    };

    console.log(`[Audit] Complete:`, results.stats);

  } catch (err) {
    console.error('[Audit] Fatal error:', err);
    results.errors.push({ fatal: err.message });
  }

  return results;
}

async function getPagesToScan() {
  const urls = new Set();
  const baseUrl = process.env.SITE_URL || 'https://dalli.rs';

  // 1. Try sitemap.xml
  try {
    const response = await fetch(`${baseUrl}/sitemap.xml`);
    if (response.ok) {
      const xml = await response.text();
      const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        urlMatches.forEach(match => {
          const url = match.replace(/<\/?loc>/g, '').trim();
          if (isValidInternalUrl(url, baseUrl)) urls.add(url);
        });
      }
    }
  } catch (e) {
    console.warn('[Audit] Sitemap fetch failed:', e.message);
  }

  // 2. Fallback: known DALLI pages
  const knownPaths = [
    '/', '/index.html',
    '/products.html',
    '/muska-garderoba.html',
    '/zenska-garderoba.html',
    '/dukseri.html',
    '/cart.html',
    '/checkout.html',
    '/complaints.html',
    '/advertising.html',
    '/admin-login.html',
  ];

  knownPaths.forEach(p => urls.add(`${baseUrl}${p}`));

  // 3. Discover product pages by crawling category pages
  try {
    const categoryPages = ['/products.html', '/muska-garderoba.html', '/zenska-garderoba.html', '/dukseri.html'];
    for (const catUrl of categoryPages) {
      try {
        const fullUrl = `${baseUrl}${catUrl}`;
        const response = await fetch(fullUrl);
        if (response.ok) {
          const html = await response.text();
          const productLinks = extractProductLinks(html, baseUrl);
          productLinks.forEach(u => urls.add(u));
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.warn('[Audit] Category crawl failed:', e.message);
  }

  return Array.from(urls);
}

function isValidInternalUrl(url, baseUrl) {
  try {
    const parsed = new URL(url, baseUrl);
    if (parsed.origin !== new URL(baseUrl).origin) return false;
    const pathname = parsed.pathname.toLowerCase();
    const excludedExt = ['.css', '.js', '.json', '.xml', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.gz'];
    if (excludedExt.some(ext => pathname.endsWith(ext))) return false;
    const excludedPaths = ['/admin/', '/admin-new/', '/.git/', '/node_modules/', '/netlify/', '/scripts/', '/images/', '/css/', '/js/', '/fonts/', '/api/'];
    if (excludedPaths.some(p => pathname.startsWith(p))) return false;
    return true;
  } catch {
    return false;
  }
}

async function scanPage(pageUrl) {
  const response = await fetch(pageUrl, { 
    headers: { 'User-Agent': 'DALLI-LinkAuditor/1.0' },
    timeout: 10000,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const links = extractLinksFromHtml(html, pageUrl);
  const content = extractPageContent(html);

  return {
    url: pageUrl,
    title: content.title,
    h1: content.h1,
    metaDescription: content.metaDescription,
    wordCount: content.wordCount,
    headings: content.headings,
    links,
    outboundLinks: links.filter(l => l.isInternal).length,
    inboundLinks: 0, // calculated later
  };
}

function extractLinksFromHtml(html, baseUrl) {
  const links = [];
  // Simple regex-based extraction (faster than DOMParser in Node)
  const anchorRegex = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const anchorText = match[2].replace(/<[^>]+>/g, '').trim();
    
    try {
      const normalized = normalizeUrl(href, baseUrl);
      if (!normalized) continue;
      
      const isInternal = isValidInternalUrl(normalized, baseUrl);
      
      links.push({
        sourceUrl: baseUrl,
        targetUrl: normalized,
        anchorText,
        isInternal,
        isExternal: !isInternal,
      });
    } catch (e) {
      // skip malformed
    }
  }

  return links;
}

function normalizeUrl(href, baseUrl) {
  try {
    const parsed = new URL(href, baseUrl);
    parsed.hash = '';
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractProductLinks(html, baseUrl) {
  const urls = [];
  const productRegex = /<a\s+[^>]*href\s*=\s*["']([^"']*\/proizvod-[^"']+)["']/gi;
  let match;
  while ((match = productRegex.exec(html)) !== null) {
    const normalized = normalizeUrl(match[1], baseUrl);
    if (normalized && isValidInternalUrl(normalized, baseUrl)) {
      urls.add(normalized);
    }
  }
  return Array.from(urls);
}

function extractPageContent(html) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

  // Word count from body text
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, ' ') : '';
  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 2).length;

  // Headings
  const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
  const headings = [];
  let hMatch;
  while ((hMatch = headingRegex.exec(html)) !== null) {
    headings.push(hMatch[1].replace(/<[^>]+>/g, '').trim());
  }

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    h1: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '',
    metaDescription: metaDescMatch ? metaDescMatch[1].trim() : '',
    ogTitle: ogTitleMatch ? ogTitleMatch[1].trim() : '',
    ogDescription: ogDescMatch ? ogDescMatch[1].trim() : '',
    wordCount,
    headings,
  };
}

function calculateInboundLinks(results) {
  const inboundMap = new Map();
  
  results.pages.forEach(page => {
    page.links.forEach(link => {
      if (link.isInternal) {
        inboundMap.set(link.targetUrl, (inboundMap.get(link.targetUrl) || 0) + 1);
      }
    });
  });

  results.pages.forEach(page => {
    page.inboundLinks = inboundMap.get(page.url) || 0;
  });
}

function detectOrphans(results) {
  const orphans = [];
  const skipPaths = ['/admin-login.html', '/admin.html', '/404.html', '/500.html'];

  results.pages.forEach(page => {
    if (skipPaths.some(p => page.url.includes(p))) return;
    if (page.inboundLinks === 0) {
      orphans.push({
        url: page.url,
        title: page.title,
        wordCount: page.wordCount,
        outboundLinks: page.outboundLinks,
        severity: calculateOrphanSeverity(page),
      });
    }
  });

  return orphans;
}

function calculateOrphanSeverity(page) {
  if (page.wordCount > 500 && page.outboundLinks > 0) return 'critical';
  if (page.wordCount > 300 && page.outboundLinks > 0) return 'high';
  if (page.wordCount > 100) return 'medium';
  return 'low';
}

async function checkBrokenLinks(results) {
  const broken = [];
  const uniqueUrls = new Set();
  
  // Collect unique URLs to check
  results.links.forEach(link => {
    if (link.targetUrl) uniqueUrls.add(link.targetUrl);
  });

  // For scheduled run, limit checks to avoid timeout
  const urlsToCheck = Array.from(uniqueUrls).slice(0, 100);
  
  for (const url of urlsToCheck) {
    try {
      const result = await checkUrlStatus(url);
      if (result.isBroken) {
        const occurrences = results.links.filter(l => l.targetUrl === url);
        broken.push({
          url,
          status: result.status,
          error: result.error,
          errorType: result.errorType,
          isExternal: isExternalUrl(url),
          occurrences: occurrences.map(o => ({
            sourceUrl: o.sourceUrl,
            anchorText: o.anchorText,
          })),
        });
      }
    } catch (e) {
      // network error
      broken.push({
        url,
        status: 0,
        error: e.message,
        errorType: 'network_error',
        isExternal: isExternalUrl(url),
        occurrences: [],
      });
    }
  }

  return broken;
}

async function checkUrlStatus(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'DALLI-LinkAuditor/1.0' },
    });
    
    clearTimeout(timeout);
    
    return {
      status: response.status,
      isBroken: response.status >= 400,
      error: response.status >= 400 ? `HTTP ${response.status}` : null,
    };
  } catch (err) {
    return {
      status: 0,
      isBroken: true,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
      errorType: err.name === 'AbortError' ? 'timeout' : 'network_error',
    };
  }
}

function isExternalUrl(url, baseUrl = 'https://dalli.rs') {
  try {
    return new URL(url).origin !== new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function detectExcessive(results) {
  const excessive = [];
  const thresholds = {
    homepage: 150,
    category: 100,
    product: 50,
    article: 80,
    default: 80,
  };

  results.pages.forEach(page => {
    const pageType = detectPageType(page.url);
    const threshold = thresholds[pageType] || thresholds.default;
    const count = page.outboundLinks;

    if (count > threshold) {
      excessive.push({
        url: page.url,
        title: page.title,
        pageType,
        internalLinkCount: count,
        threshold,
        excess: count - threshold,
        severity: count / threshold >= 2.5 ? 'critical' : 
                  count / threshold >= 2.0 ? 'high' : 
                  count / threshold >= 1.5 ? 'medium' : 'low',
      });
    }

    // Too few links
    if (count < 3 && page.wordCount > 300) {
      excessive.push({
        url: page.url,
        title: page.title,
        pageType,
        internalLinkCount: count,
        issue: 'too_few_links',
        severity: count === 0 ? 'high' : 'medium',
      });
    }
  });

  return excessive;
}

function detectPageType(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname === '/' || pathname === '/index.html') return 'homepage';
  if (pathname.includes('/products') || pathname.includes('/muska-garderoba') || 
      pathname.includes('/zenska-garderoba') || pathname.includes('/dukseri')) return 'category';
  if (pathname.includes('/proizvod-')) return 'product';
  return 'default';
}

function findOpportunities(results) {
  // Simplified for scheduled run - just return empty
  // Full opportunities run on-demand in CMS
  return [];
}

// Netlify Blobs storage
async function saveResultsToBlobs(results) {
  try {
    const blobs = new NetlifyBlobs({ name: 'link-audit-results', siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_AUTH_TOKEN });
    await blobs.set('latest', JSON.stringify(results), { 
      metadata: { 
        timestamp: results.timestamp,
        stats: JSON.stringify(results.stats),
      } 
    });
    
    // Also keep history (last 30 days)
    const dateKey = `history/${new Date().toISOString().split('T')[0]}`;
    await blobs.set(dateKey, JSON.stringify(results));
    
    console.log('[Audit] Results saved to Netlify Blobs');
  } catch (err) {
    console.error('[Audit] Failed to save to Blobs:', err.message);
  }
}

// Send alert if issues found
async function sendAlert(results) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { stats } = results;
  if (stats.broken === 0 && stats.orphans === 0) return; // Only alert on issues

  const payload = {
    text: `🚨 DALLI Link Audit Alert`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*DALLI Daily Link Audit* - ${new Date().toLocaleDateString('sr-RS')}` } },
      { type: 'section', fields: [
        { type: 'mrkdwn', text: `*Stranica:* ${stats.totalPages}` },
        { type: 'mrkdwn', text: `*Linkova:* ${stats.totalLinks}` },
        { type: 'mrkdwn', text: `*🚫 Orphan:* ${stats.orphans}` },
        { type: 'mrkdwn', text: `*❌ Broken:* ${stats.broken}` },
        { type: 'mrkdwn', text: `*⚠️ Excessive:* ${stats.excessive}` },
        { type: 'mrkdwn', text: `*💡 Opportunities:* ${stats.opportunities}` },
      ]},
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Vreme: ${new Date().toLocaleString('sr-RS')}` }] },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('[Audit] Alert sent');
  } catch (err) {
    console.error('[Audit] Alert failed:', err.message);
  }
}

// Main handler
export default async function handler(event, context) {
  console.log('[Scheduled Audit] Starting...');
  
  const startTime = Date.now();
  
  try {
    const results = await runLinkAudit();
    
    // Save to Netlify Blobs
    await saveResultsToBlobs(results);
    
    // Send alert if issues
    await sendAlert(results);
    
    console.log(`[Scheduled Audit] Completed in ${Date.now() - startTime}ms`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        stats: results.stats,
        duration: Date.now() - startTime,
      }),
    };
  } catch (err) {
    console.error('[Scheduled Audit] Failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}