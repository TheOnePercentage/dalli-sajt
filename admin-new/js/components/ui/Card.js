/**
 * DALLI Card Component System
 * Mobile-first, SEO-optimized, accessible
 * Variants: product, content, feature, stats, testimonial, skeleton
 * Built for e-commerce with schema.org Product markup support
 */

export class Card {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      variant: options.variant || 'content',
      interactive: options.interactive !== false,
      schemaOrg: options.schemaOrg !== false,
      lazyLoad: options.lazyLoad !== false,
      onClick: options.onClick || null,
      onAddToCart: options.onAddToCart || null,
      onWishlist: options.onWishlist || null,
      ...options
    };

    this.productData = options.productData || null;
    this.init();
  }

  static create(options = {}) {
    const card = document.createElement('article');
    card.className = `card card--${options.variant || 'content'}`;
    
    if (options.interactive !== false) card.classList.add('card--interactive');
    if (options.elevated) card.classList.add('card--elevated');
    
    const content = options.content || '';
    card.innerHTML = content;
    
    if (options.onClick) {
      card.addEventListener('click', options.onClick);
    }

    return new Card(card, options);
  }

  // Create a product card with full SEO schema.org markup
  static createProduct(product, options = {}) {
    const {
      id,
      name,
      slug,
      price,
      salePrice,
      currency = 'RSD',
      images = {},
      colors = [],
      sizes = [],
      rating = 4.5,
      reviewCount = 0,
      badge = null,
      inStock = true,
      description = '',
      sku = '',
      category = '',
      brand = 'DALLI'
    } = product;

    const hasSale = salePrice && salePrice < price;
    const displayPrice = hasSale ? salePrice : price;
    const originalPrice = hasSale ? price : null;
    const discountPct = hasSale ? Math.round((1 - salePrice / price) * 100) : 0;

    const imageUrl = images.main || '/images/placeholder.jpg';
    const imageAlt = `${name} - ${description || 'Kvalitetan proizvod'}`;
    const productUrl = `/proizvod-${slug}.html`;

    // Schema.org Product JSON-LD
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `https://dalli.rs/proizvod-${slug}.html#product`,
      sku: sku || `ML-${id}`,
      name,
      description: description || `Kvalitetan ${name.toLowerCase()} od 100% organskog pamuka.`,
      brand: { '@type': 'Brand', name: brand },
      category: category || 'Odeća',
      image: [
        `https://cdn.dalli.rs${images.main}`,
        ...(images.gallery || []).map(g => `https://cdn.dalli.rs${g}`)
      ].filter(Boolean),
      offers: {
        '@type': 'Offer',
        '@id': `https://dalli.rs/proizvod-${slug}.html#offer`,
        url: `https://dalli.rs${productUrl}`,
        priceCurrency: currency,
        price: displayPrice,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: 'DALLI', url: 'https://dalli.rs' },
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      aggregateRating: reviewCount > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: reviewCount,
        bestRating: 5,
        worstRating: 1
      } : undefined,
      color: colors.map(c => c.name || c),
      size: sizes.map(s => s.size || s)
    };

    // Remove undefined
    Object.keys(schema).forEach(key => schema[key] === undefined && delete schema[key]);
    if (schema.offers && !schema.offers.price) delete schema.offers;

    const schemaScript = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;

    const imageSet = images.gallery && images.gallery.length > 0 
      ? images.gallery.map((img, i) => `<img src="${img}" alt="${name} - pogled ${i + 1}" loading="lazy" width="400" height="400" decoding="async">`).join('')
      : '';

    const colorSwatches = colors.slice(0, 4).map(c => 
      `<span class="color-swatch" style="background:${c.hex || c.hexColor || c.color}" title="${c.name}" aria-label="Boja: ${c.name}"></span>`
    ).join('');

    const sizeChips = sizes.slice(0, 5).map(s => 
      `<span class="size-chip" data-size="${s.size || s}" aria-label="Veličina ${s.size || s}">${s.size || s}</span>`
    ).join('');

    const content = `
      ${schemaScript}
      <div class="product-card__media">
        <a href="${productUrl}" class="product-card__link" aria-label="${name} - otvori detalje">
          <picture>
            <source type="image/avif" srcset="${images.main?.replace(/\.\w+$/, '.avif') || ''}" media="(max-width: 639px)">
            <source type="image/webp" srcset="${images.main?.replace(/\.\w+$/, '.webp') || ''}" media="(max-width: 639px)">
            <img 
              class="product-card__image" 
              src="${imageUrl}" 
              alt="${imageAlt}" 
              loading="${lazyLoad !== false ? 'lazy' : 'eager'}" 
              width="400" 
              height="400" 
              decoding="async"
              fetchpriority="auto"
            >
          </picture>
          ${imageSet ? `<div class="product-card__gallery hidden">${imageSet}</div>` : ''}
        </a>
        ${badge ? `<span class="product-card__badge badge badge--${badge.type || 'primary'}">${badge.text}</span>` : ''}
        <div class="product-card__badges">
          ${product.bestseller ? '<span class="badge badge--warning">Bestseller</span>' : ''}
          ${product.new ? '<span class="badge badge--primary">Novo</span>' : ''}
          ${discountPct > 0 ? `<span class="badge badge--accent">-${discountPct}%</span>` : ''}
        </div>
        <button class="product-card__wishlist" data-action="wishlist" data-product-id="${id}" aria-label="Dodaj na listu želja: ${name}" data-track="wishlist_click">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="product-card__quick-add" data-action="quick-add" data-product-id="${id}" data-track="quick_add_click" aria-label="Brzo dodaj ${name} u korpu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          <span class="visually-hidden">Dodaj u korpu</span>
        </button>
      </div>
      <div class="product-card__content">
        ${product.category ? `<span class="product-card__category">${product.category}</span>` : ''}
        <h3 class="product-card__name">
          <a href="${productUrl}" class="product-card__link" data-track="product_name_click">${name}</a>
        </h3>
        ${description ? `<p class="product-card__description">${description}</p>` : ''}
        <div class="product-card__meta">
          <div class="product-card__colors" aria-label="Dostupne boje">${colorSwatches}</div>
          ${sizes.length ? `<div class="product-card__sizes" aria-label="Dostupne veličine">${sizeChips}</div>` : ''}
        </div>
        <div class="product-card__rating">
          <span class="product-card__stars" aria-label="Ocena: ${rating} od 5, ${reviewCount} recenzija">${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5 - Math.floor(rating))}</span>
          <span class="product-card__review-count">(${reviewCount})</span>
        </div>
        <div class="product-card__price-row">
          <span class="product-card__price" itemprop="price" content="${displayPrice}">${displayPrice.toLocaleString('sr-RS')} <span class="currency">${currency}</span></span>
          ${originalPrice ? `<span class="product-card__old-price">${price.toLocaleString('sr-RS')} ${currency}</span>` : ''}
        </div>
        <p class="product-card__installment">ili ${Math.ceil(displayPrice / 3).toLocaleString('sr-RS')} ${currency} x 3 rate bez kamate</p>
        <p class="product-card__crypto-hint" data-track="crypto_hint_view">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
          Plaćajte kripto — <strong>15% popust</strong>
        </p>
        <a href="${productUrl}" class="btn btn--primary btn--block btn--sm" data-track="product_cta_click">Detaljnije</a>
      </div>
    `;

    return new Card(document.createElement('article'), {
      variant: 'product',
      interactive: true,
      schemaOrg: true,
      productData: product,
      onClick: null
    });
  }

  // Create content card (blog, features, etc.)
  static createContent(options = {}) {
    const { title, description, image, link, category, readTime, author, date, badge } = options;
    
    const content = `
      <div class="content-card__media">
        ${options.image ? `<a href="${link}" class="content-card__link" aria-label="${title}">${options.image ? `<img src="${image}" alt="${title}" loading="lazy" width="400" height="300" decoding="async">` : ''}</a>` : ''}
        ${badge ? `<span class="badge badge--${badge.type || 'primary'}">${badge.text}</span>` : ''}
      </div>
      <div class="content-card__content">
        ${category ? `<span class="content-card__category">${category}</span>` : ''}
        <h3 class="content-card__title"><a href="${link}" class="content-card__link">${title}</a></h3>
        <p class="content-card__description">${description}</p>
        <div class="content-card__meta">
          ${author ? `<span class="content-card__author">By ${author}</span>` : ''}
          ${date ? `<time class="content-card__date" datetime="${date}">${new Date(date).toLocaleDateString('sr-RS')}</time>` : ''}
          ${readTime ? `<span class="content-card__read-time">${readTime} min čitanja</span>` : ''}
        </div>
        <a href="${link}" class="btn btn--outline btn--sm">Čitaj više</a>
      </div>
    `;

    return new Card(document.createElement('article'), {
      variant: 'content',
      interactive: true,
      ...options
    });
  }

  // Create feature card (for value props)
  static createFeature(options = {}) {
    const { title, description, icon, link, number } = options;
    
    const content = `
      <div class="feature-card__icon" aria-hidden="true">${icon || ''}</div>
      ${number ? `<span class="feature-card__number">${number}</span>` : ''}
      <h3 class="feature-card__title">${title}</h3>
      <p class="feature-card__description">${description}</p>
      ${link ? `<a href="${link}" class="btn btn--outline btn--sm">Saznaj više</a>` : ''}
    `;

    return new Card(document.createElement('article'), {
      variant: 'feature',
      interactive: !!link,
      ...options
    });
  }

  // Create stats card (for dashboard/stats)
  static createStats(options = {}) {
    const { label, value, change, trend, icon, link } = options;
    
    const content = `
      <div class="stats-card__icon" aria-hidden="true">${icon || ''}</div>
      <div class="stats-card__content">
        <span class="stats-card__label">${label}</span>
        <span class="stats-card__value">${value}</span>
        ${change !== undefined ? `<span class="stats-card__change stats-card__change--${trend || 'neutral'}">${change > 0 ? '+' : ''}${change}%</span>` : ''}
      </div>
      ${link ? `<a href="${link}" class="stats-card__link" aria-label="Detaljnije o ${label}">Detaljnije</a>` : ''}
    `;

    return new Card(document.createElement('article'), {
      variant: 'stats',
      ...options
    });
  }

  // Create testimonial card
  static createTestimonial(options = {}) {
    const { quote, author, role, avatar, rating, company, verified } = options;
    
    const content = `
      <blockquote class="testimonial-card__quote">${quote}</blockquote>
      <footer class="testimonial-card__footer">
        ${options.avatar ? `<img class="testimonial-card__avatar" src="${avatar}" alt="${author}" loading="lazy" width="48" height="48" decoding="async">` : ''}
        <div class="testimonial-card__author-info">
          <cite class="testimonial-card__author">${author}</cite>
          ${role ? `<span class="testimonial-card__role">${role}</span>` : ''}
          ${company ? `<span class="testimonial-card__company">${company}</span>` : ''}
        </div>
        ${rating ? `<div class="testimonial-card__rating" aria-label="Ocena: ${rating} od 5">${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5 - Math.floor(rating))}</div>` : ''}
        ${verified ? '<span class="testimonial-card__verified" aria-label="Verifikovan kupac">✓ Verifikovan kupac</span>' : ''}
      </footer>
    `;

    return new Card(document.createElement('article'), {
      variant: 'testimonial',
      ...options
    });
  }

  // Create skeleton card for loading states
  static createSkeleton(variant = 'product') {
    const skeletons = {
      product: `
        <div class="skeleton-card">
          <div class="skeleton-card__media"></div>
          <div class="skeleton-card__content">
            <div class="skeleton-card__line skeleton-card__line--title"></div>
            <div class="skeleton-card__line skeleton-card__line--text"></div>
            <div class="skeleton-card__line skeleton-card__line--short"></div>
            <div class="skeleton-card__line skeleton-card__line--short"></div>
          </div>
        </div>
      `,
      content: `
        <div class="skeleton-card">
          <div class="skeleton-card__media"></div>
          <div class="skeleton-card__content">
            <div class="skeleton-card__line skeleton-card__line--title"></div>
            <div class="skeleton-card__line skeleton-card__line--text"></div>
            <div class="skeleton-card__line skeleton-card__line--short"></div>
          </div>
        </div>
      `,
      feature: `
        <div class="skeleton-card">
          <div class="skeleton-card__line skeleton-card__line--icon"></div>
          <div class="skeleton-card__line skeleton-card__line--title"></div>
          <div class="skeleton-card__line skeleton-card__line--text"></div>
        </div>
      `,
      stats: `
        <div class="skeleton-card">
          <div class="skeleton-card__line skeleton-card__line--stat"></div>
          <div class="skeleton-card__line skeleton-card__line--label"></div>
        </div>
      `
    };

    return new Card(document.createElement('article'), {
      variant,
      interactive: false,
      content: skeletons[variant] || skeletons.product
    });
  }

  init() {
    this.element.classList.add('card');
    if (this.options.variant) this.element.classList.add(`card--${this.options.variant}`);
    if (this.options.interactive) this.element.classList.add('card--interactive');
    if (this.options.elevated) this.element.classList.add('card--elevated');
    
    // Add schema.org attributes for product cards
    if (this.options.variant === 'product' && this.options.schemaOrg && this.options.productData) {
      this.addSchemaAttributes();
    }

    this.bindEvents();
  }

  addSchemaAttributes() {
    const product = this.options.productData;
    this.element.setAttribute('itemscope', '');
    this.element.setAttribute('itemtype', 'https://schema.org/Product');
    this.element.setAttribute('itemid', `https://dalli.rs/proizvod-${product.slug}.html#product`);
    
    const nameEl = this.element.querySelector('.product-card__name a');
    if (nameEl) nameEl.setAttribute('itemprop', 'name');
    
    const imageEl = this.element.querySelector('.product-card__image');
    if (imageEl) imageEl.setAttribute('itemprop', 'image');
    
    const priceEl = this.element.querySelector('.product-card__price');
    if (priceEl) {
      priceEl.setAttribute('itemprop', 'price');
      priceEl.setAttribute('content', priceEl.textContent.replace(/[^\d]/g, ''));
    }
    
    const currencyEl = this.element.querySelector('.currency');
    if (currencyEl) currencyEl.setAttribute('itemprop', 'priceCurrency');
    
    const descEl = this.element.querySelector('.product-card__description');
    if (descEl) descEl.setAttribute('itemprop', 'description');
    
    const skuEl = this.element.querySelector('[data-sku]');
    if (skuEl) skuEl.setAttribute('itemprop', 'sku');
  }

  bindEvents() {
    if (!this.options.interactive) return;

    // Quick add to cart
    this.element.addEventListener('click', (e) => {
      const quickAdd = e.target.closest('[data-action="quick-add"]');
      if (quickAdd && this.options.onAddToCart) {
        e.preventDefault();
        e.stopPropagation();
        this.options.onAddToCart(quickAdd.dataset.productId, this);
      }

      // Wishlist
      const wishlist = e.target.closest('[data-action="wishlist"]');
      if (wishlist && this.options.onWishlist) {
        e.preventDefault();
        e.stopPropagation();
        this.options.onWishlist(wishlist.dataset.productId, this);
      }

      // Main card click
      if (!e.target.closest('[data-action]') && this.options.onClick) {
        this.options.onClick(this);
      }
    });

    // Keyboard support
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const link = this.element.querySelector('a[href]');
        if (link && !e.target.closest('[data-action]')) {
          e.preventDefault();
          link.click();
        }
      }
    });

    // Image gallery hover (if gallery exists)
    const gallery = this.element.querySelector('.product-card__gallery');
    if (gallery) {
      const mainImg = this.element.querySelector('.product-card__image');
      const galleryImgs = gallery.querySelectorAll('img');
      let currentIndex = 0;

      this.element.addEventListener('mouseenter', () => {
        if (gallery.children.length > 1) {
          this.galleryInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % gallery.children.length;
            const img = gallery.children[currentIndex];
            if (this.element.querySelector('.product-card__image')) {
              this.element.querySelector('.product-card__image').src = img.src;
              this.element.querySelector('.product-card__image').alt = img.alt;
            }
          }, 2000);
        }
      });

      this.element.addEventListener('mouseleave', () => {
        clearInterval(this.galleryInterval);
        // Reset to main image
        const mainImgEl = this.element.querySelector('.product-card__image');
        if (mainImgEl && mainImgEl.dataset.originalSrc) {
          mainImgEl.src = mainImgEl.dataset.originalSrc;
        }
      });
    }
  }

  destroy() {
    // Cleanup intervals
    if (this.galleryInterval) clearInterval(this.galleryInterval);
  }
}

// Skeleton card factory
export function createSkeletonCards(variant = 'product', count = 4) {
  const container = document.createElement('div');
  container.className = 'product-grid skeleton-grid';
  container.setAttribute('role', 'list');
  container.setAttribute('aria-label', 'Učitavanje proizvoda...');

  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('article');
    skeleton.className = `card card--${variant} card--skeleton`;
    skeleton.setAttribute('role', 'listitem');
    skeleton.setAttribute('aria-hidden', 'true');
    
    const skeletons = {
      product: `
        <div class="skeleton-card">
          <div class="skeleton-card__media"></div>
          <div class="skeleton-card__content">
            <div class="skeleton-card__line skeleton-card__line--title"></div>
            <div class="skeleton-card__line skeleton-card__line--text"></div>
            <div class="skeleton-card__line skeleton-card__line--short"></div>
            <div class="skeleton-card__line skeleton-card__line--short"></div>
          </div>
        </div>
      `,
      content: `
        <div class="skeleton-card">
          <div class="skeleton-card__media"></div>
          <div class="skeleton-card__content">
            <div class="skeleton-card__line skeleton-card__line--title"></div>
            <div class="skeleton-card__line skeleton-card__line--text"></div>
            <div class="skeleton-card__line skeleton-card__line--short"></div>
          </div>
        </div>
      `,
      feature: `
        <div class="skeleton-card">
          <div class="skeleton-card__line skeleton-card__line--icon"></div>
          <div class="skeleton-card__line skeleton-card__line--title"></div>
          <div class="skeleton-card__line skeleton-card__line--text"></div>
        </div>
      `,
      stats: `
        <div class="skeleton-card">
          <div class="skeleton-card__line skeleton-card__line--stat"></div>
          <div class="skeleton-card__line skeleton-card__line--label"></div>
        </div>
      `
    };

    const variantHtml = variant === 'product' ? `
      <div class="skeleton-card">
        <div class="skeleton-card__media"></div>
        <div class="skeleton-card__content">
          <div class="skeleton-card__line skeleton-card__line--title"></div>
          <div class="skeleton-card__line skeleton-card__line--text"></div>
          <div class="skeleton-card__line skeleton-card__line--short"></div>
          <div class="skeleton-card__line skeleton-card__line--short"></div>
        </div>
      </div>
    ` : variant;

    const card = document.createElement('article');
    card.className = `card card--product card--skeleton`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `
      <div class="skeleton-card">
        <div class="skeleton-card__media"></div>
        <div class="skeleton-card__content">
          <div class="skeleton-card__line skeleton-card__line--title"></div>
          <div class="skeleton-card__line skeleton-card__line--text"></div>
          <div class="skeleton-card__line skeleton-card__line--short"></div>
          <div class="skeleton-card__line skeleton-card__line--short"></div>
        </div>
      </div>
    `;
    container.appendChild(card);
  }

  return container;
}

// Render product grid with schema.org markup
export function renderProductGrid(containerId, products, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  container.className = 'product-grid';
  container.setAttribute('role', 'list');
  container.setAttribute('aria-label', options.ariaLabel || 'Proizvodi');

  products.forEach(product => {
    const card = Card.createProduct(product, {
      onAddToCart: options.onAddToCart,
      onWishlist: options.onWishlist,
      onClick: options.onClick
    });
    container.appendChild(card.element);
  });

  // Add intersection observer for lazy loading images
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target.querySelector('img[data-src]');
          if (img) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(entry.target);
          }
        }
      });
    }, { rootMargin: '100px' });

    container.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
  }
}

export function createSkeletonCardsSimple(variant = 'product', count = 4) {
  const container = document.createElement('div');
  container.className = 'product-grid skeleton-grid';
  container.setAttribute('role', 'list');
  container.setAttribute('aria-label', 'Učitavanje proizvoda...');

  for (let i = 0; i < count; i++) {
    const card = document.createElement('article');
    card.className = `card card--product card--skeleton`;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `
      <div class="skeleton-card">
        <div class="skeleton-card__media"></div>
        <div class="skeleton-card__content">
          <div class="skeleton-card__line skeleton-card__line--title"></div>
          <div class="skeleton-card__line skeleton-card__line--text"></div>
          <div class="skeleton-card__line skeleton-card__line--short"></div>
          <div class="skeleton-card__line skeleton-card__line--short"></div>
        </div>
      </div>
    `;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-hidden', 'true');
    container.appendChild(card);
  }

  return container;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Card, createSkeletonCards, renderProductGrid };
}

if (typeof window !== 'undefined') {
  window.Card = Card;
  window.createSkeletonCards = createSkeletonCards;
  window.renderProductGrid = renderProductGrid;
}