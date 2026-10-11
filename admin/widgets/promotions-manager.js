(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // PROMOTIONS MANAGER WIDGET - Step 7
  // ============================================

  function PromotionsManagerWidget(props) {
    const { value, onChange, field, config, forID } = props;

    const [promotions, setPromotions] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showForm, setShowForm] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [formData, setFormData] = React.useState({
      code: '',
      name: '',
      type: 'percentage',
      value: '',
      maxUses: 0,
      usedCount: 0,
      minCartValue: 0,
      maxDiscount: 0,
      startsAt: '',
      endsAt: '',
      active: true,
      stackable: false,
      appliesTo: 'all', // 'all', 'categories', 'products', 'customers'
      conditions: {},
    });
    const [errors, setErrors] = React.useState({});
    const [activeTab, setActiveTab] = React.useState('list');
    const [filter, setFilter] = React.useState('all');

    // Load promotions on mount
    React.useEffect(() => {
      loadPromotions();
    }, []);

    async function loadPromotions() {
      try {
        const response = await fetch('/.netlify/functions/get-promotions');
        if (response.ok) {
          const data = await response.json();
          if (data.promotions) {
            setPromotions(data.promotions);
            return;
          }
        }
      } catch (e) {
        console.warn('[PromotionsManager] Could not load from function:', e.message);
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('dalli_promotions');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.promotions) setPromotions(data.promotions);
        } catch (e) {
          console.warn('[PromotionsManager] Could not parse promotions:', e.message);
        }
      }
    }

    async function savePromotions(newPromotions) {
      setIsLoading(true);
      try {
        const response = await fetch('/.netlify/functions/save-promotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promotions: newPromotions }),
        });

        if (response.ok) {
          showToast('✅ Promocije sačuvane na serveru', 'success');
        }
      } catch (e) {
        console.warn('[PromotionsManager] Could not save to server:', e.message);
      }

      localStorage.setItem('dalli_promotions', JSON.stringify({ promotions: newPromotions }));
      setPromotions(newPromotions);
      setIsLoading(false);
    }

    function validatePromotion(data, allPromos, excludeId = null) {
      const errors = {};

      if (!data.code.trim()) errors.code = 'Šifra je obavezna';
      if (!data.name.trim()) errors.name = 'Naziv je obavezan';
      if (!data.type) errors.type = 'Tip promocije je obavezan';
      if (!data.value && data.type !== 'free_shipping') errors.value = 'Vrednost je obavezna';

      // Check duplicate code
      const duplicate = allPromos.find(p => p.code === data.code && p.id !== excludeId);
      if (duplicate) errors.code = 'Šifra već postoji';

      // Validate dates
      if (data.startsAt && data.endsAt && new Date(data.startsAt) >= new Date(data.endsAt)) {
        errors.endsAt = 'Datum završetka mora biti posle datuma početka';
      }

      // Validate max discount
      if (data.type === 'percentage' && data.value > 100) {
        errors.value = 'Procentualni popust ne može biti veći od 100%';
      }

      return errors;
    }

    function handleSubmit(e) {
      e.preventDefault();
      
      const allPromos = editingId ? promotions.filter(p => p.id !== editingId) : promotions;
      const newErrors = validatePromotion(formData, allPromos, editingId);
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const newPromo = {
        id: editingId || `PROMO-${Date.now().toString(36).toUpperCase()}`,
        ...formData,
        createdAt: editingId ? promotions.find(p => p.id === editingId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newPromos = editingId 
        ? promotions.map(p => p.id === editingId ? newPromo : p)
        : [...promotions, newPromo];

      savePromotions(newPromos);
      setShowForm(false);
      setEditingId(null);
      resetForm();
      showToast(editingId ? '✅ Promocija ažurirana' : '✅ Promocija dodata', 'success');
    }

    function handleEdit(promo) {
      setEditingId(promo.id);
      setFormData({ ...promo });
      setShowForm(true);
      setErrors({});
    }

    function handleDelete(id) {
      if (!window.confirm('Obrišati ovu promociju?')) return;
      const newPromos = promotions.filter(p => p.id !== id);
      savePromotions(newPromos);
      showToast('🗑️ Promocija obrisana', 'success');
    }

    function resetForm() {
      setFormData({
        code: '',
        name: '',
        type: 'percentage',
        value: '',
        maxUses: 0,
        minCartValue: 0,
        maxDiscount: 0,
        startsAt: '',
        endsAt: '',
        active: true,
        stackable: false,
        appliesTo: 'all',
        conditions: {},
      });
      setErrors({});
      setEditingId(null);
    }

    function showToast(message, type = 'info') {
      const existing = document.querySelector('.nc-promo-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = `nc-promo-toast nc-toast ${type}`;
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

    function exportPromotions() {
      const csv = [
        ['Code', 'Name', 'Type', 'Value', 'Max Uses', 'Used', 'Active', 'Start', 'End', 'Stackable'].join(','),
        ...promotions.map(p => [
          p.code, p.name, p.type, p.value, p.maxUses, p.usedCount, p.active, p.startsAt, p.endsAt, p.stackable
        ].map(v => `"${v}"`).join(','))
      ].join('\n');
      
      downloadCSV(csv, `promotions-${new Date().toISOString().split('T')[0]}.csv`);
      showToast('📥 Exportovan CSV', 'success');
    }

    function importPromotions(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.trim().split('\n');
          if (lines.length < 2) throw new Error('CSV prazan');
          
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          const newPromos = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 8) {
              const promo = {
                id: `PROMO-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`,
                code: values[0]?.replace(/"/g, '').trim(),
                name: values[1]?.replace(/"/g, '').trim(),
                type: values[2]?.replace(/"/g, '').trim(),
                value: values[3]?.replace(/"/g, '').trim(),
                maxUses: parseInt(values[4]) || 0,
                usedCount: parseInt(values[5]) || 0,
                active: values[6] === 'true',
                startsAt: values[7]?.replace(/"/g, '').trim(),
                endsAt: values[8]?.replace(/"/g, '').trim(),
                stackable: values[9] === 'true',
              };
              if (promo.code && promo.name && promo.type) newPromos.push(promo);
            }
          }
          
          if (newPromos.length > 0 && window.confirm(`Uvesti ${newPromos.length} promocija?`)) {
            setPromotions([...promotions, ...newPromos]);
            showToast(`✅ Uvezene ${newPromos.length} promocija`, 'success');
          }
        } catch (err) {
          showToast(`❌ Greška pri uvozu: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }

    function parseCSVLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    }

    function downloadCSV(csv, filename) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    // Render
    const tabs = [
      { id: 'list', label: '📋 Lista', icon: '📋' },
      { id: 'add', label: '➕ Dodaj', icon: '➕' },
      { id: 'templates', label: '📋 Šabloni', icon: '📋' },
    ];

    const filteredPromos = promotions.filter(promo => {
      if (filter === 'active' && !promo.active) return false;
      if (filter === 'inactive' && promo.active) return false;
      if (filter === 'expired' && promo.endsAt && new Date(promo.endsAt) < new Date()) return false;
      return true;
    });

    return React.createElement('div', { className: 'nc-promotions-manager-widget' }, [
      React.createElement('div', { className: 'nc-promotions-header', key: 'header' }, [
        React.createElement('div', { className: 'nc-promotions-title', key: 'title' }, [
          React.createElement('span', { key: 'icon' }, '🎁'),
          React.createElement('h3', { key: 'text' }, 'Promotions Manager'),
        ]),
        React.createElement('div', { className: 'nc-promotions-actions', key: 'actions' }, [
          React.createElement('button', {
            className: 'nc-btn nc-btn-primary',
            onClick: () => { setShowForm(true); setEditingId(null); },
            key: 'add',
          }, '➕ Nova Promocija'),
          React.createElement('button', {
            className: 'nc-btn nc-btn-secondary',
            onClick: () => {
              const csv = [
                ['Code', 'Name', 'Type', 'Value', 'Max Uses', 'Used', 'Active', 'Start', 'End', 'Stackable'].join(','),
                ...promotions.map(p => [p.code, p.name, p.type, p.value, p.maxUses, p.usedCount, p.active, p.startsAt, p.endsAt, p.stackable].map(v => `"${v}"`).join(',')).join('\n')
              ];
              downloadCSV(csv, `promotions-${new Date().toISOString().split('T')[0]}.csv`);
            },
            key: 'export',
          }, '📥 Export CSV'),
          React.createElement('input', {
            type: 'file',
            accept: '.csv',
            onChange: importPromotions,
            style: { display: 'none' },
            id: 'promo-import',
            ref: el => { window.promoImportRef = el; },
            key: 'import-file',
          }),
          React.createElement('button', {
            className: 'nc-btn nc-btn-secondary',
            onClick: () => window.promoImportRef?.click(),
            key: 'import',
          }, '📤 Import CSV'),
        ]),
      ]),

      // Tabs
      React.createElement('div', { className: 'nc-promotions-tabs', key: 'tabs' },
        [
          { id: 'list', label: '📋 Lista', icon: '📋' },
          { id: 'templates', label: '📋 Šabloni', icon: '📋' },
        ].map(tab => React.createElement('button', {
          className: `nc-promotions-tab ${activeTab === tab.id ? 'active' : ''}`,
          onClick: () => setActiveTab(tab.id),
          key: tab.id,
        }, `${tab.icon} ${tab.label}`))
      ),

      // Search/Filter
      React.createElement('div', { className: 'nc-promotions-toolbar', key: 'toolbar' }, [
        React.createElement('input', {
          type: 'text',
          className: 'nc-promotions-search',
          placeholder: '🔍 Pretraži (šifra, naziv, tip...)',
          value: '',
          onChange: e => {},
          key: 'search',
        }),
        React.createElement('select', {
          className: 'nc-promotions-filter',
          value: filter,
          onChange: e => setFilter(e.target.value),
          key: 'filter',
        }, [
          React.createElement('option', { value: 'all', key: 'all' }, 'Sve'),
          React.createElement('option', { value: 'active', key: 'active' }, '✅ Aktivne'),
          React.createElement('option', { value: 'inactive', key: 'inactive' }, '❌ Neaktivne'),
          React.createElement('option', { value: 'expired', key: 'expired' }, '⏰ Istekle'),
          React.createElement('option', { value: 'percentage', key: 'percentage' }, '📊 Procentualne'),
          React.createElement('option', { value: 'fixed', key: 'fixed' }, '💰 Fiksne'),
          React.createElement('option', { value: 'free_shipping', key: 'free_shipping' }, '🚚 Besplatna dostava'),
          React.createElement('option', { value: 'bogo', key: 'bogo' }, '🎁 BOGO'),
        ]),
      ]),

      // Content
      React.createElement('div', { className: 'nc-promotions-content', key: 'content' }, [
        activeTab === 'list' && React.createElement('div', { className: 'nc-promotions-list', key: 'list' }, [
          promotions.length === 0 ? React.createElement('div', { className: 'nc-promotions-empty', key: 'empty' }, [
            React.createElement('div', { className: 'nc-empty-icon', key: 'icon' }, '🎁'),
            React.createElement('h4', { key: 'title' }, 'Nema Promocija'),
            React.createElement('p', { key: 'desc' }, 'Dodajte prvu promociju klikom na "➕ Nova Promocija"'),
            React.createElement('button', {
              className: 'nc-btn nc-btn-primary',
              onClick: () => { setShowForm(true); setEditingId(null); },
              key: 'add-first',
            }, '➕ Dodaj Prvu Promociju'),
          ]) : React.createElement('div', { className: 'nc-promotions-table-wrapper', key: 'wrapper' }, [
            React.createElement('table', { className: 'nc-promotions-table', key: 'table' }, [
              React.createElement('thead', { key: 'head' }, [
                React.createElement('tr', { key: 'row' }, [
                  React.createElement('th', { key: 'code' }, 'Šifra'),
                  React.createElement('th', { key: 'name' }, 'Naziv'),
                  React.createElement('th', { key: 'type' }, 'Tip'),
                  React.createElement('th', { key: 'value' }, 'Vrednost'),
                  React.createElement('th', { key: 'uses' }, 'Korišćenja'),
                  React.createElement('th', { key: 'dates' }, 'Važenje'),
                  React.createElement('th', { key: 'status' }, 'Status'),
                  React.createElement('th', { key: 'actions' }, 'Akcije'),
                ]),
              ]),
              React.createElement('tbody', { key: 'body' },
                promotions.map(p => React.createElement('tr', { key: p.id }, [
                  React.createElement('td', { key: 'code', className: 'nc-code-cell' }, p.code),
                  React.createElement('td', { key: 'name' }, p.name),
                  React.createElement('td', { key: 'type' }, React.createElement('span', { className: `nc-promo-type-badge ${p.type}` }, getTypeLabel(p.type))),
                  React.createElement('td', { key: 'value' }, formatPromoValue(p)),
                  React.createElement('td', { key: 'uses' }, `${p.usedCount}/${p.maxUses || '∞'}`),
                  React.createElement('td', { key: 'dates' }, `${formatDate(p.startsAt)} → ${p.endsAt ? formatDate(p.endsAt) : '∞'}`),
                  React.createElement('td', { key: 'status' }, p.active ? React.createElement('span', { className: 'nc-status-badge nc-status-active' }, '✅ Aktivna') : React.createElement('span', { className: 'nc-status-badge nc-status-inactive' }, '❌ Neaktivna')),
                  React.createElement('td', { key: 'actions' }, [
                    React.createElement('button', { className: 'nc-btn nc-btn-sm nc-btn-outline', onClick: () => handleEdit(p), key: 'edit' }, '✏️'),
                    React.createElement('button', { className: 'nc-btn nc-btn-sm nc-btn-danger', onClick: () => handleDelete(p.id), key: 'delete' }, '🗑️'),
                  ]),
                ]),
              )),
            ]),
          ]),
        ]),
      ,

          // Form
          showForm && React.createElement('div', { className: 'nc-promotion-form-overlay', key: 'form-overlay', onClick: () => { setShowForm(false); setEditingId(null); } }, [
            React.createElement('div', { className: 'nc-promotion-form', key: 'form', onClick: e => e.stopPropagation() }, [
              React.createElement('div', { className: 'nc-form-header', key: 'header' }, [
                React.createElement('h4', { key: 'title' }, editingId ? '✏️ Uredi Promociju' : '➕ Nova Promocija'),
                React.createElement('button', { className: 'nc-form-close', onClick: () => { setShowForm(false); setEditingId(null); }, key: 'close' }, '×'),
              ]),
              React.createElement('form', { onSubmit: e => { e.preventDefault(); handleSubmit(e); }, key: 'form' }, [
                React.createElement('div', { className: 'nc-form-row', key: 'row1' }, [
                  React.createElement('div', { className: 'nc-form-field', key: 'code' }, [
                    React.createElement('label', { key: 'label' }, 'Šifra (kod) *'),
                    React.createElement('input', { type: 'text', className: `nc-field-input ${errors.code ? 'error' : ''}`, placeholder: 'SUMMER20, FREESHIP, BOGO50...', value: formData.code, onChange: e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() })), required: true, maxLength: 20, disabled: !!editingId }),
                    errors.code && React.createElement('span', { className: 'nc-field-error', key: 'err' }, errors.code),
                    React.createElement('span', { className: 'nc-field-hint', key: 'hint' }, 'Jedinstvena šifra, npr. SUMMER20, FREESHIP, BOGO50'),
                  ]),
                  React.createElement('div', { className: 'nc-form-field', key: 'name' }, [
                    React.createElement('label', { key: 'label' }, 'Naziv *'),
                    React.createElement('input', { type: 'text', className: `nc-field-input ${errors.name ? 'error' : ''}`, placeholder: 'Letnja akcija 20% popusta', value: formData.name, onChange: e => setFormData(prev => ({ ...prev, name: e.target.value })), required: true }),
                    errors.name && React.createElement('span', { className: 'nc-field-error', key: 'err' }, errors.name),
                  ]),
                ]),
                React.createElement('div', { className: 'nc-form-row', key: 'row2' }, [
                  React.createElement('div', { className: 'nc-form-field', key: 'type' }, [
                    React.createElement('label', { key: 'label' }, 'Tip Promocije *'),
                    React.createElement('select', { className: 'nc-field-input', value: formData.type, onChange: e => setFormData(prev => ({ ...prev, type: e.target.value })), key: 'select' }, [
                      React.createElement('option', { value: 'percentage', key: 'percentage' }, '📊 Procentualni popust (%)'),
                      React.createElement('option', { value: 'fixed', key: 'fixed' }, '💰 Fiksni iznos'),
                      React.createElement('option', { value: 'free_shipping', key: 'free_shipping' }, '🚚 Besplatna dostava'),
                      React.createElement('option', { value: 'bogo', key: 'bogo' }, '🎁 Kupi 1 dobij 1 (BOGO)'),
                      React.createElement('option', { value: 'gift', key: 'gift' }, '🎁 Gratis proizvod'),
                    ]),
                  ]),
                  React.createElement('div', { className: 'nc-form-field', key: 'value' }, [
                    React.createElement('label', { key: 'label' }, 'Vrednost *'),
                    React.createElement('input', { type: 'number', className: `nc-field-input ${errors.value ? 'error' : ''}`, placeholder: '20 (za 20%) ili 1000 (za 1000 RSD)', value: formData.value, onChange: e => setFormData(prev => ({ ...prev, value: e.target.value })), required: true, step: '0.01', min: '0' }),
                    errors.value && React.createElement('span', { className: 'nc-field-error', key: 'err' }, errors.value),
                  ]),
                ]),
                React.createElement('div', { className: 'nc-form-row', key: 'row3' }, [
                  React.createElement('div', { className: 'nc-form-field', key: 'maxUses' }, [
                    React.createElement('label', { key: 'label' }, 'Maks. korišćenja (0 = neograničeno)'),
                    React.createElement('input', { type: 'number', className: 'nc-field-input', placeholder: '0', value: formData.maxUses, onChange: e => setFormData(prev => ({ ...prev, maxUses: parseInt(e.target.value) || 0 })), min: '0', key: 'input' }),
                  ]),
                  React.createElement('div', { className: 'nc-form-field', key: 'minCartValue' }, [
                    React.createElement('label', { key: 'label' }, 'Min. vrednost korpe'),
                    React.createElement('input', { type: 'number', className: 'nc-field-input', placeholder: '0', value: formData.minCartValue, onChange: e => setFormData(prev => ({ ...prev, minCartValue: parseFloat(e.target.value) || 0 })), min: '0', step: '0.01', key: 'input' }),
                  ]),
                ]),
                React.createElement('div', { className: 'nc-form-row', key: 'row4' }, [
                  React.createElement('div', { className: 'nc-form-field', key: 'maxDiscount' }, [
                    React.createElement('label', { key: 'label' }, 'Maks. popust (za procentualne)'),
                    React.createElement('input', { type: 'number', className: 'nc-field-input', placeholder: '0 (bez limita)', value: formData.maxDiscount, onChange: e => setFormData(prev => ({ ...prev, maxDiscount: parseFloat(e.target.value) || 0 })), min: '0', step: '0.01', key: 'input' }),
                  ]),
                  React.createElement('div', { className: 'nc-form-field', key: 'stackable' }, [
                    React.createElement('label', { className: 'nc-checkbox-label', key: 'label' }, [
                      React.createElement('input', { type: 'checkbox', checked: formData.stackable, onChange: e => setFormData(prev => ({ ...prev, stackable: e.target.checked })), key: 'input' }),
                      React.createElement('span', { key: 'text' }, 'Stackable (može se kombinovati sa drugim promocijama)'),
                    ]),
                  ]),
                ]),
                React.createElement('div', { className: 'nc-form-row', key: 'row5' }, [
                  React.createElement('div', { className: 'nc-form-field', key: 'startsAt' }, [
                    React.createElement('label', { key: 'label' }, 'Početak važenja'),
                    React.createElement('input', { type: 'datetime-local', className: 'nc-field-input', value: formData.startsAt, onChange: e => setFormData(prev => ({ ...prev, startsAt: e.target.value })), key: 'input' }),
                  ]),
                  React.createElement('div', { className: 'nc-form-field', key: 'endsAt' }, [
                    React.createElement('label', { key: 'label' }, 'Kraj važenja'),
                    React.createElement('input', { type: 'datetime-local', className: 'nc-field-input', value: formData.endsAt, onChange: e => setFormData(prev => ({ ...prev, endsAt: e.target.value })), key: 'input' }),
                  ]),
                ]),
                React.createElement('div', { className: 'nc-form-row', key: 'row6' }, [
                  React.createElement('div', { className: 'nc-form-field', key: 'active' }, [
                    React.createElement('label', { className: 'nc-checkbox-label', key: 'label' }, [
                      React.createElement('input', { type: 'checkbox', checked: formData.active, onChange: e => setFormData(prev => ({ ...prev, active: e.target.checked })), key: 'input' }),
                      React.createElement('span', { key: 'text' }, 'Aktivna'),
                    ]),
                  ]),
                  React.createElement('div', { className: 'nc-form-field', key: 'stackable' }, [
                    React.createElement('label', { className: 'nc-checkbox-label', key: 'label' }, [
                      React.createElement('input', { type: 'checkbox', checked: formData.stackable, onChange: e => setFormData(prev => ({ ...prev, stackable: e.target.checked })), key: 'input' }),
                      React.createElement('span', { key: 'text' }, 'Stackable (kombinuje se sa drugim promocijama)'),
                    ]),
                  ]),
                ]),
                React.createElement('div', { className: 'nc-form-field', key: 'conditions' }, [
                  React.createElement('label', { key: 'label' }, 'Uslovi (JSON) - opciono'),
                  React.createElement('textarea', { className: 'nc-field-input', rows: 4, placeholder: '{"categories": ["t-shirts", "hoodies"], "minQty": 2, "customerGroups": ["vip"]}', value: JSON.stringify(formData.conditions, null, 2), onChange: e => { try { setFormData(prev => ({ ...prev, conditions: JSON.parse(e.target.value) })); } catch (e) {} }, key: 'textarea' }),
                  React.createElement('span', { className: 'nc-field-hint', key: 'hint' }, 'JSON objekat sa uslovima: categories, minQty, customerGroups, products, excludedProducts...'),
                ]),
                React.createElement('div', { className: 'nc-form-actions', key: 'actions' }, [
                  React.createElement('button', { type: 'button', className: 'nc-btn nc-btn-secondary', onClick: () => { setShowForm(false); setEditingId(null); }, key: 'cancel' }, 'Otkaži'),
                  React.createElement('button', { type: 'submit', className: 'nc-btn nc-btn-primary', key: 'submit' }, editingId ? '💾 Sačuvaj izmene' : '➕ Dodaj promociju'),
                ])
              ])
            ])
        ])
      ])
    ]);
  }

  function getTypeLabel(type) {
    const labels = {
      percentage: '📊 Procentualni',
      fixed: '💰 Fiksni',
      free_shipping: '🚚 Besplatna dostava',
      bogo: '🎁 BOGO',
      gift: '🎁 Poklon',
    };
    return labels[type] || type;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  }

  function formatPromoValue(p) {
    if (p.type === 'percentage') return `${p.value}%`;
    if (p.type === 'fixed') return formatCurrency(p.value);
    if (p.type === 'free_shipping') return 'Besplatna dostava';
    if (p.type === 'bogo') return 'Kupi 1 dobij 1';
    if (p.type === 'gift') return 'Gratis proizvod';
    return p.value;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return dateStr; }
  }

  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += char; }
    }
    result.push(current);
    return result;
  }

  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function showToast(message, type = 'info') {
    const existing = document.querySelector('.nc-promo-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `nc-promo-toast nc-toast ${type}`;
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
    setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 5000);
  }

  // Register widget
  if (CMS) {
    CMS.registerWidget('promotions-manager', PromotionsManagerWidget);
  }

  window.NC_PromotionsManager = { PromotionsManagerWidget };
})();