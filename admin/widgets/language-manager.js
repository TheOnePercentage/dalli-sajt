(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // LANGUAGE MANAGER ADMIN UI
  // ============================================

  function LanguageManagerWidget(props) {
    const { value, onChange, field, config, forID } = props;

    const [languages, setLanguages] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showForm, setShowForm] = React.useState(false);
    const [editingLang, setEditingLang] = React.useState(null);
    const [formData, setFormData] = React.useState({
      code: '', name: '', nativeName: '', locale: '', rtl: false, enabled: true
    });
    const [errors, setErrors] = React.useState({});
    const [activeTab, setActiveTab] = React.useState('list');
    const [filter, setFilter] = React.useState('all');
    const [searchQuery, setSearchQuery] = React.useState('');

    React.useEffect(() => { loadLanguages(); }, []);

    async function loadLanguages() {
      setIsLoading(true);
      try {
        const res = await fetch('/.netlify/functions/get-languages');
        if (res.ok) {
          const data = await res.json();
          if (data.languages) setLanguages(data.languages);
        }
      } catch (err) {
        showToast('❌ Greška pri učitavanju: ' + err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    }

    function showToast(message, type = 'info') {
      const existing = document.querySelector('.nc-language-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = `nc-language-toast nc-toast ${type}`;
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
      { id: 'list', label: '📋 Lista Jezika', icon: '📋' },
      { id: 'add', label: '➕ Dodaj Jezik', icon: '➕' },
    ];

    const filteredLanguages = languages.filter(lang => {
      if (filter === 'enabled' && !lang.enabled) return false;
      if (filter === 'disabled' && lang.enabled) return false;
      if (filter === 'rtl' && !lang.rtl) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchable = `${lang.code} ${lang.name} ${lang.nativeName} ${lang.locale}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      return true;
    });

    function renderLanguageRow(lang) {
      return React.createElement('tr', { key: lang.id }, [
        React.createElement('td', { key: 'code', className: 'nc-code-cell' }, lang.code),
        React.createElement('td', { key: 'name' }, lang.name),
        React.createElement('td', { key: 'nativeName' }, lang.nativeName),
        React.createElement('td', { key: 'locale' }, lang.locale),
        React.createElement('td', { key: 'rtl' }, lang.rtl ? '🔄 RTL' : 'LTR'),
        React.createElement('td', { key: 'enabled' }, lang.enabled ?
          React.createElement('span', { className: 'nc-status-badge nc-status-active' }, '✅ Omogućen') :
          React.createElement('span', { className: 'nc-status-badge nc-status-inactive' }, '❌ Onemogućen')
        ),
        React.createElement('td', { key: 'actions' }, [
          React.createElement('button', { className: 'nc-btn nc-btn-sm nc-btn-outline', onClick: () => handleEdit(lang), key: 'edit' }, '✏️'),
          React.createElement('button', { className: 'nc-btn nc-btn-sm nc-btn-danger', onClick: () => handleDelete(lang.id), key: 'delete' }, '🗑️'),
        ]),
      ]);
    }

    function renderEmptyState() {
      return React.createElement('div', { className: 'nc-language-empty', key: 'empty' }, [
        React.createElement('div', { className: 'nc-empty-icon', key: 'icon' }, '🌐'),
        React.createElement('h4', { key: 'title' }, 'Nema jezika'),
        React.createElement('p', { key: 'desc' }, 'Dodajte prvi jezik klikom na "➕ Dodaj Jezik"'),
        React.createElement('button', {
          className: 'nc-btn nc-btn-primary',
          onClick: () => { setShowForm(true); setEditingLang(null); },
          key: 'add-first',
        }, '➕ Dodaj Prvi Jezik'),
      ]);
    }

    function renderLanguageTable() {
      return React.createElement('div', { className: 'nc-language-table-wrapper', key: 'wrapper' }, [
        React.createElement('table', { className: 'nc-language-table', key: 'table' }, [
          React.createElement('thead', { key: 'head' }, [
            React.createElement('tr', { key: 'row' }, [
              React.createElement('th', { key: 'code' }, 'Šifra'),
              React.createElement('th', { key: 'name' }, 'Naziv'),
              React.createElement('th', { key: 'nativeName' }, 'Domaci naziv'),
              React.createElement('th', { key: 'locale' }, 'Locale'),
              React.createElement('th', { key: 'rtl' }, 'RTL'),
              React.createElement('th', { key: 'enabled' }, 'Status'),
              React.createElement('th', { key: 'actions' }, 'Akcije'),
            ]),
          ]),
          React.createElement('tbody', { key: 'body' },
            filteredLanguages.map(renderLanguageRow)
          ),
        ]),
      ]);
    }

    function renderContent() {
      return activeTab === 'list'
        ? (filteredLanguages.length === 0 ? renderEmptyState() : renderLanguageTable())
        : React.createElement('div', { className: 'nc-language-add', key: 'add' }, [
            React.createElement('h4', { key: 'title' }, 'Dodaj novi jezik'),
            React.createElement('p', { key: 'desc' }, 'Pređite na tab "Lista Jezika" i kliknite "➕ Dodaj Jezik"'),
          ]);
    }

    function handleEdit(lang) {
      setEditingLang(lang.id);
      setFormData({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        locale: lang.locale,
        rtl: lang.rtl || false,
        enabled: lang.enabled !== false,
      });
      setShowForm(true);
      setActiveTab('add');
    }

    function handleDelete(id) {
      if (!window.confirm('Obrišati ovaj jezik?')) return;
      setLanguages(languages.filter(l => l.id !== id));
      showToast('🗑️ Jezik obrisan', 'success');
    }

    function handleSubmit(e) {
      e.preventDefault();
      if (editingLang) {
        setLanguages(languages.map(l => l.id === editingLang ? { ...l, ...formData } : l));
        showToast('✅ Jezik ažuriran', 'success');
      } else {
        const newLang = { id: 'lang-' + Date.now(), ...formData };
        setLanguages([...languages, newLang]);
        showToast('✅ Jezik dodat', 'success');
      }
      setShowForm(false);
      setEditingLang(null);
    }

    function handleFormClose() {
      setShowForm(false);
      setEditingLang(null);
      setFormData({ code: '', name: '', nativeName: '', locale: '', rtl: false, enabled: true });
    }

    const header = React.createElement('div', { className: 'nc-language-header', key: 'header' }, [
      React.createElement('div', { className: 'nc-language-title', key: 'title' }, [
        React.createElement('span', { key: 'icon' }, '🌐'),
        React.createElement('h3', { key: 'text' }, 'Language Manager'),
      ]),
      React.createElement('div', { className: 'nc-language-actions', key: 'actions' }, [
        React.createElement('button', {
          className: `nc-btn nc-btn-primary ${isLoading ? 'disabled' : ''}`,
          onClick: () => { handleFormClose(); setShowForm(true); },
          disabled: isLoading,
          key: 'add',
        }, '➕ Dodaj Jezik'),
      ]),
    ]);

    const tabsElement = React.createElement('div', { className: 'nc-language-tabs', key: 'tabs' },
      tabs.map(tab => React.createElement('button', {
        className: `nc-language-tab ${activeTab === tab.id ? 'active' : ''}`,
        onClick: () => setActiveTab(tab.id),
        key: tab.id,
      }, `${tab.icon} ${tab.label}`))
    );

    const toolbar = React.createElement('div', { className: 'nc-language-toolbar', key: 'toolbar' }, [
      React.createElement('input', {
        type: 'text',
        className: 'nc-language-search',
        placeholder: '🔍 Pretraži (šifra, naziv, locale...)',
        value: searchQuery,
        onChange: e => setSearchQuery(e.target.value),
        key: 'search',
      }),
      React.createElement('select', {
        className: 'nc-language-filter',
        value: filter,
        onChange: e => setFilter(e.target.value),
        key: 'filter',
      }, [
        React.createElement('option', { value: 'all', key: 'all' }, 'Svi'),
        React.createElement('option', { value: 'enabled', key: 'enabled' }, '✅ Omogućeni'),
        React.createElement('option', { value: 'disabled', key: 'disabled' }, '❌ Onemogućeni'),
        React.createElement('option', { value: 'rtl', key: 'rtl' }, '🔄 RTL Jezici'),
      ]),
    ]);

    const formOverlay = showForm && React.createElement('div', { className: 'nc-language-form-overlay', key: 'form-overlay', onClick: handleFormClose }, [
      React.createElement('div', { className: 'nc-language-form', key: 'form', onClick: e => e.stopPropagation() }, [
        React.createElement('div', { className: 'nc-form-header', key: 'header' }, [
          React.createElement('h4', { key: 'title' }, editingLang ? '✏️ Uredi Jezik' : '➕ Novi Jezik'),
          React.createElement('button', { className: 'nc-form-close', onClick: handleFormClose, key: 'close' }, '×'),
        ]),
        React.createElement('form', { onSubmit: handleSubmit, key: 'form' }, [
          React.createElement('div', { className: 'nc-form-row', key: 'row1' }, [
            React.createElement('div', { className: 'nc-form-field', key: 'code' }, [
              React.createElement('label', { key: 'label' }, 'Šifra (ISO 639-1) *'),
              React.createElement('input', { type: 'text', className: 'nc-field-input', placeholder: 'sr, en, de...', value: formData.code, onChange: e => setFormData({ ...formData, code: e.target.value.toLowerCase() }), required: true, maxLength: 5 }),
              React.createElement('span', { className: 'nc-field-hint', key: 'hint' }, 'ISO 639-1 kod, npr. sr, en, de, fr...'),
            ]),
            React.createElement('div', { className: 'nc-form-field', key: 'locale' }, [
              React.createElement('label', { key: 'label' }, 'Locale *'),
              React.createElement('input', { type: 'text', className: 'nc-field-input', placeholder: 'sr-RS, en-US...', value: formData.locale, onChange: e => setFormData({ ...formData, locale: e.target.value }), required: true }),
            ]),
          ]),
          React.createElement('div', { className: 'nc-form-row', key: 'row2' }, [
            React.createElement('div', { className: 'nc-form-field', key: 'name' }, [
              React.createElement('label', { key: 'label' }, 'Naziv (engleski) *'),
              React.createElement('input', { type: 'text', className: 'nc-field-input', placeholder: 'Serbian', value: formData.name, onChange: e => setFormData({ ...formData, name: e.target.value }), required: true }),
            ]),
            React.createElement('div', { className: 'nc-form-field', key: 'nativeName' }, [
              React.createElement('label', { key: 'label' }, 'Domaci naziv *'),
              React.createElement('input', { type: 'text', className: 'nc-field-input', placeholder: 'Srpski', value: formData.nativeName, onChange: e => setFormData({ ...formData, nativeName: e.target.value }), required: true }),
            ]),
          ]),
          React.createElement('div', { className: 'nc-form-row', key: 'row3' }, [
            React.createElement('div', { className: 'nc-form-field', key: 'rtl' }, [
              React.createElement('label', { className: 'nc-checkbox-label', key: 'label' }, [
                React.createElement('input', { type: 'checkbox', checked: formData.rtl, onChange: e => setFormData({ ...formData, rtl: e.target.checked }), key: 'input' }),
                React.createElement('span', { key: 'text' }, 'RTL (desno na levo)'),
              ]),
            ]),
            React.createElement('div', { className: 'nc-form-field', key: 'enabled' }, [
              React.createElement('label', { className: 'nc-checkbox-label', key: 'label' }, [
                React.createElement('input', { type: 'checkbox', checked: formData.enabled, onChange: e => setFormData({ ...formData, enabled: e.target.checked }), key: 'input' }),
                React.createElement('span', { key: 'text' }, 'Omogućen'),
              ]),
            ]),
          ]),
          React.createElement('div', { className: 'nc-form-actions', key: 'actions' }, [
            React.createElement('button', { type: 'button', className: 'nc-btn nc-btn-secondary', onClick: handleFormClose, key: 'cancel' }, 'Otkaži'),
            React.createElement('button', { type: 'submit', className: 'nc-btn nc-btn-primary', key: 'submit' }, editingLang ? '💾 Sačuvaj izmene' : '➕ Dodaj jezik'),
          ]),
        ]),
      ]),
    ]);

    const loading = isLoading && React.createElement('div', { className: 'nc-language-loading', key: 'loading' }, [
      React.createElement('div', { className: 'nc-spinner', key: 'spinner' }),
      React.createElement('p', { key: 'text' }, 'Učitavanje jezika...'),
    ]);

    return React.createElement('div', { className: 'nc-language-manager-widget' }, [
      header,
      tabsElement,
      toolbar,
      renderContent(),
      formOverlay,
      loading,
    ]);
  }

  if (CMS) {
    CMS.registerWidget('language-manager', LanguageManagerWidget);
  }

  window.NC_LanguageManager = { LanguageManagerWidget };
})();
