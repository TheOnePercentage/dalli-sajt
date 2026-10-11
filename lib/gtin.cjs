/**
 * GTIN-13 (EAN-13) Generator
 * Generates valid GTIN-13 (EAN-13) codes from SKU strings
 * Includes check digit validation per GS1 standard
 */

/**
 * Generate GTIN-13 from SKU
 * @param {string} sku - Product SKU (e.g., "ML-001")
 * @returns {string} 13-digit GTIN-13 code
 */
function generateGTIN13(sku) {
  // Extract digits from SKU, pad to 12 digits, take first 12
  const digits = sku
    .replace(/[^0-9]/g, '')
    .padStart(12, '0')
    .slice(0, 12);
  
  // Calculate check digit per GS1/EAN-13 standard
  // Sum of digits in odd positions (1,3,5...) * 1 + even positions (2,4,6...) * 3
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    // Position 1,3,5,7,9,11 (0-indexed: 0,2,4,6,8,10) = weight 1
    // Position 2,4,6,8,10,12 (0-indexed: 1,3,5,7,9,11) = weight 3
    const weight = (i % 2 === 0) ? 1 : 3;
    sum += digit * weight;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return digits + checkDigit;
}

/**
 * Validate existing GTIN-13
 * @param {string} gtin - 13-digit GTIN to validate
 * @returns {boolean} True if valid
 */
function validateGTIN13(gtin) {
  if (!gtin || gtin.length !== 13 || !/^\d{13}$/.test(gtin)) {
    return false;
  }
  
  const digits = gtin.slice(0, 12);
  const providedCheckDigit = parseInt(gtin[12], 10);
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    const weight = (i % 2 === 0) ? 1 : 3;
    sum += digit * weight;
  }
  
  const expectedCheckDigit = (10 - (sum % 10)) % 10;
  return providedCheckDigit === expectedCheckDigit;
}

/**
 * Generate GTIN-13 from product SKU with company prefix
 * @param {string} sku - Product SKU (e.g., "ML-001")
 * @param {string} prefix - Company prefix (default: "383") - 3 digits for country/company
 * @returns {string} 13-digit GTIN-13
 */
function generateGTIN13FromSKU(sku, prefix = "383") {
  // Extract numeric part from SKU
  const numericPart = sku.replace(/[^0-9]/g, '');
  
  // Use company prefix (3 digits) + padded item reference (9 digits) = 12 digits
  const itemRef = numericPart.padStart(9, '0').slice(0, 9);
  const twelveDigits = prefix + itemRef;
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(twelveDigits[i], 10);
    const weight = (i % 2 === 0) ? 1 : 3;
    sum += parseInt(twelveDigits[i], 10) * weight;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return twelveDigits + checkDigit;
}

module.exports = {
  generateGTIN13,
  validateGTIN13,
  generateGTIN13FromSKU
};
