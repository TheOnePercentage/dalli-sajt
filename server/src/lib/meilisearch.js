import { PrismaClient } from '@prisma/client';
import { Meilisearch } from 'meilisearch';

const MEILI_HOST = process.env.MEILI_HOST || 'http://localhost:7700';
const MEILI_API_KEY = process.env.MEILI_API_KEY || 'dalli_master_key';

let meiliClient = null;
let prismaClient = null;

export function getMeiliClient() {
  if (!meiliClient) {
    meiliClient = new Meilisearch({ host: MEILI_HOST, apiKey: MEILI_API_KEY });
  }
  return meiliClient;
}

function getPrismaClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }
  return prismaClient;
}

export const INDEXES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  BLOG_POSTS: 'blog_posts',
};

async function waitForTask(index, taskUid) {
  const task = await index.waitForTask(taskUid, { timeOutMs: 60000, intervalMs: 100 });
  if (task.status !== 'succeeded') {
    throw new Error(`Task failed: ${task.error?.message || 'Unknown error'}`);
  }
  return task;
}

export async function setupIndexes() {
  const meili = getMeiliClient();

  try {
    await meili.createIndex(INDEXES.PRODUCTS, { primaryKey: 'id' });
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }
  const productsIndex = meili.index(INDEXES.PRODUCTS);
  await productsIndex.updateSettings({
    searchableAttributes: [
      'name', 'slug', 'shortDescription', 'description',
      'sku', 'category', 'collection', 'brand',
      'searchKeywords', 'metaKeywords',
    ],
    filterableAttributes: [
      'collection', 'category', 'status', 'featured', 'genderIds',
      'styleOccasionIds', 'price', 'totalStock',
    ],
    sortableAttributes: ['price', 'createdAt', 'publishedAt', 'priority', 'salesCount', 'viewCount'],
    rankingRules: [
      'words', 'typo', 'proximity', 'attribute', 'sort', 'exactness',
      'desc(priority)', 'desc(featured)', 'desc(salesCount)',
    ],
    synonyms: {
      'majica': ['t-shirt', 'tširt', 't shirt'],
      'trenerka': ['tracksuit', 'sportski odelo'],
      'duks': ['hoodie', 'kapuljača'],
      'kožulja': ['shirt', 'poslovna kožulja'],
      'sako': ['blazer', 'sak', 'formalni sako'],
      'organski': ['organic', 'bio', 'eko'],
      'pamuk': ['cotton', '100% pamuk'],
    },
    stopWords: ['i', 'a', 'u', 'za', 'na', 'od', 'sa', 'je', 'da', 'ne', 'ili', 'kod', 'od'],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      disableOnAttributes: ['sku'],
    },
    faceting: { maxValuesPerFacet: 100 },
    pagination: { maxTotalHits: 1000 },
  });
  console.log('✅ Products index configured');

  try {
    await meili.createIndex(INDEXES.CATEGORIES, { primaryKey: 'id' });
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }
  const categoriesIndex = meili.index(INDEXES.CATEGORIES);
  await categoriesIndex.updateSettings({
    searchableAttributes: ['name', 'slug', 'description'],
    filterableAttributes: ['collectionId', 'gender', 'isActive'],
    sortableAttributes: ['sortOrder', 'name'],
  });
  console.log('✅ Categories index configured');

  try {
    await meili.createIndex(INDEXES.BLOG_POSTS, { primaryKey: 'id' });
  } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }
  const blogIndex = meili.index(INDEXES.BLOG_POSTS);
  await blogIndex.updateSettings({
    searchableAttributes: ['title', 'excerpt', 'content', 'tags', 'author'],
    filterableAttributes: ['status', 'categoryIds', 'publishedAt'],
    sortableAttributes: ['publishedAt', 'createdAt'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    typoTolerance: { enabled: true },
  });
  console.log('✅ Blog posts index configured');
}

export async function indexProduct(product) {
  const meili = getMeiliClient();
  const index = meili.index(INDEXES.PRODUCTS);

  const doc = {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    price: product.price,
    salePrice: product.salePrice,
    currency: product.currency,
    brand: product.brand,
    images: product.images,
    collection: product.collection?.slug || product.collection,
    category: product.category?.slug || product.category,
    categoryId: product.categoryId,
    collectionId: product.collectionId,
    genderIds: product.genderIds || [],
    styleOccasionIds: product.styleOccasionIds || [],
    status: product.status,
    featured: product.featured,
    priority: product.priority,
    publishedAt: product.publishedAt,
    totalStock: product.totalStock,
    searchKeywords: product.searchKeywords || [],
    metaKeywords: product.metaKeywords || [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };

  const task = await index.addDocuments([doc]);
  await waitForTask(index, task.taskUid);
}

export async function indexProducts(products) {
  const meili = getMeiliClient();
  const index = meili.index(INDEXES.PRODUCTS);

  const docs = products.map(p => ({
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
    collection: p.collection?.slug || p.collection,
    category: p.category?.slug || p.category,
    categoryId: p.categoryId,
    collectionId: p.collectionId,
    genderIds: p.genderIds || [],
    styleOccasionIds: p.styleOccasionIds || [],
    status: p.status,
    featured: p.featured,
    priority: p.priority,
    publishedAt: p.publishedAt,
    totalStock: p.totalStock,
    searchKeywords: p.searchKeywords || [],
    metaKeywords: p.metaKeywords || [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const task = await index.addDocuments(docs);
  await waitForTask(index, task.taskUid);
}

export async function deleteProduct(productId) {
  const meili = getMeiliClient();
  const index = meili.index(INDEXES.PRODUCTS);
  const task = await index.deleteDocument(productId);
  await waitForTask(index, task.taskUid);
}

export async function indexCategory(category) {
  const meili = getMeiliClient();
  const index = meili.index(INDEXES.CATEGORIES);

  const doc = {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description || '',
    image: category.image,
    collectionId: category.collectionId,
    gender: category.gender,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };

  const task = await index.addDocuments([doc]);
  await waitForTask(index, task.taskUid);
}

export async function indexBlogPost(post) {
  const meili = getMeiliClient();
  const index = meili.index(INDEXES.BLOG_POSTS);

  const doc = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || '',
    content: post.content || '',
    featuredImage: post.featuredImage,
    author: post.author,
    status: post.status,
    publishedAt: post.publishedAt,
    tags: post.tags || [],
    categoryIds: post.categories?.map(c => c.id) || [],
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };

  const task = await index.addDocuments([doc]);
  await waitForTask(index, task.taskUid);
}

async function prismaSearchProducts(params) {
  const p = new PrismaClient();
  try {
    const {
      q = '',
      collection,
      category,
      gender,
      style,
      minPrice,
      maxPrice,
      inStock,
      featured,
      sort = 'relevance',
      page = 1,
      limit = 24,
    } = params;

    const where = {};
    if (collection) where.collection = { slug: collection };
    if (category) where.category = { slug: category };
    if (gender) where.genders = { some: { gender: { slug: gender } } };
    if (minPrice !== undefined) where.price = { ...where.price, gte: minPrice };
    if (maxPrice !== undefined) where.price = { ...where.price, lte: maxPrice };
    if (inStock) where.sizes = { some: { inventory: { quantity: { gt: 0 } } } };
    if (featured) where.featured = true;
    where.status = 'published';
    if (params.q) {
      const s = params.q.toLowerCase();
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { shortDescription: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { searchKeywords: { has: params.q } },
        { category: { name: { contains: params.q, mode: 'insensitive' } } },
      ];
    }

    const orderBy = params.sort === 'price_asc' ? { price: 'asc' } :
      params.sort === 'price_desc' ? { price: 'desc' } :
      params.sort === 'newest' ? { publishedAt: 'desc' } :
      params.sort === 'popular' ? [{ salesCount: 'desc' }, { viewCount: 'desc' }] :
      [{ priority: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }];

    const [products, total] = await Promise.all([
      p.product.findMany({
        where,
        include: { colors: true, sizes: { include: { inventory: true } }, category: true, collection: true, genders: { include: { gender: true } } },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy,
      }),
      p.product.count({ where }),
    ]);

    return { products, total, facets: {}, page: params.page, limit: params.limit, totalPages: Math.ceil(total / params.limit) };
  } finally {
    await PrismaClient.prototype.$disconnect.call(p);
  }
}

export async function searchProducts(params) {
  const meili = getMeiliClient();
  const index = meili.index(INDEXES.PRODUCTS);

  const {
    q = '',
    collection,
    category,
    gender,
    style,
    minPrice,
    maxPrice,
    inStock,
    featured,
    sort = 'relevance',
    page = 1,
    limit = 24,
    facets = ['collection', 'category', 'genderIds', 'styleOccasionIds', 'collectionId'],
  } = params;

  const filter = [];
  if (collection) filter.push(`collection = "${collection}"`);
  if (category) filter.push(`category = "${category}"`);
  if (gender) filter.push(`genderIds = "${gender}"`);
  if (style) filter.push(`styleOccasionIds = "${style}"`);
  if (minPrice !== undefined) filter.push(`price >= ${minPrice}`);
  if (maxPrice !== undefined) filter.push(`price <= ${maxPrice}`);
  if (inStock) filter.push('totalStock > 0');
  if (featured) filter.push('featured = true');
  filter.push('status = "published"');

  const sortMap = {
    relevance: [],
    price_asc: ['price:asc'],
    price_desc: ['price:desc'],
    newest: ['publishedAt:desc'],
    popular: ['salesCount:desc', 'viewCount:desc'],
    featured: ['featured:desc', 'priority:desc'],
  };

  try {
    const result = await meili.index(INDEXES.PRODUCTS).search(params.q, {
      filter: filter.length ? filter.join(' AND ') : 'status = "published"',
      sort: sortMap[params.sort] || [],
      facets,
      limit: Math.min(params.limit, 100),
      offset: (params.page - 1) * params.limit,
      attributesToRetrieve: [
        'id', 'sku', 'slug', 'name', 'shortDescription', 'price', 'salePrice',
        'currency', 'brand', 'images', 'collection', 'category',
        'genderIds', 'styleOccasionIds', 'status', 'featured', 'totalStock',
      ],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      showMatchesPosition: true,
      showRankingScore: true,
      showRankingScoreDetails: true,
    });

    return {
      products: result.hits,
      total: result.estimatedTotalHits,
      facets: result.facetDistribution,
      processingTimeMs: result.processingTimeMs,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(result.estimatedTotalHits / params.limit),
    };
  } catch (err) {
    console.warn('Meilisearch search failed, falling back to Prisma:', err.message);
    return prismaSearchProducts(params);
  }
}

export async function searchAll(params) {
  const meili = getMeiliClient();

  const { q = '', limit = 10 } = params;

  try {
    const [products, categories, posts] = await Promise.all([
      meili.index(INDEXES.PRODUCTS).search(params.q, {
        filter: 'status = "published"',
        limit: Math.min(params.limit, 20),
        attributesToRetrieve: ['id', 'slug', 'name', 'price', 'salePrice', 'currency', 'images', 'collection', 'category'],
      }),
      meili.index(INDEXES.CATEGORIES).search(params.q, { limit: 5 }),
      meili.index(INDEXES.BLOG_POSTS).search(params.q, { filter: 'status = "published"', limit: 5 }),
    ]);

    return {
      products: products.hits,
      categories: categories.hits,
      posts: posts.hits,
    };
  } catch (err) {
    console.warn('Meilisearch unified search failed:', err.message);
    return { products: [], categories: [], posts: [] };
  }
}

export async function getSuggestions(q, limit = 5) {
  const meili = getMeiliClient();
  const index = meili.index(INDEXES.PRODUCTS);

  try {
    const result = await index.search(q, {
      filter: 'status = "published"',
      limit,
      attributesToRetrieve: ['name', 'sku', 'slug'],
      showRankingScore: false,
    });

    return result.hits.map(h => ({ name: h.name, slug: h.slug, sku: h.sku }));
  } catch (err) {
    console.warn('Meilisearch suggestions failed:', err.message);
    return [];
  }
}