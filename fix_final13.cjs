const fs = require('fs');
const lines = fs.readFileSync('js/app.js', 'utf8').split('\n');

let fixed = 0;
for (let i = 0; i < lines.length - 1; i++) {
  // Pattern: line i is `});` (end of map callback), next line is `};` (end of function)
  // But we already added .join('') so the extra `};` should be removed
  if (lines[i].trim() === '});' && lines[i+1]?.trim() === '};') {
    // Remove the extra `};` - the function end is already handled
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