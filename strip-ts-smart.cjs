const fs = require("fs");

function stripTypeScript(code) {
  let result = "";
  let inString = false;
  let stringChar = "";
  let inTemplate = false;
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let i = 0;
  
  while (i < code.length) {
    const c = code[i];
    
    if (!inString && !inTemplate && (c === '"' || c === "'" || c === "`")) {
      inString = c !== "`";
      inTemplate = c === "`";
      stringChar = c;
      result += c;
      i++;
      continue;
    }
    
    if (inString && c === stringChar && code[i-1] !== "\\") {
      inString = false;
      stringChar = "";
      result += c;
      i++;
      continue;
    }
    
    if (inTemplate && c === "`" && code[i-1] !== "\\") {
      inTemplate = false;
      result += c;
      i++;
      continue;
    }
    
    if (inString || inTemplate) {
      result += c;
      i++;
      continue;
    }
    
    if (c === "{") braceDepth++;
    else if (c === "}") braceDepth--;
    else if (c === "(") parenDepth++;
    else if (c === ")") parenDepth--;
    else if (c === "[") bracketDepth++;
    else if (c === "]") bracketDepth--;
    
    if (c === " " && code.substring(i, i+4) === " as ") {
      const rest = code.substring(i+4).trimStart();
      if (/^(any|const|[A-Z]\w*(?:<[^>]*>)?)\b/.test(rest)) {
        i += 4;
        while (i < code.length && code[i] === " ") i++;
        while (i < code.length && /[A-Za-z0-9_<>]/.test(code[i])) i++;
        continue;
      }
    }
    
    if (c === "p" && code.substring(i, i+7) === "private" && !/[A-Za-z0-9_$]/.test(code[i+7] || "")) {
      i += 7;
      while (i < code.length && /\s/.test(code[i+1] || "")) i++;
      continue;
    }
    if (c === "p" && code.substring(i, i+6) === "public" && !/[A-Za-z0-9_$]/.test(code[i+6] || "")) {
      i += 6;
      while (i < code.length && /\s/.test(code[i+1] || "")) i++;
      continue;
    }
    if (c === "p" && code.substring(i, i+9) === "protected" && !/[A-Za-z0-9_$]/.test(code[i+9] || "")) {
      i += 9;
      while (i < code.length && /\s/.test(code[i+1] || "")) i++;
      continue;
    }
    if (c === "r" && code.substring(i, i+8) === "readonly" && !/[A-Za-z0-9_$]/.test(code[i+8] || "")) {
      i += 8;
      while (i < code.length && /\s/.test(code[i+1] || "")) i++;
      continue;
    }
    
    if (c === ":" && parenDepth > 0 && bracketDepth === 0 && braceDepth === 0) {
      const remaining = code.substring(i+1).trimStart();
      if (/^(string|number|boolean|any|void|never|unknown|null|undefined|Promise|Record|Partial|Pick|Omit|Required|Readonly|Exclude|Extract|NonNullable|ReturnType|InstanceType|Parameters|ConstructorParameters|Array|Map|Set|WeakMap|WeakSet|[A-Z][a-zA-Z0-9]*)(<[^>]*>)?\s*(?:[\]]\s,=)])/.test(remaining)) {
        let j = i + 1;
        let depth = 0;
        while (j < code.length) {
          const cc = code[j];
          if (cc === "<") depth++;
          else if (cc === ">") { depth--; if (depth === 0) break; }
          else if (cc === ">" && depth === 0) break;
          j++;
        }
        i = j;
        continue;
      }
    }
    
    if (c === ")" && code[i+1] === ":" && braceDepth > 0) {
      let j = i + 2;
      let depth = 0;
      while (j < code.length) {
        const cc = code[j];
        if (cc === "<") depth++;
        else if (cc === ">") { depth--; if (depth === 0) break; }
        else if (cc === ">" && depth === 0) break;
        j++;
      }
      i = j;
      continue;
    }
    
    result += c;
    i++;
  }
  
  let final = result;
  final = final.replace(/^\s*export\s+interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, "");
  final = final.replace(/^\s*interface\s+\w+\s*\{[\s\S]*?\n\s*\}/gm, "");
  final = final.replace(/^\s*type\s+\w+\s*=.*?;/gm, "");
  final = final.replace(/\s+as\s+(any|const|[A-Z]\w*(?:<[^>]*>)?)\b/g, "");
  final = final.replace(/\b(private|public|protected|readonly)\s+/g, "");
  final = final.replace(/\n\s*\n\s*\n/g, "\n\n");
  
  return final;
}

const fs = require("fs");
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
