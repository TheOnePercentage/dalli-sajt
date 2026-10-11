const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');
const lines = js.split('\n');

// Fix line 647 (index 646)
if (lines[646] && lines[646].trim() === '});') {
  lines[646] = '  }).join(\'\')};';
  console.log('Fixed line 647');
}

// Also fix similar patterns throughout
for (let i = 0; i < lines.length; i++) {
  // Pattern: lines ending with '});' that are inside a .map() callback
  if (lines[i].trim() === '});' && 
      i > 0 && 
      lines[i-1].includes('`;') && 
      !lines[i].includes('join')) {
    lines[i] = lines[i].replace('});', '}).join(\'\')};');
    console.log('Fixed line', i+1);
  }
}

fs.writeFileSync('js/app.js', lines.join('\n'));
console.log('Done');