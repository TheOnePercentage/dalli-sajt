const fs = require('fs');
const lines = fs.readFileSync('js/app.js', 'utf8').split('\n');

let fixed = 0;
for (let i = 0; i < lines.length - 1; i++) {
  // Pattern: line i ends with backtick semicolon, next line is `});`
  if (lines[i].trim().endsWith('\`;') && lines[i+1]?.trim() === '});') {
    lines[i+1] = '  }).join(\'\')};';
    console.log('Fixed line', i+2);
  }
}

fs.writeFileSync('js/app.js', lines.join('\n'));
console.log('Done');