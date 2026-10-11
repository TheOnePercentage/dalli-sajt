const fs = require('fs');
const path = require('path');

// Load blog data
const blogDataPath = path.join(__dirname, '../dist/data/blog.json');
const blogData = JSON.parse(fs.readFileSync(blogDataPath, 'utf-8'));
const posts = blogData.posts;
const authors = blogData.authors;
const categories = blogData.categories;

// Load the template HTML
const templatePath = path.join(__dirname, '../blog-post.html');
const template = fs.readFileSync(templatePath, 'utf-8');

function getCategoryLabel(categoryId) {
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

function getAuthor(authorId) {
  return authors.find(a => a.id === authorId) || authors[0];
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
}

function formatDateISO(dateStr) {
  return new Date(dateStr).toISOString().split('T')[0];
}

// Resolve an image path against dist; fall back to an existing asset when missing.
function resolveImage(src) {
  if (!src) return '/images/og-default.svg';
  if (/^https?:/.test(src)) return src;
  const rel = src.replace(/^\//, '');
  return fs.existsSync(path.join(__dirname, '../dist', rel)) ? src : '/images/og-default.svg';
}

function generateTagsHtml(tags) {
  if (!tags || !tags.length) return '';
  return tags.map(tag => 
    `<span style="background: var(--color-primary-light); color: var(--color-primary); padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 500;">${tag}</span>`
  ).join('');
}

function generateRelatedPostsHtml(currentPost, allPosts) {
  const related = allPosts
    .filter(p => p.id !== currentPost.id && (p.categoryId === currentPost.categoryId || p.tags?.some(t => currentPost.tags?.includes(t))))
    .slice(0, 3);
  
  if (!related.length) return '';
  
  return related.map(post => {
    const cat = getCategoryLabel(post.categoryId);
    const excerpt = post.excerpt || post.content?.slice(0, 150) + '...';
    return `
      <article style="background: var(--color-bg-primary); border-radius: var(--radius); padding: var(--space-4); border: 1px solid var(--border);">
        <h4 style="font-size: var(--text-base); font-weight: var(--font-bold); color: var(--color-text-primary); margin: 0 0 var(--space-2);">
          <a href="/blog/${post.slug}.html" style="color: inherit; text-decoration: none;">${post.title}</a>
        </h4>
        <p style="font-size: var(--text-sm); color: var(--color-text-secondary); margin: 0 0 var(--space-2); line-height: 1.5;">${excerpt}</p>
        <div style="display: flex; gap: var(--space-2); font-size: var(--text-xs); color: var(--color-text-tertiary);">
          <span>${cat}</span>
          <span>·</span>
          <span>${post.readingTime || '5 min read'}</span>
        </div>
      </article>
    `;
  }).join('');
}

const outputDir = path.join(__dirname, '../dist/blog');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate individual post pages
posts.forEach(post => {
  const author = getAuthor(post.authorId);
  const category = getCategoryLabel(post.categoryId);
  const formattedDate = formatDate(post.date);
  const dateISO = formatDateISO(post.date);
  const featuredImage = resolveImage(post.featuredImage);
  const readingTime = post.readingTime || Math.max(1, Math.ceil((post.content?.split(/\s+/).length || 0) / 200)) + ' min read';
  const tagsHtml = generateTagsHtml(post.tags);
  const relatedPostsHtml = generateRelatedPostsHtml(post, posts);

  // Replace all placeholders
  let html = template
    .replace(/\{\{title\}\}/g, post.title)
    .replace(/\{\{excerpt\}\}/g, post.excerpt || post.content?.slice(0, 150) + '...')
    .replace(/\{\{featuredImage\}\}/g, featuredImage)
    .replace(/\{\{readingTime\}\}/g, readingTime)
    .replace(/\{\{date\}\}/g, formattedDate)
    .replace(/\{\{dateISO\}\}/g, dateISO)
    .replace(/\{\{authorName\}\}/g, author?.name || 'Admin')
    .replace(/\{\{authorAvatar\}\}/g, resolveImage(author?.avatar) || '/images/og-default.svg')
    .replace(/\{\{categoryName\}\}/g, category)
    .replace(/\{\{content\}\}/g, post.content || '')
    .replace(/\{\{tags\}\}/g, tagsHtml)
    .replace(/\{\{relatedPosts\}\}/g, relatedPostsHtml)
    .replace(/\{\{slug\}\}/g, post.slug);

  // Fix canonical URL and og:url, twitter:url (multiple occurrences) - must be after slug replacement
  html = html.replace(/https:\/\/dalli\.rs\/blog\/[^"'>\s]+/g, `https://dalli.rs/blog/${post.slug}.html`);

  // Fix blog-index.html links (since posts are in /blog/ subdirectory)
  html = html.replace(/href="blog-index.html"/g, 'href="/blog-index.html"');

  // Add RSS feed link
  html = html.replace('</head>', '    <link rel="alternate" type="application/rss+xml" title="DALLI Blog RSS" href="/rss.xml" />\n</head>');

  // Write to dist/blog/<slug>.html
  const outputPath = path.join(outputDir, `${post.slug}.html`);
  fs.writeFileSync(outputPath, html);
});

console.log('✅ Generated', posts.length, 'static blog post pages in dist/blog/');