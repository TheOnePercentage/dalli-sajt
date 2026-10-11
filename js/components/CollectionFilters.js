export class CollectionFilters {
  constructor(options = {}) {
    this.container = document.querySelector(options.container || '[data-collection-filters]');
    this.productsContainer = document.querySelector(options.productsContainer || '[data-products-grid]');
    this.resultsCount = document.querySelector(options.resultsCount || '[data-results-count]');
    this.activeFiltersContainer = document.querySelector(options.activeFilters || '[data-active-filters]');
    this.sortSelect = document.querySelector(options.sortSelect || '[data-sort-select]');
    this.loadMoreBtn = document.querySelector(options.loadMoreBtn || '[data-load-more]');
    this.filterDrawer = document.querySelector(options.filterDrawer || '[data-filter-drawer]');
    this.filterToggle = document.querySelector(options.filterToggle || '[data-filter-toggle]');
    this.filterClose = document.querySelector(options.filterClose || '[data-filter-close]');

    this.apiBase = options.apiBase || '/api/v1/products';
    this.debounceTimer = null;
    this.currentPage = 1;
    this.isLoading = false;
    this.hasMore = true;
    this.totalCount = 0;

    this.filters = {
      collection: '',
      gender: '',
      category: '',
      style: '',
      search: '',
      minPrice: '',
      maxPrice: '',
      color: '',
      size: '',
      inStock: false,
      featured: false,
      sort: 'relevance',
      page: 1,
      limit: 24
    };

    this.init();
  }

  init() {
    this.parseURL();
    this.bindEvents();
    this.renderActiveFilters();
    this.fetchProducts(true);
  }

  parseURL() {
    const params = new URLSearchParams(window.location.search);
    
    Object.keys(this.filters).forEach(key => {
      const value = params.get(key);
      if (value) this.filters[key] = value;
    });

    // Sync form inputs
    Object.keys(this.filters).forEach(key => {
      const input = this.container?.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = this.filters[key] === 'true';
        } else {
          input.value = this.filters[key];
        }
      }
    });

    this.currentPage = parseInt(this.filters.page) || 1;
    this.filters.page = this.currentPage;
  }

  bindEvents() {
    if (!this.container) return;

    // Filter inputs
    this.container.querySelectorAll('input[name], select[name]').forEach(input => {
      input.addEventListener('change', () => this.handleFilterChange(input));
    });

    // Search debounced
    const searchInput = this.container.querySelector('input[name="search"]');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.debouncedSearch(e.target.value));
    }

    // Sort
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => this.handleSortChange(e.target.value));
    }

    // Load more
    if (this.loadMoreBtn) {
      this.loadMoreBtn.addEventListener('click', () => this.loadMore());
    }

    // Infinite scroll
    window.addEventListener('scroll', () => this.handleScroll());

    // Filter drawer toggle
    if (this.filterToggle && this.filterDrawer) {
      this.filterToggle.addEventListener('click', () => this.toggleFilterDrawer(true));
    }
    if (this.filterClose && this.filterDrawer) {
      this.filterClose.addEventListener('click', () => this.toggleFilterDrawer(false));
    }

    // Clear all filters
    const clearBtn = this.container?.querySelector('[data-clear-filters]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllFilters());
    }

    // Remove active filter
    if (this.activeFiltersContainer) {
      this.activeFiltersContainer.addEventListener('click', (e) => {
        if (e.target.matches('[data-remove-filter]')) {
          this.removeFilter(e.target.dataset.removeFilter);
        }
      });
    }
  }

  handleFilterChange(input) {
    const { name, value, type, checked } = input;
    
    if (type === 'checkbox') {
      this.filters[name] = checked ? 'true' : '';
    } else {
      this.filters[name] = value;
    }

    this.filters.page = 1;
    this.currentPage = 1;
    this.updateURL();
    this.fetchProducts(true);
  }

  debouncedSearch(value) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.filters.search = value.trim();
      this.filters.page = 1;
      this.currentPage = 1;
      this.updateURL();
      this.fetchProducts(true);
    }, 300);
  }

  handleSortChange(value) {
    this.filters.sort = value;
    this.filters.page = 1;
    this.currentPage = 1;
    this.updateURL();
    this.fetchProducts(true);
  }

  removeFilter(key) {
    if (key === 'page') return;
    
    if (this.filters[key] === 'true') {
      this.filters[key] = '';
    } else {
      this.filters[key] = '';
    }

    const input = this.container?.querySelector(`[name="${key}"]`);
    if (input) {
      if (input.type === 'checkbox') input.checked = false;
      else input.value = '';
    }

    this.filters.page = 1;
    this.currentPage = 1;
    this.updateURL();
    this.fetchProducts(true);
  }

  clearAllFilters() {
    Object.keys(this.filters).forEach(key => {
      if (key !== 'page' && key !== 'limit' && key !== 'sort') {
        this.filters[key] = '';
      }
    });
    this.filters.sort = 'relevance';
    this.filters.page = 1;
    this.currentPage = 1;

    // Reset form
    this.container.querySelectorAll('input, select').forEach(input => {
      if (input.type === 'checkbox') input.checked = false;
      else if (input.type !== 'hidden') input.value = '';
    });
    if (this.sortSelect) this.sortSelect.value = 'relevance';

    this.updateURL();
    this.fetchProducts(true);
  }

  updateURL() {
    const params = new URLSearchParams();
    
    Object.entries(this.filters).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'relevance') {
        params.set(key, value);
      }
    });

    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newURL);
  }

  async fetchProducts(reset = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    if (reset) {
      this.productsContainer.innerHTML = '';
      this.hasMore = true;
      this.currentPage = 1;
      this.filters.page = 1;
    }

    this.showLoading(true);

    try {
      const params = new URLSearchParams();
      Object.entries(this.filters).forEach(([key, value]) => {
        if (value && value !== '') params.set(key, value);
      });

      const response = await fetch(`${this.apiBase}?${params.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      
      this.totalCount = data.count || data.total || 0;
      this.hasMore = data.products.length >= this.filters.limit;
      
      if (reset) {
        this.productsContainer.innerHTML = '';
      }

      this.renderProducts(data.products);
      this.updateResultsCount();
      this.renderActiveFilters();
      this.updateLoadMoreVisibility();

    } catch (error) {
      console.error('Fetch products error:', error);
      this.showError('Greška pri učitavanju proizvoda');
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  loadMore() {
    if (!this.hasMore || this.isLoading) return;
    this.currentPage++;
    this.filters.page = this.currentPage;
    this.updateURL();
    this.fetchProducts(false);
  }

  handleScroll() {
    if (!this.hasMore || this.isLoading) return;
    
    const scrollTop = window.scrollY + window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    
    if (scrollTop >= docHeight - 300) {
      this.loadMore();
    }
  }

  renderProducts(products) {
    if (!this.productsContainer) return;

    products.forEach(product => {
      const card = this.createProductCard(product);
      this.productsContainer.appendChild(card);
    });

    // Re-init any components (lazy loading, etc.)
    this.initProductCards();
  }

  createProductCard(product) {
    const article = document.createElement('article');
    article.className = 'product-card animate-reveal';
    article.dataset.productId = product.id;
    article.role = 'listitem';

    const totalStock = (product.sizes || []).reduce((n, s) => n + (s.inventory?.quantity || 0), 0);
    const genderIds = (product.genders || []).map(g => g.gender?.id).filter(Boolean);
    const styleIds = (product.styleOccasions || []).map(s => s.styleOccasion?.id).filter(Boolean);

    article.innerHTML = `
      <a href="/${product.collection}/${product.genders?.[0]?.gender?.slug || 'unisex'}/${product.category?.slug || product.category}/${product.slug}.html" class="product-link" itemprop="url">
        <div class="product-card__media" style="position: relative; aspect-ratio: 4/5; overflow: hidden; background: var(--color-bg-subtle);">
          <img class="product-card__image" src="${product.images?.main640 || product.images?.main}" alt="${product.name}" loading="lazy" width="400" height="500" decoding="async" itemprop="image" style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--duration-slow) var(--ease-out);">
          ${product.images?.badge ? `<div class="product-card__badge" style="position: absolute; top: var(--space-3); left: var(--space-3); padding: var(--space-1) var(--space-2); background: var(--color-primary); color: var(--color-text-inverse); border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--fw-semibold);">${product.images.badge}</div>` : ''}
        </div>
        <div class="product-card__content" style="padding: var(--space-4);">
          <span class="product-card__category" style="font-size: var(--text-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">${product.category?.name || product.category}</span>
          <h3 class="product-card__name" itemprop="name" style="font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--fw-medium); color: var(--color-text); margin: var(--space-2) 0; line-height: 1.3;">${product.name}</h3>
          <div class="product-card__price-row" style="display: flex; align-items: baseline; gap: var(--space-2); margin-top: var(--space-3);">
            <span class="product-card__price" itemprop="offers" itemscope itemtype="https://schema.org/Offer" style="font-family: var(--font-display); font-size: var(--text-xl); font-weight: var(--fw-medium); color: var(--color-text);">
              <meta itemprop="priceCurrency" content="${product.currency}">
              <meta itemprop="price" content="${product.price}">
              ${Number(product.price).toLocaleString('sr-RS')} ${product.currency}
            </span>
          </div>
        </div>
      </a>
    `;

    return article;
  }

  initProductCards() {
    // Re-init lazy loading, etc.
    if (typeof window.initLazyLoading === 'function') {
      window.initLazyLoading();
    }
  }

  updateResultsCount() {
    if (this.resultsCount) {
      this.resultsCount.textContent = `${this.totalCount} proizvoda`;
    }
    const stats = document.querySelector('.collection-stats');
    if (stats) stats.textContent = `${this.totalCount} proizvoda`;
  }

  renderActiveFilters() {
    if (!this.activeFiltersContainer) return;

    const active = Object.entries(this.filters)
      .filter(([key, value]) => value && value !== '' && value !== 'relevance' && key !== 'page' && key !== 'limit')
      .map(([key, value]) => ({
        key,
        value,
        label: this.getFilterLabel(key, value)
      }));

    if (active.length === 0) {
      this.activeFiltersContainer.innerHTML = '';
      this.activeFiltersContainer.style.display = 'none';
      return;
    }

    this.activeFiltersContainer.style.display = 'flex';
    this.activeFiltersContainer.innerHTML = `
      <span class="active-filters__label">Aktivni filteri:</span>
      ${active.map(f => `
        <span class="active-filter" data-remove-filter="${f.key}">
          ${f.label}
          <button type="button" aria-label="Ukloni filter ${f.label}">&times;</button>
        </span>
      `).join('')}
      <button type="button" class="active-filters__clear" data-clear-filters>Očisti sve</button>
    `;
  }

  getFilterLabel(key, value) {
    const labels = {
      collection: { casual: 'Casual', elegance: 'Elegance' },
      gender: { men: 'Muškarci', women: 'Žene', unisex: 'Unisex' },
      category: {
        't-shirts': 'T-Shirts', 'hoodies': 'Hoodies', 'tracksuits': 'Trenerke',
        'essentials': 'Essentials', 'accessories': 'Aksesoari',
        'shirts': 'Kožulje', 'blazers': 'Sakovi'
      },
      style: { casual: 'Casual', formal: 'Formal', sport: 'Sport' },
      inStock: { 'true': 'Samo na stanju' },
      featured: { 'true': 'Samo izdvojeno' },
      sort: {
        relevance: 'Relevantnost', price_asc: 'Cena: niska → visoka',
        price_desc: 'Cena: visoka → niska', newest: 'Najnovije',
        popular: 'Najpopularnije', featured: 'Izdvojeno'
      }
    };

    if (labels[key] && labels[key][value]) return `${key}: ${labels[key][value]}`;
    if (key === 'minPrice') return `Min cena: ${Number(value).toLocaleString('sr-RS')} RSD`;
    if (key === 'maxPrice') return `Max cena: ${Number(value).toLocaleString('sr-RS')} RSD`;
    if (key === 'search') return `Pretraga: "${value}"`;
    return `${key}: ${value}`;
  }

  toggleFilterDrawer(open) {
    if (!this.filterDrawer) return;
    this.filterDrawer.classList.toggle('open', open);
    this.filterDrawer.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  showLoading(show) {
    const loader = document.querySelector('[data-loading]');
    if (loader) loader.style.display = show ? 'flex' : 'none';
  }

  showError(message) {
    if (this.productsContainer) {
      this.productsContainer.innerHTML = `<div class="error-message" style="text-align: center; padding: var(--space-8); color: var(--color-error);">${message}</div>`;
    }
  }

  updateLoadMoreVisibility() {
    if (this.loadMoreBtn) {
      this.loadMoreBtn.style.display = this.hasMore ? 'block' : 'none';
    }
  }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-collection-filters]');
  if (container) {
    window.collectionFilters = new CollectionFilters();
  }
});

export default CollectionFilters;
