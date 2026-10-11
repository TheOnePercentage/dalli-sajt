import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('homepage should match baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000
    });
  });

  test('hero section should match baseline', async ({ page }) => {
    const hero = page.locator('.hero');
    await expect(hero).toHaveScreenshot('hero.png', {
      threshold: 0.1,
      maxDiffPixels: 500
    });
  });

  test('product cards should match baseline', async ({ page }) => {
    const grid = page.locator('.product-grid').first();
    await expect(grid).toHaveScreenshot('product-grid.png', {
      threshold: 0.15,
      maxDiffPixels: 1000
    });
  });

  test('footer should match baseline', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer.png', {
      threshold: 0.1,
      maxDiffPixels: 500
    });
  });

  test('header should match baseline', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toHaveScreenshot('header.png', {
      threshold: 0.1,
      maxDiffPixels: 500
    });
  });
});

test.describe('Component Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('button variants should match baseline', async ({ page }) => {
    const buttons = page.locator('.btn');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = buttons.nth(i);
      await expect(btn).toHaveScreenshot(`button-${i}.png`, {
        threshold: 0.1,
        maxDiffPixels: 100
      });
    }
  });

  test('form fields should match baseline', async ({ page }) => {
    const forms = page.locator('.form-field');
    const count = await forms.count();
    if (count > 0) {
      await expect(forms.first()).toHaveScreenshot('form-field.png', {
        threshold: 0.1,
        maxDiffPixels: 200
      });
    }
  });

  test('product card should match baseline', async ({ page }) => {
    const cards = page.locator('.product-card');
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toHaveScreenshot('product-card.png', {
        threshold: 0.15,
        maxDiffPixels: 500
      });
    }
  });

  test('modal should match baseline', async ({ page }) => {
    // Open auth modal
    await page.click('[data-action="auth"]');
    await page.waitForSelector('#authModal.open');
    const modal = page.locator('#authModal');
    await expect(modal).toHaveScreenshot('auth-modal.png', {
      threshold: 0.1,
      maxDiffPixels: 500
    });
  });

  test('drawer should match baseline', async ({ page }) => {
    // Open cart drawer
    await page.click('[data-action="cart"]');
    await page.waitForSelector('#cartDrawer.open');
    const drawer = page.locator('#cartDrawer');
    await expect(drawer).toHaveScreenshot('cart-drawer.png', {
      threshold: 0.1,
      maxDiffPixels: 500
    });
  });
});

test.describe('Responsive Visual Regression', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'wide', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    test(`homepage at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
        fullPage: true,
        threshold: 0.2,
        maxDiffPixels: 2000
      });
    });
  }
});

test.describe('Dark Mode Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Force dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(100);
  });

  test('homepage dark mode should match baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
      threshold: 0.2,
      maxDiffPixels: 1000
    });
  });

  test('components dark mode should match baseline', async ({ page }) => {
    const components = [
      { selector: '.btn--primary', name: 'btn-primary-dark' },
      { selector: '.product-card', name: 'product-card-dark' },
      { selector: '.card', name: 'card-dark' }
    ];

    for (const comp of components) {
      const el = await page.$(comp.selector);
      if (el) {
        await expect(el).toHaveScreenshot(`${comp.name}.png`, {
          threshold: 0.15,
          maxDiffPixels: 300
        });
      }
    }
  });
});

test.describe('Component State Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('button states', async ({ page }) => {
    const btn = page.locator('.btn--primary').first();
    await expect(btn).toHaveScreenshot('btn-default.png', { threshold: 0.1 });

    await btn.hover();
    await expect(btn).toHaveScreenshot('btn-hover.png', { threshold: 0.1 });

    await btn.focus();
    await expect(btn).toHaveScreenshot('btn-focus.png', { threshold: 0.1 });
  });

  test('form field states', async ({ page }) => {
    const input = page.locator('.form-field input').first();
    if (await input.count() > 0) {
      await expect(input).toHaveScreenshot('input-default.png', { threshold: 0.1 });

      await input.focus();
      await expect(input).toHaveScreenshot('input-focus.png', { threshold: 0.1 });

      await input.fill('test');
      await expect(input).toHaveScreenshot('input-filled.png', { threshold: 0.1 });
    }
  });

  test('card hover states', async ({ page }) => {
    const card = page.locator('.product-card, .card').first();
    if (await card.count() > 0) {
      await expect(card).toHaveScreenshot('card-default.png', { threshold: 0.15 });

      await card.hover();
      await page.waitForTimeout(300);
      await expect(card).toHaveScreenshot('card-hover.png', { threshold: 0.15 });
    }
  });
});