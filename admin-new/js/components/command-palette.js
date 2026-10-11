import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class CommandPalette extends Component {
  constructor(options = {}) {
    super(options);
    this.admin = options.admin;
    this.open = false;
    this.selectedIndex = 0;
    this.commands = [];
    this.filteredCommands = [];
    this.query = '';
    this.buildCommands();
  }

  buildCommands() {
    const nav = this.admin.sidebar?.items || [];
    const sections = nav.flatMap(group => group.items).filter(i => i.section);
    
    this.commands = [
      ...sections.map(s => ({
        id: `nav:${s.section}`,
        title: s.label,
        description: `Otvorite ${s.label}`,
        category: 'Navigacija',
        icon: s.icon,
        action: () => this.admin.navigateTo(s.section),
        keywords: [s.label.toLowerCase(), s.section]
      })),
      {
        id: 'action:new-product',
        title: 'Novi proizvod',
        description: 'Kreirajte novi proizvod u katalogu',
        category: 'Akcije',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        action: () => this.admin.openCreateProductModal(),
        keywords: ['novi', 'proizvod', 'dodaj', 'kreiraj', 'product', 'create']
      },
      {
        id: 'action:new-order',
        title: 'Nova porudžbina',
        description: 'Kreirajte ručnu porudžbinu',
        category: 'Akcije',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5v5M16 19h6M8 19H2M21 19V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v5"/><circle cx="9" cy="19" r="1"/><circle cx="19" cy="19" r="1"/></svg>',
        action: () => this.admin.navigateTo('orders'),
        keywords: ['nova', 'porudzbina', 'order', 'create']
      },
      {
        id: 'action:export-orders',
        title: 'Izvezi porudžbine (CSV)',
        description: 'Preuzmite CSV sa svim porudžbinama',
        category: 'Akcije',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        action: () => this.exportOrders(),
        keywords: ['izvezi', 'export', 'csv', 'porudzbine', 'orders']
      },
      {
        id: 'action:export-products',
        title: 'Izvezi proizvode (CSV)',
        description: 'Preuzmite CSV sa svim proizvodima',
        category: 'Akcije',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        action: () => this.exportProducts(),
        keywords: ['izvezi', 'export', 'csv', 'proizvodi', 'products']
      },
      {
        id: 'action:toggle-theme',
        title: 'Preklopi temu',
        description: 'Promenite svetlu/tamnu/auto temu',
        category: 'Podešavanja',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
        action: () => ThemeManager.cycleTheme(),
        keywords: ['tema', 'theme', 'dark', 'light', 'mrak', 'svetlo']
      },
      {
        id: 'action:toggle-sidebar',
        title: 'Sažmi/Proširi meni',
        description: 'Preklopite stanje bočnog menija',
        category: 'Podešavanja',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>',
        action: () => this.admin.toggleSidebar(!this.admin.store.getState().sidebarCollapsed),
        keywords: ['meni', 'sidebar', 'sazmi', 'proširi', 'collapse', 'expand']
      },
      {
        id: 'action:clear-toasts',
        title: 'Očisti obaveštenja',
        description: 'Uklonite sve toast poruke',
        category: 'Akcije',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        action: () => this.admin.toastContainer?.clear(),
        keywords: ['očisti', 'clear', 'toast', 'obaveštenja', 'notifications']
      },
      {
        id: 'action:shortcuts',
        title: 'Prikaži prečice',
        description: 'Prikaži listu svih tastaturskih prečica',
        category: 'Pomoć',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        action: () => this.showShortcuts(),
        keywords: ['prečice', 'shortcuts', 'keyboard', 'tastatura', 'help', 'pomoc']
      },
      {
        id: 'action:logout',
        title: 'Odjavi se',
        description: 'Izlogujte se iz admin panela',
        category: 'Račun',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
        action: () => this.admin.handleLogout(),
        keywords: ['odjavi', 'logout', 'sign out', 'izloguj']
      }
    ];
  }

  render() {
    return `
      <div class="command-palette ${this.open ? 'open' : ''}" id="commandPalette" role="dialog" aria-modal="true" aria-label="Command Palette" style="display: ${this.open ? 'flex' : 'none'};">
        <div class="command-palette-overlay" data-action="close"></div>
        <div class="command-palette-window">
          <div class="command-palette-header">
            <div class="command-palette-search-wrapper">
              <svg class="command-palette-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input 
                type="text" 
                class="command-palette-search" 
                placeholder="Pretraži komande... (⌘K)" 
                value="${ImperiumUtils.escapeHtml(this.query)}"
                data-ref="searchInput"
                autocomplete="off"
                spellcheck="false"
              >
              <kbd class="command-palette-shortcut">⌘K</kbd>
            </div>
            <div class="command-palette-hint">ESC zatvara</div>
          </div>
          <div class="command-palette-content" data-ref="content">
            ${this.renderResults()}
          </div>
          <div class="command-palette-footer">
            <span class="command-palette-count">${this.filteredCommands.length} komandi</span>
            <span class="command-palette-nav">↑↓ navigacija • Enter izvršava</span>
          </div>
        </div>
      </div>
    `;
  }

  renderResults() {
    if (this.filteredCommands.length === 0) {
      return `
        <div class="command-palette-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <p>Nema komandi za "${ImperiumUtils.escapeHtml(this.query)}"</p>
        </div>
      `;
    }

    const grouped = this.groupByCategory(this.filteredCommands);
    
    return Object.entries(grouped).map(([category, cmds]) => `
      <div class="command-palette-group">
        <div class="command-palette-category">${category}</div>
        ${cmds.map((cmd, i) => `
          <button 
            class="command-palette-item ${i === this.selectedIndex ? 'selected' : ''}" 
            data-command-id="${cmd.id}"
            data-index="${this.commands.indexOf(cmd)}"
            role="option"
            aria-selected="${i === this.selectedIndex}"
          >
            <span class="command-palette-item-icon" aria-hidden="true">${cmd.icon || ''}</span>
            <div class="command-palette-item-main">
              <span class="command-palette-item-title">${ImperiumUtils.escapeHtml(cmd.title)}</span>
              <span class="command-palette-item-description">${ImperiumUtils.escapeHtml(cmd.description)}</span>
            </div>
            <span class="command-palette-item-category">${category}</span>
          </button>
        `).join('')}
      </div>
    `).join('');
  }

  groupByCategory(commands) {
    return commands.reduce((acc, cmd) => {
      const cat = cmd.category || 'Ostalo';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cmd);
      return acc;
    }, {});
  }

  onMount() {
    this.bindEvents();
  }

  bindEvents() {
    this.on('input', '.command-palette-search', (e) => {
      this.query = e.target.value;
      this.filterCommands();
      this.selectedIndex = 0;
      this.render();
    });

    this.on('keydown', '.command-palette-search', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.selectNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.selectPrev();
          break;
        case 'Enter':
          e.preventDefault();
          this.executeSelected();
          break;
        case 'Escape':
          this.close();
          break;
      }
    });

    this.on('click', '.command-palette-item', (e) => {
      const id = e.delegateTarget.dataset.commandId;
      this.executeCommand(id);
    });

    this.on('click', '.command-palette-overlay', () => this.close());

    this.on('keydown', (e) => {
      if (!this.open) return;
      if (e.key === 'Escape') this.close();
    });
  }

  filterCommands() {
    if (!this.query.trim()) {
      this.filteredCommands = [...this.commands];
      return;
    }

    const query = this.query.toLowerCase();
    this.filteredCommands = this.commands.filter(cmd => 
      cmd.title.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query) ||
      cmd.category.toLowerCase().includes(query) ||
      (cmd.keywords || []).some(k => k.toLowerCase().includes(query))
    );
  }

  selectNext() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
    this.updateSelection();
  }

  selectPrev() {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    this.updateSelection();
  }

  updateSelection() {
    const items = this.element?.querySelectorAll('.command-palette-item');
    items?.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedIndex);
      item.setAttribute('aria-selected', i === this.selectedIndex);
    });
    this.scrollSelectedIntoView();
  }

  scrollSelectedIntoView() {
    const selected = this.element?.querySelector('.command-palette-item.selected');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  executeSelected() {
    if (this.filteredCommands[this.selectedIndex]) {
      this.executeCommand(this.filteredCommands[this.selectedIndex].id);
    }
  }

  executeCommand(id) {
    const cmd = this.commands.find(c => c.id === id);
    if (cmd?.action) {
      cmd.action();
    }
    this.close();
  }

  open() {
    this.open = true;
    this.query = '';
    this.filteredCommands = [...this.commands];
    this.selectedIndex = 0;
    this.setState({ open: true, filteredCommands: this.filteredCommands });
    
    requestAnimationFrame(() => {
      this.ref('searchInput')?.focus();
    });
  }

  close() {
    this.open = false;
    this.query = '';
    this.selectedIndex = 0;
    this.setState({ open: false });
  }

  toggle() {
    this.open ? this.close() : this.open();
  }

  showShortcuts() {
    this.close();
    this.admin.openModal({
      title: 'Tastaturske prečice',
      size: 'md',
      content: `
        <div class="shortcuts-list">
          ${this.renderShortcutsTable()}
        </div>
      `,
      footer: '<button class="btn btn-primary" data-action="close">Zatvori</button>'
    });
  }

  renderShortcutsTable() {
    const shortcuts = [
      { keys: ['⌘', 'K'], action: 'Otvorite Command Palette' },
      { keys: ['/'], action: 'Fokus na globalnu pretragu' },
      { keys: ['Esc'], action: 'Zatvori modal / toast / paletu' },
      { keys: ['D'], action: 'Idi na Dashboard' },
      { keys: ['O'], action: 'Idi na Porudžbine' },
      { keys: ['P'], action: 'Idi na Proizvode' },
      { keys: ['I'], action: 'Idi na Inventar' },
      { keys: ['C'], action: 'Idi na Kupce' },
      { keys: ['T'], action: 'Preklopi Dark/Light temu' },
    ];

    return `
      <table class="table" style="font-size: var(--text-sm);">
        <thead>
          <tr><th>Prečica</th><th>Akcija</th></tr>
        </thead>
        <tbody>
          ${shortcuts.map(s => `
            <tr>
              <td><kbd style="display: inline-flex; gap: 4px;">${s.keys.map(k => `<kbd class="kbd">${k}</kbd>`).join(' + ')}</kbd></td>
              <td>${s.action}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  exportOrders() {
    this.admin.navigateTo('orders').then(() => {
      const ordersSection = this.admin.sections.get('orders');
      if (ordersSection?.exportCSV) ordersSection.exportCSV();
    });
  }

  exportProducts() {
    this.admin.navigateTo('products').then(() => {
      const productsSection = this.admin.sections.get('products');
      if (productsSection?.exportCSV) productsSection.exportCSV();
    });
  }
}