const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// Find the specific problematic line and fix it
const lines = js.split('\n');

for (let i = 0; i < lines.length; i++) {
  // Fix line 3627: `  }.join('');` -> `  });` (inside template literal map)
  if (lines[i].trim() === '}.join(\'\');') {
    lines[i] = lines[i].replace('}.join(\'\');', ')});');
    console.log('Fixed line', i + 1);
  }
  
  // Also fix similar patterns
  if (lines[i].includes('}).join(\'\');')) {
    lines[i] = lines[i].replace('}).join(\'\');', ')});');
    console.log('Fixed variant line', i + 1);
  }
  
  // Fix any `}).join('');` pattern
  if (lines[i].includes('}).join(\'\');')) {
    lines[i] = lines[i].replace('}).join(\'\');', ')});');
    console.log('Fixed variant 2 line', i + 1);
  }
}

fs.writeFileSync('js/app.js', lines.join('\n'));
console.log('Done');