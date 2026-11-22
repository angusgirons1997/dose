// Generates the PWA / apple-touch icons as PNGs with no dependencies. Run: node scripts/make-icons.mjs
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
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function icon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const terracotta = [140, 74, 50], amber = [201, 138, 62], blue = [126, 147, 168], cream = [251, 243, 196];
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // warm colour field
      let c = mix(terracotta, amber, smooth(0, 1, 1 - Math.hypot(u - 0.8, v - 0.2)));
      c = mix(c, blue, smooth(0.45, 1, 1 - Math.hypot(u - 0.1, v - 0.95)) * 0.8);
      // cream droplet: circle + point on top
      const cx = 0.5, cy = 0.56, r = 0.2;
      const d = Math.hypot(u - cx, v - cy);
      const inCircle = d < r;
      const inTip = v < cy && v > cy - 0.42 && Math.abs(u - cx) < (v - (cy - 0.42)) * (r / 0.42) * 1.02;
      const edge = 1.5 / size;
      const a = inCircle ? smooth(r, r - edge, d) : inTip ? 1 : 0;
      c = mix(c, cream, a);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = c[0]; raw[o + 1] = c[1]; raw[o + 2] = c[2]; raw[o + 3] = 255;
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
