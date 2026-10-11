const fs = require('fs');

function stripTypeScript(code) {
  let result = code;
  
  // 1. Remove interface declarations (export interface X { ... })
  result = result.replace(/^\s*export\s+interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, '');
  result = result.replace(/^\s*interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, '');
  
  // 2. Remove type aliases: type X = ...
  result = result.replace(/^\s*type\s+\w+\s*=.*?;/gm, '');
  
  // 3. Remove 'as any' casts (but not in strings)
  // Use a simple state machine to avoid string literals
  let result2 = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < result.length; i++) {
    const c = result[i];
    if (!inString && (c === '"' || c === "'" || c === '`')) {
      inString = true;
      stringChar = c;
      result2 += c;
    } else if (inString && c === stringChar && result[i-1] !== '\\') {
      inString = false;
      result2 += c;
    } else if (!inString && c === ' ' && result.substring(i, i+6) === ' as ') {
      // Check if it's 'as any' or 'as TypeName'
      const rest = result.substring(i+4).trimStart();
      if (/^(any|const|[A-Z]\w*(?:<[^>]*>)?)\b/.test(rest)) {
        // Skip 'as TypeName' or 'as any'
        i += 3; // skip ' as'
        // Skip whitespace
        while (result[i+1] === ' ') i++;
        // Skip the type name
        while (i+1 < result.length && /[A-Za-z0-9_<>]/.test(result[i+1])) i++;
        continue;
      } else {
        result2 += c;
      }
    }
    result = result2;
    
    // Remove 'private', 'public', 'protected', 'readonly' modifiers (but not in strings)
    // Use a similar approach for modifiers
    let result3 = '';
    let inString2 = false;
    let stringChar2 = '';
    for (let i = 0; i < result.length; i++) {
      const c = result[i];
      if (!inString2 && (c === '"' || c === "'" || c === '`')) {
        inString2 = true;
        stringChar2 = c;
        result3 += c;
      } else if (inString2 && c === stringChar2 && result[i-1] !== '\\') {
        inString2 = false;
        result3 += c;
      } else if (!inString2) {
        // Check for modifiers at word boundaries
        if (c === 'p' && result.substring(i, i+7) === 'private' && !/[A-Za-z0-9_$]/.test(result[i+7])) {
          i += 6; // skip 'private'
          // skip following whitespace
          while (i+1 < result.length && /\s/.test(result[i+1])) i++;
          continue;
        }
        if (c === 'p' && result.substring(i, i+6) === 'public' && !/[A-Za-z0-9_$]/.test(result[i+6])) {
          i += 5;
          while (i+1 < result.length && /\s/.test(result[i+1])) i++;
          continue;
        }
        if (c === 'p' && result.substring(i, i+9) === 'protected' && !/[A-Za-z0-9_$]/.test(result[i+9])) {
          i += 8;
          while (i+1 < result.length && /\s/.test(result[i+1])) i++;
          continue;
        }
        if (c === 'r' && result.substring(i, i+8) === 'readonly' && !/[A-Za-z0-9_$]/.test(result[i+8])) {
          i += 7;
          while (i+1 < result.length && /\s/.test(result[i+1])) i++;
          continue;
        }
        result3 += c;
      }
      result = result3;
    
    // Remove type annotations: : Type (but not in ternary, object literals, etc.)
    // This is complex - we'll use a simpler approach: remove : Type where Type looks like a TS type
    let result4 = '';
    let inString4 = false;
    let stringChar4 = '';
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;
    
    for (let i = 0; i < result.length; i++) {
      const c = result[i];
      if (!inString4 && (c === '"' || c === "'" || c === '`')) {
        inString4 = true;
        stringChar4 = c;
        result4 += c;
      } else if (inString4 && c === stringChar4 && result[i-1] !== '\\') {
        inString4 = false;
        result4 += c;
      } else if (!inString4) {
        if (c === '(') parenDepth++;
        else if (c === ')') parenDepth--;
        else if (c === '{') braceDepth++;
        else if (c === '}') braceDepth--;
        else if (c === '[') bracketDepth++;
        else if (c === ']') bracketDepth--;
        
        if (c === ':' && parenDepth > 0 && bracketDepth === 0) {
          // This might be a type annotation in function params
          // Look ahead to see if it's a type annotation
          const remaining = result.substring(i+1).trimStart();
          const typeMatch = remaining.match(/^(string|number|boolean|any|void|never|unknown|null|undefined|Promise|Record|Partial|Pick|Omit|Required|Readonly|Exclude|Extract|NonNullable|ReturnType|InstanceType|Parameters|ConstructorParameters|Array|Map|Set|WeakMap|WeakSet|[A-Z][a-zA-Z0-9]*)(<[^>]*>)?\s*(?:[\]\s,=)])/);
          if (typeMatch) {
            // Skip the type annotation
            let j = i + 1;
            let depth = 0;
            while (j < result.length) {
              const cc = result[j];
              if (cc === '<') depth++;
              else if (cc === '>') { depth--; if (depth === 0) break; }
              else if (cc === '>' && depth === 0) break;
              j++;
            }
            i = j;
            continue;
          }
        }
        result4 += c;
      }
      result = result4;
    
    // Clean up empty lines
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return result;
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
