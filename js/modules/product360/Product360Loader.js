/**
 * Product 360° Viewer - Lazy Loader
 * 
 * Handles dynamic loading of 360° product viewer module only when needed.
 * Zero bytes loaded on homepage/category pages.
 * Loads only when user clicks "View 360°" button.
 */

let _product360ModuleCache = null;
let _product360LoadPromise = null;

/**
 * Load Product 360° Viewer module (lazy-loaded)
 * Zero bytes on homepage/category pages - loads only on demand
 */
async function loadProduct360Module() {
  if (_product360ModuleCache) {
    return _product360ModuleCache;
  }

  if (_product360LoadPromise) {
    return _product360LoadPromise;
  }

  _product360LoadPromise = (async () => {
    const response = await fetch('/data/product360-config.json');
    if (!response.ok) {
      throw new Error('Failed to load 360° viewer config');
    }
    const config = await response.json();
    const [CoreModule, UIModule] = await Promise.all([
      import('./Product360Core.js'),
      import('./Product360UI.jsx')
    ]);
    return {
      config: _product360Config,
      Product360Core: CoreModule.Product360Core,
      Product360UI: UIModule.Product360UI
    };
  })();

  try {
    _product360ModuleCache = await _product360LoadPromise;
    return _product360ModuleCache;
  } catch (error) {
    _product360LoadPromise = null;
    throw error;
  }
}

/**
 * Check if 360° viewer is enabled globally
 */
export async function isProduct360Enabled() {
  try {
    const config = await fetch('/data/product360-config.json').then(r => r.json());
    return config.enabled === true;
  } catch {
    return false;
  }
}

/**
 * Check if a specific product has 360° view enabled
 * @param {Object} product - Product object from CMS
 * @returns {Promise<boolean>}
 */
export function isProduct360Eligible(product) {
  return fetch('/data/products.json')
    .then(r => r.json())
    .then(data => {
      const productData = data.products.find(p => p.id === product.id);
      return productData?.product360?.enabled === true && 
             productData.product360?.images?.length >= 24;
    })
    .catch(() => false);
}

/**
 * Get 360° product configuration from CMS
 */
export function getProduct360Config() {
  return fetch('/data/product360-config.json').then(r => r.json());
}

/**
 * Check if product has 360° view enabled (synchronous check)
 * @param {Object} product - Product object from CMS
 * @returns {boolean}
 */
export function isProduct360EligibleSync(product) {
  return product.product360?.enabled === true && 
         product.product360?.images?.length >= 24;
}

/**
 * Get 360° images for a product
 * @param {Object} product - Product object from CMS
 * @returns {Array} Array of image URLs
 */
export function getProduct360Images(product) {
  if (!product.product360?.images) return [];
  return product.product360.images;
}

/**
 * Get 360° placeholder image
 * @param {Object} product - Product object from CMS
 * @returns {string} Placeholder image URL
 */
export function getProduct360Placeholder(product) {
  return product.product360?.placeholder || '/images/360/placeholder.avif';
}

/**
 * Preload 360° viewer module (call on product page hover/focus)
 * @param {Object} product - Product object
 * @returns {Promise}
 */
export function preloadProduct360Module(product) {
  if (!isProduct360EligibleSync(product)) return Promise.resolve();
  
  // Dynamic import - only loads when needed
  return import('./Product360Core.js').then(module => {
    return module.Product360Core;
  });
}

/**
 * Open 360° viewer for a product
 * @param {Object} product - Product object from CMS
 * @returns {Promise}
 */
export async function openProduct360(product) {
  if (!isProduct360EligibleSync(product)) {
    return { success: false, error: 'Product not eligible for 360° view' };
  }

  const { Product360Core } = await import('./Product360Core.js');
  const viewer = new Product360Core(product);
  return viewer.open();
}

/**
 * Preload 360° viewer module (call on product page hover/focus)
 * @returns {Promise}
 */
/**
 * Register product page for 360° viewer
 * Call this from product page initialization
 */
export function registerProductPageFor360(product) {
  if (!isProduct360EligibleSync(product)) return;
  
  // Preload module on hover/focus of 360° button
  const btn = document.querySelector('[data-action="view-360"]');
  if (btn) {
    btn.addEventListener('mouseenter', () => import('./Product360Core.js'), { once: true });
    btn.addEventListener('focus', () => import('./Product360Core.js'), { once: true });
  }
  
  // Click handler
  if (btn) {
    btn.addEventListener('click', async () => {
      const productData = window.currentProductData;
      if (productData) {
        const { Product360Core } = await import('./Product360Core.js');
        const viewer = new Product360Core(window.currentProductData);
        await viewer.open();
      }
    });
  }
  
  console.log('[Product360] Product page registered for 360° viewer');
}

export default {
  loadProduct360Module,
  isProduct360Eligible,
  isProduct360EligibleSync,
  getProduct360Config,
  getProduct360Images,
  getProduct360Placeholder,
  preloadProduct360Module,
  openProduct360,
  registerProductPageFor360
};
