(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  function slugify(text) {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'dj')
      .replace(/[čČ]/g, 'c')
      .replace(/[ćĆ]/g, 'c')
      .replace(/[šŠ]/g, 's')
      .replace(/[žŽ]/g, 'z')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function truncate(text, maxLen, suffix = '…') {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    const truncated = text.slice(0, maxLen - suffix.length).trim();
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated) + suffix;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightJSON(json) {
    if (!json) return '<span class="nc-token-comment">// Prazno</span>';
    return json
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'nc-token-value';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) cls = 'nc-token-attr';
          else cls = 'nc-token-value';
        } else if (/true|false/.test(match)) cls = 'nc-token-value';
        else if (/null/.test(match)) cls = 'nc-token-comment';
        return `<span class="${cls}">${escapeHtml(match)}</span>`;
      })
      .replace(/[{}[\],:]/g, '<span class="nc-token-tag">$&</span>');
  }

  function generateSEO(data) {
    const naziv = data.naziv || '';
    const kratakOpis = data.kratak_opis || '';
    const cena = data.cena ? parseInt(data.cena) : 0;
    const kategorija = data.kategorija_pol?.kategorija || '';
    const prvaBoja = data.boje?.[0]?.naziv || '';
    const focusKeyword = data.seo?.focus_keyword || '';
    const slug = slugify(naziv);

    const brand = 'DALLI';
    const baseUrl = 'https://dalli.rs';
    const productUrl = `${baseUrl}/proizvod-${slug}.html`;
    const mainImage = data.glavna_slika?.src || '';

    // Meta title: "Naziv - DALLI | Cena RSD" (max 60)
    let metaTitle = `${naziv} - ${brand}`;
    if (cena > 0) metaTitle += ` | ${cena.toLocaleString('sr-RS')} RSD`;
    metaTitle = truncate(metaTitle, 60);

    // Meta description: kratak_opis + CTA (max 160)
    let metaDescription = truncate(kratakOpis, 140);
    const cta = ' Kupovina na rate. Besplatna dostava >5000 RSD.';
    if (metaDescription.length + cta.length <= 160) {
      metaDescription += cta;
    }
    metaDescription = truncate(metaDescription, 160);

    // OG title: "Naziv - DALLI" (max 60)
    const ogTitle = truncate(`${naziv} - ${brand}`, 60);

    // OG description: kratak_opis (max 160)
    const ogDescription = truncate(kratakOpis, 160);

    // Schema.org Product
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: naziv,
      description: kratakOpis,
      brand: { '@type': 'Brand', name: brand },
      sku: data.sku || `ML-${Date.now().toString(36).toUpperCase()}`,
      image: mainImage ? [mainImage] : [],
      category: kategorija,
      offers: {
        '@type': 'Offer',
        url: productUrl,
        price: cena.toString(),
        priceCurrency: 'RSD',
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: brand },
      },
    };

    // Focus keyword check
    let keywordScore = 0;
    let keywordIssues = [];
    if (focusKeyword) {
      const kw = focusKeyword.toLowerCase();
      const checks = [
        { field: metaTitle.toLowerCase(), label: 'meta title' },
        { field: metaDescription.toLowerCase(), label: 'meta description' },
        { field: naziv.toLowerCase(), label: 'H1 (naziv)' },
        { field: (data.glavna_slika?.alt || '').toLowerCase(), label: 'alt tekst' },
        { field: slug.toLowerCase(), label: 'URL slug' },
        { field: (kratakOpis || '').toLowerCase().split(' ').slice(0, 50).join(' '), label: 'prvi pasus opisa' },
      ];
      let passed = 0;
      checks.forEach(c => {
        if (c.field.includes(kw)) passed++;
        else keywordIssues.push(`Nedostaje u ${c.label}`);
      });
      keywordScore = Math.round((passed / checks.length) * 100);
    }

    // Overall SEO score
    let score = 0;
    const factors = [
      { weight: 15, check: metaTitle.length >= 30 && metaTitle.length <= 60 },
      { weight: 15, check: metaDescription.length >= 120 && metaDescription.length <= 160 },
      { weight: 25, check: keywordScore >= 80 || !focusKeyword },
      { weight: 15, check: !!data.glavna_slika?.alt && data.glavna_slika.alt.length >= 10 },
      { weight: 15, check: true },
      { weight: 15, check: (data.glavna_slika?.width || 0) >= 1200 },
    ];
    score = factors.reduce((sum, f) => sum + (f.check ? f.weight : 0), 0);

    const scoreLabel = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';

    return {
      meta_title: metaTitle,
      meta_description: metaDescription,
      og_title: ogTitle,
      og_description: ogDescription,
      og_image: mainImage,
      og_url: productUrl,
      canonical: productUrl,
      schema: JSON.stringify(schema, null, 2),
      focus_keyword: focusKeyword,
      keyword_score: keywordScore,
      keyword_issues: keywordIssues,
      seo_score: score,
      seo_score_label: scoreLabel,
      slug: slug,
    };
  }

  function SEOGeneratorWidget(props) {
    const { value, onChange, field, config, forID } = props;
    const entry = props.entry;
    const allData = entry?.get('data');

    const [seoData, setSeoData] = React.useState({
      meta_title: value?.get('meta_title') || '',
      meta_description: value?.get('meta_description') || '',
      og_title: value?.get('og_title') || '',
      og_description: value?.get('og_description') || '',
      og_image: value?.get('og_image') || '',
      og_url: value?.get('og_url') || '',
      canonical: value?.get('canonical') || '',
      schema: value?.get('schema') || '',
      focus_keyword: value?.get('focus_keyword') || '',
      keyword_score: value?.get('keyword_score') || 0,
      keyword_issues: value?.get('keyword_issues') || [],
      seo_score: value?.get('seo_score') || 0,
      seo_score_label: value?.get('seo_score_label') || 'red',
      slug: value?.get('slug') || '',
    });

    const [showPreview, setShowPreview] = React.useState(false);
    const [activePreviewTab, setActivePreviewTab] = React.useState('meta');

    // Auto-generate when source fields change
    React.useEffect(() => {
      if (!allData) return;
      
      const generated = generateSEO(allData.toJS?.() || allData);
      
      const hasManualEdits = value?.get('manual_override') === true;
      
      if (!hasManualEdits) {
        setSeoData(generated);
        
        const newValue = Immutable.Map({
          ...generated,
          manual_override: false,
        });
        onChange(newValue);
      } else {
        const generated = generateSEO(allData.toJS?.() || allData);
        setSeoData(prev => ({
          ...prev,
          keyword_score: generated.keyword_score,
          keyword_issues: generated.keyword_issues,
          seo_score: generated.seo_score,
          seo_score_label: generated.seo_score_label,
        }));
      }
    }, [allData, onChange]);

    const handleGenerate = () => {
      if (!allData) return;
      const generated = generateSEO(allData.toJS?.() || allData);
      setSeoData(generated);
      
      const newValue = Immutable.Map({
        ...generated,
        manual_override: false,
      });
      onChange(newValue);
    };

    const handleFieldChange = (key, newVal) => {
      setSeoData(prev => {
        const updated = { ...prev, [key]: newVal, manual_override: true };
        const newValue = Immutable.Map({ ...updated, manual_override: true });
        onChange(newValue);
        return updated;
      });
    };

    const handleFocusKeywordChange = (e) => {
      const newVal = e.target.value;
      handleFieldChange('focus_keyword', newVal);
      
      if (allData) {
        const testData = { ...allData.toJS?.(), seo: { ...allData.get('seo')?.toJS?.(), focus_keyword: newVal } };
        const generated = generateSEO(testData);
        setSeoData(prev => ({
          ...prev,
          keyword_score: generated.keyword_score,
          keyword_issues: generated.keyword_issues,
          seo_score: generated.seo_score,
          seo_score_label: generated.seo_score_label,
        }));
      }
    };

    const getCharCountColor = (len, min, max) => {
      if (len === 0) return '';
      if (len < min) return 'warning';
      if (len > max) return 'error';
      return '';
    };

    const copyToClipboard = (text, label) => {
      navigator.clipboard.writeText(text).then(() => {
        const toast = document.createElement('div');
        toast.className = 'nc-toast';
        toast.textContent = `✅ ${label} kopiran!`;
        toast.style.cssText = `
          position: fixed; bottom: 2rem; right: 2rem; z-index: 10001;
          background: #28a745; color: white; padding: 0.75rem 1.25rem;
          border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.animation = 'slideOut 0.3s ease forwards';
          setTimeout(() => toast.remove(), 300);
        }, 2000);
      });
    };

    // Preview modal handlers
    const handleCopyMeta = () => {
      const meta = `<title>${escapeHtml(seoData.meta_title)}</title>\n<meta name="description" content="${escapeHtml(seoData.meta_description)}">\n<link rel="canonical" href="${escapeHtml(seoData.canonical)}">\n<meta name="robots" content="index, follow">`;
      copyToClipboard(meta, 'Meta tags');
    };

    const handleCopyOG = () => {
      const og = `<meta property="og:title" content="${escapeHtml(seoData.og_title)}">\n<meta property="og:description" content="${escapeHtml(seoData.og_description)}">\n<meta property="og:image" content="${escapeHtml(seoData.og_image)}">\n<meta property="og:url" content="${escapeHtml(seoData.og_url)}">\n<meta property="og:type" content="product">\n<meta property="og:site_name" content="DALLI">\n<meta property="og:locale" content="sr_RS">\n<meta property="product:price:amount" content="${allData?.cena || 0}">\n<meta property="product:price:currency" content="RSD">`;
      copyToClipboard(og, 'Open Graph');
    };

    const handleCopySchema = () => {
      copyToClipboard(seoData.schema, 'Schema.org');
    };

    // Render preview modal
    const renderPreviewModal = () => {
      if (!showPreview) return null;

      const data = allData?.toJS?.() || allData;
      const naziv = data?.naziv || '';
      const kratakOpis = data?.kratak_opis || '';
      const cena = data?.cena ? parseInt(data.cena) : 0;
      const slug = slugify(naziv);
      const brand = 'DALLI';
      const baseUrl = 'https://dalli.rs';
      const productUrl = `${baseUrl}/proizvod-${slug}.html`;
      const mainImage = data?.glavna_slika?.src || '';

      const metaTitle = seoData.meta_title || truncate(`${naziv} - ${brand} | ${cena.toLocaleString('sr-RS')} RSD`, 60);
      const metaDesc = seoData.meta_description || truncate(kratakOpis + ' Kupovina na rate. Besplatna dostava >5000 RSD.', 160);
      const ogTitle = seoData.og_title || truncate(`${naziv} - ${brand}`, 60);
      const ogDesc = seoData.og_description || truncate(kratakOpis, 160);

      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: naziv,
        description: kratakOpis,
        brand: { '@type': 'Brand', name: brand },
        sku: data?.sku || `ML-${Date.now().toString(36).toUpperCase()}`,
        image: mainImage ? [mainImage] : [],
        category: data?.kategorija_pol?.kategorija || '',
        offers: {
          '@type': 'Offer',
          url: productUrl,
          price: cena.toString(),
          priceCurrency: 'RSD',
          availability: 'https://schema.org/InStock',
        },
      };

      const score = (() => {
        let s = 0;
        if (metaTitle.length >= 30 && metaTitle.length <= 60) s += 20;
        if (metaDesc.length >= 120 && metaDesc.length <= 160) s += 20;
        if (ogTitle.length >= 30 && ogTitle.length <= 60) s += 15;
        if (ogDesc.length >= 120 && ogDesc.length <= 160) s += 15;
        if (mainImage) s += 15;
        if (productUrl) s += 15;
        return s;
      })();
      const scoreLabel = score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red';

      return React.createElement('div', { 
        className: 'nc-seo-preview-modal', 
        key: 'modal', 
        onClick: (e) => { if (e.target === e.currentTarget) setShowPreview(false); } 
      }, [
        React.createElement('div', { className: 'nc-seo-preview-overlay', key: 'overlay' }),
        React.createElement('div', { className: 'nc-seo-preview-container', key: 'container' }, [
          // Header
          React.createElement('div', { className: 'nc-seo-preview-header', key: 'header' }, [
            React.createElement('h3', { className: 'nc-seo-preview-title', key: 'title' }, '🔍 Live SEO Preview'),
            React.createElement('div', { className: 'nc-seo-preview-score', key: 'score' }, [
              React.createElement('span', { className: `nc-seo-badge ${scoreLabel}`, key: 'badge' }, [
                React.createElement('span', { className: 'nc-seo-badge-dot', key: 'dot' }),
                `Score: ${score}/100`,
              ]),
            ]),
            React.createElement('button', {
              className: 'nc-seo-preview-close',
              onClick: () => setShowPreview(false),
              'aria-label': 'Zatvori',
              key: 'close',
            }, '×'),
          ]),

          // Tabs
          React.createElement('div', { className: 'nc-seo-preview-tabs', key: 'tabs' }, [
            React.createElement('button', {
              className: `nc-seo-preview-tab ${activePreviewTab === 'meta' ? 'active' : ''}`,
              onClick: () => setActivePreviewTab('meta'),
              key: 'meta-tab',
            }, 'Meta Tags'),
            React.createElement('button', {
              className: `nc-seo-preview-tab ${activePreviewTab === 'og' ? 'active' : ''}`,
              onClick: () => setActivePreviewTab('og'),
              key: 'og-tab',
            }, 'Open Graph'),
            React.createElement('button', {
              className: `nc-seo-preview-tab ${activePreviewTab === 'schema' ? 'active' : ''}`,
              onClick: () => setActivePreviewTab('schema'),
              key: 'schema-tab',
            }, 'Schema.org'),
            React.createElement('button', {
              className: `nc-seo-preview-tab ${activePreviewTab === 'serp' ? 'active' : ''}`,
              onClick: () => setActivePreviewTab('serp'),
              key: 'serp-tab',
            }, 'SERP Preview'),
          ]),

          // Content
          React.createElement('div', { className: 'nc-seo-preview-content', key: 'content' }, [
            // Meta Tags Panel
            activePreviewTab === 'meta' && React.createElement('div', { className: 'nc-seo-preview-panel active', key: 'meta-panel' }, [
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'title' }, [
                React.createElement('h4', { key: 'label' }, '<title>'),
                React.createElement('div', { className: 'nc-seo-preview-code', key: 'code' }, [
                  React.createElement('button', { className: 'nc-seo-preview-copy', onClick: handleCopyMeta, key: 'copy' }, '📋 Kopiraj Meta'),
                  `<title>${escapeHtml(metaTitle)}</title>`,
                ]),
                React.createElement('div', { className: 'nc-seo-field-inline', key: 'len' }, [
                  React.createElement('span', { 
                    className: `nc-char-count ${metaTitle.length > 60 ? 'error' : metaTitle.length < 30 ? 'warning' : ''}`,
                    key: 'count',
                  }, `${metaTitle.length}/60 karaktera`),
                ]),
              ]),
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'desc' }, [
                React.createElement('h4', { key: 'label' }, '<meta name="description">'),
                React.createElement('div', { className: 'nc-seo-preview-code', key: 'code' }, [
                  React.createElement('button', { className: 'nc-seo-preview-copy', onClick: handleCopyMeta, key: 'copy' }, '📋 Kopiraj'),
                  `<meta name="description" content="${escapeHtml(metaDesc)}">`,
                ]),
                React.createElement('div', { className: 'nc-seo-field-inline', key: 'len' }, [
                  React.createElement('span', { 
                    className: `nc-char-count ${metaDesc.length > 160 ? 'error' : metaDesc.length < 120 ? 'warning' : ''}`,
                    key: 'count',
                  }, `${metaDesc.length}/160 karaktera`),
                ]),
              ]),
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'canonical' }, [
                React.createElement('h4', { key: 'label' }, '<link rel="canonical">'),
                React.createElement('div', { className: 'nc-seo-preview-code', key: 'code' }, [
                  React.createElement('button', { className: 'nc-seo-preview-copy', onClick: handleCopyMeta, key: 'copy' }, '📋 Kopiraj'),
                  `<link rel="canonical" href="${escapeHtml(productUrl)}">`,
                ]),
              ]),
            ]),

            // Open Graph Panel
            activePreviewTab === 'og' && React.createElement('div', { className: 'nc-seo-preview-panel active', key: 'og-panel' }, [
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'og-title' }, [
                React.createElement('h4', { key: 'label' }, 'og:title'),
                React.createElement('div', { className: 'nc-seo-preview-code', key: 'code' }, [
                  `<meta property="og:title" content="${escapeHtml(ogTitle)}">`,
                ]),
                React.createElement('div', { className: 'nc-seo-field-inline', key: 'len' }, [
                  React.createElement('span', { 
                    className: `nc-char-count ${ogTitle.length > 60 ? 'error' : ogTitle.length < 30 ? 'warning' : ''}`,
                    key: 'count',
                  }, `${ogTitle.length}/60`),
                ]),
              ]),
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'og-desc' }, [
                React.createElement('h4', { key: 'label' }, 'og:description'),
                React.createElement('div', { className: 'nc-seo-preview-code', key: 'code' }, [
                  `<meta property="og:description" content="${escapeHtml(ogDesc)}">`,
                ]),
                React.createElement('div', { className: 'nc-seo-field-inline', key: 'len' }, [
                  React.createElement('span', { 
                    className: `nc-char-count ${ogDesc.length > 160 ? 'error' : ogDesc.length < 120 ? 'warning' : ''}`,
                    key: 'count',
                  }, `${ogDesc.length}/160`),
                ]),
              ]),
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'og-image' }, [
                React.createElement('h4', { key: 'label' }, 'og:image'),
                mainImage && React.createElement('div', { key: 'img-preview' }, [
                  React.createElement('img', { src: mainImage, alt: '', style: { maxWidth: '300px', borderRadius: '8px', marginBottom: '0.5rem' } }),
                  React.createElement('div', { className: 'nc-seo-preview-code', key: 'code' }, [
                    `<meta property="og:image" content="${escapeHtml(mainImage)}">`,
                  ]),
                ]),
                !mainImage && React.createElement('div', { className: 'nc-seo-preview-code warning', key: 'missing' }, '⚠️ Nema glavne slike'),
              ]),
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'og-other' }, [
                React.createElement('h4', { key: 'label' }, 'Ostali OG tagovi'),
                React.createElement('div', { className: 'nc-seo-preview-code', key: 'code' }, [
                  React.createElement('button', { className: 'nc-seo-preview-copy', onClick: handleCopyOG, key: 'copy' }, '📋 Kopiraj sve OG'),
                  `<meta property="og:url" content="${escapeHtml(productUrl)}">\n<meta property="og:type" content="product">\n<meta property="og:site_name" content="DALLI">\n<meta property="og:locale" content="sr_RS">\n<meta property="product:price:amount" content="${cena}">\n<meta property="product:price:currency" content="RSD">`,
                ]),
              ]),
            ]),

            // Schema.org Panel
            activePreviewTab === 'schema' && React.createElement('div', { className: 'nc-seo-preview-panel active', key: 'schema-panel' }, [
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'schema' }, [
                React.createElement('h4', { key: 'label' }, 'Schema.org Product (JSON-LD)'),
                React.createElement('div', { className: 'nc-seo-preview-code', key: 'code' }, [
                  React.createElement('button', { className: 'nc-seo-preview-copy', onClick: handleCopySchema, key: 'copy' }, '📋 Kopiraj Schema'),
                  highlightJSON(JSON.stringify(schema, null, 2)),
                ]),
                React.createElement('a', {
                  href: 'https://search.google.com/test/rich-results',
                  target: '_blank',
                  rel: 'noopener',
                  className: 'nc-btn nc-btn-secondary',
                  style: { marginTop: '1rem', display: 'inline-flex' },
                  key: 'rich-results',
                }, '🧪 Testiraj na Google Rich Results'),
              ]),
            ]),

            // SERP Preview Panel
            activePreviewTab === 'serp' && React.createElement('div', { className: 'nc-seo-preview-panel active', key: 'serp-panel' }, [
              React.createElement('div', { className: 'nc-seo-preview-serp', key: 'serp-grid' }, [
                // Desktop
                React.createElement('div', { className: 'nc-serp-card desktop', key: 'desktop' }, [
                  React.createElement('div', { className: 'nc-serp-header', key: 'header' }, '🖥️ Desktop Google'),
                  React.createElement('div', { className: 'nc-serp-result', key: 'result' }, [
                    React.createElement('div', { className: 'nc-serp-title', key: 'title' }, metaTitle || '[meta title]'),
                    React.createElement('div', { className: 'nc-serp-url', key: 'url' }, productUrl || '[canonical]'),
                    React.createElement('div', { className: 'nc-serp-desc', key: 'desc' }, metaDesc || '[meta description]'),
                  ]),
                ]),
                // Mobile
                React.createElement('div', { className: 'nc-serp-card mobile', key: 'mobile' }, [
                  React.createElement('div', { className: 'nc-serp-header', key: 'header' }, '📱 Mobile Google'),
                  React.createElement('div', { className: 'nc-serp-result', key: 'result' }, [
                    React.createElement('div', { className: 'nc-serp-title', key: 'title' }, metaTitle || '[meta title]'),
                    React.createElement('div', { className: 'nc-serp-url', key: 'url' }, productUrl || '[canonical]'),
                    React.createElement('div', { className: 'nc-serp-desc mobile', key: 'desc' }, metaDesc || '[meta description]'),
                  ]),
                ]),
              ]),
              React.createElement('div', { className: 'nc-seo-preview-section', key: 'social' }, [
                React.createElement('h4', { key: 'label' }, 'Social Card Preview (Facebook/LinkedIn/Twitter)'),
                React.createElement('div', { className: 'nc-social-card', key: 'card' }, [
                  mainImage && React.createElement('img', { src: mainImage, alt: '', style: { width: '100%', maxHeight: '315px', objectFit: 'cover', borderRadius: '8px 8px 0 0' } }),
                  React.createElement('div', { className: 'nc-social-content', key: 'content' }, [
                    React.createElement('div', { className: 'nc-social-title', key: 'title' }, ogTitle || '[og:title]'),
                    React.createElement('div', { className: 'nc-social-desc', key: 'desc' }, ogDesc || '[og:description]'),
                    React.createElement('div', { className: 'nc-social-domain', key: 'domain' }, 'dalli.rs'),
                  ]),
                ]),
              ]),
            ]),
          ]),

          // Footer actions
          React.createElement('div', { className: 'nc-seo-preview-footer', key: 'footer' }, [
            React.createElement('button', {
              className: 'nc-btn nc-btn-secondary',
              onClick: () => setShowPreview(false),
              key: 'close',
            }, 'Zatvori'),
          ]),
        ]),
      ]);
    };

    return React.createElement('div', { className: 'nc-seo-widget' }, [
      // Focus Keyword Row
      React.createElement('div', { className: 'nc-focus-keyword', key: 'focus-kw' }, [
        React.createElement('label', { className: 'nc-field-label', key: 'label' }, 'Fokus ključna reč:'),
        React.createElement('input', {
          type: 'text',
          className: 'nc-field-input',
          placeholder: 'npr. "pamukna majica"',
          value: seoData.focus_keyword,
          onChange: handleFocusKeywordChange,
          key: 'input',
        }),
        seoData.focus_keyword && React.createElement('div', { className: `nc-seo-score ${seoData.seo_score_label}`, key: 'score' }, [
          React.createElement('span', { className: 'nc-seo-score-circle', key: 'circle' }, seoData.seo_score),
          React.createElement('span', { key: 'label' }, `SEO: ${seoData.seo_score}/100`),
          seoData.keyword_score > 0 && React.createElement('span', { key: 'kw-score' }, `KW: ${seoData.keyword_score}%`),
        ]),
      ]),

      // Tabs
      React.createElement('div', { className: 'nc-seo-tabs', key: 'tabs' }, [
        React.createElement('button', {
          className: 'nc-seo-tab',
          onClick: () => setShowPreview(false),
          key: 'meta-tab',
        }, 'Meta Tags'),
        React.createElement('button', {
          className: 'nc-seo-tab',
          onClick: () => setShowPreview(true),
          key: 'preview-tab',
        }, '🔍 Preview'),
      ]),

      // Meta Tags Panel
      !showPreview && React.createElement('div', { className: 'nc-seo-panel active', key: 'meta-panel' }, [
        React.createElement('div', { className: 'nc-seo-field', key: 'title' }, [
          React.createElement('label', { key: 'label' }, 'Meta Title'),
          React.createElement('input', {
            type: 'text',
            className: 'nc-field-input',
            maxLength: 60,
            value: seoData.meta_title,
            onChange: (e) => handleFieldChange('meta_title', e.target.value),
            key: 'input',
          }),
          React.createElement('span', {
            className: `nc-char-count ${getCharCountColor(seoData.meta_title.length, 30, 60)}`,
            key: 'count',
          }, `${seoData.meta_title.length}/60 karaktera`),
        ]),

        React.createElement('div', { className: 'nc-seo-field', key: 'desc' }, [
          React.createElement('label', { key: 'label' }, 'Meta Description'),
          React.createElement('textarea', {
            className: 'nc-field-input',
            maxLength: 160,
            rows: 3,
            value: seoData.meta_description,
            onChange: (e) => handleFieldChange('meta_description', e.target.value),
            key: 'input',
          }),
          React.createElement('span', {
            className: `nc-char-count ${getCharCountColor(seoData.meta_description.length, 120, 160)}`,
            key: 'count',
          }, `${seoData.meta_description.length}/160 karaktera`),
        ]),

        React.createElement('div', { className: 'nc-seo-field', key: 'og-title' }, [
          React.createElement('label', { key: 'label' }, 'OG Title'),
          React.createElement('input', {
            type: 'text',
            className: 'nc-field-input',
            maxLength: 60,
            value: seoData.og_title,
            onChange: (e) => handleFieldChange('og_title', e.target.value),
            key: 'input',
          }),
          React.createElement('span', {
            className: `nc-char-count ${getCharCountColor(seoData.og_title.length, 30, 60)}`,
            key: 'count',
          }, `${seoData.og_title.length}/60 karaktera`),
        ]),

        React.createElement('div', { className: 'nc-seo-field', key: 'og-desc' }, [
          React.createElement('label', { key: 'label' }, 'OG Description'),
          React.createElement('textarea', {
            className: 'nc-field-input',
            maxLength: 160,
            rows: 3,
            value: seoData.og_description,
            onChange: (e) => handleFieldChange('og_description', e.target.value),
            key: 'input',
          }),
          React.createElement('span', {
            className: `nc-char-count ${getCharCountColor(seoData.og_description.length, 120, 160)}`,
            key: 'count',
          }, `${seoData.og_description.length}/160 karaktera`),
        ]),

        React.createElement('div', { className: 'nc-seo-field', key: 'canonical' }, [
          React.createElement('label', { key: 'label' }, 'Canonical URL'),
          React.createElement('input', {
            type: 'url',
            className: 'nc-field-input',
            value: seoData.canonical,
            onChange: (e) => handleFieldChange('canonical', e.target.value),
            readOnly: true,
            key: 'input',
          }),
          React.createElement('span', { className: 'nc-field-hint', key: 'hint' }, 'Auto-generiše se iz naziva proizvoda'),
        ]),

        React.createElement('div', { className: 'nc-seo-field', key: 'schema' }, [
          React.createElement('label', { key: 'label' }, 'Schema.org Product (JSON-LD)'),
          React.createElement('textarea', {
            className: 'nc-field-input',
            rows: 12,
            value: seoData.schema,
            onChange: (e) => handleFieldChange('schema', e.target.value),
            readOnly: true,
            key: 'input',
          }),
          React.createElement('span', { className: 'nc-field-hint', key: 'hint' }, 'Auto-generiše se. Kopiraj za ručnu validaciju na Google Rich Results Test.'),
        ]),

        // Keyword Issues
        seoData.focus_keyword && seoData.keyword_issues.length > 0 && React.createElement('div', {
          className: 'nc-seo-field',
          key: 'kw-issues',
          style: { background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '1rem' },
        }, [
          React.createElement('strong', { key: 'title' }, '⚠️ Ključna reč nedostaje u:'),
          React.createElement('ul', { key: 'list', style: { margin: '0.5rem 0 0 1.5rem' } },
            seoData.keyword_issues.map((issue, i) =>
              React.createElement('li', { key: i, style: { color: '#856404' } }, issue)
            ),
          ),
        ]),
      ]),

      // Preview Modal (renders when showPreview is true)
      renderPreviewModal(),

      // Actions
      React.createElement('div', { className: 'nc-seo-actions', key: 'actions' }, [
        React.createElement('button', {
          className: 'nc-btn nc-btn-primary',
          onClick: handleGenerate,
          key: 'generate',
        }, '🔄 Generiši SEO'),
        React.createElement('button', {
          className: 'nc-btn nc-btn-outline',
          onClick: () => setShowPreview(true),
          key: 'preview',
        }, '🔍 Preview'),
        React.createElement('a', {
          href: 'https://search.google.com/test/rich-results',
          target: '_blank',
          rel: 'noopener',
          className: 'nc-btn nc-btn-secondary',
          key: 'rich-results',
        }, '🧪 Google Rich Results Test'),
      ]),

      // Publish Validation Warnings
      React.createElement('div', { className: 'nc-publish-warnings', key: 'publish-warnings' }, [
        React.createElement('h4', { key: 'title' }, '⚠️ Provera pre objavljivanja:'),
        React.createElement('ul', { key: 'list' }, [
          !allData?.glavna_slika?.src && React.createElement('li', { className: 'block', key: 'no-main' }, '🚫 Blokira: Nema glavne slike'),
          allData?.glavna_slika?.src && mainWidth > 0 && mainWidth > 25000 && React.createElement('li', { className: 'warning', key: 'large-img' }, `⚠️ Upozorenje: Glavna slika veća od 25MB (${Math.round(mainWidth / 1000)}KB)`),
          !allData?.glavna_slika?.alt && React.createElement('li', { className: 'warning', key: 'no-alt' }, '⚠️ Upozorenje: Nema alt teksta na glavnoj slici'),
          seoData.seo_score < 40 && React.createElement('li', { className: 'warning', key: 'low-seo' }, `⚠️ Upozorenje: SEO skorak je ${seoData.seo_score}/100 (preporučeno ≥80)`),
          !seoData.focus_keyword && React.createElement('li', { className: 'info', key: 'no-kw' }, 'ℹ️ Info: Nije postavljena fokus ključna reč'),
        ].filter(Boolean)),
      ]),
    ]);
  }

  CMS.registerWidget('seo-generator', SEOGeneratorWidget);
})();