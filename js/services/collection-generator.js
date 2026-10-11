import fs from 'fs';
import path from 'path';

export class CollectionGenerator {
  constructor(dataPath = '/home/alpatron/Documents/Default Project/moonlight-sajt/data') {
    this.dataPath = dataPath;
    this.collectionsFile = path.join(dataPath, 'collections.json');
    this.productsFile = path.join(dataPath, 'products.json');
    this.outputDir = path.join('/home/alpatron/Documents/Default Project/moonlight-sajt', 'collections');
  }

  async loadCollections() {
    const content = fs.readFileSync(this.collectionsFile, 'utf-8');
    return JSON.parse(content).collections;
  }

  async loadProducts() {
    const content = fs.readFileSync(this.productsFile, 'utf-8');
    return JSON.parse(content).products || [];
  }

  async generateCollectionPages() {
    const collections = await this.loadCollections();
    const products = await this.loadProducts();
    const productMap = new Map(products.map(p => [p.id, p]));

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const results = [];

    for (const collection of collections.filter(c => c.status === 'published')) {
      const pageData = await this.generateCollectionPage(collection, products, productMap);
      const html = this.renderCollectionTemplate(pageData);
      
      const fileName = `${collection.slug}.html`;
      const filePath = path.join(this.outputDir, fileName);
      fs.writeFileSync(filePath, html);
      
      results.push({
        slug: collection.slug,
        file: fileName,
        productCount: pageData.products.length
      });
    }

    // Generate collections index page
    const indexHtml = this.renderCollectionsIndex(collections.filter(c => c.status === 'published'));
    fs.writeFileSync(path.join(this.outputDir, 'index.html'), indexHtml);

    return results;
  }

  async generateCollectionPage(collection, allProducts, productMap) {
    let productIds = [...collection.products];
    
    // Handle auto-populate collections
    if (collection.autoPopulate && productIds.length === 0) {
      productIds = this.autoPopulateProducts(collection.autoPopulate, allProducts);
    }

    const products = productIds
      .map(id => productMap.get(id))
      .filter(Boolean)
      .map(p => ({
        ...p,
        url: `/product/${p.slug}.html`,
        image: p.images?.main || p.image,
        price: p.price,
        currency: p.currency || 'RSD',
        salePrice: p.salePrice,
        rating: p.rating || 0,
        reviewCount: p.reviewCount || 0
      }));

    return {
      collection,
      products,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Collections', url: '/collections/' },
        { name: collection.title, url: `/collections/${collection.slug}.html` }
      ]
    };
  }

  autoPopulateProducts(config, products) {
    let filtered = [...products];

    if (config.rule === 'createdWithinDays') {
      const cutoff = new Date(Date.now() - config.value * 24 * 60 * 60 * 1000);
      filtered = products.filter(p => new Date(p.createdAt) >= cutoff);
    } else if (config.rule === 'topSelling') {
      filtered = products
        .filter(p => (p.salesCount || 0) > 0)
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    }

    return filtered
      .slice(0, config.maxProducts)
      .map(p => p.id);
  }

  renderCollectionTemplate(data) {
    const { collection, products, breadcrumbs } = data;
    
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: collection.title,
      description: collection.description,
      image: collection.heroImage,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            '@id': product.url,
            name: product.name,
            image: product.image,
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: product.currency,
              availability: 'https://schema.org/InStock'
            }
          }
        }))
      }
    };

    return `<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#2c3e50">
    
    <title>${collection.seo.metaTitle}</title>
    <meta name="description" content="${collection.seo.metaDescription}">
    <meta name="keywords" content="${collection.seo.keywords.join(', ')}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://dalli.rs/collections/${collection.slug}.html">
    
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://dalli.rs/collections/${collection.slug}.html">
    <meta property="og:title" content="${collection.seo.metaTitle}">
    <meta property="og:description" content="${collection.seo.metaDescription}">
    <meta property="og:image" content="https://dalli.rs${collection.heroImage}">
    <meta property="og:site_name" content="DALLI">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${collection.seo.metaTitle}">
    <meta name="twitter:description" content="${collection.seo.metaDescription}">
    <meta name="twitter:image" content="https://dalli.rs${collection.heroImage}">

    <script type="application/ld+json">
    ${JSON.stringify(schema, null, 2)}
    </script>

    <link rel="preload" href="/css/style.css?v=20241215" as="style">
    <link rel="stylesheet" href="/css/style.css?v=20241215">
</head>
<body>
    <header class="header" role="banner">
        <div class="container">
            <div class="logo">
                <a href="/" aria-label="DALLI - Početna">
                    <h1>DALLI</h1>
                </a>
                <span class="tagline">Muška i Ženska Garderoba</span>
            </div>
            <nav class="nav" role="navigation" aria-label="Glavna navigacija">
                <a href="/" class="nav-link">Početna</a>
                <a href="/products.html" class="nav-link">Svi Proizvodi</a>
                <a href="/collections/" class="nav-link active">Kolekcije</a>
                <a href="/cart.html" class="nav-link cart-link" aria-label="Korpa za kupovinu">
                    Korpa <span class="cart-count" id="cartCount">0</span>
                </a>
            </nav>
        </div>
    </header>

    <main class="main" role="main">
        <!-- Breadcrumbs -->
        <nav class="breadcrumb" aria-label="Breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <div class="container">
                <ol class="breadcrumb-list">
                    ${breadcrumbs.map((b, i) => `
                    <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                        ${b.url ? `
                        <a href="${b.url}" itemprop="item" class="breadcrumb-link">
                            <span itemprop="name">${b.name}</span>
                        </a>
                        <meta itemprop="position" content="${i + 1}">
                        ` : `
                        <span class="breadcrumb-current" itemprop="name">${b.name}</span>
                        <meta itemprop="position" content="${i + 1}">
                        `}
                    </li>
                    `).join('')}
                </ol>
            </div>
        </nav>

        <!-- Collection Hero -->
        <section class="collection-hero" style="background-image: url('${collection.heroImage}');" aria-labelledby="collection-title">
            <div class="container">
                <div class="collection-hero-content">
                    <span class="collection-type">${collection.type === 'seasonal' ? 'Sezonska' : collection.type === 'occasion' ? 'Poziv' : collection.type === 'activity' ? 'Aktivnost' : 'Dinamička'} kolekcija</span>
                    <h1 id="collection-title" class="collection-title">${collection.title}</h1>
                    <p class="collection-description">${collection.description}</p>
                    ${collection.startDate ? `
                    <div class="collection-dates">
                        <span>Dostupno: ${new Date(collection.startDate).toLocaleDateString('sr-RS')} - ${new Date(collection.endDate).toLocaleDateString('sr-RS')}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </section>

        <!-- Product Grid -->
        <section class="collection-products" aria-labelledby="products-heading">
            <div class="container">
                <header class="collection-header">
                    <h2 id="products-heading" class="section-title">${products.length} proizvoda</h2>
                    <div class="collection-filters">
                        <select id="sortSelect" class="sort-select" aria-label="Sortiraj">
                            <option value="featured">Preporučeno</option>
                            <option value="price-asc">Cena: nize 먼저</option>
                            <option value="price-desc">Cena: viže أولاً</option>
                            <option value="newest">Najnovije</option>
                            <option value="rating">Najbolje ocenjeno</option>
                        </select>
                    </div>
                </header>

                ${products.length > 0 ? `
                <div class="product-grid" id="productGrid" role="list" aria-label="${collection.title} proizvodi">
                    ${products.map((product, index) => `
                    <article class="product-card" role="listitem" data-index="${index}" data-price="${product.price}" data-rating="${product.rating}" data-created="${product.createdAt || ''}">
                        <a href="${product.url}" class="product-link" aria-label="${product.name}">
                            <div class="product-image" style="background-image: url('${product.image}');">
                                ${product.salePrice ? `<span class="sale-badge">-${Math.round((1 - product.salePrice / product.price) * 100)}%</span>` : ''}
                                ${product.rating >= 4.5 ? '<span class="top-rated-badge">⭐ Top</span>' : ''}
                            </div>
                            <div class="product-info">
                                <h3 class="product-name" itemprop="name">${product.name}</h3>
                                <div class="product-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
                                    ${product.salePrice ? `
                                    <span class="old-price">${product.price.toLocaleString()} ${product.currency}</span>
                                    <span class="sale-price" itemprop="price" content="${product.salePrice}">${product.salePrice.toLocaleString()} ${product.currency}</span>
                                    <meta itemprop="priceCurrency" content="${product.currency}">
                                    <meta itemprop="availability" content="https://schema.org/InStock">
                                    ` : `
                                    <span class="price" itemprop="price" content="${product.price}">${product.price.toLocaleString()} ${product.currency}</span>
                                    <meta itemprop="priceCurrency" content="${product.currency}">
                                    <meta itemprop="availability" content="https://schema.org/InStock">
                                    `}
                                </div>
                                ${product.rating > 0 ? `
                                <div class="product-rating" style="display: flex; align-items: center; gap: 4px; color: #f59e0b; font-size: 14px;">
                                    ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
                                    <span style="color: #6b7280; font-weight: normal;">${product.rating.toFixed(1)} (${product.reviewCount})</span>
                                </div>
                                ` : ''}
                            </div>
                        </a>
                    </article>
                    `).join('')}
                </div>
                ` : `
                <div class="collection-empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; color: #d1d5db;">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                    </svg>
                    <h3>Nema proizvoda u ovoj kolekciji</h3>
                    <p>Proverite kasnije za nove dodatke.</p>
                </div>
                `}
            </div>
        </section>

        <!-- Related Collections -->
        <section class="related-collections" aria-labelledby="related-heading">
            <div class="container">
                <h2 id="related-heading" class="section-title">Slične kolekcije</h2>
                <div class="collections-carousel" id="relatedCollections">
                    <!-- Populated by JS -->
                </div>
            </div>
        </section>
    </main>

    <footer class="footer" role="contentinfo">
        <div class="container">
            <p>&copy; 2025 DALLI. Sva prava zadržana.</p>
        </div>
    </footer>

    <script>
        // Simple client-side sorting
        const sortSelect = document.getElementById('sortSelect');
        const productGrid = document.getElementById('productGrid');
        
        if (sortSelect && productGrid) {
            const cards = Array.from(productGrid.querySelectorAll('.product-card'));
            
            sortSelect.addEventListener('change', () => {
                const value = sortSelect.value;
                cards.sort((a, b) => {
                    switch(value) {
                        case 'price-asc':
                            return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
                        case 'price-desc':
                            return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
                        case 'newest':
                            return new Date(b.dataset.created) - new Date(a.dataset.created);
                        case 'rating':
                            return parseFloat(b.dataset.rating) - parseFloat(a.dataset.rating);
                        default:
                            return parseInt(a.dataset.index) - parseInt(b.dataset.index);
                    }
                });
                cards.forEach(card => productGrid.appendChild(card));
            });
        }
    </script>

    <script type="module">
        import { faqSchemaInjector } from '/js/components/FAQSchemaInjector.js';
        import '/js/components/FAQAccordion.js';
        faqSchemaInjector.init();
    </script>
</body>
</html>`;
  }

  renderCollectionsIndex(collections) {
    return `<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#2c3e50">
    
    <title>Sve Kolekcije | DALLI</title>
    <meta name="description" content="Pregledajte sve naše kolekcije: sezonske, prigodne, aktivnost. Pronađite savršen stil za svaki trenutak.">
    <meta name="keywords" content="kolekcije, modne kolekcije, sezonska moda, prigodna odeća">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://dalli.rs/collections/">
    
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://dalli.rs/collections/">
    <meta property="og:title" content="Sve Kolekcije | DALLI">
    <meta property="og:description" content="Pregledajte sve naše kolekcije: sezonske, prigodne, aktivnost.">
    <meta property="og:image" content="https://dalli.rs/images/collections/og-collections.jpg">
    <meta property="og:site_name" content="DALLI">
    
    <link rel="preload" href="/css/style.css?v=20241215" as="style">
    <link rel="stylesheet" href="/css/style.css?v=20241215">
</head>
<body>
    <header class="header" role="banner">
        <div class="container">
            <div class="logo">
                <a href="/" aria-label="DALLI - Početna">
                    <h1>DALLI</h1>
                </a>
                <span class="tagline">Muška i Ženska Garderoba</span>
            </div>
            <nav class="nav" role="navigation" aria-label="Glavna navigacija">
                <a href="/" class="nav-link">Početna</a>
                <a href="/products.html" class="nav-link">Svi Proizvodi</a>
                <a href="/collections/" class="nav-link active">Kolekcije</a>
                <a href="/cart.html" class="nav-link cart-link" aria-label="Korpa za kupovinu">
                    Korpa <span class="cart-count" id="cartCount">0</span>
                </a>
            </nav>
        </div>
    </header>

    <main class="main" role="main">
        <section class="collections-hero">
            <div class="container">
                <h1>Naše Kolekcije</h1>
                <p class="hero-subtitle">Kurirane selekcije za svaki stil, sezonu i prigodu</p>
            </div>
        </section>

        <section class="collections-grid" aria-labelledby="collections-heading">
            <div class="container">
                <h2 id="collections-heading" class="visually-hidden">Sve kolekcije</h2>
                <div class="collections-list">
                    ${collections.map(c => `
                    <article class="collection-card" data-type="${c.type}" data-status="${c.status}">
                        <a href="/collections/${c.slug}.html" class="collection-link">
                            <div class="collection-image" style="background-image: url('${c.heroImage}');">
                                <span class="collection-type-badge">${c.type === 'seasonal' ? 'Sezonska' : c.type === 'occasion' ? 'Prigodna' : c.type === 'activity' ? 'Aktivnost' : 'Dinamička'}</span>
                                ${c.status === 'draft' ? '<span class="draft-badge">Draft</span>' : ''}
                            </div>
                            <div class="collection-content">
                                <h3 class="collection-name">${c.title}</h3>
                                <p class="collection-desc">${c.shortDescription}</p>
                                <div class="collection-meta">
                                    ${c.autoPopulate ? `
                                    <span class="meta-tag auto">Auto (${c.autoPopulate.rule})</span>
                                    ` : `
                                    <span class="meta-tag">Proizvoda: ${c.products.length}</span>
                                    `}
                                    ${c.startDate && c.endDate ? `
                                    <span class="meta-tag seasonal">${new Date(c.startDate).toLocaleDateString('sr-RS', {month: 'short'})} - ${new Date(c.endDate).toLocaleDateString('sr-RS', {month: 'short'})}</span>
                                    ` : ''}
                                </div>
                            </div>
                        </a>
                    </article>
                    `).join('')}
                </div>
            </div>
        </section>
    </main>

    <footer class="footer" role="contentinfo">
        <div class="container">
            <p>&copy; 2025 DALLI. Sva prava zadržana.</p>
        </div>
    </footer>

    <script type="module">
        import { faqSchemaInjector } from '/js/components/FAQSchemaInjector.js';
        import '/js/components/FAQAccordion.js';
        faqSchemaInjector.init();
    </script>
</body>
</html>`;
  }
}

export default CollectionGenerator;