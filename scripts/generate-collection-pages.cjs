// generate-collection-pages.cjs - Phase 14.5 Step 2: Generate collection hierarchy pages
const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'products.json');
const TEMPLATE_FILE = path.join(__dirname, '..', 'templates', 'collection-template.html');
const OUTPUT_DIR = process.env.GENERATE_OUTPUT_DIR
    ? path.resolve(process.env.GENERATE_OUTPUT_DIR)
    : path.join(__dirname, '..');

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

function formatPrice(price) {
    return Number(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

function buildBreadcrumbSchema(collection, gender, category) {
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
}

function buildCollectionPageSchema(collection, gender, category, products) {
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
            "itemListElement": products.map((product, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Product",
                    "@id": `https://dalli.rs${getProductUrl(product)}#product`,
                    "name": product.name,
                    "description": product.shortDescription,
                    "brand": { "@type": "Brand", "name": "DALLI" },
                    "sku": product.sku,
                    "category": CATEGORY_NAMES[product.category] || product.category,
                    "image": `https://dalli.rs${product.images.main}`,
                    "offers": {
                        "@type": "Offer",
                        "@id": `https://dalli.rs${getProductUrl(product)}#offer`,
                        "url": `https://dalli.rs${getProductUrl(product)}`,
                        "price": product.price,
                        "priceCurrency": product.currency,
                        "availability": "https://schema.org/InStock",
                        "seller": { "@type": "Organization", "name": "DALLI", "url": "https://dalli.rs" }
                    }
                }
            }))
        };
    }

    return JSON.stringify(schema, null, 4);
}

function getProductUrl(product) {
    const primary = product.primaryHierarchy || {};
    const collection = primary.collection || product.collection || 'casual';
    const gender = primary.gender || (Array.isArray(product.gender) ? product.gender[0] : product.gender) || 'unisex';
    const category = primary.category || product.category || 'accessories';
    const slug = product.slug;
    return `/${collection}/${gender}/${category}/${slug}.html`;
}

function augmentImages(products) {
    const widths = [320, 640, 960, 1280];
    const schemes = ['avif', 'webp', 'jpg'];
    products.forEach(product => {
        const images = product.images || {};
        const base = images.main;
        if (!base) return;
        widths.forEach(w => {
            if (!images['main' + w]) images['main' + w] = base;
            schemes.forEach(s => {
                const key = 'main' + s.charAt(0).toUpperCase() + s.slice(1) + w;
                if (!images[key]) images[key] = base;
            });
        });
        if (!images.mainWebp) images.mainWebp = base;
    });
    return products;
}

function loadData() {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    data.products = augmentImages(data.products || []);
    return data;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function render(template, data) {
    return Handlebars.compile(template)(data);
}

function generateCollectionPages() {
    const { products } = loadData();
    const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');

Handlebars.registerHelper('getProductUrl', getProductUrl);
Handlebars.registerHelper('formatPrice', formatPrice);
Handlebars.registerHelper('getCategoryName', getCategoryName);
Handlebars.registerHelper('getCollectionLabel', getCollectionLabel);
Handlebars.registerHelper('getGenderLabel', getGenderLabel);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('eq', (a, b) => a === b);

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

    const sitemapUrls = [];

    // Generate collection index pages
    Object.entries(grouped).forEach(([collection, genders]) => {
        // Collection index page (e.g., /casual/, /elegance/)
        const collectionPath = path.join(OUTPUT_DIR, collection, 'index.html');
        ensureDir(path.dirname(collectionPath));

        const collectionProducts = Object.values(genders).flatMap(g => Object.values(g)).flat();
        const collectionSchema = buildCollectionPageSchema(collection, null, null, collectionProducts);

        const collectionHtml = render(template, {
            collection,
            collectionLabel: COLLECTION_LABELS[collection],
            gender: null,
            genderLabel: null,
            category: null,
            categoryLabel: null,
            products: collectionProducts.slice(0, 12),
            categories: Object.keys(genders).flatMap(g => Object.keys(genders[g])),
            currentYear: new Date().getFullYear(),
            getCategoryName,
            getCollectionLabel,
            getGenderLabel,
            schemaOrgJson: collectionSchema
        });

        ensureDir(path.dirname(collectionPath));
        fs.writeFileSync(collectionPath, collectionHtml, 'utf8');
        console.log(`✅ Generisano: /${collection}/index.html`);

        sitemapUrls.push({ url: `https://dalli.rs/${collection}/`, changefreq: 'weekly', priority: 0.9 });

        // Gender pages (e.g., /casual/men/, /elegance/men/)
        Object.entries(genders).forEach(([gender, categories]) => {
            const genderPath = path.join(OUTPUT_DIR, collection, gender, 'index.html');
            ensureDir(path.dirname(genderPath));

            const genderProducts = Object.values(categories).flat();
            const genderSchema = buildCollectionPageSchema(collection, gender, null, genderProducts);

            const genderHtml = render(template, {
                collection,
                collectionLabel: COLLECTION_LABELS[collection],
                gender,
                genderLabel: GENDER_LABELS[gender],
                category: null,
                categoryLabel: null,
                products: genderProducts.slice(0, 12),
                categories: Object.keys(categories),
                currentYear: new Date().getFullYear(),
                getCategoryName,
                getCollectionLabel,
                getGenderLabel,
                schemaOrgJson: genderSchema
            });

            ensureDir(path.dirname(genderPath));
            fs.writeFileSync(genderPath, genderHtml, 'utf8');
            console.log(`✅ Generisano: /${collection}/${gender}/index.html`);

            sitemapUrls.push({ url: `https://dalli.rs/${collection}/${gender}/`, changefreq: 'weekly', priority: 0.8 });

            // Category pages (e.g., /casual/men/t-shirts/, /elegance/men/shirts/)
            Object.entries(categories).forEach(([category, products]) => {
                const categoryPath = path.join(OUTPUT_DIR, collection, gender, category, 'index.html');
                ensureDir(path.dirname(categoryPath));

                const categorySchema = buildCollectionPageSchema(collection, gender, category, products);

                const categoryHtml = render(template, {
                    collection,
                    collectionLabel: COLLECTION_LABELS[collection],
                    gender,
                    genderLabel: GENDER_LABELS[gender],
                    category,
                    categoryLabel: CATEGORY_NAMES[category],
                    products: products.slice(0, 24),
                    categories: [category],
                    currentYear: new Date().getFullYear(),
                    getCategoryName,
                    getCollectionLabel,
                    getGenderLabel,
                    schemaOrgJson: categorySchema
                });

                ensureDir(path.dirname(categoryPath));
                fs.writeFileSync(categoryPath, categoryHtml, 'utf8');
                console.log(`✅ Generisano: /${collection}/${gender}/${category}/index.html`);

                sitemapUrls.push({ url: `https://dalli.rs/${collection}/${gender}/${category}/`, changefreq: 'weekly', priority: 0.7 });
            });
        });
    });

    return sitemapUrls;
}

function generateSitemap(sitemapUrls) {
    const baseUrls = [
        { url: 'https://dalli.rs/', changefreq: 'daily', priority: 1.0 },
        { url: 'https://dalli.rs/casual/', changefreq: 'weekly', priority: 0.9 },
        { url: 'https://dalli.rs/elegance/', changefreq: 'weekly', priority: 0.9 }
    ];

    const allUrls = [...baseUrls, ...sitemapUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls.map(u => `  <url>
    <loc>${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
</url>`).join('\n')}
</urlset>`;

    const sitemapPath = path.join(OUTPUT_DIR, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log(`✅ Sitemap.xml generisan sa ${allUrls.length} URL-ova`);
}

function generateAll() {
    console.log('🚀 Generisanje kolekcijskih stranica (Phase 14.5 Step 2)...\n');
    const sitemapUrls = generateCollectionPages();
    generateSitemap(sitemapUrls);
    console.log('\n✅ Phase 14.5 Step 2 završen!');
}

generateAll();