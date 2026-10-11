const { useState, useRef, useEffect } = React;

const ImageUploadWidget = ({ value, onChange, forMultiple, config = {} }) => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [focalPoints, setFocalPoints] = useState({});
  const fileInputRef = useRef(null);

  const maxFiles = config.max_gallery || (forMultiple ? 8 : 1);

  useEffect(() => {
    if (value && value.length > 0) {
      const fileList = Array.isArray(value) ? value : [value];
      fileList.forEach((v, i) => {
        if (v && v.src) {
          const previewUrl = v.src.startsWith('blob:') ? v.src : v.src;
          setPreviews(prev => {
            const newPreviews = [...prev];
            newPreviews[i] = previewUrl;
            return newPreviews;
          });
          if (v.focalPoint) {
            setFocalPoints(prev => ({ ...prev, [i]: v.focalPoint }));
          }
        }
      });
    }
  }, [value]);

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).slice(0, maxFiles - files.length);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setFiles(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
    onChange([...files, ...newFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFocalPoints(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    onChange(files.filter((_, i) => i !== index));
  };

  const handleFocalPointClick = (index, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setFocalPoints(prev => ({ ...prev, [index]: { x, y } }));
    const updatedFiles = files.map((f, i) => 
      i === index ? { ...f, focalPoint: { x, y } } : f
    );
    onChange(updatedFiles);
  };

  return React.createElement('div', { className: 'image-upload-widget' },
    React.createElement('div', { 
      className: 'image-upload-dropzone',
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onClick: () => fileInputRef.current?.click()
    },
      React.createElement('input', {
        ref: fileInputRef,
        type: 'file',
        accept: 'image/jpeg,image/png,image/webp,image/avif,image/heic',
        multiple: forMultiple,
        onChange: (e) => e.target.files && handleFiles(e.target.files),
        style: { display: 'none' }
      }),
      files.length === 0 && React.createElement('div', { className: 'upload-prompt' },
        React.createElement('svg', { width: 48, height: 48, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 },
          React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
          React.createElement('polyline', { points: '17 8 12 3 7 8' }),
          React.createElement('line', { x1: 12, y1: 3, x2: 12, y2: 15 })
        ),
        React.createElement('p', null, forMultiple ? 'Drag & drop images here or click to select' : 'Click or drag image here'),
        React.createElement('small', null, `Max ${maxFiles} files • JPEG, PNG, WebP, AVIF, HEIC`)
      ),
      previews.map((preview, index) => React.createElement('div', { 
        key: index, 
        className: 'image-preview',
        onClick: (e) => handleFocalPointClick(index, e)
      },
        React.createElement('img', { src: preview, alt: `Preview ${index + 1}` }),
        React.createElement('div', { className: 'focal-point-marker', style: focalPoints[index] ? {
          left: `${focalPoints[index].x * 100}%`,
          top: `${focalPoints[index].y * 100}%`
        } : { left: '50%', top: '50%' } }),
        React.createElement('button', {
          type: 'button',
          className: 'remove-btn',
          onClick: (e) => { e.stopPropagation(); removeFile(index); },
          'aria-label': 'Remove image'
        }, '×')
      ))
    ),
    React.createElement('style', null, `
      .image-upload-widget { font-family: system-ui, sans-serif; }
      .image-upload-dropzone {
        border: 2px dashed var(--color-border, #ddd);
        border-radius: 8px;
        padding: 24px;
        transition: border-color 0.2s, background 0.2s;
        cursor: pointer;
      }
      .image-upload-dropzone:hover { border-color: var(--color-primary, #0064FF); background: var(--color-primary-bg, #f0f7ff); }
      .upload-prompt { text-align: center; color: var(--color-text-secondary, #666); }
      .upload-prompt svg { margin-bottom: 12px; opacity: 0.6; }
      .upload-prompt p { margin: 8px 0 4px; font-weight: 500; }
      .upload-prompt small { font-size: 12px; opacity: 0.7; }
      .image-preview { position: relative; display: inline-block; margin: 8px; }
      .image-preview img { width: 120px; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border, #ddd); }
      .focal-point-marker {
        position: absolute; width: 16px; height: 16px; border-radius: 50%;
        background: rgba(255,255,255,0.9); border: 2px solid var(--color-primary, #0064FF);
        transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
      }
      .remove-btn {
        position: absolute; top: -8px; right: -8px; width: 24px; height: 24px;
        border-radius: 50%; background: #fff; border: 1px solid var(--color-border, #ddd);
        font-size: 16px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .remove-btn:hover { background: #fee; border-color: #e00; color: #e00; }
    `)
  );
};

if (typeof window !== 'undefined' && window.CMS) {
  window.CMS.registerWidget('image-upload', ImageUploadWidget);
}

export default ImageUploadWidget;
