const { useState, useEffect } = React;

const AltGeneratorWidget = ({ value, onChange, config = {} }) => {
  const [altTexts, setAltTexts] = useState({});
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState('');

  const productName = config.productName || '';
  const productDesc = config.productDesc || '';
  const color = config.color || '';
  const category = config.category || '';

  useEffect(() => {
    if (!altTexts.main && productName) {
      generateAltTexts();
    }
  }, [productName, productDesc, color, category]);

  const generateAltTexts = () => {
    setGenerating(true);
    const base = `${productName}`.trim();
    const desc = productDesc ? ` - ${productDesc.substring(0, 80)}` : '';
    const colorStr = color ? ` u ${color.toLowerCase()} boji` : '';
    const catStr = category ? `, ${category}` : '';
    
    const main = `${base}${desc}${colorStr}${catStr}`.substring(0, 125);
    const variants = {
      short: `${productName}${colorStr}`.substring(0, 80),
      seo: `${productName} - kupovina online${colorStr}${catStr}`.substring(0, 125),
      social: `Novi ${productName.toLowerCase()}${colorStr} na DALLI.rs`
    };

    const newAlts = { main, ...variants };
    setAltTexts(newAlts);
    setPreview(main);
    onChange(newAlts);
    setGenerating(false);
  };

  const handleEdit = (field, text) => {
    const newAlts = { ...altTexts, [field]: text };
    setAltTexts(newAlts);
    if (field === 'main') setPreview(text);
    onChange(newAlts);
  };

  const charCount = (text) => text?.length || 0;

  return React.createElement('div', { className: 'alt-generator-widget' },
    React.createElement('div', { className: 'alt-generator-header' },
      React.createElement('button', {
        type: 'button',
        className: 'btn btn-primary',
        onClick: generateAltTexts,
        disabled: generating || !productName
      }, generating ? 'Generiši...' : 'Generiši alt tekstove')
    ),
    React.createElement('div', { className: 'alt-fields' },
      ['main', 'short', 'seo', 'social'].map(field => {
        const label = field === 'main' ? 'Glavni (do 125 znakova)' : 
                     field === 'short' ? 'Kratki (do 80 znakova)' :
                     field === 'seo' ? 'SEO optimizovan' : 'Social media';
        const count = charCount(altTexts[field]);
        return React.createElement('div', { key: field, className: 'alt-field' },
          React.createElement('label', null, 
            React.createElement('span', { className: 'field-label' }, label),
            React.createElement('span', { className: 'char-count', style: { color: charCount(altTexts[field]) > 125 ? '#e00' : '#666' } }, `${count}/125`)
          ),
          React.createElement('textarea', {
            value: altTexts[field] || '',
            onChange: (e) => handleEdit(field, e.target.value),
            rows: field === 'main' ? 3 : 2,
            maxLength: 125,
            placeholder: field === 'main' ? 'Glavni alt tekst...' : `Auto-generiše se iz glavnog`
          })
        );
      })
    ),
    React.createElement('div', { className: 'alt-preview' },
      React.createElement('strong', null, 'Preview: '),
      React.createElement('code', null, preview || '—')
    ),
    React.createElement('style', null, `
      .alt-generator-widget { font-family: system-ui, sans-serif; padding: 8px 0; }
      .alt-generator-header { margin-bottom: 16px; }
      .alt-fields { display: flex; flex-direction: column; gap: 12px; }
      .alt-field label { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; font-weight: 500; color: var(--color-text, #333); }
      .alt-field .char-count { font-family: monospace; font-size: 11px; }
      .alt-field textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--color-border, #ddd); border-radius: 4px; font-family: inherit; font-size: 13px; resize: vertical; box-sizing: border-box; }
      .alt-field textarea:focus { outline: none; border-color: var(--color-primary, #0064FF); box-shadow: 0 0 0 2px var(--color-primary-bg, #f0f7ff); }
      .alt-preview { margin-top: 16px; padding: 12px; background: var(--color-bg-secondary, #f8f9fa); border-radius: 4px; font-size: 13px; color: var(--color-text-secondary, #666); }
      .alt-preview code { white-space: pre-wrap; word-break: break-word; }
    `)
  );
};

if (typeof window !== 'undefined' && window.CMS) {
  window.CMS.registerWidget('alt-generator', AltGeneratorWidget);
}

export default AltGeneratorWidget;
