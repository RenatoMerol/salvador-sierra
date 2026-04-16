// Script de migración — un solo uso
// Lee las 43 <article class="obra-card"> del index.html, sube sus imágenes a R2,
// e inserta filas en D1 con visibility='published'.
//
// Uso (desde /Volumes/MDMaster/Pintor-Salvador Sierra/03-Web):
//   node worker/migrate.mjs
//
// Requisitos: wrangler logged in (ya está), D1 y R2 bucket creados (ya están).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const HTML_PATH = join(ROOT, 'index.html');
const IMAGES_DIR = join(ROOT, 'images');
const BUCKET = 'salvador-sierra-images';
const DB = 'salvador-sierra-db';
const R2_PUBLIC = 'https://pub-dc75536b2ad048bdb0bbcec10e7e9445.r2.dev';

// ──────────────────────────────────────────
// Parse HTML con regex (suficiente para HTML predecible)
// ──────────────────────────────────────────
const html = readFileSync(HTML_PATH, 'utf8');
const articleRe = /<article class="obra-card[^"]*"([^>]*)>([\s\S]*?)<\/article>/g;

const artworks = [];
let match;
while ((match = articleRe.exec(html)) !== null) {
  const attrs = match[1];
  const inner = match[2];

  const pick = (name) => {
    const m = new RegExp(`data-${name}="([^"]*)"`).exec(attrs);
    return m ? decodeEntities(m[1]) : '';
  };

  const imgMatch = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/.exec(inner);
  const badgeMatch = /badge\s+badge-([a-z]+)/.exec(inner);
  const techniqueMatch = /<div class="obra-meta">([^<]+)<\/div>/.exec(inner);

  const category = pick('category') || 'pinturas';
  const title = pick('title');
  const year = parseInt(pick('year'), 10) || new Date().getFullYear();
  const dimensions = pick('dimensions') || '—';
  const technique = pick('technique') || 'Técnica mixta';
  const series = pick('series') || '';
  const location = pick('location') || '';
  const collaborator = pick('collaborator') || '';
  const note = collaborator ? `Colaboración: ${collaborator}` : '';

  const imageSrc = imgMatch ? imgMatch[1] : '';
  const alt = imgMatch ? decodeEntities(imgMatch[2]) : title;
  const statusRaw = badgeMatch ? badgeMatch[1] : 'avail';
  const status = ({ avail: 'available', feat: 'featured', sold: 'sold' })[statusRaw] || 'available';

  artworks.push({
    id: randomUUID(),
    title, category, technique, year, dimensions, series, location,
    status, visibility: 'published', alt, note,
    localImage: imageSrc, // ej: "images/salvador-sierra-mascaras-iugh-50x40.webp"
  });
}

console.log(`✓ Parsed ${artworks.length} artworks from index.html`);

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function slugify(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function sqlEscape(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ──────────────────────────────────────────
// Subir cada imagen a R2 + registrar image_url/image_key
// ──────────────────────────────────────────
let uploaded = 0, skipped = 0;
for (const a of artworks) {
  const localPath = join(ROOT, a.localImage.replace(/^\/?images\//, 'images/'));
  if (!a.localImage || !existsSync(localPath)) {
    console.warn(`  ⚠ Sin imagen local: ${a.title} (${a.localImage}) — salteando upload, usando placeholder`);
    a.image_key = 'placeholder.webp';
    a.image_url = `${R2_PUBLIC}/placeholder.webp`;
    skipped++;
    continue;
  }
  const slug = slugify(a.title).slice(0, 60) || 'obra';
  const key = `migrated/${slug}-${a.id.slice(0, 8)}.webp`;
  process.stdout.write(`  ↑ Subiendo ${key} ... `);
  try {
    execSync(
      `wrangler r2 object put "${BUCKET}/${key}" --file="${localPath}" --content-type="image/webp" --remote`,
      { stdio: 'pipe' }
    );
    a.image_key = key;
    a.image_url = `${R2_PUBLIC}/${key}`;
    uploaded++;
    process.stdout.write('ok\n');
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  }
}
console.log(`✓ Uploaded ${uploaded} images to R2 (${skipped} skipped)`);

// ──────────────────────────────────────────
// Generar SQL masivo e insertar en D1
// ──────────────────────────────────────────
const sqlLines = artworks.map((a, i) => {
  const vals = [
    a.id, a.title, a.category, a.technique, a.year, a.dimensions,
    a.series || null, a.location || null, a.status, a.visibility,
    a.alt || null, a.note || null, a.image_url, a.image_key, i + 1,
  ].map(sqlEscape).join(', ');
  return `INSERT INTO artworks (id,title,category,technique,year,dimensions,series,location,status,visibility,alt,note,image_url,image_key,sort_order) VALUES (${vals});`;
});

const sqlFile = join(__dirname, '_migration-data.sql');
writeFileSync(sqlFile, sqlLines.join('\n') + '\n');
console.log(`✓ Wrote ${sqlLines.length} INSERTs to ${sqlFile}`);

process.stdout.write('  → Ejecutando en D1 (remote) ... ');
try {
  execSync(`wrangler d1 execute ${DB} --file="${sqlFile}" --remote`, { stdio: 'pipe', cwd: ROOT });
  process.stdout.write('ok\n');
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}

console.log(`\n✅ Migration complete — ${artworks.length} artworks in D1, ${uploaded} images in R2.`);
