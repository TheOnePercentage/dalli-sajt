/**
 * STEP 6: RBAC seed - 6 roles, permissions matrix, default accounts.
 * Usage: node scripts/seed-rbac.js
 * Idempotent (upserts).
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PERMISSIONS = [
  // products / catalog
  { id: 'products.read', name: 'Pregled proizvoda', group: 'products' },
  { id: 'products.write', name: 'Kreiranje/izmena proizvoda', group: 'products' },
  { id: 'products.delete', name: 'Brisanje proizvoda', group: 'products' },
  { id: 'categories.read', name: 'Pregled kategorija', group: 'products' },
  { id: 'categories.write', name: 'Upravljanje kategorijama', group: 'products' },
  { id: 'inventory.read', name: 'Pregled zaliha', group: 'inventory' },
  { id: 'inventory.write', name: 'Menjanje zaliha', group: 'inventory' },
  // orders / payments / customers
  { id: 'orders.read', name: 'Pregled porudžbina', group: 'orders' },
  { id: 'orders.write', name: 'Upravljanje porudžbinama', group: 'orders' },
  { id: 'payments.read', name: 'Pregled plaćanja', group: 'payments' },
  { id: 'payments.write', name: 'Upravljanje plaćanjima', group: 'payments' },
  { id: 'customers.read', name: 'Pregled kupaca', group: 'customers' },
  { id: 'customers.write', name: 'Upravljanje kupcima', group: 'customers' },
  // reviews / content
  { id: 'reviews.read', name: 'Pregled recenzija', group: 'reviews' },
  { id: 'reviews.moderate', name: 'Moderacija recenzija', group: 'reviews' },
  { id: 'content.read', name: 'Pregled sadržaja', group: 'content' },
  { id: 'content.write', name: 'Uređivanje sadržaja (blog, FAQ, SEO)', group: 'content' },
  // campaigns / cms
  { id: 'campaigns.read', name: 'Pregled kampanja', group: 'campaigns' },
  { id: 'campaigns.write', name: 'Upravljanje kampanjama', group: 'campaigns' },
  { id: 'cms.read', name: 'Pregled CMS-a', group: 'cms' },
  { id: 'cms.write', name: 'Uređivanje CMS-a (teme, banneri, home)', group: 'cms' },
  // analytics / settings
  { id: 'analytics.read', name: 'Analitika i izveštaji', group: 'analytics' },
  { id: 'settings.read', name: 'Pregled podešavanja', group: 'settings' },
  { id: 'settings.write', name: 'Menjanje podešavanja', group: 'settings' },
  // users / roles / audit
  { id: 'users.read', name: 'Pregled korisnika i osoblja', group: 'users' },
  { id: 'users.write', name: 'Upravljanje korisnicima i ulogama', group: 'users' },
  { id: 'audit.read', name: 'Pregled audit logova', group: 'audit' },
];

const ALL = PERMISSIONS.map(p => p.id);

const ROLES = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Vlasnik - pun pristup svemu',
    sortOrder: 1,
    permissions: ALL,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Administrator - pun pristup svim operacijama',
    sortOrder: 2,
    permissions: ALL,
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Menadžer - katalog, porudžbine, kupci, analitika',
    sortOrder: 3,
    permissions: [
      'products.read',
      'products.write',
      'categories.read',
      'categories.write',
      'inventory.read',
      'inventory.write',
      'orders.read',
      'orders.write',
      'payments.read',
      'customers.read',
      'customers.write',
      'reviews.read',
      'reviews.moderate',
      'campaigns.read',
      'campaigns.write',
      'content.read',
      'content.write',
      'cms.read',
      'analytics.read',
      'settings.read',
    ],
  },
  {
    id: 'editor',
    name: 'Editor',
    description: 'Urednik - sadržaj, katalog, bez brisanja i finansija',
    sortOrder: 4,
    permissions: [
      'products.read',
      'products.write',
      'categories.read',
      'categories.write',
      'inventory.read',
      'orders.read',
      'customers.read',
      'reviews.read',
      'reviews.moderate',
      'content.read',
      'content.write',
      'cms.read',
      'cms.write',
      'campaigns.read',
      'analytics.read',
      'settings.read',
    ],
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Podrška - porudžbine, kupci, recenzije',
    sortOrder: 5,
    permissions: [
      'products.read',
      'categories.read',
      'inventory.read',
      'orders.read',
      'orders.write',
      'payments.read',
      'customers.read',
      'reviews.read',
      'reviews.moderate',
      'content.read',
      'analytics.read',
    ],
  },
  {
    id: 'customer',
    name: 'Customer',
    description: 'Kupac - lični nalog, bez admin pristupa',
    sortOrder: 6,
    permissions: [],
  },
];

async function main() {
  console.log('RBAC seed...\n');

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { id: p.id },
      update: { name: p.name, group: p.group },
      create: p,
    });
  }
  console.log(`  permissions: ${PERMISSIONS.length}`);

  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: { name: r.name, description: r.description, sortOrder: r.sortOrder },
      create: { id: r.id, name: r.name, description: r.description, sortOrder: r.sortOrder },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: r.id } });
    await prisma.rolePermission.createMany({
      data: r.permissions.map(permissionId => ({ roleId: r.id, permissionId })),
    });
  }
  console.log(`  roles: ${ROLES.length}`);

  // Default accounts (password from env or dev defaults - CHANGE IN PRODUCTION)
  const accounts = [
    { email: 'owner@dalli.rs', role: 'owner', firstName: 'DALLI', lastName: 'Owner' },
    { email: 'admin@dalli.rs', role: 'admin', firstName: 'DALLI', lastName: 'Admin' },
    { email: 'manager@dalli.rs', role: 'manager', firstName: 'DALLI', lastName: 'Manager' },
    { email: 'editor@dalli.rs', role: 'editor', firstName: 'DALLI', lastName: 'Editor' },
    { email: 'support@dalli.rs', role: 'support', firstName: 'DALLI', lastName: 'Support' },
  ];

  for (const acc of accounts) {
    const password = process.env.SEED_PASSWORD || 'Dalli!Dev2026';
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {},
      create: {
        email: acc.email,
        passwordHash,
        firstName: acc.firstName,
        lastName: acc.lastName,
        isActive: true,
        emailVerified: new Date(),
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: acc.role } },
      update: {},
      create: { userId: user.id, roleId: acc.role },
    });
  }
  console.log(
    `  accounts: ${accounts.length} (password: ${process.env.SEED_PASSWORD || 'Dalli!Dev2026'})`
  );

  const roleCount = await prisma.role.count();
  const permCount = await prisma.permission.count();
  const rpCount = await prisma.rolePermission.count();
  const userCount = await prisma.user.count();

  console.log('\n=== VALIDATION ===');
  const checks = [
    ['roles', ROLES.length, roleCount],
    ['permissions', PERMISSIONS.length, permCount],
    ['rolePermissions', ROLES.reduce((n, r) => n + r.permissions.length, 0), rpCount],
    ['users', accounts.length, userCount],
  ];
  let failed = 0;
  for (const [name, exp, act] of checks) {
    const ok = exp === act;
    if (!ok) failed++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}: expected=${exp} actual=${act}`);
  }
  console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED'}`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main()
  .catch(e => {
    console.error('SEED FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
