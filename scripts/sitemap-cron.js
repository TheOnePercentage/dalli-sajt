#!/usr/bin/env node
/**
 * Sitemap Cron Job
 * Generates sitemap and pings search engines
 * Usage: node scripts/sitemap-cron.js
 * 
 * Add to crontab for daily generation:
 * 0 3 * * * /usr/bin/node /path/to/scripts/sitemap-cron.js >> /var/log/sitemap-cron.log 2>&1
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function runCommand(cmd, description) {
  console.log(`\n[${new Date().toISOString()}] ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.warn(stderr.trim());
    console.log(`  ✓ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`  ✗ ${description} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log(`SITEMAP CRON JOB STARTED - ${new Date().toISOString()}`);
  console.log('='.repeat(50));

  const results = {
    sitemap: false,
    ping: false
  };

  // 1. Generate sitemap
  results.sitemap = await runCommand(
    'node scripts/generate-sitemap.js',
    'Generating sitemap.xml'
  );

  // 2. Ping search engines
  if (results.sitemap) {
    results.ping = await runCommand(
      'node scripts/ping-sitemap.js',
      'Pinging search engines'
    );
  } else {
    console.log('\nSkipping ping due to sitemap generation failure');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`CRON JOB COMPLETED - ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  console.log(`Sitemap generation: ${results.sitemap ? '✓ Success' : '✗ Failed'}`);
  console.log(`Search engine ping: ${results.ping ? '✓ Success' : '✗ Failed'}`);

  // Log to file
  const logEntry = `${new Date().toISOString()} | Sitemap: ${results.sitemap ? 'OK' : 'FAIL'} | Ping: ${results.ping ? 'OK' : 'FAIL'}\n`;
  fs.appendFileSync('/home/alpatron/Documents/Default Project/moonlight-sajt/logs/sitemap-cron.log', logEntry);

  process.exit(results.sitemap ? 0 : 1);
}

main().catch(console.error);