/**
 * VtoIsland — React „Virtualna proba" (controls) za generisane SSG product
 * stranice.
 *
 * Generisane product stranice ne učitavaju app.jsx (niti vanilla VTO engine),
 * pa island nudi kompaktan, samostalan VTO tok: webcam (uz dozvolu) ili
 * upload slike, preko koje se prikazuje proizvod (produkt slika) sa
 * kontrolama opacity/scale/drag + screenshot. Sve se obrađuje lokalno.
 *
 * Mount: <div data-island="vto" data-props="{ id, name, image }"></div>
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const CANVAS_W = 480;
const CANVAS_H = 600;

export default function VtoIsland(props = {}) {
  const [step, setStep] = useState('idle'); // 'idle' | 'source' | 'active'
  const [mode, setMode] = useState(null); // 'camera' | 'upload'
  const [opacity, setOpacity] = useState(0.75);
  const [scale, setScale] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [sourceUrl, setSourceUrl] = useState('');

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const bgImgRef = useRef(null);
  const productImgRef = useRef(null);
  const streamRef = useRef(null);
  const dragRef = useRef(null);
  const stateRef = useRef({ opacity, scale, offset });

  stateRef.current = { opacity, scale, offset };
  useEffect(() => { stateRef.current = { opacity, scale, offset }; });

  const productName = props.name || 'proizvod';
  const inStock = props.inStock !== false;

  const loadProductImage = useCallback(() => {
    const img = new Image();
    img.onload = () => { productImgRef.current = img; };
    img.src = props.image || '/images/placeholder.jpg';
  }, [props.image]);

  useEffect(() => {
    loadProductImage();
    return () => closeStream();
  }, [loadProductImage]);

  const closeStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const stopAll = useCallback(() => {
    closeStream();
    setStep('idle');
    setMode(null);
    setSourceUrl('');
    bgImgRef.current = null;
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Vaš browser ne podržava kameru. Koristite opciju „otpremi sliku".');
        setMode('upload');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      setMode('camera');
      setStep('active');
    } catch (err) {
      console.warn('[islands] VTO kamera nije dostupna:', err);
      setMode('upload');
      setStep('source');
    }
  };

  const onUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    bgImgRef.current = null;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      bgImgRef.current = img;
      setSourceUrl(url);
      setMode('upload');
      setStep('active');
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#f4f4f2';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const video = videoRef.current;
    if (video && video.readyState >= 2 && video.videoWidth) {
      const { videoWidth, videoHeight } = video;
      const w = CANVAS_H * (videoWidth / videoHeight);
      ctx.drawImage(video, (CANVAS_W - w) / 2, 0, w, CANVAS_H);
    } else if (bgImgRef.current) {
      const img = bgImgRef.current;
      const ratio = Math.max(CANVAS_W / img.width, CANVAS_H / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      ctx.drawImage(img, (CANVAS_W - dw) / 2, (CANVAS_H - dh) / 2, dw, dh);
    }

    const product = productImgRef.current;
    if (product) {
      const s = stateRef.current;
      const ratio = Math.min((CANVAS_W * 0.46 * s.scale) / product.width, (CANVAS_H * 0.62 * s.scale) / product.height);
      const w = product.width * ratio;
      const h = product.height * ratio;
      const x = CANVAS_W / 2 - w / 2 + (s.offset.x / 100) * CANVAS_W;
      const y = CANVAS_H * 0.30 - h / 2 + (s.offset.y / 100) * CANVAS_H;
      ctx.globalAlpha = Math.min(1, Math.max(0.1, s.opacity));
      ctx.drawImage(product, x, y, w, h);
      ctx.globalAlpha = 1;
    }
  }, []);

  useEffect(() => {
    if (step !== 'active') return;
    let raf;
    const loop = () => { drawFrame(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, drawFrame]);

  const startDrag = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    const onMove = (ev) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.x;
      const dy = ev.clientY - dragRef.current.y;
      setOffset({ x: dragRef.current.ox + (dx / CANVAS_W) * 100, y: dragRef.current.oy + (dy / CANVAS_H) * 100 });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const screenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dalli-vto-${productName.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, 'image/png');
  };

  if (!props.id) return null;

  const card = {
    marginBottom: 'var(--space-5)',
    padding: 'var(--space-5)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-divider)',
    borderRadius: 'var(--radius-card)',
  };
  const btn = {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-btn)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    fontSize: 'var(--fs-sm)',
  };

  return (
    <div style={card} data-region="vto">
      {step === 'idle' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
            <strong>Virtualno probanje</strong>
            <div style={{ marginTop: 2 }}>Slika se obrađuje lokalno u vašem browseru — ništa se ne šalje na server.</div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStep('source')} disabled={!inStock}>
            Probaj na sebi
          </button>
        </div>
      )}

      {step === 'source' && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>Izaberite izvor fotografije:</span>
          <button type="button" style={btn} onClick={startCamera}>📷 Koristi kameru</button>
          <label style={{ ...btn, display: 'inline-block', cursor: 'pointer' }}>
            🖼 Otpremi sliku
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onUpload} />
          </label>
          <button type="button" style={{ ...btn, border: 'none', color: 'var(--color-text-tertiary)' }} onClick={stopAll}>Otkaži</button>
        </div>
      )}

      {step === 'active' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            onMouseDown={startDrag}
            className="vto-canvas"
            style={{ width: '100%', maxWidth: CANVAS_W, aspectRatio: '4 / 5', borderRadius: 'var(--radius-card)', boxShadow: '0 8px 24px rgba(0,0,0,.12)', cursor: 'move', touchAction: 'none' }} />
          <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <label style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
              Neprozirnost: <strong>{Math.round(opacity * 100)}%</strong>
              <input type="range" min="10" max="95" value={Math.round(opacity * 100)} onChange={e => setOpacity(e.target.value / 100)} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-secondary)' }}>
              Veličina: <strong>{Math.round(scale * 100)}%</strong>
              <input type="range" min="50" max="160" value={Math.round(scale * 100)} onChange={e => setScale(e.target.value / 100)} style={{ width: '100%' }} />
            </label>
            <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>Povucite proizvod myšem da pozicionirate — klizite na centar tela.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={screenshot}>📸 Sačuvaj sliku</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={stopAll}>🔄 Nova proba</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={stopAll}>Zatvori</button>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--color-text-tertiary)' }}>
            {mode === 'camera' ? 'Kamera radi samo dok je panel otvoren — zatvaranjem se tok trenutno prekida.' : 'Koristite fotografiju u punoj dužini za najbolji prikaz.'}
          </p>
        </div>
      )}
    </div>
  );
}