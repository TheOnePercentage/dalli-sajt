import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import crypto from 'crypto';

function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

function processHtmlFile(filePath, nonce) {
  let content = readFileSync(filePath, 'utf-8');
  
  const nonceAttr = `nonce="${nonce}"`;
  
  content = content.replace(
    /<script(?![^>]*nonce=)([^>]*)>/gi,
    `<script$1 ${nonceAttr}>`
  );
  
  content = content.replace(
    /<style(?![^>]*nonce=)([^>]*)>/gi,
    `<style$1 ${nonceAttr}>`
  );
  
  content = content.replace(
    /<link(?=[^>]*rel=["']stylesheet["'])(?![^>]*nonce=)([^>]*)>/gi,
    `<link$1 ${nonceAttr}>`
  );
  
  const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'nonce-${nonce}' https://cdn.dalli.rs https://fonts.googleapis.com https://connect.facebook.net https://connect.instagram.com https://connect.tiktok.com https://tag.twitter.com https://www.google-analytics.com https://www.googletagmanager.com; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://cdn.dalli.rs; font-src 'self' data: https://fonts.gstatic.com https://cdn.dalli.rs; img-src 'self' data: https://cdn.dalli.rs https://www.google-analytics.com https://www.googletagmanager.com; connect-src 'self' https://api.dalli.rs https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com wss://api.dalli.rs; frame-src 'self' https://www.facebook.com https://www.instagram.com https://www.youtube.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://dalli.rs; manifest-src 'self'; worker-src 'self' blob:; report-uri /api/security/csp-report; trusted-types dalla-trusted-types;">`;
  
  if (content.includes('<meta http-equiv="Content-Security-Policy"')) {
    content = content.replace(
      /<meta http-equiv="Content-Security-Policy"[^>]*>/i,
      cspMetaTag
    );
  } else if (content.includes('<head>')) {
    content = content.replace('<head>', `<head>\n    ${cspMetaTag}`);
  } else if (content.includes('<HEAD>')) {
    content = content.replace('<HEAD>', `<HEAD>\n    ${cspMetaTag}`);
  }
  
  const trustedTypesScript = `<script ${nonceAttr}>
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      window.trustedTypes.createPolicy('dalla-trusted-types', {
        createHTML: (string) => string,
        createScript: (string) => string,
        createScriptURL: (url) => url
      });
    }
  </script>`;
  
  if (content.includes('</head>')) {
    content = content.replace('</head>', `${trustedTypesScript}\n  </head>`);
  } else if (content.includes('</HEAD>')) {
    content = content.replace('</HEAD>', `${trustedTypesScript}\n  </HEAD>`);
  }
  
  writeFileSync(filePath, content, 'utf-8');
  console.log(`Processed: ${filePath} with nonce: ${nonce.substring(0, 8)}...`);
}

function processDirectory(dir) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stats = statSync(filePath);
    
    if (stats.isDirectory()) {
      processDirectory(filePath);
    } else if (extname(file).toLowerCase() === '.html') {
      const nonce = generateNonce();
      processHtmlFile(filePath, nonce);
    }
  }
}

const distDir = join(process.cwd(), 'dist');
const publicDir = join(process.cwd(), 'public');

if (process.argv.includes('--dist')) {
  if (statSync(distDir, { throwIfNoEntry: false })?.isDirectory()) {
    console.log('Processing dist directory...');
    processDirectory(distDir);
  }
} else if (statSync(publicDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.log('Processing public directory...');
  processDirectory(publicDir);
} else {
  const htmlFiles = ['index.html', 'products.html', 'checkout.html', 'cart.html', 'muska-garderoba.html', 'zenska-garderoba.html'];
  for (const file of htmlFiles) {
    const filePath = join(process.cwd(), file);
    try {
      statSync(filePath);
      const nonce = generateNonce();
      processHtmlFile(filePath, nonce);
    } catch (e) {
      console.log(`Skipping ${file} (not found)`);
    }
  }
}

console.log('CSP nonce generation complete!');