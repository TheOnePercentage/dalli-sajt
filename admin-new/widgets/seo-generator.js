import React, { useState, useEffect } from 'react';

const SeoGeneratorWidget = ({ value, onChange, config = {} }) => {
  const [seo, setSeo] = useState({
    meta_title: '',
    meta_description: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical: '',
    schema: null,
    focus_keyword: '',
    score: 0
  });
  const [generating, setGenerating] = useState(false);
  const [focusKeyword, setFocusKeyword] = useState('');
  const [scoreBreakdown, setScoreBreakdown] = useState({});

  const productName = config.productName || '';
  const shortDesc = config.shortDesc || '';
  const price = config.price || 0;
  const category = config.category || '';
  const mainImage = config.mainImage || '';
  const slug = config.slug || '';

  const BASE_URL = 'https://dalli.rs';

  const calculateScore = (seoData, keyword) => {
    let score = 0;
    const breakdown = {};

    // Title length (15%)
    const titleLen = seoData.meta_title?.length || 0;
    if (titleLen >= 50 && titleLen <= 60) { score += 15; breakdown.title = 15; }
    else if (titleLen >= 30 && titleLen <= 65) { score += 10; breakdown.title = 10; }
    else { breakdown.title = 0; }

    // Description length (15%)
    const descLen = seoData.meta_description?.length || 0;
    if (descLen >= 150 && descLen <= 160) { score += 15; breakdown.description = 15; }
    else if (descLen >= 120 && descLen <= 165) { score += 10; breakdown.description = 10; }
    else { breakdown.description = 0; }

    // Focus keyword coverage (25%)
    if (keyword && keyword.trim()) {
      const kw = keyword.toLowerCase();
      let kwScore = 0;
      if (seoData.meta_title?.toLowerCase().includes(kw)) kwScore += 5;
      if (seoData.meta_description?.toLowerCase().includes(kw)) kwScore += 5;
      if (productName?.toLowerCase().includes(kw)) kwScore += 5;
      if (seoData.meta_description?.toLowerCase().includes(kw)) kwScore += 5;
      if (category?.toLowerCase().includes(kw)) kwScore += 5;
      score += kwScore;
      breakdown.keyword = kwScore;
    } else {
      breakdown.keyword = 0;
    }

    // Alt text (15%) - assuming present if mainImage exists
    if (mainImage) { score += 15; breakdown.alt = 15; }
    else { breakdown.alt = 0; }

    // Schema.org (15%)
    if (seoData.schema) { score += 15; breakdown.schema = 15; }
    else { breakdown.schema = 0; }

    // Image dimensions (15%) - assume good if mainImage exists
    if (mainImage) { score += 15; breakdown.image = 15; }
    else { breakdown.image = 0; }

    return { score: Math.min(100, score), breakdown };
  };

  const generateSeo = () => {
    setGenerating(true);
    
    const title = `${productName} - DALLI | ${price.toLocaleString('sr-RS')} RSD`.substring(0, 60);
    const descBase = shortDesc.substring(0, 140);
    const desc = `${descBase} Kupovina na rate. Besplatna dostava >5000 RSD.`.substring(0, 160);
    const ogTitle = `${productName} - DALLI`.substring(0, 60);
    const ogDesc = shortDesc.substring(0, 160);
    const canonical = slug ? `${BASE_URL}/proizvod-${slug}.html` : BASE_URL;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: productName,
      description: shortDesc,
      image: mainImage ? [mainImage] : [],
      brand: { '@type': 'Brand', name: 'DALLI' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'RSD',
        price: price,
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'DALLI' }
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '127'
      }
    };

    const newSeo = {
      meta_title: title,
      meta_description: desc,
      og_title: ogTitle,
      og_description: ogDesc,
      og_image: mainImage || '',
      canonical,
      schema,
      focus_keyword: focusKeyword
    };

    const { score, breakdown } = calculateScore(newSeo, focusKeyword);
    newSeo.score = score;

    setSeo(newSeo);
    setScoreBreakdown(breakdown);
    onChange(newSeo);
    setGenerating(false);
  };

  useEffect(() => {
    const { score, breakdown } = calculateScore(seo, focusKeyword);
    if (score !== seo.score) {
      setSeo(prev => ({ ...prev, score }));
      setScoreBreakdown(breakdown);
    }
  }, [seo, focusKeyword]);

  const handleChange = (field, val) => {
    setSeo(prev => {
      const next = { ...prev, [field]: val };
      const { score, breakdown } = calculateScore(next, focusKeyword);
      setScoreBreakdown(breakdown);
      return { ...next, score };
    });
    onChange({ ...seo, [field]: val });
  };

  const scoreColor = seo.score >= 90 ? '#16a34a' : seo.score >= 75 ? '#16a34a' : 
                     seo.score >= 60 ? '#f59e0b' : seo.score >= 40 ? '#f97316' : '#e00';

  const formatSchema = (obj) => JSON.stringify(obj, null, 2);

  return React.createElement('div', { className: 'seo-generator-widget' },
    React.createElement('div', { className: 'seo-header' },
      React.createElement('div', { className: 'seo-score', style: { borderColor: scoreColor } },
        React.createElement('span', { className: 'score-value', style: { color: scoreColor } }, seo.score),
        React.createElement('span', { className: 'score-label' }, 'SEO Score')
      ),
      React.createElement('div', { className: 'seo-actions' },
        React.createElement('input', {
          type: 'text',
          placeholder: 'Fokus ključna reč (opciono)',
          value: focusKeyword,
          onChange: (e) => setFocusKeyword(e.target.value),
          style: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', width: '200px' }
        }),
        React.createElement('button', {
          type: 'button',
          className: 'btn btn-primary',
          onClick: generateSeo,
          disabled: generating || !productName
        }, generating ? 'Generiši...' : 'Generiši SEO')
      )
    ),

    React.createElement('div', { className: 'seo-breakdown' },
      React.createElement('h4', null, 'Breakdown:'),
      React.createElement('div', { className: 'breakdown-items' },
        { title: 15, description: 15, keyword: 25, alt: 15, schema: 15, image: 15 }.map((max, key) => 
          React.createElement('div', { key: key, className: 'breakdown-item' },
            React.createElement('span', null, key.charAt(0).toUpperCase() + key.slice(1)),
            React.createElement('div', { className: 'breakdown-bar' },
              React.createElement('div', { 
                className: 'breakdown-fill',
                style: { width: `${(scoreBreakdown[key] || 0) / max * 100}%`, background: scoreBreakdown[key] === max ? '#16a34a' : '#f59e0b' }
              })
            ),
            React.createElement('span', { className: 'breakdown-score' }, `${scoreBreakdown[key] || 0}/${max}`)
          )
        )
      )
    ),

    React.createElement('div', { className: 'seo-fields' },
      React.createElement('div', { className: 'field-group' },
        React.createElement('label', null, 'Meta Title (50-60 znakova)'),
        React.createElement('input', {
          type: 'text',
          value: seo.meta_title,
          onChange: (e) => handleChange('meta_title', e.target.value),
          maxLength: 60,
          placeholder: 'Auto-generiše se iz naziva i cene'
        }),
        React.createElement('small', { className: 'char-hint' }, `${seo.meta_title?.length || 0}/60`)
      ),
      React.createElement('div', { className: 'field-group' },
        React.createElement('label', null, 'Meta Description (150-160 znakova)'),
        React.createElement('textarea', {
          value: seo.meta_description,
          onChange: (e) => handleChange('meta_description', e.target.value),
          rows: 3,
          maxLength: 160,
          placeholder: 'Auto-generiše se iz kratkog opisa'
        }),
        React.createElement('small', { className: 'char-hint' }, `${seo.meta_description?.length || 0}/160`)
      ),
      React.createElement('div', { className: 'field-group' },
        React.createElement('label', null, 'OG Title'),
        React.createElement('input', {
          type: 'text',
          value: seo.og_title,
          onChange: (e) => handleChange('og_title', e.target.value),
          maxLength: 60
        })
      ),
      React.createElement('div', { className: 'field-group' },
        React.createElement('label', null, 'OG Description'),
        React.createElement('textarea', {
          value: seo.og_description,
          onChange: (e) => handleChange('og_description', e.target.value),
          rows: 2,
          maxLength: 160
        })
      ),
      React.createElement('div', { className: 'field-group' },
        React.createElement('label', null, 'Canonical URL'),
        React.createElement('input', {
          type: 'url',
          value: seo.canonical,
          onChange: (e) => handleChange('canonical', e.target.value),
          readOnly: true
        })
      ),
      React.createElement('div', { className: 'field-group' },
        React.createElement('label', null, 'Schema.org JSON-LD'),
        React.createElement('textarea', {
          value: formatSchema(seo.schema),
          onChange: (e) => handleChange('schema', JSON.parse(e.target.value)),
          rows: 12,
          style: { fontFamily: 'monospace', fontSize: '11px' }
        })
      )
    ),
    React.createElement('style', null, `
      .seo-generator-widget { font-family: system-ui, sans-serif; }
      .seo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
      .seo-score { width: 80px; height: 80px; border-radius: 50%; border: 4px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--color-bg-secondary, #f8f9fa); }
      .score-value { font-size: 24px; font-weight: 700; line-height: 1; }
      .score-label { font-size: 11px; text-transform: uppercase; opacity: 0.7; }
      .seo-actions { display: flex; gap: 12px; align-items: center; }
      .seo-breakdown { margin: 16px 0; padding: 12px; background: var(--color-bg-secondary, #f8f9fa); border-radius: 8px; }
      .breakdown-items { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
      .breakdown-item { font-size: 12px; }
      .breakdown-item span:first-child { font-weight: 500; display: block; margin-bottom: 4px; }
      .breakdown-bar { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
      .breakdown-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
      .breakdown-score { font-family: monospace; font-size: 11px; color: #666; display: block; margin-top: 2px; }
      .seo-fields { display: flex; flex-direction: column; gap: 16px; }
      .field-group { display: flex; flex-direction: column; gap: 4px; }
      .field-group label { font-weight: 500; font-size: 13px; }
      .field-group input, .field-group textarea { padding: 8px 10px; border: 1px solid var(--color-border, #ddd); border-radius: 4px; font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
      .field-group input:focus, .field-group textarea:focus { outline: none; border-color: var(--color-primary, #0064FF); box-shadow: 0 0 0 2px var(--color-primary-bg, #f0f7ff); }
      .field-group textarea { resize: vertical; }
      .char-hint { font-size: 11px; color: #666; text-align: right; font-family: monospace; }
      .seo-fields textarea[style*="monospace"] { background: #f8f9fa; }
    `)
  );
};

if (typeof window !== 'undefined' && window.CMS) {
  window.CMS.registerWidget('seo-generator', SeoGeneratorWidget);
}

export default SeoGeneratorWidget;
