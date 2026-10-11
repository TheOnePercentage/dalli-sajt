/**
 * Virtual Try-On Lazy Loader
 * 
 * Handles dynamic loading of Virtual Try-On modules only when needed.
 * Zero bytes loaded on homepage/category pages.
 * Loads only when user clicks "See It On You" button.
 */

let _vtoModuleCache = null;
let _vtoLoadPromise = null;

/**
 * Check if Virtual Try-On is supported in current browser
 */
export function isVirtualTryOnSupported() {
  return (
    'createObjectURL' in URL &&
    'FileReader' in window &&
    'Blob' in window &&
    'OffscreenCanvas' in window && // For future canvas processing
    navigator.mediaDevices?.getUserMedia // For camera access
  );
}

/**
 * Get Virtual Try-On configuration from CMS
 */
export function getVirtualTryOnConfig() {
  try {
    const cmsConfig = window.CMS?.getConfig?.()?.virtualTryOn;
    return cmsConfig || { enabled: false };
  } catch {
    return { enabled: false };
  }
}

/**
 * Check if a product is eligible for Virtual Try-On
 * @param {Object} product - Product object from CMS
 * @returns {boolean}
 */
export function isProductEligible(product) {
  if (!product?.virtualTryOn?.eligible) return false;
  if (product.virtualTryOn.status === 'disabled') return false;
  
  const globalConfig = getVirtualTryOnConfig();
  if (!globalConfig.enabled) return false;
  
  // Check if category is supported
  const supportedCategories = globalConfig.supportedCategories || [];
  if (supportedCategories.length && !supportedCategories.includes(product.category)) {
    return false;
  }
  
  // Check if category is explicitly unsupported
  const unsupportedCategories = globalConfig.unsupportedCategories || [];
  if (unsupportedCategories.includes(product.category)) {
    return false;
  }
  
  return product.virtualTryOn?.eligible === true;
}

/**
 * Load Virtual Try-On module (with caching)
 * @returns {Promise<VirtualTryOnModule>}
 */
export async function loadVirtualTryOnModule() {
  // Return cached module if already loaded
  if (_vtoModuleCache) {
    return _vtoModuleCache;
  }
  
  // Return existing load promise if already loading
  if (_vtoLoadPromise) {
    return _vtoLoadPromise;
  }
  
  // Start loading
  _vtoLoadPromise = _loadModule();
  
  try {
    _vtoModuleCache = await _vtoLoadPromise;
    return _vtoModuleCache;
  } catch (error) {
    _vtoLoadPromise = null; // Allow retry
    throw error;
  }
}

/**
 * Internal module loading logic
 */
async function _loadModule() {
  // Dynamic imports - only loads when this function is called
  const [VTModule, VTUIModule, VTAIModule, VTUploadModule] = await Promise.all([
    import('./VirtualTryOn.js'),
    import('./VirtualTryOnUI.js'),
    import('./VirtualTryOnAI.js'),
    import('./VirtualTryOnUpload.jsx')
  ]);
  
  return {
    VirtualTryOn: VTModule.VirtualTryOn,
    createVirtualTryOn: VTModule.createVirtualTryOn,
    VirtualTryOnUI: VTUIModule.VirtualTryOnUI,
    VirtualTryOnAI: VTAIModule.VirtualTryOnAI,
    VirtualTryOnUpload: VTUploadModule.VirtualTryOnUpload
  };
}

/**
 * Preload Virtual Try-On module (call on product page hover/focus)
 * Use this on product page to warm up the cache
 */
export function preloadVirtualTryOnModule() {
  if (!_vtoLoadPromise && !_vtoModuleCache) {
    _vtoLoadPromise = _loadModule();
    // Don't await - fire and forget for preloading
  }
  return _vtoLoadPromise;
}

/**
 * Create Virtual Try-On instance for a product
 * Main entry point for the application
 * 
 * @param {Object} product - Full product object from CMS
 * @returns {Promise<VirtualTryOnInstance>}
 */
export async function createVirtualTryOn(product) {
  // 1. Check eligibility
  if (!isProductEligible(product)) {
    throw new Error('Product not eligible for Virtual Try-On');
  }
  
  // 2. Check browser support
  if (!isVirtualTryOnSupported()) {
    throw new Error('Virtual Try-On not supported in this browser');
  }
  
  // 3. Load module
  const { createVirtualTryOn } = await loadVirtualTryOnModule();
  
  // 4. Create and initialize instance
  const vto = await createVirtualTryOn(product.id, product);
  
  return vto;
}

/**
 * Open Virtual Try-On for a product (convenience function)
 * Handles full flow: check eligibility -> load -> init -> open
 * 
 * @param {Object} product - Product object from CMS
 * @returns {Promise<void>} Resolves when modal closes
 */
export async function openVirtualTryOn(product) {
  const vto = await createVirtualTryOn(product);
  await vto.open();
  vto.destroy();
}

/**
 * Preload on product page - call when user hovers "See It On You" button
 * or when product page loads (after main content)
 */
export function setupVirtualTryOnPreload(product) {
  if (!isProductEligible(product)) return;
  
  // Add preload hint to document head
  if (!document.querySelector('link[rel="preload"][href*="VirtualTryOn"]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = '/js/modules/VirtualTryOn.js'; // Will be hashed by Vite
    document.head.appendChild(link);
  }
  
  // Preload on button hover/focus
  const buttons = document.querySelectorAll('[data-action="virtual-tryon"]');
  buttons.forEach(btn => {
    const preloadOnce = () => {
      preloadVirtualTryOnModule();
      btn.removeEventListener('mouseenter', preloadOnce);
      btn.removeEventListener('focus', preloadOnce);
    };
    btn.addEventListener('mouseenter', preloadOnce, { once: true });
    btn.addEventListener('focus', preloadOnce, { once: true });
  });
}

/**
 * Clear module cache (for testing or re-init)
 */
export function clearVirtualTryOnCache() {
  _vtoModuleCache = null;
  _vtoLoadPromise = null;
}

/**
 * Get module load status
 */
export function getVirtualTryOnLoadStatus() {
  if (_vtoModuleCache) return 'loaded';
  if (_vtoLoadPromise) return 'loading';
  return 'idle';
}

/**
 * Register product page for Virtual Try-On
 * Call this from product page initialization
 */
export function registerProductPageForVTO(product) {
  if (!isProductEligible(product)) return;
  
  // Preload module
  preloadVirtualTryOnModule();
  
  // Setup button listeners
  setupVirtualTryOnPreload(product);
  
  // Add click handler to buttons
  document.querySelectorAll('[data-action="virtual-tryon"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await openVirtualTryOn(product);
      } catch (error) {
        console.error('Virtual Try-On error:', error);
        window.showToast?.(`Virtual Try-On nije dostupan: ${error.message}`, 'error');
      }
    });
  });
  
  console.log('[VTO] Product page registered for Virtual Try-On:', product.slug);
}

export default {
  loadVirtualTryOnModule,
  createVirtualTryOn,
  openVirtualTryOn,
  preloadVirtualTryOnModule,
  isProductEligible,
  isVirtualTryOnSupported,
  registerProductPageForVTO,
  setupVirtualTryOnPreload,
  clearVirtualTryOnCache,
  getVirtualTryOnLoadStatus
};