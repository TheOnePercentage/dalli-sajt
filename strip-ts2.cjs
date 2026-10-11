const fs = require('fs');

function stripTypeScript(code) {
  return code
    // Remove interface declarations (multi-line)
    .replace(/^\s*export\s+interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, '')
    .replace(/^\s*interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, '')
    // Remove type aliases
    .replace(/^\s*type\s+\w+\s*=\s*.*?;/gm, '')
    // Remove 'as any' and other type casts
    .replace(/\s+as\s+(any|const|[A-Z]\w*(?:<[^>]*>)?)\b/g, '')
    // Remove 'private', 'public', 'protected', 'readonly' modifiers
    .replace(/\b(private|public|protected|readonly)\s+/g, '')
    // Remove type annotations after colons (simple types)
    .replace(/:\s*(string|number|boolean|any|void|never|unknown|null|undefined)\s*(?=[=,)}\]])/g, '')
    // Remove Promise<...> and other generics in return types
    .replace(/:\s*Promise<[^>]*>\s*(?=[=,)}\]])/g, '')
    // Remove Record<...>, Partial<...>, etc.
    .replace(/:\s*(Record|Partial|Pick|Omit|Required|Readonly|Exclude|Extract|NonNullable|ReturnType|InstanceType|Parameters|ConstructorParameters)<[^>]*>\s*(?=[=,)}\]])/g, '')
    // Remove array types
    .replace(/:\s*(\w+|[A-Z]\w*)\[\]\s*(?=[=,)}\]])/g, '')
    // Remove inline object types { ... }
    .replace(/:\s*\{[\s\S]*?\}\s*(?=[=,)}\]])/g, '')
    // Remove array types [...]
    .replace(/:\s*\[[\s\S]*?\]\s*(?=[=,)}\]])/g, '')
    // Remove function parameter type annotations
    .replace(/\(\s*[a-zA-Z_$][\w$]*\s*:\s*[^)]+\)/g, m => m.replace(/:\s*[^,)]+/g, ''))
    // Remove return type annotations
    .replace(/\)\s*:\s*[^{;]+/g, ')')
    // Remove 'as any' in expressions
    .replace(/\s+as\s+any\b/g, '')
    // Remove 'private', 'public', 'protected', 'readonly' modifiers
    .replace(/\b(private|public|protected|readonly)\s+/g, '')
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
  fs.writeFileSync(file, stripped);
  console.log('Stripped TypeScript from ' + file);
}
