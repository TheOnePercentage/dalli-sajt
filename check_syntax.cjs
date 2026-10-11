const fs = require('fs');
const c = fs.readFileSync('js/app.js', 'utf8');
const ftStart = c.indexOf('const FeaturedTabs = (() => {');
const ftEndIdx = c.indexOf('window.FeaturedTabs = FeaturedTabs;', c.indexOf('const FeaturedTabs = (() => {')) + 30;
const module = c.substring(ftStart, ftEndIdx + 30);

try {
  new Function(module);
  console.log('FeaturedTabs module OK');
} catch (e) {
  console.log('FeaturedTabs module error:', e.message);
}

const ftEndIdx2 = c.indexOf('window.FeaturedTabs = FeaturedTabs;', c.indexOf('const FeaturedTabs = (() => {')) + 30;
const upToFT = c.substring(0, ftEndIdx2 + 30);
try {
  new Function('(async () => {' + c.substring(0, ftEndIdx2 + 30) + '})();');
  console.log('Up to FeaturedTabs OK as IIFE');
} catch (e) {
  console.log('Error up to FeaturedTabs:', e.message);
}