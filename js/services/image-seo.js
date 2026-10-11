/**
 * Image SEO Service
 * Handles WebP conversion, responsive images, alt text generation, and optimization
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

export class ImageSEOService {
  constructor(options = {}) {
    this.imagesDir = options.imagesDir || '/home/alpatron/Documents/Default Project/moonlight-sajt/images';
    this.publicDir = options.publicDir || '/home/alpatron/Documents/Default Project/moonlight-sajt/public';
    this.quality = options.quality || 80;
    this.sizes = options.sizes || [320, 640, 960, 1280, 1920];
    this.formats = options.formats || ['webp', 'avif'];
  }

  /**
   * Generate alt text from filename or context
   */
  generateAltText(filename, context = {}) {
    const name = path.basename(filename, path.extname(filename));
    
    // Clean up filename
    let alt = name
      .replace(/[-_]/g, ' ')
      .replace(/(\d+)x(\d+)/g, '')
      .replace(/@\d+x/g, '')
      .replace(/\d{4}-\d{2}-\d{2}/g, '')
      .trim();
    
    // Capitalize words
    alt = alt.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    // Add context if available
    if (context.type === 'product' && context.name) {
      alt = `${context.name} - ${alt}`;
    } else if (context.type === 'category' && context.name) {
      alt = `${context.name} kategorija`;
    } else if (context.type === 'hero') {
      alt = `Hero slika: ${alt}`;
    } else if (context.type === 'logo') {
      alt = `DALLI logo ${alt}`;
    } else if (context.type === 'icon') {
      alt = `Ikona: ${alt}`;
    }
    
    return alt || 'DALLI slika';
  }

  /**
   * Generate responsive image HTML with picture element
   */
  generatePictureElement(options) {
    const {
      src,
      alt = '',
      widths = this.sizes,
      formats = this.formats,
      className = '',
      loading = 'lazy',
      sizes = '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw',
      classNamePicture = '',
      aspectRatio = null
    } = options;

    const baseName = path.basename(src, path.extname(src));
    const dir = path.dirname(src);
    const ext = path.extname(src).toLowerCase();

    // Generate sources for modern formats
    const sources = formats.map(format => {
      const srcset = widths.map(w => {
        const formattedSrc = `${dir}/${baseName}-${w}w.${format}`;
        return `${formattedSrc} ${w}w`;
      }).join(', ');
      
      return `<source type="image/${format}" srcset="${srcset}" sizes="${sizes}">`;
    }).join('\n      ');

    // Fallback to original format
    const fallbackSrcset = widths.map(w => {
      const formattedSrc = `${dir}/${baseName}-${w}w${ext}`;
      return `${formattedSrc} ${w}w`;
    }).join(', ');

    let imgAttributes = `src="${src}" alt="${alt}" loading="${loading}"`;
    if (sizes) imgAttributes += ` sizes="${sizes}"`;
    if (alt) imgAttributes += ` alt="${alt}"`;

    // Aspect ratio wrapper for CLS prevention
    let aspectRatioStyle = '';
    if (aspectRatio) {
      aspectRatioStyle = `style="aspect-ratio: ${aspectRatio};"`;
    }

    return `
<picture class="${classNamePicture}" ${aspectRatioStyle}>
      ${sources}
      <img 
        srcset="${fallbackSrcset}"
        ${imgAttributes}
        class="${className}"
        width="${Math.max(...widths)}"
        height="${Math.round(Math.max(...widths) * (aspectRatio ? 1/aspectRatio : 1))}"
      >
    </picture>`;
  }

  /**
   * Generate responsive image tag with srcset
   */
  generateResponsiveImg(options) {
    const {
      src,
      alt = '',
      widths = this.sizes,
      className = '',
      loading = 'lazy',
      sizes = '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw',
      aspectRatio = null
    } = options;

    const baseName = path.basename(src, path.extname(src));
    const dir = path.dirname(src);
    const ext = path.extname(src);

    const srcset = widths.map(w => {
      const formattedSrc = `${dir}/${path.basename(src, path.extname(src))}-${w}w${path.extname(src)}`;
      return `${formattedSrc} ${w}w`;
    }).join(', ');

    let aspectRatioStyle = '';
    if (aspectRatio) {
      return `<img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${alt}" loading="lazy" class="${className}" style="aspect-ratio: ${aspectRatio};">`;
    }

    return `<img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${alt}" loading="lazy" class="${className}">`;
  }

  /**
   * Audit existing images
   */
  async auditImages() {
    const results = {
      total: 0,
      byFormat: {},
      byDirectory: {},
      missingAlt: [],
      missingWebP: [],
      missingResponsive: [],
      oversized: [],
      recommendations: []
    };

    const walk = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (/\.(jpg|jpeg|png|webp|avif|svg)$/i.test(file)) {
          results.total++;
          const ext = path.extname(file).toLowerCase();
          results.byFormat[ext] = (results.byFormat[ext] || 0) + 1;
          
          const relDir = path.relative(this.imagesDir, path.dirname(fullPath)) || 'root';
          results.byDirectory[relDir] = (results.byDirectory[relDir] || 0) + 1;

          // Check for WebP version
          if (ext !== '.webp' && ext !== '.avif' && ext !== '.svg') {
            const webpPath = fullPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            if (!fs.existsSync(webpPath)) {
              results.missingWebP.push(path.relative(this.imagesDir, fullPath));
            }
          }

          // Check for responsive versions
          const baseName = path.basename(file, path.extname(file));
          const dir = path.dirname(fullPath);
          const hasResponsive = this.sizes.some(w => 
            fs.existsSync(path.join(path.dirname(fullPath), `${path.basename(file, path.extname(file))}-${w}w${path.extname(file)}`))
          );
          if (!hasResponsive && ext !== '.svg') {
            results.missingResponsive.push(path.relative(this.imagesDir, fullPath));
          }

          // Check file size
          const stats = fs.statSync(fullPath);
          if (stats.size > 500 * 1024) { // > 500KB
            results.oversized.push({
              path: path.relative(this.imagesDir, fullPath),
              sizeKB: Math.round(stats.size / 1024)
            });
          }
        }
      }
    };

    walk(this.imagesDir);

    // Generate recommendations
    if (results.missingWebP.length > 0) {
      results.recommendations.push(`Convert ${results.missingWebP.length} images to WebP/AVIF`);
    }
    if (results.missingResponsive.length > 0) {
      results.recommendations.push(`Generate responsive variants for ${results.missingResponsive.length} images`);
    }
    if (results.oversized.length > 0) {
      results.recommendations.push(`Optimize ${results.oversized.length} oversized images (>500KB)`);
    }

    return results;
  }

  /**
   * Generate image sitemap
   */
  generateImageSitemap(imageData) {
    const urls = imageData.map(item => {
      const lastmod = item.lastmod || new Date().toISOString().split('T')[0];
      return `  <url>
    <loc>${item.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <image:image>
      <image:loc>https://dalli.rs${item.src}</image:loc>
      <image:title>${item.title || ''}</image:title>
      <image:caption>${item.alt || ''}</image:caption>
      ${item.license ? `<image:license>${item.license}</image:license>` : ''}
    </image:image>
  </url>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
  }

  /**
   * Generate LQIP (Low Quality Image Placeholder) data URI
   */
  generateLQIP(imagePath, width = 20) {
    // This would require sharp or similar library
    // Returns a placeholder SVG data URI
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e5e7eb"/></svg>`
    ).toString('base64')}`;
  }
}

export default ImageSEOService;