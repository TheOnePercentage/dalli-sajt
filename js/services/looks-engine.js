/**
 * Looks Engine Service
 * CMS-driven curated looks from data/looks.json
 */

const LOOKS_DATA_URL = '/data/looks.json';
const PRODUCTS_DATA_URL = '/data/products.json';

let _looksData = null;
let _products = [];
let _loadPromise = null;

async function loadData() {
  if (_looksData && _products.length) return { looks: _looksData, products: _products };

  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const [looksRes, productsRes] = await Promise.all([
        fetch(LOOKS_DATA_URL),
        fetch(PRODUCTS_DATA_URL)
      ]);

      if (looksRes.ok) {
        _looksData = await looksRes.json();
      } else {
        _looksData = { looks: [] };
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        _products = productsData.products || productsData || [];
      }
    } catch (err) {
      console.warn('[LooksEngine] Load failed:', err);
      _looksData = _looksData || { looks: [] };
    } finally {
      _loadPromise = null;
    }

    return { looks: _looksData, products: _products };
  })();

  return _loadPromise;
}

function getProductsByIds(ids) {
  if (!Array.isArray(ids)) return [];
  return _products.filter(p => ids.includes(p.id) && (!p.status || p.status === 'published'));
}

export async function getAllLooks(limit = null) {
  const { looks } = await loadData();
  const list = (looks.looks || []).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return limit ? list.slice(0, limit) : list;
}

export async function getLooksForProduct(product, limit = 3) {
  if (!product) return [];
  const { looks } = await loadData();
  const productStyles = Array.isArray(product.styleOccasion) ? product.styleOccasion : (product.styleOccasion ? [product.styleOccasion] : []);
  const collection = product.collection;

  return (looks.looks || [])
    .filter(l => {
      if (collection && l.collection && l.collection === collection) return true;
      if (l.style && productStyles.includes(l.style)) return true;
      return false;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, limit);
}

export async function getLookById(id) {
  const { looks } = await loadData();
  const look = (looks.looks || []).find(l => l.id === id);
  if (!look) return null;
  return {
    ...look,
    products: getProductsByIds(look.products || [])
  };
}

export async function getLookOfTheWeek() {
  const looks = await getAllLooks(1);
  return looks[0] || null;
}

export default {
  loadData,
  getAllLooks,
  getLooksForProduct,
  getLookById,
  getLookOfTheWeek
};
