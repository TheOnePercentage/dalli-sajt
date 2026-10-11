/**
 * DALLI Admin Components
 * Mobile-first, accessible, SEO-optimized
 * Components: DataTable, FormBuilder, SettingsPanel, SidebarNav, StatsDashboard, ChartWrapper, UserAvatarStack, RoleBadge, PermissionMatrix, ActivityFeed
 */

export class AdminComponents {
  static init() {
    this.initDataTables();
    this.initFormBuilder();
    this.initSettingsPanel();
    this.initSidebarNavigation();
    this.initStatsDashboard();
    this.initChartWrappers();
    this.initUserAvatarStack();
    this.initRoleBadges();
    this.initPermissionMatrix();
    this.initActivityFeed();
  }

  // ============================================================
  // ADMIN DATA TABLE (Inline Edit, Bulk Actions, Export)
  // ============================================================
  static initDataTables() {
    document.querySelectorAll('.admin-data-table').forEach(table => {
      const inlineEdit = table.classList.contains('admin-table--inline-edit');
      const bulkActions = table.classList.contains('admin-table--bulk-actions');
      const exportable = table.classList.contains('admin-table--export');
      const filterable = table.classList.contains('admin-table--filterable');
      const columnToggle = table.classList.contains('admin-table--column-toggle');

      // Inline editing
      if (inlineEdit) {
        this.initInlineEdit(table);
      }

      // Bulk actions
      if (bulkActions) {
        this.initBulkActions(table);
      }

      // Column visibility toggle
      if (columnToggle) {
        this.initColumnToggle(table);
      }

      // Filters
      if (filterable) {
        this.initTableFilters(table);
      }

      // Responsive card view
      this.initResponsiveAdminTable(table);
    });
  }

  static initInlineEdit(table) {
    table.querySelectorAll('td[data-editable]').forEach(cell => {
      const field = cell.dataset.editable;
      const originalValue = cell.textContent.trim();
      let isEditing = false;

      cell.style.cursor = 'pointer';
      cell.setAttribute('tabindex', '0');

      const startEdit = () => {
        if (cell.classList.contains('editing')) return;
        cell.classList.add('editing');
        isEditing = true;

        const input = document.createElement('input');
        input.type = cell.dataset.type || 'text';
        input.value = originalValue;
        input.className = 'admin-inline-edit__input';
        input.dataset.original = originalValue;

        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();

        const save = () => {
          const newValue = input.value.trim();
          if (newValue !== originalValue) {
            cell.textContent = newValue || '—';
            cell.dataset.value = newValue;
            cell.dispatchEvent(new CustomEvent('admin:cell-change', {
              detail: { field, oldValue: originalValue, newValue },
              bubbles: true
            }));
          } else {
            cell.textContent = originalValue || '—';
          }
          cell.classList.remove('editing');
          isEditing = false;
        };

        const cancel = () => {
          cell.textContent = originalValue || '—';
          cell.classList.remove('editing');
          isEditing = false;
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') save();
          else if (e.key === 'Escape') cancel();
          else if (e.key === 'Tab') {
            e.preventDefault();
            const cells = Array.from(table.querySelectorAll('td[data-editable]'));
            const idx = Array.from(table.querySelectorAll('td[data-editable]')).indexOf(cell);
            const next = e.shiftKey ? idx - 1 : idx + 1;
            if (next >= 0 && next < cells.length) cells[next].click();
          }
        });

        input.focus();
        input.select();
      };

      cell.addEventListener('click', startEdit);
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cell.click();
        }
      });
    });
  }

  static async initBulkActions(table) {
    const selectAll = table.querySelector('thead input[type="checkbox"][data-select-all]');
    const rowCheckboxes = table.querySelectorAll('tbody input[type="checkbox"][data-row-select]');
    const bulkActionBar = document.getElementById(table.dataset.bulkActionBar);
    const bulkActions = bulkActionBar?.querySelectorAll('[data-bulk-action]');

    if (selectAll) {
      selectAll.addEventListener('change', (e) => {
        rowCheckboxes.forEach(cb => {
          cb.checked = e.target.checked;
          cb.closest('tr')?.classList.toggle('selected', e.target.checked);
        });
        this.updateBulkActionBar(bulkActionBar, rowCheckboxes);
      });
    }

    rowCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('tr')?.classList.toggle('selected', cb.checked);
        const allChecked = Array.from(table.querySelectorAll('tbody input[type="checkbox"][data-row-select]')).every(cb => cb.checked);
        if (selectAll) selectAll.checked = allChecked;
        this.updateBulkActionBar(bulkActionBar, table.querySelectorAll('tbody input[type="checkbox"][data-row-select]'));
      });
    });

    if (bulkActions) {
      bulkActions.forEach(btn => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.bulkAction;
          const selected = Array.from(table.querySelectorAll('tbody input[type="checkbox"][data-row-select]:checked'))
            .map(cb => cb.value);
          
          if (selected.length === 0) {
            window.showToast?.('Nijedan red nije izabran', 'warning');
            return;
          }

          const confirmed = await window.ModalManager?.confirm({
  title: "Potvrda",
  message: `Da li ste sigurni da želite da ${btn.textContent.toLowerCase()} ${selected.length} redova?`,
  confirmText: "Da",
  cancelText: "Ne",
  variant: "danger"
});
if (!confirmed) {
            return;
          }

          bulkActionBar?.dispatchEvent(new CustomEvent('admin:bulk-action', {
            detail: { action, ids: selected },
            bubbles: true
          }));
        });
      });
    }
  }

  static updateBulkActionBar(bar, checkboxes) {
    if (!bar) return;
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    const countEl = bar.querySelector('[data-selected-count]');
    const actions = bar.querySelectorAll('[data-bulk-action]');
    
    if (countEl) countEl.textContent = checked;
    actions.forEach(btn => {
      btn.disabled = checked === 0;
      btn.style.opacity = checked === 0 ? '0.5' : '1';
    });
  }

  static initColumnToggle(table) {
    const toggleBtn = table.querySelector('[data-column-toggle]');
    const columns = Array.from(table.querySelectorAll('th[data-column]')).map(th => th.dataset.column);
    
    if (!toggleBtn) return;

    const panel = document.createElement('div');
    panel.className = 'admin-column-toggle-panel';
    panel.innerHTML = `
      <h4>Prikaz kolona</h4>
      ${columns.map(col => `
        <label class="admin-column-toggle__item">
          <input type="checkbox" value="${col}" checked>
          <span>${col}</span>
        </label>
      `).join('')}
    `;
    panel.style.display = 'none';

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== toggleBtn) {
        panel.style.display = 'none';
      }
    });

    panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const col = cb.value;
        table.querySelectorAll(`[data-column="${col}"]`).forEach(cell => {
          cell.style.display = cb.checked ? '' : 'none';
        });
      });
    });

    toggleBtn.parentNode.appendChild(panel);
  }

  static initTableFilters(table) {
    const filters = table.querySelectorAll('[data-filter]');
    const rows = table.querySelectorAll('tbody tr');

    filters.forEach(filter => {
      const field = filter.dataset.filter;
      let debounce;

      filter.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const query = e.target.value.toLowerCase();
          table.querySelectorAll('tbody tr').forEach(row => {
            const cell = row.querySelector(`[data-col="${field}"]`);
            const text = cell?.textContent.toLowerCase() || '';
            row.style.display = text.includes(query) ? '' : 'none';
          });
        }, 150);
      });
    });
  }

  static initResponsiveAdminTable(table) {
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      cells.forEach((cell, i) => {
        cell.setAttribute('data-label', headers[i]);
      });
    });
    table.classList.add('admin-data-table--responsive');
  }

  // ============================================================
  // FORM BUILDER (Dynamic Admin Forms)
  // ============================================================
  static initFormBuilder() {
    document.querySelectorAll('.admin-form-builder').forEach(builder => {
      const fieldsContainer = builder.querySelector('[data-form-fields]');
      const addFieldBtn = builder.querySelector('[data-add-field]');
      const jsonOutput = builder.querySelector('[data-json-output]');

      const fieldTypes = [
        { value: 'text', label: 'Tekst', icon: '📝' },
        { value: 'textarea', label: 'Višelinijski tekst', icon: '📄' },
        { value: 'select', label: 'Padajuća lista', icon: '📋' },
        { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
        { value: 'radio', label: 'Radio grupe', icon: '🔘' },
        { value: 'switch', label: 'Preklopnik', icon: '🔄' },
        { value: 'number', label: 'Broj', icon: '🔢' },
        { value: 'email', label: 'Email', icon: '📧' },
        { value: 'date', label: 'Datum', icon: '📅' },
        { value: 'file', label: 'Fajl', icon: '📎' },
        { value: 'image', label: 'Slika', icon: '🖼️' },
        { value: 'richtext', label: 'Rich Text', icon: '✏️' }
      ];

      const renderField = (field, index) => {
        const div = document.createElement('div');
        div.className = 'form-builder__field';
        div.dataset.index = index;
        div.innerHTML = `
          <div class="form-builder__field-header">
            <span class="form-builder__field-type">${fieldTypes.find(t => t.value === field.type)?.icon || '📝'} ${fieldTypes.find(t => t.value === field.type)?.label || field.type}</span>
            <div class="form-builder__field-actions">
              <button type="button" class="btn btn--ghost btn--sm" data-action="duplicate" aria-label="Dupliraj"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
              <button type="button" class="btn btn--ghost btn--sm" data-action="delete" aria-label="Obriši"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
          </div>
          <div class="form-builder__field-body">
            <div class="form-builder__row">
              <div class="form-group">
                <label>Tip polja</label>
                <select class="form-builder__type" data-field-type>
                  ${fieldTypes.map(t => `<option value="${t.value}" ${t.value === field.type ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Ime (name)</label>
                <input type="text" class="form-builder__name" value="${field.name || ''}" placeholder="npr. product_name" required>
              </div>
            </div>
            <div class="form-builder__row">
              <div class="form-group">
                <label>Labela</label>
                <input type="text" class="form-builder__label" value="${field.label || ''}" placeholder="Naziv polja za korisnika">
              </div>
              <div class="form-group">
                <label>Placeholder</label>
                <input type="text" class="form-builder__placeholder" value="${field.placeholder || ''}" placeholder="Unesite...">
              </div>
            </div>
            <div class="form-builder__row">
              <div class="form-group">
                <label>Obavezno</label>
                <label class="switch-label">
                  <input type="checkbox" class="form-builder__required" ${field.required ? 'checked' : ''}>
                  <span class="switch-track"><span class="switch-thumb"></span></span>
                </label>
              </div>
              <div class="form-group">
                <label>Podrazumevana vrednost</label>
                <input type="text" class="form-builder__default" value="${field.defaultValue || ''}">
              </div>
            </div>
            ${field.type === 'select' || field.type === 'radio' ? `
              <div class="form-builder__options">
                <label>Opcije (po jednu po liniji: vrednost|label)</label>
                <textarea class="form-builder__options-text" rows="4" placeholder="value1|Opcija 1&#10;value2|Opcija 2">${field.options?.map(o => `${o.value}|${o.label}`).join('\n') || ''}</textarea>
              </div>
            ` : ''}
            ${field.type === 'number' ? `
              <div class="form-builder__row">
                <div class="form-group">
                  <label>Min</label>
                  <input type="number" class="form-builder__min" value="${field.min || ''}">
                </div>
                <div class="form-group">
                  <label>Max</label>
                  <input type="number" class="form-builder__max" value="${field.max || ''}">
                </div>
                <div class="form-group">
                  <label>Step</label>
                  <input type="number" class="form-builder__step" value="${field.step || '1'}" step="any">
                </div>
              </div>
            ` : ''}
            <div class="form-builder__validation">
              <label>Validacija (regex)</label>
              <input type="text" class="form-builder__pattern" value="${field.pattern || ''}" placeholder="npr. ^[a-zA-Z0-9_]+$">
              <small>JavaScript regex pattern</small>
            </div>
            ${field.validationMessage ? `<div class="form-builder__validation"><label>Poruka greške</label><input type="text" class="form-builder__validation-message" value="${field.validationMessage || ''}" placeholder="Poruka za korisnika"></div>` : ''}
          </div>
        `;

        // Event listeners
        div.querySelector('[data-action="delete"]').addEventListener('click', () => {
          div.remove();
          this.updateFieldIndices(builder);
        });

        div.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
          const clone = div.cloneNode(true);
          const newIndex = parseInt(div.dataset.index, 10) + 1;
          clone.dataset.index = builder.querySelectorAll('.form-builder__field').length;
          div.after(clone);
          this.updateFieldIndices(builder);
        });

        div.querySelector('.form-builder__type').addEventListener('change', (e) => {
          this.updateFieldOptions(div, e.target.value);
        });

        // Live JSON output
        const inputs = div.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          input.addEventListener('input', () => this.updateFormBuilderJSON(builder));
        });
      };

      // Initialize existing fields
      const fields = builder.dataset.fields ? JSON.parse(builder.dataset.fields) : [];
      fields.forEach((field, i) => {
        const fieldEl = renderField(field, i);
        fieldsContainer.appendChild(fieldEl);
      });

      if (addFieldBtn) {
        addFieldBtn.addEventListener('click', () => {
          const newField = { type: 'text', name: `field_${Date.now()}`, label: '', required: false };
          const fieldEl = renderField(newField, fieldsContainer.children.length);
          fieldsContainer.appendChild(fieldEl);
        });
      }

      // Initial JSON output
      this.updateFormBuilderJSON(builder);
    });
  }

  static updateFieldOptions(fieldEl, type) {
    const optionsContainer = fieldEl.querySelector('.form-builder__options');
    const validation = fieldEl.querySelector('.form-builder__validation');
    const numberFields = fieldEl.querySelectorAll('.form-builder__min, .form-builder__max, .form-builder__step').forEach(el => el.closest('.form-group'));
    
    const showOptions = ['select', 'radio'].includes(el);
    const showNumber = type === 'number';

    if (optionsContainer) optionsContainer.style.display = showOptions ? 'block' : 'none';
    numberFields.forEach(el => el.style.display = showNumber ? 'block' : 'none');
  }

  static updateFieldIndices(builder) {
    builder.querySelectorAll('.form-builder__field').forEach((field, i) => {
      field.dataset.index = i;
    });
    this.updateFormBuilderJSON(builder);
  }

  static updateFormBuilderJSON(builder) {
    const jsonOutput = builder.querySelector('[data-json-output]');
    if (!jsonOutput) return;

    const fields = [];
    builder.querySelectorAll('.form-builder__field').forEach(field => {
      const type = field.querySelector('.form-builder__type').value;
      const name = field.querySelector('.form-builder__name').value;
      const label = field.querySelector('.form-builder__label').value;
      const placeholder = field.querySelector('.form-builder__placeholder').value;
      const required = field.querySelector('.form-builder__required').checked;
      const defaultValue = field.querySelector('.form-builder__default').value;
      const pattern = field.querySelector('.form-builder__pattern').value;
      const validationMessage = field.querySelector('.form-builder__validation-message')?.value;
      const min = field.querySelector('.form-builder__min')?.value;
      const max = field.querySelector('.form-builder__max')?.value;
      const step = field.querySelector('.form-builder__step')?.value;

      const fieldData = { type, name, label, placeholder, required, defaultValue: defaultValue || undefined, pattern: pattern || undefined, validationMessage: validationMessage || undefined };

      if (['select', 'radio'].includes(field.querySelector('.form-builder__type').value)) {
        const optionsText = field.querySelector('.form-builder__options-text').value;
        const options = optionsText.split('\n').filter(l => l.trim()).map(l => {
          const [value, label] = l.split('|');
          return { value: value.trim(), label: label.trim() || value.trim() };
        });
        fieldData.options = options;
      }

      if (['number'].includes(field.querySelector('.form-builder__type').value)) {
        fieldData.min = min || undefined;
        fieldData.max = max || undefined;
        fieldData.step = step || undefined;
      }

      if (validationMessage) fieldData.validationMessage = validationMessage;

      fields.push(fieldData);
    });

    jsonOutput.value = JSON.stringify({ fields }, null, 2);
  }

  // ============================================================
  // SETTINGS PANEL (Tabs, Sections, Live Preview)
  // ============================================================
  static initSettingsPanel() {
    document.querySelectorAll('.admin-settings-panel').forEach(panel => {
      const tabs = panel.querySelectorAll('[data-settings-tab]');
      const sections = panel.querySelectorAll('[data-settings-section]');
      const saveBtn = panel.querySelector('[data-settings-save]');
      const resetBtn = panel.querySelector('[data-settings-reset]');
      const previewFrame = panel.querySelector('[data-settings-preview]');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          
          const sectionId = tab.dataset.settingsTab;
          sections.forEach(s => s.classList.toggle('active', s.dataset.settingsSection === sectionId));
        });
      });

      // Auto-save
      const inputs = panel.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('change', () => this.saveSettings(panel));
      });

      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveSettings(panel));
      }

      if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
          const confirmed = await window.ModalManager?.confirm({
  title: "Potvrda",
  message: "Da li ste sigurni da želite da vratite podrazumevane postavke?",
  confirmText: "Da",
  cancelText: "Ne",
  variant: "warning"
});
if (!confirmed) {
            this.resetSettings(panel);
          }
        });
      }

      // Live preview
      const previewInputs = panel.querySelectorAll('[data-preview]');
      previewInputs.forEach(input => {
        input.addEventListener('input', () => this.updatePreview(previewFrame));
      });
    });
  }

  static saveSettings(panel) {
    const data = {};
    panel.querySelectorAll('input, select, textarea').forEach(input => {
      if (input.name) {
        data[input.name] = input.type === 'checkbox' ? input.checked : input.value;
      }
    });
    localStorage.setItem(`admin_settings_${panel.dataset.settingsId}`, JSON.stringify(data));
    window.showToast?.('Postavke sačuvane', 'success');
  }

  static resetSettings(panel) {
    const defaults = panel.dataset.defaults ? JSON.parse(panel.dataset.defaults) : {};
    Object.entries(defaults).forEach(([key, value]) => {
      const input = panel.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') input.checked = value;
        else input.value = value;
      }
    });
    localStorage.removeItem(`admin_settings_${panel.dataset.settingsId}`);
    window.showToast?.('Postavke vraćene na podrazumevane', 'info');
  }

  static updatePreview(frame) {
    if (!frame) return;
    // Send message to preview iframe
    frame.contentWindow?.postMessage({ type: 'admin:preview:update', data: this.getSettingsData(frame) }, '*');
  }

  // ============================================================
  // SIDEBAR NAVIGATION (Collapsible, Badges, Permissions)
  // ============================================================
  static initSidebarNavigation() {
    document.querySelectorAll('.admin-sidebar').forEach(sidebar => {
      const toggleBtn = document.querySelector('[data-sidebar-toggle]');
      const closeBtn = sidebar.querySelector('.admin-sidebar__close');
      const items = sidebar.querySelectorAll('.admin-sidebar__item');

      const open = () => {
        document.body.classList.add('admin-sidebar--open');
        document.body.style.overflow = 'hidden';
      };

      const close = () => {
        document.body.classList.remove('admin-sidebar--open');
        document.body.style.overflow = '';
      };

      if (toggleBtn) toggleBtn.addEventListener('click', () => document.body.classList.toggle('admin-sidebar--open'));
      if (closeBtn) closeBtn.addEventListener('click', close);

      // Submenu
      sidebar.querySelectorAll('.admin-sidebar__item[aria-haspopup="true"]').forEach(item => {
        const toggle = item.querySelector('.admin-sidebar__toggle');
        const submenu = item.querySelector('.admin-sidebar__submenu');
        
        if (toggle && submenu) {
          toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            item.classList.toggle('open');
            toggle.setAttribute('aria-expanded', item.classList.contains('open'));
          });
        }
      });

      // Badge updates
      sidebar.querySelectorAll('[data-badge]').forEach(el => {
        const count = el.dataset.badge;
        if (count > 0) {
          el.classList.add('has-badge');
          el.setAttribute('data-badge-count', count);
        }
      });

      // Permissions - hide unauthorized items
      const userPermissions = JSON.parse(localStorage.getItem('dalli_admin_permissions') || '[]');
      sidebar.querySelectorAll('[data-permission]').forEach(el => {
        const perm = el.dataset.permission;
        if (!userPermissions.includes(perm) && !userPermissions.includes('admin:all')) {
          el.style.display = 'none';
        }
      });
    });
  }

  // ============================================================
  // STATS DASHBOARD (Real-time, Widgets, Date Range)
  // ============================================================
  static initStatsDashboard() {
    document.querySelectorAll('.admin-stats-dashboard').forEach(dashboard => {
      const dateRange = dashboard.querySelector('[data-date-range]');
      const refreshBtn = dashboard.querySelector('[data-dashboard-refresh]');
      const widgets = dashboard.querySelectorAll('.admin-stat-widget');
      const realtime = dashboard.dataset.realtime === 'true';

      // Date range
      if (dateRange) {
        dateRange.addEventListener('change', () => this.refreshDashboard(dashboard));
      }

      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => this.refreshDashboard(dashboard));
      }

      // Widget refresh
      widgets.forEach(widget => {
        const refreshBtn = widget.querySelector('[data-widget-refresh]');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', () => this.refreshWidget(widget));
        }
      });

      // Real-time updates
      if (realtime) {
        this.startRealtimeUpdates(dashboard);
      }

      // Initial load
      this.refreshDashboard(dashboard);
    });
  }

  static refreshDashboard(dashboard) {
    const widgets = dashboard.querySelectorAll('.admin-stat-widget');
    widgets.forEach(widget => this.refreshWidget(widget));
  }

  static refreshWidget(widget) {
    const url = widget.dataset.url;
    const loader = widget.querySelector('.admin-widget__loader');
    const content = widget.querySelector('.admin-widget__content');

    if (!url) return;

    if (loader) loader.style.display = 'flex';
    if (content) content.style.opacity = '0.5';

    fetch(widget.dataset.url)
      .then(res => res.json())
      .then(data => {
        if (widget.querySelector('[data-stat-value]')) {
          widget.querySelector('[data-stat-value]').textContent = this.formatStatValue(data.value);
        }
        if (widget.querySelector('[data-stat-change]')) {
          const changeEl = widget.querySelector('[data-stat-change]');
          changeEl.textContent = `${data.change >= 0 ? '+' : ''}${data.change}%`;
          changeEl.className = `admin-stat__change admin-stat__change--${data.change >= 0 ? 'positive' : 'negative'}`;
        }
        if (widget.querySelector('[data-stat-trend]')) {
          widget.querySelector('[data-stat-trend]').textContent = data.trend || '';
        }
      })
      .catch(() => {
        window.showToast?.('Greška pri učitavanju widgeta', 'error');
      })
      .finally(() => {
        const loader = widget.querySelector('.admin-widget__loader');
        const content = widget.querySelector('.admin-widget__content');
        if (loader) loader.style.display = 'none';
        if (content) content.style.opacity = '1';
      });
  }

  static startRealtimeUpdates(dashboard) {
    const interval = parseInt(dashboard.dataset.refreshInterval || '30000', 10);
    const intervalId = setInterval(() => this.refreshDashboard(dashboard), interval);
    dashboard.dataset.refreshIntervalId = intervalId;
  }

  static formatStatValue(value) {
    if (typeof value === 'number') {
      if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
      if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
      return value.toLocaleString('sr-RS');
    }
    return value;
  }

  // ============================================================
  // CHART WRAPPERS (Chart.js, ApexCharts, Recharts integration)
  // ============================================================
  static initChartWrappers() {
    document.querySelectorAll('.admin-chart-wrapper').forEach(wrapper => {
      const type = wrapper.dataset.chartType || 'line';
      const dataUrl = wrapper.dataset.url;
      const options = wrapper.dataset.options ? JSON.parse(wrapper.dataset.options) : {};

      if (dataUrl) {
        this.loadChartData(wrapper, dataUrl, type, options);
      } else {
        this.renderChart(wrapper, JSON.parse(wrapper.dataset.data || '{}'), type, options);
      }

      // Responsive resize
      window.addEventListener('resize', () => {
        if (wrapper.chart) wrapper.chart.resize();
      });
    });
  }

  static loadChartData(wrapper, url, type, options) {
    fetch(dataUrl)
      .then(res => res.json())
      .then(data => this.renderChart(wrapper, data, type, options))
      .catch(() => {
        wrapper.innerHTML = '<div class="admin-chart__error">Greška pri učitavanju grafikona</div>';
      });
    }

    static renderChart(wrapper, data, type, options) {
    const ctx = wrapper.querySelector('canvas');
    if (!ctx) return;

    // Try Chart.js first
    if (window.Chart) {
      const chartOptions = {
        type: type,
        data: data,
        options: Object.assign({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: 'var(--color-text-secondary)' } },
            tooltip: { backgroundColor: 'var(--color-surface)', titleColor: 'var(--color-text)', bodyColor: 'var(--color-text)', borderColor: 'var(--color-border)', borderWidth: 1 }
          },
          scales: {
            x: { grid: { color: 'var(--color-border)' }, ticks: { color: 'var(--color-text-secondary)' } },
            y: { grid: { color: 'var(--color-border)' }, ticks: { color: 'var(--color-text-secondary)' } }
          }
        }, options || {}) };

      wrapper.chart = new Chart(ctx, chartOptions);
      return;
    }

    // Fallback: simple canvas drawing
    this.drawSimpleChart(ctx, data, type);
  }

static drawSimpleChart(ctx, data, type) {
    // Minimal fallback - just show data points
    const canvas = ctx.canvas;
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    const padding = 40;
    const maxVal = Math.max(...data.labels.map((_, i) => data.datasets[0].data[i]));
    const minVal = 0;

    if (type === 'line') {
      ctx.strokeStyle = 'var(--color-primary)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.labels.forEach((label, i) => {
        const x = 40 + (i / (data.labels.length - 1)) * (canvas.width - 80);
        const y = canvas.height - 40 - (data.datasets[0].data[i] / data.datasets[0].data.reduce((a, b) => Math.max(a, b)) * (canvas.height - 80));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  }

  // ============================================================
  // USER AVATAR STACK (Grouped, Hover Expand)
  // ============================================================
  static initUserAvatarStack() {
    document.querySelectorAll('.admin-avatar-stack').forEach(stack => {
      const maxVisible = parseInt(stack.dataset.maxVisible || '5', 10);
      const avatars = stack.querySelectorAll('.admin-avatar');
      const moreCount = avatars.length - maxVisible;

      if (avatars.length <= maxVisible) return;

      avatars.forEach((avatar, i) => {
        if (i >= maxVisible) {
          avatar.style.display = 'none';
        }
        avatar.style.zIndex = avatars.length - i;
        avatar.style.marginLeft = i > 0 ? '-12px' : '0';
      });

      // Add "+N" badge
      const moreBadge = document.createElement('div');
      moreBadge.className = 'admin-avatar-stack__more';
      moreBadge.textContent = `+${avatars.length - maxVisible}`;
      moreBadge.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: var(--color-bg-subtle); color: var(--color-text-secondary);
        display: flex; align-items: center; justify-content: center;
        font-size: var(--fs-xs); font-weight: var(--fw-semibold);
        margin-left: -12px; border: 2px solid var(--color-bg-elevated);
        z-index: 1;
      `;
      stack.appendChild(moreBadge);

      // Hover expand
      const stackEl = stack;
      stackEl.addEventListener('mouseenter', () => {
        stack.querySelectorAll('.admin-avatar').forEach((a, i) => {
          a.style.display = 'block';
          a.style.transform = `translateX(${i * 8}px)`;
          a.style.zIndex = avatars.length - i;
        });
      });
      stackEl.addEventListener('mouseleave', () => {
        avatars.forEach((avatar, i) => {
          if (i >= 5) avatar.style.display = 'none';
          avatar.style.transform = '';
        });
      });
    });
  }

  // ============================================================
  // ROLE BADGES (Permissions, Colors, Tooltips)
  // ============================================================
  static initRoleBadges() {
    document.querySelectorAll('.admin-role-badge').forEach(badge => {
      const role = badge.dataset.role;
      const permissions = JSON.parse(badge.dataset.permissions || '[]');

      // Tooltip with permissions
      if (permissions.length) {
        badge.setAttribute('title', permissions.join(', '));
        badge.setAttribute('data-tooltip', permissions.join(', '));
      }

      // Color coding
      const roleColors = {
        'absolute_admin': 'admin-role--absolute',
        'admin': 'admin-role--admin',
        'editor': 'admin-role--editor',
        'accountant': 'admin-role--accountant',
        'employee': 'admin-role--employee',
        'read_only': 'admin-role--readonly'
      };
      
      badge.classList.add(roleColors[badge.dataset.role] || 'admin-role--default');
    });
  }

  // ============================================================
  // PERMISSION MATRIX (Grid, Checkboxes, Bulk Edit)
  // ============================================================
  static initPermissionMatrix() {
    document.querySelectorAll('.admin-permission-matrix').forEach(matrix => {
      const roles = Array.from(matrix.querySelectorAll('[data-role]')).map(el => el.dataset.role);
      const permissions = Array.from(matrix.querySelectorAll('[data-permission]')).map(el => el.dataset.permission);

      // Header checkboxes
      matrix.querySelectorAll('th input[type="checkbox"]').forEach(headerCb => {
        const perm = headerCb.dataset.permission;
        headerCb.addEventListener('change', () => {
          matrix.querySelectorAll(`td input[data-permission="${headerCb.dataset.permission}"]`).forEach(cb => {
            cb.checked = headerCb.checked;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      });

      // Role checkboxes (row)
      matrix.querySelectorAll('tr th input[type="checkbox"]').forEach(rowCb => {
        const role = rowCb.closest('tr').dataset.role;
        rowCb.addEventListener('change', () => {
          matrix.querySelectorAll(`tr[data-role="${role}"] td input[type="checkbox"]`).forEach(cb => {
            cb.checked = rowCb.checked;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      });

      // Cell checkboxes
      matrix.querySelectorAll('td input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const role = cb.closest('tr').dataset.role;
          const perm = cb.dataset.permission;
          const checked = cb.checked;

          // Update header/row checkboxes
          const roleRow = matrix.querySelector(`tr[data-role="${role}"] th input`);
          const permCol = matrix.querySelector(`th input[data-permission="${cb.dataset.permission}"]`);
          
          const roleChecked = Array.from(matrix.querySelectorAll(`tr[data-role="${role}"] td input`)).every(cb => cb.checked);
          const permChecked = Array.from(matrix.querySelectorAll(`td input[data-permission="${cb.dataset.permission}"]`)).every(cb => cb.checked);
          
          if (roleRow) roleRow.checked = roleChecked;
          if (permCol) permCol.checked = permChecked;

          // Save to server
          this.savePermission(role, cb.dataset.permission, checked);
        });
      });
    });
  }

  static savePermission(role, permission, granted) {
    // Send to API
    fetch('/api/admin/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, permission, granted })
    }).catch(() => window.showToast?.('Greška pri čuvanju dozvole', 'error'));
  }

  // ============================================================
  // ACTIVITY FEED (Real-time, Filters, Infinite Scroll)
  // ============================================================
  static initActivityFeed() {
    document.querySelectorAll('.admin-activity-feed').forEach(feed => {
      const filter = feed.querySelector('[data-activity-filter]');
      const loadMore = feed.querySelector('[data-activity-load-more]');
      const list = feed.querySelector('[data-activity-list]');
      const realtime = feed.dataset.realtime === 'true';
      let page = 1;
      let loading = false;

      const loadActivities = async (append = false) => {
        if (loading) return;
        loading = true;

        const params = new URLSearchParams();
        if (feed.dataset.filter) params.set('filter', feed.dataset.filter);
        params.set('page', page);
        params.set('limit', 20);

        try {
          const res = await fetch(`${feed.dataset.url}?${params}`);
          const data = await res.json();

          if (!append) {
            feed.querySelector('[data-activity-list]').innerHTML = '';
            page = 1;
          }

          data.activities.forEach(activity => {
            feed.querySelector('[data-activity-list]').appendChild(this.createActivityElement(activity));
          });

          page++;
          loading = false;

          if (data.hasMore === false && loadMore) {
            loadMore.style.display = 'none';
          }
        } catch (e) {
          window.showToast?.('Greška pri učitavanju aktivnosti', 'error');
        }
      };

      // Initial load
      this.loadActivities();

      // Load more
      if (loadMore) {
        loadMore.addEventListener('click', () => this.loadActivities(true));
      }

      // Filter
      if (filter) {
        filter.addEventListener('change', () => {
          feed.dataset.filter = filter.value;
          this.loadActivities(false);
        });
      }

      // Real-time
      if (feed.dataset.realtime === 'true') {
        setInterval(() => this.loadActivities(false), 30000);
      }
    });
  }

  static createActivityElement(activity) {
    const div = document.createElement('div');
    div.className = 'admin-activity__item';
    div.innerHTML = `
      <div class="admin-activity__icon" style="background: ${activity.color || 'var(--color-primary)'}">
        ${activity.icon || '📝'}
      </div>
      <div class="admin-activity__content">
        <div class="admin-activity__header">
          <strong>${activity.user}</strong>
          <time datetime="${activity.timestamp}">${this.formatRelativeTime(activity.timestamp)}</time>
        </div>
        <p class="admin-activity__message">${activity.message}</p>
        ${activity.metadata ? `<div class="admin-activity__meta">${JSON.stringify(activity.metadata)}</div>` : ''}
      </div>
    `;
    return div;
  }

  static formatRelativeTime(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Upravo sada';
    if (minutes < 60) return `pre ${minutes} min`;
    if (hours < 24) return `pre ${hours} h`;
    return `pre ${days} dana`;
  }
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdminComponents.init());
} else {
  AdminComponents.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdminComponents };
}

if (typeof window !== 'undefined') {
  window.AdminComponents = AdminComponents;
}