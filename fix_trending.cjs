const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');

const start = js.indexOf('const TrendingNow = (() => {');
const end = js.indexOf('window.TrendingNow = TrendingNow;') + 30;

console.log('Replacing from', start, 'to', end);

const correctModule = `const TrendingNow = (() => {
  let sectionEl = null;
  let gridEl = null;
  let products = [];
  let trendingProducts = [];
  let maxItems = 8;
  let decayFactor = 0.15; // Per day decay
  let refreshInterval = null;

  const loadProducts = async () => {
    try {
      const response = await fetch('/data/products.json', { credentials: 'same-origin' });
      if (response.ok) {
        const data = await response.json();
        products = data.products || data || [];
      }
    } catch (e) {
      console.warn('[TrendingNow] Failed to load products:', e);
      products = [];
    }
  };

  const computeTrending = () => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    trendingProducts = products
      .map(product => {
        const views = product.views || Math.floor(Math.random() * 1000);
        const purchases = product.purchases || Math.floor(Math.random() * 100);
        const wishlists = product.wishlists || Math.floor(Math.random() * 50);
        const cartAdds = product.cartAdds || Math.floor(Math.random() * 30);
        const daysSinceLaunch = product.createdAt ? (Date.now() - new Date(product.createdAt).getTime()) / DAY_MS : 30;

        const engagement = views * 1 + purchases * 10 + wishlists * 3 + cartAdds * 5;
        const timeDecay = Math.exp(-0.15 * daysSinceLaunch);
        const score = engagement * Math.exp(-0.15 * daysSinceLaunch);

        return { product, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item, index) => ({ ...item.product, trendingScore: item.score, trendingRank: index + 1 }));
  };

  const render = () => {
    if (!gridEl) return;

    if (trendingProducts.length === 0) {
      if (sectionEl) sectionEl.style.display = 'none';
      return;
    }

    if (sectionEl) sectionEl.style.display = 'block';

    gridEl.innerHTML = trendingProducts.map((product, index) => {
      const variant = product.variants?.[0] || { 
        color: product.colors?.[0]?.name, 
        size: product.sizes?.[0]?.size, 
        price: product.price, 
        image: product.images?.main 
      };
      const salePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : null;
      const displayPrice = salePrice || variant?.price || product.price;
      const badge = product.badge;
      const delay = index * 40;

      const score = product.trendingScore || 0;
      const formattedScore = score >= 1000 ? (score / 1000).toFixed(1) + 'k' : Math.round(score);

      return \`
        <article class="product-card animate-reveal" 
                 data-product-id="\${product.id}" 
                 data-ab-variant="trending" 
                 style="animation-delay: \${index * 40}ms;" 
                 role="listitem">
          <div class="product-card__media">
            <picture>
              <source type="image/avif" srcset="\${variant?.image?.replace('.jpg', '.avif') || product.images?.main?.replace('.jpg', '.avif') || '/images/placeholder.avif'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <source type="image/webp" srcset="\${variant?.image?.replace('.jpg', '.webp') || product.images?.main?.replace('.jpg', '.webp') || '/images/placeholder.webp'}" sizes="(max-width: 479px) 100vw, (max-width: 1023px) 50vw, 25vw">
              <img class="product-card__image" 
                   src="\${variant?.image || product.images?.main || '/images/placeholder.jpg'}" 
                   alt="\${escapeHtml(product.altText || product.name)}" 
                   loading="lazy" width="400" height="400" decoding="async"
                   style="background: \${getDominantColor(product)};">
            </picture>
            <div class="product-card__parallax-overlay"></div>
            \${badge ? \`<div class="product-card__badges"><span class="badge badge-\${badge === 'bestseller' ? 'warning' : badge === 'new' ? 'primary' : 'accent'}\">\${badge === 'bestseller' ? 'Bestseller' : badge === 'new' ? 'Novo' : 'Akcija'}</span></div>\` : ''}
            <div class="trending-score" aria-label="Trending score: \${formattedScore}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="23 6 16 12 23 18"/></svg>
              <span>\${formattedScore}</span>
            </div>
            <button class="product-card__wishlist" data-action="wishlist" data-product-id="\${product.id}" aria-label="\${escapeHtml('Dodaj ' + product.name + ' na listu želja')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
            <button class="product-card__quick-add" data-action="quick-add" data-product-id="\${product.id}" data-variant-id="\${product.id}-\${variant?.color}-\${variant?.size}" aria-label="\${escapeHtml('Brzo dodaj ' + product.name + ' u korpu')}">Dodaj u korpu</button>
            <span class="product-card__ripple" aria-hidden="true"></span>
          </div>
          <div class="product-card__content">
            <span class="product-card__category">\${escapeHtml(product.category || 'Garderoba')}</span>
            <h3 class="product-card__name">\${escapeHtml(product.name)}</h3>
            <div class="product-card__rating"><span class="product-card__stars">\${'★'.repeat(Math.floor(product.rating || 4.5))}\${'☆'.repeat(5 - Math.floor(product.rating || 4.5))}</span><span>(\${product.reviews || 0})</span></div>
            <div class="product-card__price-row"><span class="product-card__price" data-price="\${displayPrice}">\${formatPrice(displayPrice)}</span>\${salePrice ? \`<span class="product-card__old-price">\${formatPrice(product.price)}</span>\` : ''}</div>
            <p class="product-card__installment">ili \${Math.ceil(displayPrice / 3).toLocaleString('sr-RS')} RSD x 3 rate bez kamate</p>
          </div>
        </article>
      \`;
    }).join('');

    gridEl.dataset.rendered = 'true';
  };

  const startAutoRefresh = () => {
    refreshInterval = setInterval(() => {
      computeTrending();
      render();
    }, 30 * 60 * 1000);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) clearInterval(refreshInterval);
  };

  const getDominantColor = (product) => {
    const colorMap = { 'muski': '#1a1a2e', 'zenski': '#ec4899', 'dukseri': '#16a34a', 'bestseller': '#f59e0b', 'trenerke': '#2563eb', 'majice': '#f5f5f5', 'aksesoari': '#808080', 'merch': '#f59e0b' };
    return colorMap[product.category?.toLowerCase()] || colorMap[product.gender?.toLowerCase()] || '#1a1a2e';
  };

  const formatPrice = (num) => { try { return new Intl.NumberFormat('sr-RS').format(num) + ' RSD'; } catch { return num.toLocaleString() + ' RSD'; } };
  const escapeHtml = (str) => { if (!str) return ''; return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/\"/g, '"').replace(/'/g, '&#039;'); };
  const trackEvent = (eventName, data) => { const payload = { event: eventName, section: 'trending_now', timestamp: Date.now(), device: window.innerWidth < 768 ? 'mobile' : 'desktop', ...data }; if (window.dataLayer) window.dataLayer.push(payload); if (window.gtag) window.gtag('event', eventName, payload); console.log('[TrendingNow] Track:', payload); };

  const init = async () => {
    sectionEl = document.getElementById('trendingNow');
    if (!sectionEl) return;

    gridEl = document.getElementById('trendingGrid');
    await loadProducts();
    computeTrending();
    render();
    startAutoRefresh();

    console.log('[TrendingNow] Initialized', { products: trendingProducts.length });
  };

  const refresh = () => { computeTrending(); render(); };

  return { init, refresh };
})();

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', TrendingNow.init); else TrendingNow.init();
window.TrendingNow = TrendingNow;`;

const startIdx = js.indexOf('const TrendingNow = (() => {');
const endIdx = js.indexOf('window.TrendingNow = TrendingNow;') + 30;

const newJs = js.substring(0, startIdx) + correctModule + js.substring(endIdx);
fs.writeFileSync('js/app.js', newJs);
console.log('Fixed TrendingNow module');