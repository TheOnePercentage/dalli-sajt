/**
 * Product 360° Viewer - UI Component
 * 
 * Handles all UI rendering and user interactions for the 360° product viewer.
 * Modal-based fullscreen experience with touch/mouse support.
 */

export class Product360UI {
  constructor(controller) {
    this.controller = controller;
    this.modal = null;
    this.currentStep = 'idle';
    this.currentFrame = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartFrame = 0;
    this.touchStartX = 0;
    this.touchStartFrame = 0;
    this.isDragging = false;
  }

  async init() {
    this._createModal();
  }

  _createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'p360-modal hidden';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'p360-title');
    this.modal.innerHTML = this._getModalHTML();
    document.body.appendChild(this.modal);
    this._bindEvents();
  }

  _getModalHTML() {
    return `
      <div class="p360-modal__backdrop" data-p360-action="close"></div>
      <div class="p360-modal__panel">
        <header class="p360-modal__header">
          <h2 id="p360-title" class="p360-modal__title">360° Pregled</h2>
          <div class="p360-modal__controls">
            <button class="p360-btn p360-btn--icon" data-p360-action="reset" aria-label="Resetuj pogled" title="Resetuj pogled (R)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0"/><path d="M3 12h14"/></svg>
            </button>
            <button class="p360-btn p360-btn--icon" data-p360-action="fullscreen" aria-label="Puni ekran" title="Puni ekran (F)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 13v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"/></svg>
            </button>
            <button class="p360-btn p360-btn--icon" data-p360-action="close" aria-label="Zatvori">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </header>

        <div class="p360-modal__content">
          <!-- Step 1: Main Viewer -->
          <section class="p360-step" data-step="viewer" hidden>
            <div class="p360-viewer">
              <div class="p360-viewer__canvas" id="p360-canvas">
                <img id="p360-image" src="" alt="" class="p360-image" loading="eager" decoding="async">
                <div class="p360-loader hidden" id="p360-loader">
                  <svg class="p360-spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg>
                </div>
              </div>
              
              <!-- Navigation hints -->
              <div class="p360-hints" id="p360-hints">
                <span class="p360-hint p360-hint--swipe" data-device="mobile">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M21 12l-4.35-4.35"/></svg>
                  <span>Swipe to rotate</span>
                </span>
                <span class="p360-hint p360-hint--drag" data-device="desktop">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
                  <span>Drag to rotate</span>
                </span>
              </div>
              
              <!-- Navigation arrows -->
              <button class="p360-nav p360-nav--prev" data-p360-action="prev" aria-label="Prethodni ugao (Leva strelica)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button class="p360-nav p360-nav--next" data-p360-action="next" aria-label="Sledeći ugao (Desna strelica)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            
            <!-- Controls -->
            <div class="p360-controls">
              <div class="p360-frame-indicator">
                <span id="p360-current-frame">1</span>
                <span class="p360-frame-separator">/</span>
                <span id="p360-total-frames">36</span>
              </div>
              <div class="p360-actions">
                <button class="p360-btn p360-btn--secondary" data-p360-action="reset" title="Resetuj (R)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0"/><path d="M3 12h14"/></svg>
                  <span>Reset</span>
                </button>
                <button class="p360-btn p360-btn--primary" data-p360-action="fullscreen">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 13v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"/></svg>
                  <span>Fullscreen</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Loading State -->
          <section class="p360-step" data-step="loading" hidden>
            <div class="p360-loading">
              <div class="p360-spinner">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg>
              </div>
              <p class="p360-loading-text" id="p360-loading-text">Učitavanje 360° pregleda...</p>
              <div class="p360-progress" id="p360-progress">
                <div class="p360-progress-bar" id="p360-progress-bar"></div>
              </div>
            </div>
          </section>

          <!-- Error State -->
          <section class="p360-step" data-step="error" hidden>
            <div class="p360-error">
              <div class="p360-error__icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <h3>Došlo je do greške</h3>
              <p id="p360-error-message">Ne mogu da učitam 360° pregled. Pokušajte ponovo.</p>
              <div class="p360-error__actions">
                <button class="btn btn-primary" data-p360-action="retry">Pokušaj ponovo</button>
                <button class="btn btn-secondary" data-p360-action="back">Nazad</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    if (!this.modal) return;

    // Navigation arrows
    this.modal.querySelector('[data-p360-action="prev"]')?.addEventListener('click', () => {
      this.controller.goToFrame(this.controller.currentFrame - 1);
    });
    this.modal.querySelector('[data-p360-action="next"]')?.addEventListener('click', () => {
      this.controller.goToFrame(this.controller.currentFrame + 1);
    });

    // Controls
    this.modal.querySelector('[data-p360-action="reset"]')?.addEventListener('click', () => {
      this.controller.resetView();
    });
    this.modal.querySelector('[data-p360-action="fullscreen"]')?.addEventListener('click', () => {
      this.controller.toggleFullscreen();
    });
    this.modal.querySelector('[data-p360-action="close"]')?.addEventListener('click', () => {
      this.controller.close();
    });
    this.modal.querySelector('[data-p360-action="retry"]')?.addEventListener('click', () => {
      this.controller.retry();
    });

    // Close handlers
    this.modal.querySelector('[data-p360-action="close"]')?.addEventListener('click', () => {
      this.controller.close();
    });
    this.modal.querySelector('.p360-modal__backdrop')?.addEventListener('click', () => {
      this.controller.close();
    });

    // Touch/mouse drag on image
    const canvas = this.modal.querySelector('#p360-canvas');
    if (canvas) {
      let isDragging = false;
      let startX = 0;
      let startFrame = 0;

      const onPointerDown = (e) => {
        if (e.target.closest('[data-p360-action]')) return;
        this.isDragging = true;
        this.dragStartX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        this.dragStartFrame = this.controller.currentFrame;
        this.stopAnimation();
        document.body.style.cursor = 'grabbing';
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp);
      };

      const onPointerMove = (e) => {
        if (!this.isDragging) return;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const delta = this.dragStartX - clientX;
        const frames = Math.round(delta / 8); // 8px per frame
        const newFrame = (this.dragStartFrame - frames + this.controller.frameCount) % this.controller.frameCount;
        this.controller.currentFrame = newFrame;
        this.updateFrame(this.currentFrame);
      };

      const onPointerUp = () => {
        this.isDragging = false;
        document.body.style.cursor = '';
        document.removeEventListener('pointermove', this.onPointerMove);
        document.removeEventListener('pointerup', this.onPointerUp);
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('touchstart', (e) => onPointerDown(e), { passive: true });
    }

    // Keyboard navigation
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.controller.close();
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.controller.goToFrame(this.controller.currentFrame - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.controller.goToFrame(this.controller.currentFrame + 1); }
      if (e.key === 'Home') { e.preventDefault(); this.controller.goToFrame(0); }
      if (e.key === 'End') { e.preventDefault(); this.controller.goToFrame(this.controller.frameCount - 1); }
      if (e.key === 'Escape') this.controller.close();
      if (e.key === 'f' || e.key === 'F') this.controller.toggleFullscreen();
      if (e.key === 'r' || e.key === 'R') this.controller.resetView();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.controller.close();
      }
    });

    // Touch swipe support
    let touchStartX = 0;
    let touchStartFrame = 0;
    
    this.modal.addEventListener('touchstart', (e) => {
      if (e.target.closest('[data-p360-action]')) return;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartFrame = this.controller.currentFrame;
      this.stopAnimation();
    }, { passive: true });

    this.modal.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const deltaX = this.touchStartX - e.touches[0].clientX;
      const frames = Math.round(deltaX / 8);
      const newFrame = (this.touchStartFrame - frames + this.controller.frameCount) % this.controller.frameCount;
      this.controller.currentFrame = newFrame;
      this.updateFrame(this.currentFrame);
    }, { passive: false });

    this.modal.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.modal.classList.contains('hidden')) return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); this.controller.goToFrame(this.controller.currentFrame - 1); break;
        case 'ArrowRight': e.preventDefault(); this.controller.goToFrame(this.controller.currentFrame + 1); break;
        case 'Home': e.preventDefault(); this.controller.goToFrame(0); break;
        case 'End': e.preventDefault(); this.controller.goToFrame(this.controller.frameCount - 1); break;
        case 'Escape': this.controller.close(); break;
        case 'f': case 'F': this.controller.toggleFullscreen(); break;
        case 'r': case 'R': this.controller.resetView(); break;
      }
    });
  }

  /**
   * Open the modal
   */
  open() {
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => this.modal.classList.add('open'));
  }

  /**
   * Close the modal
   */
  close() {
    this.modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => this.modal.classList.add('hidden'), 300);
  }

  /**
   * Show a specific step
   */
  showStep(step, data = {}) {
    this.currentStep = step;
    this.modal.querySelectorAll('.p360-step').forEach(el => el.hidden = true);
    const stepEl = this.modal.querySelector(`[data-step="${step}"]`);
    if (stepEl) stepEl.hidden = false;

    if (step === 'viewer' && data) {
      this._updateImage(data.frame);
    }
    if (step === 'loading' && data) {
      this.modal.querySelector('#p360-loading-text').textContent = data.message || 'Učitavanje...';
    }
  }

  /**
   * Update displayed frame
   */
  updateFrame(frame) {
    this.currentFrame = frame;
    const img = document.getElementById('p360-image');
    const frameEl = document.getElementById('p360-current-frame');
    const totalEl = document.getElementById('p360-total-frames');
    
    if (img && this.controller.images[frame]) {
      img.src = this.controller.images[frame];
      img.alt = `Ugao ${frame + 1} od ${this.controller.frameCount}`;
    }
    if (frameEl) frameEl.textContent = frame + 1;
    if (totalEl) totalEl.textContent = this.controller.frameCount;
  }

  /**
   * Track event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _track(event, data) {
    this.controller._track?.(`ui_${event}`, data);
  }

  open() {
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => this.modal.classList.add('open'));
  }

  close() {
    this.modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => this.modal.classList.add('hidden'), 300);
  }

  destroy() {
    this.modal?.remove();
    this.modal = null;
  }
}

export default Product360UI;