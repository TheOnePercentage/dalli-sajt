import { Component } from '../core/component.js';
import { ImperiumUtils } from '../utils/helpers.js';

export class Table extends Component {
  constructor(options = {}) {
    super(options);
    this.columns = options.columns || [];
    this.data = options.data || [];
    this.keyField = options.keyField || 'id';
    this.sortable = options.sortable !== false;
    this.selectable = options.selectable || false;
    this.hoverable = options.hoverable !== false;
    this.striped = options.striped || false;
    this.bordered = options.bordered !== false;
    this.responsive = options.responsive !== false;
    this.emptyMessage = options.emptyMessage || 'Nema podataka za prikaz';
    this.emptyIcon = options.emptyIcon;
    this.loading = options.loading || false;
    this.sortColumn = options.sortColumn;
    this.sortDirection = options.sortDirection || 'asc';
    this.onSort = options.onSort;
    this.onRowClick = options.onRowClick;
    this.onSelectionChange = options.onSelectionChange;
    this.rowClass = options.rowClass;
    this.id = options.id || ImperiumUtils.generateId('table-');
    this._selectedRows = new Set();
    this._sortColumn = this.sortColumn;
    this._sortDirection = this.sortDirection;
  }

  render() {
    const wrapperClasses = ['table-wrapper'].join(' ');
    const tableClasses = [
      'table',
      this.hoverable ? 'table-hoverable' : '',
      this.striped ? 'table-striped' : '',
      this.bordered ? 'table-bordered' : ''
    ].filter(Boolean).join(' ');

    const containerClasses = [
      'table-container',
      this.responsive ? 'table-responsive' : ''
    ].filter(Boolean).join(' ');

    if (this.loading) {
      return `
        <div class="${containerClasses}" data-ref="container">
          <div class="table-loading" data-ref="loading">
            <div class="table-loading-spinner"></div>
            <span>Učitavanje...</span>
          </div>
        </div>
      `;
    }

    const theadHtml = this.columns.length > 0 ? `
      <thead>
        <tr>
          ${this.selectable ? '<th class="table-checkbox-col"><input type="checkbox" class="table-checkbox-all" data-action="select-all" aria-label="Selektuj sve"></th>' : ''}
          ${this.columns.map(col => this.renderTh(col)).join('')}
        </tr>
      </thead>
    ` : '';

    const tbodyHtml = this.data.length > 0 ? `
      <tbody data-ref="tbody">
        ${this.data.map((row, index) => this.renderTr(row, index)).join('')}
      </tbody>
    ` : `
      <tbody data-ref="tbody">
        <tr class="table-empty-row">
          <td colspan="${this.columns.length + (this.selectable ? 1 : 0)}" class="table-empty">
            ${this.emptyIcon ? `<div class="table-empty-icon">${this.emptyIcon}</div>` : ''}
            <div class="table-empty-title">Nema podataka</div>
            <div class="table-empty-message">${ImperiumUtils.escapeHtml(this.emptyMessage)}</div>
          </td>
        </tr>
      </tbody>
    `;

    return `
      <div class="${containerClasses}" data-ref="container">
        <div class="${wrapperClasses}" data-ref="wrapper">
          <table class="${tableClasses}" id="${this.id}" data-ref="table">
            ${theadHtml}
            ${tbodyHtml}
          </table>
        </div>
      </div>
    `;
  }

  renderTh(column) {
    const sortable = this.sortable && column.sortable !== false;
    const sorted = sortable && this._sortColumn === column.key;
    const direction = sorted ? this._sortDirection : '';
    
    return `
      <th 
        scope="col" 
        class="${column.className || ''} ${sortable ? 'table-sortable' : ''} ${sorted ? `table-sorted-${direction}` : ''}"
        ${sortable ? `data-sort="${column.key}"` : ''}
        style="${column.width ? `width: ${column.width};` : ''}"
      >
        <div class="table-th-content">
          <span>${ImperiumUtils.escapeHtml(column.label)}</span>
          ${sortable ? `
            <button class="table-sort-btn" aria-label="Sortiraj po ${ImperiumUtils.escapeHtml(column.label)}" aria-sort="${sorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          ` : ''}
        </div>
      </th>
    `;
  }

  renderTr(row, index) {
    const key = row[this.keyField];
    const selected = this._selectedRows.has(key);
    const rowClass = [
      this.rowClass ? (typeof this.rowClass === 'function' ? this.rowClass(row) : this.rowClass) : '',
      selected ? 'selected' : '',
      index % 2 === 1 && this.striped ? 'striped' : ''
    ].filter(Boolean).join(' ');

    const cellsHtml = this.columns.map(col => this.renderTd(row, col)).join('');
    const checkboxHtml = this.selectable ? `
      <td class="table-checkbox-col">
        <input type="checkbox" class="table-checkbox" value="${ImperiumUtils.escapeHtml(key)}" ${selected ? 'checked' : ''} data-action="select-row" aria-label="Selektuj red">
      </td>
    ` : '';

    return `
      <tr class="${rowClass}" data-key="${ImperiumUtils.escapeHtml(key)}" ${this.onRowClick ? 'data-clickable="true"' : ''}>
        ${checkboxHtml}
        ${cellsHtml}
      </tr>
    `;
  }

  renderTd(row, column) {
    const value = ImperiumUtils.getNested(row, column.key);
    let content = '';

    if (column.render) {
      content = column.render(value, row);
    } else if (column.format) {
      content = column.format(value, row);
    } else if (typeof value === 'boolean') {
      content = value ? '<span class="badge badge-success">Da</span>' : '<span class="badge badge-neutral">Ne</span>';
    } else if (value === null || value === undefined) {
      content = '<span class="text-tertiary">—</span>';
    } else {
      content = ImperiumUtils.escapeHtml(String(value));
    }

    if (column.truncate) {
      content = ImperiumUtils.truncate(String(value), column.truncate);
    }

    return `
      <td class="${column.className || ''} ${column.align ? `text-${column.align}` : ''}" 
          ${column.width ? `style="width: ${column.width};"` : ''}
          data-key="${column.key}">
        ${content}
      </td>
    `;
  }

  bindEvents() {
    super.bindEvents();

    if (this.sortable) {
      this.on('click', '.table-sortable', (e) => {
        const th = e.delegateTarget;
        const columnKey = th.dataset.sort;
        if (!columnKey) return;

        if (this._sortColumn === columnKey) {
          this._sortDirection = this._sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this._sortColumn = columnKey;
          this._sortDirection = 'asc';
        }

        this.setState({ sortColumn: this._sortColumn, sortDirection: this._sortDirection });
        
        if (this.onSort) {
          this.onSort(this._sortColumn, this._sortDirection);
        }
        this.emit('sort', { column: this._sortColumn, direction: this._sortDirection });
      });
    }

    if (this.selectable) {
      this.on('change', '.table-checkbox-all', (e) => {
        const checked = e.target.checked;
        this._selectedRows.clear();
        if (checked) {
          this.data.forEach(row => this._selectedRows.add(row[this.keyField]));
        }
        this.updateSelectionUI();
        if (this.onSelectionChange) this.onSelectionChange(Array.from(this._selectedRows));
        this.emit('selection-change', { selected: Array.from(this._selectedRows) });
      });

      this.on('change', '.table-checkbox', (e) => {
        const key = e.target.value;
        if (e.target.checked) {
          this._selectedRows.add(key);
        } else {
          this._selectedRows.delete(key);
        }
        this.updateSelectAllCheckbox();
        if (this.onSelectionChange) this.onSelectionChange(Array.from(this._selectedRows));
        this.emit('selection-change', { selected: Array.from(this._selectedRows) });
      });
    }

    if (this.onRowClick) {
      this.on('click', 'tbody tr[data-clickable="true"]', (e) => {
        if (e.target.closest('input, button, a, select')) return;
        const tr = e.delegateTarget;
        const key = tr.dataset.key;
        const row = this.data.find(r => r[this.keyField] == key);
        if (row) {
          this.onRowClick(row, e);
          this.emit('row-click', { row, originalEvent: e });
        }
      });
    }
  }

  updateSelectionUI() {
    const checkboxes = this.element?.querySelectorAll('.table-checkbox');
    checkboxes?.forEach(cb => {
      cb.checked = this._selectedRows.has(cb.value);
    });
    this.updateSelectAllCheckbox();
  }

  updateSelectAllCheckbox() {
    const selectAll = this.element?.querySelector('.table-checkbox-all');
    if (selectAll) {
      selectAll.checked = this._selectedRows.size === this.data.length && this.data.length > 0;
      selectAll.indeterminate = this._selectedRows.size > 0 && this._selectedRows.size < this.data.length;
    }
  }

  setData(data) {
    this.data = data;
    this._selectedRows.clear();
    this.setState({ data });
  }

  addRow(row) {
    this.data.push(row);
    this.setState({ data: [...this.data] });
  }

  removeRow(key) {
    this.data = this.data.filter(r => r[this.keyField] != key);
    this._selectedRows.delete(key);
    this.setState({ data: [...this.data] });
  }

  updateRow(key, updates) {
    const index = this.data.findIndex(r => r[this.keyField] == key);
    if (index > -1) {
      this.data[index] = { ...this.data[index], ...updates };
      this.setState({ data: [...this.data] });
    }
  }

  getSelected() {
    return this.data.filter(row => this._selectedRows.has(row[this.keyField]));
  }

  selectRow(key) {
    this._selectedRows.add(key);
    this.updateSelectionUI();
  }

  deselectRow(key) {
    this._selectedRows.delete(key);
    this.updateSelectionUI();
  }

  selectAll() {
    this.data.forEach(row => this._selectedRows.add(row[this.keyField]));
    this.updateSelectionUI();
  }

  deselectAll() {
    this._selectedRows.clear();
    this.updateSelectionUI();
  }

  setLoading(loading) {
    this.loading = loading;
    this.setState({ loading });
  }

  setSort(column, direction = 'asc') {
    this._sortColumn = column;
    this._sortDirection = direction;
    this.setState({ sortColumn: column, sortDirection: direction });
  }
}

export class Pagination extends Component {
  constructor(options = {}) {
    super(options);
    this.currentPage = options.currentPage || 1;
    this.totalPages = options.totalPages || 1;
    this.totalItems = options.totalItems || 0;
    this.pageSize = options.pageSize || 20;
    this.showPageSize = options.showPageSize || false;
    this.pageSizeOptions = options.pageSizeOptions || [10, 20, 50, 100];
    this.onPageChange = options.onPageChange;
    this.onPageSizeChange = options.onPageSizeChange;
    this.id = options.id || ImperiumUtils.generateId('pagination-');
  }

  render() {
    if (this.totalPages <= 1 && !this.showPageSize) return '';

    const pages = this.getPageNumbers();
    const startItem = (this.currentPage - 1) * this.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);

    return `
      <div class="table-pagination" data-ref="pagination">
        <div class="table-pagination-info">
          Prikazano ${ImperiumUtils.formatNumber(startItem)}–${ImperiumUtils.formatNumber(endItem)} od ${ImperiumUtils.formatNumber(this.totalItems)}
        </div>
        <div class="table-pagination-controls">
          <button class="table-pagination-btn" data-action="first" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prva stranica">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><line x1="18" y1="17" x2="18" y2="7"/></svg>
          </button>
          <button class="table-pagination-btn" data-action="prev" ${this.currentPage === 1 ? 'disabled' : ''} aria-label="Prethodna stranica">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="table-pagination-pages" role="navigation" aria-label="Stranice">
            ${pages.map(page => page === '...' 
              ? '<span class="table-pagination-page ellipsis" aria-hidden="true">…</span>'
              : `<button class="table-pagination-page ${page === this.currentPage ? 'active' : ''}" data-page="${page}" ${page === this.currentPage ? 'aria-current="page"' : ''}>${page}</button>`
            ).join('')}
          </div>
          <button class="table-pagination-btn" data-action="next" ${this.currentPage === this.totalPages ? 'disabled' : ''} aria-label="Sledeća stranica">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="table-pagination-btn" data-action="last" ${this.currentPage === this.totalPages ? 'disabled' : ''} aria-label="Poslednja stranica">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><line x1="6" y1="17" x2="6" y2="7"/></svg>
          </button>
          ${this.showPageSize ? `
            <div class="table-pagination-size">
              <span>Po stranici:</span>
              <select class="table-pagination-size-select" data-ref="pageSizeSelect" aria-label="Broj stavki po stranici">
                ${this.pageSizeOptions.map(size => `<option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>`).join('')}
              </select>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  getPageNumbers() {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < this.totalPages) {
      if (end < this.totalPages - 1) pages.push('...');
      pages.push(this.totalPages);
    }

    return pages;
  }

  bindEvents() {
    super.bindEvents();
    this.on('click', '.table-pagination-btn', (e) => {
      const action = e.delegateTarget.dataset.action;
      let newPage = this.currentPage;

      switch (action) {
        case 'first': newPage = 1; break;
        case 'prev': newPage = Math.max(1, this.currentPage - 1); break;
        case 'next': newPage = Math.min(this.totalPages, this.currentPage + 1); break;
        case 'last': newPage = this.totalPages; break;
      }

      if (newPage !== this.currentPage) {
        this.goToPage(newPage);
      }
    });

    this.on('click', '.table-pagination-page[data-page]', (e) => {
      const page = parseInt(e.delegateTarget.dataset.page);
      if (page !== this.currentPage) {
        this.goToPage(page);
      }
    });

    this.on('change', '.table-pagination-size-select', (e) => {
      const pageSize = parseInt(e.target.value);
      if (pageSize !== this.pageSize && this.onPageSizeChange) {
        this.onPageSizeChange(pageSize);
        this.emit('page-size-change', { pageSize });
      }
    });
  }

  goToPage(page) {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.setState({ currentPage: this.currentPage });
    if (this.onPageChange) this.onPageChange(this.currentPage);
    this.emit('page-change', { page: this.currentPage });
  }

  setTotalItems(total) {
    this.totalItems = total;
    this.totalPages = Math.ceil(total / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    this.setState({ totalItems: total, totalPages: this.totalPages, currentPage: this.currentPage });
  }

  setPageSize(size) {
    this.pageSize = size;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
    this.setState({ pageSize: size, totalPages: this.totalPages, currentPage: this.currentPage });
  }
}