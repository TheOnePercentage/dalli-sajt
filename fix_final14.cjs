const fs = require('fs');
const lines = fs.readFileSync('js/app.js', 'utf8').split('\n');

let fixed = 0;
for (let i = 0; i < lines.length - 1; i++) {
  // Pattern: line i is `});` and line i+1 is `};` 
  // But only if line i already has .join('') in it
  if (lines[i].trim() === '}).join(\'\')};' && lines[i+1]?.trim() === '};') {
    lines.splice(i+1, 1);
    console.log('Removed extra }; at line', i+2);
    fixed++;
  }
}

if (fixed > 0) {
  fs.writeFileSync('js/app.js', lines.join('\n'));
  console.log('Fixed', fixed, 'lines');
} else {
  console.log('No fixes applied');
}