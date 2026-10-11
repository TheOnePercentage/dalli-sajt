/**
 * DALLI Product Page Integration
 * Wires up Virtual Try-On, 360° Viewer, Size Guide, and other product page features
 * Call init() from product page on DOMContentLoaded
 */

import { registerProductPageForVTO, isProductEligible, preloadVirtualTryOnModule } from './modules/VirtualTryOnLoader.js';
import { registerProductPageFor360, isProduct360EligibleSync, preloadProduct360Module } from './modules/product360/Product360Loader.js';
import { trackEvent } from '../features/analytics.js';
import { faqSchemaInjector } from '../components/FAQSchemaInjector.js';
import { renderCompleteTheLook, renderStyleMatches } from '../components/CompleteTheLook.js';
import { OutfitAnalytics } from '../features/outfit-analytics.js';
import { initPersonalization, trackStyleView, trackLookView, trackCollectionView } from '../services/personalization-v2.js';

let currentProduct = null;
let isInitialized = false;

const VTO_ELIGIBLE_CATEGORIES = ['t-shirts', 'hoodies', 'tracksuits', 'shirts', 'blazers', 'suits', 'dresses', 'coats', 'trousers'];
const P360_ELIGIBLE_CATEGORIES = ['t-shirts', 'hoodies', 'tracksuits', 'shirts', 'blazers', 'suits', 'trousers', 'coats', 'dresses'];

const extractProductFromPage = () => {
  // Try to get product data from schema.org
  const schemaScript = document.querySelector('script[type="application/ld+json"][id="schema-product"]');
  if (schemaScript) {
    try {
      const data = JSON.parse(schemaScript.textContent);
      const productNode = Array.isArray(data['@graph']) 
        ? data['@graph'].find(n => n['@type'] === 'Product')
        : data;
      if (productNode) return productNode;
    } catch (e) {
      console.warn('[ProductPage] Failed to parse schema:', e);
    }
  }

  // Fallback to meta tags
  const metaProduct = {
    id: document.querySelector('meta[property="product:retailer_item_id"]')?.content,
    name: document.querySelector('meta[property="og:title"]')?.content,
    price: parseFloat(document.querySelector('meta[property="product:price:amount"]')?.content || '0'),
    currency: document.querySelector('meta[property="product:price:currency"]')?.content || 'RSD',
    image: document.querySelector('meta[property="og:image"]')?.content,
    category: document.querySelector('meta[property="product:category"]')?.content?.toLowerCase(),
    sku: document.querySelector('meta[property="product:retailer_item_id"]')?.content,
    availability: document.querySelector('meta[property="product:availability"]')?.content,
    brand: 'DALLI'
  };

  if (metaProduct.id) return metaProduct;
  return null;
};

const isVTOEligible = (product) => {
  if (!product) return false;
  if (product.virtualTryOn?.eligible === false) return false;
  if (product.virtualTryOn?.status === 'disabled') return false;
  
  const category = product.category?.toLowerCase();
  return VTO_ELIGIBLE_CATEGORIES.includes(category);
};

const is360Eligible = (product) => {
  if (!product) return false;
  return product.product360?.enabled === true && 
         product.product360?.images?.length >= 24;
};

const initVTO = async (product) => {
  if (!isVTOEligible(product)) {
    document.querySelectorAll('[data-action="virtual-tryon"]').forEach(btn => {
      btn.style.display = 'none';
      btn.setAttribute('aria-hidden', 'true');
    });
    return;
  }

  const { registerProductPageForVTO, preloadVirtualTryOnModule } = await import('../../modules/VirtualTryOnLoader.js');
  
  registerProductPageForVTO(product);
  
  document.querySelectorAll('[data-action="virtual-tryon"]').forEach(btn => {
    btn.style.display = 'inline-flex';
    btn.removeAttribute('aria-hidden');
  });

  trackEvent('vto_button_visible', { product_id: product.id, category: product.category });
};

const init360 = async (product) => {
  if (!is360Eligible(product)) {
    document.querySelectorAll('[data-action="view-360"]').forEach(btn => {
      btn.style.display = 'none';
      btn.setAttribute('aria-hidden', 'true');
    });
    return;
  }

  const { registerProductPageFor360, preloadProduct360Module } = await import('../../modules/product360/Product360Loader.js');
  
  registerProductPageFor360(product);
  
  document.querySelectorAll('[data-action="view-360"]').forEach(btn => {
    btn.style.display = 'inline-flex';
    btn.removeAttribute('aria-hidden');
  });

  trackEvent('p360_button_visible', { product_id: product.id, image_count: product.product360?.images?.length });
};

const initSizeGuide = () => {
  const sizeGuideTrigger = document.querySelector('[data-action="size-guide"]');
  if (!sizeGuideTrigger) return;

  sizeGuideTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    const modal = document.getElementById('sizeGuideModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-modal', 'true');
      const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus();
      document.body.style.overflow = 'hidden';
      trackEvent('size_guide_open', { product_id: currentProduct?.id });
    } else {
      window.location.href = '/size-guide';
    }
  });

  const closeBtn = document.querySelector('#sizeGuideModal [data-action="close-size-guide"]');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('sizeGuideModal');
      if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    });
  }

  const backdrop = document.querySelector('#sizeGuideModal .drawer__backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      const modal = document.getElementById('sizeGuideModal');
      if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    });
  }
};

const initVariantSelection = () => {
  const colorOptions = document.querySelectorAll('.color-option input[type="radio"]');
  const sizeOptions = document.querySelectorAll('.size-option input[type="radio"]');

  const updateSelectedVariant = () => {
    const selectedColor = document.querySelector('input[name="color"]:checked')?.value;
    const selectedSize = document.querySelector('input[name="size"]:checked')?.value;
    
    if (selectedColor && selectedSize && currentProduct) {
      const variantId = `${currentProduct.id}-${selectedColor}-${selectedSize}`;
      const variant = currentProduct.variants?.find(v => 
        v.color === selectedColor && v.size === selectedSize
      );
      
      if (variant) {
        currentProduct = { ...currentProduct, selectedVariant: variant, selectedColor, selectedSize };
        updatePriceDisplay(variant);
        updateAddToCartButton(variant);
        trackEvent('variant_select', { 
          product_id: currentProduct.id, 
          color: selectedColor, 
          size: selectedSize,
          variant_id: variantId
        });
      }
    }
  };

  colorOptions.forEach(input => input.addEventListener('change', updateSelectedVariant));
  sizeOptions.forEach(input => input.addEventListener('change', updateSelectedVariant));
};

const updatePriceDisplay = (variant) => {
  const priceEl = document.querySelector('.product-price__current');
  const oldPriceEl = document.querySelector('.product-price__old');
  const installmentEl = document.querySelector('.product-price__installment');
  
  if (priceEl && variant.price) {
    priceEl.textContent = new Intl.NumberFormat('sr-RS', { 
      style: 'currency', 
      currency: 'RSD',
      minimumFractionDigits: 0 
    }).format(variant.price);
  }
  if (oldPriceEl && variant.originalPrice && variant.originalPrice > variant.price) {
    oldPriceEl.textContent = new Intl.NumberFormat('sr-RS', { 
      style: 'currency', 
      currency: 'RSD',
      minimumFractionDigits: 0 
    }).format(variant.originalPrice);
    oldPriceEl.style.display = 'inline';
  } else if (oldPriceEl) {
    oldPriceEl.style.display = 'none';
  }
  if (installmentEl && variant.price) {
    const installment = Math.ceil(variant.price / 3);
    installmentEl.textContent = `ili ${installment.toLocaleString('sr-RS')} RSD x 3 rate bez kamate`;
  }
};

const updateAddToCartButton = (variant) => {
  const btn = document.querySelector('[data-action="add-to-cart"]');
  if (btn) {
    btn.dataset.variantId = `${currentProduct.id}-${variant.color}-${variant.size}`;
    btn.disabled = !variant.available;
    btn.textContent = variant.available ? 'Dodaj u korpu' : 'Nema na stanju';
  }
};

const initAddToCart = () => {
  const btn = document.querySelector('[data-action="add-to-cart"]');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!currentProduct?.selectedVariant) return;
    
    const variant = currentProduct.selectedVariant;
    const variantId = `${currentProduct.id}-${variant.color}-${variant.size}`;
    
    import('../state/cart.js').then(({ addToCart }) => {
      addToCart(currentProduct, variant, 1);
      trackEvent('add_to_cart', {
        product_id: currentProduct.id,
        variant_id: variantId,
        price: variant.price,
        quantity: 1
      });
    });
  });
};

const initWishlist = () => {
  const btn = document.querySelector('[data-action="wishlist"]');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const isActive = btn.classList.toggle('active');
    trackEvent(isActive ? 'wishlist_add' : 'wishlist_remove', {
      product_id: currentProduct?.id
    });
    window.showToast?.(isActive ? 'Dodato na listu želja' : 'Uklonjeno sa liste želja', 'info');
  });
};

const initGallery = () => {
  const thumbnails = document.querySelectorAll('.product-gallery__thumb');
  const mainImage = document.querySelector('.product-gallery__main img');
  
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', () => {
      if (mainImage) {
        mainImage.src = thumb.dataset.full || thumb.src;
        mainImage.alt = thumb.alt;
      }
      thumbnails.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      trackEvent('product_image_change', { 
        product_id: currentProduct?.id, 
        index: index + 1 
      });
    });
  });
};

const initTabs = () => {
  const tabBtns = document.querySelectorAll('.product-tabs__btn');
  const tabPanels = document.querySelectorAll('.product-tabs__panel');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      tabBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
        b.setAttribute('aria-selected', b.dataset.tab === tabId);
      });
      tabPanels.forEach(p => {
        p.hidden = p.id !== `panel-${tabId}`;
      });
      
      trackEvent('product_tab_switch', { 
        product_id: currentProduct?.id, 
        tab: tabId 
      });
    });
  });
};

const initQA = () => {
  const askBtn = document.getElementById('askQuestionBtn');
  const qaForm = document.getElementById('qaForm');
  const cancelBtn = qaForm?.querySelector('[data-action="cancel-question"]');
  const qaFormEl = qaForm?.querySelector('.qa-form');

  if (askBtn) {
    askBtn.addEventListener('click', () => {
      document.getElementById('qaForm').classList.remove('hidden');
      document.getElementById('askQuestionBtn').classList.add('hidden');
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.getElementById('qaForm').classList.add('hidden');
      document.getElementById('askQuestionBtn').classList.remove('hidden');
      document.querySelector('.qa-form')?.reset();
    });
  }

  if (qaFormEl) {
    qaFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(qaFormEl);
      const question = formData.get('question');
      const authorName = formData.get('authorName');
      const authorEmail = formData.get('authorEmail');

      if (!question || !authorName || !authorEmail) return;

      const submitBtn = qaFormEl.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Slanje...';

      try {
        // In a real app, this would send to an API
        // For now, we'll simulate success and add to the Q&A list
        trackEvent('question_submit', {
          product_id: currentProduct?.id,
          question: question.substring(0, 50)
        });

        // Add to Q&A list (optimistic UI update)
        const qaList = document.getElementById('qaList');
        if (qaList) {
          const newQA = document.createElement('article');
          newQA.className = 'qa-item';
          newQA.itemscope = true;
          newQA.itemtype = 'https://schema.org/Question';
          newQA.innerHTML = `
            <h3 class="qa-question" itemprop="name" style="font-size: var(--text-lg); font-weight: var(--fw-semibold); color: var(--color-text); margin-bottom: var(--space-3);">${question}</h3>
            <div class="qa-meta" style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); font-size: var(--fs-sm); color: var(--color-text-tertiary);">
              <span itemprop="author" style="font-weight: var(--fw-medium);">${document.querySelector('.qa-form [name="authorName"]').value}</span>
              <time itemprop="dateCreated" datetime="${new Date().toISOString()}" style="color: var(--color-text-tertiary);">${new Date().toLocaleDateString('sr-RS')}</time>
            </div>
            <div class="qa-no-answer" style="padding: var(--space-4); background: var(--color-bg); border-radius: var(--radius-card); border: 1px dashed var(--color-border); text-align: center; color: var(--color-text-tertiary);">
              <p>Još nema odgovora. Budite prvi koji će pomoći!</p>
            </div>
          `;
          qaList.prepend(newQA);
        }

        document.querySelector('.qa-form').reset();
        document.getElementById('qaForm').classList.add('hidden');
        document.getElementById('askQuestionBtn').classList.remove('hidden');
        window.showToast?.('Pitanje je poslato za odobrenje', 'success');
        trackEvent('question_submitted', { product_id: currentProduct?.id });
      } catch (err) {
        window.showToast?.('Greška prilikom slanja pitanja', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Pošaljite pitanje';
      }
    });
  }
};

const initRecentlyViewed = () => {
  const carousel = document.getElementById('recentlyViewedCarousel');
  if (!carousel) return;

  const track = document.getElementById('recentlyViewedTrack');
  const prevBtn = carousel.querySelector('.recently-viewed__btn--prev');
  const nextBtn = carousel.querySelector('.recently-viewed__btn--next');
  const dotsContainer = document.getElementById('recentlyViewedDots');

  if (!track) return;

  const cards = track.querySelectorAll('.recently-viewed__card');
  const cardWidth = 240 + 16; // card width + gap
  let currentIndex = 0;
  const maxIndex = Math.max(0, cards.length - Math.floor(carousel.offsetWidth / cardWidth));

  // Generate dots
  if (dotsContainer && cards.length > 1) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i <= maxIndex; i++) {
      const dot = document.createElement('button');
      dot.className = 'recently-viewed__dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Stranica ${i + 1}`);
      dot.dataset.dot = i;
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  const updateButtons = () => {
    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
    document.querySelectorAll('.recently-viewed__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  };

  const goToSlide = (index) => {
    if (index < 0 || index > maxIndex) return;
    currentIndex = index;
    track.style.transform = `translateX(${-currentIndex * cardWidth}px)`;
    updateButtons();
  };

  const nextSlide = () => goToSlide(currentIndex + 1);
  const prevSlide = () => goToSlide(currentIndex - 1);

  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  // Touch/swipe support
  let startX = 0;
  let currentTranslate = 0;

  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    currentTranslate = -currentIndex * cardWidth;
    track.style.transition = 'none';
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    const deltaX = e.touches[0].clientX - startX;
    track.style.transform = `translateX(${currentTranslate + deltaX}px)`;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    track.style.transition = 'transform var(--duration-normal) var(--ease-out)';
    const deltaX = e.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) prevSlide();
      else nextSlide();
    } else {
      goToSlide(currentIndex);
    }
  }, { passive: true });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (document.activeElement.closest('#recentlyViewedCarousel')) {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    }
  });

  // Auto-generate dots on resize
  window.addEventListener('resize', () => {
    initRecentlyViewed();
  }, { once: true });

  updateButtons();
};

const init = async () => {

  currentProduct = extractProductFromPage();
  if (!currentProduct) {
    console.warn('[ProductPage] Could not extract product data from page');
    return;
  }

  window.currentProductData = currentProduct;

  trackEvent('product_view', {
    product_id: currentProduct.id,
    product_name: currentProduct.name,
    price: currentProduct.price,
    category: currentProduct.category,
    collection: currentProduct.collection
  });

  await Promise.all([
    initVTO(currentProduct),
    init360(currentProduct)
  ]);

  initSizeGuide();
  initVariantSelection();
  initAddToCart();
  initWishlist();
  initGallery();
  initTabs();
  initQA();
  initRecentlyViewed();

  // Initialize Complete The Look & Style Matches (DALLI Styling Engine)
  try {
    await renderCompleteTheLook(currentProduct, 'complete-the-look');
    await renderStyleMatches(currentProduct, 'style-matches');

    // Track Complete The Look view
    if (currentProduct.styleOccasion && currentProduct.styleOccasion.length > 0) {
      const primaryStyle = Array.isArray(currentProduct.styleOccasion) ? currentProduct.styleOccasion[0] : currentProduct.styleOccasion;
      OutfitAnalytics.trackCompleteLookView(currentProduct.id, currentProduct.name, 4, primaryStyle);
    }
    OutfitAnalytics.trackStyleView(currentProduct.styleOccasion?.[0] || 'unknown');
    OutfitAnalytics.trackCollectionView(currentProduct.collection || 'unknown');

    // Initialize personalization
    initPersonalization().then(() => {
      if (currentProduct.styleOccasion && currentProduct.styleOccasion.length > 0) {
        trackStyleView(currentProduct.styleOccasion[0]);
      }
      trackCollectionView(currentProduct.collection || 'unknown');
    });
  } catch (e) {
    console.warn('[ProductPage] Styling engine init failed:', e);
  }
  
  // FAQ integration
  try {
    const slug = currentProduct?.sku || currentProduct?.id;
    if (slug) {
      const metaType = document.querySelector('meta[name="page-type"]');
      const metaSlug = document.querySelector('meta[name="page-slug"]');
      if (!metaType) {
        const mt = document.createElement('meta');
        mt.name = 'page-type';
        mt.content = 'product';
        document.head.appendChild(mt);
      }
      if (!metaSlug && slug) {
        const ms = document.createElement('meta');
        ms.name = 'page-slug';
        ms.content = slug;
        document.head.appendChild(ms);
      }
      faqSchemaInjector.init();
    }
  } catch (e) {
    console.warn('[ProductPage] FAQ init failed:', e);
  }

  isInitialized = true;
  console.log('[ProductPage] Initialized', { 
    product: currentProduct.id, 
    vto: isVTOEligible(currentProduct),
    p360: is360Eligible(currentProduct)
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, currentProduct };

if (typeof window !== 'undefined') {
  window.DALLI_ProductPage = { init, getCurrentProduct: () => currentProduct };
}