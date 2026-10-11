/**
 * Immersive Collection Experience Component
 * Enhances collection pages with cinematic experience, journey navigation, and luxury interactions
 */

import { getWorldById, getWorldJourneySteps, getCinematicComponents, getLuxuryPresentationRules, getEditorialLayouts, shouldRespectReducedMotion, getDefaultAnimationConfig } from '../services/immersive-engine.js';
import { getJourneySteps, getJourneyProgress, getNextStep } from '../services/collection-journey.js';
import { evaluateMoments, playMoment, getUserPreferences } from '../services/signature-moments.js';
import { applyLuxuryHover, applyRevealAnimation, applyParallax, applyKenBurns, applyShimmerLoading, initializeLuxuryInteractions } from '../components/LuxuryInteractions.js';

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatPrice(price) {
  return new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'RSD', minimumFractionDigits: 0 }).format(price);
}

export async function enhanceCollectionPage() {
  if (typeof document === 'undefined') return;

  // Determine world from URL
  const path = window.location.pathname;
  let worldId = 'casual';
  if (path.includes('/elegance/')) worldId = 'elegance';

  const world = getWorldById(worldId);
  const journeySteps = getJourneySteps(worldId);
  const cinematicComponents = getCinematicComponents();
  const presentationRules = getLuxuryPresentationRules();
  const reducedMotion = shouldRespectReducedMotion();

  // Initialize luxury interactions
  initializeLuxuryInteractions();

  // Enhance collection hero with cinematic experience
  enhanceCollectionHero(world, cinematicComponents, reducedMotion);

  // Add journey navigation
  addJourneyNavigation(worldId, journeySteps);

  // Enhance product grid with luxury interactions
  enhanceProductGrid(presentationRules, reducedMotion);

  // Add world-specific styling
  applyWorldStyling(world);

  // Initialize signature moments
  initializeSignatureMoments(worldId);

  console.log('[ImmersiveCollection] Enhanced collection page for world:', worldId);
}

function enhanceCollectionHero(world, cinematicComponents, reducedMotion) {
  const heroSection = document.querySelector('.collection-hero');
  if (!heroSection) return;

  const container = heroSection.querySelector('.container');
  if (!container) return;

  // Add cinematic film component if enabled
  if (cinematicComponents.collectionFilm?.enabled && !reducedMotion) {
    const filmWrapper = document.createElement('div');
    filmWrapper.className = 'collection-film-wrapper';
    filmWrapper.style.cssText = 'position: absolute; inset: 0; z-index: 0; overflow: hidden;';
    filmWrapper.innerHTML = `
      <video class="collection-film" 
             ${cinematicComponents.collectionFilm.muted ? 'muted' : ''} 
             ${cinematicComponents.collectionFilm.loop ? 'loop' : ''} 
             ${cinematicComponents.collectionFilm.autoplay ? 'autoplay' : ''}
             playsinline
             preload="${cinematicComponents.performance?.videoPreload || 'metadata'}"
             poster="${cinematicComponents.collectionFilm.poster || ''}"
             style="width: 100%; height: 100%; object-fit: cover; opacity: 0.3; pointer-events: none;">
        <source src="${world.hero?.atmosphereVideo || ''}" type="video/mp4">
      </video>
    `;
    container.style.position = 'relative';
    container.insertBefore(filmWrapper, container.firstChild);

    // Apply Ken Burns effect to hero image if enabled
    if (cinematicComponents.atmosphereContent?.kenBurnsEffect) {
      const heroImage = container.querySelector('img, .collection-hero__image');
      if (heroImage) applyKenBurns(heroImage);
    }
  }

  // Add signature message with typewriter effect
  if (cinematicComponents.signatureMessaging?.enabled && world.hero?.signatureMessage) {
    const header = container.querySelector('.collection-header');
    if (header) {
      const signatureEl = document.createElement('div');
      signatureEl.className = 'collection-signature-message';
      signatureEl.style.cssText = 'margin-top: var(--space-6); font-family: var(--font-accent); font-size: var(--text-lg); font-style: italic; color: var(--color-accent); opacity: 0; transform: translateY(20px);';
      signatureEl.textContent = world.hero.signatureMessage;
      header.appendChild(signatureEl);

      // Typewriter animation
      if (!reducedMotion && cinematicComponents.signatureMessaging.typewriterEffect) {
        animateTypewriter(signatureEl, world.hero.signatureMessage, cinematicComponents.signatureMessaging.pauseDuration);
      } else {
        signatureEl.style.opacity = '1';
        signatureEl.style.transform = 'translateY(0)';
        signatureEl.style.transition = 'opacity 600ms, transform 600ms';
      }
    }
  }

  // Add parallax to hero content
  if (!reducedMotion && cinematicComponents.editorialHero?.parallax) {
    const header = container.querySelector('.collection-header');
    if (header) applyParallax(header, { strength: 0.1 });
  }
}

function animateTypewriter(element, text, pauseDuration = 2000) {
  element.textContent = '';
  element.style.opacity = '1';
  element.style.transform = 'translateY(0)';
  element.style.transition = 'none';

  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, 50);
    } else {
      setTimeout(() => {
        element.style.transition = 'opacity 1000ms';
        element.style.opacity = '0.7';
      }, pauseDuration);
    }
  }
  type();
}

function addJourneyNavigation(worldId, journeySteps) {
  const heroSection = document.querySelector('.collection-hero');
  if (!heroSection) return;

  const container = heroSection.querySelector('.container');
  if (!container) return;

  const nav = document.createElement('nav');
  nav.className = 'collection-journey-nav';
  nav.setAttribute('aria-label', 'Collection journey');
  nav.style.cssText = `
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-8);
    padding: var(--space-4);
    flex-wrap: wrap;
  `;

  journeySteps.forEach((step, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'journey-step-btn';
    btn.dataset.step = step.stepId;
    btn.setAttribute('aria-label', `${step.label} (step ${index + 1} of ${journeySteps.length})`);
    btn.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-3) var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--duration-fast);
      min-width: 100px;
    `;
    btn.innerHTML = `
      <span style="font-size: var(--text-xl);">${getStepIcon(step.stepId)}</span>
      <span style="font-size: var(--text-xs); font-weight: var(--fw-medium); text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(step.label)}</span>
      <span class="journey-step-progress" style="width: 24px; height: 3px; background: var(--color-border); border-radius: 2px; overflow: hidden;">
        <span class="journey-step-fill" style="display: block; height: 100%; width: 0%; background: var(--color-primary); transition: width var(--duration-normal);"></span>
      </span>
    `;

    btn.addEventListener('click', () => scrollToJourneyStep(step.stepId));
    nav.appendChild(btn);
  });

  container.appendChild(nav);

  // Update progress based on scroll/view
  updateJourneyProgress(worldId, journeySteps);
}

function getStepIcon(stepId) {
  const icons = {
    discover: '🌅',
    story: '📖',
    materials: '🧵',
    looks: '👔',
    products: '🛍️',
    membership: '👑'
  };
  return icons[stepId] || '⬤';
}

function scrollToJourneyStep(stepId) {
  const section = document.querySelector(`[data-journey-step="${stepId}"]`);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function updateJourneyProgress(worldId, journeySteps) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const stepId = entry.target.dataset.journeyStep;
        const btn = document.querySelector(`.journey-step-btn[data-step="${stepId}"]`);
        if (btn) {
          const fill = btn.querySelector('.journey-step-fill');
          const index = journeySteps.findIndex(s => s.stepId === stepId);
          const progress = ((index + 1) / journeySteps.length) * 100;
          if (fill) fill.style.width = `${progress}%`;
          btn.style.borderColor = 'var(--color-primary)';
        }
      }
    });
  }, { threshold: 0.3, rootMargin: '-20% 0px -60% 0px' });

  journeySteps.forEach(step => {
    const section = document.querySelector(`[data-journey-step="${step.stepId}"]`);
    if (section) observer.observe(section);
  });
}

function enhanceProductGrid(presentationRules, reducedMotion) {
  const productCards = document.querySelectorAll('.product-card');
  if (!productCards.length) return;

  // Apply luxury hover effects
  productCards.forEach(card => {
    if (!reducedMotion) {
      applyLuxuryHover(card, {
        scale: 1.01,
        translateY: -2,
        shadow: '0 12px 32px rgba(0,0,0,0.08)',
        borderColor: 'var(--color-primary)'
      });
    }

    // Add shimmer loading to images
    const img = card.querySelector('.product-card__image');
    if (img && !img.complete) {
      applyShimmerLoading(card.querySelector('.product-card__media'));
    }
  });

  // Apply reveal animation to grid
  if (!reducedMotion) {
    applyRevealAnimation(Array.from(productCards), {
      stagger: 80,
      animation: 'fade-up',
      threshold: 0.1
    });
  }
}

function applyWorldStyling(world) {
  // Apply world color palette to CSS custom properties
  const palette = world.colorPalette;
  if (!palette) return;

  const root = document.documentElement;
  root.style.setProperty('--world-primary', palette.primary);
  root.style.setProperty('--world-secondary', palette.secondary);
  root.style.setProperty('--world-accent', palette.accent);
  root.style.setProperty('--world-background', palette.background);
  root.style.setProperty('--world-text', palette.text);
  root.style.setProperty('--world-muted', palette.muted);

  // Update primary color for this world
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--color-primary-dark', shadeColor(palette.primary, -20));
  root.style.setProperty('--color-accent', palette.accent);
}

function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x00FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function initializeSignatureMoments(worldId) {
  // Check for collection-entry moment
  const context = {
    fromDifferentWorld: false,
    directEntry: true,
    currentWorld: worldId,
    hasVisitedBefore: sessionStorage.getItem('dalli_visited') === 'true'
  };

  sessionStorage.setItem('dalli_visited', 'true');

  const moments = evaluateMoments(context);
  if (moments.length > 0) {
    // Play highest priority moment
    playMoment(moments[0].id, context);
  }
}

// Listen for moment step events to trigger UI
if (typeof window !== 'undefined') {
  window.addEventListener('dalli:moment:step', (e) => {
    const { step, momentId } = e.detail;
    handleMomentStep(step, momentId);
  });
}

function handleMomentStep(step, momentId) {
  switch (step.type) {
    case 'ambient-entry':
      // Add ambient entry class to body
      document.body.classList.add('moment-ambient-entry');
      setTimeout(() => document.body.classList.remove('moment-ambient-entry'), step.duration);
      break;
    case 'signature-message':
      // Show signature message toast/overlay
      showMomentMessage(step.config.message, step.duration);
      break;
    case 'world-hero-reveal':
      // Trigger staggered reveal of hero elements
      revealHeroElements(step.config.stagger, step.config.delay);
      break;
    case 'celebration-burst':
      // Trigger celebration particles
      triggerCelebration(step.config.color);
      break;
    case 'tier-reveal':
      // Show tier upgrade modal
      showTierUpgrade(step.config.newTier, step.config.message);
      break;
  }
}

function showMomentMessage(message, duration) {
  const toast = document.createElement('div');
  toast.className = 'moment-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    padding: var(--space-4) var(--space-6);
    box-shadow: var(--shadow-xl);
    z-index: 10000;
    opacity: 0;
    transition: all var(--duration-normal);
    max-width: 90vw;
    text-align: center;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, duration);
}

function revealHeroElements(stagger, delay) {
  const elements = document.querySelectorAll('.collection-header > *');
  elements.forEach((el, index) => {
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, delay + index * stagger);
  });
}

function triggerCelebration(color) {
  // Simple celebration - could be enhanced with canvas particles
  const burst = document.createElement('div');
  burst.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    background: radial-gradient(circle at 50% 50%, ${color}20 0%, transparent 70%);
    opacity: 0;
    transition: opacity 500ms;
  `;
  document.body.appendChild(burst);
  requestAnimationFrame(() => burst.style.opacity = '1');
  setTimeout(() => {
    burst.style.opacity = '0';
    setTimeout(() => burst.remove(), 500);
  }, 1000);
}

function showTierUpgrade(newTier, message) {
  const modal = document.createElement('div');
  modal.className = 'tier-upgrade-modal';
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    background: rgba(0,0,0,0.6);
    opacity: 0;
    transition: opacity var(--duration-normal);
  `;
  modal.innerHTML = `
    <div style="
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      max-width: 400px;
      text-align: center;
      transform: scale(0.9);
      transition: transform var(--duration-normal);
    ">
      <div style="font-size: 4rem; margin-bottom: var(--space-4);">🎉</div>
      <h3 style="font-family: var(--font-display); font-size: var(--text-2xl); margin-bottom: var(--space-2);">Congratulations</h3>
      <p style="color: var(--color-text-secondary); margin-bottom: var(--space-6);">${escapeHtml(message)}</p>
      <button class="btn btn-primary" data-dismiss-tier-upgrade>Continue</button>
    </div>
  `;
  document.body.appendChild(modal);

  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.querySelector('div').style.transform = 'scale(1)';
  });

  modal.querySelector('[data-dismiss-tier-upgrade]').addEventListener('click', () => {
    modal.style.opacity = '0';
    modal.querySelector('div').style.transform = 'scale(0.9)';
    setTimeout(() => modal.remove(), 300);
  });
}

// Auto-initialize on collection pages
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceCollectionPage);
  } else {
    enhanceCollectionPage();
  }
}

export default { enhanceCollectionPage };