const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// Fix all occurrences of `  )});` to `  }).join('')};`
// This is for template literals inside .map() calls that need .join('')
js = js.replace(
  /^(\s*)\)\}\};/gm,
  '$1}).join(\'\')};'
);

fs.writeFileSync('js/app.js', js);
console.log('Fixed');