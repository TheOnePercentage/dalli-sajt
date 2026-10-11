import { $, $$, formatPrice } from '../core/dom.js';
import { cartSignal, addToCart, subscribeToCart } from '../state/cart.js';
import { emit, DOM_EVENTS } from '../core/events.js';

let productsCache = [];
let isInitialized = false;

const getDefaultVariant = (product) => {
  return product.variants?.[0] || {
    color: product.colors?.[0]?.name,
    size: product.sizes?.[0]?.size,
    price: product.price,
    image: product.images?.main
  };
};

const getBadgeClass = (badge) => {
  switch (badge) {
    case 'bestseller': return 'warning';
    case 'new': return 'primary';
    default: return 'accent';
  }
};

const getBadgeText = (badge) => {
  switch (badge) {
    case 'bestseller': return 'Bestseller';
    case 'new': return 'Novo';
    default: return 'Akcija';
  }
};

const renderProductCard = (product) => {
  const variant = getDefaultVariant(product);
  const salePrice = product.salePrice && product.salePrice < product.price ? product.salePrice : null;
  const hasSale = !!salePrice;
  const price = variant.price || product.price;
  const installment = Math.ceil(price / 3);

  return `
    <article class="product-card" data-product-id="${product.id}" role="listitem">
      <div class="product-card__media">
        <img class="product-card__image" src="${variant.image || product.images?.main || '/images/placeholder.jpg'}" alt="${product.name}" loading="lazy" width="400" height="400" decoding="async">
        ${product.badge ? `<div class="product-card__badges"><span class="badge badge-${getBadgeClass(product.badge)}">${getBadgeText(product.badge)}</span></div>` : ''}
        <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label="Dodaj na listu želja">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant.color}-${variant.size}" aria-label="Brzo dodaj ${product.name} u korpu">Dodaj u korpu</button>
      </div>
      <div class="product-card__content">
        <span class="product-card__category">${product.category || 'Garderoba'}</span>
        <h3 class="product-card__name">${product.name}</h3>
        <div class="product-card__rating">
          <span class="product-card__stars">${'★'.repeat(Math.floor(product.rating || 4.5))}${'☆'.repeat(5 - Math.floor(product.rating || 4.5))}</span>
          <span>(${product.reviews || 0})</span>
        </div>
        <div class="product-card__price-row">
          <span class="product-card__price">${formatPrice(price)}</span>
          ${hasSale ? `<span class="product-card__old-price">${formatPrice(product.price)}</span>` : ''}
        </div>
        <p class="product-card__installment">ili ${formatPrice(installment)} x 3 rate bez kamate</p>
      </div>
    </article>
  `;
};

const renderProductGrid = (containerId, products) => {
  const container = $(`#${containerId}`);
  if (!container) return;

  container.innerHTML = products.map(renderProductCard).join('');
};

const filterProducts = (products, type) => {
  switch (type) {
    case 'favorites':
      return products.filter(p => p.featured).slice(0, 8);
    case 'bestsellers':
      return products.filter(p => p.bestseller).slice(0, 8);
    case 'new':
      return [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
    default:
      return [];
  }
};

const renderFeaturedProducts = () => {
  if (!productsCache.length) return;

  const favorites = filterProducts(productsCache, 'favorites');
  const bestsellers = filterProducts(productsCache, 'bestsellers');
  const newArrivals = filterProducts(productsCache, 'new');

  renderProductGrid('featuredProductsFavorites', favorites);
  renderProductGrid('featuredProductsBestsellers', bestsellers);
  renderProductGrid('featuredProductsNew', newArrivals);
};

const renderCategoryCounts = () => {
  if (!productsCache.length) return;

  const counts = {
    muski: productsCache.filter(p => p.gender === 'muski').length,
    zenski: productsCache.filter(p => p.gender === 'zenski').length,
    dukseri: productsCache.filter(p => p.category === 'dukseri').length,
    bestseller: productsCache.filter(p => p.bestseller).length
  };
  Object.entries(counts).forEach(([key, count]) => {
    const el = $(`#catCount${key.charAt(0).toUpperCase() + key.slice(1)}`);
    if (el) el.textContent = count;
  });
};

const loadProducts = async () => {
  try {
    const res = await fetch('/data/products.json', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to load products');
    const data = await res.json();
    productsCache = data.products || [];
    renderFeaturedProducts();
    renderCategoryCounts();
    emit(DOM_EVENTS.PRODUCTS_LOADED, { products: productsCache });
  } catch (err) {
    console.error('Failed to load products:', err);
  }
};

export const initFeaturedRenderer = async () => {
  if (isInitialized) return;
  await loadProducts();
  isInitialized = true;
  return { loadProducts, renderFeaturedProducts, renderCategoryCounts, productsCache };
};

export const refreshFeaturedProducts = () => {
  renderFeaturedProducts();
};

export const getProductsCache = () => productsCache;

if (typeof window !== 'undefined') {
  window.DALLI_FeaturedRenderer = { initFeaturedRenderer, loadProducts, renderFeaturedProducts, renderCategoryCounts, getProductsCache };
}