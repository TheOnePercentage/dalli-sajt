const fs = require('fs');

function stripTypeScript(code) {
  return code
    // Remove interface declarations
    .replace(/^\s*export\s+interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, '')
    .replace(/^\s*interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, '')
    // Remove type annotations from function parameters and returns
    .replace(/:\s*(string|number|boolean|any|void|Promise<[^>]*>|[A-Z]\w*(?:<[^>]*>)?|Record<[^>]*>|Partial<[^>]*>|Array<[^>]*>|Map<[^>]*>|Set<[^>]*>)\s*(?=[)=,])/g, '')
    .replace(/:\s*\{[\s\S]*?\}\s*(?=[)=,])/g, '') // inline object types
    .replace(/:\s*\[[^\]]*\]\s*(?=[)=,])/g, '') // array types
    // Remove 'as any' and other type casts
    .replace(/\s+as\s+(any|const|[A-Z]\w*(?:<[^>]*>)?)\b/g, '')
    // Remove 'private', 'public', 'protected', 'readonly' modifiers
    .replace(/\b(private|public|protected|readonly)\s+/g, '')
    // Remove type aliases
    .replace(/^\s*type\s+\w+\s*=\s*.*?;/gm, '')
    // Remove 'as any' in expressions
    .replace(/\s+as\s+any\b/g, '')
    // Remove type parameters from generics in new expressions
    .replace(/new\s+[A-Z]\w*<[^>]*>/g, m => m.replace(/<[^>]*>/, ''))
    // Remove type parameters from class declarations
    .replace(/class\s+\w+<[^>]*>/g, m => m.replace(/<[^>]*>/, ''))
    // Clean up empty lines
    .replace(/\n\s*\n\s*\n/g, '\n\n');
}

const files = [
  'admin-new/js/seo/core-web-vitals/dashboard.js',
  'admin-new/js/seo/core-web-vitals/scoring.js',
];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const stripped = stripTypeScript(code);
  const outputPath = file.replace('.js', '.js');
  fs.writeFileSync(file, stripped);
  console.log('Stripped TypeScript from ' + file);
}
