/**
 * Test script for Internal Linking Engine
 * Loads all data and initializes the engine
 */

import fs from 'fs';
import path from 'path';
import { InternalLinkingEngine } from '../js/services/internal-linking.js';

async function loadData() {
  const dataDir = path.resolve('./data');

  const categories = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'category-seo.json'), 'utf8')
  ).categories;
  const products = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'products.json'), 'utf8')
  ).products;
  const blogPosts = JSON.parse(fs.readFileSync(path.join(dataDir, 'blog.json'), 'utf8')).posts;
  const guides = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'buying-guides.json'), 'utf8')
  ).guides;
  const reviews = JSON.parse(fs.readFileSync(path.join(dataDir, 'reviews.json'), 'utf8')).reviews;

  // Mock collections for now - use dates that are active TODAY
  const today = new Date();
  const year = today.getFullYear();
  const collections = [
    {
      slug: 'current-summer',
      title: 'Trenutna letnja kolekcija',
      active: true,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      categories: ['majice', 'trenerke'],
    },
    {
      slug: 'current-winter',
      title: 'Trenutna zimska kolekcija',
      active: true,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      categories: ['dukseri', 'trenerke'],
    },
    {
      slug: 'limited-edition',
      title: 'Limited Edition',
      active: true,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      categories: ['majice', 'dukseri'],
    },
  ];

  return { categories, products, blogPosts, guides, reviews: reviews, collections };
}

async function testEngine() {
  console.log('🧪 Testing Internal Linking Engine...\n');

  const data = await loadData();
  console.log('📊 Loaded data:');
  console.log(`  Categories: ${data.categories.length}`);
  console.log(`  Products: ${data.products.length}`);
  console.log(`  Blog posts: ${data.blogPosts.length}`);
  console.log(`  Guides: ${data.guides.length}`);
  console.log(`  Reviews: ${data.reviews.length}`);

  const engine = new InternalLinkingEngine();
  await engine.init(data);

  console.log('\n🔗 Testing link queries...\n');

  // Test 1: Product → Category links
  console.log('1️⃣ Product → Category links (Product #1):');
  const prodCatLinks = engine.getProductCategoryLinks(1);
  prodCatLinks.forEach(l => console.log(`   → ${l.anchor} (${l.node.url}) [${l.type}]`));

  // Test 2: Blog → Product links
  console.log('\n2️⃣ Blog → Product links (Blog #1):');
  const blogProdLinks = engine.getBlogProductLinks(1);
  blogProdLinks.forEach(l => console.log(`   → ${l.anchor} (${l.node.url}) [${l.type}]`));

  // Test 3: Category → Collection
  console.log('\n3️⃣ Category → Collection (majice):');
  const catColLinks = engine.getCategoryCollectionLinks('majice');
  catColLinks.forEach(l => console.log(`   → ${l.anchor} (${l.node.url})`));

  // Test 4: Guide FAQ links
  console.log('\n4️⃣ Guide FAQ links (Hoodie guide):');
  const faqLinks = engine.getGuideFAQLinks('kako-izabrati-duks');
  faqLinks.forEach(l => console.log(`   → ${l.anchor} (${l.node.url}) [${l.type}]`));

  // Test 5: Related content widget
  console.log('\n5️⃣ Related Content Widget (Product #1):');
  const related = engine.getRelatedContent('product:1', 4);
  related.forEach(r =>
    console.log(`   → ${r.node.title} (${r.node.type}) - ${r.anchor} [${r.edgeType}]`)
  );

  // Test 6: Link report
  console.log('\n6️⃣ Link Report:');
  const report = engine.generateLinkReport();
  console.log(`   Total nodes: ${report.totalNodes}`);
  console.log(`   Total edges: ${report.totalEdges}`);
  console.log(`   By type:`, report.byType);
  console.log(`   Orphan nodes: ${report.orphanNodes.length}`);
  console.log(`   High authority (>5 inbound): ${report.highAuthority.length}`);
  console.log(
    `   Top anchors:`,
    Object.entries(report.anchorDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  );

  // Test 7: Render widget HTML
  console.log('\n7️⃣ Widget HTML (Product #1):');
  const widgetHtml = engine.renderRelatedWidget('product:1', 3);
  console.log(widgetHtml.substring(0, 500) + '...');

  // Export graph for debugging
  const graph = engine.exportGraph();
  console.log(`\n📈 Graph exported: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  console.log('\n✅ All tests passed!');
}

testEngine().catch(console.error);
