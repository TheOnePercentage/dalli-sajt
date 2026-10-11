#!/usr/bin/env node
// Meilisearch indexing script
// Run with: node scripts/index-meilisearch.js

import { PrismaClient } from '@prisma/client';
import { setupIndexes } from '../server/src/lib/meilisearch.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Setting up Meilisearch indexes...');
  const { productsIndex, categoriesIndex, blogIndex } = await setupIndexes();
  console.log('✅ Indexes ready');

  console.log('📦 Indexing products...');
  const products = await prisma.product.findMany({
    where: { status: 'published' },
    include: {
      colors: true,
      sizes: { include: { inventory: true } },
      genders: { include: { gender: true } },
      styleOccasions: { include: { styleOccasion: true } },
      collection: true,
      category: true,
    },
  });

  // Shape products for Meilisearch
  const shapedProducts = products.map(p => ({
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription || '',
    description: p.description || '',
    price: p.price,
    salePrice: p.salePrice,
    currency: p.currency,
    brand: p.brand,
    images: p.images,
    collection: p.collection?.slug,
    category: p.category?.slug,
    categoryId: p.categoryId,
    collectionId: p.collectionId,
    genderIds: (p.genders || []).map(g => g.gender.id),
    styleOccasionIds: (p.styleOccasions || []).map(s => s.styleOccasion.id),
    status: p.status,
    featured: p.featured,
    priority: p.priority,
    publishedAt: p.publishedAt,
    totalStock: (p.sizes || []).reduce((n, s) => n + (s.inventory?.quantity || 0), 0),
    searchKeywords: p.searchKeywords || [],
    metaKeywords: p.metaKeywords || [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  // Import meilisearch functions
  const {
    indexProducts: indexProductsFn,
    indexCategory: indexCategoryFn,
    indexBlogPost,
  } = await import('../server/src/lib/meilisearch.js');

  console.log(`📦 Indexing ${shapedProducts.length} products...`);
  await indexProductsFn(shapedProducts);
  console.log('✅ Products indexed');

  console.log('📁 Indexing categories...');
  const categories = await prisma.category.findMany({ where: { isActive: true } });
  for (const cat of categories) {
    await indexCategoryFn(cat);
  }
  console.log('✅ Categories indexed');

  console.log('📝 Indexing blog posts...');
  const posts = await prisma.blogPost.findMany({
    where: { status: 'published' },
    include: { categories: true, seo: true },
  });
  for (const post of posts) {
    await indexBlogPost(post);
  }
  console.log('✅ Blog posts indexed');

  console.log('🎉 All indexing complete!');
}

main()
  .catch(e => {
    console.error('❌ Indexing failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
