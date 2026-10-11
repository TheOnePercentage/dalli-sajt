/**
 * Internal Linking Engine — DALLI SEO
 * Builds and manages internal link graph across all content types
 * Connects: products ↔ categories ↔ blog ↔ guides ↔ collections ↔ reviews
 */

class InternalLinkingEngine {
  constructor() {
    this.nodes = new Map(); // id -> { type, data, url, title }
    this.edges = new Map(); // fromId -> Set of { toId, type, anchor, weight }
    this.initialized = false;
  }

  /**
   * Initialize engine with all content data
   * @param {Object} data - All content data
   */
  async init(data = {}) {
    const {
      categories = [],
      products = [],
      blogPosts = [],
      guides = [],
      reviews = [],
      collections = []
    } = data;

    this.clear();

    // Add category nodes
    categories.forEach(cat => this.addNode({
      id: `category:${cat.slug}`,
      type: 'category',
      slug: cat.slug,
      title: cat.title,
      url: `/${cat.slug}.html`,
      data: cat
    }));

    // Add product nodes
    products.forEach(prod => this.addNode({
      id: `product:${prod.id}`,
      type: 'product',
      slug: prod.slug,
      title: prod.name,
      url: `/proizvod-${prod.slug}.html`,
      data: prod
    }));

    // Add blog post nodes
    blogPosts.forEach(post => this.addNode({
      id: `blog:${post.id}`,
      type: 'blog',
      slug: post.slug,
      title: post.title,
      url: `/blog-${post.slug}.html`,
      data: post
    }));

    // Add guide nodes
    guides.forEach(guide => this.addNode({
      id: `guide:${guide.id}`,
      type: 'guide',
      slug: guide.slug,
      title: guide.title,
      url: `/vodic-${guide.slug}.html`,
      data: guide
    }));

    // Add review nodes (grouped by product)
    const reviewsByProduct = {};
    reviews.forEach(review => {
      if (!reviewsByProduct[review.productId]) reviewsByProduct[review.productId] = [];
      reviewsByProduct[review.productId].push(review);
    });
    Object.entries(reviewsByProduct).forEach(([productId, revs]) => {
      this.addNode({
        id: `reviews:${productId}`,
        type: 'reviews',
        slug: `reviews-${productId}`,
        title: `Recenzije za ${productId}`,
        url: `/proizvod-${productId}.html#reviews`,
        data: { productId, reviews: revs }
      });
    });

    // Add collection nodes
    collections.forEach(col => this.addNode({
      id: `collection:${col.slug}`,
      type: 'collection',
      slug: col.slug,
      title: col.title,
      url: `/kolekcija-${col.slug}.html`,
      data: col
    }));

    // Build edges
    this.buildProductCategoryEdges(products, categories);
    this.buildBlogProductEdges(blogPosts, products);
    this.buildCategoryCollectionEdges(categories, collections);
    this.buildGuideEdges(guides, products, categories);
    this.buildFAQEdges(guides, products, categories);
    this.buildReviewEdges(reviewsByProduct, products);

    this.initialized = true;
    console.log('[InternalLinking] Initialized:', this.nodes.size, 'nodes,', this.countEdges(), 'edges');
  }

  addNode(node) {
    this.nodes.set(node.id, node);
    this.edges.set(node.id, new Set());
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
  }

  countEdges() {
    let count = 0;
    this.edges.forEach(set => count += set.size);
    return count;
  }

  /**
   * Add bidirectional edge
   */
  addEdge(fromId, toId, type, anchor, weight = 1) {
    if (!this.edges.has(fromId)) this.edges.set(fromId, new Set());
    if (!this.edges.has(toId)) this.edges.set(toId, new Set());

    this.edges.get(fromId).add({ toId, type, anchor, weight });
    this.edges.get(toId).add({ toId: fromId, type: 'reverse_' + type, anchor, weight });
  }

  // ==================== EDGE BUILDERS ====================

  buildProductCategoryEdges(products, categories) {
    const catMap = new Map(categories.map(c => [c.slug, c]));

    // Map product categories to category slugs
    const categorySlugMap = {
      't-shirts': 'majice',
      'tracksuits': 'trenerke',
      'hoodies': 'dukseri',
      'accessories': 'aksesoari' // not in current categories, will be skipped
    };

    products.forEach(prod => {
      const prodId = `product:${prod.id}`;

      // Primary category via mapping
      const mappedSlug = categorySlugMap[prod.category];
      if (mappedSlug && catMap.has(mappedSlug)) {
        const cat = catMap.get(mappedSlug);
        this.addEdge(prodId, `category:${cat.slug}`, 'belongs_to', `Kupi ${cat.title}`, 3);
      }

      // Gender-based category
      const genderCat = prod.gender === 'muski' ? 'muska-garderoba' : prod.gender === 'zenski' ? 'zenska-garderoba' : prod.gender === 'men' ? 'muska-garderoba' : prod.gender === 'women' ? 'zenska-garderoba' : null;
      if (genderCat && catMap.has(genderCat)) {
        this.addEdge(prodId, `category:${genderCat}`, 'gender_category', `${genderCat === 'muska-garderoba' ? 'Muška' : 'Ženska'} garderoba`, 2);
      }

      // Subcategory (e.g., majice, trenerke, dukseri) - use category mapping if subcategory not set
      const subcatMap = {
        't-shirts': 'majice',
        'tracksuits': 'trenerke',
        'hoodies': 'dukseri'
      };
      const subcatKey = prod.subcategory || prod.category;
      if (subcatKey && subcatMap[subcatKey] && catMap.has(subcatMap[subcatKey])) {
        this.addEdge(prodId, `category:${subcatMap[subcatKey]}`, 'subcategory', subcatMap[subcatKey], 2);
      }
    });
  }

  buildBlogProductEdges(blogPosts, products) {
    const categorySlugMap = {
      't-shirts': 'majice',
      'tracksuits': 'trenerke',
      'hoodies': 'dukseri',
      'accessories': 'aksesoari'
    };

    // Map blog categories to product categories
    const blogToProductCat = {
      'fashion': ['majice', 'trenerke', 'dukseri'],
      'lifestyle': ['trenerke', 'dukseri'],
      'business': ['majice', 'trenerke'],
      'technology': ['trenerke', 'dukseri']
    };

    const prodByCategory = {};
    products.forEach(p => {
      const mapped = categorySlugMap[p.category] || p.category;
      if (!prodByCategory[mapped]) prodByCategory[mapped] = [];
      prodByCategory[mapped].push(p);
    });

    blogPosts.forEach(post => {
      const postId = `blog:${post.id}`;
      // Link by category - map blog category to product categories
      const targetCats = blogToProductCat[post.categoryId] || [];
      targetCats.forEach(cat => {
        if (prodByCategory[cat]) {
          prodByCategory[cat].slice(0, 2).forEach(p => {
            this.addEdge(postId, `product:${p.id}`, 'mentions', `Pogledaj ${p.name}`, 2);
          });
        }
      });
      // Link by tags
      if (post.tags) {
        post.tags.forEach(tag => {
          products.filter(p =>
            (categorySlugMap[p.category] || p.category).includes(tag) ||
            p.tags?.includes(tag) ||
            p.name.toLowerCase().includes(tag.toLowerCase())
          ).slice(0, 2).forEach(p => {
            this.addEdge(postId, `product:${p.id}`, 'tag_match', `${p.name} (${tag})`, 1);
          });
        });
      }
      // Link by slug mention in content
      if (post.content) {
        products.forEach(p => {
          if (post.content.toLowerCase().includes(p.slug.toLowerCase()) ||
              post.content.toLowerCase().includes(p.name.toLowerCase())) {
            this.addEdge(postId, `product:${p.id}`, 'content_mention', p.name, 1);
          }
        });
      }
    });
  }

  buildCategoryCollectionEdges(categories, collections) {
    const now = new Date();
    const activeCollections = collections.filter(c => {
      if (!c.active) return false;
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      return start <= now && end >= now;
    });
    categories.forEach(cat => {
      activeCollections.forEach(col => {
        if (col.categories?.includes(cat.slug)) {
          this.addEdge(`category:${cat.slug}`, `collection:${col.slug}`, 'has_collection', `${col.title} kolekcija`, 2);
        }
      });
    });
  }

  buildGuideEdges(guides, products, categories) {
    const prodMap = new Map(products.map(p => [p.id, p]));
    const catMap = new Map(categories.map(c => [c.slug, c]));

    guides.forEach(guide => {
      const guideId = `guide:${guide.id}`;
      // Related products
      guide.relatedProducts?.forEach(pid => {
        if (prodMap.has(pid)) this.addEdge(guideId, `product:${pid}`, 'recommends', `Preporučeno: ${prodMap.get(pid).name}`, 3);
      });
      // Related categories
      guide.relatedCategories?.forEach(catSlug => {
        if (catMap.has(catSlug)) this.addEdge(guideId, `category:${catSlug}`, 'covers_category', `Sve ${catMap.get(catSlug).title.toLowerCase()}`, 2);
      });
      // Related guides
      guide.relatedGuides?.forEach(gid => {
        this.addEdge(guideId, `guide:${gid}`, 'related_guide', 'Srodni vodič', 1);
      });
    });
  }

  buildFAQEdges(guides, products, categories) {
    const prodMap = new Map(products.map(p => [p.id, p]));
    const catMap = new Map(categories.map(c => [c.slug, c]));

    guides.forEach(guide => {
      const guideId = `guide:${guide.id}`;
      guide.faq?.forEach(faq => {
        const text = (faq.question + ' ' + faq.answer).toLowerCase();
        // Find product mentions
        products.forEach(p => {
          if (text.includes(p.slug.toLowerCase()) || text.includes(p.name.toLowerCase())) {
            this.addEdge(guideId, `product:${p.id}`, 'faq_mentions', `Detalji: ${p.name}`, 2);
          }
        });
        // Find category mentions
        categories.forEach(c => {
          if (text.includes(c.slug.toLowerCase()) || text.includes(c.title.toLowerCase())) {
            this.addEdge(guideId, `category:${c.slug}`, 'faq_mentions_category', c.title, 1);
          }
        });
      });
    });
  }

  buildReviewEdges(reviewsByProduct, products) {
    Object.entries(reviewsByProduct).forEach(([productId, revs]) => {
      const prod = products.find(p => p.id == productId);
      if (!prod) return;
      const reviewId = `reviews:${productId}`;
      const prodId = `product:${productId}`;
      this.addEdge(prodId, reviewId, 'has_reviews', `${revs.length} recenzija`, 3);
      // Link approved reviews to product
      revs.filter(r => r.status === 'approved').forEach(r => {
        // Could add individual review nodes if needed
      });
    });
  }

  // ==================== PUBLIC API ====================

  /**
   * Get category link for a product
   */
  getProductCategoryLinks(productId) {
    const prodId = `product:${productId}`;
    const edges = this.edges.get(prodId) || new Set();
    return Array.from(edges)
      .filter(e => e.type === 'belongs_to' || e.type === 'gender_category' || e.type === 'subcategory')
      .map(e => ({
        node: this.nodes.get(e.toId),
        anchor: e.anchor,
        type: e.type
      }));
  }

  /**
   * Get related blog posts for a product (reverse edges: product <- blog)
   */
  getProductBlogLinks(productId) {
    const prodId = `product:${productId}`;
    const edges = this.edges.get(prodId) || new Set();
    return Array.from(edges)
      .filter(e => e.type === 'reverse_mentions' || e.type === 'reverse_tag_match' || e.type === 'reverse_content_mention')
      .map(e => ({
        node: this.nodes.get(e.toId),
        anchor: e.anchor,
        type: e.type
      }));
  }

  /**
   * Get products mentioned in a blog post (forward edges: blog -> product)
   */
  getBlogProductLinks(blogId) {
    const blogNodeId = `blog:${blogId}`;
    const edges = this.edges.get(blogNodeId) || new Set();
    return Array.from(edges)
      .filter(e => e.type === 'mentions' || e.type === 'tag_match' || e.type === 'content_mention')
      .map(e => ({
        node: this.nodes.get(e.toId),
        anchor: e.anchor,
        type: e.type
      }));
  }

  /**
   * Get collection for a category
   */
  getCategoryCollectionLinks(categorySlug) {
    const catId = `category:${categorySlug}`;
    const edges = this.edges.get(catId) || new Set();
    return Array.from(edges)
      .filter(e => e.type === 'has_collection')
      .map(e => ({
        node: this.nodes.get(e.toId),
        anchor: e.anchor
      }));
  }

  /**
   * Get related content widget data (mixed types)
   */
  getRelatedContent(currentNodeId, limit = 6) {
    const edges = this.edges.get(currentNodeId) || new Set();
    const current = this.nodes.get(currentNodeId);
    if (!current) return [];

    // Prioritize different types
    const typePriority = {
      'product': 1,
      'blog': 2,
      'guide': 2,
      'reviews': 3,
      'category': 3,
      'collection': 4
    };

    const related = Array.from(edges)
      .filter(e => this.nodes.has(e.toId))
      .map(e => {
        const node = this.nodes.get(e.toId);
        return {
          node,
          edgeType: e.type,
          anchor: e.anchor,
          weight: e.weight * (typePriority[node.type] || 5)
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);

    return related;
  }

  /**
   * Get FAQ target links for a guide
   */
  getGuideFAQLinks(guideId) {
    const id = `guide:${guideId}`;
    const edges = this.edges.get(id) || new Set();
    return Array.from(edges)
      .filter(e => e.type === 'faq_mentions' || e.type === 'faq_mentions_category')
      .map(e => ({
        node: this.nodes.get(e.toId),
        anchor: e.anchor,
        type: e.type
      }));
  }

  /**
   * Generate link report for SEO audit
   */
  generateLinkReport() {
    const report = {
      totalNodes: this.nodes.size,
      totalEdges: this.countEdges(),
      byType: {},
      orphanNodes: [],
      highAuthority: [],
      anchorDistribution: {}
    };

    this.nodes.forEach((node, id) => {
      report.byType[node.type] = (report.byType[node.type] || 0) + 1;
      const edges = this.edges.get(id) || new Set();
      const inbound = this.getInboundCount(id);
      const outbound = edges.size;

      if (inbound === 0 && outbound === 0) {
        report.orphanNodes.push({ id, type: node.type, title: node.title });
      }

      if (inbound > 5) {
        report.highAuthority.push({ id, type: node.type, title: node.title, inbound });
      }

      edges.forEach(e => {
        report.anchorDistribution[e.anchor] = (report.anchorDistribution[e.anchor] || 0) + 1;
      });
    });

    return report;
  }

  getInboundCount(nodeId) {
    let count = 0;
    this.edges.forEach(edges => {
      edges.forEach(e => { if (e.toId === nodeId) count++; });
    });
    return count;
  }

  /**
   * Render HTML for related content widget
   */
  renderRelatedWidget(currentNodeId, limit = 4) {
    const related = this.getRelatedContent(currentNodeId, limit);
    if (!related.length) return '';

    return `
      <section class="related-content" aria-label="Srodni sadržaj">
        <h3 class="related-title">Možda vas zanimaju</h3>
        <div class="related-grid">
          ${related.map(r => `
            <article class="related-item" data-type="${r.node.type}">
              <a href="${r.node.url}" class="related-link" aria-label="${r.anchor}">
                <span class="related-type type-${r.node.type}">${this.getTypeLabel(r.node.type)}</span>
                <h4 class="related-heading">${r.node.title}</h4>
              </a>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  getTypeLabel(type) {
    const labels = {
      product: 'Proizvod',
      blog: 'Članak',
      guide: 'Vodič',
      category: 'Kategorija',
      collection: 'Kolekcija',
      reviews: 'Recenzije'
    };
    return labels[type] || type;
  }

  /**
   * Export graph for debugging
   */
  exportGraph() {
    const nodes = [], edges = [];
    this.nodes.forEach((node, id) => nodes.push({ id, ...node }));
    this.edges.forEach((set, fromId) => {
      set.forEach(e => edges.push({ from: fromId, to: e.toId, type: e.type, anchor: e.anchor, weight: e.weight }));
    });
    return { nodes, edges };
  }
}

// Singleton instance
let engineInstance = null;

export function getInternalLinkingEngine() {
  if (!engineInstance) engineInstance = new InternalLinkingEngine();
  return engineInstance;
}

export { InternalLinkingEngine };
export default InternalLinkingEngine;