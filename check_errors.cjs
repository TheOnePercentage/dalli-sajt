const parser = require('@babel/parser');
const fs = require('fs');

const files = [
  'admin/widgets/link-auditor-ui.js',
  'admin/widgets/markets-regions.js', 
  'admin/widgets/language-manager.js'
];

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  try {
    const ast = parser.parse(code, {
      sourceType: 'script',
      plugins: ['jsx', 'optionalChaining', 'classProperties', 'dynamicImport'],
      errorRecovery: true
    });
    console.log(f + ' Errors:', JSON.stringify(ast.errors.map(e => ({msg: e.message, loc: e.loc})), null, 2));
  } catch (e) {
    console.log(f + ' Fatal:', e.message);
  }
}
