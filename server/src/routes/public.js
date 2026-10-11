import { Router } from 'express';
import { cache } from '../lib/cache.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

const PRODUCT_INCLUDE = {
  colors: { orderBy: { sortOrder: 'asc' } },
  sizes: { orderBy: { sortOrder: 'asc' }, include: { inventory: true } },
  category: { select: { id: true, slug: true, name: true } },
  collection: { select: { id: true, slug: true, title: true } },
  genders: { include: { gender: { select: { id: true, slug: true, title: true } } } },
  styleOccasions: { include: { styleOccasion: { select: { id: true, slug: true, title: true } } } },
};

function shapeProduct(p) {
  if (!p) return p;
  const totalStock = (p.sizes || []).reduce((n, s) => n + (s.inventory?.quantity || 0), 0);
  return {
    ...p,
    totalStock,
    genderIds: (p.genders || []).map(g => g.gender.id),
    styleOccasionIds: (p.styleOccasions || []).map(s => s.styleOccasion.id),
  };
}

function pagination(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

// GET /products - normalized hierarchy filters
router.get('/products', async (req, res, next) => {
  try {
    const { page, limit, skip, take } = pagination(req);
    const { collection, gender, category, style, search, featured, status, sort } = req.query;

    const where = {};
    if (status) where.status = status;
    else where.status = 'published';
    if (featured === 'true') where.featured = true;
    if (collection) where.collection = { slug: collection };
    if (category) where.category = { slug: category };
    if (gender) where.genders = { some: { gender: { slug: gender } } };
    if (style) where.styleOccasions = { some: { styleOccasion: { slug: style } } };
    if (search) {
      const s = String(search).toLowerCase();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { shortDescription: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { searchKeywords: { has: s } },
        { category: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const orderBy =
      sort === 'price_asc'
        ? { price: 'asc' }
        : sort === 'price_desc'
          ? { price: 'desc' }
          : sort === 'newest'
            ? { publishedAt: 'desc' }
            : [{ priority: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }];

    const key = `products:${JSON.stringify({ where, orderBy, skip, take })}`;
    const data = await cache.wrap(key, 60, async () => {
      const [products, total] = await Promise.all([
        prisma.product.findMany({ where, include: PRODUCT_INCLUDE, orderBy, skip, take }),
        prisma.product.count({ where }),
      ]);
      return { products: products.map(shapeProduct), total };
    });

    res.json({
      products: data.products,
      count: data.total,
      page,
      limit,
      totalPages: Math.ceil(data.total / take),
    });
  } catch (err) {
    next(err);
  }
});

// GET /products/:slug
router.get('/products/:slug', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: PRODUCT_INCLUDE,
    });
    if (!product || product.status !== 'published') {
      return res.status(404).json({ error: 'Product not found' });
    }
    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, status: 'published', id: { not: product.id } },
      include: PRODUCT_INCLUDE,
      take: 4,
    });
    res.json({ product: shapeProduct(product), related: related.map(shapeProduct) });
  } catch (err) {
    next(err);
  }
});

// GET /collections
router.get('/collections', async (req, res, next) => {
  try {
    const collections = await cache.wrap('collections:all', 300, () =>
      prisma.collection.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          categories: {
            include: {
              category: { select: { id: true, slug: true, name: true, sortOrder: true } },
            },
          },
          genders: { include: { gender: { select: { id: true, slug: true, title: true } } } },
        },
      })
    );
    res.json({ collections });
  } catch (err) {
    next(err);
  }
});

// GET /collections/:slug
router.get('/collections/:slug', async (req, res, next) => {
  try {
    const collection = await cache.wrap(`collection:${req.params.slug}`, 300, () =>
      prisma.collection.findUnique({
        where: { slug: req.params.slug, isActive: true },
        include: {
          categories: {
            include: {
              category: { select: { id: true, slug: true, name: true, sortOrder: true } },
            },
          },
          genders: { include: { gender: { select: { id: true, slug: true, title: true } } } },
        },
      })
    );
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    res.json({ collection });
  } catch (err) {
    next(err);
  }
});

// GET /categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await cache.wrap('categories:all', 300, () =>
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          genders: { include: { gender: { select: { id: true, slug: true } } } },
          collections: {
            include: { collection: { select: { id: true, slug: true, title: true } } },
          },
        },
      })
    );
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// GET /genders
router.get('/genders', async (req, res, next) => {
  try {
    const genders = await cache.wrap('genders:all', 300, () =>
      prisma.gender.findMany({ where: { enabled: true }, orderBy: { sortOrder: 'asc' } })
    );
    res.json({ genders });
  } catch (err) {
    next(err);
  }
});

// GET /style-occasions
router.get('/style-occasions', async (req, res, next) => {
  try {
    const styleOccasions = await cache.wrap('styles:all', 300, () =>
      prisma.styleOccasion.findMany({ where: { enabled: true }, orderBy: { sortOrder: 'asc' } })
    );
    res.json({ styleOccasions });
  } catch (err) {
    next(err);
  }
});

// GET /search - full-text-ish search across products
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ products: [], count: 0, query: '' });
    const { page, limit, skip, take } = pagination(req);
    const s = q.toLowerCase();

    const where = {
      status: 'published',
      OR: [
        { name: { contains: s, mode: 'insensitive' } },
        { shortDescription: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { searchKeywords: { has: s } },
        { sku: { contains: s, mode: 'insensitive' } },
        { category: { name: { contains: s, mode: 'insensitive' } } },
        { metaKeywords: { has: s } },
      ],
    };

    const key = `search:${s}:${page}:${limit}`;
    const data = await cache.wrap(key, 45, async () => {
      const [products, total] = await Promise.all([
        prisma.product.findMany({ where, include: PRODUCT_INCLUDE, skip, take }),
        prisma.product.count({ where }),
      ]);
      return { products: products.map(shapeProduct), total };
    });

    res.json({ products: data.products, count: data.total, query: q, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /reviews?productId=&slug=
router.get('/reviews', async (req, res, next) => {
  try {
    const where = { isApproved: true };
    if (req.query.productId) where.productId = parseInt(req.query.productId, 10);
    if (req.query.slug) where.product = { slug: req.query.slug };
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        content: true,
        isVerified: true,
        helpfulVotes: true,
        userName: true,
        photos: true,
        pros: true,
        cons: true,
        sizeFit: true,
        quality: true,
        comfort: true,
        createdAt: true,
      },
    });
    const agg = await prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: true,
    });
    res.json({
      reviews,
      count: agg._count,
      averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /faqs?type=&targetId=
router.get('/faqs', async (req, res, next) => {
  try {
    const where = { status: 'approved', enabled: true };
    if (req.query.type) where.type = req.query.type;
    if (req.query.targetId) where.targetId = req.query.targetId;
    const faqs = await prisma.faq.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { id: 'asc' }],
      take: 200,
    });
    res.json({ faqs, count: faqs.length });
  } catch (err) {
    next(err);
  }
});

// GET /blog/categories
router.get('/blog/categories', async (req, res, next) => {
  try {
    const categories = await prisma.blogCategory.findMany({ orderBy: { name: 'asc' } });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// GET /blog/posts
router.get('/blog/posts', async (req, res, next) => {
  try {
    const { page, limit, skip, take } = pagination(req);
    const where = { status: 'published' };
    if (req.query.category) where.categories = { some: { slug: req.query.category } };
    if (req.query.search) {
      const s = String(req.query.search);
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { excerpt: { contains: s, mode: 'insensitive' } },
        { content: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: 'desc' },
        include: { categories: true, seo: true },
      }),
      prisma.blogPost.count({ where }),
    ]);
    res.json({ posts, count: total, page, limit, totalPages: Math.ceil(total / take) });
  } catch (err) {
    next(err);
  }
});

// GET /blog/posts/:slug
router.get('/blog/posts/:slug', async (req, res, next) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: { categories: true, seo: true },
    });
    if (!post || post.status !== 'published')
      return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

// GET /loyalty/tiers
router.get('/loyalty/tiers', async (req, res, next) => {
  try {
    const tiers = await cache.wrap('loyalty:tiers', 300, () =>
      prisma.loyaltyTier.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { tierBenefits: { include: { benefit: true } } },
      })
    );
    res.json({ tiers });
  } catch (err) {
    next(err);
  }
});

// GET /loyalty/config - public loyalty program config
router.get('/loyalty/config', async (req, res, next) => {
  try {
    const cfg = await cache.wrap('settings:loyalty-config', 300, () =>
      prisma.siteSettings.findUnique({ where: { key: 'loyalty-config' } })
    );
    res.json({ config: cfg ? cfg.value : null });
  } catch (err) {
    next(err);
  }
});

// GET /settings/:key - whitelisted public settings only
const PUBLIC_SETTINGS = new Set([
  'featured-config',
  'personalization',
  'product360-config',
  'virtual-tryon-config',
  'community',
  'qa',
  'review-settings',
]);
router.get('/settings/:key', async (req, res, next) => {
  try {
    if (!PUBLIC_SETTINGS.has(req.params.key)) {
      return res.status(404).json({ error: 'Not found' });
    }
    const setting = await prisma.siteSettings.findUnique({ where: { key: req.params.key } });
    res.json({ key: req.params.key, value: setting ? setting.value : null });
  } catch (err) {
    next(err);
  }
});

// GET /sitemap-products - lightweight product listing for sitemap generation
router.get('/sitemap-products', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'published' },
      select: {
        slug: true,
        updatedAt: true,
        categoryId: true,
        collectionId: true,
        genders: { include: { gender: true } },
      },
    });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// --- Meilisearch Search (if available) ---
router.get('/search/meili', async (req, res, next) => {
  try {
    const { searchProducts, getSuggestions } = await import('../lib/meilisearch.js');

    const {
      q,
      collection,
      category,
      gender,
      style,
      minPrice,
      maxPrice,
      inStock,
      featured,
      sort,
      page,
      limit,
      facets,
    } = req.query;

    if (!q || !q.trim()) {
      // If no query, return suggestions or empty
      if (req.query.suggest) {
        const suggestions = await getSuggestions('', 10);
        return res.json({ suggestions });
      }
      return res.json({ products: [], count: 0, facets: {}, page: 1, limit: 24, totalPages: 0 });
    }

    const result = await searchProducts({
      q: q.trim(),
      collection,
      category,
      gender,
      style,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      inStock: inStock === 'true',
      featured: featured === 'true',
      sort,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 24,
      facets: facets
        ? facets.split(',')
        : ['collection', 'category', 'genderIds', 'styleOccasionIds', 'collectionId'],
    });

    res.json(result);
  } catch (err) {
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('Meilisearch')) {
      // Fallback to Prisma search if Meilisearch unavailable
      return next(err);
    }
    next(err);
  }
});

// Unified search (products + categories + blog)
router.get('/search/unified', async (req, res, next) => {
  try {
    const { searchAll } = await import('../lib/meilisearch.js');
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    if (!q) return res.json({ products: [], categories: [], posts: [] });

    const result = await searchAll({ q, limit });
    res.json(result);
  } catch (err) {
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('Meilisearch')) {
      return res.json({ products: [], categories: [], posts: [] });
    }
    next(err);
  }
});

// Search suggestions/autocomplete
router.get('/search/suggest', async (req, res, next) => {
  try {
    const { getSuggestions } = await import('../lib/meilisearch.js');
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit) || 8, 15);

    if (!q || q.length < 2) return res.json({ suggestions: [] });

    const suggestions = await getSuggestions(q, limit);
    res.json({ suggestions });
  } catch (err) {
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('Meilisearch')) {
      return res.json({ suggestions: [] });
    }
    next(err);
  }
});

export default router;
