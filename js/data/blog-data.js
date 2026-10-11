/**
 * Blog Data Layer
 * Centralized data access for blog posts, authors, categories, tags
 */

// Load products data dynamically
async function loadProductsData() {
  const response = await fetch('/data/products.json');
  const data = await response.json();
  return data;
}

let blogDataCache = null;

async function fetchBlogData() {
  if (blogDataCache) return blogDataCache;
  const data = await loadProductsData();
  blogDataCache = {
    posts: data.posts || [],
    authors: data.authors || [],
    categories: data.categories || [],
    tags: data.tags || []
  };
  return blogDataCache;
}

export async function getBlogData() {
  return fetchBlogData();
}

export const getPostBySlug = async (slug) => {
  const data = await getBlogData();
  return data.posts.find(p => p.slug === slug) || null;
};

export const getPostsByCategory = async (categoryId) => {
  const data = await getBlogData();
  return data.posts.filter(p => p.categoryId === categoryId);
};

export const getPostsByAuthor = async (authorId) => {
  const data = await getBlogData();
  return data.posts.filter(p => p.authorId === authorId);
};

export const getPostsByTag = async (tag) => {
  const data = await getBlogData();
  return data.posts.filter(p => p.tags?.includes(tag));
};

export const getRelatedPosts = async (post, limit = 3) => {
  const data = await getBlogData();
  return data.posts
    .filter(p => p.categoryId === post.categoryId && p.slug !== post.slug)
    .slice(0, limit);
};

export const getPostsByCollection = async (collection) => {
  const data = await getBlogData();
  return data.posts.filter(p => p.collection === collection);
};

export const getPostsByStyleOccasion = async (occasion) => {
  const data = await getBlogData();
  return data.posts.filter(p => p.styleOccasion?.includes(occasion));
};

export const getAllAuthors = async () => {
  const data = await getBlogData();
  return data.authors;
};

export const getAllCategories = async () => {
  const data = await getBlogData();
  return data.categories;
};

export const getAllTags = async () => {
  const data = await getBlogData();
  return data.tags;
};

export const getAuthorById = async (id) => {
  const data = await getBlogData();
  return data.authors.find(a => a.id === id) || null;
};

export const getCategoryById = async (id) => {
  const data = await getBlogData();
  return data.categories.find(c => c.id === id) || null;
};

export const getTagById = async (id) => {
  const data = await getBlogData();
  return data.tags.find(t => t.id === id) || null;
};

// Search index helpers
export const searchPosts = async (query, options = {}) => {
  const { 
    category, 
    author, 
    tag, 
    dateFrom, 
    dateTo, 
    limit = 20,
    offset = 0
  } = options;
  
  const data = await getBlogData();
  let results = [...data.posts];
  
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(p => 
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    );
  }
  
  if (category) {
    results = results.filter(p => p.categoryId === category);
  }
  
  if (author) {
    results = results.filter(p => p.authorId === author);
  }
  
  if (tag) {
    results = results.filter(p => p.tags?.includes(tag));
  }
  
  if (dateFrom) {
    results = results.filter(p => new Date(p.date) >= new Date(dateFrom));
  }
  
  if (dateTo) {
    results = results.filter(p => new Date(p.date) <= new Date(dateTo));
  }
  
  // Sort by date desc
  results.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Pagination
  return results.slice(offset, offset + limit);
};

export const getBlogStats = async () => {
  const data = await getBlogData();
  return {
    totalPosts: data.posts.length,
    totalAuthors: data.authors.length,
    totalCategories: data.categories.length,
    totalTags: data.tags.length,
    postsByCategory: data.categories.map(c => ({
      category: c.id,
      name: c.name,
      count: data.posts.filter(p => p.categoryId === c.id).length
    })),
    postsByAuthor: data.authors.map(a => ({
      author: a.id,
      name: a.name,
      count: data.posts.filter(p => p.authorId === a.id).length
    })),
    recentPosts: [...data.posts]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        date: p.date,
        category: p.categoryId,
        readingTime: p.readingTime
      })
    )
  };
};

export default {
  blogData: getBlogData(),
  getPostBySlug,
  getPostsByCategory,
  getPostsByAuthor,
  getPostsByTag,
  getRelatedPosts,
  getPostsByCollection,
  getPostsByStyleOccasion,
  getAllAuthors,
  getAllCategories,
  getAllTags,
  getAuthorById,
  getCategoryById,
  getTagById,
  searchPosts,
  getBlogStats
};