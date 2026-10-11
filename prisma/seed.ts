import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Load products from JSON
  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const products = productsData.products || productsData;

  console.log(`📦 Found ${products.length} products to seed`);

  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.productColor.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categorySeo.deleteMany();
  await prisma.category.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.blogCategory.deleteMany();
  await prisma.loyaltyHistory.deleteMany();
  await prisma.loyalty.deleteMany();
  await prisma.user.deleteMany();
  await prisma.admin.deleteMany();

  // Create collections
  const casualCollection = await prisma.collection.create({
    data: {
      slug: 'casual',
      name: 'Casual',
      description: 'Udobna i stilska odeća za svakodnevnu nošu',
      sortOrder: 1,
      isActive: true,
    },
  });

  const eleganceCollection = await prisma.collection.create({
    data: {
      slug: 'elegance',
      name: 'Elegance',
      description: 'Elegantna poslovna i večerna odeća za posebne prilike',
      sortOrder: 2,
      isActive: true,
    },
  });

  console.log('✅ Collections created');

  // Create categories
  const categories = [
    // Casual categories
    { slug: 't-shirts', name: 'T-Shirts', collectionId: casualCollection.id, gender: 'unisex', sortOrder: 1 },
    { slug: 'tracksuits', name: 'Trenerke', collectionId: casualCollection.id, gender: 'unisex', sortOrder: 2 },
    { slug: 'hoodies', name: 'Hoodies', collectionId: casualCollection.id, gender: 'unisex', sortOrder: 3 },
    { slug: 'essentials', name: 'Essentials', collectionId: casualCollection.id, gender: 'unisex', sortOrder: 4 },
    { slug: 'accessories', name: 'Aksesoari', collectionId: casualCollection.id, gender: 'unisex', sortOrder: 5 },
    // Elegance categories
    { slug: 'shirts', name: 'Kožulje', collectionId: eleganceCollection.id, gender: 'men', sortOrder: 1 },
    { slug: 'blazers', name: 'Sakovi', collectionId: eleganceCollection.id, gender: 'men', sortOrder: 2 },
  ];

  for (const cat of categories) {
    await prisma.category.create({
      data: {
        ...cat,
        isActive: true,
      },
    });
  }

  console.log('✅ Categories created');

  // Create products
  for (const product of products) {
    // Find the category relation
    const category = await prisma.category.findFirst({
      where: {
        slug: product.category,
        collectionId: product.collection === 'casual' ? casualCollection.id : eleganceCollection.id,
      },
    });

    await prisma.product.create({
      data: {
        id: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        salePrice: product.salePrice,
        currency: product.currency,
        brand: product.brand,
        images: JSON.stringify(product.images),
        collection: product.collection,
        category: product.category,
        categoryRelId: category?.id,
        gender: Array.isArray(product.gender) ? product.gender.join(',') : product.gender,
        inventory: JSON.stringify(product.inventory),
        metaTitle: product.seo?.metaTitle,
        metaDescription: product.seo?.metaDescription,
        metaKeywords: product.seo?.metaKeywords,
        hierarchyPaths: JSON.stringify(product.hierarchyPaths),
        primaryHierarchy: JSON.stringify(product.primaryHierarchy),
      },
    });
  }

  console.log('✅ Products created');

  // Create admin user
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('test', 12);

  await prisma.admin.create({
    data: {
      email: 'harissacirovic',
      passwordHash,
      role: 'super_admin',
      mfaEnabled: false,
      failedAttempts: 0,
    },
  });

  console.log('✅ Admin user created');

  // Create site settings
  await prisma.siteSettings.createMany({
    data: [
      { key: 'site_name', value: JSON.stringify('DALLI'), description: 'Site name' },
      { key: 'site_url', value: JSON.stringify('https://dalli.rs'), description: 'Site URL' },
      { key: 'currency', value: JSON.stringify('RSD'), description: 'Default currency' },
      { key: 'free_shipping_threshold', value: JSON.stringify(5000), description: 'Free shipping threshold' },
      { key: 'crypto_discount', value: JSON.stringify(15), description: 'Crypto payment discount %' },
    ],
  });

  console.log('✅ Site settings created');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });