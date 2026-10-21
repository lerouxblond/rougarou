// Genere les icones de la PWA, sans dependance.
//
// Les visuels definitifs arrivent au jalon M9 (`docs/07`, roadmap). En
// attendant, ces icones sont des reperes generes : un halo de lanterne sur le
// bleu nuit, avec les couleurs de `design/tokens.css`.
//
// Usage : node scripts/generate-pwa-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public');

/** Couleurs reprises de `design/tokens.css`. */
const INK = [0x07, 0x0a, 0x12];
const GOLD = [0xf2, 0xc1, 0x4e];
const MOON = [0xec, 0xe6, 0xd6];

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xed_b8_83_20 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xff_ff_ff_ff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xff_ff_ff_ff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, crc]);
}

/** Encode des pixels RGBA en PNG. */
function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 8 bits par canal
  header[9] = 6; // RGBA
  header[10] = 0; // compression deflate
  header[11] = 0; // filtrage adaptatif
  header[12] = 0; // pas d'entrelacement

  // Chaque ligne est prefixee par son octet de filtre, ici toujours 0.
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mix(from, to, amount) {
  const clamped = Math.min(1, Math.max(0, amount));

  return [0, 1, 2].map((channel) =>
    Math.round(from[channel] + (to[channel] - from[channel]) * clamped),
  );
}

/**
 * Dessine le halo : un fond bleu nuit, une lueur doree diffuse et un disque
 * de lune legerement decale, comme la lanterne de `docs/06`.
 *
 * @param size cote de l'image en pixels
 * @param coverage part du cote occupee par le motif (0,6 pour une icone
 *   maskable, qui doit tenir dans la zone sure)
 */
function drawLantern(size, coverage) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = (size * coverage) / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Lueur : elle decroit doucement jusqu'au double du rayon.
      const glow = Math.max(0, 1 - distance / (radius * 2));
      let color = mix(INK, GOLD, glow * glow * 0.55);

      // Disque de lune, avec un bord adouci sur un pixel.
      const edge = radius * 0.52 - distance;
      if (edge > -1) {
        color = mix(color, MOON, Math.min(1, edge + 1));
      }

      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 0xff;
    }
  }

  return encodePng(size, size, pixels);
}

const ICONS = [
  // Les icones courantes occupent largement le cadre.
  { file: 'icon-192.png', size: 192, coverage: 0.72 },
  { file: 'icon-512.png', size: 512, coverage: 0.72 },
  { file: 'apple-touch-icon-180.png', size: 180, coverage: 0.72 },
  // L'icone maskable doit survivre a un rognage circulaire : le motif tient
  // dans la zone sure de 80 %, donc on le reduit.
  { file: 'icon-maskable-512.png', size: 512, coverage: 0.52 },
];

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const { file, size, coverage } of ICONS) {
  const png = drawLantern(size, coverage);
  writeFileSync(join(OUTPUT_DIR, file), png);
  console.log(`${file} — ${size}x${size}, ${png.length} octets`);
}
