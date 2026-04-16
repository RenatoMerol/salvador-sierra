// Salvador Sierra — Admin API Worker
// Endpoints:
//   GET    /api/artworks/public        — público, solo visibility='published'
//   GET    /api/artworks               — admin, todas las obras
//   POST   /api/artworks               — admin, multipart/form-data con 'image' + campos
//   PATCH  /api/artworks/:id           — admin, update parcial (JSON)
//   DELETE /api/artworks/:id           — admin, borra D1 + R2
//
// Auth: Cloudflare Access intercepta antes, inyecta Cf-Access-Jwt-Assertion.
// El Worker confía en la presencia del JWT (Access ya validó la firma y el email).

const ALLOWED_CATEGORIES = ['pinturas', 'murales', 'colaboraciones', 'intervenciones'];
const ALLOWED_STATUS = ['available', 'featured', 'sold'];
const ALLOWED_VISIBILITY = ['draft', 'published', 'hidden'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return corsResponse(env);
    }

    try {
      // Público: galería del sitio
      if (pathname === '/api/artworks/public' && method === 'GET') {
        return withCors(await listPublic(env), env);
      }

      // Todo lo demás requiere auth de Cloudflare Access
      const auth = requireAccessAuth(request);
      if (auth instanceof Response) return withCors(auth, env);

      if (pathname === '/api/artworks' && method === 'GET') {
        return withCors(await listAll(env), env);
      }

      if (pathname === '/api/artworks' && method === 'POST') {
        return withCors(await createArtwork(request, env), env);
      }

      const patchMatch = pathname.match(/^\/api\/artworks\/([^/]+)$/);
      if (patchMatch && method === 'PATCH') {
        return withCors(await updateArtwork(patchMatch[1], request, env), env);
      }
      if (patchMatch && method === 'DELETE') {
        return withCors(await deleteArtwork(patchMatch[1], env), env);
      }

      return withCors(jsonResponse({ error: 'Not found' }, 404), env);
    } catch (err) {
      console.error(err);
      return withCors(jsonResponse({ error: err.message || 'Server error' }, 500), env);
    }
  },
};

// ───────────────────────────────────────────────────────────
// AUTH
// ───────────────────────────────────────────────────────────
function requireAccessAuth(request) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) {
    return jsonResponse({ error: 'Unauthorized — Access JWT missing' }, 401);
  }
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) throw new Error('Malformed JWT');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.email) throw new Error('No email in JWT');
    return { email: payload.email };
  } catch {
    return jsonResponse({ error: 'Unauthorized — invalid JWT' }, 401);
  }
}

// ───────────────────────────────────────────────────────────
// HANDLERS
// ───────────────────────────────────────────────────────────
async function listPublic(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM artworks WHERE visibility = 'published' ORDER BY sort_order ASC, created_at DESC`
  ).all();
  return jsonResponse(results);
}

async function listAll(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM artworks ORDER BY updated_at DESC`
  ).all();
  return jsonResponse(results);
}

async function createArtwork(request, env) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return jsonResponse({ error: 'Expected multipart/form-data' }, 400);
  }

  const form = await request.formData();
  const image = form.get('image');
  if (!image || typeof image === 'string') {
    return jsonResponse({ error: 'Missing image file' }, 400);
  }

  const data = extractArtworkFields(form);
  const validation = validateArtwork(data);
  if (validation) return jsonResponse({ error: validation }, 400);

  // Subir imagen a R2
  const id = crypto.randomUUID();
  const ext = guessExt(image.type);
  const slug = slugify(data.title).slice(0, 60) || 'obra';
  const imageKey = `${Date.now()}-${slug}-${id.slice(0, 8)}.${ext}`;

  await env.IMAGES.put(imageKey, image.stream(), {
    httpMetadata: { contentType: image.type || 'image/webp' },
  });
  const imageUrl = `${env.R2_PUBLIC_URL}/${imageKey}`;

  // Calcular sort_order = max + 1
  const { results: maxRow } = await env.DB.prepare(
    `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM artworks`
  ).all();
  const sortOrder = (maxRow[0]?.max_order ?? 0) + 1;

  await env.DB.prepare(
    `INSERT INTO artworks
      (id, title, category, technique, year, dimensions, series, location,
       status, visibility, alt, note, image_url, image_key, sort_order)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`
  ).bind(
    id, data.title, data.category, data.technique, data.year, data.dimensions,
    data.series || null, data.location || null, data.status, data.visibility,
    data.alt || null, data.note || null, imageUrl, imageKey, sortOrder
  ).run();

  const row = await env.DB.prepare(`SELECT * FROM artworks WHERE id = ?1`).bind(id).first();
  return jsonResponse(row, 201);
}

async function updateArtwork(id, request, env) {
  const existing = await env.DB.prepare(`SELECT * FROM artworks WHERE id = ?1`).bind(id).first();
  if (!existing) return jsonResponse({ error: 'Not found' }, 404);

  const contentType = request.headers.get('content-type') || '';
  let updates = {};
  let newImage = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    updates = extractArtworkFields(form);
    const img = form.get('image');
    if (img && typeof img !== 'string') newImage = img;
  } else if (contentType.includes('application/json')) {
    updates = await request.json();
  }

  // Normaliza campos permitidos
  const fields = ['title', 'category', 'technique', 'year', 'dimensions', 'series',
    'location', 'status', 'visibility', 'alt', 'note'];
  const setParts = [];
  const values = [];
  let idx = 1;
  for (const f of fields) {
    if (updates[f] !== undefined) {
      setParts.push(`${f} = ?${idx++}`);
      values.push(updates[f] === '' ? null : updates[f]);
    }
  }

  // Si hay imagen nueva, subir a R2 y reemplazar URL (borrar la anterior)
  if (newImage) {
    const ext = guessExt(newImage.type);
    const slug = slugify(updates.title || existing.title).slice(0, 60) || 'obra';
    const imageKey = `${Date.now()}-${slug}-${id.slice(0, 8)}.${ext}`;
    await env.IMAGES.put(imageKey, newImage.stream(), {
      httpMetadata: { contentType: newImage.type || 'image/webp' },
    });
    const imageUrl = `${env.R2_PUBLIC_URL}/${imageKey}`;
    setParts.push(`image_url = ?${idx++}`, `image_key = ?${idx++}`);
    values.push(imageUrl, imageKey);
    // borrar la anterior (mejor esfuerzo)
    if (existing.image_key) {
      await env.IMAGES.delete(existing.image_key).catch(() => {});
    }
  }

  if (setParts.length === 0) {
    return jsonResponse({ error: 'Nothing to update' }, 400);
  }

  setParts.push(`updated_at = datetime('now')`);
  values.push(id);

  await env.DB.prepare(
    `UPDATE artworks SET ${setParts.join(', ')} WHERE id = ?${idx}`
  ).bind(...values).run();

  const row = await env.DB.prepare(`SELECT * FROM artworks WHERE id = ?1`).bind(id).first();
  return jsonResponse(row);
}

async function deleteArtwork(id, env) {
  const existing = await env.DB.prepare(`SELECT * FROM artworks WHERE id = ?1`).bind(id).first();
  if (!existing) return jsonResponse({ error: 'Not found' }, 404);

  await env.DB.prepare(`DELETE FROM artworks WHERE id = ?1`).bind(id).run();
  if (existing.image_key) {
    await env.IMAGES.delete(existing.image_key).catch(() => {});
  }
  return jsonResponse({ deleted: id });
}

// ───────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────
function extractArtworkFields(form) {
  return {
    title: (form.get('title') || '').toString().trim(),
    category: (form.get('category') || 'pinturas').toString().trim(),
    technique: (form.get('technique') || '').toString().trim(),
    year: parseInt(form.get('year'), 10) || new Date().getFullYear(),
    dimensions: (form.get('dimensions') || '').toString().trim(),
    series: (form.get('series') || '').toString().trim(),
    location: (form.get('location') || '').toString().trim(),
    status: (form.get('status') || 'available').toString().trim(),
    visibility: (form.get('visibility') || 'draft').toString().trim(),
    alt: (form.get('alt') || '').toString().trim(),
    note: (form.get('note') || '').toString().trim(),
  };
}

function validateArtwork(d) {
  if (!d.title) return 'Título requerido';
  if (!d.technique) return 'Técnica requerida';
  if (!d.year || d.year < 1900 || d.year > 2100) return 'Año inválido';
  if (!d.dimensions) return 'Dimensiones requeridas';
  if (!ALLOWED_CATEGORIES.includes(d.category)) return 'Categoría inválida';
  if (!ALLOWED_STATUS.includes(d.status)) return 'Estado inválido';
  if (!ALLOWED_VISIBILITY.includes(d.visibility)) return 'Visibilidad inválida';
  return null;
}

function slugify(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function guessExt(mime) {
  if (!mime) return 'webp';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  return 'bin';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8' },
  });
}

function corsResponse(env) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(env),
  });
}

function withCors(response, env) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(env);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, cf-access-jwt-assertion',
    'Access-Control-Max-Age': '86400',
  };
}
