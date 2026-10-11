import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

const EXTERNAL_RESOURCES = {
  'https://cdn.dalli.rs': [
    '/css/main.css',
    '/js/main.js',
    '/fonts/inter-var.woff2'
  ],
  'https://fonts.googleapis.com': [
    '/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    '/css2?family=Playfair+Display:wght@400;500;600;700&display=swap'
  ],
  'https://fonts.gstatic.com': [
    '/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2'
  ],
  'https://connect.facebook.net': [
    '/en_US/fbevents.js',
    '/en_US/sdk.js'
  ],
  'https://connect.instagram.com': [
    '/en_US/fbevents.js'
  ],
  'https://connect.tiktok.com': [
    '/sdk.js'
  ],
  'https://tag.twitter.com': [
    '/universal.js'
  ],
  'https://www.google-analytics.com': [
    '/analytics.js',
    '/gtag/js'
  ],
  'https://www.googletagmanager.com': [
    '/gtag/js',
    '/gtm.js'
  ],
  'https://api.stripe.com': [
    '/v1/'
  ],
  'https://www.facebook.com': [
    '/tr/'
  ],
  'https://www.instagram.com': [
    '/tr/'
  ],
  'https://www.youtube.com': [
    '/embed/'
  ]
};

async function fetchResource(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchResource(response.headers.location).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function generateSRI(buffer) {
  const hash = crypto.createHash('sha384').update(buffer).digest('base64');
  return `sha384-${hash}`;
}

async function generateSRIMap() {
  const sriMap = {};
  
  console.log('Generating SRI hashes for external resources...');
  
  for (const [origin, paths] of Object.entries(EXTERNAL_RESOURCES)) {
    sriMap[origin] = {};
    
    for (const path of paths) {
      const url = `${origin}${path}`;
      try {
        console.log(`Fetching: ${url}`);
        const buffer = await fetchResource(url);
        const integrity = generateSRI(buffer);
        sriMap[origin][path] = integrity;
        console.log(`  ✓ ${path} -> ${integrity.substring(0, 20)}...`);
      } catch (error) {
        console.warn(`  ✗ Failed to fetch ${url}: ${error.message}`);
        sriMap[origin][path] = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const outputPath = join(process.cwd(), 'sri-manifest.json');
  writeFileSync(outputPath, JSON.stringify(sriMap, null, 2));
  console.log(`\nSRI manifest written to: ${outputPath}`);
  
  return sriMap;
}

function injectSRIIntoHTML(sriMap) {
  const htmlFiles = [
    'index.html',
    'products.html',
    'checkout.html',
    'cart.html',
    'muska-garderoba.html',
    'zenska-garderoba.html'
  ];
  
  for (const file of htmlFiles) {
    const filePath = join(process.cwd(), file);
    try {
      let content = readFileSync(filePath, 'utf-8');
      let modified = false;
      
      for (const [origin, resources] of Object.entries(sriMap)) {
        for (const [path, integrity] of Object.entries(resources)) {
          if (!integrity) continue;
          
          const url = `${origin}${path}`;
          const regex = new RegExp(`(src|href)=["']${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g');
          
          content = content.replace(regex, (match, attr) => {
            if (match.includes('integrity=')) return match;
            modified = true;
            return `${attr}="${url}" integrity="${integrity}" crossorigin="anonymous"`;
          });
        }
      }
      
      if (modified) {
        writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${file} with SRI attributes`);
      }
    } catch (error) {
      console.warn(`Could not process ${file}: ${error.message}`);
    }
  }
}

async function main() {
  const sriMap = await generateSRIMap();
  injectSRIIntoHTML(sriMap);
  console.log('\nSRI generation complete!');
}

main().catch(console.error);