const esbuild = require('esbuild');
const fs = require('fs');

const files = [
  'admin/widgets/link-auditor-ui.js',
  'admin/widgets/markets-regions.js', 
  'admin/widgets/language-manager.js'
];

async function fixFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    const result = await esbuild.transform(code, {
      loader: 'js',
      target: 'es2020',
      format: 'esm',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment'
    });
    fs.writeFileSync(file, result.code);
    console.log(`Fixed: ${file}`);
  } catch (e) {
    console.log(`Error fixing ${file}:`, e.message);
  }
}

for (const f of files) {
  fixFile(f);
}
