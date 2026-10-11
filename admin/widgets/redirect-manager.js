(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  // ============================================
  // REDIRECT MANAGER - Step 9
  // ============================================

  function RedirectManagerWidget(props) {
    const { value, onChange, field, config, forID } = props;

    const [redirects, setRedirects] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showForm, setShowForm] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [formData, setFormData] = React.useState({
      from: '',
      to: '',
      status: 301,
      force: false,
      conditions: {},
    });
    const [errors, setErrors] = React.useState({});
    const [lastDeploy, setLastDeploy] = React.useState(null);

    // Load redirects on mount
    React.useEffect(() => {
      loadRedirects();
    }, []);

    async function loadRedirects() {
      try {
        // Try to load from Netlify Blobs first (if available from scheduled audit)
        const blobs = await fetch('/.netlify/functions/get-redirects').catch(() => null);
        if (blobs?.ok) {
          const data = await blobs.json();
          if (data.redirects) {
            setRedirects(data.redirects);
            setLastDeploy(data.lastDeploy);
            return;
          }
        }
      } catch (e) {
        // fallback to localStorage
      }

      // Fallback to localStorage
      const saved = localStorage.getItem('nc_redirects');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setRedirects(data.redirects || []);
          setLastDeploy(data.lastDeploy || null);
        } catch (e) {
          console.warn('Failed to parse redirects:', e);
        }
      }
    }

    async function saveRedirects(newRedirects) {
      setRedirects(newRedirects);
      const data = { redirects: newRedirects, lastDeploy: lastDeploy };
      localStorage.setItem('nc_redirects', JSON.stringify(data));
      
      // Also try to save via Netlify Function
      try {
        await fetch('/.netlify/functions/save-redirects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirects: newRedirects }),
        });
      } catch (e) {
        console.warn('Could not save to Netlify:', e.message);
      }
    }

    function validateRedirect(from, to, status, allRedirects, excludeId = null) {
      const newErrors = {};

      // Required fields
      if (!from.trim()) newErrors.from = 'From path je obavezan';
      if (!to.trim()) newErrors.to = 'To path je obavezan';

      // Format validation
      if (from && !from.startsWith('/')) newErrors.from = 'From path mora počinjati sa /';
      if (to && !to.startsWith('/') && !to.startsWith('http://') && !to.startsWith('https://')) {
        newErrors.to = 'To path mora počinjati sa / ili http(s)://';
      }

      // Wildcard validation
      if (from.includes('*') && !from.endsWith('/*')) {
        newErrors.from = 'Wildcard (*) mora biti na kraju (npr. /old/*)';
      }

      // Check for duplicates
      const duplicate = allRedirects.find(r => 
        r.from === from.trim() && r.id !== excludeId
      );
      if (duplicate) newErrors.from = 'Već postoji redirect za ovaj From path';

      // Check for redirect loops
      if (from && to) {
        if (from === to) newErrors.to = 'From i To ne mogu biti isti';
        // Check if 'to' redirects back to 'from'
        const reverse = allRedirects.find(r => r.from === to && r.to === from && r.id !== excludeId);
        if (reverse) newErrors.to = 'Ovo bi kreiralo redirect petlju';
      }

      // Check for conflicting patterns
      const conflicts = allRedirects.filter(r => r.id !== excludeId);
      for (const c of conflicts) {
        if (pathsConflict(from, c.from)) {
          newErrors.from = `Konflikt sa postojećim redirectom: ${c.from} → ${c.to}`;
          break;
        }
      }

      return newErrors;
    }

    function pathsConflict(path1, path2) {
      // Check if two paths could match the same URL
      // Simplified: exact match or one is prefix of other with wildcard
      if (path1 === path2) return true;
      if (path1.endsWith('/*') && path2.startsWith(path1.slice(0, -2))) return true;
      if (path2.endsWith('/*') && path1.startsWith(path2.slice(0, -2))) return true;
      return false;
    }

    function handleSubmit(e) {
      e.preventDefault();
      
      const allRedirects = editingId ? redirects.filter(r => r.id !== editingId) : redirects;
      const newErrors = validateRedirect(formData.from, formData.to, formData.status, allRedirects, editingId);
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const newRedirect = {
        id: editingId || Date.now().toString(36),
        from: formData.from.trim(),
        to: formData.to.trim(),
        status: parseInt(formData.status),
        force: formData.force,
        conditions: formData.conditions,
        createdAt: editingId ? redirects.find(r => r.id === editingId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newRedirects = editingId 
        ? redirects.map(r => r.id === editingId ? newRedirect : r)
        : [...redirects, newRedirect];

      saveRedirects(newRedirects);
      setShowForm(false);
      setEditingId(null);
      resetForm();
      showToast(editingId ? '✅ Redirect ažuriran' : '✅ Redirect dodat', 'success');
    }

    function handleEdit(redirect) {
      setEditingId(redirect.id);
      setFormData({
        from: redirect.from,
        to: redirect.to,
        status: redirect.status,
        force: redirect.force || false,
        conditions: redirect.conditions || {},
      });
      setShowForm(true);
      setErrors({});
    }

    function handleDelete(id) {
      if (!window.confirm('Obrišati ovaj redirect?')) return;
      const newRedirects = redirects.filter(r => r.id !== id);
      saveRedirects(newRedirects);
      showToast('🗑️ Redirect obrisan', 'success');
    }

    function resetForm() {
      setFormData({ from: '', to: '', status: 301, force: false, conditions: {} });
      setErrors({});
    }

    function handleDeploy() {
      // Trigger Netlify deploy via build hook
      const deployHook = localStorage.getItem('nc_deploy_hook') || '';
      if (!deployHook) {
        showToast('❌ Deploy hook nije konfigurisan. Postavi DEPLOY_HOOK u localStorage.', 'error');
        return;
      }
      
      fetch(deployHook, { method: 'POST' })
        .then(r => {
          if (r.ok) {
            setLastDeploy(new Date().toISOString());
            localStorage.setItem('nc_last_deploy', new Date().toISOString());
            showToast('🚀 Deploy pokrenut! Proveri Netlify dashboard.', 'success');
          } else {
            showToast('❌ Deploy greška', 'error');
          }
        })
        .catch(() => showToast('❌ Mrežna greška', 'error'));
    }

    function exportRedirects() {
      const csv = [
        ['From', 'To', 'Status', 'Force', 'Created', 'Updated'].join(','),
        ...redirects.map(r => [
          r.from, r.to, r.status, r.force, r.createdAt, r.updatedAt
        ].map(v => `"${v}"`).join(','))
      ].join('\n');
      
      downloadCSV(csv, 'redirects.csv');
      showToast('📥 Exportovan redirects.csv', 'success');
    }

    function importRedirects(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.trim().split('\n');
          if (lines.length < 2) throw new Error('CSV prazan');
          
          const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
          const newRedirects = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 2) {
              newRedirects.push({
                id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
                from: values[0]?.replace(/"/g, ''),
                to: values[1]?.replace(/"/g, ''),
                status: parseInt(values[2]) || 301,
                force: values[3] === 'true',
                conditions: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
          
          if (newRedirects.length > 0) {
            if (window.confirm(`Uvesti ${newRedirects.length} redirectova?`)) {
              saveRedirects([...redirects, ...newRedirects]);
              showToast(`✅ Uvezeno ${newRedirects.length} redirectova`, 'success');
            }
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

    function showToast(message, type = 'info') {
      const existing = document.querySelector('.nc-redirect-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = `nc-redirect-toast nc-toast ${type}`;
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

    function formatDate(iso) {
      if (!iso) return '-';
      return new Date(iso).toLocaleString('sr-RS', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }

    // Render
    return React.createElement('div', { className: 'nc-redirect-manager-widget' }, [
      // Header
      React.createElement('div', { className: 'nc-redirect-header', key: 'header' }, [
        React.createElement('div', { className: 'nc-redirect-title', key: 'title' }, [
          React.createElement('span', { key: 'icon' }, '🔀'),
          React.createElement('h3', { key: 'text' }, 'Redirect Manager'),
        ]),
        React.createElement('div', { className: 'nc-redirect-actions', key: 'actions' }, [
          React.createElement('button', {
            className: 'nc-btn nc-btn-primary',
            onClick: () => { setShowForm(true); setEditingId(null); resetForm(); },
            key: 'add',
          }, '➕ Dodaj redirect'),
          React.createElement('button', {
            className: 'nc-btn nc-btn-secondary',
            onClick: exportRedirects,
            key: 'export',
          }, '📥 Export CSV'),
          React.createElement('input', {
            type: 'file',
            accept: '.csv',
            onChange: importRedirects,
            style: { display: 'none' },
            id: 'redirect-import',
            ref: el => { window.redirectImportRef = el; },
            key: 'import-file',
          }),
          React.createElement('button', {
            className: 'nc-btn nc-btn-secondary',
            onClick: () => window.redirectImportRef?.click(),
            key: 'import',
          }, '📤 Import CSV'),
          React.createElement('button', {
            className: 'nc-btn nc-btn-outline',
            onClick: handleDeploy,
            key: 'deploy',
          }, '🚀 Deploy na Netlify'),
        ]),
      ]),

      // Last deploy info
      lastDeploy && React.createElement('div', { className: 'nc-redirect-meta', key: 'meta' }, [
        React.createElement('span', { key: 'deploy' }, `🕐 Poslednji deploy: ${new Date(lastDeploy).toLocaleString('sr-RS')}`),
      ]),

      // Add/Edit Form
      showForm && React.createElement('div', { className: 'nc-redirect-form-overlay', key: 'form-overlay', onClick: () => { setShowForm(false); setEditingId(null); resetForm(); } }, [
        React.createElement('div', { className: 'nc-redirect-form', key: 'form', onClick: e => e.stopPropagation() }, [
          React.createElement('div', { className: 'nc-form-header', key: 'header' }, [
            React.createElement('h4', { key: 'title' }, editingId ? '✏️ Uredi redirect' : '➕ Novi redirect'),
            React.createElement('button', {
              className: 'nc-form-close',
              onClick: () => { setShowForm(false); setEditingId(null); resetForm(); },
              key: 'close',
            }, '×'),
          ]),
          React.createElement('form', { onSubmit: handleSubmit, key: 'form' }, [
            React.createElement('div', { className: 'nc-form-field', key: 'from' }, [
              React.createElement('label', { key: 'label' }, 'From Path *'),
              React.createElement('input', {
                type: 'text',
                className: `nc-field-input ${errors.from ? 'error' : ''}`,
                placeholder: '/stara-stranica/*',
                value: formData.from,
                onChange: e => setFormData(prev => ({ ...prev, from: e.target.value })),
                required: true,
              }),
              errors.from && React.createElement('span', { className: 'nc-field-error', key: 'err' }, errors.from),
              React.createElement('span', { className: 'nc-field-hint', key: 'hint' }, 'Primer: /stara-stranica/* (wildcard * na kraju)'),
            ]),
            React.createElement('div', { className: 'nc-form-field', key: 'to' }, [
              React.createElement('label', { key: 'label' }, 'To Path *'),
              React.createElement('input', {
                type: 'text',
                className: `nc-field-input ${errors.to ? 'error' : ''}`,
                placeholder: '/nova-stranica/:splat',
                value: formData.to,
                onChange: e => setFormData(prev => ({ ...prev, to: e.target.value })),
                required: true,
              }),
              errors.to && React.createElement('span', { className: 'nc-field-error', key: 'err' }, errors.to),
              React.createElement('span', { className: 'nc-field-hint', key: 'hint' }, 'Primer: /nova-stranica/:splat (zadržava deo posle *)'),
            ]),
            React.createElement('div', { className: 'nc-form-row', key: 'row' }, [
              React.createElement('div', { className: 'nc-form-field', key: 'status' }, [
                React.createElement('label', { key: 'label' }, 'Status Code'),
                React.createElement('select', {
                  className: 'nc-field-input',
                  value: formData.status,
                  onChange: e => setFormData(prev => ({ ...prev, status: parseInt(e.target.value) })),
                }, [
                  React.createElement('option', { value: 301, key: '301' }, '301 - Permanent Redirect'),
                  React.createElement('option', { value: 302, key: '302' }, '302 - Temporary Redirect'),
                  React.createElement('option', { value: 303, key: '303' }, '303 - See Other'),
                  React.createElement('option', { value: 307, key: '307' }, '307 - Temporary Redirect (preserve method)'),
                  React.createElement('option', { value: 308, key: '308' }, '308 - Permanent Redirect (preserve method)'),
                ]),
              ]),
              React.createElement('div', { className: 'nc-form-field', key: 'force' }, [
                React.createElement('label', { className: 'nc-checkbox-label', key: 'label' }, [
                  React.createElement('input', {
                    type: 'checkbox',
                    checked: formData.force,
                    onChange: e => setFormData(prev => ({ ...prev, force: e.target.checked })),
                    key: 'input',
                  }),
                  React.createElement('span', { key: 'text' }, 'Force (ignoriši postojeće fajlove)'),
                ]),
              ]),
            ]),
            React.createElement('div', { className: 'nc-form-actions', key: 'actions' }, [
              React.createElement('button', {
                type: 'button',
                className: 'nc-btn nc-btn-secondary',
                onClick: () => { setShowForm(false); setEditingId(null); resetForm(); },
                key: 'cancel',
              }, 'Otkaži'),
              React.createElement('button', {
                type: 'submit',
                className: 'nc-btn nc-btn-primary',
                key: 'submit',
              }, editingId ? '💾 Sačuvaj izmene' : '➕ Dodaj redirect'),
            ]),
          ]),
        ]),
      ]),

      // Redirects Table
      
      // Redirects Table
      React.createElement('div', { className: 'nc-redirect-table-container', key: 'table' }, [
        redirects.length === 0 ? React.createElement('div', { className: 'nc-redirect-empty', key: 'empty' }, [
          React.createElement('div', { className: 'nc-empty-icon', key: 'icon' }, '🔀'),
          React.createElement('h4', { key: 'title' }, 'Nema redirectova'),
          React.createElement('p', { key: 'desc' }, 'Dodaj prvi redirect klikom na "➕ Dodaj redirect"'),
          React.createElement('button', {
            className: 'nc-btn nc-btn-primary',
            onClick: () => { setShowForm(true); setEditingId(null); resetForm(); },
            key: 'add-first',
          }, '➕ Dodaj prvi redirect'),
        ]) : React.createElement('div', { className: 'nc-redirect-table-wrapper', key: 'wrapper' }, [
          React.createElement('table', { className: 'nc-redirect-table', key: 'table' }, [
            React.createElement('thead', { key: 'head' }, [
              React.createElement('tr', { key: 'row' }, [
                React.createElement('th', { key: 'from' }, 'From'),
                React.createElement('th', { key: 'to' }, 'To'),
                React.createElement('th', { key: 'status' }, 'Status'),
                React.createElement('th', { key: 'force' }, 'Force'),
                React.createElement('th', { key: 'created' }, 'Kreiran'),
                React.createElement('th', { key: 'actions' }, 'Akcije'),
              ]),
            ]),
            React.createElement('tbody', { key: 'body' },
              redirects.map(r => React.createElement('tr', { key: r.id }, [
                React.createElement('td', { key: 'from', className: 'nc-path-cell' }, r.from),
                React.createElement('td', { key: 'to', className: 'nc-path-cell' }, r.to),
                React.createElement('td', { key: 'status' }, [
                  React.createElement('span', { 
                    className: `nc-status-badge nc-status-${r.status}`, 
                    key: 'badge' 
                  }, r.status),
                ]),
                React.createElement('td', { key: 'force' }, 
                  r.force ? React.createElement('span', { className: 'nc-yes', key: 'yes' }, '✅') : '❌'
                ),
                React.createElement('td', { key: 'created' }, new Date(r.createdAt).toLocaleDateString('sr-RS')),
                React.createElement('td', { key: 'actions' }, [
                  React.createElement('button', {
                    className: 'nc-btn nc-btn-sm nc-btn-outline',
                    onClick: () => handleEdit(r),
                    key: 'edit',
                  }, '✏️'),
                  React.createElement('button', {
                    className: 'nc-btn nc-btn-sm nc-btn-danger',
                    onClick: () => handleDelete(r.id),
                    key: 'delete',
                  }, '🗑️'),
                ]),
              ]))
            ),
          ]),
        ])
      ])
    ])
  }


  // Register widget// Register widget
  if (CMS) {
    CMS.registerWidget('redirect-manager', RedirectManagerWidget);
  }

  window.NC_RedirectManager = { RedirectManagerWidget };
})();