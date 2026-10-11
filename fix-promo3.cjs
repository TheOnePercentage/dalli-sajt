const fs = require('fs');
const file = 'admin/widgets/promotions-manager.js';
const code = fs.readFileSync(file, 'utf8');

// The issue is the closing brackets for the promotions table
// Original has too many closing brackets

// Fix the specific problematic section
const fixed = code
  .replace(
    /                  \]\)\n                \)\n              \)\n            \]\)\n          \]/g,
    '                  ]\n                )\n              )\n            ]'
  );

fs.writeFileSync('admin/widgets/promotions-manager.js', fixed);
console.log('Fixed promotions-manager.js');
