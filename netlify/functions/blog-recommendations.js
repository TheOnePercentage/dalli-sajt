/**
 * Netlify Function - Blog Recommendations API
 * Provides personalized blog post recommendations based on user preferences
 */

const fs = require('fs');
const path = require('path');

let blogData = null;

function loadBlogData() {
  if (blogData) return blogData;
  
  try {
    const dataPath = path.join(__dirname, '..', '..', 'data', 'blog.json');
    const raw = fs.readFileSync(dataPath, 'utf8');
    blogData = JSON.parse(raw);
    return blogData;
  } catch (err) {
    console.error('[Blog Recommendations] Failed to load blog data:', err);
    return { posts: [], authors: [], categories: [], tags: [] };
  }
}

function getRecommendations(userPrefs, options = {}) {
  const { limit = 8, excludeIds = [], context = 'homepage' } = options;
  const data = loadBlogData();
  
  if (!data.posts?.length) return [];
  
  // Score each post based on user preferences
  const scoredPosts = data.posts
    .filter(p => !excludeIds.includes(p.id))
    .map(post => {
      let score = 0;
      
      // Category preference
      if (userPrefs.collections?.casual && userPrefs.collections.casual > 0) {
        if (post.categoryId === 'fashion' || post.categoryId === 'lifestyle') {
          score += userPrefs.collections.casual * 3;
        }
      }
      if (userPrefs.collections?.elegance && userPrefs.collections.elegance > 0) {
        if (post.categoryId === 'business' || post.categoryId === 'technology') {
          score += userPrefs.collections.elegance * 3;
        }
      }
      
      // Category affinity
      if (userPrefs.categories) {
        score += (userPrefs.categories[post.categoryId] || 0) * 4;
      }
      
      // Author affinity
      if (userPrefs.authors) {
        score += (userPrefs.authors[post.authorId] || 0) * 3;
      }
      
      // Tag affinity
      if (userPrefs.tags) {
        (post.tags || []).forEach(tag => {
          score += (userPrefs.tags[tag] || 0) * 2;
        });
      }
      
      // Style occasion affinity
      if (userPrefs.styleOccasions) {
        (post.styleOccasion || []).forEach(occasion => {
          score += (userPrefs.styleOccasions[occasion] || 0) * 2;
        });
      }
      
      // Price affinity (for blog, reading time proximity)
      if (post.readingTime) {
        const userAvgTime = userPrefs.avgReadingTime || 5;
        const postTime = parseInt(post.readingTime) || 5;
        const diff = Math.abs(postTime - userAvgTime);
        if (diff < 2) score += 3;
        else if (diff < 4) score += 1;
      }
      
      // Boost for featured/bestseller/new
      if (post.featured) score += 5;
      if (post.bestseller) score += 3;
      if (post.newArrival) score += 2;
      
      return { ...post, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
  
  return {
    recommendations: scoredPosts.map(({ _score, ...post }) => ({
      ...post,
      _recommendationScore: post._score,
      _recommendationReason: getRecommendationReason(post, userPrefs)
    }))
  };
}

function getRecommendationReason(post, userPrefs) {
  const reasons = [];
  
  if (userPrefs.collections?.casual && userPrefs.collections.casual > 0 && 
      (post.categoryId === 'fashion' || post.categoryId === 'lifestyle')) {
    reasons.push('Na osnovu vaše preference za CASUAL kolekciju');
  }
  if (userPrefs.collections?.elegance && userPrefs.collections.elegance > 0 && 
      (post.categoryId === 'business' || post.categoryId === 'technology')) {
    reasons.push('Na osnovu vaše preference za ELEGANCE kolekciju');
  }
  if (userPrefs.categories?.[post.categoryId] > 2) {
    reasons.push(`Često čitate o ${post.categoryId}`);
  }
  if (userPrefs.authors?.[post.authorId] > 1) {
    reasons.push('Pratite ovog autora');
  }
  if (post.featured) reasons.push('Izabrano za vas');
  if (post.bestseller) reasons.push('Bestseller');
  if (post.newArrival) reasons.push('Novo objavljeno');
  
  return reasons.length > 0 ? reasons.join('; ') : 'Preporučeno na osnovu vaših preferencija';
}

export default async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...headers, 'Allow': 'GET, POST, OPTIONS' }, body: '' };
  }

  try {
    // Parse user preferences from request
    let userPrefs = {};
    if (event.httpMethod === 'POST') {
      userPrefs = JSON.parse(event.body || '{}');
    } else if (event.queryStringParameters?.prefs) {
      try {
        userPrefs = JSON.parse(atob(event.queryStringParameters.prefs));
      } catch (e) {}
    }
    
    // Merge with defaults
    const prefs = {
      collections: userPrefs.collections || { casual: 0, elegance: 0 },
      categories: userPrefs.categories || {},
      authors: userPrefs.authors || {},
      tags: userPrefs.tags || {},
      styleOccasions: userPrefs.styleOccasions || {},
      avgReadingTime: userPrefs.avgReadingTime || 5,
      ...userPrefs
    };

    const options = {
      limit: parseInt(event.queryStringParameters?.limit) || 8,
      excludeIds: (event.queryStringParameters?.exclude || '').split(',').filter(Boolean),
      context: event.queryStringParameters?.context || 'homepage'
    };

    const result = getRecommendations(prefs, options);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: result.recommendations,
        meta: {
          timestamp: new Date().toISOString(),
          context: options.context,
          totalConsidered: loadBlogData().posts.length
        }
      })
    };
  } catch (err) {
    console.error('[Blog Recommendations] Error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Recommendations failed', message: err.message })
    };
  }
}