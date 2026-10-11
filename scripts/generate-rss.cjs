const fs = require('fs');
const path = require('path');

const DIST = process.env.GENERATE_OUTPUT_DIR
  ? path.resolve(process.env.GENERATE_OUTPUT_DIR)
  : path.join(__dirname, '..', 'dist');

const blogDataPath = path.join(__dirname, '..', 'data', 'blog.json');
const blogData = JSON.parse(fs.readFileSync(blogDataPath, 'utf-8'));
const posts = blogData.posts;

let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
rss += '<channel>\n';
rss += '<title>DALLI Blog</title>\n';
rss += '<link>https://dalli.rs/blog-index.html</link>\n';
rss += '<description>Moda, stil i poslovne priče od DALLI</description>\n';
rss += '<language>sr</language>\n';
rss += '<atom:link href="https://dalli.rs/rss.xml" rel="self" type="application/rss+xml" />\n';

posts.forEach(post => {
  rss += '<item>\n';
  rss += '<title>' + post.title.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>') + '</title>\n';
  rss += '<link>https://dalli.rs/blog/' + post.slug + '.html</link>\n';
  rss += '<guid isPermaLink="true">https://dalli.rs/blog/' + post.slug + '.html</guid>\n';
  rss += '<description>' + (post.excerpt || post.content?.slice(0, 300) || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>') + '</description>\n';
  const date = new Date(post.date).toUTCString();
  rss += '<pubDate>' + date + '</pubDate>\n';
  rss += '</item>\n';
});

rss += '</channel>\n';
rss += '</rss>';

const outputPath = path.join(DIST, 'rss.xml');
fs.writeFileSync(outputPath, rss);
console.log('✅ RSS generated:', outputPath);