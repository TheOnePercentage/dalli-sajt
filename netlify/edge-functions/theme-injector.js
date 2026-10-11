/**
 * Netlify Edge Function - Theme Injector
 * Injects active Experience Center theme into customer-facing HTML pages.
 * Applies seasonal theme, scheduled switching, maintenance mode and luxury mode.
 * No rebuild, no code changes required — theme flips at the edge.
 *
 * Production hardening: this edge function is the single point that applies the
 * Content-Security-Policy header and a REAL, per-request nonce. It rewrites the
 * nonce placeholders ({NONCE} / GENERATED_AT_RUNTIME) in the served HTML and
 * adds the nonce to every inline <script>/<style> so strict CSP stays
 * functional. Fail-open design: if this function is ever bypassed, no CSP is
 * emitted rather than a broken literal nonce.
 */

import { getStore } from '@netlify/blobs';
import { createDefaultConfig, getPublicSlice } from '../../js/experience/experience-config.js';
import { evaluateScheduledTheme } from '../../js/experience/experience-mutations.js';

export const config = { path: '/*' };

const SKIP_PREFIXES = ['/admin', '/_netlify', '/.netlify', '/api/'];
const SKIP_EXTENSIONS =
  /\.(css|js|mjs|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf|xml|txt|json|zip)$/i;
const BYPASS_COOKIE = 'dalli_exp_bypass';

const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'nonce-{NONCE}' https://cdn.dalli.rs https://fonts.googleapis.com https://connect.facebook.net https://connect.instagram.com https://connect.tiktok.com https://tag.twitter.com https://www.google-analytics.com https://www.googletagmanager.com; style-src 'self' 'nonce-{NONCE}' 'unsafe-hashes' https://fonts.googleapis.com https://cdn.dalli.rs; font-src 'self' data: https://fonts.gstatic.com https://cdn.dalli.rs; img-src 'self' data: https://cdn.dalli.rs https://www.google-analytics.com https://www.googletagmanager.com; connect-src 'self' https://api.dalli.rs https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com wss://api.dalli.rs; frame-src 'self' https://www.facebook.com https://www.instagram.com https://www.youtube.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://dalli.rs; manifest-src 'self'; worker-src 'self' blob:; report-uri /api/security/csp-report;";

function shouldProcess(url, request, response) {
  if (request.method !== 'GET') return false;
  const path = url.pathname;
  if (SKIP_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix))) return false;
  if (SKIP_EXTENSIONS.test(path)) return false;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return false;

  return true;
}

function hasAdminBypass(request) {
  const cookie = request.headers.get('cookie') || '';
  return cookie.split(';').some(part => part.trim().startsWith(`${BYPASS_COOKIE}=`));
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateNonce() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function applyNonceToHtml(html, nonce) {
  let out = html
    .replace(/nonce="(?:NONCE|GENERATED_AT_RUNTIME)"/g, `nonce="${nonce}"`)
    .replace(/data-csp-nonce="GENERATED_AT_RUNTIME"/g, `data-csp-nonce="${nonce}"`);

  // Add nonce to inline scripts (without src and without nonce)
  out = out.replace(/<script(?![^>]*\bsrc=)(?![^>]*\bnonce=)([^>]*)>/gi, (match) => {
    return match.replace(/>$/, ` nonce="${nonce}">`);
  });

  // Add nonce to inline styles (without nonce)
  out = out.replace(/<style(?![^>]*\bnonce=)([^>]*)>/gi, (match) => {
    return match.replace(/>$/, ` nonce="${nonce}">`);
  });

  return out;
}

function applyNonceToCsp(csp, nonce) {
  return csp.replace(/'nonce-\{NONCE\}'/g, `'nonce-${nonce}'`);
}

function buildThemeVars(theme, luxury) {
  const accent = (theme && theme.accent) || {};
  const vars = [
    `--exp-primary:${accent.primary || '#2c3e50'}`,
    `--exp-secondary:${accent.secondary || '#34495e'}`,
    `--exp-highlight:${accent.highlight || '#e74c3c'}`,
    `--exp-background:${accent.background || '#ffffff'}`,
    `--exp-surface:${accent.surface || '#f8f9fa'}`,
    `--exp-text-on-primary:${accent.textOnPrimary || '#ffffff'}`,
    `--exp-font-heading:${luxury ? "'Playfair Display', Georgia, serif" : 'inherit'}`,
    `--exp-promo-opacity:${luxury && luxury.reducePromotions ? '0.35' : '1'}`,
  ];
  return vars.join(';');
}

function resolveAssetUrl(assets, assetId) {
  if (!assetId || !assets) return '';
  const lib = Array.isArray(assets.library) ? assets.library : [];
  const found = lib.find(a => a && a.id === assetId);
  return found && found.url ? found.url : '';
}

function buildAssetMap(assets) {
  const positions = (assets && assets.positions) || {};
  const out = {};
  Object.keys(positions).forEach(key => {
    const pos = positions[key];
    const url = resolveAssetUrl(assets, pos && pos.assetId);
    if (url) out[key] = url;
  });
  return out;
}

function buildOperationsNotices(operations) {
  if (!operations) return [];
  const notices = [];
  const holiday = operations.holiday || {};
  if (holiday.enabled) {
    notices.push({
      type: 'holiday',
      text: holiday.customerNotice || holiday.message || 'Trenutno smo na kolektivnom odmoru.',
    });
  }
  if (operations.orderPause && operations.orderPause.enabled) {
    notices.push({
      type: 'order',
      text: operations.orderPause.message || 'Porudžbine su trenutno pauzirane.',
    });
  }
  if (operations.shippingPause && operations.shippingPause.enabled) {
    notices.push({
      type: 'shipping',
      text: operations.shippingPause.message || 'Dostava je trenutno pauzirana.',
    });
  }
  (operations.notices || [])
    .filter(n => n && n.active && n.text)
    .forEach(n => notices.push({ type: n.type || 'info', text: n.text }));
  return notices;
}

function buildBrandIdentity(brandIdentity) {
  if (!brandIdentity || typeof brandIdentity !== 'object') return null;
  const phones = Array.isArray(brandIdentity.phones) ? brandIdentity.phones : [];
  const emails = Array.isArray(brandIdentity.emails) ? brandIdentity.emails : [];
  const primaryPhone = phones.find(p => p && p.primary) || phones[0] || null;
  const primaryEmail = emails.find(e => e && e.primary) || emails[0] || null;
  const addr = brandIdentity.address || {};
  return {
    brandName: brandIdentity.brandName || '',
    companyName: brandIdentity.companyName || '',
    phone: (primaryPhone && (primaryPhone.number || primaryPhone.label)) || '',
    email: (primaryEmail && (primaryEmail.address || primaryEmail.label)) || '',
    address: [addr.streetAddress, addr.postalCode, addr.addressLocality, addr.addressCountry]
      .filter(Boolean)
      .join(', '),
    primaryDomain: brandIdentity.primaryDomain || '',
  };
}

function buildDataIsland(publicConfig) {
  const payload = {
    activeThemeId: publicConfig.activeThemeId,
    scheduledTheme: publicConfig.scheduledTheme,
    updatedAt: publicConfig.updatedAt,
    hero: publicConfig.hero,
    maintenance: publicConfig.maintenance
      ? {
          enabled: !!publicConfig.maintenance.enabled,
          message: publicConfig.maintenance.message || '',
          countdownEnabled: !!publicConfig.maintenance.countdownEnabled,
          targetAt: publicConfig.maintenance.targetAt || null,
        }
      : { enabled: false },
    luxury: publicConfig.luxury ? { enabled: !!publicConfig.luxury.enabled } : { enabled: false },
    editorial: publicConfig.activeTheme ? !!publicConfig.activeTheme.editorial : false,
    announcement:
      (publicConfig.activeTheme && publicConfig.activeTheme.promotionalText
        ? publicConfig.activeTheme.promotionalText.announcement
        : '') || '',
    brandIdentity: buildBrandIdentity(publicConfig.brandIdentity),
    assets: buildAssetMap(publicConfig.assets),
    operations: buildOperationsNotices(publicConfig.operations),
    social: (publicConfig.social && Array.isArray(publicConfig.social.accounts)
      ? publicConfig.social.accounts
      : []
    ).map(a => ({ platform: a.platform, handle: a.handle, url: a.url, primary: !!a.primary })),
  };
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

function buildBootScript() {
  return [
    'try{',
    'var d=JSON.parse(document.getElementById("dalli-experience-data").textContent);',
    'if(d){',
    'document.documentElement.setAttribute("data-exp-theme",d.activeThemeId||"default");',
    'if(d.luxury&&d.luxury.enabled){document.documentElement.setAttribute("data-exp-luxury","1");}',
    'if(d.editorial){document.documentElement.setAttribute("data-exp-editorial","1");}',
    'var hasBypass=document.cookie.split(";").some(function(c){return c.trim().indexOf("dalli_exp_bypass=")===0;});',
    'var m=d.maintenance;',
    'if(m&&m.enabled&&!hasBypass){document.documentElement.setAttribute("data-exp-maintenance","1");}',
    'document.addEventListener("DOMContentLoaded",function(){',
    'try{',
    // Announcement / operations notices (operations take precedence over promo).
    'var a=document.getElementById("dalli-exp-announcement");',
    'var ops=d.operations||[];',
    'var text="";',
    'if(ops.length){text=ops.map(function(o){return o.text;}).join("  ·  ");}',
    'else if(d.announcement){text=d.announcement;}',
    'if(a){if(text){a.textContent=text;a.hidden=false;a.className="dalli-exp-announcement"+(ops.length?" dalli-exp-announcement--notice":"");}else{a.hidden=true;}}',
    '}catch(e){}',
    // Brand identity placeholders.
    'try{var bi=d.brandIdentity;if(bi){',
    'var setText=function(sel,val){if(!val)return;var els=document.querySelectorAll(sel);for(var i=0;i<els.length;i++){els[i].textContent=val;}};',
    'var setAttr=function(sel,attr,val){if(!val)return;var els=document.querySelectorAll(sel);for(var i=0;i<els.length;i++){els[i].setAttribute(attr,val);}};',
    'setText("[data-exp-brand-name]",bi.brandName||bi.companyName);',
    'setText("[data-exp-company-name]",bi.companyName);',
    'setText("[data-exp-phone]",bi.phone);setAttr("[data-exp-phone][href],[data-exp-phone-link]","href",bi.phone?"tel:"+String(bi.phone).replace(/[^0-9+]/g,""):"");',
    'setText("[data-exp-email]",bi.email);setAttr("[data-exp-email][href],[data-exp-email-link]","href",bi.email?"mailto:"+bi.email:"");',
    'setText("[data-exp-address]",bi.address);',
    '} }catch(e){}',
    // Asset / logo application.
    'try{var as=d.assets||{};',
    'var applyImg=function(sel,url){if(!url)return;var els=document.querySelectorAll(sel);for(var i=0;i<els.length;i++){els[i].setAttribute("src",url);}};',
    'applyImg("img[data-exp-logo=\\"header\\"],header a[href=\\"/\\"] img,.site-header .logo img,header .logo img",as.headerLogo);',
    'applyImg("img[data-exp-logo=\\"footer\\"],footer .logo img,footer img.logo",as.footerLogo);',
    'applyImg("img[data-exp-logo=\\"mobile\\"],.mobile-logo img",as.mobileLogo);',
    'applyImg("img[data-exp-logo=\\"dark\\"],img[data-exp-logo=\\"dark\\"]",as.darkLogo);',
    'applyImg("img[data-exp-logo=\\"light\\"],img[data-exp-logo=\\"light\\"]",as.lightLogo);',
    'if(as.favicon){var fl=document.querySelectorAll("link[rel=\\"icon\\"],link[rel=\\"shortcut icon\\"]");for(var i=0;i<fl.length;i++){fl[i].setAttribute("href",as.favicon);}}',
    'if(as.appIcon){var ai=document.querySelectorAll("link[rel=\\"apple-touch-icon\\"]");for(var i=0;i<ai.length;i++){ai[i].setAttribute("href",as.appIcon);}}',
    'if(as.ogLogo){var og=document.querySelectorAll("meta[property=\\"og:image\\"]");for(var i=0;i<og.length;i++){og[i].setAttribute("content",as.ogLogo);}}',
    '}catch(e){}',
    '});',
    '}',
    '}catch(e){}',
  ].join('');
}

function buildThemeConsumerCss() {
  return [
    '#dalli-exp-announcement{display:block;text-align:center;padding:8px 16px;font-size:13px;letter-spacing:.02em;background:var(--exp-primary,#2c3e50);color:var(--exp-text-on-primary,#ffffff);}',
    '#dalli-exp-announcement[hidden]{display:none;}',
    '#dalli-exp-announcement.dalli-exp-announcement--notice{background:var(--exp-highlight);font-weight:600;}',
    '[data-exp-luxury="1"] .sale-badge,[data-exp-luxury="1"] [data-promo],[data-exp-editorial="1"] .sale-badge,[data-exp-editorial="1"] [data-promo]{opacity:var(--exp-promo-opacity,0.35);}',
    '[data-exp-theme] ::selection{background:var(--exp-primary);color:var(--exp-text-on-primary);}',
  ].join('');
}

function buildMaintenancePage(maintenance, theme) {
  const accent = (theme && theme.accent) || {};
  const message = escapeHtml(maintenance.message || 'Vraćamo se vrlo brzo.');
  const targetAt = maintenance.targetAt || '';
  const countdown =
    maintenance.countdownEnabled && targetAt
      ? `<div class="exp-maintenance-countdown" id="exp-countdown" data-target="${escapeHtml(targetAt)}" aria-live="polite"></div>
       <script nonce="{NONCE}">
       (function(){var el=document.getElementById("exp-countdown");if(!el)return;
       var t=new Date(el.getAttribute("data-target")).getTime();
       function tick(){var d=t-Date.now();if(d<=0){el.textContent="Uskoro...";return;}
       var days=Math.floor(d/86400000),h=Math.floor(d/3600000)%24,m=Math.floor(d/60000)%60,s=Math.floor(d/1000)%60;
       el.textContent=(days?days+"d ":"")+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
       setTimeout(tick,1000);}tick();})();
       </script>`
      : '';

  return `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>DALLI — Održavanje</title>
<style nonce="{NONCE}">
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${accent.background || '#0d0d0d'};color:${accent.textOnPrimary || '#ffffff'};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:24px}
.exp-box{max-width:560px}
.exp-logo{font-size:2.5rem;font-weight:800;letter-spacing:.35em;margin-bottom:24px;color:${accent.highlight || '#ffd700'}}
h1{font-size:1.5rem;margin-bottom:12px;font-weight:600}
p{opacity:.8;line-height:1.6;margin-bottom:24px}
.exp-maintenance-countdown{font-size:2rem;font-weight:700;letter-spacing:.1em;font-variant-numeric:tabular-nums;color:${accent.highlight || '#ffd700'}}
</style>
</head>
<body>
<main class="exp-box" role="main">
<div class="exp-logo">DALLI</div>
<h1>Održavanje sajta</h1>
<p>${message}</p>
${countdown}
</main>
</body>
</html>`;
}

async function loadPublicConfig() {
  try {
    const store = getStore({ name: 'experience', consistency: 'strong' });
    let config = null;
    try {
      config = await store.get('config', { type: 'json' });
    } catch (err) {
      if (err && err.message && !/404|not found/i.test(err.message)) {
        console.warn('[Theme Injector] Config read failed:', err.message);
      }
    }

    if (!config || typeof config !== 'object') {
      return getPublicSlice(createDefaultConfig());
    }

    const scheduled = evaluateScheduledTheme(config);
    if (scheduled.changed && scheduled.config) {
      config = scheduled.config;
      try {
        await store.setJSON('config', config);
      } catch (err) {
        console.warn('[Theme Injector] Scheduled write failed:', err.message);
      }
    }

    return getPublicSlice(config);
  } catch (err) {
    console.warn('[Theme Injector] Blobs unavailable:', err.message);
    return getPublicSlice(createDefaultConfig());
  }
}

export default async function injector(request, context) {
  const url = new URL(request.url);
  const response = await context.next();

  if (!response.ok || !shouldProcess(url, request, response)) {
    return response;
  }

  const publicConfig = await loadPublicConfig();
  const maintenance = publicConfig.maintenance || { enabled: false };
  const theme = publicConfig.activeTheme;

  const nonce = generateNonce();

  if (maintenance.enabled && !hasAdminBypass(request)) {
    const html = applyNonceToHtml(buildMaintenancePage(maintenance, theme), nonce);
    return new Response(html, {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '300',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': applyNonceToCsp(DEFAULT_CSP, nonce),
      },
    });
  }

  const html = await response.text();
  const headInjection =
    `<style id="dalli-theme-vars" nonce="{NONCE}">:root{${buildThemeVars(theme, publicConfig.luxury)}}</style>` +
    `<style id="dalli-theme-consumers" nonce="{NONCE}">${buildThemeConsumerCss()}</style>` +
    `<script id="dalli-experience-data" type="application/json">${buildDataIsland(publicConfig)}</script>` +
    `<script id="dalli-experience-boot" nonce="{NONCE}">${buildBootScript()}</script>`;

  const announcementInjection = '<div id="dalli-exp-announcement" hidden></div>';

  let injected = html;
  if (html.includes('</head>')) {
    injected = injected.replace('</head>', `${headInjection}</head>`);
  } else {
    injected = headInjection + injected;
  }

  if (injected.includes('<body')) {
    injected = injected.replace(/(<body[^>]*>)/, `$1${announcementInjection}`);
  }

  const nonced = applyNonceToHtml(injected, nonce);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('Cache-Control', 'public, max-age=60, must-revalidate');
  headers.set('Content-Security-Policy', applyNonceToCsp(DEFAULT_CSP, nonce));

  return new Response(nonced, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
