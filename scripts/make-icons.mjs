// Generates the PWA / apple-touch icons as PNGs with no dependencies. Run: node scripts/make-icons.mjs
// Design (64-unit grid, matches public/favicon.svg): "measure marks" — vertical syringe graduations
// in white on one flat terracotta colour (no gradient).
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
// Eight evenly spaced vertical graduation marks on one baseline, as on a U-100 syringe barrel.
// [x, height, opacity]; all 2.8 wide with rounded ends.
const W = 2.8, GAP = 3.2, BASE = 46;
// U-100 scale: a mark every 2 units, long marks every 10 units (5 marks apart) -> i I i i i i I i
const HEIGHTS = [14, 28, 14, 14, 14, 14, 28, 14];
const X0 = 32 - (HEIGHTS.length * W + (HEIGHTS.length - 1) * GAP) / 2;
const BARS = HEIGHTS.map((h, i) => [X0 + i * (W + GAP), h, 1]);
const inBar = (x, y, [bx, h]) => {
  const r = W / 2, cx = bx + r;
  const cy = Math.min(Math.max(y, BASE - h + r), BASE - r);
  return Math.hypot(x - cx, y - cy) <= r;
};
function shade(x, y) {
  for (const b of BARS) if (inBar(x, y, b)) return mix(BG, WHITE, b[2]);
  return BG;
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
