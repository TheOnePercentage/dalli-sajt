const fs = require('fs');

/**
 * Generate meta title for product
 * Format: "{Product Name} - DALLI | Organski Pamuk, {Price} RSD"
 * Target length: 30-60 characters
 */
function generateMetaTitle(product) {
  const price = product.price.toLocaleString('sr-RS');
  // Even shorter format to ensure < 60 chars
  return `${product.name} - DALLI | Org. Pamuk, ${product.price.toLocaleString('sr-RS')} RSD`;
}

/**
 * Generate meta description for product
 * Target length: 70-160 characters
 */
function generateMetaDescription(product) {
  const price = product.price.toLocaleString('sr-RS');
  const genderText = product.gender === 'unisex' ? 'unisex' : product.gender;
  
  return `Kupite ${product.name} - 100% organski pamuk, ${genderText}. Cena ${product.price.toLocaleString('sr-RS')} RSD. Besplatna dostava nad 5.000 RSD. Plaćanje pri preuzimanju.`;
}

/**
 * Generate keywords array from product data
 * Returns 5-15 unique keywords
 */
function generateKeywords(product) {
  const base = [
    product.name.toLowerCase(),
    product.category,
    product.gender,
    'DALLI',
    'organski pamuk'
  ];
  
  const categorySpecific = {
    'majice': ['majica', 'pamukna majica', 'unisex majica', 'organska majica'],
    'trenerke': ['trenerka', 'sportska trenerka', 'trenerka sa kapuljačom', 'vaprotek'],
    'dukseri': ['duks', 'hoodie', 'duks hoodie', 'duks sa kapuljačom'],
    'ostalo': ['aksesoar', 'čarape', 'šalica', 'DALLI aksesoari']
  };
  
  const specific = categorySpecific[product.category] || [];
  const allKeywords = [...base, ...specific];
  
  // Deduplicate and limit to 15
  return [...new Set(allKeywords)].slice(0, 15);
}

/**
 * Generate canonical URL from product slug
 */
function generateCanonicalUrl(slug) {
  return `https://dalli.rs/proizvod-${slug}.html`;
}

/**
 * Generate complete SEO object for a product
 */
function generateSEO(product) {
  return {
    metaTitle: generateMetaTitle(product),
    metaDescription: generateMetaDescription(product),
    keywords: generateKeywords(product),
    canonicalUrl: generateCanonicalUrl(product.slug)
  };
}

module.exports = {
  generateMetaTitle,
  generateMetaDescription,
  generateKeywords,
  generateCanonicalUrl,
  generateSEO
};
