/**
 * Blog Renderer
 * Handles rendering of blog posts, filters, pagination
 */

import { $, $$, formatPrice, show, hide, on, delegate } from '../core/dom.js';
import { trackEvent } from '../features/analytics.js';
import * as BlogData from '../data/blog-data.mjs';

let state = {
  posts: [],
  filteredPosts: [],
  currentPage: 1,
  postsPerPage: 9,
  filters: {
    category: '',
    author: '',
    tag: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  },
  sortBy: 'date-desc',
  totalPages: 1
};

let elements = {};

const initElements = () => {
  return {
    postsGrid: $('#postsGrid') || document.querySelector('.posts-grid'),
    postsContainer: $('#postsContainer'),
    emptyState: $('.empty-state'),
    filterCategory: $('#filterCategory'),
    filterAuthor: $('#filterAuthor'),
    filterTag: $('#filterTag'),
    filterDateFrom: $('#filterDateFrom'),
    filterDateTo: $('#filterDateTo'),
    searchInput: $('#blogSearchInput'),
    searchForm: $('#blogSearchForm'),
    sortSelect: $('#sortSelect'),
    pagination: $('.pagination'),
    pageInfo: $('#pageInfo'),
    prevBtn: $('#prevPageBtn'),
    nextBtn: $('#nextPageBtn'),
    resultsCount: $('#resultsCount'),
    loadingSpinner: $('#blogLoading'),
    resultsCountEl: $('#resultsCount'),
    categoryFilters: $('#categoryFilters'),
    authorFilters: $('#authorFilters'),
    tagFilters: $('#tagFilters'),
    loadMoreBtn: $('#loadMoreBtn')
  };
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
};

const formatReadingTime = (post) => {
  if (post.readingTime) return post.readingTime;
  const words = post.content?.split(/\s+/).length || 0;
  return Math.max(1, Math.ceil(words / 200)) + ' min read';
};

const getCategoryLabel = (categoryId) => {
  const category = BlogData.getCategoryById(categoryId);
  return category?.name || categoryId;
};

const getAuthorName = (authorId) => {
  const author = BlogData.getAuthorById(authorId);
  return author?.name || 'Admin';
};

const getTagsHtml = (tags) => {
  if (!tags || !tags.length) return '';
  return tags.map(tag => 
    `<span class="post-tag" style="background: var(--color-primary-light); color: var(--color-primary); padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">${tag}</span>`
  ).join('');
};

const renderPostCard = (post) => {
  const category = BlogData.getCategoryById(post.categoryId);
  const author = BlogData.getAuthorById(post.authorId);
  const readTime = post.readingTime || `~${Math.max(1, Math.ceil((post.content?.split(/\s+/).length || 0) / 200))} min read`;
  const featuredImage = post.featuredImage || '/images/placeholder-blog.svg';
  const excerpt = post.excerpt || (post.content?.slice(0, 150) + '...') || '';
  const formattedDate = new Date(post.date).toLocaleDateString('sr-RS', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const tagsHtml = post.tags ? post.tags.map(tag => 
    `<span class="post-tag" style="background: var(--color-primary-light); color: var(--color-primary); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; margin-right: 4px;">${tag}</span>`
  ).join('') : '';

  return `
    <article class="post-card" data-slug="${post.slug}" data-category="${post.categoryId}" data-author="${post.authorId}" data-tags="${post.tags?.join(',') || ''}" style="background: var(--color-bg-primary); border-radius: 12px; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; border: 1px solid var(--border);">
      <a href="/blog-post.html?slug=${post.slug}" class="post-link" style="display: block; text-decoration: none; color: inherit;">
        <!-- Featured Image -->
        <div class="post-image" style="height: 200px; background: var(--color-bg-tertiary); overflow: hidden; position: relative;">
          <img src="${post.featuredImage || '/images/placeholder-blog.svg'}" 
               alt="${post.title}" 
               loading="lazy" 
               style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
          <div class="post-badge" style="position: absolute; top: 12px; left: 12px; background: var(--color-primary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
            ${BlogData.getCategoryById(post.categoryId)?.name || post.categoryId}
          </div>
          <div class="reading-time" style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
            ${post.readingTime || '5 min read'}
          </div>
        </div>
        <div class="post-content" style="padding: 16px;">
          <div class="post-meta" style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 12px; color: #888;">
            <span><i class="far fa-calendar-alt"></i> ${new Date(post.date).toLocaleDateString('sr-RS', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
            <span>•</span>
            <span>${post.readingTime || Math.ceil((post.content?.split(' ').length || 0) / 200) + ' min read'}</span>
          </div>
          <h3 class="post-title" style="font-size: 16px; font-weight: 600; margin: 8px 0 8px; line-height: 1.4; color: #1a1a2e;">
            <a href="/blog-post.html?slug=${post.slug}" style="color: inherit; text-decoration: none;">${post.title}</a>
          </h3>
          <p class="post-excerpt" style="color: #666; font-size: 14px; line-height: 1.5; margin: 8px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${post.excerpt || post.content?.substring(0, 150) + '...'}</p>
          <div class="post-tags" style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
            ${post.tags ? post.tags.map(tag => `<span class="tag" style="background: #f0f0f0; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">${tag}</span>`).join('') : ''}
          </div>
          <div class="post-footer" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888;">
            <span>${post.readingTime || '5 min read'}</span>
            <span>${post.views || 0} views</span>
          </div>
        </div>
      </a>
    </article>
  `;
};

const renderPosts = (posts, container) => {
  if (!posts.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #888;">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="color: #ddd; margin: 0 auto 16px;">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <h3 style="margin: 16px 0 8px; font-size: 18px;">Nema pronađenih članka</h3>
        <p style="color: #888;">Pokušajte drugačiji filter ili pretragu.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = BlogData.blogData.posts.map(post => renderPostCard(post)).join('');
};

const updatePagination = (state, elements) => {
  if (!elements.pagination) return;
  
  const totalPages = Math.ceil(state.filteredPosts.length / state.postsPerPage);
  state.totalPages = totalPages;
  
  if (totalPages <= 1) {
    elements.pagination.style.display = 'none';
    return;
  }
  
  elements.pagination.style.display = 'flex';
  elements.pageInfo.textContent = `Strana ${state.currentPage} od ${totalPages}`;
  elements.prevBtn.disabled = state.currentPage <= 1;
  elements.nextBtn.disabled = state.currentPage >= totalPages;
};

const updateResultsCount = (state, elements) => {
  if (elements.resultsCountEl) {
    elements.resultsCountEl.textContent = state.filteredPosts.length;
  }
};

const renderFilterOptions = (state, elements) => {
  // Categories
  if (elements.filterCategory) {
    const categories = BlogData.getAllCategories();
    const currentCategory = state.filters.category;
    elements.filterCategory.innerHTML = `
      <option value="">Sve kategorije</option>
      ${BlogData.blogData.categories.map(c => 
        `<option value="${c.id}" ${c.id === currentCategory ? 'selected' : ''}>${c.name} (${BlogData.getPostsByCategory(c.id).length})</option>`
      ).join('')}
    `;
  }
  
  // Authors
  if (elements.filterAuthor) {
    const authors = BlogData.getAllAuthors();
    const currentAuthor = state.filters.author;
    elements.filterAuthor.innerHTML = `
      <option value="">Svi autori</option>
      ${authors.map(a => 
        `<option value="${a.id}" ${a.id === currentAuthor ? 'selected' : ''}>${a.name} (${BlogData.getPostsByAuthor(a.id).length})</option>`
      ).join('')}
    `;
  }
  
  // Tags
  if (elements.filterTag) {
    const allTags = [...new Set(BlogData.blogData.posts.flatMap(p => p.tags || []))];
    const currentTag = state.filters.tag;
    elements.filterTag.innerHTML = `
      <option value="">Svi tagovi</option>
      ${allTags.map(t => 
        `<option value="${t}" ${t === currentTag ? 'selected' : ''}>${t} (${BlogData.getPostsByTag(t).length})</option>`
      ).join('')}
    `;
  }
};

const applyFilters = (state) => {
  let filtered = [...BlogData.blogData.posts];
  
  if (state.filters.search) {
    const q = state.filters.search.toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(state.filters.search.toLowerCase()) ||
      p.excerpt?.toLowerCase().includes(state.filters.search.toLowerCase()) ||
      p.content?.toLowerCase().includes(state.filters.search.toLowerCase())
    );
  }
  
  if (state.filters.category) {
    filtered = filtered.filter(p => p.categoryId === state.filters.category);
  }
  
  if (state.filters.author) {
    filtered = filtered.filter(p => p.authorId === state.filters.author);
  }
  
  if (state.filters.tag) {
    filtered = filtered.filter(p => p.tags?.includes(state.filters.tag));
  }
  
  if (state.filters.dateFrom) {
    filtered = filtered.filter(p => new Date(p.date) >= new Date(state.filters.dateFrom));
  }
  
  if (state.filters.dateTo) {
    filtered = filtered.filter(p => new Date(p.date) <= new Date(state.filters.dateTo));
  }
  
  // Sort
  switch (state.sortBy) {
    case 'date-desc':
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-asc':
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'popular':
      filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
      break;
    case 'reading-time':
      filtered.sort((a, b) => {
        const aTime = parseInt(a.readingTime) || 0;
        const bTime = parseInt(b.readingTime) || 0;
        return bTime - aTime;
      });
      break;
    default:
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  
  state.filteredPosts = filtered;
  state.currentPage = 1;
};

const getPaginatedPosts = (state) => {
  const start = (state.currentPage - 1) * state.postsPerPage;
  return state.filteredPosts.slice(start, start + state.postsPerPage);
};

const renderPage = (state, elements) => {
  const posts = getPaginatedPosts(state);
  const container = document.querySelector('.posts-grid') || document.getElementById('postsContainer');
  
  if (container) {
    renderPosts(state.filteredPosts, container);
  }
  
  updatePagination(state);
  updateResultsCount(state);
};

const bindEvents = (state, elements) => {
  // Search
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', debounce(() => {
      state.filters.search = elements.searchInput.value;
      applyFilters(state);
      renderPage(state);
    }, 300));
  }
  
  // Filters
  [elements.filterCategory, elements.filterAuthor, elements.filterTag, 
   elements.filterDateFrom, elements.filterDateTo].forEach(el => {
    if (el) {
      el.addEventListener('change', () => {
        state.filters.category = elements.filterCategory?.value || '';
        state.filters.author = elements.filterAuthor?.value || '';
        state.filters.tag = elements.filterTag?.value || '';
        state.filters.dateFrom = elements.filterDateFrom?.value || '';
        state.filters.dateTo = elements.filterDateTo?.value || '';
        applyFilters(state);
        renderPage(state);
      });
    }
  });
  
  // Sort
  if (elements.sortSelect) {
    elements.sortSelect.addEventListener('change', () => {
      state.sortBy = elements.sortSelect.value;
      applyFilters(state);
      renderPage(state);
    });
  }
  
  // Search form
  if (elements.searchForm) {
    elements.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.filters.search = elements.searchInput?.value || '';
      applyFilters(state);
      renderPage(state);
    });
  }
  
  // Sort select
  if (elements.sortSelect) {
    elements.sortSelect.addEventListener('change', () => {
      state.sortBy = elements.sortSort.value;
      renderPage(state);
    });
  }
  
  // Pagination
  if (elements.prevBtn) {
    elements.prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderPage(state);
      }
    });
  }
  
  if (elements.nextBtn) {
    elements.nextBtn.addEventListener('click', () => {
      if (state.currentPage < state.totalPages) {
        state.currentPage++;
        renderPage(state);
      }
    });
  }
  
  // Load more
  if (elements.loadMoreBtn) {
    elements.loadMoreBtn.addEventListener('click', () => {
      state.postsPerPage += 9;
      renderPage(state);
    });
  }
  
  // Clear filters
  const clearBtn = document.querySelector('[data-action="clear-filters"]');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.filters = { category: '', author: '', tag: '', search: '', dateFrom: '', dateTo: '' };
      state.sortBy = 'date-desc';
      state.currentPage = 1;
      renderFilterOptions(state);
      applyFilters(state);
      renderPage(state);
    });
  }
};

const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

export const initBlogIndex = async () => {
  elements = initElements();
  state.posts = BlogData.blogData.posts;
  state.filteredPosts = [...BlogData.blogData.posts];
  
  renderFilterOptions(state);
  applyFilters(state);
  renderPage(state);
  bindEvents(state);
  
  // Initialize search modal if present
  if (window.DALLI_Search) {
    window.DALLI_Search.init();
  }
};

export { renderPosts, renderPage, applyFilters, bindEvents, state, elements };