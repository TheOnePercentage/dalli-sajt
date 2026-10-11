const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// Restore the .join('') part that was incorrectly removed
js = js.replace(/}\)}\);(\s*[;,])/g, '}).join(\'\')});$1');
js = js.replace(/\)}\);(\s*[;,])/g, '}).join(\'\')});$1');

fs.writeFileSync('js/app.js', js);
console.log('Fixed');