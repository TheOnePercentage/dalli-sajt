/**
 * Blog Index Page Entry Point
 * Loads blog data and renders posts
 */

import { $, $$, formatDate } from '../core/dom.js';
import { trackEvent } from '../features/analytics.js';
import * as BlogData from '../data/blog-data.js';

export async function initBlogIndex() {
  try {
    const response = await fetch('data/blog.json');
    const blogData = await response.json();
    const posts = blogData.posts;
    const authors = blogData.authors;
    const categories = blogData.categories;
    
    
    const emptyState = document.querySelector('.empty-state');
    
    if (!postsGrid) return;
    
    if (posts.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    
    // Render posts
    const postsHtml = posts.map((post, index) => {
      const author = authors.find(a => a.id === post.authorId) || authors[0];
      const category = categories.find(c => c.id === post.categoryId) || categories[0];
      
      // Calculate reading time if not set
      const readTime = post.readingTime || Math.max(1, Math.ceil((post.content?.split(/\s+/).length || 0) / 200)) + ' min read';
      
      // Format date
      const date = new Date(post.date);
      const formattedDate = `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
      
      // Get featured image
      const featuredImage = post.featuredImage || '/images/placeholder-blog.svg';
      
      // Get excerpt or create one from content
      const excerpt = post.excerpt || post.content?.split(' ').slice(0, 50).join(' ') + '...';
      
      return `
        <article class="post-card" style="background: var(--color-bg-primary); border-radius: var(--radius); overflow: hidden; transition: transform var(--transition-fast);:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); }">
          <!-- Featured Image -->
          <div class="post-image" style="height: 200px; background: var(--color-bg-tertiary); overflow: hidden;">
            <img class="post-image" src="${featuredImage}" 
                 alt="${post.title} - DALLI blog article"
                 style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;"
                 loading="lazy">
              <div class="post-badge" style="position: absolute; top: 12px; left: 12px; background: var(--color-primary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${getCategoryLabel(post.categoryId)}</div>
              <div class="post-image__ripple" aria-hidden="true"></div>
            </div>
            <div class="post-content" style="padding: var(--space-4);">
              <span class="post-category" style="font-size: 11px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">${getCategoryLabel(post.categoryId)}</span>
              <h3 class="post-title" style="font-size: var(--text-lg); font-weight: var(--fw-medium); color: var(--color-text); margin: var(--space-2) 0; line-height: 1.3;">
                <a href="/blog-post.html?slug=${post.slug}" style="color: inherit; text-decoration: none;">${post.title}</a>
              </h3>
              <div class="post-meta" style="display: flex; gap: var(--space-2); margin-bottom: var(--space-2); font-size: var(--text-xs); color: var(--color-text-tertiary);">
                <span>
                  <i class="fa-solid fa-calendar-days" style="color: var(--color-primary);"></i>
                  ${formattedDate}
                </span>
                <span>
                  <i class="fa-solid fa-user" style="color: var(--color-primary);"></i>
                  ${author?.name || 'Admin'}
                </span>
                <span>
                  <i class="fa-solid fa-tag" style="color: var(--color-primary);"></i>
                  ${category.name}
                </span>
              </div>
              <h3 class="post-title" style="font-size: var(--text-lg); font-weight: var(--fw-medium); color: var(--color-text); margin: var(--space-2) 0; line-height: 1.3;">
                <a href="/blog-post.html?slug=${post.slug}" style="color: inherit; text-decoration: none;">${post.title}</a>
              </h3>
              <p class="post-excerpt" style="font-size: var(--text-xs); color: var(--color-text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: var(--space-2) 0;">${post.excerpt || post.content?.slice(0, 150) + '...'}</p>
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-2); border-top: 1px solid var(--border); margin-top: var(--space-2); font-size: var(--text-xs); color: var(--color-text-tertiary);">
                <span>${post.readingTime || '5 min read'}</span>
              </div>
            </div>
          </article>
        `;
    }).join('');
    
    function getCategoryLabel(categoryId) {
      const categoryLabels = {
        'fashion': 'Fashion',
        'lifestyle': 'Lifestyle',
        'business': 'Business',
        'technology': 'Technology'
      };
      return categories[categoryId] || categoryId;
    }
    
    postsGrid.innerHTML = postsHtml;
    if (emptyState) emptyState.style.display = 'none';
  } catch (error) {
    console.error('Error loading blog data:', error);
    
    if (postsGrid) {
      postsGrid.innerHTML = '<p style="color: var(--color-error);">Greška pri učitavanju articles.</p>';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlogIndex);
} else {
  initBlogIndex();
}