import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadIndexHtml() {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  document.body.innerHTML = m ? m[1] : '';
}

const ALL_SECTIONS = [
  'dashboard',
  'executive',
  'orders',
  'products',
  'inventory',
  'categories',
  'customers',
  'reviews',
  'community-gallery',
  'promotions',
  'campaigns',
  'seo',
  'social',
  'analytics',
  'profit',
  'search-analytics',
  'growth',
  'diagnostics',
  'settings',
  'roles',
  'products-cms',
  'markets',
  'accounting',
];

async function bootAdmin() {
  loadIndexHtml();
  localStorage.setItem(
    'dalli_admin_auth',
    JSON.stringify({
      user: {
        id: '1',
        email: 'admin@dalli.rs',
        name: 'Admin',
        role: 'super_admin',
        permissions: ['*'],
      },
      token: 't',
    })
  );

  const mod = await import('../js/admin.js');
  const admin = new mod.default();
  await admin.init();
  return admin;
}

describe('admin boot smoke', () => {
  it('boots, mounts the shell and renders every section', async () => {
    const admin = await bootAdmin();
    expect(admin.initialized).toBe(true);
    expect(document.querySelector('#sidebar')?.innerHTML?.length).toBeGreaterThan(1000);

    const failures = [];
    for (const name of ALL_SECTIONS) {
      let ok = true;
      try {
        const result = await admin.sections.navigateTo(name);
        if (result === false) ok = false;
      } catch (error) {
        failures.push(`${name}: threw ${error && error.message ? error.message : error}`);
        continue;
      }
      if (!ok) {
        failures.push(`${name}: blocked`);
        continue;
      }
      const panel = document.querySelector(`.admin-tab-panel.active`);
      const root = document.getElementById(`${name}-section`);
      if (!panel || !root) {
        failures.push(`${name}: no mount root (panel=${!!panel} root=${!!root})`);
      } else if (!panel.contains(root)) {
        failures.push(`${name}: root not inside active panel (${panel.id})`);
      } else if ((root.innerHTML || '').trim().length < 40) {
        failures.push(`${name}: rendered empty (${(root.innerHTML || '').length})`);
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  }, 120000);
});
