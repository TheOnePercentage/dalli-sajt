const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;

const files = [
  'admin/widgets/link-auditor-ui.js',
  'admin/widgets/promotions-manager.js',
  'admin/widgets/markets-regions.js',
  'admin/widgets/language-manager.js',
  'admin-new/js/seo/core-web-vitals/dashboard.js',
  'admin-new/js/seo/core-web-vitals/scoring.js',
  'admin-new/js/seo/core-web-vitals/index.js',
];

// First, backup original files
for (const file of files) {
  if (fs.existsSync(file) && !fs.existsSync(file + '.babel-bak')) {
    fs.copyFileSync(file, file + '.babel-bak');
  }
}

function fixWithBabel(file) {
  const code = fs.readFileSync(file, 'utf8');
  
  try {
    // Parse with TypeScript support and error recovery
    const ast = parser.parse(fs.readFileSync(file, 'utf8'), {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'dynamicImport'],
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      errorRecovery: true,
    });

    // Fix 1: Remove TypeScript-specific syntax
    require('@babel/traverse').default(ast, {
      TSInterfaceDeclaration(path) { path.remove(); },
      TSTypeAliasDeclaration(path) { path.remove(); },
      TSTypeAnnotation(path) { path.remove(); },
      TSAsExpression(path) { path.replaceWith(path.node.expression); },
      TSTypeParameterDeclaration(path) { path.remove(); },
      TSTypeParameterInstantiation(path) { path.remove(); },
      TSInterfaceHeritage(path) { path.remove(); },
      ClassProperty(path) {
        if (path.node.typeAnnotation) path.node.typeAnnotation = null;
        if (path.node.accessibility) delete path.node.accessibility;
        if (path.node.readonly) delete path.node.readonly;
      },
      ClassMethod(path) {
        if (path.node.returnType) path.node.returnType = null;
        if (path.node.typeParameters) path.node.typeParameters = null;
        if (path.node.accessibility) delete path.node.accessibility;
        if (path.node.readonly) delete path.node.readonly;
        if (path.node.params) {
          for (const param of path.node.params) {
            if (param.typeAnnotation) param.typeAnnotation = null;
          }
        }
      },
      FunctionDeclaration(path) {
        if (path.node.returnType) path.node.returnType = null;
        if (path.node.typeParameters) path.node.typeParameters = null;
        if (path.node.params) {
          for (const param of path.node.params) {
            if (param.typeAnnotation) param.typeAnnotation = null;
          }
        }
      },
      ArrowFunctionExpression(path) {
        if (path.node.returnType) path.node.returnType = null;
        if (path.node.typeParameters) path.node.typeParameters = null;
        if (path.node.params) {
          for (const param of path.node.params) {
            if (param.typeAnnotation) param.typeAnnotation = null;
          }
        }
      },
      TSAsExpression(path) {
        path.replaceWith(path.node.expression);
      },
    });

    // Fix 2: Deduplicate class members and object keys
    require('@babel/traverse').default(ast, {
      ClassBody(path) {
        const seen = new Map();
        const newBody = [];
        for (const prop of path.node.body) {
          if (prop.type === 'ClassMethod' || prop.type === 'ClassProperty') {
            const key = prop.key.name || (prop.key.value || '');
            const sig = `${prop.type}:${key}:${prop.static ? 'static' : ''}`;
            if (seen.has(sig)) {
              console.log(`  Removing duplicate: ${sig}`);
            } else {
              seen.set(sig, true);
              newBody.push(prop);
            }
          } else {
            newBody.push(prop);
          }
        }
        if (newBody.length !== path.node.body.length) {
          path.node.body = newBody;
        }
      },
      ObjectExpression(path) {
        const seen = new Map();
        const newProps = [];
        for (const prop of path.node.properties) {
          if (prop.type === 'ObjectProperty' || prop.type === 'ObjectMethod') {
            const key = prop.key.name || (prop.key.value || '');
            if (seen.has(key)) {
              console.log(`  Removing duplicate key: ${key}`);
            } else {
              seen.set(key, true);
              newProps.push(prop);
            }
          } else {
            newProps.push(prop);
          }
        }
        if (newProps.length !== path.node.properties.length) {
          path.node.properties = newProps;
        }
      },
    });

    const output = require('@babel/generator').default(ast, { 
      retainLines: true, 
      jsx: true 
    }).code;
    
    return output;
  } catch (e) {
    console.error('Error processing:', e.message);
    return null;
  }
}

const files = [
  'admin/widgets/link-auditor-ui.js',
  'admin/widgets/promotions-manager.js',
  'admin/widgets/markets-regions.js',
  'admin/widgets/language-manager.js',
  'admin-new/js/seo/core-web-vitals/dashboard.js',
  'admin-new/js/seo/core-web-vitals/scoring.js',
  'admin-new/js/seo/core-web-vitals/index.js',
];

console.log('🔧 Fixing files with Babel parser...\n');

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️  Skipping ${file} - not found`);
    continue;
  }
  
  console.log(`Processing ${file}...`);
  const result = fixWithBabel(file);
  
  if (result) {
    fs.writeFileSync(file, result);
    console.log(`✅ Fixed ${file}`);
  } else {
    console.log(`❌ Failed to fix ${file}`);
  }
}

console.log('\n✅ Done!');
