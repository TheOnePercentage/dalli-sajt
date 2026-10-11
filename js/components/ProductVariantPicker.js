/**
 * ProductVariantPicker - Handles color/size variant selection with stock per combination
 * Mount: Automatically initializes on elements with [data-variant-picker]
 */

export class ProductVariantPicker {
  constructor(container) {
    this.container = container;
    this.colorSwatches = Array.from(container.querySelectorAll('.color-swatch'));
    this.sizeButtons = Array.from(container.querySelectorAll('.size-btn'));
    this.variantStockData = container.querySelector('.variant-stock-data');
    this.colorImagesData = container.querySelector('.color-images');
    this.selectedColorDisplay = container.querySelector('#selectedColorDisplay');
    this.selectedSizeDisplay = container.querySelector('#selectedSizeDisplay');
    this.selectedStockDisplay = container.querySelector('#selectedStockDisplay');
    this.mainImage = document.querySelector('[data-gallery-main] img');
    this.galleryThumbs = Array.from(document.querySelectorAll('[data-gallery-thumb]'));

    this.variantStocks = {};
    this.colorImages = {};
    this.selectedColor = null;
    this.selectedSize = null;
    this.sizeStockMap = {};

    this.init();
  }

  init() {
    if (this.colorSwatches.length === 0 || this.sizeButtons.length === 0) return;

    // Parse variant stock data
    const stockEl = document.querySelector('.variant-stock-data');
    if (stockEl) {
      try {
        this.variantStocks = JSON.parse(stockEl.dataset.variants || '{}');
      } catch (e) {
        console.warn('Failed to parse variant stock data:', e);
      }
    }

    // Parse color images
    const imagesEl = document.querySelector('.color-images');
    if (imagesEl) {
      try {
        this.colorImages = JSON.parse(imagesEl.dataset.images || '{}');
      } catch (e) {
        console.warn('Failed to parse color images:', e);
      }
    }

    this.bindEvents();
    this.updateSizeAvailability();
  }

  bindEvents() {
    // Color swatch selection
    this.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => this.selectColor(swatch));
      swatch.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectColor(swatch);
        }
      });
    });

    // Size button selection
    this.sizeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.selectSize(btn));
      btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectSize(btn);
        }
      });
    });
  }

  selectColor(swatch) {
    this.colorSwatches.forEach(s => {
      s.classList.remove('active', 'selected');
      s.removeAttribute('aria-selected');
      s.setAttribute('aria-pressed', 'false');
    });
    swatch.classList.add('active', 'selected');
    swatch.setAttribute('aria-selected', 'true');
    swatch.setAttribute('aria-pressed', 'true');

    this.selectedColor = swatch.dataset.color;
    if (this.selectedColorDisplay) this.selectedColorDisplay.textContent = swatch.dataset.color;
    this.sizeButtons.forEach(btn => {
      btn.dataset.color = this.selectedColor;
    });

    // Update main image to color's main image
    const colorImage = swatch.dataset.image;
    if (colorImage && this.mainImage) {
      this.mainImage.src = colorImage;
      this.mainImage.dataset.full = colorImage;
    }

    // Update thumbnails to match color
    this.updateThumbnailsForColor(swatch.dataset.color);

    // Update size availability for this color
    this.updateSizeAvailability();

    // Update selected variant display
    this.updateSelectedVariantDisplay();
  }

  selectSize(button) {
    this.sizeButtons.forEach(b => {
      b.classList.remove('active', 'selected');
      b.removeAttribute('aria-selected');
    });
    button.classList.add('active', 'selected');
    button.setAttribute('aria-selected', 'true');

    this.selectedSize = button.dataset.size;
    if (this.selectedSizeDisplay) this.selectedSizeDisplay.textContent = button.dataset.size;

    this.updateSelectedVariantDisplay();
  }

  updateSizeAvailability() {
    if (!this.selectedColor) {
      // No variant data — leave buttons as rendered in HTML
      if (Object.keys(this.variantStocks).length === 0) return;
      // Enable all sizes that have stock in any color combination
      const stockPerSize = {};
      Object.keys(this.variantStocks).forEach(key => {
        const parts = key.split('|');
        if (parts.length !== 2) return;
        stockPerSize[parts[1]] = (stockPerSize[parts[1]] || 0) + this.variantStocks[key];
      });
      this.sizeStockMap = stockPerSize;
      this.sizeButtons.forEach(btn => {
        const size = btn.dataset.size;
        const hasStock = stockPerSize[size] > 0;
        btn.disabled = !hasStock;
        btn.classList.toggle('unavailable', !hasStock);
        if (hasStock) {
          btn.dataset.stock = stockPerSize[size];
        }
      });
      return;
    }

    // Calculate stock per size for selected color
    this.sizeStockMap = {};
    this.sizeButtons.forEach(btn => {
      const size = btn.dataset.size;
      const stock = this.getStockForVariant(this.selectedColor, size);
      this.sizeStockMap[size] = stock;

      if (stock > 0) {
        btn.disabled = false;
        btn.classList.remove('unavailable');
        btn.dataset.stock = stock;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
      } else {
        btn.disabled = true;
        btn.classList.add('unavailable');
        btn.setAttribute('disabled', '');
        btn.setAttribute('aria-disabled', 'true');
        btn.removeAttribute('data-stock');
      }
    });

    // Auto-select first available size if current is unavailable
    const currentSizeBtn = this.container.querySelector('.size-btn.active');
    if (currentSizeBtn && currentSizeBtn.disabled) {
      currentSizeBtn.classList.remove('active', 'selected');
      currentSizeBtn.removeAttribute('aria-selected');
      const firstAvailable = Array.from(this.sizeButtons).find(b => !b.disabled);
      if (firstAvailable) {
        this.selectSize(firstAvailable);
      } else {
        this.selectedSize = null;
        if (this.selectedSizeDisplay) this.selectedSizeDisplay.textContent = '—';
        this.updateSelectedVariantDisplay();
      }
    }
  }

  getStockForVariant(color, size) {
    // Check variantStocks for exact color+size combination
    const key = `${color}|${size}`;
    if (this.variantStocks[key] !== undefined) {
      return this.variantStocks[key];
    }

    // Fallback: check if we have size stock in sizes array
    // This is a simplified fallback - in real implementation,
    // variantStocks should have all combinations
    return 0;
  }

  updateThumbnailsForColor(color) {
    const colorImages = this.colorImages[color];
    if (!colorImages || !colorImages.length) return;

    // Update main image
    if (this.mainImage && this.colorImages[color][0]) {
      const newSrc = this.colorImages[color][0];
      this.mainImage.src = newSrc;
      this.mainImage.dataset.full = newSrc;
    }

    // Update thumbnails
    if (this.colorImages[color].length === this.galleryThumbs.length) {
      this.colorImages[color].forEach((src, i) => {
        const thumb = this.galleryThumbs[i];
        if (thumb) {
          thumb.src = src;
          thumb.dataset.src = src;
          thumb.dataset.full = src;
          const img = thumb.querySelector('img');
          if (img) {
            img.src = src;
            img.alt = `Slika ${i + 1}`;
          }
        }
      });
    }
  }

  updateSelectedVariantDisplay() {
    if (!this.selectedStockDisplay) return;
    if (this.selectedColor && this.selectedSize) {
      const stock = this.getStockForVariant(this.selectedColor, this.selectedSize);
      this.selectedStockDisplay.innerHTML =
        stock > 0
          ? `<span style="color: var(--color-success);">✓ Na stanju: ${stock} kom.</span>`
          : '<span style="color: var(--color-error);">Nije na stanju</span>';
    } else if (this.selectedColor) {
      this.selectedStockDisplay.innerHTML =
        '<span style="color: var(--color-text-tertiary);">Izaberite veličinu</span>';
    } else {
      this.selectedStockDisplay.innerHTML = '';
    }
  }
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
  const pickers = document.querySelectorAll('[data-variant-picker]');
  pickers.forEach(el => new ProductVariantPicker(el));
});

export default ProductVariantPicker;
