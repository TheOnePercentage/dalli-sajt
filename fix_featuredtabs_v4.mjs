import fs from 'fs';

const content = await fs.promises.readFile('js/app.js', 'utf8');
const ftStart = content.indexOf('const FeaturedTabs = (() => {');
const ftEndIdx = content.indexOf('window.FeaturedTabs = FeaturedTabs;', content.indexOf('const FeaturedTabs = (() => {')) + 30;

const module = content.substring(ftStart, ftEndIdx + 30);

// Fix missing closing braces for functions
let newModule = module
  // Add missing closing for staggerRevealCards
  .replace('  const staggerRevealCards = (panel) => {', '  const staggerRevealCards = (panel) => {\n')
  .replace('        });\n      } else {\n        panel.hidden = true;\n      });\n    });\n  };', '        });\n      } else {\n        panel.hidden = true;\n      });\n    });\n  };')
  // Fix initTabListeners
  .replace('  const initTabListeners = () => {', '  const initTabListeners = () => {\n')
  .replace('        });\n    });\n  };', '      btn.addEventListener(\'click\', () => {\n        activateTab(btn.dataset.tab, true);\n      });\n    });\n  };')
  // Fix initKeyboardNav
  .replace('  const initKeyboardNav = () => {', '  const initKeyboardNav = () => {\n')
  .replace('});\n  };', '});\n  };')
  // Fix initHashListener
  .replace('  const initHashListener = () => {', '  const initHashListener = () => {\n')
  .replace('});\n  };', '});\n  };')

const newContent = content.substring(0, ftStart) + newModule + content.substring(ftEndIdx + 30);
await fs.promises.writeFile('js/app.js', newContent);
console.log('Fixed FeaturedTabs module');