// LQIP (Low Quality Image Placeholder) - generates tiny base64 blur placeholder
export const generateLQIP = (imageUrl, width = 20, height = 20) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter><rect width="100%" height="100%" fill="#e0e0e0" filter="url(#blur)"/></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
};

const createLQIPImage = (src, alt, lqipSrc, className = '', sizes = '') => {
  const lqip = lqipSrc || generateLQIP(src);
  return `<div class="lqip-wrapper" style="position: relative; overflow: hidden;"><img class="lqip-placeholder ${className}" src="${lqip}" alt="" aria-hidden="true" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(8px); transform: scale(1.1); transition: opacity 0.3s ease;"><img class="lqip-image ${className}" src="${src}" alt="${escapeHtml(alt)}" loading="lazy" ${sizes ? `sizes="${sizes}"` : ''} style="position: relative; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.4s ease;" onload="this.style.opacity=1; this.previousElementSibling.style.opacity=0;"></div>`;
};

const ModerationQueue = (() => {
  const STORAGE_KEY = 'dalli_moderation_queue';
  let queue = [], listeners = [];
  const load = () => { try { queue = JSON.parse(localStorage.getItem('dalli_moderation_queue')) || []; } catch (e) { queue = []; } return queue; };
  const save = () => { try { localStorage.setItem('dalli_moderation_queue', JSON.stringify(queue)); } catch (e) { console.warn('[ModerationQueue] Failed to save:', e); } notify(); };
  const notify = () => listeners.forEach(cb => cb(queue));
  const add = (item) => { const report = { id: 'rpt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), ...item, status: 'pending', createdAt: new Date().toISOString(), reviewedAt: null, reviewedBy: null }; queue.unshift(report); save(); return report; };
  const update = (id, updates) => { const idx = queue.findIndex(r => r.id === id); if (idx !== -1) { queue[idx] = { ...queue[idx], ...updates }; if (updates.status && updates.status !== 'pending') { queue[idx].reviewedAt = new Date().toISOString(); queue[idx].reviewedBy = 'admin'; } save(); return queue[idx]; } return null; };
  const remove = (id) => { queue = queue.filter(r => r.id !== id); save(); };
  const getAll = () => [...queue];
  const getPending = () => queue.filter(r => r.status === 'pending');
  const subscribe = (cb) => { listeners.push(cb); return () => { listeners = listeners.filter(l => l !== cb); }; };
  (() => { try { queue = JSON.parse(localStorage.getItem('dalli_moderation_queue')) || []; } catch (e) { queue = []; } })();
  return { add, update, remove, getAll, getPending, subscribe };
})();

const withErrorBoundary = (fn, fallback) => async (...args) => { try { return await fn(...args); } catch (error) { console.error('[ErrorBoundary]', error); if (fallback) return fallback(error, ...args); throw error; } };
const withErrorBoundarySync = (fn, fallback) => (...args) => { try { return fn(...args); } catch (error) { console.error('[ErrorBoundarySync]', error); if (fallback) return fallback(error, ...args); throw error; } };
const safeAsync = (fn) => (event) => Promise.resolve(fn(event)).catch(err => { console.error('[SafeAsync]', err); window.dispatchEvent(new CustomEvent('app:error', { detail: { error: err, event } })); });

const CriticalCSS = {
  critical: `:root{--color-bg:#fafafa;--color-text:#1a1a2e;--color-primary:#0064FF;--color-accent:#E74C3C;--color-bg-secondary:#f8f9fa;--color-border:#e0e0e0;--color-text-secondary:#666;--color-primary-bg:#f0f7ff;--color-success:#16a34a;--color-warning:#f59e0b;--color-error:#dc2626;}*{box-sizing:border-box;margin:0;padding:0}html{font-size:16px;scroll-behavior:smooth}body{font-family:system-ui,-apple-system,sans-serif;background:var(--color-bg);color:var(--color-text);line-height:1.5;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}img{max-width:100%;height:auto;display:block}button{font:inherit;cursor:pointer;border:none;background:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.container{max-width:1280px;margin:0 auto;padding:0 16px}.grid{display:grid;gap:16px}@media(min-width:480px){.grid-cols-2{grid-template-columns:repeat(2,1fr)}}@media(min-width:768px){.grid-cols-3{grid-template-columns:repeat(3,1fr)};.grid-cols-4{grid-template-columns:repeat(4,1fr)}}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;transition:all .2s}.btn-primary{background:var(--color-primary);color:#fff}.btn-primary:hover{background:#0052cc}.btn-ghost{background:transparent;color:var(--color-text)}.btn-ghost:hover{background:var(--color-bg-secondary)}.card{background:#fff;border:1px solid var(--color-border);border-radius:12px;overflow:hidden;transition:box-shadow .2s}.card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08)}.product-card{background:#fff;border:1px solid var(--color-border);border-radius:12px;overflow:hidden}.product-card__media{position:relative;aspect-ratio:1}.product-card__image{width:100%;height:100%;object-fit:cover}.lqip-wrapper{position:relative;aspect-ratio:1}.lqip-placeholder{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(8px);transform:scale(1.1);transition:opacity .3s}.lqip-image{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s}.lqip-image.loaded{opacity:1}.lqip-wrapper.loaded .lqip-placeholder{opacity:0}.product-card__content{padding:16px}.product-card__name{font-size:14px;font-weight:600;margin:8px 0}.product-card__price{font-size:16px;font-weight:700;color:var(--color-text)}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;transition:all .2s}.btn-primary{background:var(--color-primary);color:#fff}.btn-primary:hover{background:#0052cc}.btn-ghost{background:transparent;color:var(--color-text)}.btn-ghost:hover{background:var(--color-bg-secondary)}`,
  inline() { if (document.getElementById('critical-css')) return; const style = document.createElement('style'); style.id = 'critical-css'; style.textContent = this.critical; document.head.insertBefore(style, document.head.firstChild); }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => CriticalCSS.inline()); else CriticalCSS.inline();

const ModerationAdmin = (() => {
  let panel = null, unsubscribe = null;
  const render = (reports) => { if (!panel) return; panel.innerHTML = `<div class="moderation-admin"><div class="moderation-header"><h2>Moderation Queue</h2><span class="badge badge-warning">${reports.filter(r => r.status === 'pending').length} pending</span></div><div class="moderation-list">${reports.map(r => `<article class="moderation-item ${r.status}" data-id="${r.id}"><div class="report-header"><span class="report-type">${r.type}</span><span class="report-status status-${r.status}">${r.status}</span><time>${new Date(r.createdAt).toLocaleString('sr-RS')}</time></div><div class="report-content">${escapeHtml(r.content || r.reason || 'No content')}</div><div class="report-meta"><span>Post: ${r.postId || 'N/A'}</span><span>User: ${r.userId || 'anonymous'}</span></div><div class="report-actions">${r.status === 'pending' ? `<button class="btn btn-success btn-sm" data-action="approve" data-id="${r.id}">Odobri</button><button class="btn btn-warning btn-sm" data-action="reject" data-id="${r.id}">Odbij</button><button class="btn btn-error btn-sm" data-action="remove" data-id="${r.id}">Ukloni</button>` : `<span class="reviewed-by">Pregledao: ${r.reviewedBy || 'admin'} • ${r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : ''}</span>`}</div></article>`).join('')}</div></div><style>.moderation-admin{font-family:system-ui,sans-serif;padding:16px}.moderation-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--color-border)}.badge{padding:4px 8px;border-radius:12px;font-size:12px;font-weight:600;background:var(--color-warning);color:#fff}.moderation-item{background:#fff;border:1px solid var(--color-border);border-radius:8px;padding:16px;margin-bottom:12px}.moderation-item.pending{border-left:4px solid var(--color-warning)}.moderation-item.approved{border-left:4px solid var(--color-success)}.moderation-item.rejected{border-left:4px solid var(--color-error)}.moderation-item.removed{border-left:4px solid #666;opacity:.6}.report-header{display:flex;gap:12px;align-items:center;margin-bottom:8px;flex-wrap:wrap}.report-type{font-weight:600;text-transform:capitalize}.report-status{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}.status-pending{background:#fef3c7;color:#92400e}.status-approved{background:#dcfce7;color:#166534}.status-rejected{background:#fee2e2;color:#991b1b}.status-removed{background:#f3f4f6;color:#374151}.report-content{color:var(--color-text-secondary);margin-bottom:8px;font-size:14px}.report-meta{display:flex;gap:16px;font-size:12px;color:var(--color-text-secondary);margin-bottom:12px}.report-actions{display:flex;gap:8px;flex-wrap:wrap}</style>`;
    panel.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => { const action = btn.dataset.action, id = btn.dataset.id; if (action === 'approve') ModerationQueue.update(id, { status: 'approved' }); else if (action === 'reject') ModerationQueue.update(id, { status: 'rejected' }); else if (action === 'remove') ModerationQueue.remove(id); }));
  };
  const init = (container) => { panel = container; unsubscribe = ModerationQueue.subscribe(render); render(ModerationQueue.getAll()); };
  const destroy = () => { if (unsubscribe) unsubscribe(); panel = null; };
  return { init, destroy };
})();

window.addEventListener('error', (e) => console.error('[GlobalError]', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => { console.error('[UnhandledRejection]', e.reason); e.preventDefault(); });

window.ModerationQueue = ModerationQueue;
window.ModerationAdmin = ModerationAdmin;
window.CriticalCSS = CriticalCSS;
window.withErrorBoundary = withErrorBoundary;
window.withErrorBoundarySync = withErrorBoundarySync;
window.safeAsync = safeAsync;