/**
 * convert-images.mjs
 * Convierte fotos de obras a WebP con calidad 90 (libvips / sharp)
 * HEIC → convierte primero a JPG temporal con sips (nativo macOS), luego a WebP
 * Uso: node convert-images.mjs
 */

import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const SOURCES = [
  '../02-Media/Originales/Acrilico',
  '../02-Media/Originales/Aerosol',
  '../02-Media/Originales/Tecnica mixta',
  '../02-Media/Originales/50x40',
  '../02-Media/Originales/70x50',
  '../02-Media/Finales/Acrilico',
  '../02-Media/Finales/Aerosol',
  '../02-Media/Finales/Tecnica mixta',
];

const OUTPUT_DIR = './images';
const QUALITY   = 90;
const MAX_WIDTH = 2400;

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tiff', '.tif']);
const HEIC_EXT  = new Set(['.heic', '.heif']);

mkdirSync(OUTPUT_DIR, { recursive: true });

let converted = 0;
let skipped   = 0;
let total     = 0;

for (const sourceDir of SOURCES) {
  let files;
  try {
    files = readdirSync(sourceDir);
  } catch {
    continue;
  }

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!SUPPORTED.has(ext)) continue;

    total++;
    const inputPath = join(sourceDir, file);
    const nameClean = basename(file, extname(file))
      .replace(/\s+/g, '-')
      .replace(/[()]/g, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '')
      .toLowerCase();
    const outputPath = join(OUTPUT_DIR, `${nameClean}.webp`);

    let workingPath = inputPath;
    let tempPath    = null;

    try {
      const stat = statSync(inputPath);
      if (stat.size === 0) { skipped++; continue; }

      // HEIC: convertir a JPG temporal con sips antes de pasar a sharp
      if (HEIC_EXT.has(ext)) {
        tempPath    = join(tmpdir(), `_ss_${nameClean}.jpg`);
        execSync(`sips -s format jpeg --out "${tempPath}" "${inputPath}"`, { stdio: 'pipe' });
        workingPath = tempPath;
      }

      await sharp(workingPath, { limitInputPixels: false })
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 6 })
        .toFile(outputPath);

      const inputKB  = Math.round(stat.size / 1024);
      const outputKB = Math.round(statSync(outputPath).size / 1024);
      const saved    = Math.round((1 - outputKB / inputKB) * 100);
      const tag      = HEIC_EXT.has(ext) ? ' [heic→webp]' : '';

      console.log(`✓ ${file.padEnd(45)} ${inputKB}KB → ${outputKB}KB  (${saved}% menos)${tag}`);
      converted++;
    } catch (err) {
      console.error(`✗ ${file}: ${err.message.split('\n')[0]}`);
      skipped++;
    } finally {
      if (tempPath && existsSync(tempPath)) unlinkSync(tempPath);
    }
  }
}

console.log(`\nListo: ${converted} convertidas, ${skipped} omitidas, ${total} total.`);
console.log(`Destino: ${OUTPUT_DIR}/`);
