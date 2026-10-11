// generate-products.cjs - Luxury Collection Architecture
const Handlebars = require('handlebars');
const { ReviewSystem } = require("../lib/review-system.cjs");
const fs = require('fs');
const path = require('path');
const { computeInventory } = require('./inventory-helpers.cjs');

const DATA_FILE = path.join(__dirname, '..', 'data', 'products.json');
const REVIEWS_FILE = path.join(__dirname, '..', 'data', 'reviews.json');
const TEMPLATE_FILE = path.join(__dirname, '..', 'templates', 'product-template.html');
const OUTPUT_DIR = process.env.GENERATE_OUTPUT_DIR
    ? path.resolve(process.env.GENERATE_OUTPUT_DIR)
    : path.join(__dirname, '..');
const SITEMAP_DIR = process.env.GENERATE_OUTPUT_DIR
    ? OUTPUT_DIR
    : path.join(OUTPUT_DIR, 'dist');

const CATEGORY_NAMES = {
    't-shirts': 'T-Shirts',
    'hoodies': 'Hoodies',
    'tracksuits': 'Tracksuits',
    'shorts': 'Shorts',
    'jackets': 'Jackets',
    'essentials': 'Essentials',
    'leggings': 'Leggings',
    'matching-sets': 'Matching Sets',
    'shirts': 'Shirts',
    'blazers': 'Blazers',
    'suits': 'Suits',
    'trousers': 'Trousers',
    'coats': 'Coats',
    'dresses': 'Dresses',
    'accessories': 'Accessories'
};

const COLLECTION_LABELS = {
    'casual': 'Casual',
    'elegance': 'Elegance'
};

const GENDER_LABELS = {
    'men': 'Men',
    'women': 'Women',
    'unisex': 'Unisex'
};

const STAR_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="PLACEHOLDER" style="color: var(--color-warning);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

function formatPrice(price) {
    return Number(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function calculateDiscount(original, sale) {
    if (!sale || sale >= original) return 0;
    return Math.round(((original - sale) / original) * 100);
}

function getPriceValidUntil() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
}

function getCategoryName(category) {
    return CATEGORY_NAMES[category] || category;
}

function getCollectionLabel(collection) {
    return COLLECTION_LABELS[collection] || collection;
}

function getGenderLabel(gender) {
    return GENDER_LABELS[gender] || gender;
}

function getProductUrl(product) {
    const primary = product.primaryHierarchy || {};
    const collection = primary.collection || product.collection || 'casual';
    const gender = primary.gender || (Array.isArray(product.gender) ? product.gender[0] : product.gender) || 'unisex';
    const category = primary.category || product.category || 'accessories';
    const slug = product.slug;
    return `/${collection}/${gender}/${category}/${slug}.html`;
}

function getProductUrlForHierarchy(product, hierarchy) {
    const collection = hierarchy.collection || product.collection || 'casual';
    const gender = hierarchy.gender || 'unisex';
    const category = hierarchy.category || product.category || 'accessories';
    const slug = product.slug;
    return `/${collection}/${gender}/${category}/${slug}.html`;
}

// Page-context product URL: on a women/unisex collection page, prefer the
// product's hierarchy that matches the page context; fall back to primary.
function getProductUrlForPage(product, ctx) {
    const pages = (product.hierarchyPaths && product.hierarchyPaths.length) ? product.hierarchyPaths : [product.primaryHierarchy];
    if (!ctx || !ctx.gender) return getProductUrl(product);
    const col = ctx.collection || product.collection || 'casual';
    const match = pages.find(h => {
        if ((h.collection || product.collection || 'casual') !== col) return false;
        if (h.gender !== ctx.gender) return false;
        if (ctx.category && (h.category || product.category || 'accessories') !== ctx.category) return false;
        return true;
    });
    return match ? getProductUrlForHierarchy(product, match) : getProductUrl(product);
}

function withPageUrls(products, ctx) {
    return products.map(p => ({ ...p, pageUrl: getProductUrlForPage(p, ctx) }));
}

function resolveAssetExists(relPath) {
    if (!relPath) return false;
    return fs.existsSync(path.join(OUTPUT_DIR, relPath.replace(/^\//, '')));
}

function getProductOgImage(product) {
    const rel = product.images && product.images.ogImage ? product.images.ogImage : '';
    return rel && resolveAssetExists(rel) ? rel : '/images/og-default.svg';
}

function getCollectionOgImage(collection, gender) {
    const rel = `images/og/og-${collection}${gender ? '-' + gender : ''}.svg`;
    return resolveAssetExists(rel) ? '/' + rel : '/images/og-default.svg';
}

function buildCategoryNav(collection, gender, categoriesByGender) {
    if (gender) {
        return (categoriesByGender || []).map(category => ({
            slug: category,
            label: CATEGORY_NAMES[category] || category,
            url: `/${collection}/${gender}/${category}/`
        }));
    }
    const nav = [];
    const seen = new Set();
    Object.entries(categoriesByGender || {}).forEach(([g, categories]) => {
        Object.keys(categories).forEach(category => {
            if (seen.has(category)) return;
            seen.add(category);
            nav.push({
                slug: category,
                label: CATEGORY_NAMES[category] || category,
                url: `/${collection}/${g}/${category}/`
            });
        });
    });
    return nav;
}

function getProductOutputPath(product) {
    const url = getProductUrl(product);
    return path.join(OUTPUT_DIR, url.replace(/^\//, ''));
}

function getProductOutputPathForHierarchy(product, hierarchy) {
    const url = getProductUrlForHierarchy(product, hierarchy);
    return path.join(OUTPUT_DIR, url.replace(/^\//, ''));
}

function renderBreadcrumbSchema(breadcrumbs) {
    const items = breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': crumb.name,
        'item': `https://dalli.rs${crumb.url}`
    }));
    return JSON.stringify({
        '@type': 'BreadcrumbList',
        'itemListElement': items
    }, null, 4);
}

function getSchemaAvailability(status) {
    if (status === 'out_of_stock') return 'OutOfStock';
    if (status === 'preorder') return 'PreOrder';
    return 'InStock';
}

function getProductImageUrls(images) {
    const arr = [`https://dalli.rs${images.main}`];
    if (images.gallery && images.gallery.length > 0) {
        images.gallery.forEach(img => arr.push(`https://dalli.rs${img}`));
    }
    return arr;
}

function getAggregateRating(product, reviewSystem) {
    if (!reviewSystem) {
        console.log('[DEBUG] No reviewSystem provided, using fallback');
        let reviews = [];
        if (product && product.reviews && Array.isArray(product.reviews)) {
            reviews = product.reviews;
        }
        const approvedReviews = reviews.filter(r => r.status === 'approved');
        if (approvedReviews.length === 0) {
            return undefined;
        }
        const averageRating = (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1);
        return {
            '@type': 'AggregateRating',
            'ratingValue': averageRating,
            'reviewCount': approvedReviews.length,
            'worstRating': 1,
            'bestRating': 5
        };
    }
    
    // Use reviewSystem for accurate stats
    const stats = reviewSystem.getReviewStats(product.id);
    if (stats.totalReviews === 0) {
        return undefined;
    }
    const result = {
        '@type': 'AggregateRating',
        'ratingValue': String(stats.averageRating),
        'reviewCount': stats.totalReviews,
        'worstRating': 1,
        'bestRating': 5
    };
    return result;
}

function buildProductJsonLd(product, hierarchy, breadcrumbs, reviewSystem) {
    const productUrl = getProductUrlForHierarchy(product, hierarchy);
    const inventory = computeInventory(product);
    const offers = {
        '@type': 'Offer',
        '@id': `https://dalli.rs${productUrl}#offer`,
        'url': `https://dalli.rs${productUrl}`,
        'price': String(product.price),
        'priceCurrency': product.currency,
        'availability': `https://schema.org/${getSchemaAvailability(inventory.status)}`,
        'seller': { '@type': 'Organization', 'name': 'DALLI', 'url': 'https://dalli.rs' },
        'priceValidUntil': getPriceValidUntil(),
        'inventoryLevel': {
            '@type': 'QuantitativeValue',
            'value': inventory.totalStock
        }
    };

    if (product.salePrice && product.salePrice < product.price) {
        offers.priceSpecification = {
            '@type': 'UnitPriceSpecification',
            'price': product.salePrice,
            'priceCurrency': product.currency
        };
    }

    // Get all approved reviews for this product (including non-verified for consistency with aggregateRating)
    const productReviews = reviewSystem ? reviewSystem.getProductReviews(product.id, { verifiedOnly: false }) : (product.reviews || []);
    const approvedReviews = productReviews.filter(r => r.status === 'approved');
    
    const productNode = {
        '@type': 'Product',
        '@id': `https://dalli.rs${productUrl}#product`,
        'name': product.name,
        'description': product.description,
        'brand': { '@type': 'Brand', 'name': product.structuredData?.brand || 'DALLI' },
        'sku': product.sku,
        'mpn': product.structuredData?.mpn,
        'gtin': product.structuredData?.gtin || undefined,
        'image': getProductImageUrls(product.images),
        'category': product.structuredData?.category || getCategoryName(product.category),
        'offers': offers,
        'aggregateRating': getAggregateRating(product, reviewSystem),
        'review': approvedReviews.map(review => ({
            '@type': 'Review',
            'author': {
                '@type': 'Person',
                'name': review.userName || review.userInitials
            },
            'datePublished': review.createdAt,
            'reviewBody': review.text,
            'reviewRating': {
                '@type': 'Rating',
                'ratingValue': review.rating,
                'bestRating': 5,
                'worstRating': 1
            },
            'publisher': {
                '@type': 'Organization',
                'name': 'DALLI'
            },
            ...(review.verifiedPurchase && {
                'reviewAspect': 'verifiedPurchase',
                'description': 'Verified Purchase'
            })
        }))
    };

    const graph = [
        productNode,
        JSON.parse(renderBreadcrumbSchema(breadcrumbs))
    ];

    if (product.faq && product.faq.length) {
        graph.push(JSON.parse(renderFAQSchema(product.faq)));
    }

    return JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': graph
    }, null, 4);
}

function renderFAQSchema(faq) {
    if (!faq || !faq.length) return '{}';
    const mainEntity = faq.map(item => ({
        '@type': 'Question',
        'name': item.question,
        'acceptedAnswer': {
            '@type': 'Answer',
            'text': item.answer
        }
    }));
    return JSON.stringify({
        '@type': 'FAQPage',
        'mainEntity': mainEntity
    }, null, 4);
}

function formatRelativeDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const diffDays = (new Date() - date) / 86400000;
    if (diffDays < 1) return 'Danas';
    if (diffDays < 2) return 'Juče';
    if (diffDays < 7) return `Pre ${Math.floor(diffDays)} dana`;
    if (diffDays < 31) return `Pre ${Math.floor(diffDays / 7)} nedelje`;
    return date.toLocaleDateString('sr-RS', { year: 'numeric', month: 'long', day: 'numeric' });
}

function starIcons(rating) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += STAR_SVG.replace('PLACEHOLDER', i <= value ? 'currentColor' : 'none');
    }
    return html;
}

function reviewStarSummary(averageRating) {
    const value = Math.max(0, Math.min(5, Math.round(Number(averageRating) || 0)));
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += STAR_SVG.replace('width="14"', 'width="16"').replace('height="14"', 'height="16"').replace('PLACEHOLDER', i <= value ? 'currentColor' : 'none');
    }
    return html;
}

function reviewDistributionHtml(stats) {
    const total = stats.totalReviews || 1;
    const dist = stats.distribution || {};
    let html = '';
    for (let star = 5; star >= 1; star--) {
        const pct = Math.round(((dist[star] || 0) / total) * 100);
        html += `<div class="rating-bar-row" style="display: flex; align-items: center; gap: var(--space-2); margin: var(--space-1) 0; font-size: var(--fs-xs);">
                            <span style="width: 24px; color: var(--color-text-secondary);">${star}★</span>
                            <div style="flex: 1; height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden;">
                                <div class="rating-bar-fill" style="height: 100%; background: var(--color-warning); width: ${pct}%; transition: width 0.3s ease;"></div>
                            </div>
                            <span style="width: 30px; text-align: right; color: var(--color-text-tertiary);">${pct}%</span>
                        </div>`;
    }
    return html;
}

function registerHandlebarsHelpers() {
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('or', (...args) => args.slice(0, -1).some(Boolean));
    Handlebars.registerHelper('gt', (a, b) => Number(a) > Number(b));
    Handlebars.registerHelper('formatPrice', price => formatPrice(price));
    Handlebars.registerHelper('calculateDiscount', (original, sale) => calculateDiscount(Number(original), Number(sale)));
    Handlebars.registerHelper('getCategoryName', getCategoryName);
    Handlebars.registerHelper('getCollectionLabel', getCollectionLabel);
    Handlebars.registerHelper('getGenderLabel', getGenderLabel);
    Handlebars.registerHelper('getProductUrl', getProductUrl);
    Handlebars.registerHelper('plusOne', index => Number(index) + 1);
    Handlebars.registerHelper('add', (a, b) => Number(a) + Number(b));
    Handlebars.registerHelper('formatRelativeDate', formatRelativeDate);
    Handlebars.registerHelper('stars', starIcons);
}

registerHandlebarsHelpers();

function render(template, data) {
    return Handlebars.compile(template)(data);
}

function augmentImages(products) {
    const widths = [320, 640, 960, 1280];
    products.forEach(product => {
        const images = product.images || {};
        const base = images.main;
        if (!base) return;
        widths.forEach(w => {
            if (!images['main' + w]) images['main' + w] = base;
            if (!images['mainWebp' + w]) images['mainWebp' + w] = base;
        });
        if (!images.mainWebp) images.mainWebp = base;
    });
    return products;
}

function loadData() {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    data.products = augmentImages(data.products || []);
    const reviewsRaw = fs.readFileSync(REVIEWS_FILE, 'utf8');
    const reviewsData = JSON.parse(reviewsRaw);
    return { ...data, reviewsData };
}

function loadTemplate() {
    return fs.readFileSync(TEMPLATE_FILE, 'utf8');
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function buildProductBreadcrumbs(product, hierarchy = null) {
    const h = hierarchy || product.primaryHierarchy || {};
    const collection = h.collection || product.collection || 'casual';
    const gender = h.gender || (Array.isArray(product.gender) ? product.gender[0] : product.gender) || 'unisex';
    const category = h.category || product.category || 'accessories';
    
    return [
        { name: 'Početna', url: '/' },
        { name: getCollectionLabel(collection), url: `/${collection}/` },
        { name: getGenderLabel(gender), url: `/${collection}/${gender}/` },
        { name: getCategoryName(category), url: `/${collection}/${gender}/${category}/` },
        { name: product.name, url: getProductUrlForHierarchy(product, h) }
    ];
}

function buildVariantStockMap(product) {
    if (product.variantStocks) return product.variantStocks;
    const colors = product.colors || [];
    const sizes = (product.sizes || []).filter(s => s.available !== false);
    const map = {};
    if (!colors.length || !sizes.length) return map;
    sizes.forEach(size => {
        const total = Number(size.stock) || 0;
        colors.forEach((color, i) => {
            const share = Math.floor(total / colors.length) + (i < total % colors.length ? 1 : 0);
            map[`${color.name}|${size.size}`] = share;
        });
    });
    return map;
}

function buildColorImages(product) {
    const colors = product.colors || [];
    const map = {};
    if (!colors.length) return map;
    const gallery = (product.images && product.images.gallery) || [];
    const base = gallery.length ? gallery : (product.images && product.images.main ? [product.images.main] : []);
    colors.forEach(color => {
        map[color.name] = (color.images && color.images.length) ? color.images : base;
    });
    return map;
}

function generateProducts() {
    const { products, site, reviewsData } = loadData();
    const template = loadTemplate();
    const reviewSystem = new ReviewSystem();
    reviewSystem.reviews = reviewsData.reviews || [];
    reviewSystem.settings = reviewsData.settings || {};
    reviewSystem.buildProductCache();

    let total = 0;

    products.forEach(product => {
        const computedInventory = computeInventory(product);
        const productBreadcrumbs = buildProductBreadcrumbs(product);
        const rawStats = reviewSystem.getReviewStats(product.id);
        const reviewStats = {
            ...rawStats,
            averageRating: rawStats.averageRating ? String(rawStats.averageRating) : '0.0'
        };
        
        // Generate product page for each hierarchy path (gender)
        const hierarchyPaths = product.hierarchyPaths || [product.primaryHierarchy];
        
        hierarchyPaths.forEach(hierarchy => {
            const productUrl = getProductUrlForHierarchy(product, hierarchy);
            const breadcrumbs = buildProductBreadcrumbs(product, hierarchy);
            const productJsonLd = buildProductJsonLd(product, hierarchy, breadcrumbs, reviewSystem);

            const renderData = {
                ...site,
                ...product,
                cms: product.cms,
                currentYear: new Date().getFullYear(),
                computedInventory,
                inventory: computedInventory,
                reviews: (reviewSystem.getProductReviews(product.id, { verifiedOnly: false }) || []).map(review => ({
                    ...review,
                    customerName: review.userName || review.userInitials,
                    date: review.createdAt,
                    verified: review.verifiedPurchase
                })),
                ogImage: getProductOgImage(product),
                qa: product.qa || [],
                variantStocks: JSON.stringify(buildVariantStockMap(product)),
                colorImages: JSON.stringify(buildColorImages(product)),
                recentlyViewed: [],
                reviewStats,
                reviewStarSummary: reviewStarSummary(reviewStats.averageRating),
                reviewDistributionHtml: reviewDistributionHtml(reviewStats),
                breadcrumbs,
                productJsonLd,
                productUrl,
                seo: {
                    ...product.seo,
                    canonicalUrl: productUrl,
                    metaTitle: product.seo?.metaTitle || `${product.name} - DALLI | ${product.price} ${product.currency}`,
                    metaDescription: product.seo?.metaDescription || `Kupite ${product.name} DALLI - ${product.shortDescription}. Cena: ${formatPrice(product.price)} ${product.currency}.`,
                    metaKeywords: product.seo?.metaKeywords || [product.name, product.category, product.collection, 'DALLI'].join(', ')
                },
                canonicalUrl: productUrl
            };

            const html = render(template, renderData);
            
            // Ensure output directory exists
            const outputPath = getProductOutputPathForHierarchy(product, hierarchy);
            ensureDir(path.dirname(outputPath));
            
            fs.writeFileSync(outputPath, html, 'utf8');
            total++;
            console.log(`✅ Generisano: ${productUrl} (status: ${computedInventory.status}, stock: ${computedInventory.totalStock})`);
        });
    });

    console.log(`\n🎉 Ukupno generisano: ${total} stranica proizvoda`);
}

// Generate collection landing pages
function generateCollectionPages() {
    const { products, site } = loadData();
    const template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'collection-template.html'), 'utf8');
    
    // Group products by collection -> gender -> category
    const grouped = {};
    
    products.forEach(product => {
        const collection = product.collection || 'casual';
        const genders = Array.isArray(product.gender) ? product.gender : [product.gender || 'unisex'];
        const category = product.category || 'accessories';
        
        genders.forEach(gender => {
            if (!grouped[collection]) grouped[collection] = {};
            if (!grouped[collection][gender]) grouped[collection][gender] = {};
            if (!grouped[collection][gender][category]) grouped[collection][gender][category] = [];
            
            grouped[collection][gender][category].push(product);
        });
    });

    // Helper to build breadcrumb schema
    const buildBreadcrumbSchema = (collection, gender, category) => {
        const items = [
            { "@type": "ListItem", "position": 1, "name": "Početna", "item": "https://dalli.rs/" }
        ];
        let position = 2;
        if (collection) {
            items.push({ "@type": "ListItem", "position": position++, "name": COLLECTION_LABELS[collection], "item": `https://dalli.rs/${collection}/` });
        }
        if (gender) {
            items.push({ "@type": "ListItem", "position": position++, "name": GENDER_LABELS[gender], "item": `https://dalli.rs/${collection}/${gender}/` });
        }
        if (category) {
            items.push({ "@type": "ListItem", "position": position, "name": CATEGORY_NAMES[category], "item": `https://dalli.rs/${collection}/${gender}/${category}/` });
        }
        return JSON.stringify({ "@type": "BreadcrumbList", "itemListElement": items }, null, 4);
    };

    // Helper to build collection page schema
    const buildCollectionSchema = (collection, gender, category, products) => {
        const collectionLabel = COLLECTION_LABELS[collection];
        const genderLabel = gender ? GENDER_LABELS[gender] : null;
        const categoryLabel = category ? CATEGORY_NAMES[category] : null;
        const name = [collectionLabel, genderLabel, categoryLabel].filter(Boolean).join(' ');
        
        const schema = {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": name,
            "description": `Premium ${name} kolekcija DALLI. 100% organski pamuk, besplatna dostava >5.000 RSD, 15% popust kripto, 30 dana za vraćanje.`,
            "url": `https://dalli.rs/${collection}${gender ? '/' + gender : ''}${category ? '/' + category : ''}/`,
            "publisher": { "@type": "Organization", "name": "DALLI" },
            "breadcrumb": JSON.parse(buildBreadcrumbSchema(collection, gender, category))
        };

        if (products && products.length > 0) {
            schema.mainEntity = {
                "@type": "ItemList",
                "itemListElement": products.map((product, index) => {
                    const pageCtx = { collection, gender, category };
                    return {
                        "@type": "ListItem",
                        "position": index + 1,
                        "item": {
                            "@type": "Product",
                            "@id": `https://dalli.rs${getProductUrlForPage(product, pageCtx)}#product`,
                            "name": product.name,
                            "description": product.shortDescription,
                            "brand": { "@type": "Brand", "name": "DALLI" },
                            "sku": product.sku,
                            "category": CATEGORY_NAMES[product.category] || product.category,
                            "image": `https://dalli.rs${product.images.main}`,
                            "offers": {
                                "@type": "Offer",
                                "@id": `https://dalli.rs${getProductUrlForPage(product, pageCtx)}#offer`,
                                "url": `https://dalli.rs${getProductUrlForPage(product, pageCtx)}`,
                            "price": product.price,
                            "priceCurrency": product.currency,
                            "availability": "https://schema.org/InStock",
                            "seller": { "@type": "Organization", "name": "DALLI", "url": "https://dalli.rs" }
                        }
                    }
                };
                })
            };
            
            // Add AggregateRating for collection based on product reviews
            const REVIEWS_FILE = path.join(__dirname, '..', 'data', 'reviews.json');
            const reviewsRaw = fs.readFileSync(REVIEWS_FILE, 'utf8');
            const reviewsData = JSON.parse(reviewsRaw);
            
            const reviewSystem = new ReviewSystem();
            reviewSystem.reviews = reviewsData.reviews || [];
            reviewSystem.settings = reviewsData.settings || {};
            reviewSystem.buildProductCache();
            
            const allReviews = [];
            products.forEach(p => {
                const reviews = reviewSystem.getProductReviews(p.id);
                reviews.forEach(r => allReviews.push(r));
            });
            const approvedReviews = allReviews.filter(r => r.status === 'approved');
            if (approvedReviews.length > 0) {
                const averageRating = (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1);
                schema.aggregateRating = {
                    "@type": "AggregateRating",
                    "ratingValue": averageRating,
                    "reviewCount": approvedReviews.length,
                    "bestRating": 5,
                    "worstRating": 1
                };
                
                // Add individual reviews to collection schema
                schema.review = approvedReviews.map(review => {
                    const reviewObj = {
                        '@type': 'Review',
                        'author': {
                            '@type': 'Person',
                            'name': review.userName || review.userInitials
                        },
                        'datePublished': review.createdAt,
                        'reviewBody': review.text,
                        'reviewRating': {
                            '@type': 'Rating',
                            'ratingValue': review.rating,
                            'bestRating': 5,
                            'worstRating': 1
                        },
                        'publisher': {
                            '@type': 'Organization',
                            'name': 'DALLI'
                        }
                    };
                    if (review.verifiedPurchase) {
                        reviewObj.reviewAspect = 'verifiedPurchase';
                        reviewObj.description = 'Verified Purchase';
                    }
                    return reviewObj;
                });
        }
    }

        return JSON.stringify(schema, null, 4);
    };

    // Collect all generated collection page keys (collection/gender/category) for sitemap
    const generatedCollectionPages = [];

    // Generate collection landing pages
    Object.entries(grouped).forEach(([collection, genders]) => {
        // Collection index page
        const collectionPath = path.join(OUTPUT_DIR, collection, 'index.html');
        ensureDir(path.dirname(collectionPath));
        
        // Get all products for this collection for aggregateRating
        const collectionProducts = Object.values(genders).flatMap(c => Object.values(c).flat());
        
        const collectionSchema = buildCollectionSchema(collection, null, null, collectionProducts);
        
        const collectionHtml = render(template, {
            ...site,
            collection,
            collectionLabel: COLLECTION_LABELS[collection],
            genders: Object.keys(genders),
            categories: Object.keys(genders[Object.keys(genders)[0]] || {}),
            categoryNav: buildCategoryNav(collection, null, genders),
            ogImage: getCollectionOgImage(collection, null),
            products: withPageUrls(collectionProducts, { collection }),
            currentYear: new Date().getFullYear(),
            schemaOrgJson: collectionSchema
        });
        fs.writeFileSync(collectionPath, collectionHtml, 'utf8');
        console.log(`✅ Generisano: /${collection}/index.html`);

        // Gender pages
        Object.entries(genders).forEach(([gender, categories]) => {
            const genderPath = path.join(OUTPUT_DIR, collection, gender, 'index.html');
            ensureDir(path.dirname(genderPath));
            
            const genderSchema = buildCollectionSchema(collection, gender, null, Object.values(categories).flat());
            
            const genderHtml = render(template, {
                ...site,
                collection,
                gender,
                collectionLabel: COLLECTION_LABELS[collection],
                genderLabel: GENDER_LABELS[gender],
                categories: Object.keys(categories),
                categoryNav: buildCategoryNav(collection, gender, Object.keys(categories)),
                ogImage: getCollectionOgImage(collection, gender),
                products: withPageUrls(Object.values(categories).flat(), { collection, gender }),
                currentYear: new Date().getFullYear(),
                schemaOrgJson: genderSchema
            });
            fs.writeFileSync(genderPath, genderHtml, 'utf8');
            console.log(`✅ Generisano: /${collection}/${gender}/index.html`);

            // Category pages
            Object.entries(categories).forEach(([category, products]) => {
                const categoryPath = path.join(OUTPUT_DIR, collection, gender, category, 'index.html');
                ensureDir(path.dirname(categoryPath));
                
                const categorySchema = buildCollectionSchema(collection, gender, category, products);
                
                const categoryHtml = render(template, {
                    ...site,
                    collection,
                    gender,
                    category,
                    collectionLabel: COLLECTION_LABELS[collection],
                    genderLabel: GENDER_LABELS[gender],
                    categoryLabel: CATEGORY_NAMES[category],
                    categoryNav: buildCategoryNav(collection, gender, Object.keys(categories)),
                    ogImage: getCollectionOgImage(collection, gender),
                    products: withPageUrls(products, { collection, gender, category }),
                    currentYear: new Date().getFullYear(),
                    schemaOrgJson: categorySchema
                });
                fs.writeFileSync(categoryPath, categoryHtml, 'utf8');
                console.log(`✅ Generisano: /${collection}/${gender}/${category}/index.html`);
            });
        });

        // Materialize fallback collection pages referenced by sitemap/redirects:
        // unisex category landing pages (aggregating the collection's products per category)
        // and empty gender index pages (e.g. elegance/women/) for future catalog growth.
        const categoriesInCollection = Object.values(genders)
            .flatMap(categories => Object.keys(categories));
        const uniqueCategories = [...new Set(categoriesInCollection)];

        ['unisex', 'women'].forEach(gender => {
            const genderProducts = Object.values(genders[gender] || {}).flat();
            const genderPath = path.join(OUTPUT_DIR, collection, gender, 'index.html');
            if (!fs.existsSync(genderPath)) {
                const genderSchema = buildCollectionSchema(collection, gender, null, genderProducts);
                const genderHtml = render(template, {
                    ...site,
                    collection,
                    gender,
                    collectionLabel: COLLECTION_LABELS[collection],
                    genderLabel: GENDER_LABELS[gender],
                    categories: gender === 'unisex' ? uniqueCategories : [],
                    categoryNav: gender === 'unisex' ? buildCategoryNav(collection, gender, uniqueCategories) : [],
                    ogImage: getCollectionOgImage(collection, gender),
                    products: withPageUrls(genderProducts, { collection, gender }),
                    currentYear: new Date().getFullYear(),
                    schemaOrgJson: genderSchema
                });
                ensureDir(path.dirname(genderPath));
                fs.writeFileSync(genderPath, genderHtml, 'utf8');
                console.log(`✅ Generisano: /${collection}/${gender}/index.html`);
            }

            if (gender === 'unisex') {
                uniqueCategories.forEach(category => {
                    const categoryPath = path.join(OUTPUT_DIR, collection, gender, category, 'index.html');
                    if (fs.existsSync(categoryPath)) return;
                    const categoryProducts = products.filter(p =>
                        (p.collection || 'casual') === collection && p.category === category
                    );
                    const categorySchema = buildCollectionSchema(collection, gender, category, categoryProducts);
                    const categoryHtml = render(template, {
                        ...site,
                        collection,
                        gender,
                        category,
                        collectionLabel: COLLECTION_LABELS[collection],
                        genderLabel: GENDER_LABELS[gender],
                        categoryLabel: CATEGORY_NAMES[category],
                        categoryNav: buildCategoryNav(collection, gender, uniqueCategories),
                        ogImage: getCollectionOgImage(collection, gender),
                        products: withPageUrls(categoryProducts, { collection, gender, category }),
                        currentYear: new Date().getFullYear(),
                        schemaOrgJson: categorySchema
                    });
                    ensureDir(path.dirname(categoryPath));
                    fs.writeFileSync(categoryPath, categoryHtml, 'utf8');
                    console.log(`✅ Generisano: /${collection}/${gender}/${category}/index.html`);
                });
            }
        });

        generatedCollectionPages.push(
            { url: `/${collection}/`, changefreq: 'weekly', priority: 0.8 },
            { url: `/${collection}/men/`, changefreq: 'monthly', priority: 0.7 },
            { url: `/${collection}/women/`, changefreq: 'monthly', priority: 0.7 },
            { url: `/${collection}/unisex/`, changefreq: 'monthly', priority: 0.7 }
        );
        uniqueCategories.forEach(category => {
            ['men', 'women', 'unisex'].forEach(gender => {
                generatedCollectionPages.push({
                    url: `/${collection}/${gender}/${category}/`,
                    changefreq: 'monthly',
                    priority: 0.6
                });
            });
        });
    });

    return generatedCollectionPages;
}

// Generate sitemap
function generateSitemap() {
    const { products, site } = loadData();
    const blogData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'data/blog.json'), 'utf-8'));
    const blogPosts = blogData.posts || [];
    
    const today = new Date().toISOString().split('T')[0];
    const urls = [
        { url: 'https://dalli.rs/', changefreq: 'daily', priority: 1.0 },
        { url: 'https://dalli.rs/blog-index.html', changefreq: 'weekly', priority: 0.8 }
    ];

    // Add blog post URLs
    blogPosts.forEach(post => {
        urls.push({
            url: `https://dalli.rs/blog/${post.slug}.html`,
            changefreq: 'monthly',
            priority: 0.6,
            lastmod: post.updatedAt || post.date || today
        });
    });

    // Add collection index pages (only those that are actually generated)
    const collections = [...new Set(products.map(p => p.collection || 'casual'))];
    collections.forEach(collection => {
        const collProducts = products.filter(p => (p.collection || 'casual') === collection);
        const categories = [...new Set(collProducts.map(p => p.category))];

        urls.push({ url: `https://dalli.rs/${collection}/`, changefreq: 'weekly', priority: 0.8 });

        ['men', 'women', 'unisex'].forEach(gender => {
            urls.push({ url: `https://dalli.rs/${collection}/${gender}/`, changefreq: 'monthly', priority: 0.7 });
            categories.forEach(category => {
                urls.push({ url: `https://dalli.rs/${collection}/${gender}/${category}/`, changefreq: 'monthly', priority: 0.6 });
            });
        });
    });

    // Add all product URLs (one per hierarchy path)
    products.forEach(product => {
        const hierarchyPaths = product.hierarchyPaths || [product.primaryHierarchy];
        hierarchyPaths.forEach(hierarchy => {
            urls.push({
                url: `https://dalli.rs${getProductUrlForHierarchy(product, hierarchy)}`,
                changefreq: 'weekly',
                priority: 0.7,
                lastmod: product.updatedAt || product.cms?.updatedAt || today
            });
        });
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(u => `  <url>
    <loc>${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
</url>`).join('\n')}
</urlset>`;

    const distDir = SITEMAP_DIR;
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
    console.log(`✅ Generisano: sitemap.xml (${urls.length} URL-ova)`);
}

// Run all generation
function generateAll() {
    generateProducts();
    generateCollectionPages();
    generateSitemap();
    console.log('\n🎉 Sva generisanja završena!');
}

if (require.main === module) {
    // Run all generation only when executed directly
    generateAll();
}

module.exports = { generateProducts, generateCollectionPages, generateSitemap, generateAll };