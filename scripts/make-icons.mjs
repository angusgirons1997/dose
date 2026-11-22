// Generates the PWA / apple-touch icons as PNGs with no dependencies. Run: node scripts/make-icons.mjs
// Design (64-unit grid, matches src/components/Logo.tsx): warm gradient field, frosted glass disc, cream droplet.
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

const terracotta = [140, 74, 50], amber = [201, 138, 62], blue = [126, 147, 168], white = [255, 255, 255];
const cream = [251, 243, 196], creamDeep = [236, 214, 150];

// droplet: circle centre (32,38) r 10, tip (32,18) → half-angle 30°
const DC = [32, 38], DR = 10, TIP = 18;
const SIN = DR / (DC[1] - TIP), TAN = SIN / Math.sqrt(1 - SIN * SIN);
const TANGENT_Y = TIP + Math.sqrt((DC[1] - TIP) ** 2 - DR ** 2) * Math.sqrt(1 - SIN * SIN);
const inDrop = (x, y) =>
  Math.hypot(x - DC[0], y - DC[1]) <= DR || (y >= TIP && y <= TANGENT_Y && Math.abs(x - DC[0]) <= (y - TIP) * TAN);

function shade(x, y) {
  // x,y in 0..64
  const u = x / 64, v = y / 64;
  let c = mix(terracotta, amber, smooth(0, 1, 1 - Math.hypot(u - 0.85, v - 0.1)));
  c = mix(c, blue, smooth(0.4, 1, 1 - Math.hypot(u - 0.05, v - 1)) * 0.85);

  // glass disc: soft shadow, frosted fill, light rim strongest at the top
  const dd = Math.hypot(x - 32, y - 33);
  const sd = Math.hypot(x - 32, y - 36);
  c = mix(c, [40, 18, 10], 0.28 * (1 - smooth(18, 26, sd)));
  if (dd <= 21) {
    c = mix(c, white, 0.16 + 0.1 * (1 - y / 64));
    const rim = 1 - smooth(0, 1.1, Math.abs(dd - 20.4));
    const top = clamp(0.25 + (33 - y) / 24);
    c = mix(c, white, rim * 0.75 * top);
  }

  // droplet shadow then droplet with vertical cream gradient and a specular highlight
  if (inDrop(x - 0.4, y - 1.6) && !inDrop(x, y)) c = mix(c, [60, 30, 15], 0.22);
  if (inDrop(x, y)) {
    c = mix(cream, creamDeep, smooth(TIP, DC[1] + DR, y) * 0.9);
    const hl = Math.hypot((x - 28.6) / 1.6, (y - 35) / 3.2);
    c = mix(c, white, (1 - smooth(0.6, 1, hl)) * 0.8);
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
