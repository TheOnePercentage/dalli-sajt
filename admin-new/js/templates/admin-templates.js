import { ImperiumUtils } from '../utils/helpers.js';

// Hierarchy definitions for admin form
const COLLECTIONS = [
  { value: 'casual', label: 'CASUAL — Premium Everyday Wear' },
  { value: 'elegance', label: 'ELEGANCE — Refined Luxury Fashion' }
];

const GENDERS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' }
];

const CATEGORIES = {
  casual: {
    men: [
      { value: 't-shirts', label: 'T-Shirts' },
      { value: 'hoodies', label: 'Hoodies' },
      { value: 'tracksuits', label: 'Tracksuits' },
      { value: 'shorts', label: 'Shorts' },
      { value: 'jackets', label: 'Jackets' },
      { value: 'essentials', label: 'Essentials' }
    ],
    women: [
      { value: 't-shirts', label: 'T-Shirts' },
      { value: 'hoodies', label: 'Hoodies' },
      { value: 'leggings', label: 'Leggings' },
      { value: 'tracksuits', label: 'Tracksuits' },
      { value: 'matching-sets', label: 'Matching Sets' },
      { value: 'jackets', label: 'Jackets' },
      { value: 'essentials', label: 'Essentials' }
    ],
    unisex: [
      { value: 'accessories', label: 'Accessories' },
      { value: 'essentials', label: 'Essentials' }
    ]
  },
  elegance: {
    men: [
      { value: 'shirts', label: 'Shirts' },
      { value: 'blazers', label: 'Blazers' },
      { value: 'suits', label: 'Suits' },
      { value: 'trousers', label: 'Trousers' },
      { value: 'coats', label: 'Coats' }
    ],
    women: [
      { value: 'dresses', label: 'Dresses' },
      { value: 'shirts', label: 'Shirts' },
      { value: 'blazers', label: 'Blazers' },
      { value: 'elegant-trousers', label: 'Elegant Trousers' },
      { value: 'coats', label: 'Coats' }
    ],
    unisex: [
      { value: 'accessories', label: 'Accessories' }
    ]
  }
};

function getCategoryOptions(collection, gender, selectedCategory = '') {
  const cats = CATEGORIES[collection]?.[gender] || [];
  return cats.map(c => `<option value="${c.value}" ${selectedCategory === c.value ? 'selected' : ''}>${c.label}</option>`).join('');
}

function getGenderOptions(selectedGender) {
  return GENDERS.map(g => `<option value="${g.value}" ${selectedGender === g.value ? 'selected' : ''}>${g.label}</option>`).join('');
}

function getCollectionOptions(selectedCollection) {
  return COLLECTIONS.map(c => `<option value="${c.value}" ${selectedCollection === c.value ? 'selected' : ''}>${c.label}</option>`).join('');
}

// Inline script for dynamic hierarchy updates
const HIERARCHY_SCRIPT = `
<script>
(function() {
  const collectionSelect = document.getElementById('productCollection');
  const genderSelect = document.getElementById('productGender');
  const categorySelect = document.getElementById('productCategory');
  
  if (!collectionSelect || !genderSelect || !categorySelect) return;
  
  const CATEGORIES = {
    casual: {
      men: [
        { value: 't-shirts', label: 'T-Shirts' },
        { value: 'hoodies', label: 'Hoodies' },
        { value: 'tracksuits', label: 'Tracksuits' },
        { value: 'shorts', label: 'Shorts' },
        { value: 'jackets', label: 'Jackets' },
        { value: 'essentials', label: 'Essentials' }
      ],
      women: [
        { value: 't-shirts', label: 'T-Shirts' },
        { value: 'hoodies', label: 'Hoodies' },
        { value: 'leggings', label: 'Leggings' },
        { value: 'tracksuits', label: 'Tracksuits' },
        { value: 'matching-sets', label: 'Matching Sets' },
        { value: 'jackets', label: 'Jackets' },
        { value: 'essentials', label: 'Essentials' }
      ],
      unisex: [
        { value: 'accessories', label: 'Accessories' },
        { value: 'essentials', label: 'Essentials' }
      ]
    },
    elegance: {
      men: [
        { value: 'shirts', label: 'Shirts' },
        { value: 'blazers', label: 'Blazers' },
        { value: 'suits', label: 'Suits' },
        { value: 'trousers', label: 'Trousers' },
        { value: 'coats', label: 'Coats' }
      ],
      women: [
        { value: 'dresses', label: 'Dresses' },
        { value: 'shirts', label: 'Shirts' },
        { value: 'blazers', label: 'Blazers' },
        { value: 'elegant-trousers', label: 'Elegant Trousers' },
        { value: 'coats', label: 'Coats' }
      ],
      unisex: [
        { value: 'accessories', label: 'Accessories' }
      ]
    }
  };
  
  function updateCategoryOptions() {
    const collection = collectionSelect.value;
    const gender = genderSelect.value;
    
    // Clear category
    categorySelect.innerHTML = '<option value="">Izaberi kategoriju</option>';
    
    if (collection && gender) {
      const cats = CATEGORIES[collection]?.[gender] || [];
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.value;
        opt.textContent = c.label;
        categorySelect.appendChild(opt);
      });
    }
  }
  
  collectionSelect.addEventListener('change', updateCategoryOptions);
  genderSelect.addEventListener('change', updateCategoryOptions);
  
  // Initialize on load
  updateCategoryOptions();
})();
</script>
`;

export const templates = {
  productForm(product = {}) {
    const p = product || {};
    const isEdit = !!product;
    const collection = p.collection || 'casual';
    const gender = Array.isArray(p.gender) ? p.gender[0] : (p.gender || 'men');
    const category = p.category || 't-shirts';
    
    return `
      <form id="productForm" class="product-form" enctype="multipart/form-data" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="productName">Naziv *</label>
            <input type="text" id="productName" name="name" required value="${ImperiumUtils.escapeHtml(p.name || '')}" autocomplete="off">
          </div>
          <div class="form-group">
            <label for="productSku">SKU</label>
            <input type="text" id="productSku" name="sku" value="${ImperiumUtils.escapeHtml(p.sku || '')}" autocomplete="off">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="productCollection">Kolekcija *</label>
            <select id="productCollection" name="collection" required>
              <option value="">Izaberi kolekciju</option>
              ${getCollectionOptions(collection)}
            </select>
          </div>
          <div class="form-group">
            <label for="productGender">Pol *</label>
            <select id="productGender" name="gender" required>
              <option value="">Izaberi pol</option>
              ${getGenderOptions(gender)}
            </select>
          </div>
          <div class="form-group">
            <label for="productCategory">Kategorija *</label>
            <select id="productCategory" name="category" required>
              <option value="">Izaberi kategoriju</option>
              ${getCategoryOptions(collection, gender, category)}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="productStatus">Status</label>
            <select id="productStatus" name="status">
              <option value="aktivan" ${p.status === 'aktivan' ? 'selected' : ''}>Aktivan</option>
              <option value="skriven" ${p.status === 'skriven' ? 'selected' : ''}>Skriven</option>
              <option value="rasprodato" ${p.status === 'rasprodato' ? 'selected' : ''}>Rasprodato</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="productDescription">Opis</label>
          <textarea id="productDescription" name="description" rows="4">${ImperiumUtils.escapeHtml(p.description || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="productBasePrice">Osnovna cena (RSD)</label>
            <input type="number" id="productBasePrice" name="basePrice" step="0.01" min="0" value="${p.basePrice || ''}">
          </div>
          <div class="form-group">
            <label for="productSalePrice">Akcijska cena (RSD)</label>
            <input type="number" id="productSalePrice" name="salePrice" step="0.01" min="0" value="${p.salePrice || ''}">
          </div>
        </div>
        <div id="variantsEditor">${this.variantsEditor(p.variants)}</div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-action="add-variant">+ Dodaj varijantu</button>
          <button type="button" class="btn btn-secondary" data-action="cancel">Otkaži</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Sačuvaj izmene' : 'Kreiraj proizvod'}</button>
        </div>
      </form>
      ${HIERARCHY_SCRIPT}
    `;
  },

  variantsEditor(variants) {
    if (!variants || !variants.length) {
      return '<p class="text-muted">Nema definisanih varijanti. Dodajte barem jednu.</p>';
    }
    return variants.map((v, index) => this.variantRow(v, index)).join('');
  },

  variantRow(v, index, colors = ['Bela', 'Crna', 'Navy', 'Siva', 'Bordeaux', 'Olive', 'Roza', 'Bež', 'Lavanda', 'Graphite'], sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '36-40', '41-45', 'Standard 330ml', 'One Size']) {
    return `
      <div class="variant-row" data-index="${index}" style="display: flex; gap: var(--space-3); margin-bottom: var(--space-3); padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--radius-md);">
        <div class="form-group" style="flex: 1;">
          <label>Boja</label>
          <select name="variants[${index}][color]">
            ${colors.map(c => `<option value="${c}" ${v.color === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex: 1;">
          <label>Veličina</label>
          <select name="variants[${index}][size]">
            ${sizes.map(s => `<option value="${s}" ${v.size === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex: 1;">
          <label>SKU</label>
          <input type="text" name="variants[${index}][sku]" value="${ImperiumUtils.escapeHtml(v.sku || '')}" placeholder="Auto-generiše se">
        </div>
        <div class="form-group" style="flex: 1;">
          <label>Cena (RSD)</label>
          <input type="number" name="variants[${index}][price]" step="0.01" min="0" value="${v.price || ''}">
        </div>
        <div class="form-group" style="flex: 1;">
          <label>Zalihe</label>
          <input type="number" name="variants[${index}][stock]" min="0" value="${v.stock || 0}">
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="remove-variant" data-index="${index}" style="margin-top: auto;" aria-label="Obriši varijantu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  },

  shortcutsModal(shortcuts) {
    const categories = new Map();
    shortcuts.forEach(({ description, keyCombo }) => {
      const category = this.categorizeShortcut(keyCombo);
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push({ keyCombo, description });
    });

    let html = '<div class="shortcuts-modal"><h3>Prečice na tastaturi</h3>';
    categories.forEach((list, category) => {
      html += `<div class="shortcuts-category"><h4>${category}</h4><ul>`;
      list.forEach(({ keyCombo, description }) => {
        html += `<li><kbd>${this.formatKeyCombo(keyCombo)}</kbd><span>${description}</span></li>`;
      });
      html += '</ul></div>';
    });
    html += '</div>';
    return html;
  },

  categorizeShortcut(keyCombo) {
    if (keyCombo.startsWith('ctrl+') && keyCombo.length <= 6) return 'Navigacija';
    if (keyCombo.includes('shift')) return 'Akcije';
    if (keyCombo === 'escape') return 'Opšte';
    if (keyCombo.includes('k') || keyCombo.includes('/')) return 'Pretraga';
    return 'UI';
  },

  formatKeyCombo(keyCombo) {
    return keyCombo.split('+').map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' + ');
  },

  authForm() {
    return `
      <form id="authForm" class="auth-form" novalidate>
        <div class="form-group">
          <label for="authEmail">Email</label>
          <input type="email" id="authEmail" name="email" required autocomplete="email" autofocus>
        </div>
        <div class="form-group">
          <label for="authPassword">Lozinka</label>
          <input type="password" id="authPassword" name="password" required autocomplete="current-password">
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" name="remember" value="1"> Zapamti me
          </label>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Prijavi se</button>
        <p class="auth-hint" style="margin-top: var(--space-4); text-align: center; color: var(--color-text-secondary); font-size: var(--text-sm);">
          Demo: admin@dalli.rs / admin123
        </p>
      </form>
    `;
  }
};

export function renderProductForm(product) {
  return templates.productForm(product);
}

export function renderAuthForm() {
  return templates.authForm();
}

export function renderShortcutsModal(shortcuts) {
  return templates.shortcutsModal(shortcuts);
}

export default templates;