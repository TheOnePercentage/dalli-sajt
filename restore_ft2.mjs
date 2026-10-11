import fs from 'fs';

const content = await fs.promises.readFile('js/app.js', 'utf8');
const ftStart = content.indexOf('const FeaturedTabs = (() => {');
const ftEndIdx = content.indexOf('window.FeaturedTabs = FeaturedTabs;', content.indexOf('const FeaturedTabs = (() => {')) + 30;

const module = content.substring(ftStart, ftEndIdx + 30);

// Restore original arrow function IIFE
let newModule = module
  .replace('const FeaturedTabs = (function FeaturedTabsModule() {', 'const FeaturedTabs = (() => {')
  .replace('})();', '})();')
  .replace('const FeaturedTabs = FeaturedTabsModule();', '');

const newContent = content.substring(0, ftStart) + newModule + content.substring(ftEndIdx + 30);
await fs.promises.writeFile('js/app.js', newContent);
console.log('Restored original IIFE syntax');