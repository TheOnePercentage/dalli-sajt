const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// Fix the specific lines - need to add back .join('') where it was incorrectly removed
// Pattern: `);};` -> `}).join('')};`
js = js.replace(/`\);(\s*[;,]\s*\}\);)/g, '});.join(\'\')$1');

// Also fix: `)};` -> `}).join('')};` when it's a map inside template
js = js.replace(/`\);(\s*[;,]\s*\}\);)/g, '});.join(\'\')$1');

fs.writeFileSync('js/app.js', js);
console.log('Fixed');