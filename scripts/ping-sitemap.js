#!/usr/bin/env node
/**
 * Sitemap Ping Script
 * Pings search engines after sitemap generation
 * Usage: node scripts/ping-sitemap.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SITEMAP_URL = 'https://dalli.rs/sitemap.xml';

const SEARCH_ENGINES = [
  {
    name: 'Google',
    url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  },
  {
    name: 'Bing',
    url: `https://www.bing.com/ping?siteMap=${encodeURIComponent(SITEMAP_URL)}`
  },
  {
    name: 'Yandex',
    url: `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  }
];

async function pingSearchEngine(engine) {
  try {
    console.log(`Pinging ${engine.name}...`);
    const { stdout, stderr } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" "${engine.url}"`);
    
    if (stdout === '200') {
      console.log(`  ✓ ${engine.name} pinged successfully (HTTP 200)`);
      return { engine: engine.name, success: true };
    } else {
      console.log(`  ⚠ ${engine.name} returned HTTP ${stdout}`);
      return { engine: engine.name, success: false, code: stdout };
    }
  } catch (error) {
    console.log(`  ✗ ${engine.name} ping failed: ${error.message}`);
    return { engine: engine.name, success: false, error: error.message };
  }
}

async function main() {
  console.log('Pinging search engines with sitemap...');
  console.log(`Sitemap URL: ${SITEMAP_URL}`);
  console.log('');

  const results = await Promise.all(SEARCH_ENGINES.map(pingSearchEngine));

  console.log('');
  console.log('=== PING SUMMARY ===');
  const successful = results.filter(r => r.success).length;
  console.log(`Successful: ${successful}/${SEARCH_ENGINES.length}`);
  
  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    console.log(`  ${status} ${result.engine}`);
  }

  if (successful > 0) {
    console.log('\nSitemap submitted successfully to search engines!');
  } else {
    console.log('\nWarning: No search engines accepted the ping. Check sitemap URL accessibility.');
  }
}

main().catch(console.error);