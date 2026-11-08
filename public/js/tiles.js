// Prozedurale Pixel-Art fuer Kacheln und Deko. Der statische Teil des Levels
// wird einmalig in Chunk-Canvases (16 px pro Kachel) "gebacken" und dann
// skaliert ohne Glaettung gezeichnet -> scharfe Pixel auf jedem Display.
import { T } from './level.js';
import { hash2, mulberry32, makeCanvas } from './util.js';

const TS = 16;
const CHUNK = 32; // Kacheln pro Chunk (Breite)

function rgb(hex, a = 255) {
  const n = parseInt(hex.slice(1), 16);
  return ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
}

export const PAL = {
  grassHi: rgb('#d4f75a'), grassL: rgb('#97e033'), grassM: rgb('#5cb82b'), grassD: rgb('#2f8a26'), grassO: rgb('#1b5a1e'),
  rockL: rgb('#d9975a'), rockM: rgb('#b8743f'), rockD: rgb('#8f5631'), rockDD: rgb('#6c3e23'), mortar: rgb('#4a2918'),
  stoneL: rgb('#ebe4d2'), stoneM: rgb('#c7bda6'), stoneD: rgb('#99907c'), stoneO: rgb('#5b5347'),
  woodL: rgb('#dca063'), woodM: rgb('#a8703c'), woodD: rgb('#6b4321'), rope: rgb('#ecd29a'),
  thornO: rgb('#2c1424'), thornM: rgb('#7a2f4f'), thornL: rgb('#b8577c'), thornTip: rgb('#f5dfe6'),
  leafD: rgb('#2b6a2f'), leafM: rgb('#3f9a3c'), leafL: rgb('#7fcf4a'),
  vineFlower: rgb('#ff7ebf'), vineFlower2: rgb('#ffd1ea'),
  white: rgb('#ffffff'), yellow: rgb('#ffd43b'), pink: rgb('#ff6fae'), pinkL: rgb('#ffb3d6'),
  bark: rgb('#8a5a32'), barkD: rgb('#5a3519'), barkL: rgb('#b07a45'), outline: rgb('#2a1a12'),
  clear: 0,
};

class PixBuf {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : 0; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  blit(src, x, y) {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const c = src.d[j * src.w + i];
      if (c >>> 24) this.set(x + i, y + j, c);
    }
  }
  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    const ctx = c.getContext('2d');
    const id = ctx.createImageData(this.w, this.h);
    new Uint32Array(id.data.buffer).set(this.d);
    ctx.putImageData(id, 0, 0);
    return c;
  }
}

// --- Kopfsteinpflaster-Textur (Voronoi, nahtlos 64x64) ---
let COBBLE = null;
function cobble() {
  if (COBBLE) return COBBLE;
  const N = 64, rnd = mulberry32(7);
  const pts = [];
  for (let i = 0; i < 20; i++) pts.push([rnd() * N, rnd() * N, rnd()]);
  const tex = new Uint32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let d1 = 1e9, d2 = 1e9, best = null, bdx = 0, bdy = 0;
    for (const p of pts) {
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const dx = x - (p[0] + ox * N), dy = (y - (p[1] + oy * N)) * 1.25;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < d1) { d2 = d1; d1 = d; best = p; bdx = dx; bdy = dy; } else if (d < d2) d2 = d;
      }
    }
    let c;
    if (d2 - d1 < 1.7) c = PAL.mortar;
    else {
      const shade = (-bdx - bdy) / (d1 + 0.001); // oben-links hell
      const base = best[2];
      if (d2 - d1 < 3.0 && shade < -0.3) c = PAL.rockDD;
      else if (shade > 0.55 && d1 > 1.5) c = base < 0.5 ? PAL.rockL : PAL.rockM;
      else if (shade < -0.5) c = PAL.rockD;
      else c = base < 0.35 ? PAL.rockM : base < 0.8 ? PAL.rockM : PAL.rockD;
    }
    tex[y * N + x] = c;
  }
  COBBLE = tex;
  return tex;
}

function stoneBrick(px, py, wx, wy) {
  // Ruinen-Ziegel: Reihen 5 px, versetzt
  const row = Math.floor(wy / 5);
  const off = (row % 2) * 5;
  const col = Math.floor((wx + off) / 10);
  const lx = (wx + off) % 10, ly = wy % 5;
  if (ly === 4 || lx === 9) return PAL.stoneO;
  const v = hash2(col, row, 5);
  if (ly === 0 || lx === 0) return v < 0.3 ? PAL.stoneM : PAL.stoneL;
  if (ly === 3 || lx === 8) return PAL.stoneD;
  return v < 0.25 ? PAL.stoneD : v < 0.6 ? PAL.stoneM : PAL.stoneM;
}

const isSolidish = (t) => t === T.GROUND || t === T.STONE;

function drawGround(buf, ox, oy, tx, ty, lv) {
  const tex = cobble();
  const up = lv.get(tx, ty - 1), dn = lv.get(tx, ty + 1), lf = lv.get(tx - 1, ty), rt = lv.get(tx + 1, ty);
  const topOpen = !isSolidish(up) && up !== T.CRACKED;
  const botOpen = ty < lv.h - 1 && !isSolidish(dn) && dn !== T.CRACKED;
  const leftOpen = !isSolidish(lf) && lf !== T.CRACKED && tx > 0;
  const rightOpen = !isSolidish(rt) && rt !== T.CRACKED && tx < lv.w - 1;
  // Unterseite: gezackt
  const cut = [];
  for (let i = 0; i < TS; i++) {
    let c = 0;
    if (botOpen) {
      c = Math.floor(hash2(tx * 16 + i, ty, 3) * 2.2) + 1;
      if (leftOpen && i < 3) c += 3 - i;
      if (rightOpen && i > 12) c += i - 12;
    }
    cut.push(c);
  }
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    if (y >= TS - cut[x]) continue;
    const wx = tx * TS + x, wy = ty * TS + y;
    let c = tex[(wy & 63) * 64 + (wx & 63)];
    if ((leftOpen && x === 0) || (rightOpen && x === TS - 1)) c = PAL.mortar;
    else if (y === TS - cut[x] - 1 && botOpen) c = PAL.mortar;
    else if ((leftOpen && x === 1) || (botOpen && y === TS - cut[x] - 2)) c = c === PAL.mortar ? c : PAL.rockDD;
    buf.set(ox + x, oy + y, c);
  }
  if (topOpen) {
    for (let x = -1; x <= TS; x++) {
      if (x === -1 && !leftOpen) continue;
      if (x === TS && !rightOpen) continue;
      const wx = tx * TS + x;
      let depth = 4 + Math.floor(hash2(wx, ty, 1) * 3);
      if (hash2(wx, ty, 2) < 0.16) depth += 2 + Math.floor(hash2(wx, ty, 9) * 3);
      if (x === -1 || x === TS) depth = 3 + Math.floor(hash2(wx, ty, 4) * 5);
      for (let y = 0; y < depth; y++) {
        let c = y === 0 ? PAL.grassHi : y < depth - 2 ? PAL.grassL : y < depth - 1 ? PAL.grassM : PAL.grassD;
        if (y === 1 && hash2(wx, ty, 8) < 0.3) c = PAL.grassHi;
        buf.set(ox + x, oy + y, c);
      }
      buf.set(ox + x, oy + depth, PAL.grassO);
      // Grashalme oberhalb
      const hb = hash2(wx, ty, 6);
      if (hb < 0.45) {
        const bh = 1 + Math.floor(hash2(wx, ty, 7) * 3);
        for (let y = 1; y <= bh; y++) buf.set(ox + x, oy - y, y === bh ? PAL.grassHi : PAL.grassL);
      }
    }
    // seitlicher Ueberhang
    if (leftOpen) for (let y = 0; y < 7 + Math.floor(hash2(tx, ty, 11) * 5); y++) {
      buf.set(ox - 1, oy + y, y % 3 === 2 ? PAL.grassM : PAL.grassL); buf.set(ox - 2, oy + y, PAL.grassO);
      if (y < 4) buf.set(ox, oy + y, PAL.grassL);
    }
    if (rightOpen) for (let y = 0; y < 7 + Math.floor(hash2(tx, ty, 12) * 5); y++) {
      buf.set(ox + TS, oy + y, y % 3 === 2 ? PAL.grassM : PAL.grassL); buf.set(ox + TS + 1, oy + y, PAL.grassO);
      if (y < 4) buf.set(ox + TS - 1, oy + y, PAL.grassL);
    }
  }
  // haengende Ranken unter schwebenden Inseln
  if (botOpen && dn === T.EMPTY) {
    for (let k = 0; k < 2; k++) {
      if (hash2(tx, ty, 20 + k) > 0.33) continue;
      const vx = 2 + Math.floor(hash2(tx, ty, 30 + k) * 12);
      const len = 4 + Math.floor(hash2(tx, ty, 40 + k) * 13);
      const sy = TS - cut[vx] - 1;
      for (let y = 0; y < len; y++) {
        const wob = Math.round(Math.sin((y + k * 3) * 0.7) * 0.6);
        buf.set(ox + vx + wob, oy + sy + y, y % 4 === 0 ? PAL.leafL : PAL.leafM);
        if (y % 4 === 1) { buf.set(ox + vx + wob + 1, oy + sy + y, PAL.leafL); buf.set(ox + vx + wob - 1, oy + sy + y, PAL.leafD); }
      }
    }
  }
}

function drawStone(buf, ox, oy, tx, ty, lv) {
  const up = lv.get(tx, ty - 1), lf = lv.get(tx - 1, ty), rt = lv.get(tx + 1, ty), dn = lv.get(tx, ty + 1);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    let c = stoneBrick(x, y, tx * TS + x, ty * TS + y);
    if ((!isSolidish(lf) && x === 0) || (!isSolidish(rt) && x === TS - 1) || (!isSolidish(up) && y === 0) || (!isSolidish(dn) && y === TS - 1)) c = PAL.stoneO;
    buf.set(ox + x, oy + y, c);
  }
  // Moos oben
  if (!isSolidish(up)) {
    for (let x = 0; x < TS; x++) {
      const d = Math.floor(hash2(tx * 16 + x, ty, 51) * 3);
      for (let y = 0; y < d; y++) buf.set(ox + x, oy + y, y === 0 ? PAL.grassL : PAL.grassM);
    }
  }
}

function drawOneway(buf, ox, oy, tx, ty, lv) {
  const lf = lv.get(tx - 1, ty) === T.ONEWAY, rt = lv.get(tx + 1, ty) === T.ONEWAY;
  for (let x = 0; x < TS; x++) {
    const gap = (tx * TS + x) % 6 === 0;
    for (let y = 0; y < 6; y++) {
      let c = y === 0 ? PAL.woodL : y === 5 ? PAL.woodD : PAL.woodM;
      if (gap && y > 0) c = PAL.woodD;
      if (y === 2 && (x * 7 + tx) % 5 === 0) c = PAL.woodL;
      buf.set(ox + x, oy + y, c);
    }
    buf.set(ox + x, oy - 1, PAL.outline);
    buf.set(ox + x, oy + 6, PAL.outline);
  }
  // Seil
  for (let x = 0; x < TS; x++) buf.set(ox + x, oy + 7 + (Math.abs(x - 8) < 6 ? 1 : 0), PAL.rope);
  if (!lf) for (let y = -1; y < 9; y++) { buf.set(ox, oy + y, PAL.outline); buf.set(ox + 1, oy + y, PAL.woodD); }
  if (!rt) for (let y = -1; y < 9; y++) { buf.set(ox + TS - 1, oy + y, PAL.outline); buf.set(ox + TS - 2, oy + y, PAL.woodD); }
}

function drawThorns(buf, ox, oy, tx, ty, down) {
  const Y = (y) => down ? oy + (TS - 1 - y) : oy + y;
  // Stachelranken: Stiel unten, Dornen nach oben
  for (let x = 0; x < TS; x++) {
    const h = 3 + Math.floor(hash2(tx * 16 + x, ty, 61) * 2);
    for (let y = TS - h; y < TS; y++) buf.set(ox + x, Y(y), y === TS - h ? PAL.thornO : (x + y) % 3 === 0 ? PAL.thornL : PAL.thornM);
  }
  const spikes = [1, 6, 11];
  for (const s0 of spikes) {
    const sx = s0 + Math.floor(hash2(tx, ty + s0, 62) * 3);
    const hgt = 6 + Math.floor(hash2(tx, ty + s0, 63) * 3);
    for (let k = 0; k < hgt; k++) {
      const y = TS - 4 - k;
      const half = Math.max(0, Math.floor((hgt - k) / 3));
      for (let i = -half - 1; i <= half + 1; i++) {
        const outline = Math.abs(i) === half + 1;
        const c = outline ? PAL.thornO : k > hgt - 3 ? PAL.thornTip : i < 0 ? PAL.thornL : PAL.thornM;
        buf.set(ox + sx + i, Y(y), c);
      }
    }
    buf.set(ox + sx, Y(TS - 4 - hgt), PAL.thornO);
  }
  // Blaetter
  for (let k = 0; k < 2; k++) {
    const lx = Math.floor(hash2(tx, ty, 70 + k) * 14);
    buf.set(ox + lx, Y(TS - 4), PAL.leafM); buf.set(ox + lx + 1, Y(TS - 4), PAL.leafL); buf.set(ox + lx + 1, Y(TS - 5), PAL.leafM);
  }
}

// --- Deko-Sprites (prozedural, einmalig erzeugt) ---
const SPRITES = {};

function blob(buf, cx, cy, r, cols, rnd) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.sqrt(x * x + y * y * 1.2) + rnd() * 0.8;
    if (d > r) continue;
    const sh = (-x - y) / (r + 0.01);
    let c = sh > 0.45 ? cols[0] : sh > -0.2 ? cols[1] : cols[2];
    if (d > r - 1.2) c = cols[3];
    buf.set(cx + x, cy + y, c);
  }
}

function makeTree() {
  const b = new PixBuf(96, 112), rnd = mulberry32(42);
  // Stamm
  for (let y = 40; y < 112; y++) {
    const w = 7 + Math.floor((y - 40) / 18) + (y > 100 ? (y - 100) : 0);
    const cx = 48 + Math.round(Math.sin(y * 0.06) * 2);
    for (let x = -w; x <= w; x++) {
      const e = Math.abs(x) >= w;
      let c = e ? PAL.outline : x < -w / 3 ? PAL.barkL : x > w / 3 ? PAL.barkD : PAL.bark;
      if (!e && (y * 3 + x * 5) % 11 === 0) c = PAL.barkD;
      b.set(cx + x, y, c);
    }
  }
  // Aeste
  for (const [dir, y0] of [[-1, 52], [1, 46]]) {
    for (let i = 0; i < 22; i++) {
      const x = 48 + dir * (6 + i), y = y0 - Math.floor(i * 0.7);
      for (let k = -2; k <= 2; k++) b.set(x, y + k, Math.abs(k) === 2 ? PAL.outline : k < 0 ? PAL.barkL : PAL.bark);
    }
  }
  const leaves = [rgb('#c4f05a'), rgb('#7fcf3a'), rgb('#3f9a2e'), rgb('#1f5e22')];
  const clusters = [[48, 26, 20], [26, 34, 14], [70, 30, 15], [36, 14, 13], [62, 13, 13], [16, 46, 9], [80, 44, 10], [48, 42, 12], [50, 6, 9]];
  for (const [x, y, r] of clusters) blob(b, x, y, r, leaves, rnd);
  // Lichtpunkte
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rnd() * 96), y = Math.floor(rnd() * 56);
    if (b.get(x, y) === leaves[1]) b.set(x, y, leaves[0]);
  }
  return b;
}

function makeArch() {
  const b = new PixBuf(48, 60);
  const st = (x, y, c) => b.set(x, y, c);
  for (const px0 of [4, 36]) {
    for (let y = 18; y < 60; y++) for (let x = 0; x < 9; x++) {
      const e = x === 0 || x === 8;
      let c = e ? PAL.stoneO : x < 3 ? PAL.stoneL : x > 6 ? PAL.stoneD : PAL.stoneM;
      if (!e && y % 9 === 0) c = PAL.stoneO;
      st(px0 + x, y, c);
    }
  }
  // Bogen
  for (let a = 0; a <= 180; a += 1) {
    const r0 = 15, r1 = 23;
    for (let r = r0; r <= r1; r++) {
      const x = Math.round(24 + Math.cos(a * Math.PI / 180) * r);
      const y = Math.round(22 - Math.sin(a * Math.PI / 180) * r);
      const e = r === r0 || r === r1;
      st(x, y, e ? PAL.stoneO : r < r0 + 3 ? PAL.stoneD : r > r1 - 3 ? PAL.stoneL : PAL.stoneM);
    }
  }
  // Ranken
  const rnd = mulberry32(5);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rnd() * 48), y = Math.floor(rnd() * 40);
    if (b.get(x, y)) st(x, y, rnd() < 0.5 ? PAL.leafM : PAL.leafL);
  }
  return b;
}

function makePillar() {
  const b = new PixBuf(12, 34);
  for (let y = 4; y < 34; y++) for (let x = 1; x < 11; x++) {
    const top = y < 4 + Math.floor(hash2(x, 0, 9) * 4);
    if (top) continue;
    const e = x === 1 || x === 10;
    let c = e ? PAL.stoneO : x < 4 ? PAL.stoneL : x > 8 ? PAL.stoneD : PAL.stoneM;
    if (!e && (x === 5 || x === 7) && y > 8) c = PAL.stoneD;
    b.set(x, y, c);
  }
  for (let x = 0; x < 12; x++) { b.set(x, 30, PAL.stoneO); b.set(x, 31, PAL.stoneM); b.set(x, 32, PAL.stoneD); b.set(x, 33, PAL.stoneO); }
  for (let y = 10; y < 26; y += 3) b.set(2 + (y % 5), y, PAL.leafM);
  return b;
}

function makeBush() {
  const b = new PixBuf(26, 14), rnd = mulberry32(11);
  const cols = [rgb('#b6ec55'), rgb('#6cc23a'), rgb('#3b8f2e'), rgb('#1f5e22')];
  blob(b, 8, 8, 6, cols, rnd); blob(b, 17, 7, 7, cols, rnd); blob(b, 13, 9, 5, cols, rnd);
  b.set(9, 5, PAL.pink); b.set(18, 4, PAL.white); b.set(15, 8, PAL.pink);
  return b;
}

function makeRock() {
  const b = new PixBuf(14, 9), rnd = mulberry32(3);
  const cols = [rgb('#e6e1d6'), rgb('#b9b3a5'), rgb('#8a8477'), rgb('#4f4a42')];
  for (let y = 0; y < 9; y++) for (let x = 0; x < 14; x++) {
    const dx = (x - 7) / 7, dy = (y - 7) / 7;
    const d = dx * dx + dy * dy * 1.4;
    if (d > 1 || y > 8) continue;
    let c = d > 0.75 ? cols[3] : (x < 6 && y < 5) ? cols[0] : y > 5 ? cols[2] : cols[1];
    if (rnd() < 0.05) c = cols[2];
    b.set(x, y, c);
  }
  return b;
}

function sprites() {
  if (SPRITES.tree) return SPRITES;
  SPRITES.tree = makeTree();
  SPRITES.arch = makeArch();
  SPRITES.pillar = makePillar();
  SPRITES.bush = makeBush();
  SPRITES.rock = makeRock();
  return SPRITES;
}

function drawFlora(buf, ox, oy, tx, ty) {
  const h = hash2(tx, ty, 77);
  const x = ox + 3 + Math.floor(hash2(tx, ty, 78) * 9);
  const y = oy - 1; // direkt auf dem Gras
  if (h < 0.12) {
    // Gaensebluemchen
    for (let k = 1; k <= 2; k++) buf.set(x, y - k, PAL.grassD);
    const fy = y - 4;
    buf.set(x, fy - 1, PAL.white); buf.set(x - 1, fy, PAL.white); buf.set(x + 1, fy, PAL.white); buf.set(x, fy + 1, PAL.white);
    buf.set(x, fy, PAL.yellow);
    if (hash2(tx, ty, 79) < 0.5) {
      buf.set(x + 3, y - 1, PAL.grassD);
      buf.set(x + 3, y - 3, PAL.white); buf.set(x + 2, y - 2, PAL.white); buf.set(x + 4, y - 2, PAL.white); buf.set(x + 3, y - 2, PAL.yellow);
    }
  } else if (h < 0.2) {
    // rosa Lupine
    const hh = 5 + Math.floor(hash2(tx, ty, 80) * 3);
    for (let k = 1; k <= 2; k++) buf.set(x, y - k, PAL.grassD);
    for (let k = 0; k < hh; k++) {
      const yy = y - 3 - k;
      buf.set(x, yy, k % 2 ? PAL.pinkL : PAL.pink);
      if (k < hh - 2) { buf.set(x - 1, yy, PAL.pink); buf.set(x + 1, yy, k % 2 ? PAL.pink : PAL.pinkL); }
    }
    buf.set(x - 1, y - 1, PAL.leafM); buf.set(x + 1, y - 1, PAL.leafL);
  } else if (h < 0.34) {
    // Grasbueschel
    for (const [dx, hh] of [[-1, 3], [0, 5], [1, 4], [2, 2]]) {
      for (let k = 1; k <= hh; k++) buf.set(x + dx, y - k, k === hh ? PAL.grassHi : k > hh / 2 ? PAL.grassL : PAL.grassM);
    }
  } else if (h < 0.37) {
    // Steinchen
    buf.rect(x - 1, y - 2, 4, 2, rgb('#b9b3a5')); buf.set(x - 1, y - 2, rgb('#e6e1d6')); buf.rect(x - 1, y, 4, 1, rgb('#4f4a42'));
  }
}

export class TileRenderer {
  constructor(level) {
    this.level = level;
    this.chunks = [];
    this.dynamic = this._makeDynamic();
    this.bake();
  }

  bake() {
    const lv = this.level;
    const sp = sprites();
    const n = Math.ceil(lv.w / CHUNK);
    this.chunks = [];
    const H = lv.h * TS;
    const occupied = new Set();
    for (const c of lv.coins) occupied.add(`${Math.floor(c.x)},${Math.floor(c.y)}`);
    for (const s of lv.springs) occupied.add(`${s.x},${s.y}`);
    for (const c of lv.checkpoints) occupied.add(`${Math.floor(c.x)},${Math.floor(c.y) - 1}`);
    for (const d of lv.decor) occupied.add(`${d.x},${d.y}`);
    for (let ci = 0; ci < n; ci++) {
      const W = CHUNK * TS;
      const buf = new PixBuf(W + 0, H);
      const tx0 = ci * CHUNK;
      // Deko hinten (Baeume, Ruinen) zuerst
      for (const d of lv.decor) {
        const s = sp[d.type];
        if (!s) continue;
        // Anker: untere Mitte des Sprites auf Kachelboden
        const sx = (d.x - tx0) * TS + 8 - Math.floor(s.w / 2);
        const sy = (d.y + 1) * TS - s.h + (d.type === 'tree' ? 3 : d.type === 'rock' || d.type === 'bush' ? 1 : 0);
        if (sx > W || sx + s.w < 0) continue;
        buf.blit(s, sx, sy);
      }
      for (let ty = 0; ty < lv.h; ty++) {
        for (let tx = tx0 - 1; tx < tx0 + CHUNK + 1; tx++) {
          const t = lv.get(tx, ty);
          if (tx < 0 || tx >= lv.w) continue;
          const ox = (tx - tx0) * TS, oy = ty * TS;
          if (t === T.GROUND) drawGround(buf, ox, oy, tx, ty, lv);
          else if (t === T.STONE) drawStone(buf, ox, oy, tx, ty, lv);
          else if (t === T.ONEWAY) drawOneway(buf, ox, oy, tx, ty, lv);
          else if (t === T.THORN_UP) drawThorns(buf, ox, oy, tx, ty, false);
          else if (t === T.THORN_DOWN) drawThorns(buf, ox, oy, tx, ty, true);
        }
      }
      // Blumen auf freien Grasflaechen
      for (let ty = 1; ty < lv.h; ty++) {
        for (let tx = tx0; tx < tx0 + CHUNK; tx++) {
          if (lv.get(tx, ty) !== T.GROUND || lv.get(tx, ty - 1) !== T.EMPTY) continue;
          if (occupied.has(`${tx},${ty - 1}`)) continue;
          drawFlora(buf, (tx - tx0) * TS, ty * TS, tx, ty);
        }
      }
      this.chunks.push({ x: tx0, canvas: buf.toCanvas() });
    }
  }

  _makeDynamic() {
    const mk = (fn) => { const b = new PixBuf(TS, TS); fn(b); return b.toCanvas(); };
    const cracked = [0, 1].map(v => mk((b) => {
      for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
        let c = stoneBrick(x, y, x + v * 16, y + 3);
        if (x === 0 || y === 0 || x === TS - 1 || y === TS - 1) c = PAL.stoneO;
        b.set(x, y, c);
      }
      // Risse
      const cr = v ? [[3, 1], [4, 2], [5, 3], [5, 4], [6, 5], [7, 6], [7, 7], [8, 8], [10, 8], [11, 9], [12, 10], [8, 9], [7, 10], [6, 11], [6, 12], [5, 13]]
                   : [[12, 2], [11, 3], [10, 4], [9, 5], [9, 6], [8, 7], [6, 7], [5, 8], [4, 9], [8, 8], [8, 9], [9, 10], [10, 11], [10, 12], [11, 13]];
      for (const [x, y] of cr) { b.set(x, y, rgb('#3a332b')); b.set(x + 1, y, PAL.stoneD); }
    }));
    const vine = [0, 1, 2].map(v => mk((b) => {
      const rnd = mulberry32(100 + v);
      for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
        const n = rnd();
        b.set(x, y, n < 0.3 ? PAL.leafD : n < 0.75 ? PAL.leafM : PAL.leafL);
      }
      // dicke Ranken
      for (let y = 0; y < TS; y++) {
        const x1 = 4 + Math.round(Math.sin(y * 0.5 + v) * 2), x2 = 11 + Math.round(Math.cos(y * 0.45 + v) * 2);
        b.set(x1, y, rgb('#5a3a1f')); b.set(x1 + 1, y, rgb('#7a5530'));
        b.set(x2, y, rgb('#5a3a1f')); b.set(x2 + 1, y, rgb('#7a5530'));
      }
      for (let k = 0; k < 3; k++) {
        const fx = 1 + Math.floor(rnd() * 13), fy = 1 + Math.floor(rnd() * 13);
        b.set(fx, fy, PAL.vineFlower); b.set(fx + 1, fy, PAL.vineFlower); b.set(fx, fy + 1, PAL.vineFlower); b.set(fx + 1, fy + 1, PAL.vineFlower2);
      }
    }));
    return { cracked, vine };
  }

  // Zeichnet sichtbare Chunks. cam: {x,y} in Kacheln (linke obere Ecke), s: Pixel pro Kachel
  draw(ctx, camX, camY, s, viewW, viewH) {
    ctx.imageSmoothingEnabled = false;
    const k = s / TS;
    for (const ch of this.chunks) {
      if (ch.x + CHUNK < camX - 1 || ch.x > camX + viewW + 1) continue;
      const dx = Math.round((ch.x - camX) * s);
      const dy = Math.round(-camY * s);
      ctx.drawImage(ch.canvas, dx, dy, Math.round(ch.canvas.width * k), Math.round(ch.canvas.height * k));
    }
  }

  drawDynamic(ctx, camX, camY, s, viewW, viewH) {
    const lv = this.level;
    ctx.imageSmoothingEnabled = false;
    const x0 = Math.max(0, Math.floor(camX) - 1), x1 = Math.min(lv.w - 1, Math.ceil(camX + viewW) + 1);
    const y0 = Math.max(0, Math.floor(camY) - 1), y1 = Math.min(lv.h - 1, Math.ceil(camY + viewH) + 1);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = lv.tiles[ty * lv.w + tx];
      if (t === T.CRACKED) {
        const img = this.dynamic.cracked[(tx + ty) & 1];
        ctx.drawImage(img, Math.round((tx - camX) * s), Math.round((ty - camY) * s), Math.ceil(s), Math.ceil(s));
      } else if (t === T.VINE) {
        const img = this.dynamic.vine[(tx * 3 + ty) % 3];
        ctx.drawImage(img, Math.round((tx - camX) * s), Math.round((ty - camY) * s), Math.ceil(s), Math.ceil(s));
      }
    }
  }
}

export { PixBuf, rgb, TS };
