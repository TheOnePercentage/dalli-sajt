// inventory-helpers.js
// Dynamic inventory computation from sizes array

function computeInventory(product) {
    const sizes = product.sizes || [];
    const totalStock = sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
    const availableSizes = sizes.filter(s => s.available && (s.stock || 0) > 0);
    const lowStockSizes = sizes.filter(s => s.available && s.stock > 0 && s.stock <= (product.inventory?.lowStockThreshold || 10));
    const outOfStockSizes = sizes.filter(s => s.available && (s.stock || 0) === 0);
    
    let status = 'in_stock';
    if (totalStock === 0) {
        status = 'out_of_stock';
    } else if (lowStockSizes.length > 0 && availableSizes.length === lowStockSizes.length) {
        // All available sizes are low stock
        status = 'low_stock';
    } else if (lowStockSizes.length > 0) {
        // Some sizes low stock
        status = 'in_stock'; // Still in_stock overall, but with low stock variants
    }
    
    // Check for preorder flag
    if (product.inventory?.allowBackorder && status === 'out_of_stock') {
        status = 'preorder';
    }
    
    return {
        totalStock,
        status,
        availableSizes: availableSizes.length,
        totalSizes: sizes.filter(s => s.available).length,
        lowStockSizes: lowStockSizes.map(s => ({ size: s.size, stock: s.stock })),
        outOfStockSizes: outOfStockSizes.map(s => s.size),
        lowStockThreshold: product.inventory?.lowStockThreshold || 10,
        trackInventory: product.inventory?.trackInventory !== false,
        allowBackorder: product.inventory?.allowBackorder === true,
        hasVariants: sizes.length > 1,
        // For Schema.org
        schemaAvailability: status === 'out_of_stock' ? 'OutOfStock' : 
                           status === 'preorder' ? 'PreOrder' : 'InStock',
        // For display
        displayLabel: status === 'out_of_stock' ? 'Nije na stanju' :
                     status === 'preorder' ? 'Prednarudžbina' :
                     status === 'low_stock' ? 'Malo na stanju' : 'Na stanju',
        displayDetail: status === 'out_of_stock' ? 'Trenutno nema dostupnih veličina' :
                      status === 'preorder' ? 'Dostupno za prednarudžbinu' :
                      status === 'low_stock' ? `Preostalo ${totalStock} komada (neke veličine su malo)` :
                      `${totalStock} komada na stanju`
    };
}

function getSizeAvailability(size, product) {
    const inv = computeInventory(product);
    if (!size.available) return 'unavailable';
    if (!size.stock || size.stock === 0) return 'out_of_stock';
    if (size.stock <= (product.inventory?.lowStockThreshold || 10)) return 'low_stock';
    return 'in_stock';
}

function getSizeStockLabel(size, product) {
    const availability = getSizeAvailability(size, product);
    const labels = {
        in_stock: `${size.stock} kom.`,
        low_stock: `Samo ${size.stock} kom.!`,
        out_of_stock: 'Nema na stanju',
        unavailable: 'Nedostupno'
    };
    return labels[availability];
}

function getSizeStockClass(size, product) {
    return `size-stock-${getSizeAvailability(size, product)}`;
}

module.exports = {
    computeInventory,
    getSizeAvailability,
    getSizeStockLabel,
    getSizeStockClass
};