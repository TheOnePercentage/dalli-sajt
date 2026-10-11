const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// Fix the extra } after .join('') in template literals
js = js.replace(/\.join\(''\)\}\}/g, ".join('')}");
js = js.replace(/\.join\(''\)\}\}/g, ".join('')}");
js = js.replace(/\)\.join\(''\)\}\}/g, ")}");
js = js.replace(/`\)\.join\(''\)\}\}/g, "`)}");

fs.writeFileSync('js/app.js', js);
console.log('Fixed');