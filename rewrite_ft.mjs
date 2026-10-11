import fs from 'fs';

const content = fs.readFileSync('js/app.js', 'utf8');
const ftStart = content.indexOf('const FeaturedTabs = (() => {');
const ftEndIdx = content.indexOf('window.FeaturedTabs = FeaturedTabs;', content.indexOf('const FeaturedTabs = (() => {')) + 30;

const module = content.substring(ftStart, ftEndIdx + 30);

// Replace IIFE with regular function
let newModule = module
  .replace('const FeaturedTabs = (() => {', 'function FeaturedTabsModule() {')
  .replace('})();', '};\nconst FeaturedTabs = FeaturedTabsModule();');

fs.writeFileSync('js/app.js', content.substring(0, ftStart) + newModule + content.substring(ftEndIdx + 30));
console.log('Done rewriting FeaturedTabs module');