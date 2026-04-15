# Admin Prototype

Este folder contiene un prototipo local del panel para Salvador Sierra.

## Objetivo

Validar primero el UX del flujo de alta y edicion de obra sin tocar todavia la infraestructura final.

## Que ya hace

- Muestra una biblioteca local de obras
- Permite crear, editar y eliminar piezas en el prototipo
- Permite subir una imagen y optimizarla localmente en el navegador
- Muestra preview de tarjeta publica y detalle tipo lightbox
- Guarda metadata en `localStorage`

## Que todavia no hace

- Login real
- Subida persistente de imagen a almacenamiento remoto
- Publicacion real en la web publica
- Roles o permisos

## Mapeo al futuro backend

- `localStorage` -> `D1` para metadata
- Imagen optimizada en navegador -> `R2` para imagen final
- Acceso local al panel -> `Cloudflare Access`
- Acciones del formulario -> `Pages Functions`

## Ruta local

- `http://localhost:4173/admin/`

## Nota

El sitio publico actual no se modifico para depender de este panel. Esta fase sirve para acordar la experiencia de Salvador antes de integrar la capa real de publicacion.
