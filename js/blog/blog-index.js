/**
 * Blog Data Module
 * Client-side data access for blog posts, authors, categories
 */

import * as BlogData from '../data/blog-data.mjs';

// Re-export all data functions
export * from '../data/blog-data.mjs';

// Additional client-side utilities
export const BlogRenderer = {
  renderPostCard(post, options = {}) {
    const { showImage = true, showExcerpt = true, showMeta = true, showTags = true, linkTarget = '_self' } = options;
    const featuredImage = post.featuredImage || '/images/placeholder-blog.svg';
    const excerpt = post.excerpt || (post.content?.slice(0, 150) + '...') || '';
    const formattedDate = new Date(post.date).toLocaleDateString('sr-RS', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const readTime = post.readingTime || '5 min read';
    const category = this.getCategoryLabel(post.categoryId);
    const author = this.getAuthorName(post.authorId);
    const tagsHtml = post.tags ? post.tags.map(tag => 
      `<span class="post-tag" style="background: var(--color-primary-light); color: var(--color-primary); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500;">${tag}</span>`
    ).join('') : '';

    return `
      <article class="post-card" data-slug="${post.slug}" style="background: var(--color-bg-primary); border-radius: 12px; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; border: 1px solid var(--border);">
        ${post.featuredImage ? `
          <a href="/blog-post.html?slug=${post.slug}" class="post-link" style="display: block; text-decoration: none; color: inherit;">
            <div class="post-image" style="height: 200px; background: var(--color-bg-tertiary); overflow: hidden; position: relative;">
              <img class="post-image" src="${post.featuredImage}" alt="${post.title}" loading="lazy" width="400" height="200" decoding="async" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;">
              <div class="post-badge" style="position: absolute; top: 12px; left: 12px; background: var(--color-primary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;">${this.getCategoryLabel(post.categoryId)}</div>
              <div class="reading-time" style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">${post.readingTime || '5 min read'}</div>
            </a>
          </div>
        ` : ''}
        <div class="post-content" style="padding: 16px;">
          ${post.categoryId ? `<span class="post-category" style="font-size: 11px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">${this.getCategoryLabel(post.categoryId)}</span>` : ''}
          <h3 class="post-title" style="font-size: 16px; font-weight: 600; color: var(--color-text); margin: 8px 0 8px; line-height: 1.4;">
            <a href="/blog-post.html?slug=${post.slug}" style="color: inherit; text-decoration: none;">${post.title}</a>
          </h3>
          ${post.excerpt ? `<p class="post-excerpt" style="color: #666; font-size: 14px; line-height: 1.5; margin: 8px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${post.excerpt}</p>` : ''}
          ${post.tags && post.tags.length ? `<div class="post-tags" style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px;">${post.tags.map(tag => `<span class="post-tag" style="background: var(--color-primary-light); color: var(--color-primary); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500;">${tag}</span>`).join('')}</div>` : ''}
          <div class="post-footer" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888;">
            <span>${post.readingTime || '5 min read'}</span>
            <span>${post.views || 0} views</span>
          </div>
        </div>
      </article>
    `;
  },

  getCategoryLabel(categoryId) {
    const categories = {
      'fashion': 'Fashion',
      'lifestyle': 'Lifestyle',
      'business': 'Business',
      'technology': 'Technology',
      'fashion': 'Fashion',
      'style': 'Style',
      'sustainability': 'Sustainability'
    };
    return categories[categoryId] || categoryId;
  },

  getAuthorName(authorId) {
    const authors = {
      '1': 'Admin User'
    };
    return authors[authorId] || 'Admin';
  },

  renderPostGrid(posts, container, options = {}) {
    if (!container) return;
    container.innerHTML = posts.map(post => this.renderPostCard(post, options)).join('');
  }
};

export const BlogFilters = {
  currentFilters: {
    category: '',
    author: '',
    tag: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  },

  init(filtersContainer, onChange) {
    this.bindEvents(filtersContainer, onChange);
  },

  bindEvents(container, onChange) {
    const selects = container.querySelectorAll('select[data-filter]');
    selects.forEach(select => {
      select.addEventListener('change', () => {
        this.currentFilters[select.dataset.filter] = select.value;
        this.applyFilters();
      });
    });

    const searchInput = container.querySelector('[data-search-input]');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        this.currentFilters.search = searchInput.value;
        this.applyFilters();
      }, 300));
    }
  },

  applyFilters() {
    // This would be implemented with the actual filtering logic
    console.log('Applying filters:', this.currentFilters);
  }
};

const debounce = (fn, ms) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};

export const BlogPagination = {
  currentPage: 1,
  totalPages: 1,
  postsPerPage: 9,

  init(container, totalItems, onPageChange) {
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(totalItems / 9);
    this.container = container;
    this.onPageChange = onPageChange;
    this.render();
  },

  render() {
    if (!this.container || this.totalPages <= 1) {
      this.container.innerHTML = '';
      return;
    }

    let html = `
      <div class="pagination" style="display: flex; justify-content: center; gap: 8px; margin-top: 24px;">
        <button class="pagination-btn" data-page="first" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prva">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><line x1="18" y1="17" x2="18" y2="7"/></svg>
        </button>
        <button class="pagination-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prethodna">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="pagination-pages" role="group" aria-label="Stranice">
    `;

    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(5 / 2));
    let end = Math.min(this.totalPages, start + 4);

    if (end - start + 1 < 5) {
      start = Math.max(1, end - 4);
    }

    if (start > 1) {
      html += '<button class="pagination-btn" data-page="1">1</button>';
      if (start > 2) html += '<span class="pagination-ellipsis">…</span>';
    }

    for (let i = start; i <= end; i++) {
      html += `<button class="pagination-page ${i === this.currentPage ? 'active' : ''}" data-page="${i}" ${i === this.currentPage ? 'aria-current="page"' : ''}>${i}</button>`;
    }

    if (end < this.totalPages) {
      if (end < this.totalPages - 1) html += '<span class="pagination-ellipsis">…</span>';
      html += `<button class="pagination-page" data-page="${this.totalPages}">${this.totalPages}</button>`;
    }

    html += `
              </div>
              <button class="pagination-btn" data-page="next" ${this.currentPage === this.totalPages ? 'disabled' : ''} aria-label="Sledeća">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button class="pagination-btn" data-page="last" ${this.currentPage === this.totalPages ? 'disabled' : ''} aria-label="Poslednja">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><line x1="6" y1="17" x2="6" y2="7"/></svg>
              </button>
            </div>
    `;

    this.container.innerHTML = html;
    this.bindEvents();
  },

  bindEvents() {
    this.container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const page = btn.dataset.page === 'first' ? 1 : 
                     btn.dataset.page === 'last' ? this.totalPages :
                     btn.dataset.page === 'prev' ? this.currentPage - 1 :
                     btn.dataset.page === 'next' ? this.currentPage + 1 :
                     parseInt(btn.dataset.page);
        if (window.DALLI_Blog && window.DALLI_Blog.setPage) {
          window.DALLI_Blog.setPage(parseInt(page));
        }
      });
    });
  },

  setPage(page) {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.render();
  }
};

// Export all modules
export default {
  BlogData,
  BlogRenderer,
  BlogFilters,
  BlogPagination
};