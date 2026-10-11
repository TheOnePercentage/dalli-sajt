const fs = require('fs');
const file = 'admin/widgets/promotions-manager.js';
const code = fs.readFileSync(file, 'utf8');

// Fix the promotions table closing brackets
// The issue is around lines 420-440 where the closing brackets are wrong

// Replace the problematic section
const fixed = code
  // Fix the tbody closing - should be just })] for map callback + array
  .replace(
    /\)\s*,\s*\)\s*,\s*\]\s*,\s*\)\s*,\s*\]\s*,\s*\)\s*,\s*\]\s*,\s*\)\s*,\s*\]\s*,/g,
    '}),\n          ])\n        ])'
  )
  // Fix the tbody closing - should be just }) for map callback + ]
  .replace(
    /\)\s*,\s*\)\s*,\s*\]\s*,\s*\)\s*,\s*\]\s*,/g,
    '}),\n          ])'
  );

fs.writeFileSync('admin/widgets/promotions-manager.js', fixed);
console.log('Fixed promotions-manager.js');
