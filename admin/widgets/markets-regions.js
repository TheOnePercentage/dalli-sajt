(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // MARKETS & REGIONS ADMIN UI - Step 8
  // ============================================

  function MarketsRegionsWidget(props) {
    const { value, onChange, field, config, forID } = props;

    const [activeTab, setActiveTab] = React.useState('countries');
    const [isLoading, setIsLoading] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [filter, setFilter] = React.useState('all');
    const [showForm, setShowForm] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState(null);
    const [formData, setFormData] = React.useState({});
    const [errors, setErrors] = React.useState({});

    React.useEffect(() => { loadData(); }, []);

    function loadData() {
      if (window.DALLI_COUNTRIES) {
        const allCountries = Object.values(window.DALLI_COUNTRIES.COUNTRIES || {});
        window.__dalliCountries = allCountries;
        window.__dalliRegions = window.DALLI_COUNTRIES.REGIONS || {};
        window.__dalliMarkets = window.DALLI_COUNTRIES.MARKETS || {};
      }
    }

    function handleSubmit(e) {
      e.preventDefault();
      showToast(editingItem ? '✅ Ažurirano' : '✅ Dodato', 'success');
      setShowForm(false);
      setEditingItem(null);
    }

    function handleEdit(item) {
      setEditingItem(item.id || item.code);
      setFormData({ ...item });
      setShowForm(true);
    }

    function handleDelete(id) {
      if (!window.confirm('Obrišati?')) return;
      showToast('🗑️ Obbrisano', 'success');
    }

    function resetForm() {
      setFormData({});
      setEditingItem(null);
      setErrors({});
    }

    function showToast(message, type = 'info') {
      const existing = document.querySelector('.nc-markets-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = `nc-markets-toast nc-toast ${type}`;
      toast.style.cssText = `
        position: fixed; bottom: 2rem; right: 2rem; z-index: 10001;
        background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : type === 'success' ? '#28a745' : '#17a2b8'};
        color: ${type === 'warning' ? '#212529' : 'white'};
        padding: 1rem 1.5rem; border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        max-width: 400px; font-size: 0.9rem; line-height: 1.4;
        animation: slideIn 0.3s ease;
      `;
      toast.innerHTML = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }, 5000);
    }

    const tabs = [
      { id: 'countries', label: '🌍 Countries', icon: '🌍' },
      { id: 'regions', label: '🗺️ Regions', icon: '🗺️' },
      { id: 'markets', label: '🏪 Markets', icon: '🏪' },
    ];

    const allCountries = window.__dalliCountries || {};
    const regionsData = window.__dalliRegions || {};
    const marketsData = window.__dalliMarkets || {};

    const getItemsForTab = React.useCallback(() => {
      if (activeTab === 'countries') return Object.values(allCountries);
      if (activeTab === 'regions') return Object.values(regionsData);
      if (activeTab === 'markets') return Object.values(marketsData);
      return [];
    }, [activeTab, allCountries, regionsData, marketsData]);

    const items = getItemsForTab();

    const filteredItems = items.filter(item => {
      if (!item) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchable = `${item.code} ${item.name?.sr || ''} ${item.name?.en || ''} ${item.nativeName || ''}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      if (filter !== 'all') {
        if (filter === 'active' && !item.active) return false;
        if (filter === 'inactive' && item.active) return false;
        if (filter === 'pending' && item.active !== false && item.launchDate) return false;
      }
      return true;
    });

    function renderStatCard(stat, i) {
      return React.createElement('div', {
        className: 'nc-stat-card',
        style: { borderLeftColor: stat.color },
        key: i,
      }, [
        React.createElement('div', { className: 'nc-stat-value', style: { color: stat.color }, key: 'val' }, stat.value),
        React.createElement('div', { className: 'nc-stat-label', key: 'label' }, stat.label),
      ]);
    }

    function renderCountryRow(c) {
      return React.createElement('tr', { key: c.code }, [
        React.createElement('td', { key: 'flag', className: 'nc-flag-cell' }, c.flag),
        React.createElement('td', { key: 'code', className: 'nc-code-cell' }, c.code),
        React.createElement('td', { key: 'name' }, c.name?.sr || c.name?.en || c.code),
        React.createElement('td', { key: 'currency' }, `${c.currency?.symbol || c.currency?.code} (${c.currency?.code})`),
        React.createElement('td', { key: 'language' }, `${c.language?.nativeName || c.language?.code} (${c.language?.code})`),
        React.createElement('td', { key: 'region' }, c.region),
        React.createElement('td', { key: 'tax' }, c.tax ? `${(c.tax.vatRate * 100).toFixed(0)}%` : '—'),
        React.createElement('td', { key: 'status' },
          c.active ?
            React.createElement('span', { className: 'nc-status-badge nc-status-active' }, '✅ Aktivna') :
            c.launchDate ?
              React.createElement('span', { className: 'nc-status-badge nc-status-pending' }, '⏳ Planirana') :
              React.createElement('span', { className: 'nc-status-badge nc-status-inactive' }, '🚫 Neaktivna')
        ),
        React.createElement('td', { key: 'launch' }, c.launchDate || '—'),
        React.createElement('td', { key: 'actions' }, [
          !c.active && React.createElement('button', { className: 'nc-btn nc-btn-sm nc-btn-success', onClick: () => handleEdit(c.code), key: 'activate' }, '✅ Aktiviraj'),
          !c.code.match(/^RS$/) && React.createElement('button', { className: 'nc-btn nc-btn-sm nc-btn-danger', onClick: () => handleDelete(c.code), key: 'delete' }, '🗑️'),
        ]),
      ]);
    }

    function renderContent() {
      if (activeTab === 'countries') {
        const stats = [
          { label: '🌍 Ukupno', value: Object.keys(allCountries).length, color: '#2c3e50' },
          { label: '✅ Aktivne', value: Object.values(allCountries).filter(c => c.active).length, color: '#27ae60' },
          { label: '⏳ Na čekanju', value: Object.values(allCountries).filter(c => !c.active && c.launchDate).length, color: '#f39c12' },
          { label: '🚫 Neaktivne', value: Object.values(allCountries).filter(c => !c.active && !c.launchDate).length, color: '#e74c3c' },
        ];

        return React.createElement('div', { className: 'nc-markets-countries', key: 'countries' }, [
          React.createElement('div', { className: 'nc-countries-stats', key: 'stats' },
            stats.map(renderStatCard)
          ),
          React.createElement('div', { className: 'nc-countries-table-wrapper', key: 'table' }, [
            React.createElement('table', { className: 'nc-countries-table', key: 'table' }, [
              React.createElement('thead', { key: 'head' }, [
                React.createElement('tr', { key: 'row' }, [
                  React.createElement('th', { key: 'flag' }, '🏳️'),
                  React.createElement('th', { key: 'code' }, 'Šifra'),
                  React.createElement('th', { key: 'name' }, 'Naziv'),
                  React.createElement('th', { key: 'currency' }, 'Valuta'),
                  React.createElement('th', { key: 'language' }, 'Jezik'),
                  React.createElement('th', { key: 'region' }, 'Region'),
                  React.createElement('th', { key: 'tax' }, 'PDV'),
                  React.createElement('th', { key: 'status' }, 'Status'),
                  React.createElement('th', { key: 'launch' }, 'Lansiranje'),
                  React.createElement('th', { key: 'actions' }, 'Akcije'),
                ]),
              ]),
              React.createElement('tbody', { key: 'body' },
                Object.values(allCountries).map(renderCountryRow)
              ),
            ]),
          ]),
        ]);
      } else if (activeTab === 'regions') {
        return React.createElement('div', { className: 'nc-markets-regions', key: 'regions' }, [
          React.createElement('div', { className: 'nc-section-title', key: 'title' }, 'Regions'),
          React.createElement('p', { key: 'desc' }, 'Region management coming soon.'),
        ]);
      } else if (activeTab === 'markets') {
        return React.createElement('div', { className: 'nc-markets-markets', key: 'markets' }, [
          React.createElement('div', { className: 'nc-section-title', key: 'title' }, 'Markets'),
          React.createElement('p', { key: 'desc' }, 'Market management coming soon.'),
        ]);
      }
      return React.createElement('div', { key: 'default' }, 'Select a tab');
    }

    const header = React.createElement('div', { className: 'nc-markets-header', key: 'header' }, [
      React.createElement('div', { className: 'nc-markets-title', key: 'title' }, [
        React.createElement('span', { key: 'icon' }, '🌐'),
        React.createElement('h3', { key: 'text' }, 'Markets & Regions'),
      ]),
      React.createElement('div', { className: 'nc-markets-actions', key: 'actions' }, [
        React.createElement('button', {
          className: 'nc-btn nc-btn-primary',
          onClick: () => { setShowForm(true); setEditingItem(null); },
          key: 'add',
        }, '➕ Dodaj'),
      ]),
    ]);

    const tabsElement = React.createElement('div', { className: 'nc-markets-tabs', key: 'tabs' },
      tabs.map(tab => React.createElement('button', {
        className: `nc-markets-tab ${activeTab === tab.id ? 'active' : ''}`,
        onClick: () => setActiveTab(tab.id),
        key: tab.id,
      }, `${tab.icon} ${tab.label}`))
    );

    const toolbar = React.createElement('div', { className: 'nc-markets-toolbar', key: 'toolbar' }, [
      React.createElement('input', {
        type: 'text',
        className: 'nc-markets-search',
        placeholder: '🔍 Pretraži (šifra, naziv, valuta, jezik...)',
        value: searchQuery,
        onChange: e => setSearchQuery(e.target.value),
        key: 'search',
      }),
      React.createElement('select', {
        className: 'nc-markets-filter',
        value: filter,
        onChange: e => setFilter(e.target.value),
        key: 'filter',
      }, [
        React.createElement('option', { value: 'all', key: 'all' }, 'Svi'),
        React.createElement('option', { value: 'active', key: 'active' }, '✅ Aktivne'),
        React.createElement('option', { value: 'inactive', key: 'inactive' }, '🚫 Neaktivne'),
        React.createElement('option', { value: 'pending', key: 'pending' }, '⏳ Planirane'),
      ]),
    ]);

    const formOverlay = showForm && React.createElement('div', { className: 'nc-markets-form-overlay', key: 'form-overlay', onClick: () => { setShowForm(false); setEditingItem(null); } }, [
      React.createElement('div', { className: 'nc-markets-form', key: 'form', onClick: e => e.stopPropagation() }, [
        React.createElement('div', { className: 'nc-form-header', key: 'header' }, [
          React.createElement('h4', { key: 'title' }, editingItem ? '✏️ Uredi' : '➕ Novi'),
          React.createElement('button', { className: 'nc-form-close', onClick: () => { setShowForm(false); setEditingItem(null); }, key: 'close' }, '×'),
        ]),
        React.createElement('form', { onSubmit: handleSubmit, key: 'form' }, [
          React.createElement('div', { className: 'nc-form-field', key: 'code' }, [
            React.createElement('label', { key: 'label' }, 'Šifra (ISO 3166-1 alpha-2) *'),
            React.createElement('input', { type: 'text', className: 'nc-field-input', placeholder: 'RS, DE, FR...', value: '', required: true, maxLength: 2 }),
            React.createElement('span', { className: 'nc-field-hint', key: 'hint' }, 'ISO 3166-1 alpha-2 kod, npr. RS, DE, FR, IT...'),
          ]),
          React.createElement('div', { className: 'nc-form-actions', key: 'actions' }, [
            React.createElement('button', { type: 'button', className: 'nc-btn nc-btn-secondary', onClick: () => { setShowForm(false); }, key: 'cancel' }, 'Otkaži'),
            React.createElement('button', { type: 'submit', className: 'nc-btn nc-btn-primary', key: 'submit' }, '💾 Sačuvaj'),
          ]),
        ]),
      ]),
    ]);

    return React.createElement('div', { className: 'nc-markets-regions-widget' }, [
      header,
      tabsElement,
      toolbar,
      renderContent(),
      formOverlay,
    ]);
  }

  if (CMS) {
    CMS.registerWidget('markets-regions', MarketsRegionsWidget);
  }

  window.NC_MarketsRegions = { MarketsRegionsWidget };
})();
