/**
 * Virtual Try-On Main Controller
 * 
 * Main orchestrator for the virtual try-on experience.
 * Handles state machine, coordinates UI, AI, and upload modules.
 */

export class VirtualTryOn {
  constructor() {
    this.productId = null;
    this.productData = null;
    this.config = null;
    this.userImage = null;
    this.userImageUrl = null;
    this.currentStep = 'idle';
    this.generationId = null;
    this.abortController = null;
    this.ui = null;
    this.ai = null;
    this.upload = null;
    this._resolveOnClose = null;
  }

  async init(productId, productData, vtoConfig) {
    this.productId = productId;
    this.productData = productData;
    this.config = vtoConfig;

    if (!vtoConfig?.eligible) {
      throw new Error('Product not eligible for virtual try-on');
    }

    await this._initModules();
    this._bindEvents();
    return this;
  }

  async open() {
    this.currentStep = 'consent';
    this.ui.openModal();
    this.ui.showStep('consent');
    this._track('vto_opened', { productId: this.productId });

    return new Promise((resolve) => {
      this._resolveOnClose = resolve;
    });
  }

  close() {
    this.ui.closeModal();
    this._cleanup();
    this.currentStep = 'idle';
    this._resolveOnClose?.();
  }

  destroy() {
    this.close();
    this.ui?.destroy();
    this.upload?.destroy();
    this.ai?.destroy();
    this._clearObjectUrls();
  }

  async onConsentGiven() {
    this.currentStep = 'upload';
    this.ui.showStep('upload');
    this._track('vto_consent_given', { productId: this.productId });
  }

  async onImageUploaded(file) {
    if (!this._validateImage(file)) {
      this.ui.showError('Invalid image format or size');
      return;
    }
    this.userImage = file;
    this.userImageUrl = URL.createObjectURL(file);
    this.currentStep = 'preview';
    this.ui.showStep('preview', this.userImageUrl);
    this._track('vto_image_uploaded', { productId: this.productId, fileSize: file.size });
  }

  async startGeneration() {
    this.currentStep = 'generating';
    this.abortController = new AbortController();
    this.ui.showStep('generating');
    this._track('vto_generation_started', { productId: this.productId });

    try {
      const result = await this.ai.generate({
        userImage: this.userImage,
        productImages: this.config.secondaryImages,
        modelType: this.config.modelType,
        fitGuide: this.config.fitGuide,
        signal: this.abortController.signal,
        onProgress: (progress) => this.ui.updateProgress(progress)
      });

      this.currentStep = 'result';
      this.ui.showStep('result', result);
      this._track('vto_generation_completed', { productId: this.productId, generationId: this.generationId });
    } catch (err) {
      if (err.name !== 'AbortError') {
        this.currentStep = 'error';
        this.ui.showError(err.message);
        this._track('vto_generation_failed', { productId: this.productId, error: err.message });
      }
    }
  }

  retryGeneration() {
    this.startGeneration();
  }

  async _initModules() {
    const [UI, AI, Upload] = await Promise.all([
      import('./VirtualTryOnUI.js'),
      import('./VirtualTryOnAI.js'),
      import('./VirtualTryOnUpload.jsx')
    ]);

    this.ui = new UI.default(this);
    this.ai = new AI.default(this.config);
    this.upload = new Upload.default(this);
  }

  _bindEvents() {
    this.ui.onConsent = () => this.onConsentGiven();
    this.ui.onUpload = (file) => this.onImageUploaded(file);
    this.ui.onGenerate = () => this.startGeneration();
    this.ui.onRetry = () => this.retryGeneration();
    this.ui.onClose = () => this.close();
    this.ui.onCancel = () => this.close();
  }

  _validateImage(file) {
    const config = window.CMS?.getConfig?.()?.virtualTryOn;
    if (!config) return true;
    if (!config.acceptedFormats?.includes(file.type)) return false;
    if (file.size > (config.maxFileSize || 10485760)) return false;
    return true;
  }

  _cleanup() {
    this._clearObjectUrls();
    this.abortController?.abort();
    this.abortController = null;
    this.userImage = null;
    this.generationId = null;
  }

  _clearObjectUrls() {
    if (this.userImageUrl) {
      URL.revokeObjectURL(this.userImageUrl);
      this.userImageUrl = null;
    }
  }

  _track(event, data) {
    window.trackEvent?.(`virtual_tryon:${event}`, data);
  }
}

export async function createVirtualTryOn(productId, productData) {
  const vto = new VirtualTryOn();
  await vto.init(productId, productData, productData.virtualTryOn);
  return vto;
}