# Admin Panel Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the admin panel so Salvador Sierra can upload, fill, and publish artwork in one viewport — no scrolling required on desktop, minimal scroll on mobile.

**Architecture:** Complete rewrite of `admin/index.html` and `css/admin.css`; five targeted edits to `js/admin.js` (no logic changes). Desktop uses a 2-column layout (upload zone left, fields right) sized to fill the viewport. Mobile collapses to single column. Success screen overlays the page after publish.

**Tech Stack:** Vanilla HTML/CSS/JS, existing CSS variables from `styles.css`, Google Fonts (Bebas Neue + Inter), Canvas API for image optimization (already implemented).

**Spec:** `docs/superpowers/specs/2026-04-13-admin-panel-redesign.md`

---

## File Map

| File | Action | What it does |
|---|---|---|
| `admin/index.html` | **Rewrite** | New 2-col layout, success screen, all IDs preserved |
| `css/admin.css` | **Rewrite** | New design system, upload states, status toggles |
| `js/admin.js` | **5 edits** | Radio sync, has-image class, is-loading state, success screen, library-info class |
| `admin-mockup.html` | **Delete** | Mockup only, not for production |

---

## Task 1: Rewrite `admin/index.html`

**Files:**
- Rewrite: `admin/index.html`

- [ ] **Step 1: Write the new HTML**

Replace the entire contents of `admin/index.html` with:

```html
<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panel · Salvador Sierra</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/admin.css">
</head>
<body class="admin-body">

  <!-- HEADER -->
  <header class="admin-header">
    <div class="admin-header-inner">
      <div class="admin-brand">
        <span class="admin-brand-kicker">Panel de obras</span>
        <span class="admin-brand-name">Salvador Sierra</span>
      </div>
      <div class="admin-header-end">
        <button type="button" id="resetPrototypeBtn" class="btn-ghost-sm">Restaurar demo</button>
        <a href="../" class="btn-ghost-sm">Ver sitio →</a>
        <button type="button" id="newArtworkBtn" class="btn-new-sm">+ Nueva obra</button>
      </div>
    </div>
  </header>

  <!-- PANTALLA DE ÉXITO (oculta por defecto) -->
  <div class="success-screen" id="successScreen" aria-live="polite">
    <div class="success-inner">
      <div class="success-check" aria-hidden="true">
        <svg viewBox="0 0 52 52" fill="none">
          <circle class="success-circle" cx="26" cy="26" r="24" stroke="currentColor" stroke-width="2"/>
          <path class="success-checkmark" d="M14 26l8 8 16-16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="success-title">¡Publicada!</p>
      <p class="success-subtitle" id="successSubtitle">La obra ya está visible en tu sitio.</p>
      <div class="success-btns">
        <button type="button" id="successNewBtn" class="btn-success-new">+ Subir otra obra</button>
        <a href="../" class="btn-success-view">Ver sitio →</a>
      </div>
    </div>
  </div>

  <!-- MAIN -->
  <main class="admin-main" id="adminMain">
    <div class="admin-inner">

      <!-- PANEL FORMULARIO -->
      <section class="admin-panel">

        <div class="panel-head">
          <div class="panel-head-left">
            <h1 class="panel-title" id="formHeading">Nueva obra</h1>
            <span class="panel-status-chip" id="previewVisibility">Borrador</span>
          </div>
          <button type="button" id="deleteArtworkBtn" class="btn-delete" disabled>Eliminar</button>
        </div>

        <form id="artworkForm" novalidate>
          <input type="hidden" id="artworkId">

          <div class="form-two-col">

            <!-- Columna izquierda: upload -->
            <div class="col-upload">
              <p class="block-label"><span class="block-num">1</span>Foto de la obra</p>

              <label class="upload-zone" id="uploadDropzone">
                <input type="file" id="imageInput" accept="image/*" class="upload-input">
                <div class="upload-placeholder">
                  <svg class="upload-icon" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="8" width="38" height="28" rx="2.5"/>
                    <circle cx="16" cy="20" r="4"/>
                    <path d="M3 28 l10-9 8 7 6-5 14 13"/>
                    <path d="M30 8V3M30 3l-3.5 3.5M30 3l3.5 3.5"/>
                  </svg>
                  <strong class="upload-cta" id="uploadFilename">Toca aquí para subir la foto</strong>
                  <span class="upload-sub">JPG, PNG o WebP · máx 20 MB</span>
                  <span class="upload-hint" id="uploadMeta">o toma la foto desde tu iPhone directamente</span>
                </div>
                <div class="upload-loading">
                  <div class="upload-spinner" aria-hidden="true"></div>
                  <span>Optimizando imagen…</span>
                </div>
                <img id="uploadPreviewImage" class="upload-preview" src="" alt="">
                <div class="upload-overlay"><span>Toca para cambiar</span></div>
              </label>

              <details class="inner-accordion">
                <summary>Usar imagen de muestra del catálogo</summary>
                <div class="inner-accordion-body">
                  <label class="field">
                    <span>Imagen de muestra</span>
                    <select id="seedImageSelect">
                      <option value="">Ninguna</option>
                      <option value="../images/salvador-sierra-mascaras-health-70x50.webp">Máscaras · HEALTH</option>
                      <option value="../images/salvador-sierra-el-rostro-de-ulises.webp">El Rostro de Ulises</option>
                      <option value="../images/salvador-sierra-mural-amazon-cedis-tepotzotlan.webp">Amazon CEDIS</option>
                      <option value="../images/salvador-sierra-tecnica-mixta-error-digital.webp">Error Digital</option>
                    </select>
                  </label>
                </div>
              </details>
            </div>

            <!-- Columna derecha: datos, estado, acciones -->
            <div class="col-fields">
              <p class="block-label"><span class="block-num">2</span>Datos de la obra</p>

              <label class="field field--big">
                <span>Título *</span>
                <input type="text" id="titleInput" placeholder="Ej. Máscaras · Luz" required autocomplete="off">
              </label>

              <div class="field-row-3">
                <label class="field">
                  <span>Técnica *</span>
                  <input type="text" id="techniqueInput" placeholder="Acrílico" required autocomplete="off">
                </label>
                <label class="field">
                  <span>Año *</span>
                  <input type="number" id="yearInput" min="1900" max="2100" placeholder="2026" required>
                </label>
                <label class="field">
                  <span>Medidas *</span>
                  <input type="text" id="dimensionsInput" placeholder="50 × 40 cm" required autocomplete="off">
                </label>
              </div>

              <div class="field-row-2">
                <label class="field">
                  <span>Colección o serie</span>
                  <input type="text" id="seriesInput" placeholder="Ej. Máscaras, Pop Art…" autocomplete="off">
                </label>
                <label class="field">
                  <span>Categoría</span>
                  <select id="categoryInput">
                    <option value="pinturas">Pintura</option>
                    <option value="murales">Mural</option>
                    <option value="colaboraciones">Colaboración</option>
                    <option value="intervenciones">Intervención</option>
                  </select>
                </label>
              </div>

              <div class="block-sep"></div>
              <p class="block-label"><span class="block-num">3</span>Estado y publicación</p>

              <p class="field-sublabel">¿La pieza está disponible para venta?</p>
              <div class="status-group">
                <label class="status-opt">
                  <input type="radio" name="status_ui" value="available" id="statusAvailable">
                  <span class="status-opt__label status-opt__label--avail">Disponible</span>
                </label>
                <label class="status-opt status-opt--feat">
                  <input type="radio" name="status_ui" value="featured" id="statusFeatured">
                  <span class="status-opt__label status-opt__label--feat">Destacada</span>
                </label>
                <label class="status-opt status-opt--sold">
                  <input type="radio" name="status_ui" value="sold" id="statusSold">
                  <span class="status-opt__label status-opt__label--sold">Vendida</span>
                </label>
              </div>
              <!-- select oculto para compatibilidad con JS existente -->
              <select id="statusInput" class="visually-hidden" tabindex="-1" aria-hidden="true">
                <option value="available">Disponible</option>
                <option value="featured">Destacada</option>
                <option value="sold">Vendida</option>
              </select>

              <label class="field">
                <span>¿Publicar en el sitio?</span>
                <select id="visibilityInput">
                  <option value="draft">No todavía — guardar como borrador</option>
                  <option value="published">Sí — publicar ahora en el sitio</option>
                  <option value="hidden">Ocultar temporalmente</option>
                </select>
              </label>

              <details class="extra-accordion">
                <summary>Opciones adicionales (ubicación, nota, SEO)</summary>
                <div class="extra-accordion-body">
                  <label class="field">
                    <span>Texto alt (para Google)</span>
                    <input type="text" id="altInput" placeholder="Ej. Máscaras HEALTH, acrílico, Salvador Sierra">
                  </label>
                  <label class="field">
                    <span>Ubicación de la obra</span>
                    <input type="text" id="locationInput" placeholder="Ej. Tepotzotlán, Edomex">
                  </label>
                  <label class="field">
                    <span>Nota interna (solo tú la ves)</span>
                    <textarea id="internalNoteInput" rows="3" placeholder="Ej. Falta confirmar medidas."></textarea>
                  </label>
                </div>
              </details>

              <div class="form-actions">
                <p class="form-feedback" id="saveFeedback"></p>
                <div class="form-btns">
                  <button type="button" id="saveDraftBtn" class="btn-draft">Guardar borrador</button>
                  <button type="submit" id="publishBtn" class="btn-publish">Publicar →</button>
                </div>
              </div>

            </div><!-- /col-fields -->
          </div><!-- /form-two-col -->
        </form>

        <!-- PREVIEW (colapsado por defecto) -->
        <details class="preview-accordion">
          <summary>Ver cómo quedará en el sitio</summary>
          <div class="preview-accordion-body">
            <div class="preview-grid">
              <div>
                <p class="preview-col-label">Tarjeta de galería</p>
                <article class="obra-card admin-public-card">
                  <div class="obra-img">
                    <div class="obra-img-inner">
                      <img id="previewCardImage" src="../images/salvador-sierra-mascaras-health-70x50.webp" alt="">
                    </div>
                  </div>
                  <div class="obra-info">
                    <div>
                      <div class="obra-title" id="previewCardTitle">Mascaras - HEALTH</div>
                      <div class="obra-meta" id="previewCardMeta">Acrílico - 70 × 50 cm - 2026</div>
                    </div>
                    <span class="badge badge-feat" id="previewBadge">Destacada</span>
                  </div>
                </article>
              </div>
              <div>
                <p class="preview-col-label">Detalle al hacer clic</p>
                <div class="preview-lightbox-shell">
                  <div class="preview-lightbox-image">
                    <img id="previewLightboxImage" src="../images/salvador-sierra-mascaras-health-70x50.webp" alt="">
                  </div>
                  <div class="preview-lightbox-details">
                    <h3 class="lightbox-title" id="previewLightboxTitle">Mascaras - HEALTH</h3>
                    <dl class="lightbox-meta preview-lightbox-meta">
                      <dt>Técnica</dt><dd id="previewTechnique">Acrílico</dd>
                      <dt>Dimensiones</dt><dd id="previewDimensions">70 × 50 cm</dd>
                      <dt>Año</dt><dd id="previewYear">2026</dd>
                      <dt id="previewSeriesLabel">Serie</dt><dd id="previewSeries">Mascaras</dd>
                      <dt id="previewLocationLabel">Ubicación</dt><dd id="previewLocation">-</dd>
                    </dl>
                    <p class="preview-lightbox-note" id="previewNote">Lo que llenas arriba se ve aquí de inmediato.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>

      </section><!-- /admin-panel -->

      <!-- BIBLIOTECA -->
      <section class="admin-library">
        <div class="library-head">
          <div>
            <h2 class="library-title">Mis obras guardadas</h2>
            <p class="library-sub">Toca una obra para editarla o publicarla.</p>
          </div>
          <span class="library-count" id="libraryCount">0 piezas</span>
        </div>
        <div class="library-filters">
          <label class="field">
            <span>Buscar</span>
            <input type="search" id="searchInput" placeholder="Título, técnica o serie…">
          </label>
          <label class="field">
            <span>Filtrar por tipo</span>
            <select id="libraryCategoryFilter">
              <option value="all">Todas</option>
              <option value="pinturas">Pinturas</option>
              <option value="murales">Murales</option>
              <option value="colaboraciones">Colaboraciones</option>
              <option value="intervenciones">Intervenciones</option>
            </select>
          </label>
        </div>
        <div class="library-grid" id="artworkList" aria-live="polite"></div>
      </section>

    </div>
  </main>

  <script src="../js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify IDs are intact**

Run in browser console at `http://localhost:4173/admin/`:
```js
const required = ['artworkForm','artworkId','imageInput','seedImageSelect','uploadDropzone',
  'uploadFilename','uploadMeta','uploadPreviewImage','altInput','titleInput','categoryInput',
  'techniqueInput','yearInput','dimensionsInput','seriesInput','locationInput','statusInput',
  'visibilityInput','internalNoteInput','deleteArtworkBtn','saveDraftBtn','publishBtn',
  'saveFeedback','previewVisibility','previewCardImage','previewCardTitle','previewCardMeta',
  'previewBadge','previewLightboxImage','previewLightboxTitle','previewTechnique',
  'previewDimensions','previewYear','previewSeriesLabel','previewSeries','previewLocationLabel',
  'previewLocation','previewNote','formHeading','newArtworkBtn','resetPrototypeBtn',
  'searchInput','libraryCategoryFilter','artworkList','libraryCount',
  'successScreen','successSubtitle','successNewBtn'];
const missing = required.filter(id => !document.getElementById(id));
console.log(missing.length ? 'MISSING: ' + missing.join(', ') : 'ALL IDs OK');
```
Expected: `ALL IDs OK`

---

## Task 2: Rewrite `css/admin.css`

**Files:**
- Rewrite: `css/admin.css`

- [ ] **Step 1: Write the new CSS**

Replace the entire contents of `css/admin.css` with:

```css
/* ================================================================
   ADMIN PANEL — Salvador Sierra López · Merol Media 2026
================================================================ */

/* ── Utilidades ── */
.hidden { display: none !important; }
.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

/* ── Body ── */
.admin-body { min-height: 100vh; background: var(--bg); }

/* ══════════════════════════════════════════
   HEADER
══════════════════════════════════════════ */

.admin-header {
  position: sticky; top: 0; z-index: 200;
  height: 52px;
  border-bottom: 1px solid var(--border);
  background: rgba(10,10,10,0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.admin-header-inner {
  max-width: 1140px; margin: 0 auto;
  padding: 0 1.75rem; height: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
}

.admin-brand { display: flex; flex-direction: column; gap: 2px; line-height: 1; }
.admin-brand-kicker { font-size: 0.5rem; letter-spacing: 3px; text-transform: uppercase; color: var(--text-low); }
.admin-brand-name { font-family: var(--font-display); font-size: 1.1rem; letter-spacing: 2px; color: var(--text); }

.admin-header-end { display: flex; align-items: center; gap: 0.6rem; }

.btn-ghost-sm {
  padding: 0.5rem 0.9rem;
  background: transparent; color: var(--text-mid);
  font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase;
  font-family: var(--font-body); border: 1px solid var(--border-2);
  cursor: pointer; text-decoration: none;
  display: inline-flex; align-items: center; white-space: nowrap;
  transition: color var(--t-fast), border-color var(--t-fast);
}
.btn-ghost-sm:hover { color: var(--text); border-color: var(--text-low); }

.btn-new-sm {
  padding: 0.5rem 1rem;
  background: var(--red); color: #fff;
  font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase;
  font-family: var(--font-body); border: none; cursor: pointer; white-space: nowrap;
  transition: background var(--t-fast);
}
.btn-new-sm:hover { background: #bf2829; }

/* ══════════════════════════════════════════
   PANTALLA DE ÉXITO
══════════════════════════════════════════ */

.success-screen {
  display: none;
  position: fixed; inset: 0; z-index: 300;
  background: var(--bg);
  align-items: center; justify-content: center; padding: 2rem;
}
.success-screen.is-visible { display: flex; }

.success-inner {
  display: flex; flex-direction: column; align-items: center;
  gap: 1.25rem; text-align: center; max-width: 480px;
}

.success-check { width: 72px; height: 72px; color: #8fd18f; }

.success-circle {
  stroke-dasharray: 151; stroke-dashoffset: 151;
  animation: draw-circle 0.5s ease forwards;
}
.success-checkmark {
  stroke-dasharray: 36; stroke-dashoffset: 36;
  animation: draw-check 0.4s ease 0.45s forwards;
}
@keyframes draw-circle { to { stroke-dashoffset: 0; } }
@keyframes draw-check  { to { stroke-dashoffset: 0; } }

.success-title {
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 6vw, 4.5rem);
  letter-spacing: 3px; color: #8fd18f; line-height: 1;
}
.success-subtitle { font-size: 0.9rem; color: var(--text-mid); line-height: 1.7; max-width: 36ch; }

.success-btns {
  display: flex; gap: 0.75rem; flex-wrap: wrap;
  justify-content: center; width: 100%; margin-top: 0.5rem;
}

.btn-success-new {
  flex: 1 1 200px; padding: 1rem 1.5rem;
  background: var(--red); color: #fff;
  font-family: var(--font-display); font-size: 1.1rem; letter-spacing: 3px;
  border: none; cursor: pointer; transition: background var(--t-fast);
}
.btn-success-new:hover { background: #bf2829; }

.btn-success-view {
  flex: 1 1 200px; padding: 1rem 1.5rem;
  background: transparent; color: var(--text);
  font-family: var(--font-display); font-size: 1.1rem; letter-spacing: 3px;
  border: 1px solid var(--border-2); text-align: center; text-decoration: none;
  display: inline-flex; align-items: center; justify-content: center;
  transition: border-color var(--t-fast);
}
.btn-success-view:hover { border-color: var(--text-low); }

/* ══════════════════════════════════════════
   LAYOUT PRINCIPAL
══════════════════════════════════════════ */

.admin-main { padding: 1.25rem 1.75rem 4rem; }

.admin-inner {
  max-width: 1140px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 1.25rem;
}

/* ══════════════════════════════════════════
   PANEL (tarjeta del formulario)
══════════════════════════════════════════ */

.admin-panel { border: 1px solid var(--border); background: var(--bg-2); }

.panel-head {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
}
.panel-head-left { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

.panel-title {
  font-family: var(--font-display); font-size: 1.85rem;
  letter-spacing: 2px; line-height: 1; color: var(--text);
}

.panel-status-chip {
  display: inline-flex; align-items: center; padding: 0.28rem 0.65rem;
  font-size: 0.5rem; letter-spacing: 2px; text-transform: uppercase;
  border: 1px solid rgba(214,48,49,0.4); color: var(--red); background: rgba(214,48,49,0.06);
}
.panel-status-chip.is-published {
  border-color: rgba(143,209,143,0.45); color: #8fd18f; background: rgba(143,209,143,0.06);
}

.btn-delete {
  padding: 0.45rem 0.85rem; background: transparent; color: var(--text-low);
  font-size: 0.58rem; letter-spacing: 2px; text-transform: uppercase;
  font-family: var(--font-body); border: 1px solid var(--border); cursor: pointer;
  transition: color var(--t-fast), border-color var(--t-fast);
}
.btn-delete:not(:disabled):hover { color: var(--red); border-color: rgba(214,48,49,0.45); }
.btn-delete:disabled { opacity: 0.3; cursor: not-allowed; }

/* ══════════════════════════════════════════
   DOS COLUMNAS
══════════════════════════════════════════ */

.form-two-col {
  display: grid;
  grid-template-columns: 38% 1fr;
  /* 52px header + 1.25rem main-padding + ~58px panel-head */
  height: calc(100svh - 52px - 1.25rem - 58px);
  min-height: 480px;
}

/* ── Columna izquierda: upload ── */
.col-upload {
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 1.25rem 1.5rem; gap: 0;
  background: var(--bg);
}

/* ── Columna derecha: campos ── */
.col-fields {
  display: flex; flex-direction: column;
  padding: 1.25rem 1.5rem; gap: 0.7rem;
  overflow-y: auto;
  background: var(--bg-2);
}

/* ── Etiquetas de bloque ── */
.block-label {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.55rem; letter-spacing: 4px; text-transform: uppercase;
  color: var(--text-low); margin-bottom: 0.1rem; flex-shrink: 0;
}
.block-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px;
  border: 1px solid rgba(214,48,49,0.45); color: var(--red);
  font-family: var(--font-display); font-size: 0.85rem; letter-spacing: 0; flex-shrink: 0;
}
.block-sep { height: 1px; background: var(--border); margin: 0.5rem 0; flex-shrink: 0; }

/* ══════════════════════════════════════════
   ZONA DE UPLOAD
══════════════════════════════════════════ */

.upload-zone {
  flex: 1; display: block; position: relative;
  border: 2px dashed var(--border-2); background: var(--bg-3);
  cursor: pointer; overflow: hidden; min-height: 0;
  transition: border-color var(--t-fast);
  margin-bottom: 0.75rem;
}
.upload-zone:hover, .upload-zone.is-dragover { border-color: var(--red); }
.upload-input { display: none; }

/* Sin imagen */
.upload-placeholder {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.6rem; padding: 1.75rem; text-align: center;
  pointer-events: none; transition: opacity var(--t-fast);
}
.upload-icon { width: 42px; height: 42px; color: var(--text-low); flex-shrink: 0; }
.upload-cta { font-family: var(--font-display); font-size: 1.35rem; letter-spacing: 2px; color: var(--text); line-height: 1.2; }
.upload-sub { font-size: 0.7rem; color: var(--text-low); }
.upload-hint { font-size: 0.65rem; color: var(--text-low); margin-top: -0.1rem; }

/* Cargando */
.upload-loading {
  position: absolute; inset: 0; display: none;
  flex-direction: column; align-items: center; justify-content: center;
  gap: 0.85rem; background: rgba(10,10,10,0.78); pointer-events: none;
}
.upload-loading span { font-size: 0.65rem; letter-spacing: 3px; text-transform: uppercase; color: var(--text-mid); }
.upload-spinner {
  width: 32px; height: 32px;
  border: 2px solid var(--border-2); border-top-color: var(--red);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Con imagen */
.upload-preview {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: contain; background: var(--bg-3);
  display: none; pointer-events: none;
}
.upload-overlay {
  position: absolute; inset: 0; background: rgba(10,10,10,0.6);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity var(--t-fast); pointer-events: none;
}
.upload-overlay span { font-size: 0.62rem; letter-spacing: 3px; text-transform: uppercase; color: #fff; }

/* Toggles de estado (controlados por JS) */
.upload-zone.has-image .upload-placeholder { opacity: 0; pointer-events: none; }
.upload-zone.has-image .upload-preview { display: block; }
.upload-zone.has-image:hover .upload-overlay { opacity: 1; }
.upload-zone.is-loading .upload-placeholder { display: none; }
.upload-zone.is-loading .upload-loading { display: flex; }

/* Accordion de muestra */
.inner-accordion { border: 1px solid var(--border); flex-shrink: 0; }
.inner-accordion summary {
  padding: 0.65rem 0.9rem; font-size: 0.58rem; letter-spacing: 2px; text-transform: uppercase;
  color: var(--text-low); cursor: pointer; list-style: none;
  display: flex; align-items: center; justify-content: space-between;
  user-select: none; transition: color var(--t-fast);
}
.inner-accordion summary::-webkit-details-marker { display: none; }
.inner-accordion summary::after { content: '+'; font-size: 0.9rem; line-height: 1; }
.inner-accordion[open] summary::after { content: '−'; }
.inner-accordion summary:hover { color: var(--text-mid); }
.inner-accordion-body { padding: 0.85rem; border-top: 1px solid var(--border); }

/* ══════════════════════════════════════════
   CAMPOS
══════════════════════════════════════════ */

.field { display: flex; flex-direction: column; gap: 0.38rem; }

.field span, .field-sublabel {
  font-size: 0.55rem; letter-spacing: 3px; text-transform: uppercase; color: var(--text-low);
}
.field-sublabel { margin-bottom: 0.4rem; display: block; flex-shrink: 0; }

.field input, .field select, .field textarea {
  width: 100%; border: 1px solid var(--border-2);
  background: var(--bg); color: var(--text);
  padding: 0.78rem 0.95rem; font-family: var(--font-body);
  font-size: 0.9rem; font-weight: 300;
  transition: border-color var(--t-fast);
  appearance: none; -webkit-appearance: none;
}
.field select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23444' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.9rem center; padding-right: 2.25rem;
}
.field textarea { min-height: 75px; resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: rgba(214,48,49,0.6); }
.field--big input { font-size: 1.05rem; padding: 0.88rem 1rem; }

.field-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.6rem; }
.field-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }

/* ── Status toggle ── */
.status-group { display: flex; flex-shrink: 0; }
.status-opt { flex: 1; cursor: pointer; }
.status-opt input[type="radio"] { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }

.status-opt__label {
  display: flex; align-items: center; justify-content: center;
  padding: 0.72rem 0.4rem; font-size: 0.58rem; letter-spacing: 2px; text-transform: uppercase;
  color: var(--text-low); border: 1px solid var(--border-2); background: var(--bg);
  transition: all var(--t-fast); cursor: pointer; white-space: nowrap;
}
.status-opt + .status-opt .status-opt__label { margin-left: -1px; }

.status-opt input:checked + .status-opt__label--avail {
  border-color: rgba(143,209,143,0.5); color: #8fd18f; background: rgba(143,209,143,0.06);
}
.status-opt input:checked + .status-opt__label--feat {
  border-color: rgba(107,63,160,0.5); color: #b48ce0; background: rgba(107,63,160,0.08);
}
.status-opt input:checked + .status-opt__label--sold {
  border-color: var(--border-2); color: var(--text-low); background: var(--bg-3);
}

/* ── Accordion extra ── */
.extra-accordion { border-top: 1px solid var(--border); flex-shrink: 0; }
.extra-accordion > summary {
  padding: 0.7rem 0; font-size: 0.58rem; letter-spacing: 2px; text-transform: uppercase;
  color: var(--text-low); cursor: pointer; list-style: none;
  display: flex; align-items: center; justify-content: space-between;
  user-select: none; transition: color var(--t-fast);
}
.extra-accordion > summary::-webkit-details-marker { display: none; }
.extra-accordion > summary::after { content: '+'; font-size: 0.9rem; line-height: 1; }
.extra-accordion[open] > summary::after { content: '−'; }
.extra-accordion > summary:hover { color: var(--text-mid); }
.extra-accordion-body { padding: 0 0 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }

/* ── Acciones del formulario ── */
.form-actions {
  margin-top: auto; padding-top: 0.85rem;
  border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.75rem; flex-wrap: wrap; flex-shrink: 0;
}
.form-feedback {
  flex: 1 1 200px; font-size: 0.78rem; line-height: 1.6;
  color: var(--text-mid); min-height: 1.1rem;
}
.form-feedback.is-success { color: #8fd18f; }
.form-feedback.is-error   { color: #ff9a9a; }
.form-btns { display: flex; gap: 0.6rem; flex-wrap: wrap; }

.btn-draft {
  padding: 0.72rem 1.25rem; background: transparent; color: var(--text-mid);
  font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase;
  font-family: var(--font-body); border: 1px solid var(--border-2); cursor: pointer;
  transition: color var(--t-fast), border-color var(--t-fast);
}
.btn-draft:hover { color: var(--text); border-color: var(--text-low); }

.btn-publish {
  padding: 0.72rem 1.75rem; background: var(--red); color: #fff;
  font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 3px;
  border: none; cursor: pointer; transition: background var(--t-fast), transform var(--t-fast);
}
.btn-publish:hover { background: #bf2829; transform: translateY(-1px); }
.btn-publish:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* ══════════════════════════════════════════
   PREVIEW ACCORDION
══════════════════════════════════════════ */

.preview-accordion { border-top: 1px solid var(--border); }
.preview-accordion > summary {
  padding: 0.85rem 1.5rem; font-size: 0.58rem; letter-spacing: 2px; text-transform: uppercase;
  color: var(--text-low); cursor: pointer; list-style: none;
  display: flex; align-items: center; justify-content: space-between;
  user-select: none; transition: color var(--t-fast);
}
.preview-accordion > summary::-webkit-details-marker { display: none; }
.preview-accordion > summary::after { content: '↓ Ver preview'; font-size: 0.58rem; letter-spacing: 2px; }
.preview-accordion[open] > summary::after { content: '↑ Cerrar preview'; }
.preview-accordion > summary:hover { color: var(--text-mid); }
.preview-accordion-body { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border); }
.preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
.preview-col-label { font-size: 0.52rem; letter-spacing: 3px; text-transform: uppercase; color: var(--text-low); margin-bottom: 0.6rem; }

/* Preview: overrides de clases del lightbox público */
.preview-lightbox-shell { border: 1px solid var(--border); background: var(--bg); padding: 0.85rem; display: flex; flex-direction: column; gap: 0.75rem; }
.preview-lightbox-image { aspect-ratio: 4/5; overflow: hidden; background: var(--bg-3); }
.preview-lightbox-image img { width: 100%; height: 100%; object-fit: cover; }
.preview-lightbox-shell .lightbox-title { font-size: 1.25rem; margin-bottom: 0.6rem; }
.preview-lightbox-shell .lightbox-meta { margin-bottom: 0.5rem; gap: 0.3rem 0.85rem; }
.preview-lightbox-shell .lightbox-meta dt { font-size: 0.5rem; }
.preview-lightbox-shell .lightbox-meta dd { font-size: 0.82rem; }
.preview-lightbox-note { font-size: 0.72rem; color: var(--text-low); line-height: 1.6; }
.admin-public-card { cursor: default; }
.admin-public-card:hover .obra-img-inner,
.admin-public-card:hover .obra-img-inner img { transform: none !important; }

/* ══════════════════════════════════════════
   BIBLIOTECA
══════════════════════════════════════════ */

.admin-library { border: 1px solid var(--border); background: var(--bg-2); }

.library-head {
  padding: 1.1rem 1.5rem 0.9rem; border-bottom: 1px solid var(--border);
  display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
}
.library-title { font-family: var(--font-display); font-size: 1.65rem; letter-spacing: 2px; color: var(--text); line-height: 1; margin-bottom: 0.25rem; }
.library-sub { font-size: 0.72rem; color: var(--text-low); }
.library-count { display: inline-flex; align-items: center; padding: 0.28rem 0.65rem; font-size: 0.5rem; letter-spacing: 2px; text-transform: uppercase; border: 1px solid var(--border-2); color: var(--text-low); background: var(--bg); white-space: nowrap; flex-shrink: 0; }

.library-filters { padding: 0.85rem 1.5rem; border-bottom: 1px solid var(--border); display: grid; grid-template-columns: 1.4fr 1fr; gap: 0.65rem; }
.library-grid { padding: 1.1rem 1.5rem; display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.65rem; }

/* Library items (HTML generado por JS) */
.library-item { width: 100%; border: 1px solid var(--border); background: var(--bg); color: var(--text); padding: 0; display: flex; flex-direction: column; text-align: left; cursor: pointer; overflow: hidden; transition: border-color var(--t-fast), transform var(--t-fast); }
.library-item:hover { border-color: var(--border-2); transform: translateY(-2px); }
.library-item.is-active { border-color: var(--red); box-shadow: 0 0 0 1px rgba(214,48,49,0.15); }
.library-thumb { aspect-ratio: 4/5; width: 100%; overflow: hidden; background: var(--bg-3); flex-shrink: 0; }
.library-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform var(--t-slow); }
.library-item:hover .library-thumb img { transform: scale(1.04); }
.library-info { padding: 0.6rem 0.7rem; flex: 1; }
.library-item-title { font-family: var(--font-display); font-size: 0.95rem; letter-spacing: 1.2px; line-height: 1.1; margin-bottom: 0.2rem; color: var(--text); }
.library-item-meta { font-size: 0.65rem; color: var(--text-low); line-height: 1.4; margin-bottom: 0.4rem; }
.library-item-footer { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.admin-pill { display: inline-flex; align-items: center; padding: 0.18rem 0.42rem; font-size: 0.48rem; letter-spacing: 1.5px; text-transform: uppercase; border: 1px solid var(--border-2); color: var(--text-low); }
.admin-pill.is-published { border-color: rgba(143,209,143,0.4); color: #8fd18f; }
.admin-pill.is-draft { border-color: rgba(107,63,160,0.4); color: #b48ce0; }
.empty-state { grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-low); font-size: 0.85rem; border: 1px dashed var(--border); line-height: 1.7; }

/* ══════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════ */

@media (max-width: 900px) {
  .admin-header-inner, .admin-main { padding-left: 1.25rem; padding-right: 1.25rem; }
  .form-two-col { display: flex; flex-direction: column; height: auto; }
  .col-upload { border-right: none; border-bottom: 1px solid var(--border); }
  .upload-zone { flex: none; height: 220px; margin-bottom: 0.75rem; }
  .col-fields { overflow: visible; }
  .field-row-3 { grid-template-columns: 1fr 1fr; }
  .library-filters { grid-template-columns: 1fr; }
  .library-grid { grid-template-columns: repeat(3, 1fr); }
  .preview-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .admin-header-inner, .admin-main { padding-left: 1rem; padding-right: 1rem; }
  #resetPrototypeBtn { display: none; }
  .col-upload, .col-fields { padding: 1rem; }
  .upload-zone { height: 190px; }
  .field-row-3 { grid-template-columns: 1fr; }
  .library-grid { grid-template-columns: repeat(2, 1fr); padding: 0.85rem; }
  .library-head, .library-filters { padding-left: 1rem; padding-right: 1rem; }
  .form-btns { width: 100%; }
  .btn-draft, .btn-publish { flex: 1; justify-content: center; display: flex; align-items: center; }
  .success-btns { flex-direction: column; }
}

@media (max-width: 380px) {
  .status-opt__label { font-size: 0.5rem; padding: 0.65rem 0.25rem; }
  .library-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Verificar layout en browser**

Abre `http://localhost:4173/admin/` y confirma:
1. Header compacto (52px) con brand + botones
2. Panel de 2 columnas llena el viewport sin scrollear en desktop
3. Columna izquierda: zona de upload con ícono y texto
4. Columna derecha: todos los campos visibles + botón "Publicar →" visible
5. En móvil (DevTools < 600px): todo cabe en una columna

---

## Task 3: Editar `js/admin.js` — 5 cambios quirúrgicos

**Files:**
- Modify: `js/admin.js`

No se toca la lógica de negocio. Solo se agregan/modifican las partes indicadas.

- [ ] **Step 1: Añadir nuevos refs en `cacheRefs()`**

Encuentra la línea:
```js
    refs.previewNote = document.getElementById('previewNote');
  }
```

Reemplaza con:
```js
    refs.previewNote = document.getElementById('previewNote');
    refs.statusRadios = document.querySelectorAll('[name="status_ui"]');
    refs.successScreen = document.getElementById('successScreen');
    refs.successSubtitle = document.getElementById('successSubtitle');
    refs.successNewBtn = document.getElementById('successNewBtn');
  }
```

- [ ] **Step 2: Sincronizar radios y botón de éxito en `bindEvents()`**

Encuentra la línea:
```js
    refs.uploadDropzone.addEventListener('drop', function (event) {
      const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
      if (file) handleUploadedFile(file);
    });
  }
```

Reemplaza con:
```js
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
```

- [ ] **Step 3: Sincronizar radios en `populateForm()`**

Encuentra la línea:
```js
    refs.statusInput.value = artwork.status;
```

Reemplaza con:
```js
    refs.statusInput.value = artwork.status;
    Array.prototype.forEach.call(refs.statusRadios, function (radio) {
      radio.checked = radio.value === artwork.status;
    });
```

- [ ] **Step 4: Toggle `has-image` en `updateUploadPresentation()`**

Encuentra la línea:
```js
  function updateUploadPresentation() {
    if (!currentImageAsset) {
```

Reemplaza con:
```js
  function updateUploadPresentation() {
    var hasImage = Boolean(currentImageAsset && currentImageAsset.src);
    if (refs.uploadDropzone) refs.uploadDropzone.classList.toggle('has-image', hasImage);

    if (!currentImageAsset) {
```

- [ ] **Step 5: Estado `is-loading` durante optimización en `handleUploadedFile()`**

Encuentra:
```js
  async function handleUploadedFile(file) {
    try {
      setFeedback('Optimizando imagen localmente para simular el flujo final...', '');
      const optimized = await optimizeImage(file);
```

Reemplaza con:
```js
  async function handleUploadedFile(file) {
    try {
      if (refs.uploadDropzone) refs.uploadDropzone.classList.add('is-loading');
      setFeedback('Optimizando imagen localmente para simular el flujo final...', '');
      const optimized = await optimizeImage(file);
```

Luego encuentra (dentro del mismo try, después de `setFeedback(..., 'success')`):
```js
      setFeedback('Imagen lista. El preview ahora usa la version optimizada en este navegador.', 'success');
    } catch (error) {
      console.error(error);
      setFeedback('No pude procesar esa imagen. Intenta con otro archivo o usa una imagen de muestra.', 'error');
    }
  }
```

Reemplaza con:
```js
      if (refs.uploadDropzone) refs.uploadDropzone.classList.remove('is-loading');
      setFeedback('Imagen lista. El preview ahora usa la version optimizada en este navegador.', 'success');
    } catch (error) {
      console.error(error);
      if (refs.uploadDropzone) refs.uploadDropzone.classList.remove('is-loading');
      setFeedback('No pude procesar esa imagen. Intenta con otro archivo o usa una imagen de muestra.', 'error');
    }
  }
```

- [ ] **Step 6: Mostrar pantalla de éxito en `saveArtwork()`**

Encuentra:
```js
      if (artwork.visibility === 'published') {
        setFeedback('Obra guardada como publicada en este prototipo local.', 'success');
```

Reemplaza con:
```js
      if (artwork.visibility === 'published') {
        if (refs.successScreen) {
          if (refs.successSubtitle) {
            refs.successSubtitle.textContent = '"' + artwork.title + '" ya está visible en tu sitio.';
          }
          refs.successScreen.classList.add('is-visible');
        }
        setFeedback('Obra guardada como publicada en este prototipo local.', 'success');
```

- [ ] **Step 7: Añadir clase `library-info` en `renderLibrary()`**

Encuentra (dentro del array de strings del return de renderLibrary):
```js
        '  <div>',
```

Reemplaza con:
```js
        '  <div class="library-info">',
```

- [ ] **Step 8: Verificar flujo completo en browser**

En `http://localhost:4173/admin/`:

1. **Radio buttons**: tocar "Vendida" → el botón se oscurece; tocar "Disponible" → se pone verde
2. **Upload + loading**: subir imagen real → aparece spinner brevemente → imagen llena la zona
3. **has-image overlay**: pasar el cursor sobre imagen cargada → aparece "Toca para cambiar"
4. **Guardar borrador**: llenar título + técnica + año + medidas → clic "Guardar borrador" → chip cambia a "Borrador", feedback en verde
5. **Publicar**: cambiar visibilidad a "Sí — publicar ahora" → clic "Publicar →" → aparece pantalla de éxito con "¡Publicada!" y nombre de la obra
6. **Volver**: clic "+ Subir otra obra" → regresa al formulario limpio
7. **Library**: clic en una obra de la biblioteca → formulario se llena y radio correcto queda seleccionado

---

## Task 4: Limpieza y commit

**Files:**
- Delete: `admin-mockup.html`

- [ ] **Step 1: Eliminar el mockup**

```bash
rm "/Volumes/MDMaster/Pintor-Salvador Sierra/03-Web/admin-mockup.html"
```

- [ ] **Step 2: Verificar estado de git**

```bash
cd "/Volumes/MDMaster/Pintor-Salvador Sierra/03-Web" && git status
```

Archivos esperados como untracked/modified:
- `admin/index.html`
- `admin/README.md`
- `css/admin.css`
- `js/admin.js`
- `docs/superpowers/specs/2026-04-13-admin-panel-redesign.md`
- `docs/superpowers/plans/2026-04-13-admin-panel-redesign.md`

- [ ] **Step 3: Stage y commit**

```bash
cd "/Volumes/MDMaster/Pintor-Salvador Sierra/03-Web" && git add admin/index.html admin/README.md css/admin.css js/admin.js docs/
git commit -m "$(cat <<'EOF'
feat: redesign admin panel — 2-col viewport layout, success screen, image loading state

- 2-column desktop layout (upload left, fields right) fits in first viewport
- Mobile single-column, all required fields above the fold
- Upload zone shows spinner while optimizing iPhone/large photos
- Status as visual radio toggles (disponible/destacada/vendida)
- Success screen with animated checkmark after publishing
- Library as image-dominant grid (5 cols desktop, 2 mobile)
- JS: radio sync, has-image class, is-loading state, success screen trigger

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected output: `[feature/web-adjustments <hash>] feat: redesign admin panel…`
