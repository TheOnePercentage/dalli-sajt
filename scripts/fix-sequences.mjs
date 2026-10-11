/* Post-migration fix: explicit-ID imports leave Postgres sequences at 1.
 * Bump every serial/identity sequence past MAX(id). */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND (c.column_default LIKE 'nextval(%' OR c.is_identity = 'YES')
      AND c.column_name = 'id'
    ORDER BY c.table_name
  `);

  let fixed = 0;
  for (const { table_name: table, column_name: col } of rows) {
    const seq = await prisma.$queryRawUnsafe(
      `SELECT pg_get_serial_sequence($1, $2) AS s`,
      `"${table}"`,
      col
    );
    const seqName = seq[0]?.s;
    if (!seqName) continue;
    const max = await prisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX("${col}"), 0)::bigint AS m FROM "${table}"`
    );
    const target = Number(max[0].m);
    if (target === 0) {
      await prisma.$executeRawUnsafe(`SELECT setval($1::regclass, 1, false)`, seqName);
    } else {
      await prisma.$executeRawUnsafe(`SELECT setval($1::regclass, $2, true)`, seqName, target);
    }
    console.log(`  ${table}.${col} -> ${target}`);
    fixed++;
  }
  console.log(`SEQUENCES FIXED: ${fixed}/${rows.length}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
