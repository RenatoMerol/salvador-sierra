(function () {
  const API_BASE = '/api';
  const PLACEHOLDER_IMAGE = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'>" +
    "<rect width='800' height='1000' fill='#191919'/>" +
    "<rect x='48' y='48' width='704' height='904' rx='18' ry='18' fill='none' stroke='#2e2e2e' stroke-width='3'/>" +
    "<text x='400' y='470' fill='#888888' font-family='Arial, sans-serif' font-size='32' text-anchor='middle'>Sin imagen</text>" +
    "<text x='400' y='520' fill='#666666' font-family='Arial, sans-serif' font-size='18' text-anchor='middle'>La pieza necesita una foto para publicarse</text>" +
    "</svg>"
  );

  const categoryLabels = {
    pinturas: 'Pinturas',
    murales: 'Murales',
    colaboraciones: 'Colaboraciones',
    intervenciones: 'Intervenciones',
  };

  const statusConfig = {
    available: { label: 'Disponible', badgeClass: 'badge-avail' },
    featured: { label: 'Destacada', badgeClass: 'badge-feat' },
    sold: { label: 'Vendida', badgeClass: 'badge-sold' },
  };

  const visibilityConfig = {
    draft: { label: 'Borrador', pillClass: 'is-draft' },
    published: { label: 'Publicada', pillClass: 'is-published' },
    hidden: { label: 'Oculta', pillClass: 'is-hidden' },
  };

  const refs = {};
  let artworks = [];
  let selectedArtworkId = null;
  let currentImageAsset = null;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheRefs();
    bindEvents();
    setFeedback('Cargando obras del servidor...', '');
    artworks = await loadArtworks();
    selectedArtworkId = artworks[0] ? artworks[0].id : null;

    renderLibrary();

    if (selectedArtworkId) {
      selectArtwork(selectedArtworkId);
    } else {
      startNewArtwork();
    }
    setFeedback('', '');
  }

  function cacheRefs() {
    refs.searchInput = document.getElementById('searchInput');
    refs.libraryCategoryFilter = document.getElementById('libraryCategoryFilter');
    refs.artworkList = document.getElementById('artworkList');
    refs.libraryCount = document.getElementById('libraryCount');
    refs.newArtworkBtn = document.getElementById('newArtworkBtn');
    refs.resetPrototypeBtn = document.getElementById('resetPrototypeBtn');
    refs.formHeading = document.getElementById('formHeading');
    refs.artworkForm = document.getElementById('artworkForm');
    refs.artworkId = document.getElementById('artworkId');
    refs.imageInput = document.getElementById('imageInput');
    refs.seedImageSelect = document.getElementById('seedImageSelect');
    refs.uploadDropzone = document.getElementById('uploadDropzone');
    refs.uploadFilename = document.getElementById('uploadFilename');
    refs.uploadMeta = document.getElementById('uploadMeta');
    refs.uploadPreviewImage = document.getElementById('uploadPreviewImage');
    refs.altInput = document.getElementById('altInput');
    refs.titleInput = document.getElementById('titleInput');
    refs.categoryInput = document.getElementById('categoryInput');
    refs.techniqueInput = document.getElementById('techniqueInput');
    refs.yearInput = document.getElementById('yearInput');
    refs.dimensionsInput = document.getElementById('dimensionsInput');
    refs.heightInput = document.getElementById('heightInput');
    refs.widthInput = document.getElementById('widthInput');
    refs.seriesInput = document.getElementById('seriesInput');
    refs.locationInput = document.getElementById('locationInput');
    refs.statusInput = document.getElementById('statusInput');
    refs.visibilityInput = document.getElementById('visibilityInput');
    refs.internalNoteInput = document.getElementById('internalNoteInput');
    refs.deleteArtworkBtn = document.getElementById('deleteArtworkBtn');
    refs.saveDraftBtn = document.getElementById('saveDraftBtn');
    refs.publishBtn = document.getElementById('publishBtn');
    refs.saveFeedback = document.getElementById('saveFeedback');
    refs.previewVisibility = document.getElementById('previewVisibility');
    refs.previewCardImage = document.getElementById('previewCardImage');
    refs.previewCardTitle = document.getElementById('previewCardTitle');
    refs.previewCardMeta = document.getElementById('previewCardMeta');
    refs.previewBadge = document.getElementById('previewBadge');
    refs.previewLightboxImage = document.getElementById('previewLightboxImage');
    refs.previewLightboxTitle = document.getElementById('previewLightboxTitle');
    refs.previewTechnique = document.getElementById('previewTechnique');
    refs.previewDimensions = document.getElementById('previewDimensions');
    refs.previewYear = document.getElementById('previewYear');
    refs.previewSeriesLabel = document.getElementById('previewSeriesLabel');
    refs.previewSeries = document.getElementById('previewSeries');
    refs.previewLocationLabel = document.getElementById('previewLocationLabel');
    refs.previewLocation = document.getElementById('previewLocation');
    refs.previewNote = document.getElementById('previewNote');
    refs.statusRadios = document.querySelectorAll('[name="status_ui"]');
    refs.successScreen = document.getElementById('successScreen');
    refs.successSubtitle = document.getElementById('successSubtitle');
    refs.successNewBtn = document.getElementById('successNewBtn');
  }

  function bindEvents() {
    refs.searchInput.addEventListener('input', renderLibrary);
    refs.libraryCategoryFilter.addEventListener('change', renderLibrary);
    refs.newArtworkBtn.addEventListener('click', startNewArtwork);
    refs.resetPrototypeBtn.addEventListener('click', resetPrototype);
    refs.artworkList.addEventListener('click', handleLibraryClick);
    refs.imageInput.addEventListener('change', handleImageInputChange);
    refs.seedImageSelect.addEventListener('change', handleSeedImageChange);
    refs.titleInput.addEventListener('input', handleTitleChange);
    refs.heightInput.addEventListener('input', syncDimensions);
    refs.widthInput.addEventListener('input', syncDimensions);
    refs.saveDraftBtn.addEventListener('click', function () { saveArtwork('draft'); });
    refs.deleteArtworkBtn.addEventListener('click', deleteArtwork);
    refs.artworkForm.addEventListener('submit', function (event) {
      event.preventDefault();
      saveArtwork('publish');
    });

    refs.artworkForm.addEventListener('input', updatePreviewFromForm);
    refs.artworkForm.addEventListener('change', updatePreviewFromForm);

    ['dragenter', 'dragover'].forEach(function (eventName) {
      refs.uploadDropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        refs.uploadDropzone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'dragend', 'drop'].forEach(function (eventName) {
      refs.uploadDropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        refs.uploadDropzone.classList.remove('is-dragover');
      });
    });

    refs.uploadDropzone.addEventListener('drop', function (event) {
      const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
      if (file) handleUploadedFile(file);
    });

    Array.prototype.forEach.call(refs.statusRadios, function (radio) {
      radio.addEventListener('change', function () {
        if (refs.statusInput) refs.statusInput.value = this.value;
        updatePreviewFromForm();
      });
    });

    if (refs.successNewBtn) {
      refs.successNewBtn.addEventListener('click', function () {
        if (refs.successScreen) refs.successScreen.classList.remove('is-visible');
        startNewArtwork();
      });
    }
  }

  async function loadArtworks() {
    try {
      const res = await fetch(API_BASE + '/artworks');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      return rows.map(normalizeArtwork);
    } catch (error) {
      console.error('Error al cargar obras del servidor:', error);
      setFeedback('No se pudo conectar al servidor. Revisa tu conexion.', 'error');
      return [];
    }
  }

  function normalizeArtwork(artwork) {
    return {
      id: artwork.id || '',
      title: artwork.title || '',
      category: artwork.category || 'pinturas',
      technique: artwork.technique || '',
      year: artwork.year || '',
      dimensions: artwork.dimensions || '',
      series: artwork.series || '',
      location: artwork.location || '',
      status: statusConfig[artwork.status] ? artwork.status : 'available',
      visibility: visibilityConfig[artwork.visibility] ? artwork.visibility : 'draft',
      alt: artwork.alt || '',
      note: artwork.note || '',
      imageSrc: artwork.image_url || artwork.imageSrc || '',
      imageKey: artwork.image_key || '',
      updatedAt: artwork.updated_at || artwork.updatedAt || new Date().toISOString(),
    };
  }

  function createEmptyArtwork() {
    return normalizeArtwork({
      title: '',
      category: 'pinturas',
      technique: '',
      year: String(new Date().getFullYear()),
      dimensions: '',
      series: '',
      location: '',
      status: 'available',
      visibility: 'draft',
      alt: '',
      note: '',
      imageSrc: '',
    });
  }

  function getFilteredArtworks() {
    const searchTerm = refs.searchInput ? refs.searchInput.value.trim().toLowerCase() : '';
    const category = refs.libraryCategoryFilter ? refs.libraryCategoryFilter.value : 'all';

    return artworks
      .slice()
      .sort(function (a, b) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .filter(function (artwork) {
        const matchesCategory = category === 'all' || artwork.category === category;
        const haystack = [
          artwork.title,
          artwork.series,
          artwork.technique,
          artwork.location,
        ].join(' ').toLowerCase();
        const matchesSearch = !searchTerm || haystack.indexOf(searchTerm) !== -1;

        return matchesCategory && matchesSearch;
      });
  }

  function renderLibrary() {
    const filtered = getFilteredArtworks();
    if (refs.libraryCount) {
      refs.libraryCount.textContent = filtered.length + (filtered.length === 1 ? ' pieza' : ' piezas');
    }

    if (!refs.artworkList) return;

    if (filtered.length === 0) {
      refs.artworkList.innerHTML = '<div class="empty-state">No hay resultados con ese filtro. Puedes crear una nueva obra o restaurar la demo.</div>';
      return;
    }

    refs.artworkList.innerHTML = filtered.map(function (artwork) {
      const visibility = visibilityConfig[artwork.visibility];
      const imageSrc = artwork.imageSrc || PLACEHOLDER_IMAGE;
      const cardMeta = buildCardMeta(artwork);

      return [
        '<button type="button" class="library-item' + (artwork.id === selectedArtworkId ? ' is-active' : '') + '" data-artwork-id="' + escapeHtml(artwork.id) + '">',
        '  <div class="library-thumb"><img src="' + escapeHtml(imageSrc) + '" alt="' + escapeHtml(artwork.alt || artwork.title || 'Obra sin titulo') + '"></div>',
        '  <div class="library-info">',
        '    <div class="library-item-title">' + escapeHtml(artwork.title || 'Nueva obra') + '</div>',
        '    <div class="library-item-meta">' + escapeHtml(cardMeta) + '</div>',
        '    <div class="library-item-footer">',
        '      <span class="admin-pill ' + visibility.pillClass + '">' + visibility.label + '</span>',
        '      <span class="admin-pill">' + escapeHtml(categoryLabels[artwork.category] || artwork.category) + '</span>',
        '    </div>',
        '  </div>',
        '</button>',
      ].join('');
    }).join('');
  }

  function handleLibraryClick(event) {
    const trigger = event.target.closest('[data-artwork-id]');
    if (!trigger) return;

    selectArtwork(trigger.dataset.artworkId);
  }

  function selectArtwork(artworkId) {
    const artwork = artworks.find(function (item) { return item.id === artworkId; });
    if (!artwork) return;

    selectedArtworkId = artworkId;
    populateForm(artwork);
    renderLibrary();
    refs.formHeading.textContent = artwork.title || 'Editar obra';
    refs.deleteArtworkBtn.disabled = false;
  }

  function startNewArtwork() {
    selectedArtworkId = null;
    populateForm(createEmptyArtwork());
    renderLibrary();
    refs.formHeading.textContent = 'Nueva obra';
    refs.deleteArtworkBtn.disabled = true;
    setFeedback('Completa la ficha y revisa la vista previa antes de guardar.', '');
  }

  function populateForm(artwork) {
    refs.artworkId.value = artwork.id || '';
    refs.titleInput.value = artwork.title;
    refs.categoryInput.value = artwork.category;
    refs.techniqueInput.value = artwork.technique;
    refs.yearInput.value = artwork.year;
    refs.dimensionsInput.value = artwork.dimensions;
    const dimsMatch = (artwork.dimensions || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
    refs.heightInput.value = dimsMatch ? dimsMatch[1] : '';
    refs.widthInput.value = dimsMatch ? dimsMatch[2] : '';
    refs.seriesInput.value = artwork.series;
    refs.locationInput.value = artwork.location;
    refs.statusInput.value = artwork.status;
    Array.prototype.forEach.call(refs.statusRadios, function (radio) {
      radio.checked = radio.value === artwork.status;
    });
    refs.visibilityInput.value = artwork.visibility;
    refs.altInput.value = artwork.alt;
    refs.internalNoteInput.value = artwork.note;
    refs.seedImageSelect.value = '';
    refs.imageInput.value = '';

    currentImageAsset = artwork.imageSrc ? {
      src: artwork.imageSrc,
      blob: null,
      name: artwork.title || 'imagen.webp',
      info: '',
      imageKind: 'r2',
    } : null;

    updateUploadPresentation();
    updatePreviewFromForm();
  }

  function syncDimensions() {
    const h = refs.heightInput.value.trim();
    const w = refs.widthInput.value.trim();
    refs.dimensionsInput.value = h && w ? h + ' × ' + w + ' cm' : '';
    updatePreviewFromForm();
  }

  function handleTitleChange() {
    if (!refs.altInput.value.trim()) {
      const title = refs.titleInput.value.trim();
      refs.altInput.value = title ? title + ', Salvador Sierra' : '';
    }

    updatePreviewFromForm();
  }

  function handleImageInputChange(event) {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (file) handleUploadedFile(file);
  }

  async function handleSeedImageChange() {
    const selectedSrc = refs.seedImageSelect.value;

    if (!selectedSrc) {
      currentImageAsset = null;
      updateUploadPresentation();
      updatePreviewFromForm();
      return;
    }

    try {
      const res = await fetch(selectedSrc);
      const seedBlob = await res.blob();
      currentImageAsset = {
        src: selectedSrc,
        blob: seedBlob,
        name: selectedSrc.split('/').pop(),
        info: 'Imagen de muestra.',
        imageKind: 'seed',
      };
    } catch (err) {
      currentImageAsset = { src: selectedSrc, blob: null, name: selectedSrc.split('/').pop(), info: '', imageKind: 'seed' };
    }

    updateUploadPresentation();
    updatePreviewFromForm();
  }

  async function handleUploadedFile(file) {
    try {
      if (refs.uploadDropzone) refs.uploadDropzone.classList.add('is-loading');
      if (refs.publishBtn) refs.publishBtn.disabled = true;

      var processFile = file;
      var isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
      if (isHeic && typeof heic2any !== 'undefined') {
        setFeedback('Convirtiendo formato iPhone (HEIC)...', '');
        var converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        processFile = new File([converted], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
      }

      setFeedback('Optimizando imagen...', '');
      const optimized = await optimizeImage(processFile);

      currentImageAsset = optimized;
      refs.seedImageSelect.value = '';

      if (!refs.altInput.value.trim() && refs.titleInput.value.trim()) {
        refs.altInput.value = refs.titleInput.value.trim() + ', Salvador Sierra';
      }

      updateUploadPresentation();
      updatePreviewFromForm();
      if (refs.uploadDropzone) refs.uploadDropzone.classList.remove('is-loading');
      if (refs.publishBtn) refs.publishBtn.disabled = false;
      setFeedback('Imagen lista. Se subira al guardar o publicar.', 'success');
    } catch (error) {
      console.error(error);
      if (refs.uploadDropzone) refs.uploadDropzone.classList.remove('is-loading');
      if (refs.publishBtn) refs.publishBtn.disabled = false;
      setFeedback('No pude procesar esa imagen. Intenta con otro archivo o usa una imagen de muestra.', 'error');
    }
  }

  function updateUploadPresentation() {
    const hasImage = Boolean(currentImageAsset && currentImageAsset.src);
    if (refs.uploadDropzone) refs.uploadDropzone.classList.toggle('has-image', hasImage);

    if (!currentImageAsset) {
      refs.uploadFilename.textContent = 'Haz clic aquí para subir la foto de la obra.';
      refs.uploadMeta.textContent = 'Todavia no hay imagen cargada.';
      if (refs.uploadPreviewImage) {
        refs.uploadPreviewImage.src = PLACEHOLDER_IMAGE;
        refs.uploadPreviewImage.alt = 'Sin imagen';
      }
      return;
    }

    refs.uploadFilename.textContent = currentImageAsset.name || 'Imagen cargada';
    refs.uploadMeta.textContent = currentImageAsset.info || 'Imagen lista para usarse en el preview.';
    if (refs.uploadPreviewImage) {
      refs.uploadPreviewImage.src = currentImageAsset.src;
      refs.uploadPreviewImage.alt = refs.altInput.value.trim() || refs.titleInput.value.trim() || 'Imagen de la obra';
    }
  }

  function updatePreviewFromForm() {
    const artwork = collectFormData();
    const imageSrc = artwork.imageSrc || PLACEHOLDER_IMAGE;
    const status = statusConfig[artwork.status] || statusConfig.available;
    const visibility = visibilityConfig[artwork.visibility] || visibilityConfig.draft;

    refs.previewCardImage.src = imageSrc;
    refs.previewCardImage.alt = artwork.alt || artwork.title || 'Obra sin titulo';
    refs.previewCardTitle.textContent = artwork.title || 'Titulo de la obra';
    refs.previewCardMeta.textContent = buildCardMeta(artwork);
    refs.previewBadge.textContent = status.label;
    refs.previewBadge.className = 'badge ' + status.badgeClass;

    refs.previewLightboxImage.src = imageSrc;
    refs.previewLightboxImage.alt = artwork.alt || artwork.title || 'Obra sin titulo';
    refs.previewLightboxTitle.textContent = artwork.title || 'Titulo de la obra';
    refs.previewTechnique.textContent = artwork.technique || 'Pendiente';
    refs.previewDimensions.textContent = artwork.dimensions || 'Pendiente';
    refs.previewYear.textContent = artwork.year || 'Pendiente';
    refs.previewVisibility.textContent = visibility.label;
    refs.previewVisibility.className = 'panel-status-chip' + (artwork.visibility === 'published' ? ' is-published' : '');
    refs.formHeading.textContent = artwork.title || (selectedArtworkId ? 'Editar obra' : 'Nueva obra');

    toggleOptionalPreview(refs.previewSeriesLabel, refs.previewSeries, artwork.series);
    toggleOptionalPreview(refs.previewLocationLabel, refs.previewLocation, artwork.location);

    refs.previewNote.textContent = artwork.note || 'Lo que se captura aqui es exactamente la informacion que luego alimentaria la tarjeta y el detalle del sitio.';
  }

  function toggleOptionalPreview(labelEl, valueEl, value) {
    const hasValue = Boolean(String(value || '').trim());
    labelEl.classList.toggle('hidden', !hasValue);
    valueEl.classList.toggle('hidden', !hasValue);
    valueEl.textContent = hasValue ? value : '';
  }

  function collectFormData() {
    return {
      id: refs.artworkId.value.trim(),
      title: refs.titleInput.value.trim(),
      category: refs.categoryInput.value,
      technique: refs.techniqueInput.value.trim(),
      year: refs.yearInput.value.trim(),
      dimensions: refs.dimensionsInput.value.trim(),
      series: refs.seriesInput.value.trim(),
      location: refs.locationInput.value.trim(),
      status: refs.statusInput.value,
      visibility: refs.visibilityInput.value,
      alt: refs.altInput.value.trim(),
      note: refs.internalNoteInput.value.trim(),
      imageSrc: currentImageAsset ? currentImageAsset.src : '',
    };
  }

  async function saveArtwork(mode) {
    const artwork = collectFormData();
    const validationError = validateArtwork(artwork, mode);

    if (validationError) {
      setFeedback(validationError, 'error');
      return;
    }

    if (mode === 'draft') {
      artwork.visibility = 'draft';
    } else if (mode === 'publish' && artwork.visibility === 'draft') {
      artwork.visibility = 'published';
    }

    if (refs.publishBtn) refs.publishBtn.disabled = true;
    if (refs.saveDraftBtn) refs.saveDraftBtn.disabled = true;
    setFeedback('Guardando en el servidor...', '');

    try {
      const isUpdate = Boolean(artwork.id) && artworks.some(function (a) { return a.id === artwork.id; });
      const form = new FormData();
      form.append('title', artwork.title);
      form.append('category', artwork.category);
      form.append('technique', artwork.technique);
      form.append('year', artwork.year);
      form.append('dimensions', artwork.dimensions);
      form.append('series', artwork.series);
      form.append('location', artwork.location);
      form.append('status', artwork.status);
      form.append('visibility', artwork.visibility);
      form.append('alt', artwork.alt);
      form.append('note', artwork.note);

      if (currentImageAsset && currentImageAsset.blob) {
        form.append('image', currentImageAsset.blob, currentImageAsset.name || 'imagen.webp');
      }

      let res;
      if (isUpdate) {
        if (currentImageAsset && currentImageAsset.blob) {
          res = await fetch(API_BASE + '/artworks/' + artwork.id, { method: 'PATCH', body: form });
        } else {
          res = await fetch(API_BASE + '/artworks/' + artwork.id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: artwork.title, category: artwork.category, technique: artwork.technique,
              year: artwork.year, dimensions: artwork.dimensions, series: artwork.series,
              location: artwork.location, status: artwork.status, visibility: artwork.visibility,
              alt: artwork.alt, note: artwork.note,
            }),
          });
        }
      } else {
        if (!currentImageAsset || !currentImageAsset.blob) {
          setFeedback('Para crear una obra nueva necesitas subir una imagen.', 'error');
          if (refs.publishBtn) refs.publishBtn.disabled = false;
          if (refs.saveDraftBtn) refs.saveDraftBtn.disabled = false;
          return;
        }
        res = await fetch(API_BASE + '/artworks', { method: 'POST', body: form });
      }

      if (!res.ok) {
        const err = await res.json().catch(function () { return { error: 'Error desconocido' }; });
        throw new Error(err.error || 'HTTP ' + res.status);
      }

      const saved = await res.json();
      const normalized = normalizeArtwork(saved);
      const existingIndex = artworks.findIndex(function (a) { return a.id === normalized.id; });
      if (existingIndex >= 0) {
        artworks[existingIndex] = normalized;
      } else {
        artworks.unshift(normalized);
      }

      selectedArtworkId = normalized.id;
      refs.artworkId.value = normalized.id;
      currentImageAsset = normalized.imageSrc ? { src: normalized.imageSrc, name: '', info: '', blob: null } : null;

      renderLibrary();
      populateForm(normalized);
      refs.formHeading.textContent = normalized.title || 'Editar obra';
      refs.deleteArtworkBtn.disabled = false;

      if (normalized.visibility === 'published') {
        if (refs.successScreen) {
          if (refs.successSubtitle) {
            refs.successSubtitle.textContent = '"' + normalized.title + '" ya esta visible en tu sitio.';
          }
          refs.successScreen.classList.add('is-visible');
        } else {
          setFeedback('Obra publicada en el sitio.', 'success');
        }
      } else if (normalized.visibility === 'hidden') {
        setFeedback('Obra guardada como oculta. Sigue disponible en el panel, pero no aparece en el sitio.', 'success');
      } else {
        setFeedback('Borrador guardado en el servidor.', 'success');
      }
    } catch (error) {
      console.error(error);
      setFeedback('Error al guardar: ' + error.message, 'error');
    } finally {
      if (refs.publishBtn) refs.publishBtn.disabled = false;
      if (refs.saveDraftBtn) refs.saveDraftBtn.disabled = false;
    }
  }

  function validateArtwork(artwork, mode) {
    if (!artwork.title) return 'Falta el titulo de la obra.';
    if (!artwork.technique) return 'Falta la tecnica.';
    if (!artwork.year) return 'Falta el ano.';
    if (!artwork.dimensions) return 'Faltan las dimensiones.';

    if (mode === 'publish' && !artwork.imageSrc) {
      return 'Para publicar necesitamos una imagen.';
    }

    return '';
  }

  async function deleteArtwork() {
    if (!selectedArtworkId) return;

    const artwork = artworks.find(function (item) { return item.id === selectedArtworkId; });
    if (!artwork) return;

    const shouldDelete = window.confirm('Eliminar "' + artwork.title + '" permanentemente del sitio?');
    if (!shouldDelete) return;

    setFeedback('Eliminando del servidor...', '');
    try {
      const res = await fetch(API_BASE + '/artworks/' + selectedArtworkId, { method: 'DELETE' });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      artworks = artworks.filter(function (item) { return item.id !== selectedArtworkId; });

      if (artworks[0]) {
        selectedArtworkId = artworks[0].id;
        renderLibrary();
        selectArtwork(selectedArtworkId);
      } else {
        renderLibrary();
        startNewArtwork();
      }

      setFeedback('Obra eliminada del sitio.', 'success');
    } catch (error) {
      console.error(error);
      setFeedback('Error al eliminar: ' + error.message, 'error');
    }
  }

  async function resetPrototype() {
    setFeedback('Recargando obras del servidor...', '');
    artworks = await loadArtworks();
    selectedArtworkId = artworks[0] ? artworks[0].id : null;
    renderLibrary();

    if (selectedArtworkId) {
      selectArtwork(selectedArtworkId);
    } else {
      startNewArtwork();
    }

    setFeedback('Lista actualizada desde el servidor.', 'success');
  }

  async function optimizeImage(file) {
    const originalDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(originalDataUrl);
    const size = getScaledDimensions(image.naturalWidth, image.naturalHeight, 1600);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = size.width;
    canvas.height = size.height;
    context.drawImage(image, 0, 0, size.width, size.height);

    let optimizedDataUrl;
    let extension = '.webp';

    try {
      optimizedDataUrl = canvas.toDataURL('image/webp', 0.86);
    } catch (error) {
      optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.86);
      extension = '.jpg';
    }

    const originalSize = file.size;
    const optimizedSize = getDataUrlSize(optimizedDataUrl);

    const blob = await new Promise(function (resolve) {
      canvas.toBlob(function (b) { resolve(b); }, extension === '.webp' ? 'image/webp' : 'image/jpeg', 0.86);
    });

    return {
      src: optimizedDataUrl,
      blob: blob,
      name: file.name.replace(/\.[^.]+$/, extension),
      info: 'Optimizada: ' + size.width + ' x ' + size.height + ' px - ' + formatBytes(originalSize) + ' a ' + formatBytes(optimizedSize) + '.',
      imageKind: 'upload',
      originalSize: originalSize,
      optimizedSize: optimizedSize,
      width: size.width,
      height: size.height,
    };
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();

      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      const image = new Image();

      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('No se pudo cargar la imagen.')); };
      image.src = dataUrl;
    });
  }

  function getScaledDimensions(width, height, maxSide) {
    if (width <= maxSide && height <= maxSide) {
      return { width: width, height: height };
    }

    const ratio = width > height ? maxSide / width : maxSide / height;

    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio),
    };
  }

  function getDataUrlSize(dataUrl) {
    const base64 = dataUrl.split(',')[1] || '';
    const padding = (base64.match(/=+$/) || [''])[0].length;
    return Math.ceil((base64.length * 3) / 4) - padding;
  }

  function buildCardMeta(artwork) {
    const parts = [];

    if (artwork.technique) parts.push(artwork.technique);
    if (artwork.dimensions) parts.push(artwork.dimensions);
    if (artwork.year) parts.push(artwork.year);

    if (parts.length === 0) return 'Completa la ficha para ver el resumen';
    return parts.join(' - ');
  }

  function setFeedback(message, tone) {
    refs.saveFeedback.textContent = message;
    refs.saveFeedback.className = 'form-feedback';

    if (tone === 'success') refs.saveFeedback.classList.add('is-success');
    if (tone === 'error') refs.saveFeedback.classList.add('is-error');
  }

  function generateId(label) {
    const base = String(label || 'obra')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    return base + '-' + Date.now().toString(36);
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
