const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'products.json');

function loadProducts() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  return data.products;
}

function saveProducts(products) {
  const data = { products };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ Products saved to', DATA_FILE);
}

// Mapping from old category/gender to new hierarchy
const HIERARCHY_MAP = {
  // Casual Men
  'casual:men:t-shirts': { collection: 'casual', gender: 'men', category: 't-shirts' },
  'casual:men:hoveries': { collection: 'casual', gender: 'men', category: 'hoodies' },
  'casual:men:tracksuits': { collection: 'casual', gender: 'men', category: 'tracksuits' },
  'casual:men:shorts': { collection: 'casual', gender: 'men', category: 'shorts' },
  'casual:men:jackets': { collection: 'casual', gender: 'men', category: 'jackets' },
  'casual:men:essentials': { collection: 'casual', gender: 'men', category: 'essentials' },
  
  // Casual Women
  'casual:women:t-shirts': { collection: 'casual', gender: 'women', category: 't-shirts' },
  'casual:women:hoveries': { collection: 'casual', gender: 'women', category: 'hoodies' },
  'casual:women:leggings': { collection: 'casual', gender: 'women', category: 'leggings' },
  'casual:women:tracksuits': { collection: 'casual', gender: 'women', category: 'tracksuits' },
  'casual:women:matching-sets': { collection: 'casual', gender: 'women', category: 'matching-sets' },
  'casual:women:jackets': { collection: 'casual', gender: 'women', category: 'jackets' },
  'casual:women:essentials': { collection: 'casual', gender: 'women', category: 'essentials' },
  
  // Elegance Men
  'elegance:men:shirts': { collection: 'elegance', gender: 'men', category: 'shirts' },
  'elegance:men:blazers': { collection: 'elegance', gender: 'men', category: 'blazers' },
  'elegance:men:suits': { collection: 'elegance', gender: 'men', category: 'suits' },
  'elegance:men:trousers': { collection: 'elegance', gender: 'men', category: 'trousers' },
  'elegance:men:coats': { collection: 'elegance', gender: 'men', category: 'coats' },
  
  // Elegance Women
  'elegance:women:dresses': { collection: 'elegance', gender: 'women', category: 'dresses' },
  'elegance:women:shirts': { collection: 'elegance', gender: 'women', category: 'shirts' },
  'elegance:women:blazers': { collection: 'elegance', gender: 'women', category: 'blazers' },
  'elegance:women:elegant-trousers': { collection: 'elegance', gender: 'women', category: 'elegant-trousers' },
  'elegance:women:coats': { collection: 'elegance', gender: 'women', category: 'coats' },
};

// Product-specific hierarchy assignments
const PRODUCT_HIERARCHY = {
  1: { // Osnovna Majica - unisex basic tee
    collection: 'casual',
    gender: ['men', 'women'],
    category: 't-shirts',
    categoryLabel: 'T-Shirts'
  },
  2: { // Dugorukava Majica - unisex long sleeve
    collection: 'casual',
    gender: ['men', 'women'],
    category: 't-shirts',
    categoryLabel: 'T-Shirts'
  },
  3: { // Muška Sportska Trenerka
    collection: 'casual',
    gender: 'men',
    category: 'tracksuits',
    categoryLabel: 'Tracksuits'
  },
  4: { // Ženska Kapuljača Trenerka
    collection: 'casual',
    gender: 'women',
    category: 'tracksuits',
    categoryLabel: 'Tracksuits'
  },
  5: { // Muški Duks (Hoodie)
    collection: 'casual',
    gender: 'men',
    category: 'hoodies',
    categoryLabel: 'Hoodies'
  },
  6: { // Ženski Duks (Hoodie)
    collection: 'casual',
    gender: 'women',
    category: 'hoodies',
    categoryLabel: 'Hoodies'
  },
  7: { // Čarape Unisex - essentials
    collection: 'casual',
    gender: ['men', 'women'],
    category: 'essentials',
    categoryLabel: 'Essentials'
  },
  8: { // Šalica za Kafu - merch, not clothing
    collection: 'casual',
    gender: 'unisex',
    category: 'accessories',
    categoryLabel: 'Accessories'
  },
};

function migrate() {
  const products = loadProducts();
  
  console.log(`🔄 Migrating ${products.length} products to new hierarchy...\n`);
  
  let updated = 0;
  
  products.forEach(product => {
    const hierarchy = PRODUCT_HIERARCHY[product.id];
    
    if (!hierarchy) {
      console.warn(`⚠️  No hierarchy mapping for product ID ${product.id} (${product.slug})`);
      return;
    }
    
    // Update hierarchy fields
    product.collection = hierarchy.collection;
    product.gender = hierarchy.gender;
    product.category = hierarchy.category;
    product.categoryLabel = hierarchy.categoryLabel;
    
    // Add hierarchy path for URL generation
    const genders = Array.isArray(hierarchy.gender) ? hierarchy.gender : [hierarchy.gender];
    product.hierarchyPaths = genders.map(g => ({
      collection: hierarchy.collection,
      gender: g,
      category: hierarchy.category
    }));
    
    // Primary hierarchy path (first gender)
    product.primaryHierarchy = {
      collection: hierarchy.collection,
      gender: genders[0],
      category: hierarchy.category
    };
    
    // Update breadcrumbs to new structure
    if (product.breadcrumbs) {
      const genderLabel = genders[0] === 'men' ? 'Muška' : genders[0] === 'women' ? 'Ženska' : 'Unisex';
      const collectionLabel = hierarchy.collection === 'casual' ? 'Casual' : 'Elegance';
      const categoryLabel = hierarchy.categoryLabel;
      
      // Find and replace the category breadcrumb
      product.breadcrumbs = product.breadcrumbs.map((crumb, idx) => {
        if (idx === product.breadcrumbs.length - 2) { // Second to last (category)
          return {
            name: genderLabel + ' ' + collectionLabel,
            url: `/${hierarchy.collection}/${genders[0]}/`
          };
        }
        if (idx === product.breadcrumbs.length - 3) { // Third to last (gender)
          return {
            name: collectionLabel,
            url: `/${hierarchy.collection}/`
          };
        }
        return crumb;
      });
    }
    
    // Update SEO canonical URL to new structure
    if (product.seo && product.seo.canonicalUrl) {
      const g = genders[0];
      product.seo.canonicalUrl = `https://dalli.rs/${hierarchy.collection}/${g}/${hierarchy.category}/${product.slug}.html`;
    }
    
    // Update structuredData category
    if (product.structuredData) {
      product.structuredData.category = hierarchy.categoryLabel;
    }
    
    // Update searchKeywords with hierarchy terms
    if (product.cms && product.cms.searchKeywords) {
      const hierarchyKeywords = [
        hierarchy.collection,
        genders[0],
        hierarchy.category
      ];
      product.cms.searchKeywords = [...new Set([
        ...product.cms.searchKeywords,
        ...hierarchyKeywords
      ])];
    }
    
    updated++;
    console.log(`✅ ID ${product.id}: ${product.name} → ${hierarchy.collection}/${genders.join(',')}/${hierarchy.category} (${hierarchy.categoryLabel})`);
  });
  
  saveProducts(products);
  console.log(`\n🎉 Migration complete: ${updated}/${products.length} products updated`);
  
  // Print summary
  console.log('\n📊 Summary by Collection/Gender/Category:');
  const summary = {};
  products.forEach(p => {
    const genders = Array.isArray(p.gender) ? p.gender : [p.gender];
    genders.forEach(g => {
      const key = `${p.collection}/${g}/${p.category}`;
      summary[key] = (summary[key] || 0) + 1;
    });
  });
  Object.entries(summary).sort().forEach(([key, count]) => {
    console.log(`  ${key}: ${count} product(s)`);
  });
}

migrate();