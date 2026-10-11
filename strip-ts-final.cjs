const fs = require("fs");

function stripTypeScript(code) {
  let result = code;
  
  // 1. Remove interface declarations
  result = result.replace(/^\s*export\s+interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, "");
  result = result.replace(/^\s*interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, "");
  
  // 2. Remove type aliases
  result = result.replace(/^\s*type\s+\w+\s*=.*?;/gm, "");
  
  // 3. Remove 'as any' casts
  result = result.replace(/\s+as\s+(any|const|[A-Z]\w*(?:<[^>]*>)?)\b/g, "");
  
  // 4. Remove modifiers
  result = result.replace(/\b(private|public|protected|readonly)\s+/g, "");
  
  // 5. Remove simple type annotations
  result = result.replace(/:\s*(string|number|boolean|any|void|never|unknown|null|undefined)\s*(?=[=,)}\]]])/g, "");
  result = result.replace(/:\s*Promise<[^>]*>\s*(?=[=,)}\]]])/g, "");
  result = result.replace(/:\s*(Record|Partial|Pick|Omit|Required|Readonly|Exclude|Extract|NonNullable|ReturnType|InstanceType|Parameters|ConstructorParameters)<[^>]*>\s*(?=[=,)}\]]])/g, "");
  result = result.replace(/:\s*\{[\s\S]*?\}\s*(?=[=,)}\]]])/g, "");
  result = result.replace(/:\s*\[[\s\S]*?\]\s*(?=[=,)}\]]])/g, "");
  result = result.replace(/\n\s*\n\s*\n/g, "\n\n");
  
  return result;
}

const files = [
  "admin-new/js/seo/core-web-vitals/dashboard.js",
  "admin-new/js/seo/core-web-vitals/scoring.js",
];

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  const stripped = stripTypeScript(code);
  fs.writeFileSync(file, stripped);
  console.log("Stripped TypeScript from " + file);
}
