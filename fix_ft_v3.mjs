import fs from 'fs';

const content = await fs.promises.readFile('js/app.js', 'utf8');
const ftStart = content.indexOf('const FeaturedTabs = (() => {');
const ftEndIdx = content.indexOf('window.FeaturedTabs = FeaturedTabs;', content.indexOf('const FeaturedTabs = (() => {')) + 30;

const module = content.substring(ftStart, ftEndIdx + 30);

// Restore proper IIFE pattern
let newModule = module
  // Change function declaration back to IIFE
  .replace('function FeaturedTabsModule() {', 'const FeaturedTabs = (() => {')
  // Remove the duplicate const FeaturedTabs = FeaturedTabsModule(); line
  .replace('})();\nconst FeaturedTabs = FeaturedTabsModule();', '})();')
  // Fix the initialization IIFE syntax
  .replace('// Initialize FeaturedTabs on DOM ready\n(() => {\n  if (document.readyState === "loading") {\n    document.addEventListener("DOMContentLoaded", FeaturedTabs.init);\n  } else {\n    FeaturedTabs.init();\n  }\n};', '// Initialize FeaturedTabs on DOM ready\n(() => {\n  if (document.readyState === "loading") {\n    document.addEventListener("DOMContentLoaded", FeaturedTabs.init);\n  } else {\n    FeaturedTabs.init();\n  }\n})();');

const newContent = content.substring(0, ftStart) + newModule + content.substring(ftEndIdx + 30);
await fs.promises.writeFile('js/app.js', newContent);
console.log('Fixed FeaturedTabs module');