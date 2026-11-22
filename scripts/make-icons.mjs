// Generates the PWA / apple-touch icons as PNGs with no dependencies. Run: node scripts/make-icons.mjs
// Design (64-unit grid, matches src/components/Logo.tsx): warm gradient field with a clear glass "D"
// monogram — translucent body, bright specular rim lit from the top left, soft shadow underneath.
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
const clamp = (x) => Math.min(1, Math.max(0, x));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

const terracotta = [140, 74, 50], amber = [201, 138, 62], blue = [126, 147, 168], white = [255, 255, 255], ink = [40, 18, 10];

// ---- signed distance to the "D" (negative inside) ----
// Outer: box x 17..47, y 16..48; left corners radius 5, right corners radius 15 (so the right side is a half-round).
// The letter is a ring of thickness T (the counter is the outer shape shrunk by T). Exact SDF, so no seams.
function sdOuter(x, y) {
  const px = x - 32, py = y - 32, hx = 15, hy = 16;
  const r = px > 0 ? 15 : 5;
  const qx = Math.abs(px) - hx + r, qy = Math.abs(py) - hy + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}
const T = 7.5;
const sdD = (x, y) => { const o = sdOuter(x, y); return Math.max(o, -(o + T)); };

function shade(x, y) {
  const u = x / 64, v = y / 64;
  let c = mix(terracotta, amber, smooth(0, 1, 1 - Math.hypot(u - 0.85, v - 0.1)));
  c = mix(c, blue, smooth(0.4, 1, 1 - Math.hypot(u - 0.05, v - 1)) * 0.85);

  // soft shadow below the glass
  const ds = sdD(x - 0.6, y - 2.2);
  c = mix(c, ink, 0.32 * (1 - smooth(-1, 4, ds)));

  const d = sdD(x, y);
  if (d < 0.8) {
    const cover = 1 - smooth(-0.4, 0.4, d); // anti-aliased edge (with supersampling)
    // surface normal from the distance field
    const e = 0.05;
    let nx = sdD(x + e, y) - sdD(x - e, y), ny = sdD(x, y + e) - sdD(x, y - e);
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    // light from the top left: an outward normal facing it is lit
    const towardLight = clamp(nx * -0.6 + ny * -0.8);
    const away = clamp(nx * 0.6 + ny * 0.8);
    // clear glass body: only a light lift toward white, a touch brighter at the top
    let g = mix(c, white, 0.1 + 0.1 * (1 - v));
    // refraction band just inside the edge
    const band = smooth(-3, -0.5, d) * (1 - smooth(-0.5, 0, d));
    g = mix(g, white, band * 0.18);
    // crisp specular rim on the lit side, faint rim on the shadow side
    const rim = 1 - smooth(0, 1.1, Math.abs(d + 0.5));
    g = mix(g, white, rim * (0.2 + 0.75 * towardLight));
    g = mix(g, ink, rim * away * 0.1);
    c = mix(c, g, cover);
  }
  return c;
}

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
