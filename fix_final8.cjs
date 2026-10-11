const fs = require('fs');
const lines = fs.readFileSync('js/app.js', 'utf8').split('\n');

let fixed = 0;
for (let i = 0; i < lines.length - 2; i++) {
  // Pattern: line i has backtick semicolon, line i+2 has `});`
  if (lines[i].trim().endsWith('\`;') && lines[i+2]?.trim() === '});') {
    lines[i+2] = '  }).join(\'\')};';
    console.log('Fixed line', i+3);
  }
}

fs.writeFileSync('js/app.js', lines.join('\n'));
console.log('Done');