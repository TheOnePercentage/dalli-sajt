const fs = require('fs');
const file = 'admin/widgets/promotions-manager.js';
const code = fs.readFileSync(file, 'utf8');

// Fix the promotions table closing - replace the extra ) after ])
const fixed = code
  // Fix: ],) should be ],) not ]),)
  .replace(
    /                  \)\n              \),/g,
    '                  ]\n              )'
  )
  // Also fix the one before that if needed
  .replace(
    /                  \]\n              \),/g,
    '                  ]\n              )'
  );

fs.writeFileSync('admin/widgets/promotions-manager.js', fixed);
console.log('Fixed promotions-manager.js');
