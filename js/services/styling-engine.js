/**
 * Styling Engine Service
 * Outfit Intelligence Engine - CMS-driven styling recommendations
 * Works with data/outfits.json and products.json
 * No hardcoding - fully data-driven
 */

const STYLING_DATA_URL = '/data/outfits.json';
const PRODUCTS_DATA_URL = '/data/products.json';

let _stylingData = null;
let _products = [];
let _loadPromise = null;

async function loadData() {
  if (_stylingData && _products.length) return { styling: _stylingData, products: _products };

  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const [stylingRes, productsRes] = await Promise.all([
        fetch(STYLING_DATA_URL),
        fetch(PRODUCTS_DATA_URL)
      ]);

      if (stylingRes.ok) {
        _stylingData = await stylingRes.json();
      } else {
        _stylingData = { styleDefinitions: {}, compatibilityRules: {} };
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        _products = productsData.products || productsData || [];
      }
    } catch (err) {
      console.warn('[StylingEngine] Load failed:', err);
      _stylingData = _stylingData || { styleDefinitions: {}, compatibilityRules: {} };
    } finally {
      _loadPromise = null;
    }

    return { styling: _stylingData, products: _products };
  })();

  return _loadPromise;
}

export function normalizeStyles(styleOccasion) {
  if (!styleOccasion) return [];
  if (Array.isArray(styleOccasion)) return styleOccasion.filter(Boolean);
  if (typeof styleOccasion === 'string') return styleOccasion.split(',').map(s => s.trim());
  return [];
}

function getCategoryComplementarity(catA, catB) {
  if (!catA || !catB) return 0;
  const pairs = _stylingData?.categoryPairs || {};
  if (pairs[catA] && pairs[catA].includes(catB)) return 0.4;
  if (pairs[catB] && pairs[catB].includes(catA)) return 0.4;
  return 0.1;
}

export async function getCompatibleProducts(product, limit = 8) {
  const { styling, products } = await loadData();
  if (!product) return [];

  const productStyles = normalizeStyles(product.styleOccasion || product.primaryStyle);
  const productCollection = product.collection;
  const productGender = Array.isArray(product.gender) ? product.gender : [product.gender];
  const productCategory = product.category;

  const candidates = products.filter(p => {
    if (p.id === product.id) return false;
    if (p.status && p.status !== 'published') return false;
    return true;
  });

  const scored = candidates.map(p => {
    let score = 0;
    const styles = normalizeStyles(p.styleOccasion || p.primaryStyle);
    const collection = p.collection;
    const gender = Array.isArray(p.gender) ? p.gender : [p.gender];
    const category = p.category;

    // Style compatibility
    productStyles.forEach(ps => {
      styles.forEach(s => {
        if (ps === s) {
          score += styling.compatibilityRules?.baseWeights?.sameStyle || 1.0;
        }
        const pDef = styling.styleDefinitions?.[ps];
        const sDef = styling.styleDefinitions?.[s];
        if (pDef?.compatible?.includes(s)) score += styling.compatibilityRules?.baseWeights?.compatibleStyle || 0.8;
        if (sDef?.compatible?.includes(ps)) score += styling.compatibilityRules?.baseWeights?.compatibleStyle || 0.8;
      });
    });

    // Collection affinity
    if (productCollection && collection && productCollection === collection) {
      score += styling.compatibilityRules?.baseWeights?.sameCollection || 0.5;
    }

    // Gender match
    const hasGenderMatch = productGender.some(g => gender.includes(g));
    if (hasGenderMatch) {
      score += styling.compatibilityRules?.baseWeights?.genderMatch || 0.2;
    }

    // Category complementarity
    score += getCategoryComplementarity(productCategory, category);

    return { product: p, score };
  });

  return scored
    .filter(s => s.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.product);
}

export async function getStyleMatches(product, limit = 6) {
  const { styling, products } = await loadData();
  const productStyles = normalizeStyles(product?.styleOccasion);
  if (!productStyles.length) return [];

  const matches = products.filter(p => {
    if (p.id === product.id) return false;
    if (p.status && p.status !== 'published') return false;
    const s = normalizeStyles(p.styleOccasion);
    return s.some(st => productStyles.includes(st));
  });

  return matches.slice(0, limit);
}

export async function getCollectionMatches(product, limit = 6) {
  if (!product?.collection) return [];
  const { products } = await loadData();
  const matches = products.filter(p => {
    if (p.id === product.id) return false;
    if (p.status && p.status !== 'published') return false;
    return p.collection === product.collection;
  });
  return matches.slice(0, limit);
}

export async function buildCompleteLook(product, maxItems = 4) {
  const compatible = await getCompatibleProducts(product, 20);
  const productStyles = normalizeStyles(product.styleOccasion);
  const collection = product.collection;
  const look = [product];

  // Try to build full ensemble
  const needJacket = compatible.find(p => ['blazers', 'coats'].includes(p.category));
  const needShirt = compatible.find(p => ['shirts'].includes(p.category));
  const needBottom = compatible.find(p => ['trousers'].includes(p.category));

  if (needJacket && !look.find(x => x.category === needJacket.category)) {
    look.push(needJacket);
    if (look.length >= maxItems) return look;
  }
  if (needShirt && !look.find(x => x.category === needShirt.category)) {
    look.push(needShirt);
    if (look.length >= maxItems) return look;
  }
  if (needBottom && !look.find(x => x.category === needBottom.category)) {
    look.push(needBottom);
    if (look.length >= maxItems) return look;
  }

  // Add remaining compatible
  for (const c of compatible) {
    if (look.find(x => x.id === c.id)) continue;
    look.push(c);
    if (look.length >= maxItems) break;
  }

  return look;
}

export async function getRecommendedLooks(product, limit = 3) {
  const { styling } = await loadData();
  const looksEngine = await import('./looks-engine.js');
  return looksEngine.getLooksForProduct(product, limit);
}

export default {
  loadData,
  normalizeStyles,
  getCompatibleProducts,
  getStyleMatches,
  getCollectionMatches,
  buildCompleteLook,
  getRecommendedLooks
};
