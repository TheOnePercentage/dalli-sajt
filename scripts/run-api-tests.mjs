#!/usr/bin/env node
// run-api-tests.mjs - resetuje test bazu, startuje test server (PORT 3100)
// na 'dalli_test' bazi i pokrece integracijske testove (node --test).
// Usage: node scripts/run-api-tests.mjs   [TEST_DB=name TEST_PORT=3100]
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server');

const envPath = path.join(ROOT, '.env');
const envs = {};
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) envs[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const TEST_NAME = process.env.TEST_DB || 'dalli_test';
const TEST_PORT = Number(process.env.TEST_PORT || 3100);

// izvedi test DATABASE_URL iz dev DATABASE_URL-a (samo zameni ime baze)
const url = new URL(envs.DATABASE_URL);
url.pathname = `/${TEST_NAME}`;
const TEST_URL = url.toString();
const BASE = `http://localhost:${TEST_PORT}`;

// 1) reset + seed test baze
const setup = spawnSync(process.execPath, [path.join(__dirname, 'setup-test-db.mjs')], {
  stdio: 'inherit',
  env: { ...process.env, TEST_DB: TEST_NAME },
});
if (setup.status !== 0) {
  console.error('[api-tests] setup-test-db neuspeo - prekidam');
  process.exit(setup.status ?? 1);
}

// 2) start test server (izolovan: test baza, memory cache, port 3100)
const serverEnv = {
  ...process.env,
  ...envs,
  PORT: String(TEST_PORT),
  DATABASE_URL: TEST_URL,
  REDIS_URL: '',
  NODE_ENV: 'test',
};
const server = spawn(process.execPath, ['index.js'], {
  cwd: SERVER,
  env: serverEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', d => process.stdout.write(`[server] ${d}`));
server.stderr.on('data', d => process.stderr.write(`[server] ${d}`));

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitHealth() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/api/v1/health`);
      if (r.ok) {
        const h = await r.json();
        console.log(`[api-tests] server spreman (db=${h.db}, cache=${h.cache})`);
        return;
      }
    } catch {
      /* not yet */
    }
    await sleep(250);
  }
  throw new Error('test server se nije podigao');
}

let done = false;
try {
  await waitHealth();
} catch (err) {
  console.error('[api-tests]', err.message);
  server.kill('SIGTERM');
  process.exit(1);
}

// 3) pokreni node --test
const tests = spawn(
  process.execPath,
  ['--test', path.join(SERVER, 'tests', 'api.integration.test.mjs')],
  {
    cwd: SERVER,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_URL, BASE_URL: BASE },
  }
);

tests.on('close', code => {
  done = true;
  server.kill('SIGTERM');
  process.exit(code ?? 1);
});
process.on('SIGINT', () => {
  if (!done) server.kill('SIGTERM');
  process.exit(130);
});
