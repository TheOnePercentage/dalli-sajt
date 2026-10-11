import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', function() {
  test.beforeEach(async function({ page }) {
    await page.goto('/');
  });

  test('should have no accessibility violations', async function({ page }) {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no color contrast violations', async function({ page }) {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    var contrastViolations = accessibilityScanResults.violations.filter(function(v) {
      return v.id.includes('color-contrast');
    });
    expect(contrastViolations).toEqual([]);
  });

  test('should have no keyboard navigation issues', async function({ page }) {
    var accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['keyboard'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA attributes', function(page) {
    var accessibilityScanResults = new AxeBuilder({ page });
    accessibilityScanResults.withTags(['aria']).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper form labels', function(page) {
    var accessibilityScanResults = new AxeBuilder({ page });
    accessibilityScanResults.withTags(['forms']).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading structure', async function({ page }) {
    var headings = await page.$$eval('h1, h2, h3, h4, h5, h6', function(headings) {
      return headings.map(function(h) {
        return ({ tag: h.tagName.toLowerCase(),
          text: h.textContent ? h.textContent.trim() : ''
        });
      });
    });

    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0].tag).toBe('h1');

    var lastLevel = 0;
    for (var i = 0; i < headings.length; i++) {
      var heading = headings[i];
      var level = parseInt(heading.tag.charAt(1), 10);
      if (level > lastLevel + 1) {
        throw new Error('Heading level jumps more than one level');
      }
      lastLevel = level;
    }
  });

  test('should have proper ARIA labels on interactive elements', async function({ page }) {
    var interactiveElements = await page.evaluate(function() {
      var elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
      return Array.from(elements).map(function(el) {
        return ({ tag: el.tagName.toLowerCase(),
          ariaLabel: el.getAttribute('aria-label'),
          ariaLabelledBy: el.getAttribute('aria-labelledby'),
          text: el.textContent ? el.textContent.trim() : ''
        });
      });
    });

    for (var i = 0; i < interactiveElements.length; i++) {
      var el = interactiveElements[i];
      if (el.tag === 'input' || el.tag === 'textarea' || el.tag === 'select') {
        if (!el.ariaLabel && el.tag !== 'select') {
          throw new Error('Missing aria-label on ' + el.tag);
        }
      }
    }
  });

  test('should have proper focus indicators', function(page) {
    var accessibilityScanResults = new AxeBuilder({ page })
      .withTags(['focus'])
      .analyze();

    var focusViolations = accessibilityScanResults.violations.filter(function(v) {
      return v.id.includes('focus');
    });
    if (focusViolations.length > 0) {
      throw new Error('Focus violations found');
    }
  });

  test('should have proper landmark regions', function(page) {
    return page.$eval(
      'main, nav, header, footer, aside, section[aria-label], [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]',
      function(elements) {
        var landmarks = elements.map(function(el) {
          return ({
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label')
          });
        });

    if (landmarks.length === 0) {
      throw new Error('No landmarks found');
    }

    var main = landmarks.find(function(l) { return l.tag === 'main' || l.role === 'main'; });
    if (!main) {
      throw new Error('No main landmark found');
    }
  });
});

test.describe('Keyboard Navigation', function() {
  test('should navigate with Tab key', async function({ page }) {
    await page.goto('/');
    await page.keyboard.press('Tab');
    var focused = await page.evaluate(function() {
      return document.activeElement ? document.activeElement.tagName : '';
    });
    var allowed = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'NAV', 'HEADER', 'FOOTER', 'MAIN'];
    if (allowed.indexOf(focused) === -1) {
      throw new Error('Unexpected focused element: ' + focused);
    }
  });

  test('should navigate with Shift+Tab', async function(page) {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    var focused = await page.evaluate(function() {
      return document.activeElement ? document.activeElement.tagName : '';
    });
    var allowed = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'NAV', 'HEADER', 'FOOTER', 'MAIN'];
    if (allowed.indexOf(focused) === -1) {
      throw new Error('Unexpected focused element: ' + focused);
    }
  });

  test('should handle Escape key to close modals', function(page) {
    page.goto('/');
    page.click('[data-action="auth"]');
    page.keyboard.press('Escape');
    var modal = document.getElementById('authModal');
    var modalClass = modal ? modal.getAttribute('class') : '';
    if (modalClass.indexOf('open') !== -1) {
      throw new Error('Modal should be closed after Escape');
    }
  });
});
});
