import re
import fs = __import__('fs')

def strip_typescript(code):
    result = code
    
    # 1. Remove interface declarations
    result = re.sub(r'^\s*export\s+interface\s+\w+\s*\{[\s\S]*?\n\s*\}', '', result, flags=re.MULTILINE)
    result = re.sub(r'^\s*interface\s+\w+\s*\{[\s\S]*?\n\s*\}', '', result, flags=re.MULTILINE)
    
    # 2. Remove type aliases
    result = re.sub(r'^\s*type\s+\w+\s*=.*?;', '', result, flags=re.MULTILINE)
    
    # 3. Remove 'as any' casts
    result = re.sub(r'\s+as\s+(any|const|[A-Z]\w*(?:<[^>]*>)?)\b', '', result)
    
    # 4. Remove modifiers
    result = re.sub(r'\b(private|public|protected|readonly)\s+', '', result)
    
    # 5. Remove simple type annotations
    result = re.sub(r':\s*(string|number|boolean|any|void|never|unknown|null|undefined)\s*(?=[=,)}\]]])', '', result)
    result = re.sub(r':\s*Promise<[^>]*>\s*(?=[=,)}\]]])', '', result)
    result = re.sub(r':\s*(Record|Partial|Pick|Omit|Required|Readonly|Exclude|Extract|NonNullable|ReturnType|InstanceType|Parameters|ConstructorParameters)<[^>]*>\s*(?=[=,)}\]]])', '', result)
    result = re.sub(r':\s*\{[\s\S]*?\}\s*(?=[=,)}\]]])', '', result)
    result = result.replace(r':\s*\[[\s\S]*?\]\s*(?=[=,)}\]]])', '')
    result = result.replace(r'\n\s*\n\s*\n', '\n\n')
    
    return result

import fs
files = [
    "admin-new/js/seo/core-web-vitals/dashboard.js",
    "admin-new/js/seo/core-web-vitals/scoring.js",
]

for file in files:
    code = fs.readFileSync(file, "utf8")
    stripped = strip_typescript(code)
    fs.writeFileSync(file, stripped)
    print("Stripped TypeScript from " + file)
