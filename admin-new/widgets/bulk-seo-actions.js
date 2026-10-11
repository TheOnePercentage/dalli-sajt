import React, { useState, useEffect } from 'react';

const BulkSeoActionsWidget = ({ value, onChange, config = {} }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [focusKeyword, setFocusKeyword] = useState('');

  const allProducts = config.products || [];
  const selectedCount = selectedProducts.length;

  const generateForSelected = async () => {
    if (selectedCount === 0) return;
    setGenerating(true);
    setResults([]);

    const newResults = [];
    for (const product of selectedProducts) {
      const title = `${product.naziv} - DALLI | ${product.cena?.toLocaleString('sr-RS')} RSD`.substring(0, 60);
      const desc = `${(product.kratak_opis || '').substring(0, 140)} Kupovina na rate. Besplatna dostava >5000 RSD.`.substring(0, 160);
      const ogTitle = `${product.naziv} - DALLI`.substring(0, 60);
      const canonical = product.sku ? `https://dalli.rs/proizvod-${product.sku.toLowerCase()}.html` : 'https://dalli.rs';
      
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.naziv,
        description: product.kratak_opis || '',
        image: product.glavna_slika ? [product.glavna_slika] : [],
        brand: { '@type': 'Brand', name: 'DALLI' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'RSD',
          price: product.cena,
          availability: 'https://schema.org/InStock'
        }
      };

      newResults.push({
        sku: product.sku,
        naziv: product.naziv,
        meta_title: title,
        meta_description: desc,
        og_title: ogTitle,
        meta_description: desc,
        canonical,
        schema,
        score: 85
      });
    }

    setResults(newResults);
    setGenerating(false);
  };

  const applyResults = () => {
    if (results.length === 0) return;
    onChange(results);
    setResults([]);
  };

  const toggleSelect = (sku) => {
    setSelectedProducts(prev => 
      prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCount === allProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(allProducts.map(p => p.sku));
    }
  };

  return React.createElement('div', { className: 'bulk-seo-widget' },
    React.createElement('div', { className: 'bulk-seo-header' },
      React.createElement('label', { className: 'select-all' },
        React.createElement('input', {
          type: 'checkbox',
          checked: selectedCount === allProducts.length && allProducts.length > 0,
          indeterminate: selectedCount > 0 && selectedCount < allProducts.length,
          onChange: toggleSelectAll
        }),
        React.createElement('span', null, `Izaberi sve (${allProducts.length})`)
      ),
      React.createElement('span', { className: 'selected-count' }, 
        selectedCount > 0 ? `Izabrano: ${selectedCount}` : 'Nijedan proizvod nije izabran'
      )
    ),

    React.createElement('div', { className: 'bulk-seo-actions' },
      React.createElement('input', {
        type: 'text',
        placeholder: 'Globalna fokus ključna reč (opciono)',
        value: focusKeyword,
        onChange: (e) => setFocusKeyword(e.target.value),
        style: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', width: '250px' }
      }),
      React.createElement('button', {
        type: 'button',
        className: 'btn btn-primary',
        onClick: generateForSelected,
        disabled: generating || selectedCount === 0
      }, generating ? 'Generiši...' : `Generiši SEO za ${selectedCount} proizvoda`),
      results.length > 0 && React.createElement('button', {
        type: 'button',
        className: 'btn btn-success',
        onClick: applyResults
      }, `Primeni na ${results.length} proizvoda`)
    ),

    selectedCount > 0 && React.createElement('div', { className: 'selected-list' },
      React.createElement('h4', null, `Izabrani proizvodi (${selectedCount})`),
      React.createElement('ul', null,
        selectedProducts.map(sku => {
          const p = allProducts.find(x => x.sku === sku);
          return p && React.createElement('li', { key: sku },
            React.createElement('input', {
              type: 'checkbox',
              checked: true,
              onChange: () => toggleSelect(sku)
            }),
            React.createElement('span', { className: 'product-sku' }, p.sku),
            React.createElement('span', { className: 'product-name' }, p.naziv),
            React.createElement('span', { className: 'product-price' }, `${p.cena?.toLocaleString('sr-RS')} RSD`)
          );
        })
      )
    ),

    results.length > 0 && React.createElement('div', { className: 'results-preview' },
      React.createElement('h4', null, `Generisano za ${results.length} proizvoda`),
      React.createElement('div', { className: 'results-table' },
        React.createElement('table', null,
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'SKU'),
              React.createElement('th', null, 'Naziv'),
              React.createElement('th', null, 'Meta Title'),
              React.createElement('th', null, 'Score')
            )
          ),
          React.createElement('tbody', null,
            results.map(r => React.createElement('tr', { key: r.sku },
              React.createElement('td', null, r.sku),
              React.createElement('td', null, r.naziv),
              React.createElement('td', null, React.createElement('small', null, r.meta_title?.substring(0, 50) + '...')),
              React.createElement('td', null, React.createElement('span', { className: 'score-badge' }, r.score))
            ))
          )
        )
      )
    ),

    React.createElement('style', null, `
      .bulk-seo-widget { font-family: system-ui, sans-serif; }
      .bulk-seo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--color-border, #eee); }
      .select-all { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; }
      .selected-count { color: var(--color-text-secondary, #666); font-size: 14px; }
      .bulk-seo-actions { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
      .selected-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--color-border, #eee); border-radius: 8px; padding: 12px; margin-bottom: 16px; background: var(--color-bg-secondary, #f8f9fa); }
      .selected-list h4 { margin: 0 0 12px; font-size: 14px; }
      .selected-list ul { list-style: none; padding: 0; margin: 0; }
      .selected-list li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--color-border, #eee); font-size: 13px; }
      .selected-list li:last-child { border-bottom: none; }
      .product-sku { font-family: monospace; font-size: 11px; color: #666; min-width: 80px; }
      .product-name { flex: 1; }
      .product-price { font-weight: 500; color: var(--color-primary, #0064FF); }
      .results-preview { margin-top: 16px; }
      .results-preview h4 { margin: 0 0 12px; font-size: 14px; }
      .results-table { overflow-x: auto; }
      .results-table table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .results-table th, .results-table td { padding: 8px; text-align: left; border-bottom: 1px solid var(--color-border, #eee); }
      .results-table th { font-weight: 600; color: var(--color-text-secondary, #666); }
      .score-badge { background: var(--color-primary, #0064FF); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    `)
  );
};

if (typeof window !== 'undefined' && window.CMS) {
  window.CMS.registerWidget('bulk-seo-actions', BulkSeoActionsWidget);
}

export default BulkSeoActionsWidget;
