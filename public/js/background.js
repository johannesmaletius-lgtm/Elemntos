// Parallax-Hintergrund: Himmelsverlauf, ferne Silhouetten (je nach Biom:
// Huegel, Windmuehlen, Zahnraeder, Ruinen, Tafelberge, Kristalltuerme, Gipfel ...),
// Schwebeinseln mit Wasserfaellen, Wolkenschichten, ein Wolkenmeer am unteren
// Rand und Umgebungs-Partikel (Blueten, Sporen, Blaetter, Gluehwuermchen, Schnee).
import { PixBuf, rgb, TS } from './tiles.js';
import { mulberry32, makeCanvas, hash2 } from './util.js';
import { getBiome } from './biomes.js';

function makeCloud(seed, w, h, tint = 0) {
  const b = new PixBuf(w, h), rnd = mulberry32(seed);
  const cols = tint
    ? [rgb('#f4f9ff'), rgb('#dcebfb'), rgb('#bcd6f2'), rgb('#9fc2ea')]
    : [rgb('#ffffff'), rgb('#eaf5ff'), rgb('#c9e3fb'), rgb('#a9d0f5')];
  const circles = [];
  const n = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const r = h * (0.25 + 0.25 * Math.sin(t * Math.PI)) * (0.8 + rnd() * 0.4);
    circles.push([w * (0.12 + 0.76 * t), h - r - 2 - rnd() * h * 0.1, r]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let inside = false, top = 1e9;
    for (const [cx, cy, r] of circles) {
      const d = Math.hypot(x - cx, (y - cy) * 1.1);
      if (d <= r) { inside = true; top = Math.min(top, (y - (cy - r)) / (2 * r)); }
    }
    if (!inside || y > h - 3) continue;
    const v = y / h;
    let c = v < 0.45 ? cols[0] : v < 0.7 ? cols[1] : v < 0.86 ? cols[2] : cols[3];
    if (top < 0.12) c = cols[0];
    b.set(x, y, c);
  }
  return b.toCanvas();
}

function makeIsland(seed, w, B) {
  const h = Math.floor(w * 0.85);
  const b = new PixBuf(w, h), rnd = mulberry32(seed);
  const I = B.islands;
  const grass = I.grass.map(c => rgb(c));
  const rock = I.rock.map(c => rgb(c));
  const leaves = I.leaves.map(c => rgb(c));
  const topY = Math.floor(h * 0.42);
  for (let x = 0; x < w; x++) {
    const t = Math.abs(x - w / 2) / (w / 2);
    const depth = Math.floor((1 - Math.pow(t, 1.6)) * (h - topY) * (0.75 + rnd() * 0.25));
    for (let y = topY; y < topY + depth; y++) {
      const v = (y - topY) / Math.max(1, depth);
      let c = x < w * 0.4 ? rock[0] : x < w * 0.7 ? rock[1] : rock[2];
      if (v > 0.8) c = rock[3];
      if (B.texture === 'strata' ? (y % 6 === 0) : ((x * 13 + y * 7) % 23 === 0)) c = rock[2];
      b.set(x, y, c);
    }
  }
  for (let x = 1; x < w - 1; x++) {
    const d = 3 + Math.floor(rnd() * 3);
    for (let y = topY - 2; y < topY + d; y++) b.set(x, y, y < topY ? grass[0] : y < topY + 2 ? grass[1] : grass[2]);
  }
  // kleine Baeume in der Art des Bioms
  const kind = B.tree.kind;
  const nt = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < nt; i++) {
    const cx = Math.floor(w * (0.15 + rnd() * 0.3) + i * w * 0.25), r = 4 + Math.floor(rnd() * 4);
    if (kind === 'pine' || kind === 'fir') {
      for (let y = 0; y < r * 3; y++) { const hw = Math.floor(y / 2.2); for (let x = -hw; x <= hw; x++) b.set(cx + x, topY - r * 3 - 1 + y, kind === 'fir' && (y % 4 === 0) ? grass[0] : x < 0 ? leaves[0] : leaves[1]); }
      for (let y = 0; y < 2; y++) b.set(cx, topY - 1 + y, rock[3]);
    } else if (kind === 'mushroom') {
      for (let y = 0; y < r + 3; y++) b.set(cx, topY - 1 - y, grass[0]);
      for (let y = -r; y <= 0; y++) for (let x = -r - 2; x <= r + 2; x++) if ((x * x) / ((r + 2) * (r + 2)) + (y * y) / (r * r) <= 1) b.set(cx + x, topY - r - 4 + y, y < -r / 2 ? leaves[0] : leaves[1]);
    } else if (kind === 'palm') {
      for (let y = 0; y < r * 2; y++) b.set(cx + Math.floor(y / 5), topY - 1 - y, rock[3]);
      const tx = cx + Math.floor(r * 2 / 5), tyy = topY - r * 2;
      for (let k = -r - 2; k <= r + 2; k++) { b.set(tx + k, tyy + Math.floor(Math.abs(k) * 0.5), leaves[0]); b.set(tx + k, tyy + 1 + Math.floor(Math.abs(k) * 0.5), leaves[1]); }
    } else if (kind === 'crystal') {
      for (let y = 0; y < r * 2 + 2; y++) { const hw = y < 3 ? Math.floor(y / 1.5) : 2; for (let x = -hw; x <= hw; x++) b.set(cx + x, topY - r * 2 - 2 + y, x < 0 ? leaves[0] : leaves[1]); }
    } else {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        b.set(cx + x, topY - r - 3 + y, (x + y) < -2 ? leaves[0] : (x + y) < 3 ? leaves[1] : leaves[2]);
      }
      for (let y = 0; y < 4; y++) b.set(cx, topY - 3 + y, rock[3]);
    }
  }
  // Ruinen-Saeulen/Bogen
  const stone = [rgb('#eef3fa'), rgb('#cfd9e8'), rgb('#a7b5cc')];
  const ax = Math.floor(w * (0.55 + rnd() * 0.15));
  const ph = Math.floor(h * 0.28);
  for (const ox of [0, 12]) {
    for (let y = topY - ph; y < topY; y++) for (let x = 0; x < 4; x++) b.set(ax + ox + x, y, x === 0 ? stone[0] : x === 3 ? stone[2] : stone[1]);
  }
  for (let a = 0; a <= 180; a += 3) {
    for (let r = 6; r <= 8; r++) {
      const x = Math.round(ax + 8 + Math.cos(a * Math.PI / 180) * r), y = Math.round(topY - ph - Math.sin(a * Math.PI / 180) * r * 0.9);
      b.set(x, y, r === 8 ? stone[0] : stone[1]);
    }
  }
  return { canvas: b.toCanvas(), waterX: Math.floor(w * (0.3 + rnd() * 0.3)), waterY: topY + 2, w, h };
}

function makeSeaBand(seed, w, h, tint, B) {
  const b = new PixBuf(w, h), rnd = mulberry32(seed);
  const base = B && B.sea ? B.sea : ['#ffffff', '#eef7ff', '#d2e8fc', '#b4d7f7'];
  const cols = tint ? base.map(c => rgb(mix(c, '#a8c4e8', 0.12))) : base.map(c => rgb(c));
  const circles = [];
  let x = 0;
  while (x < w) { const r = 8 + rnd() * 12; circles.push([x, 6 + r + rnd() * 6, r]); x += r * 1.1; }
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    let topd = 1e9;
    for (const [cx, cy, r] of circles) {
      for (const off of [-w, 0, w]) {
        const d = Math.hypot(xx - (cx + off), yy - cy);
        if (d <= r) topd = Math.min(topd, d / r);
      }
    }
    const under = yy > 22;
    if (topd > 1 && !under) continue;
    let c = topd < 0.55 && yy < 18 ? cols[0] : yy < 26 ? cols[1] : yy < 40 ? cols[2] : cols[3];
    if (topd > 0.8 && topd <= 1) c = cols[1];
    b.set(xx, yy, c);
  }
  const cv = b.toCanvas();
  cv.fill = tint ? mix(base[3], '#a8c4e8', 0.12) : base[3];
  return cv;
}

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// ---------- ferne Silhouetten (nahtlos kachelbar) ----------
const FAR_W = 480, FAR_H = 150;
function makeFar(B) {
  const F = B.far;
  const b = new PixBuf(FAR_W, FAR_H), rnd = mulberry32(99);
  const c0 = rgb(F.cols[0]), c1 = rgb(F.cols[1]);
  const cl = rgb(mix(F.cols[0], '#ffffff', 0.22)), cd = rgb(mix(F.cols[1], '#000000', 0.08));
  const anim = { mills: [], gears: [] };
  const wrapSet = (x, y, c) => b.set(((x % FAR_W) + FAR_W) % FAR_W, y, c);
  const col = (x, top, c, bottom = FAR_H) => { for (let y = Math.max(0, Math.floor(top)); y < bottom; y++) wrapSet(x, y, c); };
  // weiche Huegel als Basis (zwei Ebenen)
  const hills = (base, amp, c, ph) => {
    for (let x = 0; x < FAR_W; x++) {
      const u = x / FAR_W * Math.PI * 2;
      const y = base - amp * (0.55 * Math.sin(u * 2 + ph) + 0.3 * Math.sin(u * 5 + ph * 2) + 0.15 * Math.sin(u * 11 + ph));
      col(x, y, c);
    }
  };
  switch (F.kind) {
    case 'blossomHills': {
      hills(98, 16, c0, 0.3);
      const tc = rgb(F.trees), td = rgb(mix(F.trees, F.cols[1], 0.4));
      for (let i = 0; i < 16; i++) {
        const x = Math.floor(rnd() * FAR_W), r = 5 + rnd() * 7, y = 92 - rnd() * 14;
        col(x, y, rgb(mix(F.cols[1], '#6a4a5a', 0.3)), y + 14);
        for (let yy = -r; yy <= r; yy++) for (let xx = -r - 2; xx <= r + 2; xx++) if (xx * xx * 0.8 + yy * yy <= r * r) wrapSet(x + xx, Math.round(y - r + yy), xx + yy < 0 ? tc : td);
      }
      hills(116, 10, c1, 2.1);
      break;
    }
    case 'mushrooms': {
      hills(104, 12, c0, 1.0);
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(i * FAR_W / 7 + rnd() * 30), hgt = 40 + rnd() * 50, r = 14 + rnd() * 16;
        const top = 104 - hgt;
        for (let yy = top; yy < FAR_H; yy++) for (let k = -3; k <= 3; k++) wrapSet(x + k, Math.floor(yy), k < 0 ? cl : c1);
        for (let yy = -r * 0.6; yy <= 2; yy++) for (let xx = -r; xx <= r; xx++) if ((xx * xx) / (r * r) + (yy * yy) / (r * r * 0.36) <= 1) wrapSet(x + xx, Math.round(top + yy), yy < -r * 0.3 && xx < 0 ? cl : c1);
      }
      hills(120, 8, c1, 2.7);
      break;
    }
    case 'windmills': {
      hills(96, 22, c0, 0.8);
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(i * FAR_W / 4 + 30 + rnd() * 50);
        const u = x / FAR_W * Math.PI * 2;
        const gy = 96 - 22 * (0.55 * Math.sin(u * 2 + 0.8) + 0.3 * Math.sin(u * 5 + 1.6) + 0.15 * Math.sin(u * 11 + 0.8));
        const th = 34;
        for (let yy = 0; yy < th; yy++) { const hw = 2 + yy * 0.12; for (let k = -Math.ceil(hw); k <= Math.ceil(hw); k++) wrapSet(x + k, Math.floor(gy - th + yy), k < 0 ? cl : c1); }
        for (let k = -4; k <= 4; k++) for (let yy = 0; yy < 5; yy++) wrapSet(x + k, Math.floor(gy - th - 4 + yy), cd);
        anim.mills.push({ x, y: gy - th - 2, r: 20, sp: 0.8 + rnd() * 0.6 });
      }
      hills(118, 10, c1, 2.4);
      break;
    }
    case 'ruins': {
      hills(112, 6, c0, 0.4);
      let x = 0;
      while (x < FAR_W) {
        const kind = rnd(), w = 14 + Math.floor(rnd() * 26), hgt = 20 + rnd() * 50;
        const top = 112 - hgt;
        for (let xx = 0; xx < w; xx++) {
          let t = top;
          if (kind < 0.25) { const u = (xx - w / 2) / (w / 2); t = top - Math.sqrt(Math.max(0, 1 - u * u)) * w * 0.45; } // Kuppel
          else if (kind < 0.5) { if (xx % 6 < 3) t = top - 3; } // Zinnen
          else if (kind < 0.7) { t = top + Math.abs(xx - w / 2) * 0.9 - w * 0.4; } // Spitzdach
          else if (kind < 0.85) { t = top + (hash2(xx, 3, 1) * 8); } // zerfallen
          col(x + xx, t, xx < 2 ? cl : c1);
          // Fenster
          if (xx % 7 === 3 && hgt > 30) for (let yy = top + 8; yy < top + 14; yy++) wrapSet(x + xx, Math.floor(yy), cd);
        }
        if (kind > 0.85) { for (let yy = top - 30; yy < 112; yy++) for (let k = 0; k < 6; k++) wrapSet(x + k, Math.floor(yy), k < 2 ? cl : c1); }
        x += w + Math.floor(rnd() * 14);
      }
      hills(126, 4, c1, 1.7);
      break;
    }
    case 'gears': {
      hills(110, 10, c0, 0.6);
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(i * FAR_W / 5 + rnd() * 40);
        const hgt = 30 + rnd() * 40;
        for (let yy = 110 - hgt; yy < FAR_H; yy++) for (let k = -4; k <= 4; k++) wrapSet(x + k, Math.floor(yy), k < -1 ? cl : c1);
        for (let k = -7; k <= 7; k++) for (let yy = 0; yy < 4; yy++) wrapSet(x + k, Math.floor(110 - hgt + yy), cd);
        anim.gears.push({ x, y: 110 - hgt - 4, r: 16 + rnd() * 14, teeth: 10 + Math.floor(rnd() * 6), sp: (i % 2 ? 1 : -1) * (0.25 + rnd() * 0.2) });
      }
      hills(122, 6, c1, 2.2);
      break;
    }
    case 'mesas': {
      let x = 0;
      while (x < FAR_W) {
        const w = 30 + Math.floor(rnd() * 60), hgt = 30 + rnd() * 45, top = 110 - hgt, slope = 6 + rnd() * 6;
        for (let xx = -slope; xx < w + slope; xx++) {
          const t = xx < 0 ? top + (-xx / slope) * hgt * 0.9 : xx >= w ? top + ((xx - w) / slope) * hgt * 0.9 : top + hash2(xx >> 2, 7, 2) * 2;
          col(x + Math.floor(xx), t, xx < w * 0.3 ? cl : c0);
          for (let s = 0; s < 4; s++) { const sy = Math.floor(top + 8 + s * 9); if (sy > t) wrapSet(x + Math.floor(xx), sy, c1); }
        }
        x += w + Math.floor(slope * 2 + rnd() * 30);
      }
      hills(122, 6, c1, 1.1);
      break;
    }
    case 'brambles': {
      hills(110, 8, c0, 0.2);
      for (let i = 0; i < 26; i++) {
        let x = rnd() * FAR_W, y = 112;
        const h = 30 + rnd() * 60, bend = (rnd() - 0.5) * 1.4, w0 = 2 + rnd() * 2;
        for (let k = 0; k < h; k++) {
          const t = k / h; x += bend * t * 0.8; y -= 1;
          const w = w0 * (1 - t) + 0.5;
          for (let q = -Math.ceil(w); q <= Math.ceil(w); q++) wrapSet(Math.round(x + q), Math.round(y), q < 0 ? cl : c1);
          if (k % 7 === 3) { const s = (k / 7) % 2 ? 1 : -1; for (let q = 1; q < 5; q++) wrapSet(Math.round(x + s * (w + q)), Math.round(y - q * 0.6), c1); }
        }
      }
      hills(124, 5, c1, 2.9);
      break;
    }
    case 'spires': {
      hills(114, 6, c0, 0.9);
      for (let i = 0; i < 22; i++) {
        const x = Math.floor(rnd() * FAR_W), h = 20 + rnd() * 80, w = 4 + rnd() * 7, top = 114 - h;
        for (let yy = 0; yy < h + 20; yy++) {
          const hw = Math.min(w, yy * w / (h * 0.35));
          for (let k = -Math.ceil(hw); k <= Math.ceil(hw); k++) wrapSet(x + k, Math.floor(top + yy), k < 0 ? cl : c1);
        }
      }
      hills(126, 4, c1, 1.9);
      break;
    }
    case 'peaks': {
      const snow = rgb(F.snow || '#ffffff');
      const ridge = (base, amp, c, ph, n) => {
        const pts = [];
        for (let i = 0; i <= n; i++) pts.push(base - amp * (0.4 + 0.6 * hash2(i, ph, 3)));
        pts[n] = pts[0];
        for (let x = 0; x < FAR_W; x++) {
          const f = x / FAR_W * n, i = Math.floor(f), t = f - i;
          const y = pts[i] + (pts[i + 1] - pts[i]) * t + Math.sin(x * 0.7) * 1.2;
          col(x, y, c);
          for (let s = 0; s < 6 + amp * 0.12; s++) if (y + s < base - amp * 0.45) wrapSet(x, Math.floor(y + s), (t < 0.5) === (pts[i + 1] < pts[i]) ? snow : rgb(mix(F.snow || '#ffffff', F.cols[0], 0.35)));
        }
      };
      ridge(122, 70, c0, 1, 9);
      ridge(130, 40, c1, 2, 13);
      break;
    }
    default: { // 'hills'
      hills(100, 18, c0, 0.5);
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(rnd() * FAR_W), r = 3 + rnd() * 4;
        const u = x / FAR_W * Math.PI * 2;
        const gy = 100 - 18 * (0.55 * Math.sin(u * 2 + 0.5) + 0.3 * Math.sin(u * 5 + 1) + 0.15 * Math.sin(u * 11 + 0.5));
        for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) wrapSet(x + xx, Math.round(gy - r + yy + 1), xx + yy < 0 ? cl : c0);
      }
      hills(118, 10, c1, 2.3);
    }
  }
  return { canvas: b.toCanvas(), anim };
}

// Tageszeiten: sky = gewuenschte End-Farben des Himmels, tint = Licht, mit dem
// am Ende die ganze Szene multipliziert wird (Abendrot, Nacht ...).
export const THEMES = {
  day: { label: 'Mittag', sky: ['#0a7ff5', '#2fa4fb', '#71c6ff', '#b2e1ff'] },
  morning: { label: 'Morgen', sky: ['#3c8ef0', '#73bbf6', '#bfe3fb', '#ffe6cc'], tint: '#fff7ef', sun: { x: 0.18, y: 0.62, r: 2.2, c: '#fff6d8' } },
  noon: { label: 'Mittag', sky: ['#0570ea', '#2b9ef9', '#6ec5ff', '#c9eeff'] },
  afternoon: { label: 'Nachmittag', sky: ['#2d7fe0', '#5aa8ef', '#a6d0f2', '#ffdcae'], tint: '#fff2e0' },
  golden: { label: 'Goldene Stunde', sky: ['#3970c8', '#7ea9de', '#f3cf9c', '#ffb47c'], tint: '#ffeacf', sun: { x: 0.78, y: 0.6, r: 2.6, c: '#fff1c4' } },
  sunset: { label: 'Abendrot', sky: ['#3a4fa8', '#b56a9e', '#ff9a6a', '#ffd28a'], tint: '#ffdcc8', sun: { x: 0.7, y: 0.7, r: 3.2, c: '#fff0b0' } },
  dusk: { label: 'Dämmerung', sky: ['#1d2350', '#4d3a78', '#b85c7c', '#f0a07c'], tint: '#d2bfe0', stars: 0.4, glow: true },
  night: { label: 'Nacht', sky: ['#060a22', '#101a46', '#22306c', '#3d5596'], tint: '#9aa9d8', stars: 1, moon: { x: 0.8, y: 0.2 }, glow: true },
  aurora: { label: 'Polarlicht', sky: ['#040a1e', '#0b1a3e', '#1a3462', '#2e5a8a'], tint: '#a3b6dc', stars: 1, aurora: true, glow: true },
};

// Himmelsfarbe so waehlen, dass sie nach dem Multiplizieren mit tint stimmt
function preTint(col, tint) {
  if (!tint) return col;
  const c = hexRgb(col), t = hexRgb(tint);
  return `rgb(${c.map((v, i) => Math.min(255, Math.round(v * 255 / Math.max(1, t[i])))).join(',')})`;
}

const GLOW_AMBIENT = { fireflies: 1, spores: 1 };

export class Background {
  constructor(theme = 'day', biome = 'meadow') {
    this.theme = THEMES[theme] || THEMES.day;
    this.biome = getBiome(biome);
    const B = this.biome;
    const rnd = mulberry32(77);
    this.stars = [];
    if (this.theme.stars) for (let i = 0; i < 140 * this.theme.stars; i++) this.stars.push([rnd(), rnd() * 0.7, 0.5 + rnd() * 1.2, rnd() * 6]);
    this.clouds = [];
    for (let i = 0; i < 6; i++) this.clouds.push(makeCloud(10 + i, 48 + i * 10, 22 + (i % 3) * 6, i % 2));
    this.islands = [makeIsland(3, 110, B), makeIsland(8, 80, B), makeIsland(15, 140, B), makeIsland(21, 64, B)];
    this.far = makeFar(B);
    this.seaBack = makeSeaBand(5, 256, 64, true, B);
    this.seaFront = makeSeaBand(9, 256, 48, false, B);
    // Umgebungs-Partikel: feste Startwerte, Bewegung rein aus der Zeit (kein Zustand)
    const A = B.ambient;
    const ar = mulberry32(1234);
    this.amb = [];
    if (A) for (let i = 0; i < A.n; i++) this.amb.push({ u: ar(), v: ar(), ph: ar() * 100, z: 0.5 + ar() * 0.9, c: A.cols[i % A.cols.length], k: ar() });
    this.flies = [];
    if (B.butterflies) for (let i = 0; i < 5; i++) this.flies.push({ u: ar(), v: 0.45 + ar() * 0.35, ph: ar() * 100, c: B.butterflies[i % B.butterflies.length] });
    this.sky = null;
    this.skyH = 0;
  }

  _skyGradient(ctx, h) {
    if (this.sky && this.skyH === h) return this.sky;
    const c = makeCanvas(1, h);
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, h);
    const th = this.theme, sky = th.sky.map(c => preTint(c, th.tint));
    grd.addColorStop(0, sky[0]);
    grd.addColorStop(0.45, sky[1]);
    grd.addColorStop(0.8, sky[2]);
    grd.addColorStop(1, sky[3]);
    g.fillStyle = grd; g.fillRect(0, 0, 1, h);
    this.sky = c; this.skyH = h;
    return c;
  }

  drawBack(ctx, camX, camY, s, W, H, level, time) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._skyGradient(ctx, H), 0, 0, W, H);
    const k = s / TS; // Art-Pixel -> Bildschirm
    const lvH = level.h;
    this._sky(ctx, camX, camY, s, W, H, time);
    this._drawFar(ctx, camX, camY, s, W, H, lvH, time);
    // ferne Inseln
    {
      const p = 0.12, spacing = 38;
      const base = camX * p;
      const i0 = Math.floor(base / spacing) - 1;
      for (let i = i0; i < i0 + Math.ceil(W / s / spacing) + 3; i++) {
        const isl = this.islands[((i % 4) + 4) % 4];
        const wx = i * spacing + ((i * 17) % 11);
        const wy = 1.5 + ((i * 7) % 5) * 0.9;
        const sx = (wx - base) * s;
        const sy = (wy - camY * 0.08) * s;
        const scale = k * (0.85 + ((i * 5) % 3) * 0.15);
        ctx.globalAlpha = 0.9;
        const wfx = sx + isl.waterX * scale, wfy = sy + isl.waterY * scale;
        const wfh = isl.h * scale * 1.3;
        const grd = ctx.createLinearGradient(0, wfy, 0, wfy + wfh);
        grd.addColorStop(0, 'rgba(235,248,255,0.95)');
        grd.addColorStop(1, 'rgba(235,248,255,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(Math.round(wfx), Math.round(wfy), Math.max(2, Math.round(3 * scale)), wfh);
        ctx.fillStyle = 'rgba(160,210,255,0.8)';
        for (let j = 0; j < 4; j++) {
          const yy = ((time * 30 + j * 13) % 40) / 40;
          ctx.fillRect(Math.round(wfx), Math.round(wfy + yy * wfh * 0.8), Math.max(1, Math.round(scale)), Math.round(4 * scale));
        }
        ctx.drawImage(isl.canvas, Math.round(sx), Math.round(sy), Math.round(isl.w * scale), Math.round(isl.h * scale));
        ctx.globalAlpha = 1;
      }
    }
    // Wolken (zwei Ebenen)
    for (const [p, alpha, yBase, spacing, scaleK] of [[0.22, 0.85, 2.0, 15, 0.9], [0.4, 1, 5.5, 19, 1.2]]) {
      const drift = time * 0.25 * (p * 2);
      const base = camX * p + drift;
      const i0 = Math.floor(base / spacing) - 1;
      ctx.globalAlpha = alpha;
      for (let i = i0; i < i0 + Math.ceil(W / s / spacing) + 3; i++) {
        const cl = this.clouds[((i * 7 % 6) + 6) % 6];
        const wx = i * spacing + ((i * 13) % 7);
        const wy = yBase + ((i * 11) % 4) * 0.8;
        const sx = (wx - base) * s, sy = (wy - camY * p * 0.6) * s;
        ctx.drawImage(cl, Math.round(sx), Math.round(sy), Math.round(cl.width * k * scaleK), Math.round(cl.height * k * scaleK));
      }
      ctx.globalAlpha = 1;
    }
    // Wolkenmeer hinten
    this._band(ctx, this.seaBack, (camX * 0.55 + time * 0.3) * s, (lvH - 3.2 - camY) * s, k * 1.2, W, H);
  }

  // ferne Silhouetten mit eigener Parallaxe; Windmuehlen und Zahnraeder drehen sich
  _drawFar(ctx, camX, camY, s, W, H, lvH, time) {
    const k = s / TS * 0.75;
    const img = this.far.canvas;
    const w = FAR_W * k, h = FAR_H * k;
    const anchor = lvH - 14;
    const base = (lvH - 2.0 - anchor) * s + (anchor - camY) * s * 0.55;
    const top = base - h;
    if (top > H) return;
    const par = 0.05;
    const off = (((camX * par * s) % w) + w) % w;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.globalAlpha = this.biome.far.alpha ?? 0.62;   // Dunst: fern = blass
    for (let x = -off; x < W; x += w) ctx.drawImage(img, Math.round(x), Math.round(top), Math.ceil(w) + 1, Math.round(h));
    const A = this.far.anim;
    const F = this.biome.far;
    for (let x = -off; x < W; x += w) {
      for (const m of A.mills) {
        const cx = x + m.x * k, cy = top + m.y * k;
        if (cx < -m.r * k * 2 || cx > W + m.r * k * 2) continue;
        ctx.fillStyle = mix(F.cols[1], '#000000', 0.08);
        for (let j = 0; j < 4; j++) {
          const a = time * m.sp + j * Math.PI / 2;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
          ctx.fillRect(-k * 1, 0, k * 2, m.r * k);
          ctx.fillRect(k * 1, m.r * k * 0.25, k * 4, m.r * k * 0.7);
          ctx.restore();
        }
        ctx.beginPath(); ctx.arc(cx, cy, k * 2.2, 0, Math.PI * 2); ctx.fill();
      }
      for (const g of A.gears) {
        const cx = x + g.x * k, cy = top + g.y * k, r = g.r * k;
        if (cx < -r * 2 || cx > W + r * 2) continue;
        ctx.fillStyle = F.cols[1];
        ctx.beginPath();
        const n = g.teeth * 2, a0 = time * g.sp;
        for (let i = 0; i <= n * 2; i++) {
          const a = a0 + (i / (n * 2)) * Math.PI * 2;
          const rr = (Math.floor(i / 2) % 2) ? r : r * 0.82;
          if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = mix(F.cols[0], '#ffffff', 0.25);
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = F.cols[1];
        for (let j = 0; j < 4; j++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + j * Math.PI / 4); ctx.fillRect(-r * 0.55, -k, r * 1.1, k * 2); ctx.restore(); }
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }


  _sky(ctx, camX, camY, s, W, H, time) {
    const th = this.theme;
    if (this.stars.length) {
      for (const [sx, sy, r, ph] of this.stars) {
        const x = ((sx * W * 1.3 - camX * s * 0.02) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
        const y = sy * H - camY * s * 0.02;
        const a = 0.55 + 0.45 * Math.sin(time * 1.7 + ph * 3);
        ctx.fillStyle = `rgba(255,255,240,${a})`;
        const z = Math.max(1, r * s / 28);
        ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(z), Math.ceil(z));
      }
    }
    if (th.aurora) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bands = [['80,255,190', 0.16, 0.0], ['90,200,255', 0.12, 1.7], ['200,120,255', 0.1, 3.1]];
      for (const [col, a, off] of bands) {
        const y0 = H * (0.12 + off * 0.03);
        ctx.beginPath();
        for (let i = 0; i <= 32; i++) {
          const x = (i / 32) * W;
          const y = y0 + Math.sin(i * 0.45 + time * 0.35 + off) * H * 0.05 + Math.sin(i * 0.17 - camX * 0.01 + off) * H * 0.04;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = 32; i >= 0; i--) {
          const x = (i / 32) * W;
          const y = y0 + H * 0.2 + Math.sin(i * 0.3 + time * 0.25 + off) * H * 0.04;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        const g = ctx.createLinearGradient(0, y0 - H * 0.05, 0, y0 + H * 0.25);
        g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.35, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.restore();
    }
    const body = th.sun || th.moon;
    if (body) {
      const x = body.x * W - camX * s * 0.01, y = body.y * H - camY * s * 0.03;
      const r = (body.r || 1.3) * s;
      const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.2);
      g.addColorStop(0, th.sun ? 'rgba(255,240,200,0.55)' : 'rgba(220,230,255,0.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
      ctx.fillStyle = th.sun ? th.sun.c : '#f4f6ff';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (th.moon) {
        ctx.fillStyle = 'rgba(160,170,210,0.45)';
        for (const [dx, dy, rr] of [[-0.3, -0.2, 0.22], [0.25, 0.3, 0.16], [0.1, -0.45, 0.1]]) { ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  }

  // Umgebungs-Partikel vor der Szene. glow=true: nur leuchtende Arten (nach dem Licht-Tint, additiv)
  drawAmbient(ctx, camX, camY, s, W, H, time, glow = false) {
    const A = this.biome.ambient;
    if (!A) return;
    const isGlow = !!GLOW_AMBIENT[A.kind];
    if (isGlow !== glow) { if (!glow) this._drawButterflies(ctx, camX, camY, s, W, H, time); return; }
    const span = W + s * 4;
    const wrapX = (v) => ((v % span) + span) % span - s * 2;
    const wrapY = (v) => ((v % (H + s * 2)) + H + s * 2) % (H + s * 2) - s;
    ctx.save();
    if (glow) ctx.globalCompositeOperation = 'lighter';
    for (const p of this.amb) {
      const par = 0.6 + p.z * 0.5;
      const t = time + p.ph;
      let x, y, size = s * 0.07 * p.z, rot = 0, alpha = 0.9;
      switch (A.kind) {
        case 'petals':
          x = wrapX(p.u * span + t * s * (1.2 + p.k) - camX * s * par);
          y = wrapY(p.v * H + t * s * (0.8 + p.k * 0.5) + Math.sin(t * 1.3) * s * 0.4 - camY * s * par * 0.3);
          rot = t * (1.5 + p.k * 2); size = s * 0.11 * p.z; break;
        case 'leaves':
          x = wrapX(p.u * span + t * s * (0.6 + p.k) + Math.sin(t * 0.9) * s * 0.8 - camX * s * par);
          y = wrapY(p.v * H + t * s * (1.1 + p.k * 0.6) - camY * s * par * 0.3);
          rot = Math.sin(t * 2.2) * 1.4 + t * 0.6; size = s * 0.14 * p.z; break;
        case 'snow':
          x = wrapX(p.u * span + t * s * 0.35 + Math.sin(t * 0.8 + p.k * 6) * s * 0.5 - camX * s * par);
          y = wrapY(p.v * H + t * s * (0.7 + p.z * 0.9) - camY * s * par * 0.3);
          size = s * 0.06 * (0.6 + p.z); alpha = 0.6 + p.z * 0.3; break;
        case 'gusts':
          x = wrapX(p.u * span + t * s * (9 + p.k * 6) - camX * s * par);
          y = wrapY(p.v * H + Math.sin(t * 1.4) * s * 0.3 - camY * s * par * 0.3);
          break;
        case 'sand':
          x = wrapX(p.u * span + t * s * (2.2 + p.k * 2) - camX * s * par);
          y = wrapY(p.v * H + Math.sin(t * 2 + p.k * 5) * s * 0.25 - camY * s * par * 0.3);
          size = s * 0.05 * p.z; alpha = 0.7; break;
        case 'motes':
          x = wrapX(p.u * span + Math.sin(t * 0.3) * s * 1.2 - camX * s * par);
          y = wrapY(p.v * H - t * s * 0.15 + Math.cos(t * 0.5) * s * 0.4 - camY * s * par * 0.3);
          alpha = 0.4 + 0.5 * Math.max(0, Math.sin(t * 2.3)); break;
        case 'fireflies':
          x = wrapX(p.u * span + Math.sin(t * 0.4 + p.k * 3) * s * 1.6 - camX * s * par);
          y = wrapY(p.v * H + Math.sin(t * 0.7 + p.k * 7) * s * 0.9 - camY * s * par * 0.3);
          alpha = 0.25 + 0.75 * Math.max(0, Math.sin(t * 1.6 + p.k * 4)); size = s * 0.08 * p.z; break;
        case 'spores':
          x = wrapX(p.u * span + Math.sin(t * 0.6 + p.k * 4) * s * 0.7 - camX * s * par);
          y = wrapY(p.v * H - t * s * (0.35 + p.k * 0.3) - camY * s * par * 0.3);
          alpha = 0.35 + 0.4 * Math.sin(t * 2 + p.k * 6); size = s * 0.06 * p.z; break;
        default: // pollen
          x = wrapX(p.u * span + t * s * 0.25 + Math.sin(t * 0.7) * s * 0.6 - camX * s * par);
          y = wrapY(p.v * H - t * s * 0.12 + Math.sin(t * 1.1 + p.k * 5) * s * 0.3 - camY * s * par * 0.3);
          size = s * 0.045 * p.z; alpha = 0.55;
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.c;
      if (A.kind === 'gusts') {
        if (p.k < 0.7) { ctx.fillRect(x, y, s * (1.2 + p.z * 1.6), Math.max(1, s * 0.035)); }
        else { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6); ctx.fillRect(-s * 0.08, -s * 0.04, s * 0.16, s * 0.08); ctx.restore(); }
      } else if (A.kind === 'petals' || A.kind === 'leaves') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        const sq = Math.abs(Math.cos(t * 2.5 + p.k * 3)) * 0.7 + 0.3;
        ctx.beginPath(); ctx.ellipse(0, 0, size, size * 0.55 * sq, 0, 0, Math.PI * 2); ctx.fill();
        if (A.kind === 'leaves') { ctx.fillStyle = 'rgba(90,40,20,0.5)'; ctx.fillRect(-size, -Math.max(0.5, s * 0.01), size * 2, Math.max(1, s * 0.02)); }
        ctx.restore();
      } else if (glow) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
        g.addColorStop(0, p.c); g.addColorStop(0.25, p.c); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
      } else if (A.kind === 'snow') {
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      } else {
        const z = Math.max(1, size);
        ctx.fillRect(Math.round(x - z / 2), Math.round(y - z / 2), Math.ceil(z), Math.ceil(z));
      }
    }
    ctx.restore();
    if (!glow) this._drawButterflies(ctx, camX, camY, s, W, H, time);
  }

  _drawButterflies(ctx, camX, camY, s, W, H, time) {
    if (!this.flies.length) return;
    const span = W + s * 6;
    for (const f of this.flies) {
      const t = time + f.ph;
      const x = (((f.u * span + Math.sin(t * 0.35) * s * 3 + t * s * 0.4 - camX * s * 0.9) % span) + span) % span - s * 3;
      const y = f.v * H + Math.sin(t * 1.7) * s * 0.5 + Math.sin(t * 0.5) * s * 0.8 - camY * s * 0.25 + s * 2.5;
      const flap = Math.abs(Math.sin(t * 14));
      const z = s * 0.13;
      ctx.fillStyle = f.c;
      ctx.fillRect(Math.round(x - z * (0.3 + flap)), Math.round(y - z * 0.5), Math.ceil(z * (0.3 + flap)), Math.ceil(z));
      ctx.fillRect(Math.round(x + z * 0.15), Math.round(y - z * 0.5), Math.ceil(z * (0.3 + flap)), Math.ceil(z));
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(Math.round(x - z * 0.1), Math.round(y - z * 0.6), Math.max(1, Math.round(z * 0.25)), Math.ceil(z * 1.1));
    }
  }

  // Licht der Tageszeit ueber die ganze Szene legen
  drawTint(ctx, W, H) {
    if (!this.theme.tint) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = this.theme.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawFront(ctx, camX, camY, s, W, H, level, time) {
    const k = s / TS;
    this._band(ctx, this.seaFront, (camX * 1.15 - time * 0.4) * s, (level.h - 0.9 - camY) * s, k * 1.3, W, H);
  }

  _band(ctx, img, offPx, y, scale, W, H) {
    if (y > H) return;
    ctx.imageSmoothingEnabled = false;
    const bw = img.width * scale;
    const off = ((offPx % bw) + bw) % bw;
    const hh = img.height * scale;
    for (let x = -off; x < W; x += bw) {
      ctx.drawImage(img, Math.round(x), Math.round(y), Math.ceil(bw) + 1, Math.round(hh));
    }
    const bottom = Math.round(y + hh);
    if (bottom < H) {
      ctx.fillStyle = img.fill || '#b4d7f7';
      ctx.fillRect(0, bottom - 1, W, H - bottom + 1);
    }
  }
}
