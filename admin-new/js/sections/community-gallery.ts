import { Component } from '../core/component.js';
import { ImperiumUtils, escapeHTML } from '../utils/helpers.js';

export class CommunityGallerySection extends Component {
  admin: any;
  images: any[];
  filteredImages: any[];
  moderationQueue: any[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  filters: { status: string; product: string; search: string };
  t: Function;

  constructor(options: any = {}) {
    super(options);
    this.admin = options.admin;
    this.images = [];
    this.filteredImages = [];
    this.moderationQueue = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.totalItems = 0;
    this.filters = { status: 'all', product: 'all', search: '' };
    this.t = this.admin?.t || ((key: string) => key);
  }

  async onEnter(): Promise<void> {
    await this.loadImages();
    this.render();
  }

  async loadImages(): Promise<void> {
    try {
      const response = await fetch('/data/community.json');
      if (response.ok) {
        const data = await response.json();
        this.images = data.images || [];
        this.moderationQueue = data.moderationQueue || [];
      } else {
        this.images = [];
        this.moderationQueue = [];
      }
    } catch (e) {
      console.warn('[CommunityGallery] Load failed:', e);
      this.images = [];
      this.moderationQueue = [];
    }
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.images];
    if (this.filters.status !== 'all') {
      filtered = filtered.filter(i => i.status === this.filters.status);
    }
    if (this.filters.product !== 'all') {
      filtered = filtered.filter(i => i.productId == this.filters.product);
    }
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(i => 
        i.caption?.toLowerCase().includes(search) ||
        i.userName?.toLowerCase().includes(search) ||
        i.tags?.some((t: string) => t.toLowerCase().includes(search))
      );
    }
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    this.filteredImages = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  getProducts(): any[] {
    const products = new Map(this.images.map(i => [i.productId, { id: i.productId, name: `Product #${i.productId}` }])).values();
    return Array.from(products);
  }

  // @ts-ignore
  render(): string {
  // @ts-ignore
    const statsHtml = this.renderStatsCards();
    const filtersHtml = this.renderFilters();
    const tableHtml = this.renderTable();
    const paginationHtml = this.totalItems > this.pageSize ? this.renderPagination() : '';

    return `
      <div class="community-gallery-section">
        <div class="section-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); flex-wrap: wrap; gap: var(--space-3);">
          <div>
            <h2 style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: var(--color-text-primary);">Zajednica / Galerija</h2>
            <p style="color: var(--color-text-tertiary); font-size: var(--text-sm);">Moderacija korisničkih slika i tagovanja proizvoda</p>
          </div>
          <button class="btn btn-primary" data-action="export-gallery">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
            Eksport CSV
          </button>
        </div>
        ${statsHtml}
        ${filtersHtml}
        ${tableHtml}
        ${paginationHtml}
      </div>
    `;
  }

  renderStatsCards(): string {
    const total = this.images.length;
    const approved = this.images.filter(i => i.status === 'approved').length;
    // const pending = this.images.filter(i => i.status === 'pending').length; // eslint-disable-line no-unused-vars
    const rejected = this.images.filter(i => i.status === 'rejected').length;
    // const featured = this.images.filter(i => i.featured).length; // eslint-disable-line no-unused-vars

    return `
      <div class="kpi-grid" style="margin-bottom: var(--space-5);">
        <div class="kpi-card" style="--kpi-color: var(--color-primary);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5 5-5"/></svg></div>
          </div>
          <div class="kpi-value">${total}</div>
          <div class="kpi-label">Ukupno slika</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-success);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-success), var(--color-success-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14l2 2 4-4"/></svg></div>
          </div>
          <div class="kpi-value">${approved}</div>
          <div class="kpi-label">Odobreno</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-warning);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-warning), var(--color-warning-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          </div>
          <div class="kpi-value">${this.filteredImages.filter(i => i.status === 'pending').length}</div>
          <div class="kpi-label">Na čekanju</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-error);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-error), var(--color-error-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
          </div>
          <div class="kpi-value">${rejected}</div>
          <div class="kpi-label">Odbijeno</div>
        </div>
        <div class="kpi-card" style="--kpi-color: var(--color-info);">
          <div class="kpi-header">
            <div class="kpi-icon" style="background: linear-gradient(135deg, var(--color-info), var(--color-info-light));"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          </div>
          <div class="kpi-value">${this.images.filter(i => i.featured).length}</div>
          <div class="kpi-label">Istaknuto</div>
        </div>
      </div>
    `;
  }

  renderFilters(): string {
    // const products = this.getProducts(); // eslint-disable-line no-unused-vars

    return `
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card-body" style="padding: var(--space-4) var(--space-5);">
          <div class="form-row" style="align-items: flex-end; gap: var(--space-3); flex-wrap: wrap;">
            <div class="form-group" style="flex: 1; min-width: 250px;">
              <label class="input-label">Pretraga</label>
              <input type="text" class="input-field" placeholder="Pretraži opis, korisnik, tagove..." 
                value="${escapeHTML(this.filters.search)}" data-filter="search">
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">Status</label>
              <select class="input-field select-field" data-filter="status">
                <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>Svi</option>
                <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>Na čekanju</option>
                <option value="approved" ${this.filters.status === 'approved' ? 'selected' : ''}>Odobreno</option>
                <option value="rejected" ${this.filters.status === 'rejected' ? 'selected' : ''}>Odbijeno</option>
              </select>
            </div>
            <div class="form-group" style="min-width: 150px;">
              <label class="input-label">Proizvod</label>
              <select class="input-field select-field" data-filter="product">
                <option value="all">Svi proizvodi</option>
                <!-- products will be populated dynamically -->
              </select>
            </div>
            <div class="form-group">
              <button class="btn btn-secondary" data-action="clear-filters">Očisti filtere</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderTable(): string {
    if (this.filteredImages.length === 0) {
      return `
        <div class="table-container">
          <div class="table-empty" style="padding: var(--space-12);">
            <svg class="table-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5 5-5"/></svg>
            <h3 class="table-empty-title">Nema slika</h3>
            <p class="table-empty-message">Nema slika koje odgovaraju filterima.</          </div>
        </div>
      `;
    }

    return `
      <div class="table-container">
        <table class="table" id="communityGalleryTable">
          <thead>
            <tr>
              <th scope="col" style="width: 60px;">Slika</th>
              <th scope="col">ID</th>
              <th scope="col">Korisnik</th>
              <th scope="col">Proizvod</th>
              <th scope="col">Opis</th>
              <th scope="col" style="width: 120px;">Status</th>
              <th scope="col" style="width: 100px;">Glasovi</th>
              <th scope="col" style="width: 140px;">Datum</th>
              <th scope="col" style="width: 160px;">Akcije</th>
            </tr>
          </thead>
          <tbody>
            ${this.paginatedImages.map(img => `
              <tr data-id="${img.id}">
                <td>
                  <img src="${escapeHTML(img.imageUrl)}" alt="${escapeHTML(img.caption || '')}" 
                    style="width: 50px; height: 50px; object-fit: cover; border-radius: var(--radius-btn); cursor: pointer;" 
                    data-action="preview-image" data-image-url="${escapeHTML(img.imageUrl)}"
                    title="Kliknite za pregled">
                </td>
                <td class="cell-secondary">${img.id}</td>
                <td>
                  <div class="cell-primary">${escapeHTML(img.userName || img.userInitials)}</div>
                  <div class="cell-secondary">${img.verifiedPurchase ? '<span class="badge badge-success badge-xs">✓ Verifikovano</span>' : '<span class="badge badge-neutral badge-xs">Nepotvrđeno</span>'}</div>
                </td>
                <td>
                  <div class="cell-primary" style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${img.productName ? escapeHTML(img.productName) : (img.taggedProducts && img.taggedProducts.length > 0 ? img.taggedProducts.map((tp: any) => `Proizvod #${tp.productId}`).join(', ') : 'N/A')}
                  </div>
                </td>
                <td class="cell-secondary" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(img.caption || 'Bez opisa')}</td>
                <td>
                  <span class="badge ${img.status === 'approved' ? 'badge-success' : img.status === 'pending' ? 'badge-warning' : 'badge-danger'}">
                    ${img.status === 'approved' ? 'Odobreno' : img.status === 'pending' ? 'Na čekanju' : 'Odbijeno'}
                    ${img.featured ? ' <span class="badge badge-info badge-xs">Istaknuto</span>' : ''}
                  </span>
                </td>
                <td class="cell-secondary">👍 ${img.helpfulVotes || 0} / 👎 ${img.notHelpfulVotes || 0}</td>
                <td class="cell-secondary">${img.createdAt ? ImperiumUtils.format.date(img.createdAt) : ''}</td>
                <td>
                  <div class="admin-actions">
                    ${img.status === 'pending' ? `
                      <button class="btn-action update btn-icon" data-action="approve-image" data-id="${img.id}" aria-label="Odobri">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button class="btn-action danger btn-icon" data-action="reject-image" data-id="${img.id}" aria-label="Odbij">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      </button>
                    ` : ''}
                    ${img.status === 'approved' ? `
                      <button class="btn-action update btn-icon" data-action="unfeature-image" data-id="${img.id}" aria-label="Ukloni featured">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><star fill="currentColor" points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26,12,2" style="fill: var(--color-warning);"/></svg>
                      </button>
                    ` : ''}
                    ${img.status === 'rejected' ? `
                      <button class="btn-action view btn-icon" data-action="view-rejected-image" data-id="${img.id}" aria-label="Pregled">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </button>
                    ` : ''}
                    <button class="btn-action delete btn-icon" data-action="delete-image" data-id="${img.id}" aria-label="Obriši">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  get paginatedImages(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredImages.slice(start, start + this.pageSize);
  }

  renderPagination(): string {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (totalPages <= 1) return '';

    let html = '';
    for (let i = 1; i <= Math.min(5, Math.ceil(this.totalItems / this.pageSize)); i++) {
      html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    return `<div class="pagination">${html}</div>`;
  }

  // @ts-ignore
  bindEvents(): void {
    super.bindEvents();

    this.on('input', '[data-filter="search"]', (ImperiumUtils as any).debounce((e: Event) => {
      this.filters.search = (e.target as HTMLInputElement).value;
      this.applyFilters();
      this.render();
    }, 300));

    this.on('change', '[data-filter="status"]', (e: Event) => {
      this.filters.status = (e.target as HTMLSelectElement).value;
      this.applyFilters();
      this.render();
    });

    this.on('change', '[data-filter="product"]', (e: Event) => {
      this.filters.product = (e.target as HTMLSelectElement).value;
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-action="clear-filters"]', () => {
      this.filters = { status: 'all', product: 'all', search: '' };
      this.applyFilters();
      this.render();
    });

    this.on('click', '[data-page]', (e: Event) => {
      const page = (e.currentTarget as HTMLElement).dataset['page'];
      if (page) this.currentPage = parseInt(page);
      this.render();
    });

    this.on('click', '[data-action="approve-image"]', (e: Event) => this.updateImageStatus((e.currentTarget as HTMLElement).dataset['id']!, 'approved'));
    this.on('click', '[data-action="reject-image"]', (e: Event) => this.updateImageStatus((e.currentTarget as HTMLElement).dataset['id']!, 'rejected'));
    this.on('click', '[data-action="feature-image"]', (e: Event) => this.toggleFeature((e.currentTarget as HTMLElement).dataset['id']!));
    this.on('click', '[data-action="unfeature-image"]', (e: Event) => this.updateImageStatus((e.currentTarget as HTMLElement).dataset['id']!, 'approved'));
    this.on('click', '[data-action="delete-image"]', (e: Event) => this.deleteImage((e.currentTarget as HTMLElement).dataset['id']!));
    this.on('click', '[data-action="preview-image"]', (e: Event) => this.openImagePreview((e.currentTarget as HTMLElement).dataset['imageUrl']!));
    this.on('click', '[data-action="view-rejected-image"]', (e: Event) => this.viewRejectedImage((e.currentTarget as HTMLElement).dataset['id']!));

    this.on('click', '[data-action="export-gallery"]', () => this.exportGallery());

    this.on('click', '[data-page]', (e: Event) => {
      const page = (e.currentTarget as HTMLElement).dataset['page'];
      if (page) this.currentPage = parseInt(page);
      this.render();
    });
  }

  async updateImageStatus(id: string, status: string, note: string = ''): Promise<void> {
    const image = this.images.find(i => i.id === id);
    if (!image) return;

    image.status = status;
    image.moderatedAt = new Date().toISOString();
    image.moderatedBy = this.admin?.user?.id || 'admin';
    if (note) image.adminNote = note;

    try {
      const data = JSON.parse(localStorage.getItem('dalli_community') || '{"images":[],"settings":{},"moderationQueue":[]}');
      const idx = data.images.findIndex((i: any) => i.id === id);
      if (idx >= 0) {
        data.images[idx] = image;
        localStorage.setItem('dalli_community', JSON.stringify(data));
      }
    } catch (e) {
      console.warn('[CommunityGallery] Save failed:', e);
    }

    this.images = this.images.map(i => i.id === id ? image : i);
    this.applyFilters();
    this.render();

    this.admin?.success(`Slika ${status === 'approved' ? 'odobrena' : status === 'rejected' ? 'odbijena' : 'vraćena na čekanje'}`);
  }

  toggleFeature(id: string): void {
    const image = this.images.find(i => i.id === id);
    if (!image) return;
    
    image.featured = !image.featured;
    image.moderatedAt = new Date().toISOString();
    image.moderatedBy = this.admin?.user?.id || 'admin';

    this.saveToLocalStorage();
    this.applyFilters();
    this.render();
    this.admin?.success(image.featured ? 'Slika postavljena kao istaknuta' : 'Slika uklonjena sa istaknutih');
  }

  async deleteImage(id: string): Promise<void> {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu sliku?')) return;
    
    this.images = this.images.filter(i => i.id !== id);
    this.saveToLocalStorage();
    this.applyFilters();
    this.render();
    this.admin?.success('Slika obrisana');
  }

  saveToLocalStorage(): void {
    try {
      const data = JSON.parse(localStorage.getItem('dalli_community') || '{"images":[],"settings":{},"moderationQueue":[]}');
      data.images = this.images;
      localStorage.setItem('dalli_community', JSON.stringify(data));
    } catch (e) {
      console.warn('[CommunityGallery] Save failed:', e);
    }
  }

  openImagePreview(imageUrl: string): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal modal-lg" style="max-width: 90vw; max-height: 90vh;">
        <div class="modal-header">
          <h3>Pregled slike</h3>
          <button class="modal-close" data-action="close-modal">&times;</button>
        </div>
        <div class="modal-body" style="padding: 0; display: flex; align-items: center; justify-content: center;">
          <img src="${imageUrl}" alt="Preview" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('[data-action="close-modal"]')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e: Event) => { if (e.target === modal) modal.remove(); });
  }

  viewRejectedImage(id: string): void {
    const image = this.images.find(i => i.id === id);
    if (!image) return;
    this.openImagePreview(image.imageUrl);
  }

  exportGallery(): void {
    const format = confirm('Eksportovati kao CSV? (Odustanak = JSON)') ? 'csv' : 'json';
    const data = this.filteredImages.map(img => ({
      id: img.id,
      imageUrl: img.imageUrl,
      userName: img.userName,
      userId: img.userId,
      userInitials: img.userInitials,
      verifiedPurchase: img.verifiedPurchase,
      productId: img.productId,
      productName: img.productName,
      taggedProducts: img.taggedProducts?.map((tp: any) => `${tp.productId}:${tp.name}`).join(';') || '',
      caption: img.caption,
      status: img.status,
      featured: img.featured,
      helpfulVotes: img.helpfulVotes || 0,
      notHelpfulVotes: img.notHelpfulVotes || 0,
      tags: img.tags?.join(', ') || '',
      createdAt: img.createdAt,
      moderatedAt: img.moderatedAt,
      moderatedBy: img.moderatedBy,
      adminNote: img.adminNote || ''
    }));

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const rows = data.map(row => headers.map(h => {
        const val = row[h as keyof typeof row];
        return typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))
          ? '"' + val.replace(/"/g, '""') + '"'
          : String(val);
      }).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      this.downloadFile(csv, `community-gallery-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } else {
      const json = JSON.stringify(data, null, 2);
      this.downloadFile(json, `community-gallery-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    }

    this.admin?.success(`Galerija eksportovana kao ${format.toUpperCase()}`);
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default CommunityGallerySection;
