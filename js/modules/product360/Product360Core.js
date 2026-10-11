/**
 * Product 360° Viewer - Core Logic
 * 
 * Handles the 360° product viewing experience:
 * - Frame management and rotation
 * - Touch/mouse interaction
 * - Frame preloading
 * - Analytics tracking
 */

export class Product360Core {
  constructor(product) {
    this.product = product;
    this.images = product.product360?.images || [];
    this.frameCount = this.images.length;
    this.currentFrame = 0;
    this.isAnimating = false;
    this.isDragging = false;
    this.lastX = 0;
    this.velocity = 0;
    this.animationFrame = null;
    this.preloadedFrames = new Set();
    this.preloadedFrames = new Set([0]); // First frame preloaded
    this.config = null;
    this.ui = null;
    this.container = null;
  }

  async init(product) {
    this.product = product;
    this.images = product.product360?.images || [];
    this.frameCount = this.images.length;
    this.currentFrame = 0;
    this.isAnimating = false;
    this.isDragging = false;
    this.lastX = 0;
    this.velocity = 0;
    this.animationFrame = null;
    this.preloadedFrames = new Set();
    this.preloadedFrames = new Set([0]); // First frame preloaded
    this.config = null;
    this.ui = null;
    this.container = null;
    
    // Load config
    const config = await fetch('/data/product360-config.json').then(r => r.json());
    this.config = config.product360 || {};
    
    // Preload first frame
    await this.preloadFrame(0);
    
    return this;
  }

  /**
   * Open the 360° viewer modal
   */
  async open() {
    const { Product360UI } = await import('./Product360UI.jsx');
    this.ui = new (await import('./Product360UI.jsx')).Product360UI(this);
    await this.ui.init();
    this.ui.open();
    this.viewStartTime = Date.now();
    this.hasInteracted = false;
    this._track('viewer_opened', { productId: this.product.id });
  }

  /**
   * Close the viewer modal
   */
  close() {
    this.ui.closeModal();
    this._cleanup();
    this.currentStep = 'idle';
    this._resolveOnClose?.({ cancelled: true });
  }

  /**
   * Destroy the viewer
   */
  destroy() {
    this.close();
    this.ui?.destroy();
    this.provider?.destroy();
    this.flow?.destroy();
    this._clearObjectUrls();
  }

  /**
   * Preload a specific frame
   * @param {number} frameIndex - Frame index to preload
   */
  async preloadFrame(index) {
    if (index < 0 || index >= this.frameCount) return;
    if (this.preloadedFrames.has(index)) return;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.preloadedFrames.add(index);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = this.images[index];
    });
  }

  /**
   * Preload frames around current frame
   * @param {number} centerFrame - Center frame index
   * @param {number} radius - Number of frames to preload on each side
   */
  async preloadAround(centerFrame, radius = 3) {
    const promises = [];
    for (let i = -radius; i <= radius; i++) {
      const idx = (centerFrame + i + this.frameCount) % this.frameCount;
      if (!this.preloadedFrames.has(idx)) {
        this.preloadFrame(idx);
      }
    }
  }

  /**
   * Go to specific frame
   * @param {number} frameIndex - Target frame index
   * @param {boolean} animate - Whether to animate transition
   */
  goToFrame(frameIndex, animate = true) {
    const normalizedIndex = ((frameIndex % this.frameCount) + this.frameCount) % this.frameCount;
    
    if (animate) {
      this.animateToFrame(frameIndex);
    } else {
      this.currentFrame = ((frameIndex % this.frameCount) + this.frameCount) % this.frameCount;
      this.ui?.updateFrame(this.currentFrame);
      this.preloadAround(this.currentFrame);
    }
  }

  /**
   * Animate to target frame with smooth easing
   * @param {number} targetFrame - Target frame index
   */
  animateToFrame(targetFrame) {
    const startFrame = this.currentFrame;
    const distance = ((targetFrame - startFrame + this.frameCount / 2) % this.frameCount) - this.frameCount / 2;
    const startTime = Date.now();
    const duration = Math.min(Math.abs(targetFrame - this.currentFrame) * 30, 500);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = startFrame + distance * eased;
      this.currentFrame = Math.round(((current % this.frameCount) + this.frameCount) % this.frameCount);
      this.ui?.updateFrame(this.currentFrame);
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.currentFrame = ((targetFrame % this.frameCount) + this.frameCount) % this.frameCount;
        this.ui?.updateFrame(this.currentFrame);
        this.preloadAround(this.currentFrame);
        this._track('frame_changed', { frame: this.currentFrame });
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Handle drag start (mouse/touch)
   * @param {number} clientX - Client X coordinate
   */
  onDragStart(clientX) {
    this.isDragging = true;
    this.lastX = clientX;
    this.velocity = 0;
    this.stopAnimation();
    this._track('drag_start', { frame: this.currentFrame });
  }

  /**
   * Handle drag move
   * @param {number} clientX - Client X coordinate
   */
  onDragMove(clientX) {
    if (!this.isDragging) return;
    
    const deltaX = clientX - this.lastX;
    this.lastX = clientX;
    this.velocity = deltaX * 0.5;
    
    // Calculate frame change based on drag distance
    const sensitivity = 8; // pixels per frame
    const frameDelta = Math.round(deltaX / sensitivity);
    
    if (frameDelta !== 0) {
      this.currentFrame = ((this.currentFrame - frameDelta) % this.frameCount + this.frameCount) % this.frameCount;
      this.ui?.updateFrame(this.currentFrame);
      this._track('frame_changed', { frame: this.currentFrame, source: 'drag' });
    }
    
    this.preloadAround(this.currentFrame);
  }

  /**
   * Handle drag end
   */
  onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    // Apply momentum
    if (Math.abs(this.velocity) > 0.5) {
      this.applyMomentum();
    } else {
      this.snapToNearestFrame();
    }
    
    this._track('drag_end', { frame: this.currentFrame, velocity: this.velocity });
  }

  /**
   * Apply momentum after drag
   */
  applyMomentum() {
    let velocity = this.velocity;
    const friction = 0.95;
    const minVelocity = 0.1;
    
    const animate = () => {
      if (Math.abs(velocity) < 0.1) {
        this.snapToNearestFrame();
        return;
      }
      
      const frameDelta = Math.round(velocity * 0.5);
      this.currentFrame = ((this.currentFrame - frameDelta) % this.frameCount + this.frameCount) % this.frameCount;
      this.ui?.updateFrame(this.currentFrame);
      this._track('frame_changed', { frame: this.currentFrame, source: 'momentum' });
      
      velocity *= 0.95;
      
      if (Math.abs(velocity) > 0.1) {
        this.animationFrame = requestAnimationFrame(() => this.applyMomentum());
      } else {
        this.snapToNearestFrame();
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * Snap to nearest frame
   */
  snapToNearestFrame() {
    // Already on a frame, just ensure we're on exact frame
    this.currentFrame = Math.round(this.currentFrame);
    this.currentFrame = ((this.currentFrame % this.frameCount) + this.frameCount) % this.frameCount;
    this.ui?.updateFrame(this.currentFrame);
    this.preloadAround(this.currentFrame);
  }

  /**
   * Preload frames around current frame
   * @param {number} centerFrame - Center frame index
   * @param {number} radius - Number of frames to preload on each side
   */
  async preloadAround(centerFrame, radius = 3) {
    const promises = [];
    for (let i = -radius; i <= radius; i++) {
      const idx = (centerFrame + i + this.frameCount) % this.frameCount;
      if (!this.preloadedFrames.has(idx)) {
        this.preloadFrame(idx);
      }
    }
  }

  /**
   * Stop any ongoing animation
   */
  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.isAnimating = false;
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  onKeyDown(e) {
    if (!this.container || !this.container.contains(document.activeElement)) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this.goToFrame(this.currentFrame - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.goToFrame(this.currentFrame + 1);
        break;
      case 'Home':
        e.preventDefault();
        this.goToFrame(0);
        break;
      case 'End':
        e.preventDefault();
        this.goToFrame(this.frameCount - 1);
        break;
      case 'Escape':
        this.close();
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case 'r':
      case 'R':
        this.resetView();
        break;
    }
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    if (document.fullscreenElement === this.container) {
      document.exitFullscreen();
    } else {
      this.container.requestFullscreen().catch(console.warn);
    }
  }

  /**
   * Reset view to first frame
   */
  resetView() {
    this.goToFrame(0, true);
    this._track('view_reset', { fromFrame: this.currentFrame });
  }

  /**
   * Toggle auto-rotate
   */
  toggleAutoRotate() {
    this.config.autoRotate = !this.config.autoRotate;
    if (this.config.autoRotate) {
      this.startAutoRotate();
    } else {
      this.stopAutoRotate();
    }
    this.ui?.updateAutoRotateButton(this.config.autoRotate);
  }

  startAutoRotate() {
    if (this.autoRotateInterval) return;
    this.autoRotateInterval = setInterval(() => {
      this.goToFrame(this.currentFrame + 1);
    }, this.config.autoRotateSpeed || 2000);
  }

  stopAutoRotate() {
    if (this.autoRotateInterval) {
      clearInterval(this.autoRotateInterval);
      this.autoRotateInterval = null;
    }
  }

  /**
   * Analytics tracking
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _track(event, data) {
    const payload = {
      event: `product360_${event}`,
      productId: this.product?.id,
      productSlug: this.product?.slug,
      timestamp: Date.now(),
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      ...data
    };
    
    if (window.dataLayer) window.dataLayer.push(payload);
    if (window.gtag) window.gtag('event', `product360_${event}`, payload);
    console.log('[Product360] Track:', { event, ...data });
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.stopAnimation();
    if (this.autoRotateInterval) {
      clearInterval(this.autoRotateInterval);
    }
    this.preloadedFrames.clear();
    this.images = [];
    this.ui = null;
    this.container = null;
  }
}

export async function createProduct360(product) {
  const viewer = new Product360Core(product);
  await viewer.init(product);
  return viewer;
}

export default Product360Core;