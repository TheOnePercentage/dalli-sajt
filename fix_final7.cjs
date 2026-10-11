const fs = require('fs');
const lines = fs.readFileSync('js/app.js', 'utf8').split('\n');

let fixed = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '});' && 
      i > 0 && 
      lines[i-1].includes('`;') && 
      !lines[i].includes('join')) {
    lines[i] = '  }).join(\'\')};';
    console.log('Fixed line', i+1);
    fixed++;
  }
}

if (fixed > 0) {
  fs.writeFileSync('js/app.js', lines.join('\n'));
  console.log('Fixed', fixed, 'lines');
} else {
  console.log('No fixes needed');
}