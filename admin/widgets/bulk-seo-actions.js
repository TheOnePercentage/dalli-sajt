(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  function BulkSEOActionsWidget(props) {
    const { value, onChange, field, config, forID } = props;
    const collection = props.collection;

    const [selectedEntries, setSelectedEntries] = React.useState([]);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [progress, setProgress] = React.useState({ current: 0, total: 0, currentName: '' });
    const [results, setResults] = React.useState([]);

    const handleSelectionChange = (entries) => {
      setSelectedEntries(entries);
    };

    const handleBulkGenerate = async () => {
      if (selectedEntries.length === 0) return;

      setIsProcessing(true);
      setProgress({ current: 0, total: selectedEntries.length, currentName: '' });
      setResults([]);

      const newResults = [];

      for (let i = 0; i < selectedEntries.length; i++) {
        const entry = selectedEntries[i];
        const data = entry.get('data');
        
        if (!data) continue;

        const hasManualOverride = data.getIn(['seo', 'manual_override']) === true;
        
        if (hasManualOverride) {
          newResults.push({ name: data.get('naziv') || 'Unknown', status: 'skipped', reason: 'Ručno uređen SEO' });
          setProgress({ current: i + 1, total: selectedEntries.length, currentName: data.get('naziv') || '' });
          continue;
        }

        try {
          const seoData = generateSEO(data.toJS?.() || data);
          
          const updatedEntry = entry.set('data', data.mergeDeep(Immutable.Map({
            seo: Immutable.Map({
              ...seoData,
              manual_override: false,
            }),
          })));

          await CMS.entries.persistEntry(updatedEntry);
          
          newResults.push({ name: data.get('naziv') || 'Unknown', status: 'success' });
        } catch (err) {
          newResults.push({ name: data.get('naziv') || 'Unknown', status: 'error', reason: err.message });
        }

        setProgress({ current: i + 1, total: selectedEntries.length, currentName: data.get('naziv') || '' });
      }

      setResults(newResults);
      setIsProcessing(false);
      showToast(`✅ Završeno: ${newResults.filter(r => r.status === 'success').length} uspešno, ${newResults.filter(r => r.status === 'skipped').length} preskočeno, ${newResults.filter(r => r.status === 'error').length} grešaka`);
    };

    const showToast = (message) => {
      const toast = document.createElement('div');
      toast.className = 'nc-toast nc-bulk-toast';
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 10001;
        background: #28a745; color: white; padding: 1rem 1.5rem;
        border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease; max-width: 400px;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    };

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

      let metaTitle = `${naziv} - ${brand}`;
      if (cena > 0) metaTitle += ` | ${cena.toLocaleString('sr-RS')} RSD`;
      metaTitle = truncate(metaTitle, 60);

      let metaDescription = truncate(kratakOpis, 140);
      const cta = ' Kupovina na rate. Besplatna dostava >5000 RSD.';
      if (metaDescription.length + cta.length <= 160) {
        metaDescription += cta;
      }
      metaDescription = truncate(metaDescription, 160);

      const ogTitle = truncate(`${naziv} - ${brand}`, 60);
      const ogDescription = truncate(kratakOpis, 160);

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
        seo_score_label: score >= 80 ? 'green' : score >= 50 ? 'yellow' : 'red',
        slug: slug,
        manual_override: false,
      };
    }

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

    return React.createElement('div', { className: 'nc-bulk-seo-widget' }, [
      React.createElement('div', { className: 'nc-bulk-seo-actions', key: 'actions' }, [
        React.createElement('div', { className: 'nc-bulk-seo-info', key: 'info' }, [
          React.createElement('strong', { key: 'label' }, 'Masovna SEO generacija:'),
          React.createElement('span', { key: 'desc' }, ' Označite proizvode u listi, zatim kliknite dugme ispod. Preskače ručno uređene SEO.'),
        ]),
        React.createElement('button', {
          className: 'nc-btn nc-btn-primary',
          onClick: handleBulkGenerate,
          disabled: isProcessing || selectedEntries.length === 0,
          key: 'generate',
        }, isProcessing ? `⏳ Generiše se... (${progress.current}/${progress.total})` : `🔄 Generiši SEO za ${selectedEntries.length} proizvoda`),
        isProcessing && React.createElement('div', { className: 'nc-bulk-progress', key: 'progress' }, [
          React.createElement('div', { className: 'nc-progress-bar', key: 'bar' }, [
            React.createElement('div', { 
              className: 'nc-progress-fill', 
              key: 'fill',
              style: { width: `${(progress.current / progress.total) * 100}%` }
            }),
          ]),
          React.createElement('span', { className: 'nc-progress-text', key: 'text' }, `${progress.current}/${progress.total} - ${progress.currentName}`),
        ]),
      ]),

      results.length > 0 && React.createElement('div', { className: 'nc-bulk-results', key: 'results' }, [
        React.createElement('h4', { key: 'title' }, 'Rezultati:'),
        React.createElement('ul', { key: 'list' }, results.map((r, i) => React.createElement('li', {
          className: `nc-bulk-result ${r.status}`,
          key: i,
        }, [
          r.status === 'success' && React.createElement('span', { key: 'icon' }, '✅ '),
          r.status === 'skipped' && React.createElement('span', { key: 'icon' }, '⏭️ '),
          r.status === 'error' && React.createElement('span', { key: 'icon' }, '❌ '),
          React.createElement('strong', { key: 'name' }, r.name),
          r.reason && React.createElement('span', { key: 'reason', style: { color: '#666', marginLeft: '0.5rem' } }, `(${r.reason})`),
        ]))),
      ]),
    ]);
  }

  CMS.registerWidget('bulk-seo-actions', BulkSEOActionsWidget);
})();