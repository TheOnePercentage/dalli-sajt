// generate-categories.js
// Generiše category stranice sa statičkim product grid-ovima iz data/products.json

const fs = require('fs');
const path = require('path');
const { computeInventory } = require('./inventory-helpers');

const DATA_FILE = path.join(__dirname, '..', 'data', 'products.json');
const OUTPUT_DIR = path.join(__dirname, '..');

const CATEGORIES = {
    'muska-garderoba': {
        title: 'Muška Garderoba',
        description: 'Muška garderoba DALLI - majice, trenerke i duksevi za muškarce',
        keywords: 'muška garderoba, muška majica, trenerka, duks, DALLI',
        canonical: 'https://dalli.rs/muska-garderoba.html',
        ogImage: 'https://dalli.rs/images/og-musk.svg',
        filters: (p) => p.gender === 'muski' || p.gender === 'unisex',
        subcategories: [
            { key: 'majice', name: 'Muške Majice', icon: '👕', category: 'majice' },
            { key: 'trenerke', name: 'Sportske Trenerke', icon: '🏃', category: 'trenerke' },
            { key: 'dukseri', name: 'Duksevi (Hoodie)', icon: '🧥', category: 'dukseri' }
        ]
    },
    'zenska-garderoba': {
        title: 'Ženska Garderoba',
        description: 'Ženska garderoba DALLI - majice, trenerke i duksevi za žene',
        keywords: 'ženska garderoba, ženska majica, trenerka, duks, DALLI',
        canonical: 'https://dalli.rs/zenska-garderoba.html',
        ogImage: 'https://dalli.rs/images/og-zensk.svg',
        filters: (p) => p.gender === 'zenski' || p.gender === 'unisex',
        subcategories: [
            { key: 'majice', name: 'Ženske Majice', icon: '👗', category: 'majice' },
            { key: 'trenerke', name: 'Trenerke sa Kapuljačom', icon: '👠', category: 'trenerke' },
            { key: 'dukseri', name: 'Duksevi (Hoodie)', icon: '🧥', category: 'dukseri' }
        ]
    },
    'dukseri': {
        title: 'Duksevi (Hoodie)',
        description: 'Duksevi (hoodie) DALLI - muški i ženski modeli sa kapuljačom',
        keywords: 'duks, hoodie, DALLI',
        canonical: 'https://dalli.rs/dukseri.html',
        ogImage: 'https://dalli.rs/images/og-dukseri.svg',
        filters: (p) => p.category === 'dukseri',
        subcategories: [
            { key: 'muski', name: 'Muški Duksevi', icon: '🧥', gender: 'muski' },
            { key: 'zenski', name: 'Ženski Duksevi', icon: '👚', gender: 'zenski' }
        ]
    },
    'products': {
        title: 'Svi Proizvodi',
        description: 'Svi proizvodi DALLI - majice, trenerke, duksevi i accessories',
        keywords: 'proizvodi, majice, trenerke, duksevi, hoodie, DALLI',
        canonical: 'https://dalli.rs/products.html',
        ogImage: 'https://dalli.rs/images/og-products.svg',
        filters: () => true,
        subcategories: [
            { key: 'muski', name: 'Muška Garderoba', icon: '👨', url: '/muska-garderoba.html' },
            { key: 'zenski', name: 'Ženska Garderoba', icon: '👩', url: '/zenska-garderoba.html' },
            { key: 'dukseri', name: 'Duksevi', icon: '🧥', url: '/dukseri.html' }
        ]
    }
};

function loadProducts() {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw).products;
}

function formatPrice(price) {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getCategoryName(category) {
    const names = { majice: 'Majice', trenerke: 'Trenerke', dukseri: 'Duksevi', ostalo: 'Ostalo' };
    return names[category] || category;
}

function renderProductCard(product) {
    // Compute dynamic inventory
    const inv = computeInventory(product);
    const saleBadge = product.salePrice ? `<span class="sale-badge">-${Math.round(((product.price - product.salePrice) / product.price) * 100)}%</span>` : '';
    const priceHtml = product.salePrice
        ? `<span class="old-price">${formatPrice(product.price)} RSD</span><span class="sale-price">${formatPrice(product.salePrice)} RSD</span>`
        : `<span class="price">${formatPrice(product.price)} RSD</span>`;
    
    return `
        <article class="product-card" itemscope itemtype="https://schema.org/Product" data-product-id="${product.id}" data-category="${product.category}" data-gender="${product.gender}" data-inventory-status="${inv.status}">
            <a href="/proizvod-${product.slug}.html" class="product-link" itemprop="url">
                <div class="product-image">
                    <img src="${product.images.main}" alt="${product.altText}" loading="lazy" itemprop="image">
                    ${saleBadge}
                    <span class="availability-badge ${inv.status}" aria-label="${inv.displayLabel}">${inv.displayLabel}</span>
                </div>
                <div class="product-info">
                    <span class="product-category" itemprop="category">${getCategoryName(product.category)}</span>
                    <h3 class="product-name" itemprop="name">${product.name}</h3>
                    <p class="product-short-desc" itemprop="description">${product.shortDescription}</p>
                    <div class="product-footer">
                        <div class="product-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
                            <meta itemprop="priceCurrency" content="${product.currency}">
                            <meta itemprop="price" content="${product.salePrice || product.price}">
                            <meta itemprop="availability" content="https://schema.org/${inv.schemaAvailability}">
                            ${priceHtml}
                        </div>
                        <button class="btn-add" data-product-id="${product.id}" data-sku="${product.sku}" aria-label="Dodaj ${product.name} u korpu" ${inv.status === 'out_of_stock' ? 'disabled' : ''}>
                            ${inv.status === 'out_of_stock' ? 'Obavesti me' : inv.status === 'preorder' ? 'Prednaruči' : 'Dodaj u korpu'}
                        </button>
                    </div>
                </div>
            </a>
        </article>
    `;
}

function renderSubcategoryNav(categoryConfig) {
    if (!categoryConfig.subcategories) return '';
    
    return `
        <section class="subcategory-nav" aria-labelledby="subcat-title">
            <div class="container">
                <h2 id="subcat-title" class="section-title" style="display:none;">Podkategorije</h2>
                <div class="subcategory-links">
                    ${categoryConfig.subcategories.map(sub => {
                        const url = sub.url || `#${sub.key}`;
                        return `
                            <a href="${url}" class="subcat-link" data-filter="${sub.key}">
                                <span class="subcat-icon" aria-hidden="true">${sub.icon}</span>
                                <span>${sub.name}</span>
                            </a>
                        `;
                    }).join('')}
                </div>
            </div>
        </section>
    `;
}

function renderCategoryPage(categoryKey, categoryConfig, products) {
    const filteredProducts = products.filter(categoryConfig.filters);
    
    // Compute inventory for all products for schema
    const productsWithInv = filteredProducts.map(p => ({
        ...p,
        computedInventory: computeInventory(p)
    }));
    
    const productGridHtml = filteredProducts.map(renderProductCard).join('\n');
    const subcategoryNav = renderSubcategoryNav(categoryConfig);
    const currentYear = new Date().getFullYear();
    
    // Count products per subcategory for stats
    const statsHtml = categoryConfig.subcategories?.map(sub => {
        let count = 0;
        if (sub.category) {
            count = filteredProducts.filter(p => p.category === sub.category).length;
        } else if (sub.gender) {
            count = filteredProducts.filter(p => p.gender === sub.gender || p.gender === 'unisex').length;
        }
        return `
            <div class="stat">
                <strong>${sub.name}</strong>
                <span>${count} proizvod${count !== 1 ? 'a' : ''}</span>
            </div>
        `;
    }).join('') || '';

    const html = `<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#2c3e50">
    <title>DALLI - ${categoryConfig.title}</title>
    <meta name="description" content="${categoryConfig.description}">
    <meta name="keywords" content="${categoryConfig.keywords}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${categoryConfig.canonical}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${categoryConfig.canonical}">
    <meta property="og:title" content="${categoryConfig.title} - DALLI">
    <meta property="og:description" content="${categoryConfig.description}">
    <meta property="og:image" content="${categoryConfig.ogImage}">
    <meta property="og:site_name" content="DALLI">
    <meta property="og:locale" content="sr_RS">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="${categoryConfig.canonical}">
    <meta name="twitter:title" content="${categoryConfig.title} - DALLI">
    <meta name="twitter:description" content="${categoryConfig.description}">
    <meta name="twitter:image" content="${categoryConfig.ogImage}">
    
    <!-- Hreflang -->
    <link rel="alternate" hreflang="sr" href="${categoryConfig.canonical}">
    <link rel="alternate" hreflang="sr-Latn" href="${categoryConfig.canonical}">
    <link rel="alternate" hreflang="sr-Cyrl" href="${categoryConfig.canonical}">
    <link rel="alternate" hreflang="x-default" href="${categoryConfig.canonical}">
    
    <!-- Schema.org CollectionPage -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "${categoryConfig.title}",
        "description": "${categoryConfig.description}",
        "url": "${categoryConfig.canonical}",
        "mainEntity": {
            "@type": "ItemList",
            "numberOfItems": ${filteredProducts.length},
            "itemListElement": [
                ${productsWithInv.map((p, i) => `{
                    "@type": "ListItem",
                    "position": ${i + 1},
                    "item": {
                        "@type": "Product",
                        "url": "https://dalli.rs/proizvod-${p.slug}.html",
                        "name": "${p.name.replace(/"/g, '\\"')}",
                        "image": "https://dalli.rs${p.images.main}",
                        "offers": {
                            "@type": "Offer",
                            "price": ${p.salePrice || p.price},
                            "priceCurrency": "${p.currency}",
                            "availability": "https://schema.org/${p.computedInventory.schemaAvailability}"
                        }
                    }
                }`).join(',\n                ')}
            ]
        },
        "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Početna",
                    "item": "https://dalli.rs/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "${categoryConfig.title}",
                    "item": "${categoryConfig.canonical}"
                }
            ]
        }
    }
    </script>
    
    <link rel="stylesheet" href="/css/style.css?v=20241215">
</head>
<body>
    <header class="header" role="banner">
        <div class="container">
            <div class="logo">
                <a href="/admin-login.html" class="admin-logo-link" aria-label="Administrator panel - Prijava" title="Prijava za administratore">
                    <svg class="logo-icon" viewBox="0 0 100 100" aria-hidden="true">
                        <defs>
                            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#1a252f;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="50" fill="url(#logoGrad)"/>
                        <text x="50" y="68" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#e74c3c" text-anchor="middle">📦</text>
                    </svg>
                </a>
                <a href="/" aria-label="DALLI - Početna">
                    <h1>DALLI</h1>
                </a>
                <span class="tagline">Muška i Ženska Garderoba</span>
            </div>
            <nav class="nav" role="navigation" aria-label="Glavna navigacija" itemscope itemtype="https://schema.org/SiteNavigationElement">
                <a href="/" class="nav-link" itemprop="url"><span itemprop="name">Početna</span></a>
                <a href="/products.html" class="nav-link" itemprop="url"><span itemprop="name">Svi Proizvodi</span></a>
                <a href="/muska-garderoba.html" class="nav-link" itemprop="url"><span itemprop="name">Muška Garderoba</span></a>
                <a href="/zenska-garderoba.html" class="nav-link" itemprop="url"><span itemprop="name">Ženska Garderoba</span></a>
                <a href="/dukseri.html" class="nav-link" itemprop="url"><span itemprop="name">Duksevi</span></a>
                <button class="nav-link theme-toggle" id="themeToggle" aria-label="Preklopi tamnu/svetlu temu" title="Tamna/Svetla tema">
                    <span class="theme-icon" aria-hidden="true">🌙</span>
                </button>
                <a href="/cart.html" class="nav-link cart-link" aria-label="Korpa za kupovinu">
                    Korpa
                    <span class="cart-count" id="cartCount" aria-live="polite">0</span>
                </a>
            </nav>
        </div>
    </header>

    <main class="main" role="main">
        <!-- Breadcrumbs -->
        <nav class="breadcrumb" aria-label="Breadcrumb" itemscope itemtype="https://schema.org/BreadcrumbList">
            <div class="container">
                <ol class="breadcrumb-list">
                    <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                        <a href="/" itemprop="item" class="breadcrumb-link"><span itemprop="name">Početna</span></a>
                        <meta itemprop="position" content="1">
                    </li>
                    <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                        <span class="breadcrumb-current" itemprop="name">${categoryConfig.title}</span>
                        <meta itemprop="position" content="2">
                    </li>
                </ol>
            </div>
        </nav>

        <section class="category-hero">
            <div class="container">
                <h1>${categoryConfig.title}</h1>
                ${statsHtml ? `<div class="category-stats">${statsHtml}</div>` : ''}
            </div>
        </section>

        ${subcategoryNav}

        <!-- SEO Content -->
        <section class="seo-content" aria-labelledby="seo-title">
            <div class="container">
                <h2 id="seo-title" class="section-title" style="display: none;">Zašto DALLI za ${categoryConfig.title.toLowerCase()}</h2>
                <div class="content-grid">
                    <article class="content-card">
                        <h3>🇷🇸 Brza Dostava po Srbiji</h3>
                        <p>Isporučujemo po celoj Srbiji u roku 1-3 radna dana. Besplatna dostava za porudžbine preko 5.000 RSD.</p>
                    </article>
                    <article class="content-card">
                        <h3>🔄 30 Dana za Vraćanje</h3>
                        <p>Niste sigurni u veličinu? Vratite proizvod u roku od 30 dana. Troškove povratne dostave pokrivamo mi.</p>
                    </article>
                    <article class="content-card">
                        <h3>💳 Plaćanje Pri Preuzimanju</h3>
                        <p>Kupujete bez rizika - plaćate tek kad paket stigne u ruke. Gotovina ili kartica kod kurira.</p>
                    </article>
                    <article class="content-card">
                        <h3>🧵 Kvalitet Prvo</h3>
                        <p>100% organski pamuk, gruba tkanina 320g/m² za duksevi, vaprotek tehnologija za trenerke.</p>
                    </article>
                </div>
            </div>
        </section>

        <section class="featured" aria-labelledby="featured-title">
            <div class="container">
                <h2 id="featured-title" class="section-title">${categoryConfig.title === 'Svi Proizvodi' ? 'Svi Proizvodi' : 'Naši Proizvodi'}</h2>
                <div class="product-grid" id="featuredProducts" role="list" aria-label="${categoryConfig.title}">
                    ${productGridHtml}
                </div>
                ${categoryKey !== 'products' ? `
                <div class="text-center">
                    <a href="/products.html" class="btn btn-secondary">Svi Proizvodi</a>
                </div>
                ` : ''}
            </div>
        </section>
    </main>

    <footer class="footer" role="contentinfo">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-col">
                    <h3>DALLI</h3>
                    <p>Vaša omiljena garderoba jednom klikom. Muška i ženska odela kvalitetne tkanine.</p>
                </div>
                <div class="footer-col">
                    <h3>Kategorije</h3>
                    <p><a href="/muska-garderoba.html">Muška Garderoba</a></p>
                    <p><a href="/zenska-garderoba.html">Ženska Garderoba</a></p>
                    <p><a href="/dukseri.html">Duksevi (Hoodie)</a></p>
                </div>
                <div class="footer-col">
                    <h3>Kontakt</h3>
                    <p>📞 <a href="tel:+381111234567">011 123 4567</a></p>
                    <p>✉️ <a href="mailto:info@dalli.rs">info@dalli.rs</a></p>
                </div>
                <div class="footer-col">
                    <h3>Podrška</h3>
                    <p><a href="/complaints.html">Žalbe & Vraćanja</a></p>
                    <p><a href="/advertising.html">Reklama & Partnerstvo</a></p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${currentYear} DALLI. Sva prava zadržana.</p>
            </div>
        </div>
    </footer>

    <script src="/js/app.js?v=20241217" defer></script>
</body>
</html>`;

    const outputFile = path.join(OUTPUT_DIR, `${categoryKey}.html`);
    fs.writeFileSync(outputFile, html, 'utf8');
    console.log(`✅ Generisano: ${categoryKey}.html (${filteredProducts.length} proizvoda)`);
}

function generateCategories() {
    const products = loadProducts();
    
    Object.entries(CATEGORIES).forEach(([key, config]) => {
        renderCategoryPage(key, config, products);
    });
    
    console.log(`\n🎉 Ukupno generisano: ${Object.keys(CATEGORIES).length} category stranica`);
}

generateCategories();