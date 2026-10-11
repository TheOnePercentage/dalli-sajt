const fs = require('fs');
const file = 'admin/widgets/promotions-manager.js';
const code = fs.readFileSync(file, 'utf8');

// Fix the extra ) after ]), in the promotions table
// The issue is on the line that has just "              )" after a "])" line

const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  // Look for the pattern: a line with just "              )" following a line with "                  ])"
  if (i > 0 && lines[i].trim() === ')' && lines[i-1].trim() === '])') {
    console.log('Found extra ) at line ' + (i+1));
    // Remove this line
    lines.splice(i, 1);
    break;
  }
}

const fixed = lines.join('\n');
fs.writeFileSync('admin/widgets/promotions-manager.js', lines.join('\n'));
console.log('Fixed promotions-manager.js');
