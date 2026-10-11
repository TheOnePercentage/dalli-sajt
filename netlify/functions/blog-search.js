/**
 * Netlify Function - Blog Search API
 * Provides search, filtering, and pagination for blog posts
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
    console.error('[Blog Search] Failed to load blog data:', err);
    return { posts: [], authors: [], categories: [], tags: [] };
  }
}

function normalizeQuery(query) {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeQuery(text).split(' ').filter(t => t.length > 1);
}

function searchPosts(index, query, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = 'relevance',
    category,
    author,
    tag,
    dateFrom,
    dateTo
  } = options;

  let posts = index.posts || [];
  const tokens = tokenize(query);

  // Full-text search
  if (query) {
    posts = posts.filter(post => {
      const searchable = [
        post.title,
        post.excerpt,
        post.content,
        ...(post.tags || []),
        post.categoryId,
        post.authorId
      ].join(' ').toLowerCase();

      return tokens.every(token => searchable.includes(token));
    });
  }

  // Facet filters
  if (category) {
    posts = posts.filter(p => p.categoryId === category);
  }
  if (author) {
    posts = posts.filter(p => p.authorId === author);
  }
  if (tag) {
    posts = posts.filter(p => p.tags?.includes(tag));
  }
  if (dateFrom) {
    posts = posts.filter(p => new Date(p.date) >= new Date(dateFrom));
  }
  if (dateTo) {
    posts = posts.filter(p => new Date(p.date) <= new Date(dateTo));
  }

  // Sort
  switch (sort) {
    case 'date-asc':
      posts.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'date-desc':
      posts.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'popular':
      posts.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'reading-time':
      posts.sort((a, b) => (parseInt(b.readingTime) || 0) - (parseInt(a.readingTime) || 0));
      break;
    case 'relevance':
    default:
      // Already filtered by relevance
      break;
  }

  // Pagination
  const total = posts.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const results = posts.slice(start, start + limit);

  // Facets
  const facets = {
    categories: {},
    authors: {},
    tags: {}
  };

  index.posts.forEach(post => {
    facets.categories[post.categoryId] = (facets.categories[post.categoryId] || 0) + 1;
    facets.authors[post.authorId] = (facets.authors[post.authorId] || 0) + 1;
    (post.tags || []).forEach(tag => {
      facets.tags[tag] = (facets.tags[tag] || 0) + 1;
    });
  });

  return {
    results: results.map(post => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      categoryId: post.categoryId,
      authorId: post.authorId,
      tags: post.tags,
      date: post.date,
      readingTime: post.readingTime,
      featuredImage: post.featuredImage
    })),
    total,
    page,
    limit,
    totalPages,
    facets: {
      categories: Object.entries(facets.categories).map(([value, count]) => ({ value, count })),
      authors: Object.entries(facets.authors).map(([value, count]) => ({ value, count })),
      tags: Object.entries(facets.tags).map(([value, count]) => ({ value, count }))
    }
  };
}

export default async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const index = loadIndex();
    const params = event.queryStringParameters || {};

    const query = params.q || params.query || '';
    const page = parseInt(params.page) || 1;
    const limit = Math.min(parseInt(params.limit) || 20, 100);
    const sort = params.sort || 'relevance';
    const category = params.category;
    const author = params.author;
    const tag = params.tag;
    const dateFrom = params.dateFrom;
    const dateTo = params.dateTo;

    const result = searchPosts(loadBlogData(), query, {
      page,
      limit,
      sort,
      category,
      author,
      tag,
      dateFrom,
      dateTo
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      })
    };
  } catch (err) {
    console.error('[Blog Search] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Search failed',
        message: err.message
      })
    };
  }
}