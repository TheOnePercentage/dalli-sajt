#!/usr/bin/env node
/**
 * Test Runner
 * Runs all tests in the tests directory
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const TESTS_DIR = join(process.cwd(), 'tests');

async function runTests() {
  console.log('\n🚀 Starting Test Suite\n');
  
  const testFiles = readdirSync(TESTS_DIR)
    .filter(f => f.endsWith('.test.js'))
    .map(f => join(TESTS_DIR, f));

  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    try {
      await import(file);
      console.log(`\n✅ ${file}`);
    } catch (error) {
      console.error(`\n❌ ${file}:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
