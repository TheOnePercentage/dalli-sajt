#!/usr/bin/env node
/**
 * fix-remaining-corruption.cjs
 * Fixes remaining corruption in HTML files:
 * 1. Restores "od" removed from words: pructs→products, hoies→hoodies, features.c→features.cod, proizvi→proizvodi
 * 2. Removes duplicate head/meta sections inside <body> of category pages
 * 3. Fixes nested/duplicated i18n spans
 * 4. Fixes corrupted title/meta/schema content
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function fixOdRemoval(content) {
    let fixes = 0;

    // 1. Fix corrupted i18n keys and text: pructs → products
    const pructsReplacements = [
        // i18n keys
        [/data-i18n="common\.pructs"/g, 'data-i18n="common.products"'],
        [/data-i18n="pructs\.title"/g, 'data-i18n="meta.categoryTitle"'],
        [/data-i18n="inventory\.table\.pruct"/g, 'data-i18n="product.specsTitle"'],
        // URLs
        [/\/pructs\.html/g, '/products.html'],
        [/dalli\.rs\/pructs\.html/g, 'dalli.rs/products.html'],
        [/og-pructs\.svg/g, 'og-products.svg'],
        // text in titles/meta/schema
        [/Svi proizvi DALLI/g, 'Svi proizvodi DALLI'],
        [/proizvi,/g, 'proizvodi,'],
        [/proizvi<\/h2>/g, 'proizvodi</h2>'],
        [/Svi Pructs/g, 'Svi Proizvodi'],
        [/Svi proizv\b/g, 'Svi proizvodi'],
        // "Proizv</th>i" pattern - "od" removed from Proizvodi
        [/Proizvi/g, 'Proizvodi'],
        [/proizvi/g, 'proizvodi'],
        // bare pructs in text
        [/\bpructs\b/g, 'products'],
        [/\bPructs\b/g, 'Products'],
    ];
    for (const [re, rep] of pructsReplacements) {
        const before = content;
        content = content.replace(re, rep);
        if (content !== before) fixes++;
    }

    // 2. Fix hoies → hoodies in i18n keys
    content = content.replace(/data-i18n="categories\.hoies\./g, 'data-i18n="categories.hoodies.');
    content = content.replace(/\(Hoie\)/g, '(Hoodie)');

    // 3. Fix features.c → features.cod
    content = content.replace(/data-i18n="features\.c\.title"/g, 'data-i18n="features.cod.title"');
    content = content.replace(/data-i18n="features\.c\.desc"/g, 'data-i18n="features.cod.desc"');

    return content;
}

function fixNestedSpans(content) {
    // Fix: <span data-i18n="X"><span data-i18n="X">text</span></span> → <span data-i18n="X">text</span>
    // Repeatedly until no more matches
    let prev;
    let count = 0;
    do {
        prev = content;
        content = content.replace(
            /<span([^>]*data-i18n="[^"]*"[^>]*)>\s*<span([^>]*data-i18n="[^"]*"[^>]*)>([^<]*(?:<[^\/][^>]*>[^<]*)*?)<\/span>\s*<\/span>/g,
            '<span$1>$3</span>'
        );
        count++;
    } while (content !== prev && count < 20);
    return content;
}

function removeDuplicateHeadSections(content, fileName) {
    // Category pages have duplicate <meta charset> + <title> + SEO sections
    // after the <script type="module" src="/js/app.jsx" defer></script> line
    const lines = content.split('\n');

    // Find the app.jsx script line
    let appJsxLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<script type="module"') && lines[i].includes('app.jsx')) {
            appJsxLine = i;
        }
    }
    if (appJsxLine === -1) return content;

    // Check if there are duplicate <meta charset> after app.jsx
    let dupCharsetAfter = 0;
    for (let i = appJsxLine + 1; i < lines.length; i++) {
        if (lines[i].includes('<meta charset')) dupCharsetAfter++;
    }
    if (dupCharsetAfter === 0) return content;

    // Keep lines 0..appJsxLine, then add closing tags
    const kept = lines.slice(0, appJsxLine + 1);
    // Remove any trailing empty lines
    while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();

    // Check if i18n.js script exists in the kept portion (at end of body)
    const keptContent = kept.join('\n');
    let closing = '';
    if (!keptContent.includes('/js/i18n/i18n.js')) {
        closing += '<script src="/js/i18n/i18n.js"></script>\n';
    }
    closing += '</body>\n</html>';

    console.log(`  ${fileName}: removed ${dupCharsetAfter} duplicate head sections, kept ${kept.length} lines`);
    return kept.join('\n') + '\n' + closing;
}

function fixTitleMetaSchema(content) {
    // Fix corrupted <title> with nested HTML tags inside
    content = content.replace(
        /<title>[\s\S]*?<\/title>/g,
        (match) => {
            const text = match
                .replace(/^<title>/, '')
                .replace(/<\/title>$/, '')
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/\s+/g, ' ')
                .trim();
            if (text.length > 0 && text.length < 300) {
                return `<title>${text}</title>`;
            }
            return match;
        }
    );

    // Fix og:title / twitter:title content attributes with broken nested HTML/quotes
    // Uses greedy match to capture across broken inner quotes
    content = content.replace(
        /content="(.*)">\s*$/gm,
        (match, inner) => {
            if (!inner.includes('<')) return match;
            if (!inner.includes('data-i18n') && !inner.includes('<h1') && !inner.includes('<th') && !inner.includes('<span')) return match;
            const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (text.length > 0) return `content="${text}">`;
            return match;
        }
    );

    // Fix JSON-LD "name" fields with nested HTML (greedy match across broken quotes)
    content = content.replace(
        /"name":\s*"(.*)"/g,
        (match, inner) => {
            if (!inner.includes('<')) return match;
            if (!inner.includes('data-i18n') && !inner.includes('<h1') && !inner.includes('<th') && !inner.includes('<span')) return match;
            const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (text.length > 0) return `"name": "${text}"`;
            return match;
        }
    );

    return content;
}

function fixAriaLabelsWithSpans(content) {
    // Fix aria-label="DALLI - <span data-i18n=...">Početna</span>"
    content = content.replace(
        /aria-label="([^"]*<(?:span|h1|th)[^"]*)"/g,
        (match, inner) => {
            const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (text.length > 0) return `aria-label="${text}"`;
            return match;
        }
    );
    return content;
}

function fixHrefWithSpans(content) {
    // Fix href attributes with embedded i18n spans (shouldn't happen but does)
    content = content.replace(
        /href="([^"]*<span[^"]*)"/g,
        (match, inner) => {
            const text = inner.replace(/<[^>]+>/g, '').trim();
            if (text.length > 0) return `href="${text}"`;
            return match;
        }
    );
    return content;
}

function processFile(filePath) {
    const relPath = path.relative(ROOT, filePath);
    const original = fs.readFileSync(filePath, 'utf8');
    let content = original;

    content = fixOdRemoval(content);
    content = removeDuplicateHeadSections(content, relPath);
    content = fixNestedSpans(content);
    content = fixTitleMetaSchema(content);
    content = fixAriaLabelsWithSpans(content);
    content = fixHrefWithSpans(content);

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        const origLines = original.split('\n').length;
        const newLines = content.split('\n').length;
        console.log(`  FIXED: ${relPath} (${origLines} → ${newLines} lines)`);
        return true;
    }
    return false;
}

// Collect all HTML files
function collectHtmlFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectHtmlFiles(full, files);
        } else if (entry.name.endsWith('.html')) {
            files.push(full);
        }
    }
    return files;
}

console.log('=== Fixing Remaining Corruption ===\n');

const files = collectHtmlFiles(ROOT);
let fixedCount = 0;

for (const file of files) {
    if (processFile(file)) fixedCount++;
}

console.log(`\n=== Done: ${fixedCount} files fixed out of ${files.length} checked ===`);
