/**
 * ProductFormHandler - Product form state, validation, variants, dirty tracking
 * Handles product creation/editing, variant management, image upload, price/stock sync
 */
import { AdminEventBus, AdminEvents } from './events.js';

function getStore() {
  return window.AdminStore;
}

function getAuth() {
  return window.AuthManager;
}

function emit(event, data) {
  AdminEventBus.emit(event, data);
}

// Validation rules
const VALIDATION_RULES = {
  name: { required: true, minLength: 2, maxLength: 200 },
  sku: { required: true, pattern: /^[A-Z0-9\-]{3,50}$/ },
  price: { required: true, type: 'number', min: 0, max: 999999 },
  compareAtPrice: { type: 'number', min: 0, max: 999999 },
  costPrice: { type: 'number', min: 0, max: 999999 },
  stock: { type: 'integer', min: 0, max: 999999 },
  lowStockThreshold: { type: 'integer', min: 0, max: 9999 },
  weight: { type: 'number', min: 0, max: 999 },
  category: { required: true },
  description: { maxLength: 5000 },
};

const DEFAULT_PRODUCT = {
  id: null,
  name: '',
  sku: '',
  description: '',
  shortDescription: '',
  price: 0,
  compareAtPrice: 0,
  costPrice: 0,
  category: '',
  subcategory: '',
  brand: '',
  tags: [],
  images: [],
  variants: [],
  stock: 0,
  lowStockThreshold: 5,
  trackInventory: true,
  weight: 0,
  dimensions: { length: 0, width: 0, height: 0 },
  status: 'draft',
  featured: false,
  seoTitle: '',
  seoDescription: '',
  seoKeywords: [],
  createdAt: null,
  updatedAt: null,
};

export class ProductFormHandler {
  constructor(formId = 'productForm') {
    this._formId = formId;
    this._form = null;
    this._product = { ...DEFAULT_PRODUCT };
    this._originalProduct = null;
    this._errors = {};
    this._touched = new Set();
    this._dirty = false;
    this._submitting = false;
    this._variantCounter = 0;
    this._imageUploads = new Map();
    this._initialized = false;
  }

  init(formSelector = '#productForm') {
    if (this._initialized) return;
    
    this._form = typeof formSelector === 'string' 
      ? document.querySelector(formSelector) 
      : formSelector;
    
    if (!this._form) {
      console.warn(`Form "${formSelector}" not found`);
      return;
    }

    this._bindEvents();
    this._setupVariantEvents();
    this._setupImageUpload();
    this._setupDirtyTracking();
    
    this._initialized = true;
  }

  loadProduct(product) {
    this._product = { ...DEFAULT_PRODUCT, ...product };
    this._originalProduct = JSON.stringify(this._product);
    this._populateForm();
    this._errors = {};
    this._touched.clear();
    this._dirty = false;
    this._updateDirtyState();
  }

  newProduct() {
    this._product = { ...DEFAULT_PRODUCT };
    this._originalProduct = JSON.stringify(this._product);
    this._resetForm();
    this._errors = {};
    this._touched.clear();
    this._dirty = false;
    this._updateDirtyState();
  }

  getProductData() {
    this._collectFormData();
    return { ...this._product };
  }

  validate() {
    this._errors = {};
    this._touched.forEach(field => this._validateField(field));
    
    Object.keys(VALIDATION_RULES).forEach(field => {
      if (VALIDATION_RULES[field].required && !this._touched.has(field)) {
        this._validateField(field);
      }
    });

    const isValid = Object.keys(this._errors).length === 0;
    this._displayErrors();
    return isValid;
  }

  validateField(fieldName) {
    this._touched.add(fieldName);
    this._validateField(fieldName);
    this._displayFieldError(fieldName);
    return !this._errors[fieldName];
  }

  isDirty() {
    return this._dirty;
  }

  hasErrors() {
    return Object.keys(this._errors).length > 0;
  }

  getErrors() {
    return { ...this._errors };
  }

  getError(fieldName) {
    return this._errors[fieldName] || null;
  }

  touchField(fieldName) {
    this._touched.add(fieldName);
  }

  reset() {
    if (this._originalProduct) {
      this._product = JSON.parse(this._originalProduct);
    } else {
      this._product = { ...DEFAULT_PRODUCT };
    }
    this._populateForm();
    this._errors = {};
    this._touched.clear();
    this._dirty = false;
    this._updateDirtyState();
  }

  setFieldValue(fieldName, value) {
    this._product[fieldName] = value;
    const input = this._form.querySelector(`[name="${fieldName}"]`);
    if (input) {
      input.value = value;
      this._markDirty();
    }
  }

  getFieldValue(fieldName) {
    return this._product[fieldName];
  }

  async submit(onSuccess, onError) {
    if (this._submitting) return;
    
    if (!this.validate()) {
      onError?.(this._errors);
      return;
    }

    this._submitting = true;
    this._setSubmitButtonState(true);

    try {
      this._collectFormData();
      const productData = { ...this._product };
      
      emit(AdminEvents.PRODUCT_FORM_SUBMIT, { product: productData, form: this });
      
      if (onSuccess) {
        await onSuccess(productData, this);
      }
      
      this._originalProduct = JSON.stringify(this._product);
      this._dirty = false;
      this._updateDirtyState();
      
      emit(AdminEvents.PRODUCT_SAVED, { product: productData });
    } catch (err) {
      emit(AdminEvents.PRODUCT_SAVE_ERROR, { error: err });
      onError?.(err);
    } finally {
      this._submitting = false;
      this._setSubmitButtonState(false);
    }
  }

  addVariant(variant = {}) {
    const newVariant = {
      id: `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sku: '',
      name: '',
      price: 0,
      compareAtPrice: 0,
      stock: 0,
      weight: 0,
      options: {},
      image: null,
      ...variant,
    };
    
    this._product.variants = this._product.variants || [];
    this._product.variants.push(newVariant);
    this._renderVariants();
    this._markDirty();
    emit(AdminEvents.PRODUCT_VARIANT_ADDED, { variant: newVariant, form: this });
    return newVariant;
  }

  removeVariant(variantId) {
    this._product.variants = this._product.variants.filter(v => v.id !== variantId);
    this._renderVariants();
    this._markDirty();
    emit(AdminEvents.PRODUCT_VARIANT_REMOVED, { variantId });
  }

  updateVariant(variantId, data) {
    const index = this._product.variants.findIndex(v => v.id === variantId);
    if (index !== -1) {
      this._product.variants[index] = { ...this._product.variants[index], ...data };
      this._markDirty();
      emit(AdminEvents.PRODUCT_VARIANT_UPDATED, { variantId, data });
    }
  }

  addImages(files) {
    Array.from(files).forEach(file => {
      if (!this._isValidImage(file)) return;
      
      const uploadId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this._imageUploads.set(uploadId, { file, uploading: false, progress: 0 });
      
      this._createImagePreview(file, uploadId);
    });
    this._renderImages();
  }

  removeImage(imageId) {
    this._product.images = this._product.images.filter(img => img.id !== imageId);
    this._renderImages();
    this._markDirty();
  }

  setPrimaryImage(imageId) {
    this._product.images = this._product.images.map(img => ({
      ...img,
      primary: img.id === imageId,
    }));
    this._renderImages();
    this._markDirty();
  }

  destroy() {
    this._form.removeEventListener('input', this._onInput);
    this._form.removeEventListener('change', this._onChange);
    this._form.removeEventListener('blur', this._onBlur);
    this._form.removeEventListener('submit', this._onSubmit);
  }

  _bindEvents() {
    this._onInput = this._onInput.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onSubmit = this._onSubmit.bind(this);

    this._form.addEventListener('input', this._onInput);
    this._form.addEventListener('change', this._onChange);
    this._form.addEventListener('blur', this._onBlur, true);
    this._form.addEventListener('submit', this._onSubmit);
  }

  _onInput(e) {
    const field = e.target.name;
    if (!field) return;
    
    this._product[field] = e.target.value;
    this._markDirty();
    
    if (this._touched.has(field)) {
      this._validateField(field);
      this._displayFieldError(field);
    }
  }

  _onChange(e) {
    const field = e.target.name;
    if (!field) return;
    
    this._product[field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    this._markDirty();
  }

  _onBlur(e) {
    const field = e.target.name;
    if (!field) return;
    
    this._touched.add(field);
    this._validateField(field);
    this._displayFieldError(field);
  }

  _onSubmit(e) {
    e.preventDefault();
  }

  _setupVariantEvents() {
    this._form.addEventListener('click', e => {
      if (e.target.matches('[data-add-variant]')) {
        e.preventDefault();
        this.addVariant();
      }
      if (e.target.matches('[data-remove-variant]')) {
        e.preventDefault();
        this.removeVariant(e.target.dataset.removeVariant);
      }
    });
  }

  _setupImageUpload() {
    const dropZone = this._form.querySelector('[data-image-dropzone]');
    const fileInput = this._form.querySelector('[data-image-input]');
    
    if (dropZone) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, e => e.preventDefault(), false);
      });
      
      dropZone.addEventListener('dragover', () => dropZone.classList.add('drag-over'), false);
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'), false);
      dropZone.addEventListener('drop', e => {
        dropZone.classList.remove('drag-over');
        this.addImages(e.dataTransfer.files);
      }, false);
    }
    
    if (fileInput) {
      fileInput.addEventListener('change', e => {
        this.addImages(e.target.files);
        e.target.value = '';
      });
    }
  }

  _setupDirtyTracking() {
    this._form.dataset.dirtyTracking = 'true';
  }

  _markDirty() {
    if (!this._dirty) {
      this._dirty = true;
      this._updateDirtyState();
      emit(AdminEvents.FORM_DIRTY, { formId: this._formId });
    }
  }

  _updateDirtyState() {
    this._form.dataset.dirty = this._dirty ? 'true' : 'false';
    if (this._dirty) {
      this._form.classList.add('dirty');
    } else {
      this._form.classList.remove('dirty');
    }
    
    const store = window.AdminStore;
    if (store) {
      if (this._dirty) {
        store.markFormDirty(this._formId);
      } else {
        store.markFormClean(this._formId);
      }
    }
  }

  _collectFormData() {
    const formData = new FormData(this._form);
    formData.forEach((value, key) => {
      if (key.endsWith('[]')) {
        const arrKey = key.slice(0, -2);
        if (!this._product[arrKey]) this._product[arrKey] = [];
        this._product[arrKey].push(value);
      } else {
        const input = this._form.querySelector(`[name="${key}"]`);
        if (input && input.type === 'number') {
          this._product[key] = value === '' ? 0 : parseFloat(value);
        } else if (input && input.type === 'checkbox') {
          this._product[key] = input.checked;
        } else {
          this._product[key] = value;
        }
      }
    });
    
    this._collectVariantData();
  }

  _collectVariantData() {
    const variantRows = this._form.querySelectorAll('[data-variant-row]');
    this._product.variants = Array.from(variantRows).map(row => {
      const variant = { id: row.dataset.variantId };
      row.querySelectorAll('[name]').forEach(input => {
        const key = input.name.replace('variant_', '');
        variant[key] = input.type === 'number' ? parseFloat(input.value) || 0 : input.value;
      });
      return variant;
    });
  }

  _populateForm() {
    Object.entries(this._product).forEach(([key, value]) => {
      if (key === 'variants' || key === 'images' || key === 'tags') return;
      const input = this._form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = Boolean(value);
        } else if (input.type === 'select-multiple') {
        } else {
          input.value = value ?? '';
        }
      }
    });
    
    this._renderVariants();
    this._renderImages();
  }

  _resetForm() {
    this._form.reset();
    this._renderVariants();
    this._renderImages();
  }

  _renderVariants() {
    const container = this._form.querySelector('[data-variants-container]');
    if (!container) return;
    
    const variants = this._product.variants || [];
    
    if (variants.length === 0) {
      container.innerHTML = `
        <div class="variants-empty">
          <p>Nema varijanti. Dodajte prvu varijantu.</p>
          <button type="button" class="btn btn-primary" data-add-variant>+ Dodaj varijantu</button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = variants.map((variant, index) => `
      <div class="variant-row" data-variant-row data-variant-id="${variant.id}">
        <div class="variant-header">
          <span class="variant-index">${index + 1}</span>
          <span class="variant-name">${variant.name || variant.sku || 'Nova varijanta'}</span>
          <button type="button" class="btn-icon" data-remove-variant="${variant.id}" aria-label="Obriši varijantu">&times;</button>
        </div>
        <div class="variant-fields">
          <div class="form-field">
            <label>SKU</label>
            <input type="text" name="variant_sku" value="${variant.sku || ''}" required>
          </div>
          <div class="form-field">
            <label>Naziv</label>
            <input type="text" name="variant_name" value="${variant.name || ''}">
          </div>
          <div class="form-field">
            <label>Cena</label>
            <input type="number" name="variant_price" step="0.01" min="0" value="${variant.price || 0}">
          </div>
          <div class="form-field">
            <label>Promocijska cena</label>
            <input type="number" name="variant_compareAtPrice" step="0.01" min="0" value="${variant.compareAtPrice || 0}">
          </div>
          <div class="form-field">
            <label>Stanica</label>
            <input type="number" name="variant_stock" min="0" value="${variant.stock || 0}">
          </div>
          <div class="form-field">
            <label>Opcije (JSON)</label>
            <textarea name="variant_options" rows="2">${JSON.stringify(variant.options || {}, null, 2)}</textarea>
          </div>
        </div>
      </div>
    `).join('');
  }

  _renderImages() {
    const container = this._form.querySelector('[data-images-container]');
    if (!container) return;
    
    const images = this._product.images || [];
    
    if (images.length === 0) {
      container.innerHTML = `
        <div class="images-empty">
          <p>Nema slika. Prevucite slike ovde ili kliknite za upload.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = images.map(img => `
      <div class="image-item" data-image-id="${img.id}">
        <img src="${img.url || img.preview}" alt="${img.alt || ''}">
        ${img.primary ? '<span class="primary-badge">Glavna</span>' : ''}
        <div class="image-actions">
          ${!img.primary ? `<button type="button" class="btn-icon" data-set-primary="${img.id}" title="Postavi kao glavnu">★</button>` : ''}
          <button type="button" class="btn-icon danger" data-remove-image="${img.id}" title="Obriši">&times;</button>
        </div>
      </div>
    `).join('');
    
    container.querySelectorAll('[data-remove-image]').forEach(btn => {
      btn.addEventListener('click', () => this.removeImage(btn.dataset.removeImage));
    });
    container.querySelectorAll('[data-set-primary]').forEach(btn => {
      btn.addEventListener('click', () => this.setPrimaryImage(btn.dataset.setPrimary));
    });
  }

  _createImagePreview(file, uploadId) {
    const reader = new FileReader();
    reader.onload = e => {
      const upload = this._imageUploads.get(uploadId);
      if (upload) {
        upload.preview = e.target.result;
        this._simulateUpload(uploadId);
      }
    };
    reader.readAsDataURL(file);
  }

  _simulateUpload(uploadId) {
    const upload = this._imageUploads.get(uploadId);
    if (!upload) return;
    
    upload.uploading = true;
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        upload.uploading = false;
        this._product.images = this._product.images || [];
        this._product.images.push({
          id: uploadId,
          url: upload.preview,
          name: upload.file.name,
          size: upload.file.size,
          primary: this._product.images.length === 0,
        });
        this._renderImages();
        this._markDirty();
      }
      upload.progress = progress;
      this._renderUploadProgress(uploadId, progress);
    }, 200);
  }

  _renderUploadProgress(uploadId, progress) {
    const element = document.querySelector(`[data-upload-id="${uploadId}"] .progress-bar`);
    if (element) element.style.width = `${progress}%`;
  }

  _isValidImage(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
      emit(AdminEvents.TOAST_SHOW, { message: 'Nevalidan format slike. Dozvoljeni: JPG, PNG, WebP, GIF', type: 'error' });
      return false;
    }
    if (file.size > maxSize) {
      emit(AdminEvents.TOAST_SHOW, { message: 'Slika je prevelika. Maksimum 10MB', type: 'error' });
      return false;
    }
    return true;
  }

  _validateField(fieldName) {
    const rules = VALIDATION_RULES[fieldName];
    if (!rules) return true;
    
    const value = this._product[fieldName];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      this._errors[fieldName] = 'Ovo polje je obavezno';
      return false;
    }
    
    if (!rules.required && (value === undefined || value === null || value === '')) {
      delete this._errors[fieldName];
      return true;
    }
    
    if (rules.type === 'number' && typeof value !== 'number') {
      this._errors[fieldName] = 'Mora biti broj';
      return false;
    }
    if (rules.type === 'integer' && !Number.isInteger(value)) {
      this._errors[fieldName] = 'Mora biti ceo broj';
      return false;
    }
    
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        this._errors[fieldName] = `Minimalna vrednost je ${rules.min}`;
        return false;
      }
      if (rules.max !== undefined && value > rules.max) {
        this._errors[fieldName] = `Maksimalna vrednost je ${rules.max}`;
        return false;
      }
    }
    
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      this._errors[fieldName] = 'Nevalidan format';
      return false;
    }
    
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        this._errors[fieldName] = `Minimum ${rules.minLength} karaktera`;
        return false;
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        this._errors[fieldName] = `Maksimum ${rules.maxLength} karaktera`;
        return false;
      }
    }
    
    delete this._errors[fieldName];
    return true;
  }

  _displayErrors() {
    Object.keys(this._errors).forEach(field => this._displayFieldError(field));
  }

  _displayFieldError(fieldName) {
    const input = this._form.querySelector(`[name="${fieldName}"]`);
    const errorEl = this._form.querySelector(`[data-error-for="${fieldName}"]`);
    
    if (input) {
      input.classList.toggle('error', !!this._errors[fieldName]);
      input.setAttribute('aria-invalid', !!this._errors[fieldName]);
    }
    
    if (errorEl) {
      errorEl.textContent = this._errors[fieldName] || '';
      errorEl.classList.toggle('visible', !!this._errors[fieldName]);
    }
  }

  _setSubmitButtonState(loading) {
    const btn = this._form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = loading;
      btn.dataset.loading = loading ? 'true' : 'false';
    }
  }
}

// Export for backward compatibility (window global)
if (typeof window !== 'undefined') {
  window.ProductFormHandler = ProductFormHandler;
}
