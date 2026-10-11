/**
 * DALLI Logo Component
 * Usage:
 *   import { Logo } from './components/Logo.js';
 *   
 *   // Header - master logo (logo1)
 *   <Logo variant="master" size="md" aria-label="DALLI Home" />
 *   
 *   // Footer - master logo small (logo1)
 *   <Logo variant="master" size="sm" />
 *   
 *   // Hero - horizontal wordmark (logo3)
 *   <Logo variant="wordmark" size="xl" />
 *   
 *   // Dark sections (Elegance) - dark luxury variant (logo2)
 *   <Logo variant="dark" size="lg" />
 */

const LOGO_BASE = '/images/logos/';

const VARIANTS = {
  master: {
    // logo1.jpg - MASTER DALLI LOGO
    // Use globally: Header, Footer, Cart, Checkout, Account, CMS, General brand identity
    srcset: {
      '1x': `${LOGO_BASE}logo1-master@1x.webp`,
      '2x': `${LOGO_BASE}logo1-master@2x.webp`,
    },
    mobileSrcset: {
      '1x': `${LOGO_BASE}logo1-mobile@1x.webp`,
      '2x': `${LOGO_BASE}logo1-mobile@2x.webp`,
    },
    footerSrc: `${LOGO_BASE}logo1-footer.webp`,
    aspectRatio: 763 / 628, // ~1.21
    alt: 'DALLI',
  },
  dark: {
    // logo2.jpg - DARK LUXURY VARIANT
    // Use only on: Dark backgrounds, Dark hero sections, Elegance campaigns, Premium editorial sections
    // Never use on light backgrounds
    srcset: {
      '1x': `${LOGO_BASE}logo2-dark@1x.webp`,
      '2x': `${LOGO_BASE}logo2-dark@2x.webp`,
    },
    mobileSrcset: {
      '1x': `${LOGO_BASE}logo2-dark@1x.webp`,
      '2x': `${LOGO_BASE}logo2-dark@2x.webp`,
    },
    aspectRatio: 1020 / 1280, // ~0.80
    alt: 'DALLI',
  },
  wordmark: {
    // logo3.jpg - HORIZONTAL WORDMARK
    // Use as: Hero luxury statement, Collection identity, Elegance presentation, Editorial sections
    // Do NOT use as primary header logo. Do NOT replace logo1.
    // Purpose: Luxury typography-driven branding
    srcset: {
      '1x': `${LOGO_BASE}logo3-wordmark@1x.webp`,
      '2x': `${LOGO_BASE}logo3-wordmark@2x.webp`,
    },
    tabletSrc: `${LOGO_BASE}logo3-wordmark-tablet.webp`,
    aspectRatio: 1280 / 329, // ~3.89
    alt: 'DALLI',
  },
};

const SIZES = {
  // Header sizes - Refined for Luxury
  md: { height: '32px', mobileHeight: '24px' },   // Desktop header (was 56px/44px)
  sm: { height: '28px' },                            // Footer (was 32px)
  lg: { height: '64px' },                            // Large contexts (was 80px)
  xl: { height: 'auto', maxWidth: '800px', minWidth: '280px' }, // Hero wordmark
};

function getSrcset(variant, density) {
  const v = VARIANTS[variant];
  if (!v) return '';
  
  if ((variant === 'master' || variant === 'dark') && density === 'mobile') {
    return Object.entries(v.mobileSrcset)
      .map(([d, src]) => `${src} ${d}`)
      .join(', ');
  }
  return Object.entries(v.srcset)
    .map(([d, src]) => `${src} ${d}`)
    .join(', ');
}

function getSizesAttr(variant, size) {
  if (variant === 'wordmark') {
    return '(max-width: 768px) 90vw, (max-width: 1200px) 800px, 800px';
  }
  if (variant === 'master' || variant === 'dark') {
    return '(max-width: 640px) 24px, 32px';
  }
  return 'auto';
}

export function Logo({ variant = 'master', size = 'md', ariaLabel, className = '', onLoad, onError }) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  
  if (!v || !s) {
    console.warn(`Logo: invalid variant "${variant}" or size "${size}"`);
    return null;
  }

  const style = {
    display: 'block',
    height: s.height,
    width: 'auto',
    maxWidth: s.maxWidth || 'none',
    minWidth: s.minWidth || '0',
    aspectRatio: variant === 'wordmark' ? v.aspectRatio : undefined,
  };

  // For master and dark variants, use picture element for responsive images
  if (variant === 'master' || variant === 'dark') {
    const picture = document.createElement('picture');
    
    // Mobile source
    const mobileSource = document.createElement('source');
    mobileSource.media = '(max-width: 640px)';
    mobileSource.type = 'image/webp';
    mobileSource.srcset = getSrcset(variant, 'mobile');
    picture.appendChild(mobileSource);
    
    // Desktop source
    const desktopSource = document.createElement('source');
    desktopSource.type = 'image/webp';
    desktopSource.srcset = getSrcset(variant);
    picture.appendChild(desktopSource);
    
    // Fallback img
    const img = document.createElement('img');
    img.src = v.srcset['1x']; // fallback to 1x desktop
    img.alt = v.alt;
    img.loading = 'eager';
    img.width = Math.round(32 * v.aspectRatio);
    img.height = 32;
    img.style.cssText = Object.entries(style).map(([k, v]) => `${k}: ${v}`).join('; ');
    if (className) img.className = className;
    if (ariaLabel) img.setAttribute('aria-label', ariaLabel);
    if (onLoad) img.addEventListener('load', onLoad);
    if (onError) img.addEventListener('error', onError);
    picture.appendChild(img);
    
    return picture;
  }

  // For wordmark, use picture with srcset
  const picture = document.createElement('picture');
  
  if (variant === 'wordmark' && v.tabletSrc) {
    const tabletSource = document.createElement('source');
    tabletSource.media = '(max-width: 768px)';
    tabletSource.type = 'image/webp';
    tabletSource.srcset = v.tabletSrc;
    picture.appendChild(tabletSource);
  }
  
  const desktopSource = document.createElement('source');
  desktopSource.type = 'image/webp';
  desktopSource.srcset = getSrcset(variant);
  desktopSource.sizes = getSizesAttr(variant, size);
  picture.appendChild(desktopSource);
  
  const img = document.createElement('img');
  img.src = getSrcset(variant).split(' ')[0]; // fallback to 1x
  img.alt = v.alt;
  img.loading = variant === 'wordmark' ? 'eager' : 'lazy';
  img.width = variant === 'wordmark' ? 800 : Math.round(32 * v.aspectRatio);
  img.height = variant === 'wordmark' ? 206 : 32;
  img.style.cssText = Object.entries(style).map(([k, v]) => `${k}: ${v}`).join('; ');
  if (className) img.className = className;
  if (ariaLabel) img.setAttribute('aria-label', ariaLabel);
  if (onLoad) img.addEventListener('load', onLoad);
  if (onError) img.addEventListener('error', onError);
  picture.appendChild(img);
  
  return picture;
}

// Auto-initialize: replace all <logo-component> elements
export function initLogos() {
  document.querySelectorAll('logo-component').forEach(el => {
    const variant = el.getAttribute('variant') || 'master';
    const size = el.getAttribute('size') || 'md';
    const ariaLabel = el.getAttribute('aria-label');
    const className = el.getAttribute('class') || '';
    
    const logo = Logo({ variant, size, ariaLabel, className });
    if (logo) {
      el.replaceWith(logo);
    }
  });
}

// Auto-run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogos);
} else {
  initLogos();
}

export default Logo;