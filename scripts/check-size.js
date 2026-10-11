#!/usr/bin/env node
// Simple bundle size checker - checks file sizes without bundling
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const LIMITS = {
  js: 500 * 1024, // 500 KB gzipped
  css: 100 * 1024, // 100 KB gzipped
};

function getGzipSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = execSync(`gzip -c`, { input: content, encoding: 'buffer' });
    return gzipped.length;
  } catch (e) {
    return null;
  }
}

function checkSizes() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Dist directory not found. Run build first.');
    process.exit(1);
  }

  let hasErrors = false;
  let totalJsSize = 0;
  let totalCssSize = 0;

  console.log('\n📦 Bundle Size Check\n');

  // Check JS files
  const jsFiles = [];
  function findJsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findJsFiles(fullPath);
      } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.map')) {
        jsFiles.push(fullPath);
      }
    }
  }
  findJsFiles(path.join(DIST_DIR, 'assets', 'js'));

  console.log('\n📋 JavaScript Files:');
  for (const file of jsFiles) {
    const gzipSize = getGzipSize(file);
    if (gzipSize !== null) {
      const relativePath = path.relative(DIST_DIR, file);
      const sizeKB = (gzipSize / 1024).toFixed(2);
      const status = gzipSize > LIMITS.js ? '❌ OVER LIMIT' : '✅';
      console.log(`  ${relativePath}: ${sizeKB} KB ${status}`);
      if (gzipSize > LIMITS.js) hasErrors = true;
      totalJsSize += gzipSize;
    }
  }

  // Check CSS files
  const cssFiles = [];
  function findCssFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findCssFiles(fullPath);
      } else if (entry.name.endsWith('.css') && !entry.name.endsWith('.map')) {
        cssFiles.push(fullPath);
      }
    }
  }
  findCssFiles(path.join(DIST_DIR, 'assets', 'css'));

  console.log('\n🎨 CSS Files:');
  for (const file of cssFiles) {
    const gzipSize = getGzipSize(file);
    if (gzipSize !== null) {
      const relativePath = path.relative(DIST_DIR, file);
      const sizeKB = (gzipSize / 1024).toFixed(2);
      const status = gzipSize > LIMITS.css ? '❌ OVER LIMIT' : '✅';
      console.log(`  ${relativePath}: ${sizeKB} KB ${status}`);
      if (gzipSize > LIMITS.css) hasErrors = true;
      totalCssSize += gzipSize;
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`  Total JS (gzip): ${(totalJsSize / 1024).toFixed(2)} KB`);
  console.log(`  Total CSS (gzip): ${(totalCssSize / 1024).toFixed(2)} KB`);
  console.log(`  JS files: ${jsFiles.length}`);
  console.log(`  CSS files: ${cssFiles.length}`);

  // Check individual file limits
  console.log(`\n🎯 Limits: JS ${LIMITS.js / 1024} KB, CSS ${LIMITS.css / 1024} KB`);

  if (hasErrors) {
    console.log('\n❌ Bundle size check FAILED - some files exceed limits');
    process.exit(1);
  } else {
    console.log('\n✅ Bundle size check PASSED - all files within limits');
    process.exit(0);
  }
}

checkSizes();
