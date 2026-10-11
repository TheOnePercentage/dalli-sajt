// Admin - Custom Netlify CMS Widgets Loader
// These widgets are loaded before Netlify CMS initializes

import './image-upload.js';
import './alt-generator.js';
import './seo-generator.js';
import './bulk-seo-actions.js';

console.log('[Netlify CMS] Custom widgets loaded:', [
  'image-upload',
  'alt-generator', 
  'seo-generator',
  'bulk-seo-actions'
]);
