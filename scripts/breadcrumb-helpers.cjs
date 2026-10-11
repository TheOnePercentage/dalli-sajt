// breadcrumb-helpers.js
// Shared breadcrumb generation logic for products and categories

const SITE_URL = 'https://dalli.rs';

function getCategoryUrl(category, gender) {
    if (category === 'dukseri') return '/dukseri.html';
    if (category === 'trenerke') {
        return gender === 'zenski' ? '/zenska-garderoba.html#trenerke' : '/muska-garderoba.html#trenerke';
    }
    if (category === 'majice') {
        return gender === 'zenski' ? '/zenska-garderoba.html#majice' : '/muska-garderoba.html#majice';
    }
    return '/products.html#ostalo';
}

function getCategoryName(category) {
    const names = { majice: 'Majice', trenerke: 'Trenerke', dukseri: 'Duksevi', ostalo: 'Ostalo' };
    return names[category] || category;
}

function generateProductBreadcrumbs(product) {
    const categoryUrl = getCategoryUrl(product.category, product.gender);
    const categoryName = getCategoryName(product.category);
    
    return [
        { name: 'Početna', url: '/' },
        { name: 'Svi Proizvodi', url: '/products.html' },
        { name: categoryName, url: categoryUrl },
        { name: product.name, url: `/proizvod-${product.slug}.html` }
    ];
}

function generateCategoryBreadcrumbs(categoryKey) {
    const categoryTitles = {
        'muska-garderoba': 'Muška Garderoba',
        'zenska-garderoba': 'Ženska Garderoba',
        'dukseri': 'Duksevi (Hoodie)',
        'products': 'Svi Proizvodi'
    };
    
    return [
        { name: 'Početna', url: '/' },
        { name: categoryTitles[categoryKey] || categoryKey, url: `/${categoryKey}.html` }
    ];
}

function renderBreadcrumbHtml(breadcrumbs) {
    return breadcrumbs.map((crumb, index) => {
        const position = index + 1;
        const isLast = index === breadcrumbs.length - 1;
        
        if (isLast) {
            return `<li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                <span class="breadcrumb-current" itemprop="name">${crumb.name}</span>
                <meta itemprop="position" content="${position}">
            </li>`;
        }
        
        return `<li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <a href="${crumb.url}" itemprop="item" class="breadcrumb-link">
                <span itemprop="name">${crumb.name}</span>
            </a>
            <meta itemprop="position" content="${position}">
        </li>`;
    }).join('\n');
}

function renderBreadcrumbSchema(breadcrumbs) {
    const items = breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': crumb.name,
        'item': `${SITE_URL}${crumb.url}`
    }));
    
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': items
    };
}

module.exports = {
    generateProductBreadcrumbs,
    generateCategoryBreadcrumbs,
    renderBreadcrumbHtml,
    renderBreadcrumbSchema,
    getCategoryUrl,
    getCategoryName
};