const fs = require('fs');
const file = 'admin/widgets/promotions-manager.js';
const code = fs.readFileSync(file, 'utf8');
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (i > 0 && lines[i].trim() === ')' && lines[i-1].trim() === '])') {
    console.log('Found extra ) at line ' + (i+1));
    lines.splice(i, 1);
    break;
  }
}

fs.writeFileSync('admin/widgets/promotions-manager.js', lines.join('\n'));
console.log('Fixed promotions-manager.js');
EOF
node fix-final.cjs
