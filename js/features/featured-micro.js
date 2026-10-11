import { $, $$, on } from '../core/dom.js';
import { formatPrice } from '../state/locale.js';
import { emit, DOM_EVENTS } from '../core/events.js';

let sectionEl = null;
let cards = [];
let reducedMotion = false;
let parallaxEnabled = false;
let scrollHandler = null;
let resizeHandler = null;
let pricesAnimated = new Set();
let hoverTimers = new Map();

const initPriceCounters = () => {
  if (reducedMotion) return;

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const priceEl = entry.target;
        const price = parseInt(priceEl.dataset.price, 10);
        const id = priceEl.id || `price-${Math.random()}`;

        if (!pricesAnimated.has(id)) {
          pricesAnimated.add(id);
          animatePriceCounter(priceEl, price);
        }
        counterObserver.unobserve(priceEl);
      }
    });
  }, { threshold: 0.5, rootMargin: '0px 0px -50px 0px' });

  $$('.product-card__price[data-price]', sectionEl).forEach(el => counterObserver.observe(el));
};

const animatePriceCounter = (el, target) => {
  const start = 0;
  const duration = 800;
  const startTime = performance.now();
  const easing = (t) => 1 - Math.pow(1 - t, 3);

  el.classList.add('product-card__price--animating');

  const tick = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = easing(progress);
    const current = Math.floor(start + (target - start) * eased);
    el.textContent = formatPrice(current);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = formatPrice(target);
      el.classList.remove('product-card__price--animating');
    }
  };

  requestAnimationFrame(tick);
};

const initParallax = () => {
  if (!parallaxEnabled) return;

  let ticking = false;
  const PARALLAX_SPEED = 0.15;

  const updateParallax = () => {
    const sectionRect = sectionEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (sectionRect.bottom < 0 || sectionRect.top > viewportHeight) {
      ticking = false;
      return;
    }

    const scrollProgress = Math.max(0, Math.min(1,
      (viewportHeight - sectionRect.top) / (sectionRect.height + viewportHeight)
    ));

    cards.forEach((card, index) => {
      const media = $('.product-card__image', card);
      const overlay = $('.product-card__parallax-overlay', card);
      const badges = $$('.product-card__badges .badge', card);

      if (!media) return;

      const staggerOffset = index * 0.03;
      const cardProgress = Math.max(0, Math.min(1, scrollProgress + staggerOffset));
      const translateY = cardProgress * PARALLAX_SPEED * 60;
      const overlayOpacity = Math.min(0.4, cardProgress * 0.6);
      const badgeFloat = cardProgress * -8;

      media.style.transform = `translate3d(0, ${translateY}px, 0) scale(1)`;

      if (overlay) {
        overlay.style.opacity = overlayOpacity;
        overlay.classList.add('product-card__parallax-overlay--active');
      }

      badges.forEach(badge => {
        badge.style.transform = `translateY(${badgeFloat}px)`;
      });

    });
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  };

  scrollHandler = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
};

const disableParallax = () => {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  cards.forEach(card => {
    const media = $('.product-card__image', card);
    const overlay = $('.product-card__parallax-overlay', card);
    const badges = $$('.product-card__badges .badge', card);
    if (media) media.style.transform = '';
    if (overlay) { overlay.style.opacity = ''; overlay.classList.remove('product-card__parallax-overlay--active'); }
    badges.forEach(badge => badge.style.transform = '');
  });
  parallaxEnabled = false;
};

const enableParallax = () => {
  if (window.innerWidth >= 768) {
    initParallax();
    parallaxEnabled = true;
  }
};

const initHoverEffects = () => {
  cards.forEach((card, index) => {
    let hoverStart = 0;
    let hoverTimer = null;

    card.addEventListener('mouseenter', () => {
      hoverStart = performance.now();
      hoverTimer = setTimeout(() => {
        trackEvent('product_card_hover_dwell', {
          product_id: card.dataset.productId,
          position: index + 1,
          dwell: Math.round(performance.now() - hoverStart)
        });
      }, 300);
    });

    card.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
    });

    const quickAdd = $('.product-card__quick-add', card);
    if (quickAdd) {
      quickAdd.addEventListener('click', (e) => {
        e.stopPropagation();
        trackEvent('product_quick_add', {
          product_id: card.dataset.productId,
          position: index + 1,
          variant_id: quickAdd.dataset.variantId
        });
      });
    }

    const wishlist = $('.product-card__wishlist', card);
    if (wishlist) {
      wishlist.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = wishlist.classList.contains('active');
        trackEvent(isActive ? 'wishlist_add' : 'wishlist_remove', {
          product_id: card.dataset.productId,
          position: index + 1
        });
      });
    }

    card.addEventListener('focusin', () => {
      trackEvent('product_card_focus', {
        product_id: card.dataset.productId,
        position: index + 1
      });
    });
  });
};

const initInteractionTracking = () => {
  cards.forEach((card, index) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, a')) return;

      trackEvent('product_card_click', {
        product_id: card.dataset.productId,
        position: index + 1,
        ab_variant: card.dataset.abVariant || 'control'
      });
    });
  });
};

const trackEvent = (eventName, data) => {
  const payload = {
    event: eventName,
    section: 'featured_products',
    tab: window.DALLI_FeaturedTabs?.getActiveTab?.() || 'favorites',
    timestamp: Date.now(),
    device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    ...data
  };

  if (window.dataLayer) window.dataLayer.push(payload);
  if (window.gtag) window.gtag('event', eventName, payload);
  console.log('[FeaturedMicro] Track:', payload);
};

const handleResize = () => {
  const wasParallax = parallaxEnabled;
  parallaxEnabled = !reducedMotion && window.innerWidth >= 768;

  if (wasParallax && !parallaxEnabled) disableParallax();
  else if (!wasParallax && parallaxEnabled) enableParallax();
};

const debounce = (fn, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const cleanup = () => {
  disableParallax();
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
};

const init = () => {
  sectionEl = $('#featured');
  if (!sectionEl) return;

  cards = $$('.product-card', sectionEl);
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  parallaxEnabled = !reducedMotion && window.innerWidth >= 768;

  if (cards.length === 0) return;

  initPriceCounters();

  if (parallaxEnabled) {
    initParallax();
  }

  initHoverEffects();
  initInteractionTracking();

  resizeHandler = debounce(handleResize, 150);
  window.addEventListener('resize', resizeHandler, { passive: true });

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', (e) => {
    reducedMotion = e.matches;
    handleResize();
  });
};

if (typeof window !== 'undefined') {
  window.DALLI_FeaturedMicro = { init, cleanup };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init, cleanup };