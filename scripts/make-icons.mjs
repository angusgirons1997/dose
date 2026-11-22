// Generates the PWA / apple-touch icons as PNGs with no dependencies. Run: node scripts/make-icons.mjs
// Design (64-unit grid; also writes public/favicon.svg): a white syringe glyph at 45 degrees on one
// flat terracotta colour (no gradient).
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

const BG = [176, 87, 58]; // #B0573A
const WHITE = [255, 255, 255];
// White syringe glyph at 45° (needle to the bottom left), built from rounded boxes in the syringe's
// own frame: u runs plunger -> needle, v across it. [centre u, centre v, half length, half width,
// corner radius, ring thickness (0 = solid)].
const PARTS = [
  [-21.5, 0, 1.5, 7, 1.2, 0],     // thumb pad
  [-16.5, 0, 4, 1.6, 0.6, 0],     // plunger rod
  [-12, 0, 1.2, 9.5, 1.2, 0],     // finger flange
  [0, 0, 12, 6.5, 2.5, 2.2],      // barrel (outline)
  [-8.6, 0, 1.1, 4.3, 0.4, 0],    // rubber stopper
  [6.5, 0, 4.5, 4.3, 0.6, 0],     // liquid
  [-4, -3.05, 0.55, 1.25, 0.5, 0], // graduations
  [-0.5, -3.05, 0.55, 1.25, 0.5, 0],
  [14, 0, 2, 2.6, 0.8, 0],        // hub
  [20, 0, 4.5, 0.75, 0.75, 0],    // needle
];
const SHIFT = 0.75, SCALE = 1.15; // centre the glyph and size it to ~60% of the tile
const sdBox = (u, v, [cu, cv, hu, hv, r]) => {
  const qx = Math.abs(u - cu) - hu + r, qy = Math.abs(v - cv) - hv + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
};
function shade(x, y) {
  const k = Math.SQRT1_2, dx = x - 32, dy = y - 32;
  const u = ((-dx + dy) * k) / SCALE + SHIFT, v = ((dx + dy) * k) / SCALE;
  for (const part of PARTS) {
    const d = sdBox(u, v, part), t = part[5];
    if (t ? d <= 0 && d >= -t : d <= 0) return WHITE;
  }
  return BG;
}

// Favicon from the same parts (SVG rotate(135) points local +x down-left; its +y is our -v).
const svgParts = PARTS.map(([cu, cv, hu, hv, r, t]) => {
  const geo = `x="${cu - SHIFT - hu + t / 2}" y="${-cv - hv + t / 2}" width="${2 * hu - t}" height="${2 * hv - t}" rx="${Math.max(0, r - t / 2)}"`;
  return t ? `<rect ${geo} fill="none" stroke="#fff" stroke-width="${t}"/>` : `<rect ${geo} fill="#fff"/>`;
}).join('');
writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#B0573A"/><g transform="translate(32 32) rotate(135) scale(${SCALE})">${svgParts}</g></svg>
`);

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
