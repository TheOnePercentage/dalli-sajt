const fs = require('fs');
const path = require('path');

// Load blog data
const blogDataPath = path.join(__dirname, '../dist/data/blog.json');
const blogData = JSON.parse(fs.readFileSync(blogDataPath, 'utf-8'));
const posts = blogData.posts;
const authors = blogData.authors;
const categories = blogData.categories;

// Load the template HTML
const templatePath = path.join(__dirname, '../blog-index.html');
let html = fs.readFileSync(templatePath, 'utf-8');

function getCategoryLabel(categoryId) {
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

function getAuthorName(authorId) {
  const author = authors.find(a => a.id === authorId);
  return author ? author.name : 'Admin';
}

function resolveImage(src) {
  if (!src) return '/images/og-default.svg';
  if (/^https?:/.test(src)) return src;
  const rel = src.replace(/^\//, '');
  return fs.existsSync(path.join(__dirname, '../dist', rel)) ? src : '/images/og-default.svg';
}

// Generate posts HTML
const postsHtml = posts.map(post => {
  const author = getAuthorName(post.authorId);
  const category = getCategoryLabel(post.categoryId);
  
  const readTime = post.readingTime || Math.max(1, Math.ceil((post.content?.split(/\s+/).length || 0) / 200)) + ' min read';
  
  const date = new Date(post.date);
  const formattedDate = `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
  
  const featuredImage = resolveImage(post.featuredImage);
  const excerpt = post.excerpt || post.content?.slice(0, 150) + '...';
  
  return `
    <article class="post-card" style="background: var(--color-bg-primary); border-radius: var(--radius); overflow: hidden; transition: transform var(--transition-fast), box-shadow var(--transition-fast);">
      <div class="post-image" style="height: 200px; background: var(--color-bg-tertiary); overflow: hidden; position: relative;">
        <img src="${featuredImage}" 
             alt="${post.title} - DALLI blog article"
             style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;"
             loading="lazy">
        <div class="post-badge" style="position: absolute; top: 12px; left: 12px; background: var(--color-primary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${category}</div>
      </div>
      <div class="post-content" style="padding: var(--space-4);">
        <span class="post-category" style="font-size: 11px; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em;">${category}</span>
        <h3 class="post-title" style="font-size: var(--text-lg); font-weight: var(--fw-medium); color: var(--color-text); margin: var(--space-2) 0; line-height: 1.3;">
          <a href="/blog/${post.slug}.html" style="color: inherit; text-decoration: none;">${post.title}</a>
        </h3>
        <div class="post-meta" style="display: flex; gap: var(--space-2); margin-bottom: var(--space-2); font-size: var(--text-xs); color: var(--color-text-tertiary);">
          <span><i class="fa-solid fa-calendar-days" style="color: var(--color-primary);"></i> ${formattedDate}</span>
          <span><i class="fa-solid fa-user" style="color: var(--color-primary);"></i> ${author}</span>
          <span><i class="fa-solid fa-tag" style="color: var(--color-primary);"></i> ${category}</span>
        </div>
        <p class="post-excerpt" style="font-size: var(--text-xs); color: var(--color-text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: var(--space-2) 0;">${excerpt}</p>
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: var(--space-2); border-top: 1px solid var(--border); margin-top: var(--space-2); font-size: var(--text-xs); color: var(--color-text-tertiary);">
          <span>${readTime}</span>
        </div>
      </div>
    </article>
  `;
}).join('');

// Replace the empty posts-grid with rendered posts
const postsGridRegex = /(<div class="posts-grid"[^>]*>)[\s\S]*?(<div class="empty-state"[\s\S]*?<\/div>)[\s\S]*?(<\/div>\s*<\/section>)/;
const replacement = `$1${postsHtml}$3`;

html = html.replace(postsGridRegex, replacement);

// Remove the blog-entry script tag since we don't need client-side rendering anymore
  html = html.replace(/<script type="module" crossorigin src="\/assets\/js\/blog-entry-[^"]+\.js"><\/script>/, '');

  // Add RSS feed link
  html = html.replace('</head>', '    <link rel="alternate" type="application/rss+xml" title="DALLI Blog RSS" href="/rss.xml" />\n</head>');

  // Write the updated HTML to dist
const outputPath = path.join(__dirname, '../dist/blog-index.html');
fs.writeFileSync(outputPath, html);

console.log('✅ Blog index statically rendered with', posts.length, 'posts');