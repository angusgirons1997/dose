// Generates the PWA / apple-touch icons as PNGs with no dependencies. Run: node scripts/make-icons.mjs
// Design (64-unit grid; also writes public/favicon.svg): a white vial glyph, traced from a photo, on the
// Home screen's dusk gradient.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => { let c = ~0; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return ~c >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const INK = [255, 255, 255];
const BASE = '#2a1230';
// Home screen colours, painted in order: [id, colour, cx, cy, r] as fractions of the tile. SVG
// radialGradient semantics: opaque at the centre, fading linearly to transparent at r.
const BLOBS = [
  ['a', '#ffb07a', 0.8, 0.08, 0.6], ['b', '#b03a63', 0.1, 0.45, 0.7], ['c', '#4b3a9c', 0.7, 0.95, 0.7],
  ['d', '#ff6f61', 0.3, 0.3, 0.4], ['e', '#e05a8c', 0.75, 0.6, 0.35], ['f', '#ffcf8a', 0.6, 0.25, 0.32],
  ['g', '#7a4fd0', 0.25, 0.75, 0.38],
];
const bg = (x, y) =>
  BLOBS.reduce((c, [, col, cx, cy, r]) => mix(c, hex(col), Math.max(0, 1 - Math.hypot(x / 64 - cx, y / 64 - cy) / r)), hex(BASE));

// Vial on the 64-unit grid. Boxes are [x0, y0, x1, y1, radius].
const CAP = [22.55, 9, 41.45, 16.1, 1.3];
const NECK = [25, 17.3, 39, 21, 0];
const BODY = [21.6, 25, 42.4, 55.2, 2.2];
const LIQUID = [24, 37, 40.4, 38.7, 0.85]; // see-through liquid line
const sdBox = (x, y, [x0, y0, x1, y1, r]) => {
  const qx = Math.abs(x - (x0 + x1) / 2) - (x1 - x0) / 2 + r, qy = Math.abs(y - (y0 + y1) / 2) - (y1 - y0) / 2 + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
};
// Shoulder: half-width eases from the neck (7) out to the body (10.4) between y 20.5 and 25.
const inShoulder = (x, y) => {
  if (y < 20.5 || y > 25.5) return false;
  const t = Math.min(1, (y - 20.5) / 4.5), e = t * t * (3 - 2 * t);
  return Math.abs(x - 32) <= 7 + 3.4 * e;
};
const inGlyph = (x, y) =>
  sdBox(x, y, LIQUID) > 0 && (sdBox(x, y, CAP) <= 0 || sdBox(x, y, NECK) <= 0 || sdBox(x, y, BODY) <= 0 || inShoulder(x, y));
const shade = (x, y) => (inGlyph(x, y) ? INK : bg(x, y));

// Favicon: the same design as SVG (the shoulder is the cubic that the PNG's smoothstep approximates).
const grad = ([id, c, cx, cy, r]) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const tile = (fill) => `<rect width="64" height="64" rx="14" fill="${fill}"/>`;
const [lx0, ly0, lx1, ly1, lr] = LIQUID;
writeFileSync('public/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>' + BLOBS.map(grad).join('') +
  `<mask id="m"><rect width="64" height="64" fill="#fff"/><rect x="${lx0}" y="${ly0}" width="${+(lx1 - lx0).toFixed(2)}" height="${+(ly1 - ly0).toFixed(2)}" rx="${lr}" fill="#000"/></mask></defs>` +
  tile(BASE) + BLOBS.map(([id]) => tile(`url(#${id})`)).join('') +
  '<g fill="#fff" mask="url(#m)"><rect x="22.55" y="9" width="18.9" height="7.1" rx="1.3"/>' +
  '<path d="M25 17.3H39V20.5C39 22.5 42.4 22.8 42.4 25V53Q42.4 55.2 40.2 55.2H23.8Q21.6 55.2 21.6 53V25C21.6 22.8 25 22.5 25 20.5Z"/></g></svg>\n');

function icon(size) {
  const SS = 4; // supersampling per axis
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const c = shade(((px + (sx + 0.5) / SS) / size) * 64, ((py + (sy + 0.5) / SS) / size) * 64);
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
        }
      const o = py * (size * 4 + 1) + 1 + px * 4;
      raw[o] = acc[0] / SS / SS; raw[o + 1] = acc[1] / SS / SS; raw[o + 2] = acc[2] / SS / SS; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('public/apple-touch-icon.png', icon(180));
writeFileSync('public/icon-192.png', icon(192));
writeFileSync('public/icon-512.png', icon(512));
console.log('icons written');
