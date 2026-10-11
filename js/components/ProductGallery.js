export class ProductGallery {
  constructor(container, options) {
    this.container = container;
    this.mainImage = container.querySelector('[data-gallery-main]');
    this.thumbnails = Array.from(container.querySelectorAll('[data-gallery-thumb]'));
    this.zoomEnabled = options.zoomEnabled !== false;
    this.fullscreenEnabled = options.fullscreenEnabled !== false;
    this.currentIndex = 0;
    this.isZoomed = false;
    this.isFullscreen = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartDist = 0;
    this.lastTouchTime = 0;
    this.pinchStartScale = 1;

    this.images = this.thumbnails.map(function (thumb, i) {
      return {
        src: thumb.dataset.full || thumb.dataset.src || thumb.src,
        thumb: thumb.src,
        alt: thumb.alt || '',
        index: i,
      };
    });

    if (this.images.length === 0 && this.mainImage) {
      this.images = [
        {
          src: this.mainImage.dataset.full || this.mainImage.src,
          thumb: this.mainImage.src,
          alt: this.mainImage.alt || '',
          index: 0,
        },
      ];
    }

    this.init();
  }

  init() {
    if (this.images.length <= 1) {
      this.thumbnails.forEach(function (t) {
        t.style.display = 'none';
      });
      return;
    }

    this.bindEvents();
    this.updateActiveThumbnail();
    this.setupThumbnailNavigation();
  }

  bindEvents() {
    this.thumbnails.forEach((thumb, index) => {
      thumb.addEventListener('click', () => this.goTo(index));
      thumb.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.goTo(index);
        }
      });
    });

    if (this.fullscreenEnabled && this.mainImage) {
      this.mainImage.addEventListener('click', () => this.openFullscreen());
    }

    if (this.zoomEnabled && this.mainImage) {
      this.mainImage.parentElement.addEventListener('mousemove', e => this.handleZoom(e));
      this.mainImage.parentElement.addEventListener('mouseleave', () => this.disableZoom());
    }

    if (this.zoomEnabled && this.mainImage) {
      this.mainImage.parentElement.addEventListener('touchstart', e => this.handleTouchStart(e), {
        passive: false,
      });
      this.mainImage.parentElement.addEventListener('touchmove', e => this.handleTouchMove(e), {
        passive: false,
      });
      this.mainImage.parentElement.addEventListener('touchend', e => this.handleTouchEnd(e), {
        passive: false,
      });
    }

    document.addEventListener('keydown', e => this.handleKeydown(e));

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) this.isFullscreen = false;
    });
  }

  setupThumbnailNavigation() {
    var thumbsContainer = this.container.querySelector('.product-thumbnails');
    if (!thumbsContainer) return;

    this.thumbnails.forEach(thumb => {
      thumb.style.scrollSnapAlign = 'center';
    });

    this.thumbnails.forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
    });
  }

  goTo(index) {
    if (index < 0 || index >= this.images.length) return;
    this.currentIndex = index;
    this.updateMainImage();
    this.updateActiveThumbnail();
    this.scrollThumbnailIntoView();
  }

  next() {
    this.goTo((this.currentIndex + 1) % this.images.length);
  }

  prev() {
    this.goTo((this.currentIndex - 1 + this.images.length) % this.images.length);
  }

  scrollThumbnailIntoView() {
    var activeThumb = this.thumbnails[this.currentIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  updateMainImage() {
    var img = this.images[this.currentIndex];
    if (!this.mainImage || !img) return;

    var src = img.src;
    var srcset = img.srcset || '';

    if (this.mainImage.tagName === 'IMG') {
      this.mainImage.src = src;
      if (srcset) this.mainImage.srcset = srcset;
      this.mainImage.alt = img.alt || '';
    } else if (this.mainImage.tagName === 'SOURCE') {
      this.mainImage.srcset = srcset || src;
    }

    var schemaImage = document.querySelector('[itemprop="image"]');
    if (schemaImage) schemaImage.content = 'https://dalli.rs' + src;

    this.updateActiveThumbnail();
  }

  updateActiveThumbnail() {
    this.thumbnails.forEach((thumb, i) => {
      thumb.classList.toggle('active', i === this.currentIndex);
      thumb.setAttribute('aria-current', i === this.currentIndex ? 'true' : 'false');
    });
  }

  handleZoom(e) {
    var container = e.currentTarget;
    var rect = container.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) * 100;
    var y = ((e.clientY - rect.top) / rect.height) * 100;

    if (this.mainImage) {
      this.mainImage.style.transformOrigin = x + '% ' + y + '%';
      this.mainImage.style.transform = 'scale(2)';
      this.isZoomed = true;
    }
  }

  disableZoom() {
    if (this.mainImage) {
      this.mainImage.style.transform = 'scale(1)';
      this.mainImage.style.transformOrigin = 'center center';
      this.isZoomed = false;
    }
  }

  handleTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      var touch1 = e.touches[0];
      var touch2 = e.touches[1];
      this.touchStartDist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      this.pinchStartScale = 1;
      this.isZoomed = true;
    } else if (e.touches.length === 1) {
      var now = Date.now();
      if (now - this.lastTouchTime < 300) {
        e.preventDefault();
        this.toggleZoom();
      }
      this.lastTouchTime = now;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  }

  handleTouchMove(e) {
    if (e.touches.length === 2 && this.isZoomed) {
      e.preventDefault();
      var touch1 = e.touches[0];
      var touch2 = e.touches[1];
      var currentDist = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      var scale = this.pinchStartScale * (currentDist / this.touchStartDist);
      var newScale = Math.min(Math.max(scale, 1), 4);

      if (this.mainImage) {
        this.mainImage.style.transformOrigin = 'center center';
        this.mainImage.style.transform = 'scale(' + newScale + ')';
      }
    } else if (e.touches.length === 1 && this.isZoomed) {
      e.preventDefault();
      var container = this.mainImage.parentElement;
      var rect = container.getBoundingClientRect();
      var x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      var y = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
      this.mainImage.style.transformOrigin = x + '% ' + y + '%';
    }
  }

  handleTouchEnd(e) {
    if (e.touches.length < 2) {
      if (this.mainImage && this.isZoomed) {
        var currentScale = this.getCurrentScale();
        if (currentScale <= 1.1) {
          this.disableZoom();
        }
      }
    }
  }

  getCurrentScale() {
    if (!this.mainImage) return 1;
    var transform = this.mainImage.style.transform;
    var match = transform.match(/scale\(([\d.]+)\)/);
    return match ? parseFloat(match[1]) : 1;
  }

  toggleZoom() {
    if (this.isZoomed) {
      this.disableZoom();
    } else if (this.mainImage) {
      this.mainImage.style.transformOrigin = 'center center';
      this.mainImage.style.transform = 'scale(2)';
      this.isZoomed = true;
    }
  }

  openFullscreen() {
    var fsContainer = this.createFullscreenContainer();
    document.body.appendChild(fsContainer);

    try {
      fsContainer.requestFullscreen();
      this.isFullscreen = true;
      this.setupFullscreenEvents(fsContainer);
    } catch (e) {
      fsContainer.remove();
      console.warn('Fullscreen failed:', e);
    }
  }

  createFullscreenContainer() {
    var container = document.createElement('div');
    container.className = 'gallery-fullscreen';
    container.innerHTML =
      '<button class="fs-close" aria-label="Zatvori puni ekran" aria-label="Close fullscreen">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button>' +
      '<button class="fs-nav fs-prev" aria-label="Prethodna slika">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>' +
      '</button>' +
      '<button class="fs-nav fs-next" aria-label="Sledeća slika">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
      '</button>' +
      '<div class="fs-counter" aria-live="polite">' +
      String(this.currentIndex + 1) +
      ' / ' +
      String(this.images.length) +
      '</div>' +
      '<div class="fs-images"></div>';

    var imagesContainer = container.querySelector('.fs-images');
    this.images.forEach((img, i) => {
      var fig = document.createElement('figure');
      fig.style.display = i === this.currentIndex ? 'block' : 'none';
      fig.innerHTML =
        '<img src="' +
        img.src +
        '" alt="' +
        img.alt +
        '" style="max-width:100%;max-height:90vh;object-fit:contain;">';
      imagesContainer.appendChild(fig);
    });

    container.querySelector('.fs-close').addEventListener('click', () => {
      this.closeFullscreen(container);
    });
    container.querySelector('.fs-prev').addEventListener('click', () => {
      this.prevFullscreen(container);
    });
    container.querySelector('.fs-next').addEventListener('click', () => {
      this.nextFullscreen(container);
    });

    return container;
  }

  setupFullscreenEvents(container) {
    this.fsContainer = container;
    this.fsImages = Array.from(container.querySelectorAll('.fs-images figure'));

    container.addEventListener('click', e => {
      if (e.target === container) this.closeFullscreen(container);
    });

    document.addEventListener('keydown', e => {
      this.handleFullscreenKeydown(e, container);
    });
  }

  handleFullscreenKeydown(e, container) {
    if (e.key === 'Escape') this.closeFullscreen(container);
    else if (e.key === 'ArrowLeft') this.prevFullscreen(container);
    else if (e.key === 'ArrowRight') this.nextFullscreen(container);
  }

  nextFullscreen(container) {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateFullscreenView(container);
    this.updateMainImage();
  }

  prevFullscreen(container) {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateFullscreenView(container);
    this.updateMainImage();
  }

  updateFullscreenView(container) {
    if (!container) return;
    var images = container.querySelectorAll('.fs-images figure');
    images.forEach((fig, i) => {
      fig.style.display = i === this.currentIndex ? 'block' : 'none';
    });
    var counter = container.querySelector('.fs-counter');
    if (counter)
      counter.textContent = String(this.currentIndex + 1) + ' / ' + String(this.images.length);
    this.updateActiveThumbnail();
  }

  closeFullscreen(container) {
    if (document.fullscreenElement === container) {
      document.exitFullscreen().catch(function () {});
    }
    container.remove();
    this.isFullscreen = false;
  }

  handleKeydown(e) {
    if (this.isFullscreen) return;

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.next();
    } else if (e.key === 'Enter' && e.target.closest('[data-gallery-thumb]')) {
      e.preventDefault();
      var index = parseInt(e.target.closest('[data-gallery-thumb]').dataset.index, 10);
      this.goTo(index);
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var galleries = document.querySelectorAll('[data-product-gallery]');
  galleries.forEach(function (gallery) {
    new ProductGallery(gallery);
  });
});

export default ProductGallery;
