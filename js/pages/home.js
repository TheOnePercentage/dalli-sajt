import { $, $$, on, delegate, show, hide } from '../core/dom.js';
import { trackEvent } from '../features/analytics.js';

let isInitialized = false;

const initHero = () => {
  const hero = $('#hero');
  if (!hero) return;

  const heroImage = $('img', hero);
  if (heroImage && !heroImage.complete) {
    heroImage.addEventListener('load', () => {
      hero.classList.add('hero--loaded');
    });
  } else if (heroImage) {
    hero.classList.add('hero--loaded');
  }
};

const initCategoryCards = () => {
  delegate(document, '.category-card[data-track]', 'click', (e, card) => {
    const category = card.dataset.category;
    trackEvent('category_card_click', { category, position: parseInt(card.dataset.position) || 1 });
  });
};

const initShopTheLook = () => {
  delegate(document, '.look-card[data-track]', 'click', (e, card) => {
    const lookId = card.dataset.lookId;
    trackEvent('shop_look_click', { look_id: lookId, position: parseInt(card.dataset.position) || 1 });
  });
};

const initTrustSection = () => {
  const trustItems = $$('.trust-item');
  trustItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 100}ms`;
    item.classList.add('animate-fade-up');
  });
};

const initFAQ = () => {
  $$('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(btn.getAttribute('aria-controls'));

      btn.setAttribute('aria-expanded', !expanded);
      if (panel) {
        panel.hidden = expanded;
        if (!expanded) {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        } else {
          panel.style.maxHeight = '0';
        }
      }

      trackEvent('faq_toggle', {
        question: btn.textContent?.trim().slice(0, 50),
        expanded: !expanded
      });
    });
  });
};

const initNewsletter = () => {
  const form = $('#newsletterForm');
  if (!form) return;

  on(form, 'submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]')?.value;
    const btn = form.querySelector('button[type="submit"]');

    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Prijavljivanje...';

    try {
      await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      showToast('Uspešno ste se prijavili na newsletter!', 'success');
      form.reset();
      trackEvent('newsletter_subscribe', { email });
    } catch (err) {
      showToast('Greška pri prijavljivanju. Pokušajte ponovo.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Pretplati se';
    }
  });
};

const initScrollReveal = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  $$('.animate-on-scroll').forEach(el => observer.observe(el));
};

const initInternalLinks = () => {
  delegate(document, 'a[href^="/"][data-track]', 'click', (e, link) => {
    const href = link.getAttribute('href');
    trackEvent('internal_link_click', { href, text: link.textContent?.trim().slice(0, 50) });
  });
};

const init = () => {
  if (isInitialized) return;

  initHero();
  initCategoryCards();
  initShopTheLook();
  initTrustSection();
  initFAQ();
  initNewsletter();
  initScrollReveal();
  initInternalLinks();

  isInitialized = true;
  console.log('[Homepage] Initialized');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init };

if (typeof window !== 'undefined') {
  window.DALLI_Homepage = { init };
}