// Generates the PWA / apple-touch icons as PNGs with no dependencies. Run: node scripts/make-icons.mjs
// Design (64-unit grid; also writes public/favicon.svg): a white syringe glyph at 45 degrees on a
// flat burgundy tile.
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

const BG = [110, 30, 46];     // burgundy tile #6E1E2E
const INK = [255, 255, 255]; // white glyph
// White syringe glyph at 45° (needle to the bottom left), in the classic solid pictogram style:
// T plunger, wide finger flange, squared barrel with three graduation notches cut into one edge,
// a tapered tip and a thin needle. Shapes are in the syringe's own frame: u runs plunger -> needle,
// v across it (negative v = the upper-left edge on screen). Boxes are [cu, cv, half u, half v, radius].
const PARTS = [
  [-23, 0, 1.4, 6, 1],      // thumb pad
  [-19.3, 0, 2.8, 1.7, 0.6], // plunger rod (stops short of the flange: white gap = notch width)
  [-13.5, 0, 1.3, 10, 1],   // finger flange
  [-1.725, 0, 10.475, 6.5, 0.3], // barrel (square ends)
  [18.9, 0, 4.5, 1.1, 1.1], // needle (starts inside the cone so the join is seamless)
];
const TAPER = [10.45, 16.35, 6.5, 1.1]; // tip cone: u from, u to, half width from, half width to
// Cut-outs in the background colour: three thick graduation notches. The line between barrel and
// tapered tip is a real gap between the two shapes (same 1.7 width as the notches).
const CUTS = [
  ...[-6, -2, 2].map((cu) => [cu, -5.3, 0.85, 3.2, 0.85]),
];
const SHIFT = -0.5, SCALE = 1.02; // centre the glyph, with the generous margin of the reference
const sdBox = (u, v, [cu, cv, hu, hv, r]) => {
  const qx = Math.abs(u - cu) - hu + r, qy = Math.abs(v - cv) - hv + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
};
const inTaper = (u, v) => {
  const [u0, u1, h0, h1] = TAPER;
  return u >= u0 && u <= u1 && Math.abs(v) <= h0 + ((u - u0) / (u1 - u0)) * (h1 - h0);
};
function shade(x, y) {
  const k = Math.SQRT1_2, dx = x - 32, dy = y - 32;
  const u = ((-dx + dy) * k) / SCALE + SHIFT, v = ((dx + dy) * k) / SCALE;
  if (CUTS.some((c) => sdBox(u, v, c) <= 0)) return BG;
  if (PARTS.some((part) => sdBox(u, v, part) <= 0) || inTaper(u, v)) return INK;
  return BG;
}

// Favicon from the same shapes (SVG rotate(135) points local +x down-left; its +y is our -v).
const rect = ([cu, cv, hu, hv, r], fill) =>
  `<rect x="${cu - SHIFT - hu}" y="${-cv - hv}" width="${2 * hu}" height="${2 * hv}" rx="${r}" fill="${fill}"/>`;
const [u0, u1, h0, h1] = TAPER.map((n, i) => (i < 2 ? n - SHIFT : n));
const svg = PARTS.map((part) => rect(part, '#fff')).join('') +
  `<polygon points="${u0},${-h0} ${u1},${-h1} ${u1},${h1} ${u0},${h0}" fill="#fff"/>` +
  CUTS.map(([cu, cv, ...rest]) => rect([cu, cv, ...rest], '#6E1E2E')).join('');
writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6E1E2E"/><g transform="translate(32 32) rotate(135) scale(${SCALE})">${svg}</g></svg>
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
