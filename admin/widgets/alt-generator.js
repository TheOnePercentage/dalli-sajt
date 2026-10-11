(function() {
  'use strict';

  const CMS = window.CMS;
  if (!CMS) return;

  function generateAltText(data, imageType = 'main', index = 0) {
    const naziv = data.naziv || '';
    const kratakOpis = data.kratak_opis || '';
    const kategorija = data.kategorija_pol?.kategorija || '';
    const boje = data.boje || [];
    const glavnaBoja = boje[0]?.naziv || '';

    if (imageType === 'main') {
      // Main image: "Naziv - Kratak opis u [boja] boji, [kategorija]"
      let parts = [naziv];
      
      if (kratakOpis) {
        // Extract first sentence or first 80 chars
        const firstSentence = kratakOpis.split(/[.!?]/)[0].trim();
        const descPart = firstSentence.length > 80 ? firstSentence.slice(0, 80).trim() + '…' : firstSentence;
        parts.push(descPart);
      }
      
      if (glavnaBoja) {
        parts.push(`u ${glavnaBoja.toLowerCase()} boji`);
      }
      
      if (kategorija) {
        const katMap = {
          't-shirts': 'majice',
          'hoodies': 'duksevi',
          'tracksuits': 'trenerke',
          'shorts': 'šortovi',
          'jackets': 'jakne',
          'essentials': 'osnovne stavke',
          'leggings': 'leginje',
          'matching-sets': 'setovi',
          'shirts': 'košulje',
          'blazers': 'blazeri',
          'suits': 'odjeli',
          'trousers': 'pantalone',
          'coats': 'kabanice',
          'dresses': 'haljine',
          'accessories': 'dodaci',
          'majice': 'majice',
          'trenerke': 'trenerke',
          'dukseri': 'duksevi',
          'ostalo': 'dodaci',
        };
        parts.push(katMap[kategorija] || kategorija);
      }
      
      let alt = parts.join(' - ');
      return alt.slice(0, 125); // Screen reader limit
    } else {
      // Gallery image: "Naziv - Slika X od Y: Kratak opis"
      const total = data.galerija?.length || 1;
      let alt = `${naziv} - Slika ${index + 1} od ${total}`;
      
      if (kratakOpis) {
        const firstSentence = kratakOpis.split(/[.!?]/)[0].trim();
        const descPart = firstSentence.length > 60 ? firstSentence.slice(0, 60).trim() + '…' : firstSentence;
        alt += `: ${descPart}`;
      }
      
      return alt.slice(0, 125);
    }
  }

  function AltGeneratorWidget(props) {
    const { value, onChange, field, config, forID } = props;
    const entry = props.entry;
    const allData = entry?.get('data');

    const [mainAlt, setMainAlt] = React.useState(value?.get('main_alt') || '');
    const [galleryAlts, setGalleryAlts] = React.useState(
      value?.get('gallery_alts')?.toArray?.()?.map(a => a || '') || []
    );

    // Auto-generate when source data changes
    React.useEffect(() => {
      if (!allData) return;
      
      const data = allData.toJS?.() || allData;
      const generatedMain = generateAltText(data, 'main');
      
      // Only update if not manually edited
      if (!value?.get('main_alt_manual')) {
        setMainAlt(generatedMain);
      }
      
      // Generate gallery alts
      const gallery = data.galerija || [];
      const generatedGallery = gallery.map((_, i) => generateAltText(data, 'gallery', i));
      
      if (!value?.get('gallery_alts_manual')) {
        setGalleryAlts(generatedGallery);
      }
    }, [allData]);

    const handleGenerate = () => {
      if (!allData) return;
      const data = allData.toJS?.() || allData;
      const newMain = generateAltText(data, 'main');
      const newGallery = (data.galerija || []).map((_, i) => generateAltText(data, 'gallery', i));
      
      setMainAlt(newMain);
      setGalleryAlts(newGallery);
      
      const newValue = Immutable.Map({
        main_alt: newMain,
        gallery_alts: Immutable.List(newGallery),
        main_alt_manual: false,
        gallery_alts_manual: false,
      });
      onChange(newValue);
    };

    const handleMainAltChange = (e) => {
      const newVal = e.target.value;
      setMainAlt(newVal);
      const newValue = Immutable.Map({
        main_alt: newVal,
        gallery_alts: Immutable.List(galleryAlts),
        main_alt_manual: true,
        gallery_alts_manual: value?.get('gallery_alts_manual') || false,
      });
      onChange(newValue);
    };

    const handleGalleryAltChange = (index, newVal) => {
      const newGallery = [...galleryAlts];
      newGallery[index] = newVal;
      setGalleryAlts(newGallery);
      
      const newValue = Immutable.Map({
        main_alt: mainAlt,
        gallery_alts: Immutable.List(newGallery),
        main_alt_manual: value?.get('main_alt_manual') || false,
        gallery_alts_manual: true,
      });
      onChange(newValue);
    };

    const getCharCountColor = (len) => {
      if (len === 0) return '';
      if (len > 125) return 'error';
      if (len > 110) return 'warning';
      return '';
    };

    return React.createElement('div', { className: 'nc-alt-generator' }, [
      React.createElement('div', { className: 'nc-seo-actions', key: 'actions', style: { marginBottom: '1rem' } }, [
        React.createElement('button', {
          className: 'nc-btn nc-btn-primary',
          onClick: handleGenerate,
          key: 'generate',
        }, '🔄 Generiši Alt Tekstove'),
      ]),

      // Main Image Alt
      React.createElement('div', { className: 'nc-alt-field', key: 'main' }, [
        React.createElement('label', { className: 'nc-field-label', key: 'label' }, 'Alt tekst (Glavna slika) *'),
        React.createElement('textarea', {
          className: 'nc-field-input',
          maxLength: 125,
          rows: 2,
          value: mainAlt,
          onChange: handleMainAltChange,
          placeholder: 'Generiše se automatski iz naziva, opisa i boje...',
          key: 'input',
        }),
        React.createElement('div', { className: 'nc-alt-footer', key: 'footer' }, [
          React.createElement('span', {
            className: `nc-char-count ${getCharCountColor(mainAlt.length)}`,
            key: 'count',
          }, `${mainAlt.length}/125 karaktera (screen reader limit)`),
          React.createElement('span', { className: 'nc-alt-hint', key: 'hint' }, 
            'Format: "Naziv - Opis u [boja] boji, kategorija"'
          ),
        ]),
      ]),

      // Gallery Alts
      React.createElement('div', { className: 'nc-alt-field', key: 'gallery' }, [
        React.createElement('label', { className: 'nc-field-label', key: 'label' }, 'Alt tekstovi (Galerija)'),
        galleryAlts.length === 0 && React.createElement('div', { 
          className: 'nc-alt-empty', 
          key: 'empty',
          style: { padding: '1rem', textAlign: 'center', color: 'var(--text-light, #7f8c8d)' }
        }, 'Dodajte slike u galeriju da biste videli alt tekstove'),
        
        galleryAlts.map((alt, i) => React.createElement('div', {
          className: 'nc-gallery-alt-item',
          key: alt,
        }, [
          React.createElement('div', { className: 'nc-gallery-alt-header', key: 'header' }, [
            React.createElement('span', { className: 'nc-gallery-alt-index', key: 'index' }, `Slika ${i + 1}`),
            React.createElement('span', { className: 'nc-gallery-alt-badge', key: 'badge' }, 'Opciono'),
          ]),
          React.createElement('textarea', {
            className: 'nc-field-input',
            maxLength: 125,
            rows: 2,
            value: alt,
            onChange: (e) => handleGalleryAltChange(i, e.target.value),
            placeholder: `Generiše se: "${generateAltText({...(allData?.toJS?.() || allData), galerija: new Array(i+1)}, 'gallery', i)}"`,
            key: 'input',
          }),
          React.createElement('div', { className: 'nc-alt-footer', key: 'footer' }, [
            React.createElement('span', {
              className: `nc-char-count ${getCharCountColor(alt.length)}`,
              key: 'count',
            }, `${alt.length}/125`),
          ]),
        ])),
      ]),
    ]);
  }

  CMS.registerWidget('alt-generator', AltGeneratorWidget);
})();