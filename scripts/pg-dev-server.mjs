// pg-dev-server.mjs - lokalni PostgreSQL dev server (embedded-postgres binarne)
// Koriscenje: node scripts/pg-dev-server.mjs
// Baza: dalli @ port 5433, user: postgres, pass: dalli
import EmbeddedPostgres from 'embedded-postgres';

const PG_DATA = process.env.PG_DATA || '/tmp/opencode/dalli-pg';
const PG_PORT = Number(process.env.PG_PORT || 5433);

const pg = new EmbeddedPostgres({
  databaseDir: PG_DATA,
  user: 'postgres',
  password: 'dalli',
  port: PG_PORT,
  persistent: true,
});

async function main() {
  try {
    await pg.initialise();
    console.log('[PG] inicializovan data dir');
  } catch {
    console.log('[PG] data dir vec postoji');
  }
  try {
    await pg.start();
    console.log('[PG] server startovan');
  } catch (e) {
    console.log('[PG] start:', e.message);
  }
  try {
    await pg.createDatabase('dalli');
    console.log("[PG] baza 'dalli' kreirana");
  } catch (e) {
    console.log('[PG] baza:', e.message);
  }
  console.log(`[PG] DATABASE_URL=postgresql://postgres:dalli@localhost:${PG_PORT}/dalli`);
}

main().catch(e => {
  console.error('[PG] greska:', e);
  process.exit(1);
});
