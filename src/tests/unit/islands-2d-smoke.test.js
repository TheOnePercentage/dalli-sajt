/* eslint-disable testing-library/no-unnecessary-act */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Faza 2D — funkcionalni smoke test novih React islands.
 *
 * Za razliku od unit lava (pure JS logika), ovde montiramo prave islands
 * komponente u jsdom preko createRoot, simuliramo interakcije i proveravamo
 * da se stanje zaista upisuje u localStorage (isti ugovor kao vanilla).
 *
 * NAPOMENA: src/tests/setup.ts zamenjuje window.localStorage mock-om i čisti
 * ga posle svakog testa → svaki test sebi presejava stanje pre importa state
 * module (signali čitaju localStorage u trenutku importa).
 */

const ORDERS = (withUserOrders = true) => {
  if (!withUserOrders) return undefined;
  return [
    {
      id: 'db-pending',
      userId: 'u1',
      orderNumber: 'DALLI-900',
      status: 'pending',
      createdAt: '2026-09-01T10:00:00Z',
      items: [
        {
          productId: 99,
          variantId: '99-black-M',
          name: 'Šorc',
          color: 'black',
          size: 'M',
          price: 1200,
          qty: 1,
          image: '/images/1.jpg',
        },
      ],
      totals: { subtotal: 1200, shipping: 290, discount: 0, total: 1490 },
      paymentMethod: 'cod',
      shippingMethod: 'Kurirska služba',
    },
    {
      id: 'db-delivered',
      userId: 'u1',
      orderNumber: 'DALLI-901',
      status: 'delivered',
      createdAt: '2026-08-01T10:00:00Z',
      items: [
        {
          productId: 1,
          variantId: '1-black-M',
          name: 'Majica',
          color: 'black',
          size: 'M',
          price: 2900,
          qty: 1,
          image: '/images/x.jpg',
        },
      ],
      totals: { subtotal: 2900, shipping: 0, discount: 0, total: 2900 },
      paymentMethod: 'crypto',
      shippingMethod: 'Kurirska služba',
    },
  ];
};

function seed({ withUser = true, withOrders = true, cart = '[]' } = {}) {
  window.localStorage.clear();
  if (withUser) {
    window.localStorage.setItem(
      'dalli_user',
      JSON.stringify({
        id: 'u1',
        firstName: 'Ana',
        lastName: 'A',
        email: 'ana@dalli.rs',
        cryptoWallet: false,
      })
    );
  }
  const orders = ORDERS(withOrders);
  if (orders) window.localStorage.setItem('dalli_orders', JSON.stringify(orders));
  window.localStorage.setItem('dalli_cart', cart);
  window.localStorage.removeItem('dalli_reviews');
}

async function loadIsland(name) {
  return (await import(`../../../js/islands/${name}.jsx`)).default;
}

async function mount(Component, props = {}) {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react-dom/test-utils');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(Component, props));
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  return { container, root, act, React };
}

async function click(el, act) {
  if (!el) throw new Error('click handler: element nije pronađen');
  await act(async () => el.click());
}

async function setInput(input, value, act) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  await act(async () => input.dispatchEvent(new Event('input', { bubbles: true })));
}

function setTextarea(ta, value, act) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, value);
  return act(async () => ta.dispatchEvent(new Event('input', { bubbles: true })));
}

function findBtn(container, text) {
  return Array.from(container.querySelectorAll('button')).find(b => b.textContent.includes(text));
}

function findHeader(container, text) {
  return Array.from(container.querySelectorAll('header')).find(h => h.textContent.includes(text));
}

const getStored = key => JSON.parse(window.localStorage.getItem(key) || 'null');

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        reviews: [],
        settings: {
          requireVerifiedPurchase: true,
          requireLoginToReview: true,
          titleRequired: true,
          textMinLength: 2,
          maxPhotosPerReview: 5,
        },
      }),
    }))
  );
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ReviewsIsland (P1) — funkcionalno', () => {
  it('prikaže formu verifikovanom kupcu i upiše recenziju u dalli_reviews', async () => {
    seed();
    const { container, root, act } = await mount(await loadIsland('ReviewsIsland'), {
      productId: 1,
      productName: 'Osnovna Majica',
    });
    try {
      const title = container.querySelector('input[placeholder="Naslov recenzije"]');
      expect(title).toBeTruthy();

      await setInput(title, 'Super majica', act);
      await setTextarea(container.querySelector('textarea'), 'Odličan materijal i kroj.', act);
      await click(findBtn(container, 'Objavite recenziju'), act);

      const reviews = getStored('dalli_reviews').reviews;
      expect(reviews).toHaveLength(1);
      expect(reviews[0].status).toBe('pending');
      expect(reviews[0].verifiedPurchase).toBe(true);
      expect(container.textContent).toContain('čeka odobrenje');
    } finally {
      root.unmount();
    }
  });

  it('neprijavljen korisnik vidi login poziv', async () => {
    seed({ withUser: false });
    const { logoutUser } = await import('../../../js/state/user.js');
    logoutUser();
    const { container, root } = await mount(await loadIsland('ReviewsIsland'), {
      productId: 1,
      productName: 'Majica',
    });
    try {
      expect(container.textContent).toContain('Morate biti prijavljeni');
      expect(findBtn(container, 'Prijavite se')).toBeTruthy();
    } finally {
      root.unmount();
    }
  });
});

describe('CartDrawerIsland (P2) — funkcionalno', () => {
  it('otvara drawer na klik header korpe, menja količinu i ažurira #cartCount', async () => {
    seed({ withOrders: false });
    const { addToCart } = await import('../../../js/state/cart.js');
    addToCart(
      { id: 1, name: 'Osnovna Majica', price: 2900, images: { main: '/images/x.jpg' } },
      { color: 'black', size: 'M', price: 2900 },
      2
    );

    const link = document.createElement('a');
    link.className = 'cart-link';
    link.href = '/cart.html';
    link.innerHTML = '<span id="cartCount">0</span>';
    document.body.appendChild(link);

    const { container, root, act } = await mount(await loadIsland('CartDrawerIsland'));
    try {
      expect(link.querySelector('#cartCount').textContent).toBe('2');

      await act(async () =>
        link.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }))
      );
      expect(container.textContent).toContain('Osnovna Majica');

      const plus = Array.from(container.querySelectorAll('button')).find(
        b => b.getAttribute('aria-label') === 'Veća količina'
      );
      await click(plus, act);

      expect(link.querySelector('#cartCount').textContent).toBe('3');
      const item = getStored('dalli_cart').find(i => i.variantId === '1-black-M');
      expect(item.qty).toBe(3);
    } finally {
      root.unmount();
    }
  });
});

describe('ProfileFormsIsland (P3) — funkcionalno', () => {
  it('čuva lične podatke i uključuje kripto plaćanje', async () => {
    seed({ withOrders: false });
    const { loginUser } = await import('../../../js/state/user.js');
    await loginUser({
      id: 'u1',
      firstName: 'Ana',
      lastName: 'A',
      email: 'ana@dalli.rs',
      cryptoWallet: false,
    });
    const { container, root, act } = await mount(await loadIsland('ProfileFormsIsland'));
    try {
      const labels = Array.from(container.querySelectorAll('label'));
      const lastNameLabel = labels.find(l => l.textContent.includes('Prezime'));
      const lastNameInput = lastNameLabel
        ? lastNameLabel.parentElement.querySelector('input')
        : null;
      const firstNameInput = Array.from(container.querySelectorAll('input')).find(
        i => i.type === 'text' && i !== lastNameInput
      );

      expect(firstNameInput.value).toBe('Ana');

      await setInput(lastNameInput, 'Krajšnik', act);
      await click(findBtn(container, 'Sačuvaj izmene'), act);

      expect(getStored('dalli_user').lastName).toBe('Krajšnik');
      expect(container.textContent).toContain('Profil je sačuvan');

      const cryptoCheckbox = Array.from(container.querySelectorAll('input[type="checkbox"]')).at(
        -1
      );
      await click(cryptoCheckbox, act);
      expect(getStored('dalli_user').cryptoWallet).toBe(true);
      expect(container.textContent).toContain('15% popusta');
    } finally {
      root.unmount();
    }
  });
});

describe('OrdersManagementIsland (P3) — funkcionalno', () => {
  it('otkazuje narudžbinu i dodaje isporučenu narudžbinu u korpu', async () => {
    seed({});
    const { clearCart } = await import('../../../js/state/cart.js');
    clearCart();
    const { loginUser } = await import('../../../js/state/user.js');
    await loginUser({
      id: 'u1',
      firstName: 'Ana',
      lastName: 'A',
      email: 'ana@dalli.rs',
      cryptoWallet: false,
    });
    const { container, root, act } = await mount(await loadIsland('OrdersManagementIsland'));
    try {
      expect(container.textContent).toContain('#DALLI-900');
      expect(container.textContent).toContain('#DALLI-901');

      await click(findHeader(container, 'DALLI-900'), act);
      const cancelBtn = findBtn(container, 'Otkaži narudžbinu');
      expect(cancelBtn).toBeTruthy();
      await click(cancelBtn, act);
      await click(findBtn(container, 'Potvrdi otkazivanje'), act);

      const pending = getStored('dalli_orders').find(o => o.id === 'db-pending');
      expect(pending.status).toBe('cancelled');

      await click(findHeader(container, 'DALLI-901'), act);
      await click(findBtn(container, 'Ponovi kupovinu'), act);

      const cart = getStored('dalli_cart');
      expect(cart.some(i => i.variantId === '1-black-M' && i.qty === 1)).toBe(true);
    } finally {
      root.unmount();
    }
  });
});
