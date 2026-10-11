/**
 * DALLI React Islands — loader
 *
 * Hybrid MPA + React Islands pristup:
 *  - MPA/SSG ostaje glavni deo (SEO, generisane stranice, Vite build).
 *  - React se koristi SAMO tamo gde interaktivnost donosi vrednost.
 *  - Loader NIKAD ne učitava React statički — sve (React runtime, error
 *    boundary, island modul) se importuje dinamički, tek kada stranica ima
 *    [data-island] element i tek kada browser pređe u idle.
 *
 * Ugrađivanje:
 *   <div data-island="loyalty"></div>
 *   <div data-island="concierge" data-props="{&quot;phone&quot;:&quot;...&quot;}"></div>
 */

/**
 * Registry — mapira data-island ime → dinamički import modula.
 * Koristi se statički izraz da Vite/Rollup može da bundle-uje chunk.
 */
const registry = {
  loyalty: () => import('./LoyaltyIsland.jsx'),
  concierge: () => import('./ConciergeIsland.jsx'),
  cart: () => import('./CartIsland.jsx'),
  wishlist: () => import('./WishlistIsland.jsx'),
  checkout: () => import('./CheckoutIsland.jsx'),
  auth: () => import('./AuthIsland.jsx'),
  profile: () => import('./ProfileIsland.jsx'),
  orders: () => import('./OrdersIsland.jsx'),
  search: () => import('./SearchIsland.jsx'),
  vto: () => import('./VtoIsland.jsx'),
  configurator: () => import('./ConfiguratorIsland.jsx'),
  reviews: () => import('./ReviewsIsland.jsx'),
  'cart-drawer': () => import('./CartDrawerIsland.jsx'),
  'profile-forms': () => import('./ProfileFormsIsland.jsx'),
  'orders-management': () => import('./OrdersManagementIsland.jsx'),
};

/** Parsira data-props atribut (JSON). Nikad ne baca — fallback na {}. */
function readProps(el) {
  const raw = el.getAttribute('data-props');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[islands] neispravan data-props na elementu:', el, err);
    return {};
  }
}

/** Odloži montiranje da ne blokira prvi interaktivni prikaz (Core Web Vitals). */
function whenIdle(fn) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(fn, { timeout: 3000 });
  } else {
    setTimeout(fn, 200);
  }
}

/**
 * Montira island: dinamički učitava React runtime + error boundary + sam
 * island modul. Ako bilo šta fail-uje, element se uklanja da se MPA ne „sruši".
 */
async function hydrate(el, module) {
  const ReactMod = await import('react');
  const React = ReactMod.default ?? ReactMod;
  const { createRoot } = await import('react-dom/client');
  const { default: ErrorBoundary } = await import('./ErrorBoundary.jsx');

  const props = readProps(el);
  const root = createRoot(el);
  root.render(React.createElement(ErrorBoundary, null, React.createElement(module.default, props)));
  el.dataset.hydrated = '1';
}

/** Montira jedan island element. Idempotentno po elementu. */
function mountElement(el) {
  if (el.dataset.mounted) return;
  el.dataset.mounted = '1';

  const name = el.getAttribute('data-island');
  const load = registry[name];
  if (!load) {
    console.warn(`[islands] nepoznati island "${name}"`);
    return;
  }

  whenIdle(() => {
    load()
      .then(module => hydrate(el, module))
      .catch(err => {
        console.error(`[islands] greška pri učitavanju "${name}":`, err);
        el.remove();
      });
  });
}

/** Pretraži stranicu i montiraj sve islande. Idempotentno. */
export function mountAll(scope = document) {
  const elements = scope.querySelectorAll('[data-island]');
  for (const el of Array.from(elements)) mountElement(el);
}

// Automatski start na DOM-ready (modul skripte i onako idu kasno).
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountAll());
  } else {
    mountAll();
  }
}
