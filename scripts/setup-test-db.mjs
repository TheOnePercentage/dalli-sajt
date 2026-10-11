#!/usr/bin/env node
// setup-test-db.mjs - kreira / resetuje test bazu 'dalli_test' i popunjava je
// (migracije + RBAC seed + migracija podataka), bez diranja dev baze 'dalli'.
import { execSync } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const envPath = path.join(ROOT, '.env');
if (!fs.existsSync(envPath)) {
  console.error(`[testdb] nedostaje env fajl: ${envPath}`);
  process.exit(1);
}
const envs = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) envs[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const MAIN = envs.DATABASE_URL;
const TEST_NAME = process.env.TEST_DB || 'dalli_test';
if (!MAIN) {
  console.error('[testdb] nema DATABASE_URL u .env');
  process.exit(1);
}
const url = new URL(MAIN);
const user = decodeURIComponent(url.username);
const pass = decodeURIComponent(url.password);
const host = url.hostname;
const port = url.port || '5432';
const MAINT_URL = `postgresql://${user}:${pass}@${host}:${port}/postgres`;
const TEST_URL = `postgresql://${user}:${pass}@${host}:${port}/${TEST_NAME}`;

process.env.DATABASE_URL = MAINT_URL;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
await prisma.$queryRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_NAME}" WITH (FORCE)`);
await prisma.$queryRawUnsafe(`CREATE DATABASE "${TEST_NAME}"`);
await prisma.$disconnect();
console.log(`[testdb] test baza '${TEST_NAME}' kreirana`);

const run = cmd =>
  execSync(cmd, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_URL },
  });

run('npx prisma migrate deploy');
run(`${process.execPath} scripts/seed-rbac.js`);
run(`${process.execPath} scripts/migrate-data.js --clean`);
run(`${process.execPath} scripts/fix-sequences.mjs`);
console.log(`[testdb] gotovo. TEST_URL je postavljen ka: ${TEST_URL}`);
