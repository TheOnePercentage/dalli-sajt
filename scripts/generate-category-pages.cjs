const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = process.env.GENERATE_OUTPUT_DIR
  ? path.resolve(process.env.GENERATE_OUTPUT_DIR)
  : path.join(__dirname, '..');

// Load data
const seoData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/category-seo.json'), 'utf8'));
const template = fs.readFileSync(path.join(__dirname, '..', 'templates/category-seo-template.html'), 'utf8');
const productsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/products.json'), 'utf8'));
const products = productsData.products || [];

// Category to product filter mapping (legacy slugs -> new product schema)
function productGenders(p) {
  return Array.isArray(p.gender) ? p.gender : [p.gender || 'unisex'];
}

const isUnisex = p => productGenders(p).includes('unisex');
const isMen = p => productGenders(p).includes('men') || p.gender === 'muski';
const isWomen = p => productGenders(p).includes('women') || p.gender === 'zenski';

const categoryFilters = {
  'muska-garderoba': p => isMen(p) || ((p.category === 't-shirts' || p.category === 'majice') && isUnisex(p)),
  'zenska-garderoba': p => isWomen(p) || ((p.category === 't-shirts' || p.category === 'majice') && isUnisex(p)),
  'dukseri': p => p.category === 'hoodies' || p.category === 'dukseri',
  'trenerke': p => p.category === 'tracksuits' || p.category === 'trenerke',
  'majice': p => p.category === 't-shirts' || p.category === 'majice'
};

const CATEGORY_DISPLAY_NAMES = {
  't-shirts': 'Majice',
  'hoodies': 'Duksevi (Hoodie)',
  'tracksuits': 'Trenerke',
  'shirts': 'Košulje',
  'blazers': 'Sakoi',
  'essential': 'Basic',
  'leggings': 'Helanke',
  'matching-sets': 'Kompleti',
  'suits': 'Odela',
  'trousers': 'Pantalone',
  'coats': 'Kaputi',
  'dresses': 'Haljine',
  'accessories': 'Aksesoari',
  'shorts': 'Šorcevi',
  'jackets': 'Jakne'
};

// Helper functions
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(price) {
  return price.toLocaleString('sr-RS') + ' RSD';
}

function getSchemaAvailability(status) {
  if (status === 'out_of_stock') return 'OutOfStock';
  if (status === 'preorder') return 'PreOrder';
  return 'InStock';
}

// Resolve an import path against the output dir; fall back to an existing asset.
function resolveImage(src) {
  if (!src) return '/images/og-default.svg';
  if (/^https?:/.test(src)) return src;
  const rel = src.replace(/^\//, '');
  return fs.existsSync(path.join(OUTPUT_DIR, rel)) ? src : '/images/og-default.svg';
}

function getProductPageUrl(p) {
  const h = p.primaryHierarchy || {};
  const gender = h.gender || (Array.isArray(p.gender) ? p.gender[0] : p.gender) || 'unisex';
  const collection = h.collection || p.collection || 'casual';
  const category = h.category || p.category || 'accessories';
  return `/${collection}/${gender}/${category}/${p.slug}.html`;
}

function generateCategoryStats(category) {
  const filter = categoryFilters[category.slug] || (() => false);
  const catProducts = products.filter(filter);
  const byCategory = {};
  catProducts.forEach(p => {
    const name = CATEGORY_DISPLAY_NAMES[p.category] || p.category;
    byCategory[name] = (byCategory[name] || 0) + 1;
  });
  const entries = Object.entries(byCategory);
  if (entries.length === 0) return '';
  return entries.map(([label, count]) => `
    <div class="stat">
      <strong>${escapeHtml(label)}</strong>
      <span>${count} ${count === 1 ? 'proizvod' : 'proizvoda'}</span>
    </div>
  `).join('\n');
}

function generateSubcategoryLinks(category) {
  return category.subcategories.map(sub => `
    <a href="#${sub.slug}" class="subcat-link" data-filter="${sub.slug}">
      <span class="subcat-icon" aria-hidden="true">👕</span>
      <span>${escapeHtml(sub.title)}</span>
    </a>
  `).join('\n');
}

function generateProductListSchema(category) {
  const filter = categoryFilters[category.slug] || (() => false);
  const catProducts = products.filter(filter);
  
  return catProducts.map((p, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "item": {
      "@type": "Product",
      "url": `https://dalli.rs${getProductPageUrl(p)}`,
      "name": p.name,
      "image": `https://dalli.rs${resolveImage(p.images?.main || p.images?.ogImage)}`,
      "offers": {
        "@type": "Offer",
        "price": p.price,
        "priceCurrency": "RSD",
        "availability": `https://schema.org/${getSchemaAvailability(p.inventory?.status)}`
      }
    }
  }));
}

function generateProductCards(category) {
  const filter = categoryFilters[category.slug] || (() => false);
  const catProducts = products.filter(filter);
  
  return catProducts.map(p => `
    <article class="product-card" itemscope itemtype="https://schema.org/Product" data-product-id="${p.id}" data-category="${p.category}" data-gender="${p.gender}" data-inventory-status="${p.inventory?.status || 'in_stock'}">
      <a href="${getProductPageUrl(p)}" class="product-link" itemprop="url">
        <div class="product-image">
          <img src="https://dalli.rs${resolveImage(p.images?.main || p.images?.ogImage)}" alt="${escapeHtml(p.name)}" loading="lazy" itemprop="image">
          <span class="availability-badge ${p.inventory?.status || 'in_stock'}" aria-label="${p.inventory?.status || 'in_stock'}">${p.inventory?.status || 'in_stock'}</span>
        </div>
        <div class="product-info">
          <span class="product-category" itemprop="category">${escapeHtml(p.category)}</span>
          <h3 class="product-name" itemprop="name">${escapeHtml(p.name)}</h3>
          <p class="product-short-desc" itemprop="description">${escapeHtml(p.shortDescription || '')}</p>
          <div class="product-footer">
            <div class="product-price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
              <meta itemprop="priceCurrency" content="RSD">
              <meta itemprop="price" content="${p.price}">
              <meta itemprop="availability" content="https://schema.org/${getSchemaAvailability(p.inventory?.status)}">
              <span class="price">${p.price.toLocaleString('sr-RS')} RSD</span>
            </div>
            <button class="btn-add" data-product-id="${p.id}" data-sku="${p.sku}" aria-label="Dodaj ${escapeHtml(p.name)} u korpu">
              Dodaj u korpu
            </button>
          </div>
        </div>
      </a>
    </article>
  `).join('\n');
}

function generateRelatedCategories(category) {
  return category.relatedCategories.map(slug => {
    const related = seoData.categories.find(c => c.slug === slug);
    if (!related) return '';
    return `
      <a href="/${slug}.html" class="related-category-card">
        <h3>${escapeHtml(related.title)}</h3>
        <p>${escapeHtml(related.metaDescription)}</p>
      </a>
    `;
  }).join('\n');
}

function generateFAQItems(category) {
  return category.faq.map((faq, i) => `
    <article class="faq-item" itemprop="mainEntity" itemscope itemtype="https://schema.org/Question">
      <button class="faq-question" aria-expanded="false" aria-controls="faq-answer-${category.slug}-${i}" itemprop="name">
        ${escapeHtml(faq.q)}
        <svg class="faq-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <div id="faq-answer-${category.slug}-${i}" class="faq-answer" itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer" hidden>
        <div class="faq-answer-content" itemprop="text">
          ${escapeHtml(faq.a)}
        </div>
      </div>
    </article>
  `).join('\n');
}

function generateFAQSchema(category) {
  const faqItems = category.faq.map(faq => ({
    "@type": "Question",
    "name": faq.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.a
    }
  }));
  return {
    "@type": "FAQPage",
    "mainEntity": faqItems
  };
}

// Process each category
seoData.categories.forEach(category => {
  const canonicalUrl = `https://dalli.rs/${category.slug}.html`;
  const filter = categoryFilters[category.slug] || (() => false);
  const catProducts = products.filter(filter);
  const productListSchema = generateProductListSchema(category);
  const faqSchema = generateFAQSchema(category);
  
  let html = template
    .replace(/\{\{metaTitle\}\}/g, escapeHtml(category.metaTitle))
    .replace(/\{\{metaDescription\}\}/g, escapeHtml(category.metaDescription))
    .replace(/\{\{keywords\}\}/g, escapeHtml(category.keywords.join(', ')))
    .replace(/\{\{canonicalUrl\}\}/g, escapeHtml(canonicalUrl))
    .replace(/\{\{title\}\}/g, escapeHtml(category.title))
    .replace(/\{\{h1\}\}/g, escapeHtml(category.h1))
    .replace(/\{\{intro\}\}/g, escapeHtml(category.intro))
    .replace(/\{\{longContent\}\}/g, category.longContent.split('\n\n').map(p => `<p>${escapeHtml(p.trim())}</p>`).join('\n'))
    .replace(/\{\{categoryStats\}\}/g, generateCategoryStats(category))
    .replace(/\{\{subcategoryLinks\}\}/g, generateSubcategoryLinks(category))
    .replace(/\{\{productCards\}\}/g, generateProductCards(category))
    .replace(/\{\{relatedCategories\}\}/g, generateRelatedCategories(category))
    .replace(/\{\{faqItems\}\}/g, generateFAQItems(category))
    .replace(/\{\{productListSchema\}\}/g, JSON.stringify(productListSchema))
    .replace(/\{\{faqSchema\}\}/g, JSON.stringify(faqSchema))
    .replace(/\{\{productCount\}\}/g, catProducts.length.toString())
    .replace(/\{\{ogImage\}\}/g, escapeHtml(resolveImage(category.ogImage)))
    .replace(/\{\{canonicalOverride\}\}/g, escapeHtml(category.canonicalOverride || canonicalUrl));
  
  const outputPath = path.join(OUTPUT_DIR, `${category.slug}.html`);
  fs.writeFileSync(outputPath, html);
  console.log(`Generated: ${outputPath} (${catProducts.length} products)`);
});

console.log('All category pages generated!');
