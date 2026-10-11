/**
 * Review System - Standalone module for generating review schemas
 * Used by both app.jsx and generate-products.cjs
 */

function generateGTIN(sku) {
  const digits = sku.replace(/[^0-9]/g, '').padStart(12, '0').slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return digits + checkDigit;
}

class ReviewSystem {
  constructor() {
    this.reviews = [];
    this.settings = {};
    this.productReviewsCache = new Map();
  }

  async init() {
    try {
      const response = await fetch('/data/reviews.json');
      if (response.ok) {
        const data = await response.json();
        this.reviews = data.reviews || [];
        this.settings = data.settings || {};
        this.buildProductCache();
        console.log('[ReviewSystem] Initialized:', this.reviews.length, 'reviews');
      }
    } catch (e) {
      console.warn('[ReviewSystem] Failed to load reviews:', e);
    }
  }

  buildProductCache() {
    this.productReviewsCache.clear();
    this.reviews.forEach(review => {
      if (!this.productReviewsCache.has(review.productId)) {
        this.productReviewsCache.set(review.productId, []);
      }
      this.productReviewsCache.get(review.productId).push(review);
    });
  }

  getProductReviews(productId, options = {}) {
    const reviews = this.productReviewsCache.get(productId) || [];
    const { 
      status = 'approved', 
      verifiedOnly = this.settings?.requireVerifiedPurchase !== false,
      sortBy = 'helpful',
      limit = 10,
      offset = 0
    } = options;

    let filtered = reviews.filter(r => r.status === status);
    
    if (verifiedOnly) {
      filtered = filtered.filter(r => r.verifiedPurchase);
    }
    
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(a.createdAt));
        break;
      case 'highest':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        filtered.sort((a, b) => a.rating - a.rating);
        break;
      case 'helpful':
      default:
        filtered.sort((a, b) => (b.helpfulVotes - b.notHelpfulVotes) - (a.helpfulVotes - a.notHelpfulVotes));
        break;
    }
    
    return filtered.slice(offset, offset + limit);
  }

  generateReviewSchema(productId) {
    const reviews = this.getProductReviews(productId, { limit: 100 });
    if (!reviews.length) return null;

    const aggregateRating = {
      '@context': 'https://schema.org',
      '@type': 'AggregateRating',
      itemReviewed: {
        '@type': 'Product',
        name: this.getProductName(productId)
      },
      ratingValue: this.calculateAverageRating(reviews),
      reviewCount: this.reviews.filter(r => r.productId === productId && r.verifiedPurchase).length,
      bestRating: 5,
      worstRating: 1
    };

    const reviews_schema = reviews.slice(0, 10).map(review => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.userName || review.userInitials
      },
      datePublished: review.createdAt,
      reviewBody: review.text,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1
      },
      publisher: {
        '@type': 'Organization',
        name: 'DALLI'
      }
    }));

    return {
      aggregateRating,
      reviews: reviews_schema
    };
  }

  getProductName(productId) {
    // This would need access to products data - for build-time generation
    // we'll handle it differently in the generator
    return 'Product';
  }

  calculateAverageRating(reviews) {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }

  getReviewStats(productId) {
    const reviews = this.productReviewsCache.get(productId) || [];
    const approved = reviews.filter(r => r.status === 'approved');
    const verified = approved.filter(r => r.verifiedPurchase);
    
    if (!approved.length) {
      return { averageRating: 0, totalReviews: 0, verifiedCount: 0, verifiedPercent: 0, distribution: {} };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    approved.forEach(r => distribution[r.rating]++);

    return {
      averageRating: this.calculateAverageRating(approved),
      totalReviews: approved.length,
      verifiedCount: verified.length,
      verifiedPercent: Math.round((verified.length / approved.length) * 100),
      distribution
    };
  }

  calculateAverageRating(reviews) {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }
}

module.exports = { ReviewSystem };
