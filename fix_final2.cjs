const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// Fix the specific problematic pattern: `)});` should be `}).join('')};`
// This occurs in template literals that are part of .map() calls
js = js.replace(
  /`;\s*\}\)\};/g,
  '`);\n  }).join(\'\')};'
);

// Also fix: `});` -> `}).join('')};` when it's part of a map return
js = js.replace(
  /`;\s*\}\)\};/g,
  '`);\n  }).join(\'\')};'
);

// More specific: after template literal closing backtick, if followed by `)});`
js = js.replace(
  /`;\s*\}\)\};/g,
  '`);\n  }).join(\'\')};'
);

// For the specific lines that are failing
js = js.replace(/`;\s*\)\}\};/g, '`);\n  }).join(\'\')};');

fs.writeFileSync('js/app.js', js);
console.log('Fixed');