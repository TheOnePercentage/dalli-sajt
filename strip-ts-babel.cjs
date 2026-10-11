
const fs = require("fs");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;

const files = [
  "admin-new/js/seo/core-web-vitals/dashboard.js",
  "admin-new/js/seo/core-web-vitals/scoring.js",
];

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  
  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["typescript"],
      errorRecovery: true,
    });
    
    // Remove TypeScript-specific nodes
    require("@babel/traverse").default(ast, {
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
    
    const output = require("@babel/generator").default(ast, { retainLines: true }).code;
    fs.writeFileSync(file, output);
    console.log("Stripped TypeScript from " + file);
  } catch (e) {
    console.error("Error processing " + file + ":", e.message);
  }
}

console.log("Done!");
