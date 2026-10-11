(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  const createMediaLibrary = CMS.createMediaLibrary;
  const mediaLibrary = createMediaLibrary({
    config: {
      multiple: true,
      allowed_extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif'],
      max_file_size: 52428800,
    },
  });

  function ImageUploadWidget(props) {
    const { value, onChange, field, config, forID } = props;
    const fieldName = field.get('name');
    const isMain = fieldName === 'glavna_slika';
    const isGallery = fieldName === 'galerija';
    const maxGallery = config?.max_gallery ?? 8;

    const [mainImage, setMainImage] = React.useState(value?.get('src') || '');
    const [mainAlt, setMainAlt] = React.useState(value?.get('alt') || '');
    const [mainFocalPoint, setMainFocalPoint] = React.useState(value?.get('focalPoint') || { x: 0.5, y: 0.5 });
    const [mainWidth, setMainWidth] = React.useState(value?.get('width') || 0);
    const [galleryImages, setGalleryImages] = React.useState(
      value?.toArray?.()?.map(img => ({
        src: img.get('src'),
        alt: img.get('alt') || '',
        focalPoint: img.get('focalPoint') || { x: 0.5, y: 0.5 },
        order: img.get('order') || 0,
      })) || []
    );
    const [showFocalPoint, setShowFocalPoint] = React.useState(false);
    const [focalPointTarget, setFocalPointTarget] = React.useState(null);

    const updateValue = () => {
      if (isMain) {
        const newValue = Immutable.Map({
          src: mainImage,
          alt: mainAlt,
          focalPoint: mainFocalPoint,
          width: mainWidth,
        });
        onChange(newValue);
      } else if (isGallery) {
        const newValue = Immutable.List(
          galleryImages.map((img, i) =>
            Immutable.Map({
              src: img.src,
              alt: img.alt,
              focalPoint: img.focalPoint,
              order: i,
              width: img.width || 0,
            })
          )
        );
        onChange(newValue);
      }
    };

    const handleMainImageSelect = (media) => {
      const file = media.get('file');
      const url = media.get('url') || (file ? URL.createObjectURL(file) : '');
      setMainImage(url);
      setMainWidth(0);
      if (!mainAlt && file) {
        setMainAlt(file.name.replace(/\.[^/.]+$/, ''));
      }
      updateValue();
    };

    const handleGallerySelect = (mediaArray) => {
      const newImages = mediaArray.map((media, idx) => {
        const file = media.get('file');
        const url = media.get('url') || (file ? URL.createObjectURL(file) : '');
        return {
          src: url,
          alt: file ? file.name.replace(/\.[^/.]+$/, '') : '',
          focalPoint: { x: 0.5, y: 0.5 },
          order: galleryImages.length + idx,
        };
      });
      const combined = [...galleryImages, ...newImages].slice(0, maxGallery);
      setGalleryImages(combined);
      updateValue();
    };

    const removeGalleryImage = (index) => {
      const newGallery = galleryImages.filter((_, i) => i !== index);
      setGalleryImages(newGallery);
      updateValue();
    };

    const moveGalleryImage = (fromIndex, toIndex) => {
      const newGallery = [...galleryImages];
      const [moved] = newGallery.splice(fromIndex, 1);
      newGallery.splice(toIndex, 0, moved);
      setGalleryImages(newGallery);
      updateValue();
    };

    const openMediaLibrary = (type) => {
      mediaLibrary.open({
        allowMultiple: !isMain,
        onSelect: (selection) => {
          if (isMain) {
            handleMainImageSelect(selection);
          } else {
            handleGallerySelect(selection.toArray());
          }
        },
      });
    };

    renderDropZone = (onClick, preview, label, showFocal = false) => (
      React.createElement('div', {
        className: 'nc-image-dropzone',
        onClick: onClick,
        onDragOver: (e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); },
        onDragLeave: (e) => { e.currentTarget.classList.remove('dragover'); },
        onDrop: (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('dragover');
          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
          if (files.length > 0) {
            const mediaObjects = files.map(f => Immutable.Map({ file: f, url: URL.createObjectURL(f) }));
            if (isMain) handleMainImageSelect(mediaObjects[0]);
            else handleGallerySelect(mediaObjects);
          }
        },
      }, [
        preview ? React.createElement('div', { className: 'nc-image-preview', key: 'preview' }, [
          React.createElement('img', { 
            src: preview, 
            alt: '', 
            key: 'img',
            onLoad: (e) => {
              if (isMain) setMainWidth(e.target.naturalWidth);
            }
          }),
          showFocal && React.createElement('div', {
            className: 'nc-focal-point',
            style: { left: `${mainFocalPoint.x * 100}%`, top: `${mainFocalPoint.y * 100}%` },
            onClick: (e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMainFocalPoint({
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height,
              });
            },
          }, '✚'),
          isMain && React.createElement('a', {
            className: 'nc-view-original',
            href: preview,
            target: '_blank',
            rel: 'noopener',
            key: 'view-original',
          }, '🔍 View original'),
          React.createElement('button', {
            className: 'nc-remove-btn',
            onClick: (e) => { e.stopPropagation(); setMainImage(''); setMainAlt(''); setMainWidth(0); updateValue(); },
            'aria-label': 'Ukloni sliku',
          }, '×'),
        ]) : React.createElement('div', { className: 'nc-dropzone-placeholder', key: 'placeholder' }, [
          React.createElement('span', { className: 'nc-dropzone-icon', key: 'icon' }, '☁️'),
          React.createElement('span', { className: 'nc-dropzone-text', key: 'text' }, label),
          React.createElement('span', { className: 'nc-dropzone-hint', key: 'hint' }, 'Drag & drop ili kliknite za izbor'),
        ]),
      ])
    );

    const renderGalleryItem = (img, index) => {
      const qualityClass = img.width >= 2400 ? 'green' : img.width >= 1200 ? 'yellow' : 'red';
      const qualityLabel = img.width >= 2400 ? '🟢' : img.width >= 1200 ? '🟡' : '🔴';
      const qualityText = img.width ? `${img.width}px` : 'Neznato';

      return React.createElement('div', {
        className: 'nc-gallery-item',
        key: img.src,
        draggable: true,
        onDragStart: (e) => { e.dataTransfer.setData('text/plain', index); e.currentTarget.classList.add('dragging'); },
        onDragEnd: (e) => { e.currentTarget.classList.remove('dragging'); },
        onDragOver: (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); },
        onDragLeave: (e) => { e.currentTarget.classList.remove('drag-over'); },
        onDrop: (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');
          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (fromIndex !== index) moveGalleryImage(fromIndex, index);
        },
      }, [
        React.createElement('div', { className: 'nc-gallery-thumb', key: 'thumb' }, [
          React.createElement('img', { src: img.src, alt: '', key: 'img', onLoad: (e) => {
            if (!img.width) {
              const newGallery = [...galleryImages];
              newGallery[index] = { ...newGallery[index], width: e.target.naturalWidth };
              setGalleryImages(newGallery);
              updateValue();
            }
          } }),
          React.createElement('span', { className: 'nc-gallery-order', key: 'order' }, index + 1),
          img.width && React.createElement('span', {
            className: `nc-quality-badge ${qualityClass}`,
            key: 'quality',
            title: qualityText,
          }, qualityLabel),
          React.createElement('button', {
            className: 'nc-gallery-remove',
            onClick: (e) => { e.stopPropagation(); removeGalleryImage(index); },
            'aria-label': `Ukloni sliku ${index + 1}`,
          }, '×'),
        ]),
        React.createElement('input', {
          type: 'text',
          className: 'nc-gallery-alt',
          placeholder: 'Alt tekst (opciono)',
          value: img.alt,
          onChange: (e) => {
            const newGallery = [...galleryImages];
            newGallery[index] = { ...newGallery[index], alt: e.target.value };
            setGalleryImages(newGallery);
            updateValue();
          },
          key: 'alt',
        }),
]);
  }
  const warningStyle = { color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px' };

    return React.createElement('div', { className: 'nc-image-upload-widget' }, [
      isMain && React.createElement('div', { className: 'nc-field-group', key: 'main' }, [
        React.createElement('label', { className: 'nc-field-label', key: 'label' }, 'Glavna slika *'),
        renderDropZone(
          () => openMediaLibrary('main'),
          mainImage,
          'Izaberite glavnu sliku proizvoda',
          showFocalPoint
        ),
        mainImage && React.createElement('div', { className: 'nc-field-row', key: 'alt-row' }, [
          React.createElement('input', {
            type: 'text',
            className: 'nc-field-input',
            placeholder: 'Alt tekst (npr. "Osnovna Majica - bela, unisex")',
            value: mainAlt,
            onChange: (e) => { setMainAlt(e.target.value); updateValue(); },
            key: 'alt-input',
          }),
          React.createElement('label', { className: 'nc-checkbox-label', key: 'focal-label' }, [
            React.createElement('input', {
              type: 'checkbox',
              checked: showFocalPoint,
              onChange: (e) => setShowFocalPoint(e.target.checked),
              key: 'focal-check',
            }),
            ' Prikazi focal point (centar za thumbnail crop)',
          ]),
        ]),
        mainImage && React.createElement('div', { className: 'nc-field-row', key: 'quality-row' }, [
          mainWidth && React.createElement('span', {
            className: `nc-quality-badge ${mainWidth >= 2400 ? 'green' : mainWidth >= 1200 ? 'yellow' : 'red'}`,
            key: 'quality-main',
          }, `${mainWidth >= 2400 ? '🟢' : mainWidth >= 1200 ? '🟡' : '🔴'} ${mainWidth}px`),
          React.createElement('span', { className: 'nc-quality-hint', key: 'hint' }, 'Preporučeno ≥2400px za zoom'),
        ]),
        mainImage && React.createElement('div', { className: 'nc-recommended-notice', key: 'notice' }, [
          React.createElement('span', { className: 'nc-info-icon', key: 'icon' }, 'ℹ️'),
          React.createElement('span', { key: 'text' }, 'Preporučena rezolucija: 2400px+ širine za zoom. Original se čuva bez kompresije.'),
        ]),
      ]),

      isGallery && React.createElement('div', { className: 'nc-field-group', key: 'gallery' }, [
        React.createElement('label', { className: 'nc-field-label', key: 'label' }, `Galerija (max ${maxGallery} slika)`),
        galleryImages.length < maxGallery && renderDropZone(
          () => openMediaLibrary('gallery'),
          null,
          galleryImages.length === 0 ? 'Dodajte slike u galeriju' : `+ Dodaj još slika (${galleryImages.length}/${maxGallery})`
        ),
        galleryImages.length > 0 && React.createElement('div', { className: 'nc-gallery-grid', key: 'grid' },
          galleryImages.map(renderGalleryItem)
        ),
        galleryImages.length >= maxGallery && React.createElement('div', { className: 'nc-warning', key: 'max-warning', style: warningStyle },
          `Maksimalan broj slika (${maxGallery}) dostignut. Uklonite sliku da biste dodali novu.`
        ),
        galleryImages.length > 0 && React.createElement('div', { className: 'nc-gallery-hint', key: 'hint' },
          'Prva slika = hover efekt na kartici proizvoda. Prevuci za promenu redosleda.'
        ),
        galleryImages.length > 0 && React.createElement('div', { className: 'nc-quality-legend', key: 'quality-legend' }, [
          React.createElement('span', { className: 'nc-quality-badge green', key: 'green' }, '🟢 ≥2400px'),
          React.createElement('span', { className: 'nc-quality-badge yellow', key: 'yellow' }, '🟡 1200–2399px'),
          React.createElement('span', { className: 'nc-quality-badge red', key: 'red' }, '🔴 <1200px'),
        ]),
      ]),
    ]);
  }

  CMS.registerWidget('image-upload', ImageUploadWidget);
})();