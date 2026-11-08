// Prozedurale Pixel-Art fuer Kacheln und Deko. Der statische Teil des Levels
// wird einmalig in Chunk-Canvases (16 px pro Kachel) "gebacken" und dann
// skaliert ohne Glaettung gezeichnet -> scharfe Pixel auf jedem Display.
// Farben, Baumarten und Pflanzen kommen aus dem Biom des Levels (biomes.js).
import { T } from './level.js';
import { hash2, mulberry32, makeCanvas } from './util.js';
import { getBiome } from './biomes.js';

const TS = 16;
const CHUNK = 32; // Kacheln pro Chunk (Breite)

function rgb(hex, a = 255) {
  const n = parseInt(hex.slice(1), 16);
  return ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
}

const BASE_PAL = {
  grassHi: '#d4f75a', grassL: '#97e033', grassM: '#5cb82b', grassD: '#2f8a26', grassO: '#1b5a1e',
  rockL: '#d9975a', rockM: '#b8743f', rockD: '#8f5631', rockDD: '#6c3e23', mortar: '#4a2918',
  stoneL: '#ebe4d2', stoneM: '#c7bda6', stoneD: '#99907c', stoneO: '#5b5347',
  woodL: '#dca063', woodM: '#a8703c', woodD: '#6b4321', rope: '#ecd29a',
  thornO: '#2c1424', thornM: '#7a2f4f', thornL: '#b8577c', thornTip: '#f5dfe6',
  leafD: '#2b6a2f', leafM: '#3f9a3c', leafL: '#7fcf4a',
  vineFlower: '#ff7ebf', vineFlower2: '#ffd1ea',
  white: '#ffffff', yellow: '#ffd43b', pink: '#ff6fae', pinkL: '#ffb3d6',
  bark: '#8a5a32', barkD: '#5a3519', barkL: '#b07a45', outline: '#2a1a12',
};

// Aktuelle Palette (wird beim Biom-Wechsel ueberschrieben, Objekt bleibt dasselbe)
export const PAL = { clear: 0 };
let CUR = null;
let BIO = getBiome('meadow');

export function setBiome(id) {
  id = id || 'meadow';
  if (CUR === id) return;
  CUR = id;
  BIO = getBiome(id);
  const p = { ...BASE_PAL, ...(BIO.pal || {}) };
  for (const k of Object.keys(p)) PAL[k] = rgb(p[k]);
}
export function currentBiome() { return CUR; }
setBiome('meadow');

class PixBuf {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  set(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { x |= 0; y |= 0; return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : 0; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  blit(src, x, y) {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const c = src.d[j * src.w + i];
      if (c >>> 24) this.set(x + i, y + j, c);
    }
  }
  // Umriss um alle gesetzten Pixel (fuer Deko-Sprites)
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c);
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

// ---------- Erd-Texturen (liefern Index: 0 Fuge, 1 sehr dunkel, 2 dunkel, 3 mittel, 4 hell) ----------
let COBBLE = null;
function cobbleIdx() {
  if (COBBLE) return COBBLE;
  const N = 64, rnd = mulberry32(7);
  const pts = [];
  for (let i = 0; i < 20; i++) pts.push([rnd() * N, rnd() * N, rnd()]);
  const tex = new Uint8Array(N * N);
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
    if (d2 - d1 < 1.7) c = 0;
    else {
      const shade = (-bdx - bdy) / (d1 + 0.001); // oben-links hell
      const base = best[2];
      if (d2 - d1 < 3.0 && shade < -0.3) c = 1;
      else if (shade > 0.55 && d1 > 1.5) c = base < 0.5 ? 4 : 3;
      else if (shade < -0.5) c = 2;
      else c = base < 0.8 ? 3 : 2;
    }
    tex[y * N + x] = c;
  }
  COBBLE = tex;
  return tex;
}

function strataIdx(wx, wy) {
  const wave = Math.sin(wx * 0.045) * 2.2 + Math.sin(wx * 0.017 + 1.3) * 3.5;
  const yy = wy + wave;
  const layer = Math.floor(yy / 7);
  const ly = yy - layer * 7;
  const seg = Math.floor((wx + hash2(layer, 0, 5) * 40) / (18 + Math.floor(hash2(layer, 1, 5) * 16)));
  const v = hash2(layer, seg, 3);
  if (ly < 1) return hash2(wx >> 1, layer, 4) < 0.85 ? 1 : 2;
  if (ly < 2) return 2;
  const sp = hash2(wx, wy, 13);
  if (sp < 0.035) return 1;
  if (sp < 0.06) return 4;
  if (ly < 3.2 && v > 0.35) return 4;
  return v < 0.3 ? 2 : v < 0.75 ? 3 : 4;
}

const GIDX = () => [PAL.mortar, PAL.rockDD, PAL.rockD, PAL.rockM, PAL.rockL];
function groundColor(wx, wy, cols) {
  if (BIO.texture === 'strata') return cols[strataIdx(wx, wy)];
  return cols[cobbleIdx()[(wy & 63) * 64 + (wx & 63)]];
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
  return v < 0.25 ? PAL.stoneD : PAL.stoneM;
}

// Messingplatten mit Nieten (Uhrwerk)
function stonePlate(x, y, wx, wy) {
  const lx = wx & 15, ly = wy & 15;
  if (lx === 15 || ly === 15) return PAL.stoneO;
  if (lx === 0 || ly === 0) return PAL.stoneL;
  if (lx === 14 || ly === 14) return PAL.stoneD;
  const rv = (lx === 3 || lx === 12) && (ly === 3 || ly === 12);
  if (rv) return PAL.stoneL;
  if ((lx === 4 || lx === 13) && (ly === 4 || ly === 13)) return PAL.stoneO;
  if ((ly + (lx >> 2)) % 4 === 0 && hash2(wx >> 4, wy >> 4, 2) < 0.5) return PAL.stoneD;
  return PAL.stoneM;
}

// Eisziegel mit Glanzstreifen
function stoneIce(x, y, wx, wy) {
  let c = stoneBrick(x, y, wx, wy);
  if (c !== PAL.stoneO && ((wx + wy) % 19 < 2 || (wx + wy) % 19 === 4)) c = PAL.stoneL;
  return c;
}

const isSolidish = (t) => t === T.GROUND || t === T.STONE;

// Oberflaeche (Gras / Sand / Schnee) – Spalte x der Kachel, liefert Farbe fuer Zeile y
function coverColor(y, depth, wx, ty) {
  const cv = BIO.cover;
  if (cv === 'snow') return y === 0 ? PAL.grassHi : y < depth - 2 ? (hash2(wx, ty + y, 31) < 0.08 ? PAL.grassM : PAL.grassL) : y < depth - 1 ? PAL.grassM : PAL.grassD;
  if (cv === 'sand') return y === 0 ? PAL.grassHi : y < depth - 2 ? ((wx + y * 3) % 9 === 0 ? PAL.grassM : PAL.grassL) : y < depth - 1 ? PAL.grassM : PAL.grassD;
  let c = y === 0 ? PAL.grassHi : y < depth - 2 ? PAL.grassL : y < depth - 1 ? PAL.grassM : PAL.grassD;
  if (y === 1 && hash2(wx, ty, 8) < 0.3) c = PAL.grassHi;
  return c;
}

function drawHanging(buf, ox, oy, tx, ty, cut) {
  const kind = BIO.hang || 'vines';
  for (let k = 0; k < 3; k++) {
    const r = hash2(tx, ty, 20 + k);
    if (kind === 'icicles') {
      if (r > 0.75) continue;
      const vx = 1 + Math.floor(hash2(tx, ty, 30 + k) * 14);
      const len = 3 + Math.floor(hash2(tx, ty, 40 + k) * 8);
      const sy = TS - cut[vx] - 1;
      for (let y = 0; y < len; y++) {
        const w = y < len * 0.4 ? 1 : 0;
        for (let i = -w; i <= w; i++) buf.set(ox + vx + i, oy + sy + y, i < 0 ? PAL.stoneL : y > len - 3 ? PAL.grassHi : PAL.stoneM);
      }
      continue;
    }
    if (kind === 'crystals') {
      if (r > 0.3) continue;
      const vx = 2 + Math.floor(hash2(tx, ty, 30 + k) * 12);
      const len = 4 + Math.floor(hash2(tx, ty, 40 + k) * 4);
      const sy = TS - cut[vx] - 1;
      const cs = [rgb('#f0ffff'), rgb('#9fe8ff'), rgb('#4fa8e0'), rgb('#24508a')];
      for (let y = 0; y < len; y++) {
        const half = Math.round(Math.sin((y / len) * Math.PI) * 1.6);
        for (let i = -half - 1; i <= half + 1; i++) buf.set(ox + vx + i, oy + sy + y, Math.abs(i) === half + 1 ? cs[3] : i < 0 ? cs[0] : i === 0 ? cs[1] : cs[2]);
      }
      continue;
    }
    if (kind === 'chains') {
      if (r > 0.22) continue;
      const vx = 3 + Math.floor(hash2(tx, ty, 30 + k) * 10);
      const len = 6 + Math.floor(hash2(tx, ty, 40 + k) * 10);
      const sy = TS - cut[vx] - 1;
      for (let y = 0; y < len; y++) {
        if (y % 4 === 0) { buf.set(ox + vx - 1, oy + sy + y, PAL.stoneD); buf.set(ox + vx + 1, oy + sy + y, PAL.stoneD); }
        else buf.set(ox + vx + (y % 4 === 2 ? 0 : (y % 8 < 4 ? -1 : 1)), oy + sy + y, y % 2 ? PAL.stoneL : PAL.stoneM);
      }
      // kleines Zahnrad am Ende
      const gy = oy + sy + len + 1;
      for (let a = 0; a < 8; a++) buf.set(ox + vx + Math.round(Math.cos(a * 0.785) * 2), gy + Math.round(Math.sin(a * 0.785) * 2), a % 2 ? PAL.stoneD : PAL.stoneL);
      buf.set(ox + vx, gy, PAL.stoneO);
      continue;
    }
    if (kind === 'roots') {
      if (r > 0.4) continue;
      const vx = 2 + Math.floor(hash2(tx, ty, 30 + k) * 12);
      const len = 3 + Math.floor(hash2(tx, ty, 40 + k) * 9);
      const sy = TS - cut[vx] - 1;
      let xx = vx;
      for (let y = 0; y < len; y++) {
        if (hash2(tx * 7 + y, ty, 50 + k) < 0.25) xx += hash2(tx, y, 51 + k) < 0.5 ? -1 : 1;
        buf.set(ox + xx, oy + sy + y, y % 3 === 0 ? PAL.rockD : PAL.rockDD);
        if (y < 2) buf.set(ox + xx + 1, oy + sy + y, PAL.rockDD);
      }
      if (hash2(tx, ty, 52 + k) < 0.5) { buf.set(ox + xx, oy + sy + len, PAL.leafM); buf.set(ox + xx + 1, oy + sy + len, PAL.leafL); }
      continue;
    }
    // Ranken (optional mit Blueten)
    if (k === 2 || r > 0.33) continue;
    const vx = 2 + Math.floor(hash2(tx, ty, 30 + k) * 12);
    const len = 4 + Math.floor(hash2(tx, ty, 40 + k) * 13);
    const sy = TS - cut[vx] - 1;
    for (let y = 0; y < len; y++) {
      const wob = Math.round(Math.sin((y + k * 3) * 0.7) * 0.6);
      buf.set(ox + vx + wob, oy + sy + y, y % 4 === 0 ? PAL.leafL : PAL.leafM);
      if (y % 4 === 1) { buf.set(ox + vx + wob + 1, oy + sy + y, PAL.leafL); buf.set(ox + vx + wob - 1, oy + sy + y, PAL.leafD); }
      if (kind === 'blossomVines' && y % 5 === 3) { buf.set(ox + vx + wob + 1, oy + sy + y, PAL.pinkL); buf.set(ox + vx + wob + 1, oy + sy + y + 1, PAL.pink); }
    }
  }
}

function drawGround(buf, ox, oy, tx, ty, lv) {
  const cols = GIDX();
  const up = lv.get(tx, ty - 1), dn = lv.get(tx, ty + 1), lf = lv.get(tx - 1, ty), rt = lv.get(tx + 1, ty);
  const topOpen = !isSolidish(up) && up !== T.CRACKED;
  const botOpen = ty < lv.h - 1 && !isSolidish(dn) && dn !== T.CRACKED;
  const leftOpen = !isSolidish(lf) && lf !== T.CRACKED && tx > 0;
  const rightOpen = !isSolidish(rt) && rt !== T.CRACKED && tx < lv.w - 1;
  const cv = BIO.cover;
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
    let c = groundColor(wx, wy, cols);
    if ((leftOpen && x === 0) || (rightOpen && x === TS - 1)) c = PAL.mortar;
    else if (y === TS - cut[x] - 1 && botOpen) c = PAL.mortar;
    else if ((leftOpen && x === 1) || (botOpen && y === TS - cut[x] - 2)) c = c === PAL.mortar ? c : PAL.rockDD;
    buf.set(ox + x, oy + y, c);
  }
  // Erz-Brocken (Messing-Inseln)
  if (BIO.ore && hash2(tx, ty, 88) < 0.35 && !topOpen) {
    const ex = 3 + Math.floor(hash2(tx, ty, 89) * 9), ey = 4 + Math.floor(hash2(tx, ty, 90) * 7);
    const oa = rgb(BIO.ore[0]), ob = rgb(BIO.ore[1]);
    buf.set(ox + ex, oy + ey, oa); buf.set(ox + ex + 1, oy + ey, ob); buf.set(ox + ex, oy + ey + 1, ob); buf.set(ox + ex + 1, oy + ey + 1, PAL.rockDD);
    if (hash2(tx, ty, 91) < 0.5) { buf.set(ox + ex + 3, oy + ey + 2, oa); buf.set(ox + ex + 3, oy + ey + 3, ob); }
  }
  if (topOpen) {
    for (let x = -1; x <= TS; x++) {
      if (x === -1 && !leftOpen) continue;
      if (x === TS && !rightOpen) continue;
      const wx = tx * TS + x;
      let depth = 4 + Math.floor(hash2(wx, ty, 1) * 3);
      if (cv === 'sand') depth = 4 + Math.round(Math.sin(wx * 0.3) + hash2(wx, ty, 1));
      if (cv === 'snow') depth = 5 + Math.floor(hash2(wx >> 1, ty, 1) * 2);
      else if (hash2(wx, ty, 2) < 0.16) depth += 2 + Math.floor(hash2(wx, ty, 9) * 3);
      if (x === -1 || x === TS) depth = 3 + Math.floor(hash2(wx, ty, 4) * 5);
      for (let y = 0; y < depth; y++) buf.set(ox + x, oy + y, coverColor(y, depth, wx, ty));
      buf.set(ox + x, oy + depth, PAL.grassO);
      // oberhalb: Grashalme / Sand-Kruemel / Schnee-Wuelste
      if (cv === 'snow') {
        const bump = Math.round(1.2 + Math.sin(wx * 0.4 + ty) * 1.2);
        for (let y = 1; y <= bump; y++) buf.set(ox + x, oy - y, y === bump ? PAL.grassHi : PAL.grassL);
      } else if (cv === 'sand') {
        if (hash2(wx, ty, 6) < 0.08) { buf.set(ox + x, oy - 1, PAL.grassL); }
        if (hash2(wx, ty, 16) < 0.06) for (let y = 1; y <= 3; y++) buf.set(ox + x, oy - y, y === 3 ? PAL.leafL : PAL.leafM);
      } else {
        const hb = hash2(wx, ty, 6);
        if (hb < 0.45) {
          const bh = 1 + Math.floor(hash2(wx, ty, 7) * 3);
          for (let y = 1; y <= bh; y++) buf.set(ox + x, oy - y, y === bh ? PAL.grassHi : PAL.grassL);
        }
      }
    }
    // seitlicher Ueberhang
    const sideLen = (s) => (cv === 'snow' ? 5 : 7) + Math.floor(hash2(tx, ty, s) * 5);
    if (leftOpen) for (let y = 0; y < sideLen(11); y++) {
      buf.set(ox - 1, oy + y, y % 3 === 2 ? PAL.grassM : PAL.grassL); buf.set(ox - 2, oy + y, PAL.grassO);
      if (y < 4) buf.set(ox, oy + y, PAL.grassL);
    }
    if (rightOpen) for (let y = 0; y < sideLen(12); y++) {
      buf.set(ox + TS, oy + y, y % 3 === 2 ? PAL.grassM : PAL.grassL); buf.set(ox + TS + 1, oy + y, PAL.grassO);
      if (y < 4) buf.set(ox + TS - 1, oy + y, PAL.grassL);
    }
    // Eiszapfen an den Kanten
    if (cv === 'snow') {
      for (const [open, ex] of [[leftOpen, -1], [rightOpen, TS]]) {
        if (!open) continue;
        const len = 3 + Math.floor(hash2(tx, ty, 13 + ex) * 5);
        for (let y = 0; y < len; y++) buf.set(ox + ex, oy + 9 + y, y > len - 2 ? PAL.grassHi : PAL.stoneM);
      }
    }
  }
  if (botOpen && dn === T.EMPTY) drawHanging(buf, ox, oy, tx, ty, cut);
}

function drawStone(buf, ox, oy, tx, ty, lv) {
  const up = lv.get(tx, ty - 1), lf = lv.get(tx - 1, ty), rt = lv.get(tx + 1, ty), dn = lv.get(tx, ty + 1);
  const fn = BIO.stone === 'plate' ? stonePlate : BIO.stone === 'ice' ? stoneIce : stoneBrick;
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    let c = fn(x, y, tx * TS + x, ty * TS + y);
    if ((!isSolidish(lf) && x === 0) || (!isSolidish(rt) && x === TS - 1) || (!isSolidish(up) && y === 0) || (!isSolidish(dn) && y === TS - 1)) c = PAL.stoneO;
    buf.set(ox + x, oy + y, c);
  }
  // oben: Moos / Sand / Schnee
  if (!isSolidish(up)) {
    const cv = BIO.cover;
    for (let x = 0; x < TS; x++) {
      const wx = tx * TS + x;
      if (cv === 'snow') {
        const d = 3 + Math.floor(hash2(wx >> 1, ty, 51) * 2);
        for (let y = -1; y < d; y++) buf.set(ox + x, oy + y, y <= 0 ? PAL.grassHi : y < d - 1 ? PAL.grassL : PAL.grassM);
      } else if (cv === 'sand') {
        const d = Math.floor(hash2(wx >> 2, ty, 51) * 3);
        for (let y = 0; y < d; y++) buf.set(ox + x, oy + y, y === 0 ? PAL.grassHi : PAL.grassL);
      } else {
        const d = Math.floor(hash2(wx, ty, 51) * 3);
        for (let y = 0; y < d; y++) buf.set(ox + x, oy + y, y === 0 ? PAL.grassL : PAL.grassM);
      }
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
    if (BIO.cover === 'snow' && hash2(tx * TS + x, ty, 5) < 0.8) { buf.set(ox + x, oy - 1, PAL.grassL); buf.set(ox + x, oy - 2, PAL.grassHi); }
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

// Wolken-Plattform (von unten durchspringbar): bauschige Oberkante, runde Enden
const CL = { top: rgb('#ffffff'), body: rgb('#f2f8ff'), shade: rgb('#d3e7fb'), shade2: rgb('#b3d2f3'), edge: rgb('#86aedd') };
function drawCloudTile(buf, ox, oy, tx, ty, lv) {
  const lf = lv.get(tx - 1, ty) === T.CLOUD, rt = lv.get(tx + 1, ty) === T.CLOUD;
  const topAt = (wx) => {
    let best = 6;
    const k0 = Math.floor(wx / 8);
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const cx = k * 8 + 4, r = 4.5 + hash2(k, ty, 91) * 2.5, dx = wx - cx;
      if (Math.abs(dx) < r) best = Math.min(best, 2.5 - Math.sqrt(r * r - dx * dx));
    }
    return best;
  };
  for (let x = 0; x < TS; x++) {
    const wx = tx * TS + x;
    let t = topAt(wx), b = 9 + (hash2(wx >> 2, ty, 92) < 0.5 ? 1 : 0);
    if (!lf && x < 7) { const d = 7 - x, e = Math.sqrt(Math.max(0, 49 - d * d)); t = Math.max(t, 3 - e * 0.95); b = Math.min(b, 3 + e); }
    if (!rt && x > 8) { const d = x - 8, e = Math.sqrt(Math.max(0, 49 - d * d)); t = Math.max(t, 3 - e * 0.95); b = Math.min(b, 3 + e); }
    const t0 = Math.ceil(t), b0 = Math.floor(b);
    for (let y = t0; y <= b0; y++) {
      let c;
      if (y === b0) c = CL.edge;
      else if (y === t0) c = CL.top;
      else if (y >= b0 - 1) c = CL.shade2;
      else if (y >= b0 - 3) c = CL.shade;
      else if (y <= t0 + 1) c = CL.top;
      else c = CL.body;
      if (((!lf && x === 0) || (!rt && x === TS - 1)) && y > t0) c = CL.edge;
      buf.set(ox + x, oy + y, c);
    }
    if (t0 - 1 >= -6 && (!lf ? x > 0 : true) && (!rt ? x < TS - 1 : true)) buf.set(ox + x, oy + t0 - 1, CL.edge);
  }
}

// ---------- Deko-Sprites (prozedural, pro Biom einmalig erzeugt) ----------
const SPRITE_CACHE = {};

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

const hexes = (a) => a.map(h => rgb(h));

// dicke Linie fuer Staemme/Aeste (Pixel), Farbe je nach Seite
function limb(b, x0, y0, x1, y1, w0, w1, cols) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, w = w0 + (w1 - w0) * t;
    for (let k = -Math.ceil(w); k <= Math.ceil(w); k++) {
      const e = Math.abs(k) >= w - 0.5;
      b.set(Math.round(x + k), Math.round(y), e ? cols[3] : k < -w / 3 ? cols[0] : k > w / 3 ? cols[2] : cols[1]);
    }
  }
}

function trunkStd(b, cols) {
  for (let y = 40; y < 112; y++) {
    const w = 7 + Math.floor((y - 40) / 18) + (y > 100 ? (y - 100) : 0);
    const cx = 48 + Math.round(Math.sin(y * 0.06) * 2);
    for (let x = -w; x <= w; x++) {
      const e = Math.abs(x) >= w;
      let c = e ? cols[3] : x < -w / 3 ? cols[0] : x > w / 3 ? cols[2] : cols[1];
      if (!e && (y * 3 + x * 5) % 11 === 0) c = cols[2];
      b.set(cx + x, y, c);
    }
  }
}

function makeOak(leavesHex, seed = 42, opts = {}) {
  const b = new PixBuf(96, 112), rnd = mulberry32(seed);
  const bark = [PAL.barkL, PAL.bark, PAL.barkD, PAL.outline];
  trunkStd(b, bark);
  for (const [dir, y0] of [[-1, 52], [1, 46]]) {
    for (let i = 0; i < 22; i++) {
      const x = 48 + dir * (6 + i), y = y0 - Math.floor(i * 0.7);
      for (let k = -2; k <= 2; k++) b.set(x, y + k, Math.abs(k) === 2 ? PAL.outline : k < 0 ? PAL.barkL : PAL.bark);
    }
  }
  const leaves = hexes(leavesHex);
  const clusters = opts.clusters || [[48, 26, 20], [26, 34, 14], [70, 30, 15], [36, 14, 13], [62, 13, 13], [16, 46, 9], [80, 44, 10], [48, 42, 12], [50, 6, 9]];
  for (const [x, y, r] of clusters) blob(b, x, y, r, leaves, rnd);
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rnd() * 96), y = Math.floor(rnd() * 56);
    if (b.get(x, y) === leaves[1]) b.set(x, y, leaves[0]);
  }
  if (opts.fall) {
    // fallende Blaetter/Blueten unter der Krone und am Boden
    for (let i = 0; i < opts.fall; i++) {
      const x = 8 + Math.floor(rnd() * 80), y = 58 + Math.floor(rnd() * 52);
      if (b.get(x, y)) continue;
      const c = leaves[rnd() < 0.5 ? 0 : 1];
      b.set(x, y, c); if (rnd() < 0.5) b.set(x + 1, y, leaves[2]);
    }
    for (let i = 0; i < opts.fall; i++) { const x = 20 + Math.floor(rnd() * 56); b.set(x, 108 + Math.floor(rnd() * 2), leaves[rnd() < 0.5 ? 1 : 2]); }
  }
  if (opts.fruit) for (let i = 0; i < 7; i++) {
    const x = 14 + Math.floor(rnd() * 68), y = 10 + Math.floor(rnd() * 40);
    if (!b.get(x, y)) continue;
    const f = rgb(opts.fruit);
    b.set(x, y, f); b.set(x + 1, y, f); b.set(x, y + 1, f); b.set(x + 1, y + 1, PAL.outline);
  }
  return b;
}

function makeMushroomTree(capHex, seed) {
  const b = new PixBuf(96, 112), rnd = mulberry32(seed);
  const cap = hexes(capHex);
  const stem = hexes(['#fff6e0', '#f0dcb8', '#c9ab84', '#5a4030']);
  const capY = 40 + Math.floor(rnd() * 10), rx = 34 + Math.floor(rnd() * 8), ry = 22 + Math.floor(rnd() * 6);
  for (let y = capY + 4; y < 112; y++) {
    const w = 6 + (y > 102 ? (y - 102) * 0.6 : 0) + (y < capY + 10 ? (capY + 10 - y) * 0.3 : 0);
    const cx = 48 + Math.sin((y - capY) * 0.05) * 3;
    for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) {
      const e = Math.abs(x) >= w - 0.5;
      let c = e ? stem[3] : x < -w / 3 ? stem[0] : x > w / 3 ? stem[2] : stem[1];
      if (!e && (y % 9 === 0) && Math.abs(x) < w - 2) c = stem[2];
      b.set(Math.round(cx + x), y, c);
    }
  }
  // Ring am Stiel
  for (let x = -9; x <= 9; x++) for (let y = 0; y < 3; y++) b.set(48 + x + Math.round(Math.sin(1.5) * 2), capY + 16 + y + (Math.abs(x) > 6 ? 1 : 0), y === 2 || Math.abs(x) === 9 ? stem[3] : stem[0]);
  // Lamellen unter dem Hut
  for (let x = -rx + 3; x <= rx - 3; x++) {
    const d = 1 - (x / rx) ** 2;
    const h = Math.round(3 + d * 4);
    for (let y = 0; y < h; y++) b.set(48 + x, capY + y, (x % 3 === 0) ? cap[3] : y === h - 1 ? cap[3] : stem[2]);
  }
  // Hut
  for (let y = -ry; y <= 2; y++) for (let x = -rx; x <= rx; x++) {
    const dx = x / rx, dy = y / ry;
    const d = dx * dx + dy * dy;
    if (y <= 0 ? d > 1 : Math.abs(dx) < 0.82) continue;
    const sh = (-dx * 0.7 - dy);
    let c = sh > 0.9 ? cap[0] : sh > 0.25 ? cap[1] : cap[2];
    if (d > 0.88 || y === 2) c = cap[3];
    b.set(48 + x, capY + y, c);
  }
  // Punkte
  const spots = 6 + Math.floor(rnd() * 3);
  for (let i = 0; i < spots; i++) {
    const a = Math.PI * (0.12 + 0.76 * rnd()), rr = 0.35 + rnd() * 0.5;
    const sx = 48 + Math.round(Math.cos(a) * rx * rr * -1), sy = capY - Math.round(Math.sin(a) * ry * rr);
    const r = 1.5 + rnd() * 2.2;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= r * r && b.get(sx + x, sy + y) !== cap[3]) b.set(sx + x, sy + y, x + y < -1 ? PAL.white : cap[0]);
  }
  return b;
}

function makePine(leavesHex, seed) {
  const b = new PixBuf(96, 112), rnd = mulberry32(seed);
  const L = hexes(leavesHex);
  const bark = [PAL.barkL, PAL.bark, PAL.barkD, PAL.outline];
  // leicht gebogener Stamm (Wind von links)
  for (let y = 18; y < 112; y++) {
    const t = (111 - y) / 93, cx = 46 + t * t * 12, w = 2.5 + (1 - t) * 3 + (y > 104 ? (y - 104) * 0.6 : 0);
    for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) {
      const e = Math.abs(x) >= w - 0.5;
      b.set(Math.round(cx + x), y, e ? bark[3] : x < -w / 3 ? bark[0] : x > w / 3 ? bark[2] : bark[1]);
    }
  }
  // Etagen
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const top = 8 + i * 13, h = 19, half = 9 + i * 5.2;
    const tcy = 111 - (top + h);
    const t = Math.max(0, tcy / 93), cx = 46 + t * t * 12;
    for (let yy = 0; yy < h; yy++) {
      const f = (yy + 2) / (h + 2);
      const lw = half * f * 0.7, rw = half * f * 1.35;
      const skew = (h - yy) * 0.35;
      for (let x = Math.floor(-lw); x <= Math.ceil(rw); x++) {
        const xx = Math.round(cx + x + skew);
        const edge = x <= -lw + 1 || x >= rw - 1 || yy === h - 1;
        if (edge && hash2(xx, top + yy, seed) < 0.35) continue;
        const sh = x / (rw + 0.01) + yy / h * 0.6;
        let c = edge ? L[3] : sh < 0.05 ? L[0] : sh < 0.6 ? L[1] : L[2];
        if (yy === h - 2 && !edge) c = L[2];
        b.set(xx, top + yy, c);
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rnd() * 96), y = Math.floor(rnd() * 96);
    if (b.get(x, y) === L[1]) b.set(x, y, L[0]);
  }
  return b;
}

function makeFir(leavesHex, seed) {
  const b = new PixBuf(96, 112), rnd = mulberry32(seed);
  const L = hexes(leavesHex);
  const snow = [PAL.grassHi, PAL.grassL, PAL.grassM];
  const bark = [PAL.barkL, PAL.bark, PAL.barkD, PAL.outline];
  for (let y = 80; y < 112; y++) {
    const w = 4 + (y > 104 ? (y - 104) * 0.6 : 0);
    for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) b.set(48 + x, y, Math.abs(x) >= w - 0.5 ? bark[3] : x < -1 ? bark[0] : x > 1 ? bark[2] : bark[1]);
  }
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const top = 4 + i * 16, h = 24, half = 10 + i * 7;
    for (let yy = 0; yy < h; yy++) {
      const f = (yy + 1) / h;
      const w = half * f;
      for (let x = Math.floor(-w); x <= Math.ceil(w); x++) {
        const y = top + yy;
        const edge = Math.abs(x) >= w - 1 || yy === h - 1;
        if (yy === h - 1 && hash2(x, i, seed) < 0.4) continue;
        let c = edge ? L[3] : x < -w * 0.3 ? L[0] : x < w * 0.35 ? L[1] : L[2];
        // Schnee auf der Oberseite jeder Etage
        const sy = Math.abs(x) * 0.42;
        if (yy < sy + 3 && yy >= sy - 1) c = yy < sy ? snow[0] : x > w * 0.3 ? snow[2] : snow[1];
        b.set(48 + x, y, c);
      }
    }
  }
  b.set(48, 2, snow[0]); b.set(48, 3, snow[0]); b.set(47, 3, snow[1]); b.set(49, 3, snow[1]);
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(rnd() * 96), y = Math.floor(rnd() * 100);
    if (b.get(x, y) === L[1] || b.get(x, y) === L[2]) b.set(x, y, snow[1]);
  }
  return b;
}

function makePalm(leavesHex, seed) {
  const b = new PixBuf(96, 112), rnd = mulberry32(seed);
  const L = hexes(leavesHex);
  const bark = hexes(['#e6b878', '#c08c52', '#8e5e32', '#4a2e16']);
  // geschwungener Stamm
  let tx = 0, ty = 0;
  for (let y = 111; y >= 30; y--) {
    const t = (111 - y) / 81;
    const cx = 42 + Math.sin(t * 1.6) * 14, w = 4.5 - t * 1.6 + (y > 104 ? (y - 104) * 0.5 : 0);
    for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) {
      const e = Math.abs(x) >= w - 0.5;
      let c = e ? bark[3] : x < -w / 3 ? bark[0] : x > w / 3 ? bark[2] : bark[1];
      if (!e && (y % 6 === 0 || y % 6 === 1)) c = y % 6 === 0 ? bark[2] : bark[3];
      b.set(Math.round(cx + x), y, c);
    }
    tx = cx; ty = y;
  }
  const cx = Math.round(tx), cy = ty;
  // Wedel
  const fronds = [-2.9, -2.4, -1.9, -1.2, -0.7, -0.25, 0.25];
  for (const a0 of fronds) {
    const len = 30 + rnd() * 10, droop = 0.9 + rnd() * 0.5;
    for (let i = 0; i <= len; i++) {
      const t = i / len;
      const x = cx + Math.cos(a0) * len * t, y = cy + Math.sin(a0) * len * t * 0.55 + droop * t * t * 26;
      const w = Math.sin(t * Math.PI) * 3 + 0.6;
      for (let k = -Math.ceil(w); k <= Math.ceil(w); k++) {
        const c = Math.abs(k) >= w - 0.4 ? L[3] : k < 0 ? L[0] : k === 0 ? L[1] : L[2];
        b.set(Math.round(x), Math.round(y + k), c);
      }
      if (i % 3 === 0 && t > 0.2) { b.set(Math.round(x), Math.round(y + w + 1), L[2]); b.set(Math.round(x), Math.round(y + w + 2), L[3]); }
    }
  }
  // Kokosnuesse
  for (const [dx, dy] of [[-3, 3], [2, 4], [-1, 6]]) {
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) b.set(cx + dx + x, cy + dy + y, x + y < -1 ? rgb('#a8763e') : x * x + y * y > 3 ? rgb('#3a2410') : rgb('#6e4a24'));
  }
  return b;
}

function makeDeadTree(barkHex, leavesHex, seed) {
  const b = new PixBuf(96, 112), rnd = mulberry32(seed);
  const bark = hexes(barkHex), L = hexes(leavesHex);
  // gedrehter Stamm
  limb(b, 48, 111, 46, 70, 7, 5, bark);
  limb(b, 46, 72, 52, 44, 5, 4, bark);
  const branch = (x, y, a, len, w, depth) => {
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
    limb(b, x, y, x1, y1, w, Math.max(0.6, w * 0.6), bark);
    if (depth > 0) {
      branch(x1, y1, a - 0.5 - rnd() * 0.3, len * 0.68, Math.max(0.7, w * 0.6), depth - 1);
      branch(x1, y1, a + 0.45 + rnd() * 0.3, len * 0.62, Math.max(0.7, w * 0.6), depth - 1);
    } else {
      // Dornen-Knospen und Blaetter am Ende
      for (let k = 0; k < 4; k++) {
        const px = Math.round(x1 + (rnd() - 0.5) * 6), py = Math.round(y1 + (rnd() - 0.5) * 5);
        b.set(px, py, L[k % 3]); b.set(px + 1, py, L[2]); b.set(px, py + 1, L[2]);
      }
    }
  };
  branch(52, 46, -1.9, 20, 3.5, 3);
  branch(50, 52, -0.5, 18, 3, 3);
  branch(47, 60, -2.7, 16, 2.6, 2);
  // Dornen am Stamm
  for (let y = 60; y < 104; y += 7) {
    const s = (y / 7) % 2 ? 1 : -1;
    const x = 48 + s * 6;
    b.set(x, y, bark[3]); b.set(x + s, y - 1, bark[3]); b.set(x + 2 * s, y - 2, L[1]);
  }
  // leuchtende Fruechte
  for (let i = 0; i < 5; i++) {
    const x = 20 + Math.floor(rnd() * 56), y = 8 + Math.floor(rnd() * 40);
    for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) {
      const c = xx === 0 && yy === 0 ? PAL.white : (xx === 2 || yy === 2) ? L[2] : L[0];
      if (xx === 1 && yy === -1) continue;
      b.set(x + xx, y + yy + 2, c);
    }
    b.set(x + 1, y + 1, bark[3]); b.set(x + 1, y, bark[3]);
  }
  return b;
}

function makeCrystalTree(leavesHex, seed) {
  const b = new PixBuf(96, 112), rnd = mulberry32(seed);
  const L = hexes(leavesHex);
  const bark = hexes(['#8a96c8', '#5e6aa0', '#3e4878', '#1e2448']);
  limb(b, 48, 111, 48, 60, 6, 4, bark);
  limb(b, 48, 70, 30, 48, 3, 2, bark);
  limb(b, 48, 66, 66, 44, 3, 2, bark);
  limb(b, 48, 62, 48, 36, 3, 2, bark);
  // Kristall-Splitter als Krone
  const shard = (cx, cy, h, w) => {
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const half = Math.round((t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65 * 0.6) * w);
      for (let x = -half - 1; x <= half + 1; x++) {
        const e = Math.abs(x) === half + 1 || y === h - 1;
        const c = e ? L[3] : x < 0 ? (t < 0.5 ? L[0] : L[1]) : x === 0 ? L[1] : L[2];
        b.set(cx + x, cy - h + y, c);
      }
    }
    b.set(cx - 1, cy - h + 3, PAL.white); b.set(cx - 1, cy - h + 4, PAL.white);
  };
  const spots = [[48, 40, 30, 7], [30, 50, 22, 5], [66, 48, 24, 5], [38, 34, 20, 4], [58, 32, 22, 5], [20, 60, 16, 4], [76, 58, 16, 4], [48, 22, 16, 4]];
  for (const [x, y, h, w] of spots) shard(x + Math.round((rnd() - 0.5) * 4), y, h, w);
  for (let i = 0; i < 18; i++) { const x = 10 + Math.floor(rnd() * 76), y = 60 + Math.floor(rnd() * 48); if (!b.get(x, y)) b.set(x, y, L[rnd() < 0.5 ? 0 : 1]); }
  return b;
}

function makeTree(T, seed) {
  switch (T.kind) {
    case 'blossom': return makeOak(T.leaves, seed, { fall: 28, clusters: [[48, 28, 19], [26, 36, 13], [70, 32, 14], [36, 16, 12], [62, 15, 12], [14, 48, 8], [82, 46, 9], [48, 44, 11], [50, 8, 8]] });
    case 'maple': return makeOak(T.leaves, seed, { fall: 20 });
    case 'mushroom': return makeMushroomTree(T.caps[seed % T.caps.length], seed);
    case 'pine': return makePine(T.leaves, seed);
    case 'fir': return makeFir(T.leaves, seed);
    case 'palm': return makePalm(T.leaves, seed);
    case 'dead': return makeDeadTree(T.bark, T.leaves, seed);
    case 'crystal': return makeCrystalTree(T.leaves, seed);
    default: return makeOak(T.leaves, seed, T.fruit ? { fruit: T.fruit } : {});
  }
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
  for (let a = 0; a <= 180; a += 1) {
    const r0 = 15, r1 = 23;
    for (let r = r0; r <= r1; r++) {
      const x = Math.round(24 + Math.cos(a * Math.PI / 180) * r);
      const y = Math.round(22 - Math.sin(a * Math.PI / 180) * r);
      const e = r === r0 || r === r1;
      st(x, y, e ? PAL.stoneO : r < r0 + 3 ? PAL.stoneD : r > r1 - 3 ? PAL.stoneL : PAL.stoneM);
    }
  }
  // Schlussstein
  for (let y = -3; y <= 5; y++) for (let x = -3; x <= 3; x++) if (Math.abs(x) <= 3 - Math.max(0, y - 2) * 0.5) st(24 + x, 1 + y, Math.abs(x) === 3 || y === -3 || y === 5 ? PAL.stoneO : x < 0 ? PAL.stoneL : PAL.stoneM);
  const rnd = mulberry32(5);
  const deco = BIO.cover === 'snow' ? [PAL.grassHi, PAL.grassL] : BIO.cover === 'sand' ? [PAL.grassL, PAL.grassHi] : [PAL.leafM, PAL.leafL];
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rnd() * 48), y = Math.floor(rnd() * 40);
    if (b.get(x, y)) st(x, y, rnd() < 0.5 ? deco[0] : deco[1]);
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
  if (BIO.cover === 'snow') for (let x = 1; x < 11; x++) { const t = 4 + Math.floor(hash2(x, 0, 9) * 4); b.set(x, t - 1, PAL.grassHi); b.set(x, t, PAL.grassL); }
  else for (let y = 10; y < 26; y += 3) b.set(2 + (y % 5), y, PAL.leafM);
  return b;
}

function makeBush(B) {
  const b = new PixBuf(26, 16), rnd = mulberry32(11);
  const cols = hexes(B.leaves), fl = hexes(B.flowers);
  switch (B.kind) {
    case 'shrooms': {
      const caps = fl;
      for (const [x, h, r, ci] of [[6, 7, 4, 0], [14, 11, 6, 1], [21, 6, 3, 2]]) {
        for (let y = 0; y < h; y++) for (let k = -1; k <= 1; k++) b.set(x + k, 15 - y, k === 1 ? rgb('#c9ab84') : rgb('#fff2dc'));
        const cy = 15 - h;
        for (let y = -r; y <= 1; y++) for (let k = -r - 1; k <= r + 1; k++) {
          if ((k * k) / ((r + 1) * (r + 1)) + (y * y) / (r * r) > 1) continue;
          const e = (k * k) / ((r + 1) * (r + 1)) + (y * y) / (r * r) > 0.7 || y === 1;
          b.set(x + k, cy + y, e ? PAL.outline : (k + y) < -1 ? PAL.white : caps[ci]);
        }
      }
      for (let x = 0; x < 26; x++) if (rnd() < 0.5) b.set(x, 15, cols[1]);
      return b;
    }
    case 'dry': {
      for (let i = 0; i < 9; i++) {
        let x = 13 + (rnd() - 0.5) * 6, y = 15;
        const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, len = 6 + rnd() * 8;
        for (let k = 0; k < len; k++) { x += Math.cos(a); y += Math.sin(a); b.set(Math.round(x), Math.round(y), k > len - 3 ? cols[0] : cols[2]); }
        if (rnd() < 0.5) { b.set(Math.round(x), Math.round(y) - 1, fl[i % fl.length]); }
      }
      return b;
    }
    case 'bramble': {
      blob(b, 8, 10, 6, cols, rnd); blob(b, 17, 9, 7, cols, rnd);
      for (let i = 0; i < 14; i++) {
        const a = rnd() * Math.PI * 2, r = 6 + rnd() * 2;
        const x = Math.round(13 + Math.cos(a) * r * 1.3), y = Math.round(9 + Math.sin(a) * r * 0.8);
        if (y < 15) { b.set(x, y, PAL.thornO); b.set(x + Math.sign(Math.cos(a)), y + Math.sign(Math.sin(a)), PAL.thornTip); }
      }
      b.set(9, 6, fl[0]); b.set(10, 6, fl[0]); b.set(17, 4, fl[1]); b.set(14, 9, fl[0]);
      return b;
    }
    case 'crystals': {
      for (const [x, h, w] of [[7, 9, 2], [13, 14, 3], [19, 8, 2], [16, 6, 1]]) {
        for (let y = 0; y < h; y++) {
          const half = y < 3 ? Math.round(y / 3 * w) : w;
          for (let k = -half - 1; k <= half + 1; k++) b.set(x + k, 16 - h + y, Math.abs(k) === half + 1 ? cols[3] : k < 0 ? cols[0] : k === 0 ? cols[1] : cols[2]);
        }
        b.set(x - 1, 16 - h + 2, PAL.white);
      }
      return b;
    }
    default: {
      blob(b, 8, 10, 6, cols, rnd); blob(b, 17, 9, 7, cols, rnd); blob(b, 13, 11, 5, cols, rnd);
      if (B.kind === 'snowy') {
        for (let x = 0; x < 26; x++) for (let y = 0; y < 16; y++) {
          if (!b.get(x, y)) continue;
          b.set(x, y, PAL.grassHi); if (b.get(x, y + 1)) b.set(x, y + 1, PAL.grassL);
          if (b.get(x, y + 2) && hash2(x, y, 3) < 0.6) b.set(x, y + 2, PAL.grassM);
          break;
        }
      } else { b.set(9, 7, fl[0]); b.set(18, 6, fl[1 % fl.length]); b.set(15, 10, fl[0]); b.set(5, 10, fl[(2) % fl.length]); }
      return b;
    }
  }
}

function makeRock() {
  const b = new PixBuf(14, 10), rnd = mulberry32(3);
  const cols = [PAL.stoneL, PAL.stoneM, PAL.stoneD, PAL.stoneO];
  for (let y = 1; y < 10; y++) for (let x = 0; x < 14; x++) {
    const dx = (x - 7) / 7, dy = (y - 8) / 7;
    const d = dx * dx + dy * dy * 1.4;
    if (d > 1) continue;
    let c = d > 0.75 ? cols[3] : (x < 6 && y < 6) ? cols[0] : y > 6 ? cols[2] : cols[1];
    if (rnd() < 0.05) c = cols[2];
    b.set(x, y, c);
  }
  if (BIO.cover === 'snow') for (let x = 2; x < 12; x++) for (let y = 0; y < 10; y++) if (b.get(x, y)) { b.set(x, y, PAL.grassHi); b.set(x, y + 1, PAL.grassL); break; }
  else if (BIO.cover !== 'sand') { b.set(3, 3, PAL.leafM); b.set(4, 3, PAL.leafL); b.set(4, 2, PAL.leafM); }
  return b;
}

function sprites() {
  if (SPRITE_CACHE[CUR]) return SPRITE_CACHE[CUR];
  const S = {};
  S.tree = [0, 1, 2].map(i => makeTree(BIO.tree, 42 + i * 17));
  S.arch = makeArch();
  S.pillar = makePillar();
  S.bush = makeBush(BIO.bush);
  S.rock = makeRock();
  SPRITE_CACHE[CUR] = S;
  return S;
}

// ---------- kleine Pflanzen auf freien Flaechen ----------
function drawPlant(buf, kind, x, y, tx, ty) {
  const set = (dx, dy, c) => buf.set(x + dx, y + dy, c);
  const stem = (h, c = PAL.grassD) => { for (let k = 1; k <= h; k++) set(0, -k, c); };
  switch (kind) {
    case 'daisy': {
      stem(2);
      const fy = -4;
      set(0, fy - 1, PAL.white); set(-1, fy, PAL.white); set(1, fy, PAL.white); set(0, fy + 1, PAL.white); set(0, fy, PAL.yellow);
      if (hash2(tx, ty, 79) < 0.5) { set(3, -1, PAL.grassD); set(3, -3, PAL.white); set(2, -2, PAL.white); set(4, -2, PAL.white); set(3, -2, PAL.yellow); }
      break;
    }
    case 'lupine': {
      const hh = 5 + Math.floor(hash2(tx, ty, 80) * 3);
      stem(2);
      for (let k = 0; k < hh; k++) { const yy = -3 - k; set(0, yy, k % 2 ? PAL.pinkL : PAL.pink); if (k < hh - 2) { set(-1, yy, PAL.pink); set(1, yy, k % 2 ? PAL.pink : PAL.pinkL); } }
      set(-1, -1, PAL.leafM); set(1, -1, PAL.leafL);
      break;
    }
    case 'tuft':
      for (const [dx, hh] of [[-1, 3], [0, 5], [1, 4], [2, 2]]) for (let k = 1; k <= hh; k++) set(dx, -k, k === hh ? PAL.grassHi : k > hh / 2 ? PAL.grassL : PAL.grassM);
      break;
    case 'windgrass':
      for (const [dx, hh] of [[-2, 4], [0, 6], [2, 5], [3, 3]]) for (let k = 1; k <= hh; k++) set(dx + Math.floor(k * k / 10), -k, k === hh ? PAL.grassHi : k > hh / 2 ? PAL.grassL : PAL.grassM);
      break;
    case 'drygrass':
      for (const [dx, hh] of [[-1, 4], [0, 6], [1, 3], [2, 5]]) for (let k = 1; k <= hh; k++) set(dx + (k > 3 ? Math.sign(dx - 0.5) : 0), -k, k === hh ? rgb('#f6e6a8') : rgb('#c8a860'));
      break;
    case 'snowtuft':
      for (const [dx, hh] of [[-1, 2], [0, 4], [1, 3]]) for (let k = 1; k <= hh; k++) set(dx, -k, k === hh ? PAL.grassHi : PAL.leafM);
      set(0, -5, PAL.grassHi);
      break;
    case 'pebble':
      buf.rect(x - 1, y - 2, 4, 2, PAL.stoneM); set(-1, -2, PAL.stoneL); buf.rect(x - 1, y, 4, 1, PAL.stoneO);
      break;
    case 'tulip': {
      stem(3, PAL.leafM); set(-1, -2, PAL.leafL); set(1, -1, PAL.leafM);
      const c = hash2(tx, ty, 81) < 0.5 ? PAL.pink : rgb('#ffd23d'), c2 = hash2(tx, ty, 81) < 0.5 ? PAL.pinkL : rgb('#fff2a0');
      set(-1, -5, c); set(0, -5, c2); set(1, -5, c); set(-1, -4, c); set(0, -4, c); set(1, -4, c); set(-1, -6, c); set(1, -6, c);
      break;
    }
    case 'petals':
      for (let k = 0; k < 4; k++) set(-2 + Math.floor(hash2(tx, ty + k, 82) * 6), -1 + (k % 2), k % 2 ? PAL.pinkL : PAL.pink);
      break;
    case 'shroom': case 'glowshroom': {
      const glow = kind === 'glowshroom';
      const cap = glow ? rgb('#8ff0ff') : (hash2(tx, ty, 83) < 0.5 ? rgb('#f08ad6') : rgb('#ffb04a'));
      set(0, -1, rgb('#fff2dc')); set(0, -2, rgb('#fff2dc'));
      set(-2, -3, PAL.outline); set(-1, -3, cap); set(0, -3, cap); set(1, -3, cap); set(2, -3, PAL.outline);
      set(-1, -4, glow ? PAL.white : cap); set(0, -4, cap); set(1, -4, cap); set(0, -5, PAL.outline);
      if (hash2(tx, ty, 84) < 0.5) { set(3, -1, rgb('#fff2dc')); set(2, -2, cap); set(3, -2, cap); set(4, -2, cap); }
      break;
    }
    case 'fern':
      for (let k = 1; k <= 6; k++) { set(Math.floor(k / 3), -k, PAL.leafM); if (k % 2 === 0) { set(Math.floor(k / 3) - 1, -k, PAL.leafL); set(Math.floor(k / 3) + 1, -k + 1, PAL.leafD); } }
      break;
    case 'cornflower':
      stem(3); set(0, -4, rgb('#4a86ff')); set(-1, -5, rgb('#6aa8ff')); set(1, -5, rgb('#6aa8ff')); set(0, -6, rgb('#2a5ad8')); set(0, -5, rgb('#ffffff'));
      break;
    case 'succulent':
      for (const [dx, dy] of [[0, -1], [-1, -1], [1, -1], [-2, -2], [2, -2], [0, -2], [-1, -3], [1, -3], [0, -4]]) set(dx, dy, dy < -2 ? rgb('#a8e07a') : rgb('#5ea85a'));
      set(0, -5, rgb('#ff8ab0'));
      break;
    case 'poppy':
      stem(4); set(-1, -5, rgb('#ff4a3a')); set(1, -5, rgb('#ff4a3a')); set(0, -6, rgb('#ff6a5a')); set(0, -5, rgb('#2a1010'));
      break;
    case 'sunflower':
      stem(6, PAL.leafM); set(1, -3, PAL.leafL); set(-1, -4, PAL.leafM);
      for (const [dx, dy] of [[0, -9], [-2, -7], [2, -7], [-1, -9], [1, -9], [-2, -8], [2, -8], [-1, -6], [1, -6]]) set(dx, dy, rgb('#ffd23d'));
      set(0, -8, rgb('#7a4a1a')); set(-1, -7, rgb('#7a4a1a')); set(0, -7, rgb('#5a3410')); set(1, -7, rgb('#7a4a1a')); set(0, -6, rgb('#ffb020'));
      break;
    case 'cog':
      for (let a = 0; a < 12; a++) { const ang = Math.PI + (a / 11) * Math.PI; set(Math.round(Math.cos(ang) * (a % 2 ? 3 : 2)), Math.round(Math.sin(ang) * (a % 2 ? 3 : 2)), a % 2 ? PAL.stoneD : PAL.stoneL); }
      set(0, -1, PAL.stoneO); set(-1, -1, PAL.stoneM); set(1, -1, PAL.stoneM);
      break;
    case 'aster':
      stem(3); for (const [dx, dy] of [[0, -6], [-1, -5], [1, -5], [0, -4], [-1, -4], [1, -6]]) set(dx, dy, rgb('#ff8a3a')); set(0, -5, rgb('#ffe48e'));
      break;
    case 'bell':
      stem(5, PAL.leafM); set(1, -5, PAL.leafM); set(2, -5, rgb('#c88ae8')); set(2, -4, rgb('#a85cc8')); set(3, -4, rgb('#c88ae8')); set(-1, -3, rgb('#a85cc8')); set(-2, -2, rgb('#c88ae8')); set(-1, -2, rgb('#d8a8f0'));
      break;
    case 'glowflower':
      stem(3, PAL.leafM); set(0, -4, rgb('#e8ffff')); set(-1, -4, rgb('#8ae8ff')); set(1, -4, rgb('#8ae8ff')); set(0, -5, rgb('#8ae8ff')); set(0, -3, rgb('#4ab8e0'));
      break;
    case 'crystal': case 'icecrystal': {
      const c = kind === 'crystal' ? [rgb('#f0ffff'), rgb('#9fe8ff'), rgb('#4fa8e0'), rgb('#24508a')] : [PAL.white, rgb('#d8f0ff'), rgb('#9ac8ec'), rgb('#4e78a2')];
      for (const [dx, h] of [[0, 6], [-2, 4], [2, 3]]) for (let k = 1; k <= h; k++) { set(dx, -k, k === h ? c[0] : c[1]); set(dx + 1, -k, k === h ? c[3] : c[2]); }
      break;
    }
    case 'bluebell':
      stem(3, PAL.leafM); set(1, -4, rgb('#8ab8ff')); set(1, -3, rgb('#5a8ae8')); set(-1, -5, rgb('#8ab8ff')); set(-1, -4, rgb('#5a8ae8'));
      break;
  }
}

function drawFlora(buf, ox, oy, tx, ty) {
  const h = hash2(tx, ty, 77);
  if (h >= 0.4) return;
  const list = BIO.flora || ['daisy', 'lupine', 'tuft', 'tuft', 'pebble'];
  const kind = list[Math.min(list.length - 1, Math.floor(h / 0.4 * list.length))];
  const x = ox + 3 + Math.floor(hash2(tx, ty, 78) * 9);
  drawPlant(buf, kind, x, oy - 1, tx, ty);
}

export class TileRenderer {
  constructor(level) {
    this.level = level;
    this.biome = level.biome || 'meadow';
    this.chunks = [];
    setBiome(this.biome);
    this.dynamic = this._makeDynamic();
    this.bake();
  }

  bake() {
    const lv = this.level;
    setBiome(this.biome);
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
        let s = sp[d.type];
        if (!s) continue;
        if (Array.isArray(s)) s = s[Math.floor(hash2(d.x, d.y, 7) * s.length)];
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
          else if (t === T.CLOUD) drawCloudTile(buf, ox, oy, tx, ty, lv);
          else if (t === T.THORN_UP) drawThorns(buf, ox, oy, tx, ty, false);
          else if (t === T.THORN_DOWN) drawThorns(buf, ox, oy, tx, ty, true);
        }
      }
      // Blumen auf freien Flaechen
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
    // Ranken bleiben in jedem Biom gruen und gut erkennbar (Feuerball verbrennt sie)
    const vineCols = [rgb('#2b6a2f'), rgb('#3f9a3c'), rgb('#7fcf4a')];
    const vine = [0, 1, 2].map(v => mk((b) => {
      const rnd = mulberry32(100 + v);
      for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
        const n = rnd();
        b.set(x, y, n < 0.3 ? vineCols[0] : n < 0.75 ? vineCols[1] : vineCols[2]);
      }
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
