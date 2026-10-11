const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// Fix the specific pattern: `  )});\n` -> `  }).join('')};\n`
js = js.replace(/  \)\)\};/g, '  }).join(\'\')};');

fs.writeFileSync('js/app.js', js);
console.log('Fixed');