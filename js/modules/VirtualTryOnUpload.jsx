/**
 * Virtual Try-On Upload Handler
 * 
 * Handles camera and gallery image capture/upload.
 */

export class VirtualTryOnUpload {
  constructor(controller) {
    this.controller = controller;
    this.mediaStream = null;
  }

  async init() {
    // Check for camera permissions
    this._checkPermissions();
  }

  async _checkPermissions() {
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn('[VTO] Camera not supported');
      return;
    }

    try {
      // Pre-request camera permission
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (e) {
      console.warn('[VTO] Camera permission denied:', e.message);
    }
  }

  /**
   * Open camera and capture photo
   * @returns {Promise<File>} Captured image file
   */
  async captureFromCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Kamera nije podržana u ovom pregledaču');
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      // Create video element for preview
      const video = document.createElement('video');
      video.srcObject = this.mediaStream;
      video.play();

      // Wait for video to be ready
      await new Promise(resolve => {
        video.onloadedmetadata = () => resolve();
      });

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Stop media stream
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;

      // Convert to file
      return new Promise(resolve => {
        canvas.toBlob(blob => {
          const file = new File([blob], 'vto-camera.jpg', { type: 'image/jpeg' });
          resolve(file);
        }, 'image/jpeg', 0.9);
      });

    } catch (error) {
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      throw new Error(`Kamera greška: ${error.message}`);
    }
  }

  /**
   * Open file picker for gallery selection
   * @returns {Promise<File>} Selected image file
   */
  async pickFromGallery() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.capture = 'environment';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('Nije odabrana slika'));
        }
      };

      input.oncancel = () => reject(new Error('Odabir otkazan'));
      input.click();
    });
  }

  /**
   * Validate image file
   * @param {File} file - Image file to validate
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateFile(file) {
    const config = window.CMS?.getConfig?.()?.virtualTryOn;
    
    if (!config) return { valid: true };

    if (config.acceptedFormats && !config.acceptedFormats.includes(file.type)) {
      return { valid: false, error: 'Nepodržan format slike. Koristite JPG, PNG ili WebP.' };
    }

    if (config.maxFileSize && file.size > config.maxFileSize) {
      const maxMB = Math.round(config.maxFileSize / 1024 / 1024);
      return { valid: false, error: `Slika je prevelika. Maksimum ${maxMB}MB.` };
    }

    return { valid: true };
  }

  /**
   * Create preview URL for file
   * @param {File} file 
   * @returns {string} Object URL
   */
  createPreviewUrl(file) {
    return URL.createObjectURL(file);
  }

  /**
   * Revoke preview URL
   * @param {string} url 
   */
  revokePreviewUrl(url) {
    URL.revokeObjectURL(url);
  }

  destroy() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }
}

export default VirtualTryOnUpload;