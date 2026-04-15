# Spec: Rediseño del panel de administración de obras
**Fecha:** 2026-04-13
**Proyecto:** Salvador Sierra — sitio estático (Cloudflare Pages)
**Rama:** feature/web-adjustments

---

## Contexto

El panel admin actual (`admin/index.html`) es un prototipo local generado por Codex. Su propósito es permitir que Salvador Sierra López suba obras nuevas, llene su ficha y las publique en la galería del sitio — sin tocar el código.

El problema: la interfaz es visualmente confusa, con demasiado texto explicativo, una barra lateral de preview que compite con el formulario, y un header desproporcionado. Salvador tiene poca experiencia con herramientas web, por lo que la claridad y la ausencia de fricción son el requisito más importante.

Este documento especifica el rediseño completo de la interfaz. La lógica JavaScript de Codex (optimización de imagen, localStorage, validación) se conserva íntegra — solo cambian HTML y CSS, con ajustes mínimos al JS para sincronizar los nuevos controles visuales.

---

## Objetivo de diseño

**Todo el flujo principal cabe en el primer pantallazo**, tanto en desktop como en móvil. Salvador llega, ve la zona de upload, sube la foto, llena los datos y presiona "Publicar" sin scrollear.

---

## Layout

### Desktop (≥ 900px)

Dos columnas dentro de un panel de ancho máximo 1100px centrado:

- **Columna izquierda (~38%):** zona de upload que ocupa toda la altura disponible
- **Columna derecha (~62%):** encabezado del panel + todos los campos + botones de acción

El header de página es compacto (52px). El panel de dos columnas llena el resto del viewport. La biblioteca de obras guardadas queda debajo del fold.

### Móvil (< 900px)

Una sola columna. Orden de los elementos de arriba a abajo:

1. Zona de upload compacta (~190px)
2. Título
3. Técnica + Año (fila de 2 columnas)
4. Medidas
5. Estado (disponible / destacada / vendida)
6. Visibilidad (select)
7. Botón "Publicar →"
8. Accordion "Más opciones" (colección, categoría, alt, ubicación, nota)
9. [Debajo del fold] Biblioteca de obras guardadas

---

## Componentes

### 1. Header de página

- Altura: 52px, sticky, con blur
- Izquierda: kicker "Panel de obras" + nombre "Salvador Sierra" en Bebas Neue
- Derecha: botón "Restaurar demo" (ghost) + "Ver sitio →" (ghost) + "+ Nueva obra" (rojo)

### 2. Panel de formulario

**Cabecera del panel:**
- Título dinámico (`formHeading`): "Nueva obra" o el título de la obra en edición
- Chip de estado (`previewVisibility`): "Borrador" / "Publicada" / "Oculta"
- Botón "Eliminar" (gris, deshabilitado hasta que se seleccione una obra existente)

**Bloque 1 — Foto (columna izquierda en desktop):**

Zona de upload (`uploadDropzone`) con dos estados:

- **Sin imagen:** SVG de cámara centrado + "Toca aquí para subir la foto" (Bebas Neue ~22px) + "JPG, PNG, WebP · máx 20 MB" + "o toma la foto con tu iPhone directamente"
- **Procesando:** el fondo de la zona se oscurece + spinner animado + texto "Optimizando imagen…"
- **Con imagen:** la imagen ocupa toda la zona con `object-fit: contain` + overlay "Toca para cambiar" al hover

El `<input type="file" accept="image/*">` ya activa la cámara en iOS sin cambios adicionales. La optimización (Canvas API → WebP 86% · máx 1600px) ya está implementada en `optimizeImage()`.

Debajo de la zona: accordion colapsado "Usar imagen de muestra del catálogo" con el `select#seedImageSelect`.

**Bloque 2 — Datos (columna derecha en desktop, debajo del upload en móvil):**

| Campo | ID | Tipo | Obligatorio |
|---|---|---|---|
| Título | `titleInput` | text | Sí |
| Técnica | `techniqueInput` | text | Sí |
| Año | `yearInput` | number | Sí |
| Medidas | `dimensionsInput` | text | Sí |
| Colección o serie | `seriesInput` | text | No |
| Categoría | `categoryInput` | select | No |

Desktop: Título solo en su fila. Técnica + Año + Medidas en fila de 3. Colección + Categoría en fila de 2.
Móvil: Todo en columna única, excepto Técnica + Año que van juntos en fila de 2.

**Bloque 3 — Estado y publicación:**

- Etiqueta: "¿La pieza está disponible?"
- Tres botones tipo radio visual (`name="status_ui"`): Disponible / Destacada / Vendida
  - Disponible (seleccionado por defecto): borde y texto verde `#8fd18f`
  - Destacada: borde y texto púrpura `#b48ce0`
  - Vendida: borde neutro, texto gris
- `select#statusInput` oculto visualmente (`.visually-hidden`) para compatibilidad con el JS existente
- `select#visibilityInput` con opciones claras:
  - "No todavía — guardar como borrador" → `draft`
  - "Sí — publicar ahora en el sitio" → `published`
  - "Ocultar temporalmente" → `hidden`

**Accordion "Opciones adicionales":**

Colapsado por defecto. Contiene: alt text (`altInput`), ubicación (`locationInput`), nota interna (`internalNoteInput`).

**Barra de acciones (fija al fondo del panel en desktop):**

- Izquierda: mensaje de feedback (`saveFeedback`) — neutral / verde éxito / rojo error
- Derecha: "Guardar borrador" (ghost) + "Publicar →" (rojo, Bebas Neue)

**Accordion de preview (al fondo del panel, colapsado):**

"Ver cómo quedará en el sitio" → abre el grid 2 columnas con la tarjeta de galería y el detalle tipo lightbox. Los overrides de tamaño para `.lightbox-title` y `.lightbox-meta` ya están aplicados en `admin.css`.

### 3. Pantalla de éxito

Reemplaza el formulario tras publicar. Centrada, ocupa todo el panel:

- Círculo con palomita verde animada (CSS keyframe: `strokeDashoffset` de 100 a 0)
- "¡Publicada!" en Bebas Neue (~52px, verde)
- Subtítulo: `"[nombre de la obra]" ya está visible en tu sitio.` (texto dinámico con el título)
- Dos botones de ancho completo en móvil, lado a lado en desktop:
  - "+ Subir otra obra" → rojo → resetea el formulario y oculta la pantalla de éxito
  - "Ver sitio →" → ghost → `href="../"`

La pantalla de éxito se muestra con clase `is-visible` en un elemento `#successScreen` que empieza con `display: none`.

### 4. Biblioteca de obras guardadas

Debajo del fold. Grid de tarjetas:
- Desktop: 5 columnas dentro del panel de 1100px
- Tablet: 3-4 columnas
- Móvil: 2 columnas

Cada tarjeta: thumbnail 4:5 + título + meta (técnica · año) + chip de estado. Al hacer clic: carga la obra en el formulario.

Barra de búsqueda + filtro de categoría arriba del grid.

---

## Manejo de imágenes

El flujo ya está implementado en `optimizeImage()` dentro de `admin.js`. No requiere backend.

- **Formatos aceptados:** `image/*` — incluye HEIC (iPhone), JPG, PNG, WebP
- **En iOS Safari:** `accept="image/*"` muestra automáticamente "Tomar foto" o "Elegir de la biblioteca"
- **HEIC/iPhone:** iOS Safari convierte HEIC a JPEG antes de pasarlo al File API; el Canvas API lo recibe sin problema
- **Proceso de optimización:** Canvas resize → máx 1600px en el lado más largo → `toDataURL('image/webp', 0.86)` → fallback a JPEG si WebP no soportado
- **UX durante optimización:** la zona de upload muestra estado de carga (`upload-zone.is-loading`) con spinner CSS y texto "Optimizando imagen…"; el botón Publicar queda deshabilitado durante este proceso

---

## Cambios necesarios en admin.js

Son mínimos y no tocan la lógica de negocio:

1. **Radio buttons de estado:** en `cacheRefs()` añadir `refs.statusRadios = document.querySelectorAll('[name="status_ui"]')`. En `bindEvents()` sincronizar `statusInput` al cambiar radio. En `populateForm()` marcar el radio correcto al cargar una obra.

2. **Clase `has-image` en upload zone:** en `updateUploadPresentation()` añadir `uploadDropzone.classList.toggle('has-image', Boolean(currentImageAsset))` para activar el estado visual con imagen cargada.

3. **Estado de carga durante optimización:** en `handleUploadedFile()` añadir `uploadDropzone.classList.add('is-loading')` al inicio y `classList.remove('is-loading')` al terminar.

4. **Pantalla de éxito:** en `saveArtwork()`, cuando `visibility === 'published'`, mostrar `#successScreen` con el título de la obra. El botón "+ Subir otra obra" llama a `startNewArtwork()` y oculta la pantalla.

5. **Clase `library-info`:** en `renderLibrary()` el div interno del item pasa de `<div>` a `<div class="library-info">` para permitir estilos CSS correctos.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `admin/index.html` | Reescritura completa |
| `css/admin.css` | Reescritura completa |
| `js/admin.js` | 5 cambios quirúrgicos (ver sección anterior) |
| `admin-mockup.html` | Eliminar antes de merge a main |

---

## Lo que NO cambia

- El modelo de datos de las obras (mismos campos, mismos IDs)
- La lógica de localStorage
- La lógica de validación
- La función `optimizeImage()` y sus helpers
- Los IDs del DOM usados por el JS existente
- El CSS de `styles.css` (compartido con el sitio público)
- Los badges, obra-card y lightbox-meta del sitio público

---

## Fuera del alcance (Phase 2)

- Login real / autenticación (Cloudflare Access)
- Subida persistente de imagen (Cloudflare R2)
- Publicación real en el sitio (Pages Functions + D1)
- Blog
- E-commerce
