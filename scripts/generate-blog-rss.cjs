const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'dist');
const BLOG_DATA_PATH = path.join(OUTPUT_DIR, 'data', 'blog.json');

const blogData = JSON.parse(fs.readFileSync(BLOG_DATA_PATH, 'utf-8'));
const posts = blogData.posts || [];

const siteUrl = 'https://dalli.rs';
const blogUrl = `${siteUrl}/blog-index.html`;

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&apos;');
}

function formatRfc822Date(dateStr) {
    const date = new Date(dateStr);
    return date.toUTCString();
}

const rssItems = posts.map(post => {
    const postUrl = `${siteUrl}/blog/${post.slug}.html`;
    const pubDate = formatRfc822Date(post.date);
    const excerpt = post.excerpt || (post.content ? post.content.slice(0, 200) + '...' : '');
    
    return `
    <item>
        <title><![CDATA[${escapeXml(post.title)}]]></title>
        <link>${postUrl}</link>
        <guid isPermaLink="true">${postUrl}</guid>
        <pubDate>${pubDate}</pubDate>
        <description><![CDATA[${escapeXml(excerpt)}]]></description>
        ${post.featuredImage ? `<enclosure url="${siteUrl}${post.featuredImage}" type="image/jpeg" />` : ''}
        ${post.categoryId ? `<category>${escapeXml(post.categoryId)}</category>` : ''}
        ${post.tags ? post.tags.map(tag => `<category>${escapeXml(tag)}</category>`).join('\n        ') : ''}
        <author>${escapeXml(post.authorId || 'Admin')}</author>
    </item>`;
}).join('');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
    <title><![CDATA[DALLI Blog — Fashion, Lifestyle & Business Insights]]></title>
    <link>${blogUrl}</link>
    <description><![CDATA[Ekspertni članci o modi, lifestyle-u, biznisu i tehnologiji. Trends, saveti i inspiracije za savremeni životni stil.]]></description>
    <language>sr-RS</language>
    <copyright>© ${new Date().getFullYear()} DALLI. Sva prava zadržana.</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <generator>DALLI Blog Generator</generator>
    ${rssItems}
</channel>
</rss>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'rss.xml'), rss, 'utf-8');
console.log(`✅ Generated RSS feed with ${posts.length} posts`);