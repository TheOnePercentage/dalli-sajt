const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

const filesToConvert = [
  "admin/widgets/link-auditor-ui.js",
  "admin/widgets/promotions-manager.js",
  "admin/widgets/markets-regions.js",
  "admin/widgets/language-manager.js",
  "admin-new/js/seo/core-web-vitals/dashboard.js",
  "admin-new/js/seo/core-web-vitals/scoring.js",
  "admin-new/js/seo/core-web-vitals/index.js",
];

function convertFile(inputPath, outputPath) {
  const code = fs.readFileSync(inputPath, "utf8");
  
  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript", "dynamicImport"],
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      errorRecovery: true,
    });
    
    const visitor = {
      CallExpression(path) {
        const callee = path.node.callee;
        if (callee.type === "MemberExpression" &&
            callee.object.type === "Identifier" &&
            callee.object.name === "React" &&
            callee.property.type === "Identifier" &&
            callee.property.name === "createElement") {
          
          const args = path.node.arguments;
          if (args.length < 1) return;
          
          const tagArg = args[0];
          const propsArg = args[1];
          const childArgs = args.slice(2);
          
          if (tagArg.type !== "StringLiteral") return;
          
          const tagName = t.jsxIdentifier(tagArg.value);
          let attributes = [];
          
          if (propsArg && propsArg.type === "ObjectExpression") {
            for (const prop of propsArg.properties) {
              if (prop.type !== "ObjectProperty") continue;
              
              const key = prop.key.type === "Identifier" ? prop.key.name : 
                         prop.key.type === "StringLiteral" ? prop.key.value : null;
              if (!key) continue;
              
              const value = prop.value;
              
              if (key === "style" && value.type === "ObjectExpression") {
                const styleStr = value.properties.map(p => 
                  (p.key.type === "Identifier" ? p.key.name : p.key.value) + ": " + p.value.value
                ).join("; ");
                attributes.push(t.jsxAttribute(t.jsxIdentifier("style"), t.stringLiteral(styleStr)));
              } else if (key.startsWith("on") && (value.type === "ArrowFunctionExpression" || value.type === "FunctionExpression")) {
                attributes.push(t.jsxAttribute(t.jsxIdentifier(key), t.jsxExpressionContainer(value)));
              } else if (value.type === "StringLiteral") {
                attributes.push(t.jsxAttribute(t.jsxIdentifier(key), t.stringLiteral(value.value)));
              } else if (value.type === "NumericLiteral" || value.type === "BooleanLiteral") {
                attributes.push(t.jsxAttribute(t.jsxIdentifier(key), t.jsxExpressionContainer(value)));
              } else {
                attributes.push(t.jsxAttribute(t.jsxIdentifier(key), t.jsxExpressionContainer(value)));
              }
            }
          }
          
          const jsxChildren = [];
          for (const child of childArgs) {
            if (child.type === "StringLiteral") {
              jsxChildren.push(t.jsxText(child.value));
            } else if (child.type === "CallExpression" && 
                       child.callee.type === "MemberExpression" &&
                       child.callee.object.type === "Identifier" &&
                       child.callee.object.name === "React" &&
                       child.callee.property.name === "createElement") {
              jsxChildren.push(t.jsxExpressionContainer(child));
            } else if (child.type === "ArrayExpression") {
              for (const item of child.elements) {
                if (item && item.type === "CallExpression" && 
                    item.callee.type === "MemberExpression" &&
                    item.callee.object.type === "Identifier" &&
                    item.callee.object.name === "React" &&
                    item.callee.property.name === "createElement") {
                  jsxChildren.push(t.jsxExpressionContainer(item));
                } else if (item && item.type === "StringLiteral") {
                  jsxChildren.push(t.jsxText(item.value));
                } else if (item) {
                  jsxChildren.push(item);
                }
              }
            } else if (child.type === "ArrowFunctionExpression" || child.type === "FunctionExpression") {
              jsxChildren.push(t.jsxExpressionContainer(child));
            } else if (child.type === "ConditionalExpression" || child.type === "LogicalExpression") {
              jsxChildren.push(t.jsxExpressionContainer(child));
            } else {
              jsxChildren.push(child);
            }
          }
          
          const jsxElement = t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier(tagArg.value), attributes, jsxChildren.length === 0),
            jsxChildren.length > 0 ? t.jsxClosingElement(t.jsxIdentifier(tagArg.value)) : null,
            jsxChildren
          );
          
          path.replaceWith(jsxElement);
        }
      }
    };
    
    const visitor2 = {
      TSInterfaceDeclaration(path) { path.remove(); },
      TSTypeAnnotation(path) { path.remove(); },
      TSAsExpression(path) { path.replaceWith(path.node.expression); },
      TSTypeAliasDeclaration(path) { path.remove(); },
      TSEnumDeclaration(path) { path.remove(); },
      TSModuleDeclaration(path) { path.remove(); },
      TSTypeParameterDeclaration(path) { path.remove(); },
      TSTypeParameterInstantiation(path) { path.remove(); },
      ClassProperty(path) {
        if (path.node.accessibility) delete path.node.accessibility;
        if (path.node.readonly) delete path.node.readonly;
      },
      ClassMethod(path) {
        if (path.node.accessibility) delete path.node.accessibility;
        if (path.node.readonly) delete path.node.readonly;
      },
      TSAsExpression(path) {
        path.replaceWith(path.node.expression);
      },
    };
    
    require("@babel/traverse").default(ast, visitor2);
    
    const dedupeVisitor = {
      ClassBody(path) {
        const seen = new Map();
        const newBody = [];
        for (const prop of path.node.body) {
          if (prop.type === "ClassMethod" || prop.type === "ClassProperty") {
            const key = prop.key.name || (prop.key.value || "");
            const sig = prop.type + ":" + key + ":" + (prop.static ? "static" : "");
            if (seen.has(sig)) {
              console.log("  Removing duplicate: " + sig);
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
          if (prop.type === "ObjectProperty" || prop.type === "ObjectMethod") {
            const key = prop.key.name || (prop.key.value || "");
            if (seen.has(key)) {
              console.log("  Removing duplicate key: " + key);
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
    };
    
    require("@babel/traverse").default(ast, dedupeVisitor);
    
    const output = require("@babel/generator").default(ast, { retainLines: true, jsx: true }).code;
    return output;
  } catch (e) {
    console.error("Error:", e.message);
    return null;
  }
}

const filesToProcess = [
  "admin/widgets/link-auditor-ui.js",
  "admin/widgets/promotions-manager.js",
  "admin/widgets/markets-regions.js",
  "admin/widgets/language-manager.js",
  "admin-new/js/seo/core-web-vitals/dashboard.js",
  "admin-new/js/seo/core-web-vitals/scoring.js",
  "admin-new/js/seo/core-web-vitals/index.js",
];

for (const file of filesToConvert) {
  const inputPath = path.join(process.cwd(), file);
  const outputPath = inputPath.replace(".js", ".jsx");
  
  if (!fs.existsSync(inputPath)) {
    console.log("Skipping " + file + " - not found");
    continue;
  }
  
  console.log("Processing " + file + "...");
  const result = convertFile(inputPath, outputPath);
  
  if (result) {
    fs.writeFileSync(outputPath, result);
    console.log("Converted " + file + " -> " + outputPath);
  } else {
    console.log("Failed to convert " + file);
  }
}

console.log("Done!");
