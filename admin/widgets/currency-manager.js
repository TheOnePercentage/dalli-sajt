(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // CURRENCY MANAGER WIDGET
  // ============================================

  const CURRENCY_NAMES = {
    EUR: 'Euro', USD: 'US Dollar', RSD: 'Serbian Dinar', GBP: 'British Pound',
    CHF: 'Swiss Franc', BAM: 'Convertible Mark', RON: 'Romanian Leu',
    BGN: 'Bulgarian Lev', CZK: 'Czech Koruna', PLN: 'Polish Zloty',
    HUF: 'Hungarian Forint', HRK: 'Croatian Kuna'
  };

  const CURRENCY_SYMBOLS = {
    EUR: '€', USD: '$', RSD: 'дин.', GBP: '£',
    CHF: 'CHF', BAM: 'KM', RON: 'lei',
    BGN: 'лв', CZK: 'Kč', PLN: 'zł',
    HUF: 'Ft', HRK: 'kn'
  };

  const CURRENCY_DECIMALS = {
    EUR: 2, USD: 2, RSD: 0, GBP: 2,
    CHF: 2, BAM: 2, RON: 2,
    BGN: 2, CZK: 0, PLN: 2,
    HUF: 0, HRK: 2
  };

  const CURRENCY_FORMATS = {
    EUR: '{symbol}{amount}', USD: '{symbol}{amount}', RSD: '{amount} {symbol}',
    GBP: '{symbol}{amount}', CHF: 'CHF {amount}', BAM: '{amount} {symbol}',
    RON: '{amount} {symbol}', BGN: '{amount} {symbol}',
    CZK: '{amount} {symbol}', PLN: '{amount} {symbol}',
    HUF: '{amount} {symbol}', HRK: '{amount} {symbol}'
  };

  function CurrencyManagerWidget(props) {
    const { value, onChange, field, config, forID } = props;
    const entry = props.entry;

    const [rates, setRates] = React.useState({});
    const [baseCurrency, setBaseCurrency] = React.useState('EUR');
    const [lastUpdated, setLastUpdated] = React.useState(null);
    const [source, setSource] = React.useState('localStorage');
    const [isLoading, setIsLoading] = React.useState(false);
    const [showForm, setShowForm] = React.useState(false);
    const [editingCode, setEditingCode] = React.useState(null);
    const [formData, setFormData] = React.useState({});
    const [errors, setErrors] = React.useState({});

    // Load rates on mount
    React.useEffect(() => {
      loadRates();
    }, []);

    async function loadRates() {
      setIsLoading(true);
      try {
        // Try to load from Netlify Blobs / Netlify Functions first
        const response = await fetch('/.netlify/functions/get-exchange-rates');
        if (response.ok) {
          const data = await response.json();
          if (data.rates) {
            setRates(data.rates);
            setBaseCurrency(data.baseCurrency || 'EUR');
            setLastUpdated(data.lastUpdated);
            setSource(data.source || 'api');
            return;
          }
        }
      } catch (e) {
        console.warn('[CurrencyManager] Could not load from function:', e.message);
      }

      // Fallback to localStorage
      try {
        const saved = localStorage.getItem('dalli_exchange_rates');
        if (saved) {
          const data = JSON.parse(saved);
          if (data) {
            setRates(data.rates);
            setBaseCurrency(data.baseCurrency || 'EUR');
            setLastUpdated(data.lastUpdated);
            setSource('localStorage');
          }
        }
      } catch (e) {
        console.warn('[CurrencyManager] Could not load from localStorage:', e.message);
      } finally {
        setIsLoading(false);
      }
    }

    async function saveRates(newRates) {
      setIsLoading(true);
      try {
        // Save to Netlify Blobs via function
        const response = await fetch('/.netlify/functions/save-exchange-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            rates: newRates, 
            baseCurrency: baseCurrency,
            source: source,
            lastUpdated: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          showToast('✅ Tečajevi sačuvani na serveru', 'success');
        }
      } catch (e) {
        console.warn('[CurrencyManager] Could not save to server:', e.message);
      }

      // Always save to localStorage as fallback
      const dataToSave = { rates: newRates, baseCurrency, source, lastUpdated: new Date().toISOString() };
      localStorage.setItem('dalli_exchange_rates', JSON.stringify(dataToSave));
      setRates(newRates);
      setLastUpdated(new Date().toISOString());
      setIsLoading(false);
    }

    async function refreshFromAPI() {
      setIsLoading(true);
      try {
        const response = await fetch('https://api.exchangerate.host/latest?base=EUR');
        if (response.ok) {
          const data = await response.json();
          if (data.rates) {
            const newRates = { ...data.rates, EUR: 1.0 };
            await saveRates({ rates: newRates, baseCurrency: 'EUR', source: 'api' });
            showToast('✅ Tečajevi osveženi sa ECB API', 'success');
          } else {
            throw new Error('Invalid API response');
          }
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (err) {
        showToast(`❌ Greška prilikom preuzimanja: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    }

    function handleEdit(code) {
      setEditingCode(code);
      setFormData({
        code: code,
        name: CURRENCY_NAMES[code] || '',
        symbol: CURRENCY_SYMBOLS[code] || '',
        rate: String(rates[code]),
        decimals: CURRENCY_DECIMALS[code] || 2,
        format: CURRENCY_FORMATS[code] || '{symbol}{amount}',
        base: code === baseCurrency,
      });
      setShowForm(true);
    }

    function handleDelete(code) {
      if (!window.confirm(`Obrišati valutu ${code}?`)) return;
      const newRates = { ...rates };
      delete newRates[code];
      saveRates(newRates);
      showToast('🗑️ Valuta obrisana', 'success');
    }

    function handleResetToDefaults() {
      if (!window.confirm('Vratiti sve tečajeve na podrazumevane vrednosti?')) return;
      const defaultRates = {
        EUR: 1.0, USD: 1.08, RSD: 117.5, GBP: 0.86,
        CHF: 0.97, BAM: 1.95583, RON: 4.97,
        BGN: 1.95583, CZK: 24.5, PLN: 4.3,
        HUF: 395, HRK: 7.53
      };
      saveRates({ rates: defaultRates, baseCurrency: 'EUR', source: 'default' });
      showToast('🔄 Vraćeno na podrazumevane vrednosti', 'success');
    }

    function handleExportCSV() {
      const headers = ['code', 'name', 'symbol', 'rate', 'decimals', 'format', 'base', 'lastUpdated'];
      const rows = [
        headers.join(','),
        ...Object.entries(rates).map(([code, rate]) => [
          code,
          CURRENCY_NAMES[code] || '',
          CURRENCY_SYMBOLS[code] || '',
          rate,
          CURRENCY_DECIMALS[code] || 2,
          CURRENCY_FORMATS[code] || '{symbol}{amount}',
          code === baseCurrency ? 'true' : 'false',
          lastUpdated || ''
        ].map(v => `"${v}"`).join(','))
      ].join('\n');

      const blob = new Blob([headers.join(',') + '\n' + rows.slice(1).join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exchange-rates-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📥 CSV preuzet', 'success');
    }

    async function handleImportCSV(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          const newRates = {};
          let hasErrors = false;
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
            if (values.length < headers.length) continue;
            const code = values[0]?.replace(/"/g, '').trim().toUpperCase();
            const rate = parseFloat(values[3]?.replace(/"/g, '').trim());
            if (!code || isNaN(rate)) continue;
            const decimals = parseInt(values[4]?.replace(/"/g, '').trim()) || 2;
            const format = values[5]?.replace(/"/g, '').trim() || '{symbol}{amount}';
            newRates[code] = rate;
            if (CURRENCY_NAMES[code] === undefined) {
              CURRENCY_NAMES[code] = values[1]?.replace(/"/g, '').trim() || code;
              CURRENCY_SYMBOLS[code] = values[2]?.replace(/"/g, '').trim() || '$';
              CURRENCY_DECIMALS[code] = decimals;
              CURRENCY_FORMATS[code] = format;
            }
          }
          if (Object.keys(newRates).length > 0) {
            saveRates({ rates: newRates, baseCurrency: baseCurrency, source: 'csv' });
            showToast('📥 CSV uvezen', 'success');
          }
        } catch (err) {
          showToast(`❌ Greška prilikom uvoza: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    function showToast(message, type = 'info') {
      if (window.showToast) {
        window.showToast(message, type);
      } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    }

    const handleCSVImport = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target.result;
            const lines = text.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            const newRates = {};
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
              if (values.length < 4) continue;
              const code = values[0]?.toUpperCase();
              const rate = parseFloat(values[3]);
              if (!code || isNaN(rate)) continue;
              const newRates = { ...rates };
              newRates[code] = rate;
              saveRates({ rates: newRates, baseCurrency, source: 'csv' });
              showToast('📥 CSV uvezen', 'success');
            }
          } catch (err) {
            showToast(`❌ Greška: ${err.message}`, 'error');
          }
        };
        reader.readAsText(file);
      }
    };

    const renderContent = () => {
      if (isLoading) {
        return React.createElement('div', { className: 'nc-currency-loading', key: 'loading' }, [
          React.createElement('div', { className: 'nc-spinner', key: 'spinner' }),
          React.createElement('p', { key: 'text' }, 'Učitavanje tečajeva...'),
        ]);
      }

      return React.createElement('div', { className: 'nc-currency-manager', key: 'content' }, [
        // Header
        React.createElement('div', { className: 'nc-currency-header', key: 'header' }, [
          React.createElement('div', { className: 'nc-currency-title', key: 'title' }, [
            React.createElement('span', { key: 'icon' }, '💱'),
            React.createElement('h3', { key: 'text' }, 'Currency Manager'),
          ]),
          React.createElement('div', { className: 'nc-currency-actions', key: 'actions' }, [
            React.createElement('button', {
              className: 'nc-btn nc-btn-primary',
              onClick: refreshFromAPI,
              disabled: isLoading,
              key: 'refresh',
            }, isLoading ? '⏳' : '🔄 Osveži sa ECB'),
            React.createElement('button', {
              className: 'nc-btn nc-btn-secondary',
              onClick: handleExportCSV,
              key: 'export',
            }, '📥 Export CSV'),
            React.createElement('input', {
              type: 'file',
              accept: '.csv',
              onChange: handleImportCSV,
              style: { display: 'none' },
              id: 'currency-import',
              ref: el => { window.currencyImportRef = el; },
              key: 'import-file',
            }),
            React.createElement('button', {
              className: 'nc-btn nc-btn-secondary',
              onClick: () => window.currencyImportRef?.click(),
              key: 'import',
            }, '📤 Import CSV'),
            React.createElement('button', {
              className: 'nc-btn nc-btn-outline',
              onClick: handleResetToDefaults,
              key: 'reset',
            }, '🔄 Reset na default'),
            React.createElement('button', {
              className: 'nc-btn nc-btn-primary',
              onClick: () => { setShowForm(true); setEditingCode(null); },
              key: 'add',
            }, '➕ Dodaj valutu'),
          ]),
        ]),

        // Status
        React.createElement('div', { className: 'nc-currency-status', key: 'status' }, [
          React.createElement('label', { key: 'label' }, 'Osnovna valuta (base):'),
          React.createElement('select', {
            className: 'nc-field-input',
            value: baseCurrency,
            onChange: e => setBaseCurrency(e.target.value),
            key: 'base-select',
          }, Object.keys(rates).map(code => 
            React.createElement('option', { value: code, key: code }, `${code} (${CURRENCY_NAMES[code] || code})`)
          )),
          React.createElement('span', { className: 'nc-status-source', key: 'source' }, `Izvor: ${source === 'api' ? '🌐 API (ECB)' : source === 'localStorage' ? '💾 localStorage' : '📦 Default'}`),
          lastUpdated && React.createElement('span', { className: 'nc-last-updated', key: 'updated' }, `Poslednje ažuriranje: ${new Date(lastUpdated).toLocaleString('sr-RS')}`),
        ]),

        // Currencies Table
        React.createElement('div', { className: 'nc-currency-table-container', key: 'table' }, [
          React.createElement('table', { className: 'nc-currency-table', key: 'table' }, [
            React.createElement('thead', { key: 'head' }, [
              React.createElement('tr', { key: 'row' }, [
                React.createElement('th', { key: 'code' }, 'Šifra'),
                React.createElement('th', { key: 'name' }, 'Naziv'),
                React.createElement('th', { key: 'symbol' }, 'Simbol'),
                React.createElement('th', { key: 'rate' }, 'Tečaj (ka EUR)'),
                React.createElement('th', { key: 'decimals' }, 'Dec.'),
                React.createElement('th', { key: 'format' }, 'Format'),
                React.createElement('th', { key: 'base' }, 'Osnovna'),
                React.createElement('th', { key: 'actions' }, 'Akcije'),
              ]),
            ]),
            React.createElement('tbody', { key: 'body' }, [
              Object.entries(rates).map(([code, rate]) => React.createElement('tr', { key: code }, [
                React.createElement('td', { key: 'code', className: 'nc-code-cell' }, 
                  React.createElement('span', { className: code === baseCurrency ? 'nc-base-badge' : '' }, code)
                ),
                React.createElement('td', { key: 'name' }, CURRENCY_NAMES[code] || '—'),
                React.createElement('td', { key: 'symbol', className: 'nc-symbol-cell' }, CURRENCY_SYMBOLS[code] || '—'),
                React.createElement('td', { key: 'rate', className: 'nc-rate-cell' }, 
                  code === baseCurrency ? '1.000000 (base)' : Number(rates[code]).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
                ),
                React.createElement('td', { key: 'decimals' }, CURRENCY_DECIMALS[code] || 2),
                React.createElement('td', { key: 'format' }, CURRENCY_FORMATS[code] || '{symbol}{amount}'),
                React.createElement('td', { key: 'base' }, 
                  code === baseCurrency ? React.createElement('span', { className: 'nc-base-badge' }, '✅ Osnovna') : '—'
                ),
                React.createElement('td', { key: 'actions' }, [
                  code !== 'EUR' && React.createElement('button', {
                    className: 'nc-btn nc-btn-sm nc-btn-outline',
                    onClick: () => handleEdit(code),
                    key: 'edit',
                  }, '✏️'),
                  code !== 'EUR' && React.createElement('button', {
                    className: 'nc-btn nc-btn-sm nc-btn-danger',
                    onClick: () => handleDelete(code),
                    key: 'delete',
                  }, '🗑️'),
                ]),
              ]))
            ])
          ]),
        ]),
      ]);
    };

    const widgetElement = React.createElement('div', { className: 'nc-currency-manager-widget' }, [
      // Header
      React.createElement('div', { className: 'nc-currency-header', key: 'header' }, [
        React.createElement('div', { className: 'nc-currency-title', key: 'title' }, [
          React.createElement('span', { key: 'icon' }, '💱'),
          React.createElement('h3', { key: 'text' }, 'Currency Manager'),
        ]),
        React.createElement('div', { className: 'nc-currency-actions', key: 'actions' }, [
          React.createElement('button', {
            className: 'nc-btn nc-btn-primary',
            onClick: () => { setShowForm(true); setEditingCode(null); },
            disabled: isLoading,
            key: 'add',
          }, '➕ Dodaj valutu'),
          React.createElement('button', {
            className: 'nc-btn nc-btn-secondary',
            onClick: refreshFromAPI,
            disabled: isLoading,
            key: 'refresh',
          }, isLoading ? '⏳' : '🔄 Osveži sa ECB'),
          React.createElement('button', {
            className: 'nc-btn nc-btn-secondary',
            onClick: handleExportCSV,
            key: 'export',
          }, '📥 Export CSV'),
          React.createElement('input', {
            type: 'file',
            accept: '.csv',
onChange: handleCSVImport,
              style: { display: 'none' },
              id: 'currency-import',
              ref: el => { window.currencyImportRef = el; },
              key: 'import-file',
            }),
            React.createElement('button', {
              className: 'nc-btn nc-btn-secondary',
              onClick: () => window.currencyImportRef?.click(),
              key: 'import',
            }, '📤 Import CSV'),
            React.createElement('button', {
              className: 'nc-btn nc-btn-outline',
              onClick: handleResetToDefaults,
              key: 'reset',
            }, '🔄 Reset na default'),
          ]),
        ]),

        // Status
        React.createElement('div', { className: 'nc-currency-status', key: 'status' }, [
          React.createElement('label', { key: 'label' }, 'Osnovna valuta (base):'),
          React.createElement('select', {
            className: 'nc-field-input',
            value: baseCurrency,
            onChange: e => setBaseCurrency(e.target.value),
            key: 'base-select',
          }, Object.keys(rates).map(code => 
            React.createElement('option', { value: code, key: code }, `${code} (${CURRENCY_NAMES[code] || code})`)
          )),
          React.createElement('span', { className: 'nc-status-source', key: 'source' }, `Izvor: ${source === 'api' ? '🌐 API (ECB)' : source === 'localStorage' ? '💾 localStorage' : '📦 Default'}`),
          lastUpdated && React.createElement('span', { className: 'nc-last-updated', key: 'updated' }, `Poslednje ažuriranje: ${new Date(lastUpdated).toLocaleString('sr-RS')}`),
        ]),

        // Currencies Table
        React.createElement('div', { className: 'nc-currency-table-container', key: 'table' }, [
          React.createElement('table', { className: 'nc-currency-table', key: 'table' }, [
            React.createElement('thead', { key: 'head' }, [
              React.createElement('tr', { key: 'row' }, [
                React.createElement('th', { key: 'code' }, 'Šifra'),
                React.createElement('th', { key: 'name' }, 'Naziv'),
                React.createElement('th', { key: 'symbol' }, 'Simbol'),
                React.createElement('th', { key: 'rate' }, 'Tečaj (ka EUR)'),
                React.createElement('th', { key: 'decimals' }, 'Dec.'),
                React.createElement('th', { key: 'format' }, 'Format'),
                React.createElement('th', { key: 'base' }, 'Osnovna'),
                React.createElement('th', { key: 'actions' }, 'Akcije'),
              ]),
            ]),
            React.createElement('tbody', { key: 'body' }, [
              Object.entries(rates).map(([code, rate]) => React.createElement('tr', { key: code }, [
                React.createElement('td', { key: 'code', className: 'nc-code-cell' }, 
                  React.createElement('span', { className: code === baseCurrency ? 'nc-base-badge' : '' }, code)
                ),
                React.createElement('td', { key: 'name' }, CURRENCY_NAMES[code] || '—'),
                React.createElement('td', { key: 'symbol', className: 'nc-symbol-cell' }, CURRENCY_SYMBOLS[code] || '—'),
                React.createElement('td', { key: 'rate', className: 'nc-rate-cell' }, 
                  code === baseCurrency ? '1.000000 (base)' : Number(rates[code]).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
                ),
                React.createElement('td', { key: 'decimals' }, CURRENCY_DECIMALS[code] || 2),
                React.createElement('td', { key: 'format' }, CURRENCY_FORMATS[code] || '{symbol}{amount}'),
                React.createElement('td', { key: 'base' }, 
                  code === baseCurrency ? React.createElement('span', { className: 'nc-base-badge' }, '✅ Osnovna') : '—'
                ),
                React.createElement('td', { key: 'actions' }, [
                  code !== 'EUR' && React.createElement('button', {
                    className: 'nc-btn nc-btn-sm nc-btn-outline',
                    onClick: () => handleEdit(code),
                    key: 'edit',
                  }, '✏️'),
                  code !== 'EUR' && React.createElement('button', {
                    className: 'nc-btn nc-btn-sm nc-btn-danger',
                    onClick: () => handleDelete(code),
                    key: 'delete',
                  }, '🗑️'),
                ]),
              ]))
            ])
          ]),
        ]),
      ]);

    return widgetElement;
  }

  // Register widget
  if (CMS) {
    CMS.registerWidget('currency-manager', CurrencyManagerWidget);
  }

  window.NC_CurrencyManager = { CurrencyManagerWidget };
})();
initCurrencyManager();
