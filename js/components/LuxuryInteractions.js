/**
 * Luxury Interactions Component
 * Micro-interaction system for premium hover effects, transitions, and motion cues
 * Performance-safe, no heavy libraries, respects reduced motion
 */

import { shouldRespectReducedMotion, getDefaultAnimationConfig, getLuxuryPresentationRules } from '../services/immersive-engine.js';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

let _reducedMotion = false;
let _mediaQueryListener = null;
let _initialized = false;

function initReducedMotionListener() {
  if (typeof window === 'undefined' || _initialized) return;

  _initialized = true;
  _reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

  _mediaQueryListener = (e) => {
    _reducedMotion = e.matches;
    document.documentElement.classList.toggle('reduced-motion', _reducedMotion);
  };

  window.matchMedia(REDUCED_MOTION_QUERY).addEventListener('change', _mediaQueryListener);
  document.documentElement.classList.toggle('reduced-motion', _reducedMotion);
}

export function isReducedMotion() {
  return _reducedMotion || shouldRespectReducedMotion();
}

export function getAnimationConfig(custom = {}) {
  const defaults = getDefaultAnimationConfig();
  return { ...defaults, ...custom };
}

function createTransitionString(properties, config) {
  const { duration, easing } = config;
  return properties.map(p => `${p} ${duration}ms ${easing}`).join(', ');
}

export function applyLuxuryHover(element, options = {}) {
  if (isReducedMotion()) return () => {};

  const config = getAnimationConfig(options.config);
  const {
    scale = 1.02,
    translateY = -4,
    shadow = '0 20px 40px rgba(0,0,0,0.1)',
    borderColor = 'var(--color-primary)',
    glow = false
  } = options;

  const originalStyles = {
    transform: element.style.transform,
    boxShadow: element.style.boxShadow,
    borderColor: element.style.borderColor,
    transition: element.style.transition
  };

  const enterStyles = {
    transform: `translateY(${translateY}px) scale(${scale})`,
    boxShadow: shadow,
    borderColor: borderColor,
    transition: createTransitionString(['transform', 'box-shadow', 'border-color'], config)
  };

  if (glow) {
    enterStyles.filter = 'brightness(1.05)';
    enterStyles.transition += ', filter ' + config.duration + 'ms ' + config.easing;
  }

  function onEnter() {
    Object.assign(element.style, enterStyles);
  }

  function onLeave() {
    Object.assign(element.style, originalStyles);
  }

  element.addEventListener('mouseenter', onEnter);
  element.addEventListener('mouseleave', onLeave);
  element.addEventListener('focus', onEnter);
  element.addEventListener('blur', onLeave);

  // Touch support
  let touchTimer;
  element.addEventListener('touchstart', () => {
    touchTimer = setTimeout(onEnter, 50);
  }, { passive: true });

  element.addEventListener('touchend', () => {
    clearTimeout(touchTimer);
    setTimeout(onLeave, 300);
  }, { passive: true });

  return () => {
    element.removeEventListener('mouseenter', onEnter);
    element.removeEventListener('mouseleave', onLeave);
    element.removeEventListener('focus', onEnter);
    element.removeEventListener('blur', onLeave);
  };
}

export function applyRevealAnimation(elements, options = {}) {
  if (isReducedMotion()) {
    elements.forEach(el => el.style.opacity = '1');
    return;
  }

  const config = getAnimationConfig(options.config);
  const {
    stagger = 100,
    startDelay = 0,
    animation = 'fade-up',
    threshold = 0.1
  } = options;

  const animations = {
    'fade-up': {
      initial: { opacity: 0, transform: 'translateY(30px)' },
      final: { opacity: 1, transform: 'translateY(0)' }
    },
    'fade-in': {
      initial: { opacity: 0 },
      final: { opacity: 1 }
    },
    'scale-in': {
      initial: { opacity: 0, transform: 'scale(0.95)' },
      final: { opacity: 1, transform: 'scale(1)' }
    },
    'line-by-line': {
      initial: { opacity: 0, transform: 'translateY(1em)' },
      final: { opacity: 1, transform: 'translateY(0)' }
    }
  };

  const anim = animations[animation] || animations['fade-up'];

  // Set initial state
  elements.forEach(el => {
    Object.assign(el.style, {
      ...anim.initial,
      transition: createTransitionString(['opacity', 'transform'], config)
    });
  });

  // Intersection Observer for scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = elements.indexOf(entry.target);
        const delay = startDelay + index * stagger;

        setTimeout(() => {
          Object.assign(entry.target.style, anim.final);
        }, delay);

        observer.unobserve(entry.target);
      }
    });
  }, { threshold, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));

  return () => observer.disconnect();
}

export function applyParallax(element, options = {}) {
  if (isReducedMotion()) return () => {};

  const { strength = 0.15, direction = 'vertical' } = options;

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const elementTop = rect.top;
      const elementHeight = rect.height;

      // Only animate when element is in viewport vicinity
      if (elementTop < viewportHeight && elementTop + elementHeight > 0) {
        const progress = 1 - (elementTop / viewportHeight);
        const offset = progress * elementHeight * strength;

        if (direction === 'vertical') {
          element.style.transform = `translate3d(0, ${offset}px, 0)`;
        } else {
          element.style.transform = `translate3d(${offset}px, 0, 0)`;
        }
      }

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Initial

  return () => window.removeEventListener('scroll', onScroll);
}

export function applyKenBurns(element, options = {}) {
  if (isReducedMotion()) return () => {};

  const { zoom = 1.15, duration = 20000, easing = 'linear' } = options;

  element.style.transition = `transform ${duration}ms ${easing}`;
  element.style.transformOrigin = 'center center';
  element.style.transform = `scale(${zoom})`;

  // Alternate zoom direction
  let zoomIn = true;
  const interval = setInterval(() => {
    zoomIn = !zoomIn;
    element.style.transform = `scale(${zoomIn ? zoom : 1})`;
  }, duration);

  return () => {
    clearInterval(interval);
    element.style.transition = '';
    element.style.transform = '';
  };
}

export function applyMagneticHover(element, options = {}) {
  if (isReducedMotion()) return () => {};

  const { strength = 0.3, radius = 100 } = options;

  function onMouseMove(e) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < radius) {
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      element.style.transition = 'transform 50ms cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }

  function onMouseLeave() {
    element.style.transform = 'translate(0, 0)';
    element.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
  }

  element.addEventListener('mousemove', onMouseMove);
  element.addEventListener('mouseleave', onMouseLeave);

  return () => {
    element.removeEventListener('mousemove', onMouseMove);
    element.removeEventListener('mouseleave', onMouseLeave);
  };
}

export function applyShimmerLoading(element, options = {}) {
  const { color = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', speed = 1500 } = options;

  const shimmer = document.createElement('div');
  shimmer.style.cssText = `
    position: absolute;
    inset: 0;
    background: ${color};
    background-size: 200% 100%;
    animation: shimmer ${speed}ms infinite;
    pointer-events: none;
    border-radius: inherit;
  `;

  // Add keyframes if not exists
  if (!document.getElementById('luxury-shimmer-keyframes')) {
    const style = document.createElement('style');
    style.id = 'luxury-shimmer-keyframes';
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
  }

  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(shimmer);

  return () => {
    shimmer.remove();
  };
}

export function applySmoothScroll(target, options = {}) {
  if (isReducedMotion()) {
    target.scrollIntoView({ behavior: 'auto' });
    return;
  }

  const { offset = 0, duration = 800, easing = 'cubic-bezier(0.4, 0, 0.2, 1)' } = options;

  const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
  const startPosition = window.pageYOffset;
  const distance = targetPosition - startPosition;
  let startTime = null;

  function animateScroll(currentTime) {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);

    // Easing function
    const ease = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    window.scrollTo(0, startPosition + distance * ease);

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}

export function applyFocusVisible(element) {
  element.addEventListener('focus', () => {
    element.classList.add('focus-visible');
  });

  element.addEventListener('blur', () => {
    element.classList.remove('focus-visible');
  });

  // Remove on mouse interaction (only show focus ring for keyboard)
  element.addEventListener('mousedown', () => {
    element.classList.remove('focus-visible');
  });
}

export function applyCursorStyle(cursorType = 'default') {
  const cursors = {
    default: 'default',
    pointer: 'pointer',
    grab: 'grab',
    grabbing: 'grabbing',
    zoom: 'zoom-in',
    crosshair: 'crosshair',
    custom: 'url("/cursors/luxury.cur"), auto'
  };

  document.body.style.cursor = cursors[cursorType] || cursors.default;
}

export function initializeLuxuryInteractions() {
  initReducedMotionListener();

  // Auto-apply focus-visible to all interactive elements
  if (typeof document !== 'undefined') {
    const interactiveElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    interactiveElements.forEach(applyFocusVisible);

    // Add global reduced motion class
    if (_reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    }
  }
}

// Auto-initialize
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLuxuryInteractions);
  } else {
    initializeLuxuryInteractions();
  }
}

export default {
  isReducedMotion,
  getAnimationConfig,
  applyLuxuryHover,
  applyRevealAnimation,
  applyParallax,
  applyKenBurns,
  applyMagneticHover,
  applyShimmerLoading,
  applySmoothScroll,
  applyFocusVisible,
  applyCursorStyle,
  initializeLuxuryInteractions
};