const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');
const lines = js.split('\n');

// Fix line 3180 (index 3179) - match actual content with triple backslashes
const oldLine1 = '            <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label="${escapeHtml(\\\"Dodaj \\\" + product.name + \\\" na listu želja\\\")}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>';
const newLine1 = '            <button class="product-card__wishlist" data-action="wishlist" data-product-id="${product.id}" aria-label=\'${escapeHtml("Dodaj " + product.name + " na listu želja")}\'><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>';

if (lines[3179] === oldLine1) {
  lines[3179] = newLine1;
  console.log('Fixed line 3180');
} else {
  console.log('Line 3180 mismatch');
  console.log('Expected:', JSON.stringify(oldLine1));
  console.log('Actual:', JSON.stringify(lines[3179]));
}

// Fix line 3181 (index 3180)
const oldLine2 = '            <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant?.color}-${variant?.size}" aria-label="${escapeHtml(\\\"Brzo dodaj \\\" + product.name + \\\" u korpu\\\")}">Dodaj u korpu</button>';
const newLine2 = '            <button class="product-card__quick-add" data-action="quick-add" data-product-id="${product.id}" data-variant-id="${product.id}-${variant?.color}-${variant?.size}" aria-label=\'${escapeHtml("Brzo dodaj " + product.name + " u korpu")}\'>Dodaj u korpu</button>';

if (lines[3180] === oldLine2) {
  lines[3180] = newLine2;
  console.log('Fixed line 3181');
} else {
  console.log('Line 3181 mismatch');
  console.log('Expected:', JSON.stringify(oldLine2));
  console.log('Actual:', JSON.stringify(lines[3180]));
}

fs.writeFileSync('js/app.js', lines.join('\n'));
console.log('Done');