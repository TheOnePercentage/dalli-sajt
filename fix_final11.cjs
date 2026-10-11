const fs = require('fs');
const lines = fs.readFileSync('js/app.js', 'utf8').split('\n');

let fixed = 0;
for (let i = 0; i < lines.length - 1; i++) {
  // Pattern: line i ends with backtick semicolon, next line is `});`
  if (lines[i].trim().endsWith('\`;') && lines[i+1]?.trim() === '});') {
    lines[i+1] = '  }).join(\'\')};';
    console.log('Fixed line', i+2);
    fixed++;
  }
}

if (fixed > 0) {
  fs.writeFileSync('js/app.js', lines.join('\n'));
  console.log('Fixed', fixed, 'lines');
} else {
  console.log('No fixes applied');
}