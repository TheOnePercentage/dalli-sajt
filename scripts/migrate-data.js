/**
 * DALLI data/*.json -> PostgreSQL (Prisma v2) migration
 * Usage: node scripts/migrate-data.js [--clean]
 * Idempotent (upserts + skipDuplicates); --clean wipes migrated models first.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const ROOT = path.join(__dirname, '..');
const load = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
const CLEAN = process.argv.includes('--clean');

const report = [];
function check(name, expected, actual) {
  const pass = expected === actual;
  report.push({ name, expected, actual, pass });
  return pass;
}

function parseNetlifyRedirects() {
  const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  const out = [];
  const re =
    /\[\[redirects\]\]\s*\n\s*from\s*=\s*"([^"]+)"\s*\n\s*to\s*=\s*"([^"]+)"\s*\n\s*status\s*=\s*(\d+)/g;
  let m;
  while ((m = re.exec(toml)) !== null) {
    out.push({ fromPath: m[1], toPath: m[2], statusCode: parseInt(m[3], 10) });
  }
  return out;
}

async function clean() {
  console.log('--clean: wiping migrated models...');
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.productColor.deleteMany();
  await prisma.productStyleOccasion.deleteMany();
  await prisma.productGender.deleteMany();
  await prisma.productTranslation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categorySeo.deleteMany();
  await prisma.categoryGender.deleteMany();
  await prisma.collectionCategory.deleteMany();
  await prisma.collectionGender.deleteMany();
  await prisma.collectionContent.deleteMany();
  await prisma.category.deleteMany();
  await prisma.styleOccasionCollection.deleteMany();
  await prisma.styleOccasion.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.gender.deleteMany();
  await prisma.review.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.blogPostSeo.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.blogCategory.deleteMany();
  await prisma.loyaltyTierBenefit.deleteMany();
  await prisma.loyaltyBenefit.deleteMany();
  await prisma.loyaltyTier.deleteMany();
  await prisma.seoEntry.deleteMany();
  await prisma.redirect.deleteMany();
  await prisma.siteSettings.deleteMany();
}

async function migrateCatalog(cat) {
  // 1) Base entities first (no FK dependencies)
  for (const g of cat.genders) {
    await prisma.gender.upsert({
      where: { id: g.id },
      update: {
        slug: g.slug,
        title: g.title,
        description: g.description,
        sortOrder: g.order,
        enabled: g.enabled,
      },
      create: {
        id: g.id,
        slug: g.slug,
        title: g.title,
        description: g.description,
        sortOrder: g.order,
        enabled: g.enabled,
      },
    });
  }
  check('genders', cat.genders.length, await prisma.gender.count());

  for (const c of cat.collections) {
    await prisma.collection.upsert({
      where: { id: c.id },
      update: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        sortOrder: c.order,
        isActive: c.enabled,
      },
      create: {
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        sortOrder: c.order,
        isActive: c.enabled,
      },
    });
  }
  check('collections', cat.collections.length, await prisma.collection.count());

  for (const c of cat.categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {
        slug: c.slug,
        name: c.title,
        description: c.description,
        sortOrder: c.order,
        isActive: c.enabled,
      },
      create: {
        id: c.id,
        slug: c.slug,
        name: c.title,
        description: c.description,
        sortOrder: c.order,
        isActive: c.enabled,
      },
    });
  }
  check('categories', cat.categories.length, await prisma.category.count());

  for (const s of cat.styleOccasions) {
    await prisma.styleOccasion.upsert({
      where: { id: s.id },
      update: {
        slug: s.slug,
        title: s.title,
        description: s.description,
        sortOrder: s.order,
        enabled: s.enabled,
      },
      create: {
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        sortOrder: s.order,
        enabled: s.enabled,
      },
    });
  }
  check('styleOccasions', cat.styleOccasions.length, await prisma.styleOccasion.count());

  // 2) Junction links (all parents exist now)
  for (const c of cat.collections) {
    await prisma.collectionGender.createMany({
      data: c.genders.map(gid => ({ collectionId: c.id, genderId: gid })),
      skipDuplicates: true,
    });
    await prisma.collectionCategory.createMany({
      data: c.categories.map(cid => ({ collectionId: c.id, categoryId: cid })),
      skipDuplicates: true,
    });
  }

  for (const c of cat.categories) {
    await prisma.categoryGender.createMany({
      data: c.genders.map(gid => ({ categoryId: c.id, genderId: gid })),
      skipDuplicates: true,
    });
    await prisma.collectionCategory.createMany({
      data: c.collections.map(colId => ({ collectionId: colId, categoryId: c.id })),
      skipDuplicates: true,
    });
  }

  for (const s of cat.styleOccasions) {
    await prisma.styleOccasionCollection.createMany({
      data: s.collections.map(colId => ({ styleOccasionId: s.id, collectionId: colId })),
      skipDuplicates: true,
    });
  }
}

async function migrateProducts(productsData, faqKeys) {
  const products = productsData.products || productsData;
  let colorCount = 0;
  let sizeCount = 0;
  let stockSum = 0;
  let inventoryRows = 0;
  let genderLinks = 0;
  let styleLinks = 0;
  let productFaqs = 0;

  for (const p of products) {
    const cms = p.cms || {};
    const seo = p.seo || {};
    const metaKeywords =
      typeof seo.keywords === 'string'
        ? seo.keywords
            .split(',')
            .map(k => k.trim())
            .filter(Boolean)
        : seo.keywords || [];

    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        shortDescription: p.shortDescription,
        price: p.price,
        salePrice: p.salePrice ?? null,
        currency: p.currency || 'RSD',
        brand: (p.structuredData && p.structuredData.brand) || 'DALLI',
        images: p.images,
        collectionId: p.collection || null,
        categoryId: p.category || null,
        status: cms.status || 'published',
        featured: !!cms.featured,
        bestseller: !!cms.bestseller,
        newArrival: !!cms.newArrival,
        priority: cms.priority || 0,
        publishedAt: cms.publishedAt ? new Date(cms.publishedAt) : null,
        metaTitle: seo.metaTitle || null,
        metaDescription: seo.metaDescription || null,
        metaKeywords,
        altText: p.altText || null,
        viewCount: cms.viewCount || 0,
        cartAddCount: cms.cartAddCount || 0,
        salesCount: cms.salesCount || 0,
        searchKeywords: cms.searchKeywords || [],
        metadata: {
          specifications: p.specifications || null,
          breadcrumbs: p.breadcrumbs || null,
          structuredData: p.structuredData || null,
          hierarchyPaths: p.hierarchyPaths || null,
          primaryHierarchy: p.primaryHierarchy || null,
          categoryLabel: p.categoryLabel || null,
          lookIds: cms.lookIds || null,
          virtualTryOn: cms.virtualTryOn || null,
          product360: cms.product360 || null,
          loyalty: p.loyalty || null,
        },
      },
      create: {
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        shortDescription: p.shortDescription,
        price: p.price,
        salePrice: p.salePrice ?? null,
        currency: p.currency || 'RSD',
        brand: (p.structuredData && p.structuredData.brand) || 'DALLI',
        images: p.images,
        collectionId: p.collection || null,
        categoryId: p.category || null,
        status: cms.status || 'published',
        featured: !!cms.featured,
        bestseller: !!cms.bestseller,
        newArrival: !!cms.newArrival,
        priority: cms.priority || 0,
        publishedAt: cms.publishedAt ? new Date(cms.publishedAt) : null,
        metaTitle: seo.metaTitle || null,
        metaDescription: seo.metaDescription || null,
        metaKeywords,
        altText: p.altText || null,
        viewCount: cms.viewCount || 0,
        cartAddCount: cms.cartAddCount || 0,
        salesCount: cms.salesCount || 0,
        searchKeywords: cms.searchKeywords || [],
        metadata: {
          specifications: p.specifications || null,
          breadcrumbs: p.breadcrumbs || null,
          structuredData: p.structuredData || null,
          hierarchyPaths: p.hierarchyPaths || null,
          primaryHierarchy: p.primaryHierarchy || null,
          categoryLabel: p.categoryLabel || null,
          lookIds: cms.lookIds || null,
          virtualTryOn: cms.virtualTryOn || null,
          product360: cms.product360 || null,
          loyalty: p.loyalty || null,
        },
      },
    });

    // Genders
    const genders = Array.isArray(p.gender) ? p.gender : [p.gender];
    const gLinks = genders.filter(Boolean).map(gid => ({ productId: p.id, genderId: gid }));
    if (gLinks.length) {
      await prisma.productGender.createMany({ data: gLinks, skipDuplicates: true });
      genderLinks += gLinks.length;
    }

    // Style / occasions
    const sos = Array.isArray(p.styleOccasion)
      ? p.styleOccasion
      : p.styleOccasion
        ? [p.styleOccasion]
        : [];
    const sLinks = sos.map(sid => ({ productId: p.id, styleOccasionId: sid }));
    if (sLinks.length) {
      await prisma.productStyleOccasion.createMany({ data: sLinks, skipDuplicates: true });
      styleLinks += sLinks.length;
    }

    // Colors
    if (Array.isArray(p.colors) && p.colors.length) {
      await prisma.productColor.createMany({
        data: p.colors.map((c, i) => ({
          productId: p.id,
          name: c.name,
          hex: c.hex || null,
          sortOrder: i,
        })),
        skipDuplicates: true,
      });
      colorCount += p.colors.length;
    }

    // Sizes + inventory
    const inv = p.inventory || {};
    if (Array.isArray(p.sizes) && p.sizes.length) {
      for (let i = 0; i < p.sizes.length; i++) {
        const s = p.sizes[i];
        const size = await prisma.productSize.upsert({
          where: { productId_name: { productId: p.id, name: s.size } },
          update: { sortOrder: i },
          create: { productId: p.id, name: s.size, sortOrder: i },
        });
        await prisma.inventory.upsert({
          where: { productSizeId: size.id },
          update: { quantity: s.stock || 0 },
          create: {
            productSizeId: size.id,
            quantity: s.stock || 0,
            lowStockThreshold: inv.lowStockThreshold ?? 10,
            allowBackorder: !!inv.allowBackorder,
            trackInventory: inv.trackInventory !== false,
          },
        });
        inventoryRows++;
        sizeCount++;
        stockSum += s.stock || 0;
      }
    }

    // Product FAQs -> Faq (type product), deduped against faqs.json by question+targetId
    if (Array.isArray(p.faq) && p.faq.length) {
      const now = new Date();
      const rows = p.faq
        .map(q => ({ q, key: `${q.question}|product:${p.id}` }))
        .filter(({ key }) => !faqKeys.has(key))
        .map(({ q, key }) => {
          faqKeys.add(key);
          return {
            question: q.question,
            answer: q.answer,
            type: 'product',
            targetId: `product:${p.id}`,
            keywords: q.keywords || [],
            priority: q.priority ?? 0,
            status: 'approved',
            enabled: true,
            viewCount: q.viewCount || 0,
            helpfulCount: q.helpfulCount || 0,
            createdAt: q.createdAt ? new Date(q.createdAt) : now,
          };
        });
      if (rows.length) await prisma.faq.createMany({ data: rows });
      productFaqs += rows.length;
    }
  }

  check('products', products.length, await prisma.product.count());
  check('productColors', colorCount, await prisma.productColor.count());
  check('productSizes', sizeCount, await prisma.productSize.count());
  check('inventory rows', sizeCount, await prisma.inventory.count());
  check(
    'inventory totalStock (sum sizes)',
    stockSum,
    (await prisma.inventory.aggregate({ _sum: { quantity: true } }))._sum.quantity || 0
  );
  check('productGender links', genderLinks, await prisma.productGender.count());
  check('productStyleOccasion links', styleLinks, await prisma.productStyleOccasion.count());

  // Price integrity
  const badPrices = await prisma.product.count({ where: { price: { lte: 0 } } });
  check('products with price > 0', 0, badPrices);
  const badSlugs = await prisma.$queryRaw`SELECT count(*)::int AS n FROM (
    SELECT slug FROM "Product" GROUP BY slug HAVING count(*) > 1) t`;
  check('duplicate product slugs', 0, Number(badSlugs[0].n));

  return { productFaqs, products: products.length, stockSum };
}

async function migrateReviews(reviewsData) {
  const reviews = reviewsData.reviews;
  for (const r of reviews) {
    await prisma.review.create({
      data: {
        productId: r.productId,
        userId: null, // no real accounts yet; author kept denormalized
        rating: r.rating,
        title: r.title,
        content: r.text,
        isVerified: !!r.verifiedPurchase,
        isApproved: r.status === 'approved',
        helpfulVotes: r.helpfulVotes || 0,
        notHelpfulVotes: r.notHelpfulVotes || 0,
        adminNotes: r.adminNote || null,
        userName: r.userName || null,
        variantId: r.variantId || null,
        orderId: r.orderId || null,
        photos: r.photos && r.photos.length ? r.photos : null,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt || r.createdAt),
      },
    });
  }
  check('reviews', reviews.length, await prisma.review.count());
  check(
    'siteSettings: review-settings',
    1,
    await prisma.siteSettings.count({ where: { key: 'review-settings' } })
  );
}

async function migrateFaqs(faqsData) {
  const faqs = faqsData.faqs;
  const typeMap = { category: 'general', product: 'product', guide: 'guide' };
  const keys = new Set();
  await prisma.faq.createMany({
    data: faqs.map(f => {
      keys.add(`${f.question}|${f.targetId || ''}`);
      return {
        question: f.question,
        answer: f.answer,
        type: typeMap[f.type] || 'general',
        targetId: f.targetId || null,
        keywords: f.keywords || [],
        priority: f.priority ?? 0,
        status: f.status === 'published' ? 'approved' : f.status,
        enabled: true,
        viewCount: f.viewCount || 0,
        helpfulCount: f.helpfulCount || 0,
        createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
      };
    }),
  });
  check('faqs (from faqs.json)', faqs.length, keys.size);
  check('faqs rows inserted', faqs.length, await prisma.faq.count());
  return keys;
}

async function migrateBlog(blog) {
  for (const c of blog.categories) {
    await prisma.blogCategory.upsert({
      where: { id: c.id },
      update: { slug: c.slug, name: c.name, description: c.description },
      create: { id: c.id, slug: c.slug, name: c.name, description: c.description },
    });
  }
  await prisma.blogCategory.upsert({
    where: { slug: 'guides' },
    update: { name: 'Vodiči za kupovinu', description: 'DALLI buying guides' },
    create: { slug: 'guides', name: 'Vodiči za kupovinu', description: 'DALLI buying guides' },
  });

  const authors = new Map((blog.authors || []).map(a => [a.id, a.name]));

  for (const p of blog.posts) {
    const post = await prisma.blogPost.upsert({
      where: { slug: p.slug },
      update: { title: p.title },
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        featuredImage: p.featuredImage || null,
        author: authors.get(p.authorId) || p.authorId || null,
        status: 'published',
        publishedAt: new Date(p.date),
      },
    });
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { categories: { connect: { id: p.categoryId } } },
    });
    if (p.seo || p.jsonLd || p.title_en) {
      await prisma.blogPostSeo.upsert({
        where: { blogPostId: post.id },
        update: {},
        create: {
          blogPostId: post.id,
          metaTitle: (p.seo && p.seo.metaTitle) || p.metaTitle_sr || null,
          metaDescription: (p.seo && p.seo.metaDescription) || p.metaDescription_sr || null,
          metaKeywords: p.seo && p.seo.keywords ? p.seo.keywords.join(', ') : null,
          structuredData: {
            jsonLd: p.jsonLd || null,
            tags: p.tags || [],
            readingTime: p.readingTime || null,
            locale: p.locale || 'sr-RS',
            translations: p.title_en
              ? {
                  sr: {
                    title: p.title_sr,
                    excerpt: p.excerpt_sr,
                    metaTitle: p.metaTitle_sr,
                    metaDescription: p.metaDescription_sr,
                    keywords: p.keywords_sr,
                  },
                  en: {
                    title: p.title_en,
                    excerpt: p.excerpt_en,
                    metaTitle: p.metaTitle_en,
                    metaDescription: p.metaDescription_en,
                    keywords: p.keywords_en,
                  },
                }
              : null,
          },
        },
      });
    }
  }
  check('blogCategories', blog.categories.length + 1, await prisma.blogCategory.count());
  check('blogPosts', blog.posts.length, await prisma.blogPost.count());
}

async function migrateGuides(guidesData) {
  let n = 0;
  for (const g of guidesData.guides) {
    const post = await prisma.blogPost.upsert({
      where: { slug: g.slug },
      update: { title: g.title },
      create: {
        slug: g.slug,
        title: g.title,
        excerpt: g.excerpt,
        content: g.content,
        featuredImage: g.featuredImage || null,
        author: g.author || 'DALLI',
        status: g.status === 'published' ? 'published' : g.status,
        publishedAt: g.publishedAt ? new Date(g.publishedAt) : new Date(),
      },
    });
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { categories: { connect: { slug: 'guides' } } },
    });
    await prisma.blogPostSeo.upsert({
      where: { blogPostId: post.id },
      update: {},
      create: {
        blogPostId: post.id,
        metaTitle: g.seo && g.seo.metaTitle ? g.seo.metaTitle : null,
        metaDescription: g.seo && g.seo.metaDescription ? g.seo.metaDescription : null,
        metaKeywords:
          g.seo && g.seo.keywords
            ? Array.isArray(g.seo.keywords)
              ? g.seo.keywords.join(', ')
              : g.seo.keywords
            : null,
        ogImage: g.seo && g.seo.ogImage ? g.seo.ogImage : null,
        structuredData: {
          canonicalUrl: g.seo && g.seo.canonicalUrl ? g.seo.canonicalUrl : null,
          guideCategory: g.category,
          readingTime: g.readingTime || null,
          relatedProducts: g.relatedProducts || [],
          relatedCategories: g.relatedCategories || [],
          relatedGuides: g.relatedGuides || [],
          tableOfContents: g.tableOfContents || [],
        },
      },
    });
    n++;
  }
  return n;
}

async function migrateLoyalty(loyalty) {
  let tierIdx = 0;
  for (const t of loyalty.tiers) {
    await prisma.loyaltyTier.upsert({
      where: { id: t.id },
      update: { label: t.label },
      create: { id: t.id, label: t.label },
    });
    await prisma.loyaltyTier.update({
      where: { id: t.id },
      data: {
        labelEn: t.labelEn || null,
        description: t.description || null,
        minSpent: t.minSpent || 0,
        minOrders: t.minOrders || 0,
        color: t.color || null,
        gradient: t.gradient || null,
        icon: t.icon || null,
        sortOrder: tierIdx,
      },
    });
    for (const bId of t.benefits || []) {
      const b = loyalty.benefits[bId];
      if (!b) continue;
      await prisma.loyaltyBenefit.upsert({
        where: { id: bId },
        update: { name: b.label, description: b.description },
        create: {
          id: bId,
          name: b.label,
          description: b.description,
          category: b.tierRequired || null,
        },
      });
      await prisma.loyaltyTierBenefit.createMany({
        data: [{ tierId: t.id, benefitId: bId }],
        skipDuplicates: true,
      });
    }
    tierIdx++;
  }
  // Benefits defined in JSON but not referenced by a tier
  for (const [bId, b] of Object.entries(loyalty.benefits)) {
    await prisma.loyaltyBenefit.upsert({
      where: { id: bId },
      update: {},
      create: {
        id: bId,
        name: b.label,
        description: b.description,
        category: b.tierRequired || null,
      },
    });
  }
  check('loyaltyTiers', loyalty.tiers.length, await prisma.loyaltyTier.count());
  check(
    'loyaltyBenefits',
    Object.keys(loyalty.benefits).length,
    await prisma.loyaltyBenefit.count()
  );

  await prisma.siteSettings.upsert({
    where: { key: 'loyalty-config' },
    update: {
      value: {
        points: loyalty.points,
        progress: loyalty.progress,
        notifications: loyalty.notifications,
        productFlags: loyalty.productFlags,
        analytics: loyalty.analytics,
        futureHooks: loyalty.futureHooks,
      },
    },
    create: {
      key: 'loyalty-config',
      value: {
        points: loyalty.points,
        progress: loyalty.progress,
        notifications: loyalty.notifications,
        productFlags: loyalty.productFlags,
        analytics: loyalty.analytics,
        futureHooks: loyalty.futureHooks,
      },
    },
  });
}

async function migrateCategorySeo(catSeo) {
  const entries = Object.values(catSeo.categories);
  for (const e of entries) {
    const {
      slug,
      title,
      metaTitle,
      metaDescription,
      keywords,
      ogImage,
      canonicalOverride,
      ...rest
    } = e;
    await prisma.seoEntry.upsert({
      where: {
        entityType_entityId_locale: { entityType: 'category', entityId: slug, locale: 'sr' },
      },
      update: {
        metaTitle,
        metaDescription,
        keywords: keywords || [],
        ogImage: ogImage || null,
        canonicalUrl: canonicalOverride || null,
        structuredData: { title, ...rest },
      },
      create: {
        entityType: 'category',
        entityId: slug,
        locale: 'sr',
        metaTitle,
        metaDescription,
        keywords: keywords || [],
        ogImage: ogImage || null,
        canonicalUrl: canonicalOverride || null,
        structuredData: { title, ...rest },
      },
    });
  }
  check(
    'seoEntries (category)',
    entries.length,
    await prisma.seoEntry.count({ where: { entityType: 'category' } })
  );
}

async function migrateSettingsAndRedirects() {
  const settingsFiles = [
    'featured-config.json',
    'personalization.json',
    'email-templates.json',
    'product360-config.json',
    'virtual-tryon-config.json',
    'community.json',
    'qa.json',
  ];
  let n = 0;
  for (const f of settingsFiles) {
    const key = f.replace('.json', '');
    const value = load(f);
    const existing = await prisma.siteSettings.findUnique({ where: { key } });
    if (existing) {
      await prisma.siteSettings.update({ where: { key }, data: { value } });
    } else {
      await prisma.siteSettings.create({ data: { key, value } });
    }
    n++;
  }

  const reviews = load('reviews.json');
  await prisma.siteSettings.upsert({
    where: { key: 'review-settings' },
    update: { value: reviews.settings },
    create: { key: 'review-settings', value: reviews.settings },
  });

  const blog = load('blog.json');
  await prisma.siteSettings.upsert({
    where: { key: 'blog-taxonomy' },
    update: { value: { authors: blog.authors, tags: blog.tags } },
    create: { key: 'blog-taxonomy', value: { authors: blog.authors, tags: blog.tags } },
  });
  n++;

  const redirects = parseNetlifyRedirects();
  await prisma.redirect.createMany({ data: redirects, skipDuplicates: true });
  check('redirects (netlify.toml)', redirects.length, await prisma.redirect.count());
  return n;
}

async function main() {
  console.log('DALLI data migration -> PostgreSQL\n');
  if (CLEAN) await clean();

  const cat = load('categories.json');
  await migrateCatalog(cat);

  const faqKeys = await migrateFaqs(load('faqs.json'));

  const prodReport = await migrateProducts(load('products.json'), faqKeys);
  console.log(`  products: ${prodReport.products}, stock sum: ${prodReport.stockSum}`);

  await migrateSettingsAndRedirects(); // siteSettings first so review-settings exists
  await migrateReviews(load('reviews.json'));
  await migrateBlog(load('blog.json'));
  const guideCount = await migrateGuides(load('buying-guides.json'));
  check('guides (as blog posts)', 5, guideCount);
  await migrateLoyalty(load('loyalty.json'));
  await migrateCategorySeo(load('category-seo.json'));

  // Final counts
  check(
    'total FAQs (deduped, unique by question+targetId)',
    faqKeys.size,
    await prisma.faq.count()
  );
  const faqTotal = await prisma.faq.count();
  console.log(`  FAQs total: ${faqTotal}`);
  console.log(`  siteSettings: ${await prisma.siteSettings.count()}`);

  // Report
  console.log('\n=== VALIDATION REPORT ===');
  let failed = 0;
  for (const r of report) {
    if (r.expected === null) {
      console.log(`  INFO  ${r.name}: ${r.actual}`);
      continue;
    }
    const ok = r.pass;
    if (!ok) failed++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${r.name}: expected=${r.expected} actual=${r.actual}`);
  }
  console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECK(S) FAILED'}`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main()
  .catch(e => {
    console.error('MIGRATION FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
