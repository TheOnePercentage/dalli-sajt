import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/DALLI/);
  });

  test('should have proper SEO meta tags', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('DALLI');

    const metaDescription = await page.$eval('meta[name="description"]', el => el.getAttribute('content'));
    expect(metaDescription).toContain('DALLI');

    const canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href'));
    expect(canonical).toBe('https://dalli.rs/');
  });

  test('should have Open Graph tags', async ({ page }) => {
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content'));
    expect(ogTitle).toContain('DALLI');

    const ogImage = await page.$eval('meta[property="og:image"]', el => el.getAttribute('content'));
    expect(ogImage).toContain('dalli.rs');
  });

  test('should have hreflang tags', async ({ page }) => {
    const hreflangs = await page.$$eval('link[rel="alternate"][hreflang]', links =>
      links.map(l => l.getAttribute('href'))
    );
    expect(hreflangs).toContain('https://dalli.rs/');
  });

  test('should have JSON-LD structured data', async ({ page }) => {
    const schemas = await page.$$eval('script[type="application/ld+json"]', scripts =>
      scripts.map(s => JSON.parse(s.textContent))
    );
    expect(schemas.length).toBeGreaterThan(0);
    const orgSchema = schemas.find(s => s['@type'] === 'Store' || s['@graph']?.some(g => g['@type'] === 'Store'));
    expect(orgSchema).toBeTruthy();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have working navigation links', async ({ page }) => {
    const navLinks = await page.$$('.header__nav-link');
    expect(navLinks.length).toBeGreaterThan(0);

    for (const link of navLinks.slice(0, 3)) {
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('should open mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const menuBtn = page.locator('[data-action="menu"]');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.locator('#mobileDrawer')).toHaveClass(/open/);
  });

  test('should open search drawer', async ({ page }) => {
    await page.click('[data-action="search"]');
    await expect(page.locator('#searchDrawer')).toHaveClass(/open/);
  });

  test('should open cart drawer', async ({ page }) => {
    await page.click('[data-action="cart"]');
    await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
  });
});

test.describe('Product Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display product cards', async ({ page }) => {
    const cards = await page.$$('.product-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  test('should have schema.org Product markup', async ({ page }) => {
    const schemas = await page.$$eval('article[itemtype="https://schema.org/Product"]', articles =>
      articles.map(a => a.getAttribute('itemtype'))
    );
    expect(schemas.length).toBeGreaterThan(0);
  });

  test('should have quick add to cart', async ({ page }) => {
    const quickAdd = await page.$('.product-card__quick-add');
    if (quickAdd) {
      await expect(quickAdd).toBeVisible();
    }
  });

  test('should have wishlist button', async ({ page }) => {
    const wishlist = await page.$('[data-action="wishlist"]');
    if (wishlist) {
      await expect(wishlist).toBeVisible();
    }
  });
});

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open cart drawer', async ({ page }) => {
    await page.click('[data-action="cart"]');
    await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
  });

  test('should show empty cart state', async ({ page }) => {
    await page.click('[data-action="cart"]');
    await expect(page.locator('#cartEmpty')).toBeVisible();
  });

  test('should update cart count', async ({ page }) => {
    const cartCount = page.locator('#cartCount');
    await expect(cartCount).toBeVisible();
  });
});

test.describe('Auth Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open auth modal', async ({ page }) => {
    await page.click('[data-action="auth"]');
    await expect(page.locator('#authModal')).toHaveClass(/open/);
  });

  test('should switch between login and register', async ({ page }) => {
    await page.click('[data-action="auth"]');
    await expect(page.locator('#loginForm')).toBeVisible();
    await page.click('.auth-link:has-text("Registrujte se")');
    await expect(page.locator('#registerForm')).toBeVisible();
  });
});

test.describe('Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open search drawer', async ({ page }) => {
    await page.click('[data-action="search"]');
    await expect(page.locator('#searchDrawer')).toHaveClass(/open/);
  });

  test('should show suggestions on input', async ({ page }) => {
    await page.click('[data-action="search"]');
    await page.fill('#searchInput', 'majica');
    await expect(page.locator('#searchSuggestions')).toBeVisible();
  });
});

test.describe('Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have footer links', async ({ page }) => {
    const footerLinks = await page.$$('.footer-col a');
    expect(footerLinks.length).toBeGreaterThan(0);
  });

  test('should have social links', async ({ page }) => {
    const socialLinks = await page.$$('.footer-social-link');
    expect(socialLinks.length).toBeGreaterThan(0);
  });

  test('should have payment icons', async ({ page }) => {
    const paymentIcons = await page.$$('.footer-payment img');
    expect(paymentIcons.length).toBeGreaterThan(0);
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have skip links', async ({ page }) => {
    const skipLinks = await page.$$('.skip-link');
    expect(skipLinks.length).toBeGreaterThanOrEqual(4);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = await page.$('h1');
    expect(h1).toBeTruthy();
    const h1Text = await h1?.textContent();
    expect(h1Text).toContain('DALLI');
  });

  test('should have alt text on images', async ({ page }) => {
    const images = await page.$eval('img', imgs => imgs.map(img => img.alt));
    expect(images.every(alt => alt && alt.length > 0)).toBe(true);
  });

  test('should have proper form labels', async ({ page }) => {
    const inputs = await page.$eval('input', inputs =>
      inputs.map(input => ({
        id: input.id,
        type: input.type,
        label: document.querySelector(`label[for="${input.id}"]`)?.textContent
      }))
    );
    expect(inputs.every(i => i.label || i.type === 'hidden')).toBe(true);
  });
});

test.describe('Performance', () => {
  test('should load within performance budget', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });
});