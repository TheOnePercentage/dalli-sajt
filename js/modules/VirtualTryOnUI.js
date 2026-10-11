/**
 * Virtual Try-On UI Component
 * 
 * Handles all UI rendering and user interactions for the VTO modal.
 */

export class VirtualTryOnUI {
  constructor(controller) {
    this.controller = controller;
    this.modal = null;
    this.currentStep = 'idle';
  }

  async init() {
    // Create modal DOM structure
    this._createModal();
  }

  _createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'vto-modal hidden';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'vto-title');
    this.modal.innerHTML = this._getModalHTML();
    document.body.appendChild(this.modal);
    this._bindEvents();
  }

  _getModalHTML() {
    return `
      <div class="vto-modal__backdrop" data-vto-action="close"></div>
      <div class="vto-modal__panel">
        <header class="vto-modal__header">
          <h2 id="vto-title" class="vto-modal__title">Virtual Fitting Room</h2>
          <button class="vto-modal__close" data-vto-action="close" aria-label="Zatvori">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>
        <div class="vto-modal__content">
          <!-- Step 1: Privacy Consent -->
          <section class="vto-step" data-step="consent" hidden>
            <div class="vto-step__icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>Vaša privatnost je važna</h3>
            <p>Vaša fotografija se koristi isključivo za generisanje virtualne probi. Ne čuvamo je na serverima. Nakon 30 minuta bude automatski obrisana.</p>
            <div class="vto-step__consent">
              <label class="vto-consent">
                <input type="checkbox" id="vto-privacy-consent" required>
                <span class="vto-consent__text">Prihvaćam uslove korišćenja i politiku privatnosti</span>
              </label>
            </div>
            <button class="btn btn-primary btn-lg" data-vto-action="consent-given" disabled>Nastavi</button>
          </section>

          <!-- Step 2: Photo Upload -->
          <section class="vto-step" data-step="upload" hidden>
            <div class="vto-step__icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            </div>
            <h3>Dodajte svoju fotografiju</h3>
            <p>Za najbolje rezultate: dobro osvetljeno lice, neutralna poza, čista pozadina.</p>
            <div class="vto-upload-area" id="vto-upload-area">
              <input type="file" id="vto-file-input" accept="image/jpeg,image/png,image/webp" capture="environment" hidden>
              <button class="vto-upload-btn" type="button" data-vto-action="camera">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>Kamera</span>
              </button>
              <button class="vto-upload-btn vto-upload-btn--secondary" type="button" data-vto-action="gallery">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/></svg>
                <span>Galerija</span>
              </button>
              <p class="vto-upload-hint">JPG, PNG, WebP do 10MB</p>
            </div>
            <div class="vto-upload-preview hidden" id="vto-preview">
              <img id="vto-preview-img" alt="Vaša fotografija">
              <button class="vto-btn-reset" data-vto-action="reset-upload" aria-label="Obriši fotografiju">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <button class="btn btn-primary btn-lg" data-vto-action="generate" disabled>Generiši probu</button>
          </section>

          <!-- Step 3: Preview -->
          <section class="vto-step" data-step="preview" hidden>
            <h3>Vaša fotografija je spremna</h3>
            <div class="vto-preview-large">
              <img id="vto-preview-large-img" alt="Vaša fotografija za virtualnu probu">
            </div>
            <p class="vto-preview-note">Proizvod će biti prilagođen vašoj poziciji tela.</p>
            <button class="btn btn-primary btn-lg" data-vto-action="generate">Generiši virtualnu probu</button>
            <button class="btn btn-secondary" data-vto-action="change-photo">Promeni fotografiju</button>
          </section>

          <!-- Step 4: Generation Progress -->
          <section class="vto-step" data-step="generating" hidden>
            <div class="vto-generation">
              <div class="vto-progress-ring">
                <svg class="vto-progress-svg" viewBox="0 0 64 64">
                  <circle class="vto-progress-bg" cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4"/>
                  <circle class="vto-progress-bar" cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="176" stroke-dashoffset="176" style="transform: rotate(-90deg); transform-origin: 32px 32px;"/>
                </svg>
                <span class="vto-progress-percent">0%</span>
              </div>
              <p class="vto-generation-message" id="vto-progress-message">Priprema modela...</p>
              <div class="vto-progress-steps" id="vto-progress-steps"></div>
            </div>
            <button class="btn btn-secondary" data-vto-action="cancel-generation" hidden>Otkaži</button>
          </section>

          <!-- Step 5: Result -->
          <section class="vto-step" data-step="result" hidden>
            <h3>Vaša virtualna proba je spremna!</h3>
            <div class="vto-result-comparison">
              <div class="vto-result-panel">
                <h4>Original</h4>
                <img id="vto-result-original" alt="Vaša originalna fotografija">
              </div>
              <div class="vto-result-panel">
                <h4>Sa proizvodom</h4>
                <img id="vto-result-generated" alt="Virtualna proba">
              </div>
            </div>
            <div class="vto-result-actions">
              <button class="btn btn-primary" data-vto-action="add-to-cart">Dodaj u korpu</button>
              <button class="btn btn-secondary" data-vto-action="retry">Pokušaj ponovo</button>
              <button class="btn btn-ghost" data-vto-action="share">Podeli</button>
            </div>
          </section>

          <!-- Error State -->
          <section class="vto-step" data-step="error" hidden>
            <div class="vto-error" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h3>Došlo je do greške</h3>
            <p id="vto-error-message">Pokušajte ponovo ili kontaktirajte podršku.</p>
            <div class="vto-error-actions">
              <button class="btn btn-primary" data-vto-action="retry">Pokušaj ponovo</button>
              <button class="btn btn-secondary" data-vto-action="upload">Druga slika</button>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  _bindEvents() {
    if (!this.modal) return;

    // Consent
    this.modal.querySelector('[data-vto-action="consent-given"]')?.addEventListener('click', () => {
      this.controller.onConsentGiven();
    });

    // Privacy checkbox enables button
    const checkbox = this.modal.querySelector('#vto-privacy-consent');
    const consentBtn = this.modal.querySelector('[data-vto-action="consent-given"]');
    if (checkbox && consentBtn) {
      checkbox.addEventListener('change', () => {
        consentBtn.disabled = !checkbox.checked;
      });
    }

    // Upload actions
    this.modal.querySelector('[data-vto-action="camera"]')?.addEventListener('click', () => {
      this._openCamera();
    });
    this.modal.querySelector('[data-vto-action="gallery"]')?.addEventListener('click', () => {
      this._openGallery();
    });
    this.modal.querySelector('#vto-file-input')?.addEventListener('change', (e) => {
      if (e.target.files[0]) this.controller.onImageUploaded(e.target.files[0]);
    });
    this.modal.querySelector('[data-vto-action="reset-upload"]')?.addEventListener('click', () => {
      this._resetUpload();
    });

    // Generate
    this.modal.querySelector('[data-vto-action="generate"]')?.addEventListener('click', () => {
      this.controller.startGeneration();
    });

    // Result actions
    this.modal.querySelector('[data-vto-action="retry"]')?.addEventListener('click', () => {
      this.controller.retryGeneration();
    });
    this.modal.querySelector('[data-vto-action="change-photo"]')?.addEventListener('click', () => {
      this.showStep('upload');
      this._resetUpload();
    });
    this.modal.querySelector('[data-vto-action="cancel-generation"]')?.addEventListener('click', () => {
      this.controller.abortController?.abort();
    });

    // Close/Cancel
    this.modal.querySelector('[data-vto-action="close"]')?.addEventListener('click', () => {
      this.controller.close();
    });
    this.modal.querySelector('[data-vto-action="cancel-generation"]')?.addEventListener('click', () => {
      this.controller.abortController?.abort();
    });
    this.modal.querySelector('.vto-modal__backdrop')?.addEventListener('click', () => {
      this.controller.close();
    });

    // Keyboard
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.controller.close();
    });
  }

  _openCamera() {
    const input = this.modal.querySelector('#vto-file-input');
    if (input) {
      input.capture = 'environment';
      input.click();
    }
  }

  _openGallery() {
    const input = this.modal.querySelector('#vto-file-input');
    if (input) {
      input.removeAttribute('capture');
      input.click();
    }
  }

  _resetUpload() {
    const preview = this.modal.querySelector('#vto-preview');
    const area = this.modal.querySelector('#vto-upload-area');
    const input = this.modal.querySelector('#vto-file-input');
    const generateBtn = this.modal.querySelector('[data-vto-action="generate"]');
    
    if (preview) preview.classList.add('hidden');
    if (area) area.classList.remove('hidden');
    if (input) input.value = '';
    if (generateBtn) generateBtn.disabled = true;
  }

  // ==================== PUBLIC API ====================

  openModal() {
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => this.modal.classList.add('open'));
  }

  closeModal() {
    this.modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => this.modal.classList.add('hidden'), 300);
  }

  showStep(step, data) {
    this.currentStep = step;
    this.modal.querySelectorAll('.vto-step').forEach(el => el.hidden = true);
    const stepEl = this.modal.querySelector(`[data-step="${step}"]`);
    if (stepEl) stepEl.hidden = false;

    if (step === 'preview' && data) {
      const img = this.modal.querySelector('#vto-preview-img');
      const largeImg = this.modal.querySelector('#vto-preview-large-img');
      if (img) img.src = data;
      if (largeImg) largeImg.src = data;
    }

    if (step === 'result' && data) {
      const originalImg = this.modal.querySelector('#vto-result-original');
      const generatedImg = this.modal.querySelector('#vto-result-generated');
      if (originalImg && this.controller.userImageUrl) originalImg.src = this.controller.userImageUrl;
      if (generatedImg && data.resultImageUrl) generatedImg.src = data.resultImageUrl;
    }

    if (step === 'generating') {
      this._initProgressSteps();
    }

    if (step === 'error' && data) {
      const msgEl = this.modal.querySelector('#vto-error-message');
      if (msgEl) msgEl.textContent = data;
    }
  }

  _initProgressSteps() {
    const container = this.modal.querySelector('#vto-progress-steps');
    if (!container) return;
    
    const stages = this.controller.ai?.mockStages || [
      { stage: 'preparing', progress: 10, message: 'Priprema modela...' },
      { stage: 'analyzing', progress: 30, message: 'Analiza pozicije tela...' },
      { stage: 'fitting', progress: 55, message: 'Prilagođavanje odeće...' },
      { stage: 'rendering', progress: 80, message: 'Renderovanje tkanine...' },
      { stage: 'finalizing', progress: 95, message: 'Finishing touches...' },
      { stage: 'complete', progress: 100, message: 'Završeno!' }
    ];

    container.innerHTML = stages.map((stage, i) => `
      <div class="vto-progress-step" data-stage="${stage.stage}">
        <span class="vto-progress-step__number">${i + 1}</span>
        <span class="vto-progress-step__message">${stage.message}</span>
      </div>
    `).join('');
  }

  updateProgress(percent, message) {
    const bar = this.modal.querySelector('.vto-progress-bar');
    const percentEl = this.modal.querySelector('.vto-progress-percent');
    const msg = this.modal.querySelector('.vto-generation-message');
    
    if (bar) bar.style.strokeDashoffset = 176 * (1 - percent / 100);
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    if (msg && message) msg.textContent = message;

    // Update step indicators
    const steps = this.modal.querySelectorAll('.vto-progress-step');
    steps.forEach((step, i) => {
      const stageProgress = [10, 30, 55, 80, 95, 100][i];
      if (percent >= stageProgress) step.classList.add('completed');
      else step.classList.remove('completed');
    });
  }

  showError(message) {
    this.showStep('error', message);
  }

  destroy() {
    this.modal?.remove();
    this.modal = null;
  }
}

export default VirtualTryOnUI;