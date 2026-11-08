// Objekte im Level: Muenzen, Kristalle, Pilz-Trampoline, Checkpoints, Ziel-Tor,
// Broeckel- und bewegliche Plattformen, Feuerbaelle. Sprites prozedural.
import { PixBuf, rgb, PAL, TS } from './tiles.js';
import { mulberry32, makeCanvas } from './util.js';
import { GEM_COLORS } from './config.js';

const SPR = {};

function makeCoin() {
  const b = new PixBuf(12, 12);
  const O = rgb('#7a4300'), D = rgb('#d98a0b'), M = rgb('#ffc933'), L = rgb('#fff0a0');
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const d = Math.hypot(x - 5.5, y - 5.5);
    if (d > 6) continue;
    let c = d > 5.1 ? O : d > 4.2 ? (x + y < 11 ? L : D) : M;
    if (d <= 4.2 && d > 3.2 && x + y > 12) c = D;
    if (x >= 5 && x <= 6 && y >= 3 && y <= 8) c = D;
    if (x === 5 && y >= 3 && y <= 8) c = L;
    b.set(x, y, c);
  }
  return b.toCanvas();
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

function makeGem(el = 'skill') {
  const G = GEM_COLORS[el] || GEM_COLORS.skill;
  const b = new PixBuf(14, 16);
  const O = rgb(shade(G.dark, 0.55)), D = rgb(G.dark), M = rgb(G.mid), L = rgb(G.light), W = rgb('#ffffff');
  const DD = rgb(shade(G.dark, 0.8));
  for (let y = 0; y < 16; y++) for (let x = 0; x < 14; x++) {
    const top = y < 6;
    const half = top ? 2 + y : Math.max(0, 7 - Math.floor((y - 5) * 0.75));
    const dx = x - 6.5;
    if (Math.abs(dx) > half) continue;
    let c = Math.abs(dx) > half - 1 ? O : top ? (dx < 0 ? L : M) : (dx < -1 ? M : dx < 2 ? D : DD);
    if (y === 5 && Math.abs(dx) < half - 1) c = M;
    if (top && dx < -1 && dx > -4 && y > 1 && y < 4) c = W;
    b.set(x, y, c);
  }
  return b.toCanvas();
}

function makeMushroom() {
  const b = new PixBuf(22, 18);
  const R = rgb('#e8343a'), RD = rgb('#a5161f'), RL = rgb('#ff7a6e'), O = rgb('#3a0d10'), W = rgb('#ffffff'), S = rgb('#f3dfb8'), SD = rgb('#c9a46e');
  // Hut
  for (let y = 0; y < 11; y++) for (let x = 0; x < 22; x++) {
    const dx = (x - 10.5) / 10.5, dy = (y - 10) / 10;
    const d = dx * dx + dy * dy;
    if (d > 1 || y > 10) continue;
    let c = d > 0.8 ? O : y > 8 ? RD : (dx < -0.2 && dy < -0.4) ? RL : R;
    if (y === 10) c = O;
    b.set(x, y, c);
  }
  for (const [sx, sy, r] of [[6, 4, 1.6], [12, 2, 1.4], [15, 6, 1.8], [9, 7, 1.2], [3, 7, 1]]) {
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= r * r) b.set(sx + x, sy + y, W);
  }
  // Stiel
  for (let y = 11; y < 18; y++) for (let x = 7; x < 15; x++) {
    const e = x === 7 || x === 14 || y === 17;
    b.set(x, y, e ? O : x < 10 ? S : x > 12 ? SD : S);
  }
  return b.toCanvas();
}

function makeSlab(w) {
  // schwebende Steinplatte mit Gras (fuer bewegliche Plattformen)
  const W = w * TS, H = 14;
  const b = new PixBuf(W, H + 8), rnd = mulberry32(w * 31);
  for (let y = 0; y < H + 8; y++) for (let x = 0; x < W; x++) {
    const taper = y > 6 ? Math.floor((y - 6) * 1.6) : 0;
    if (x < taper || x >= W - taper) continue;
    let c = y < 3 ? (y === 0 ? PAL.grassHi : PAL.grassL) : y === 3 ? PAL.grassD : ((x + y * 3) % 7 === 0 ? PAL.stoneD : x < W / 3 ? PAL.stoneL : PAL.stoneM);
    if (y > 3 && (x === taper || x === W - taper - 1 || y === H + 7)) c = PAL.stoneO;
    if (y === 4) c = PAL.stoneO;
    if (y > H + 4 && rnd() < 0.3) continue;
    b.set(x, y, c);
  }
  // Runen-Glimmen
  for (let i = 1; i < w; i++) { b.set(i * TS, 8, rgb('#7ff0ff')); b.set(i * TS, 9, rgb('#3fc6e8')); }
  return b.toCanvas();
}

function makeCrumble() {
  const b = new PixBuf(TS, 10);
  const L = rgb('#f0d29a'), M = rgb('#d6ae6c'), D = rgb('#a57c43'), O = rgb('#5b3c1d');
  for (let y = 0; y < 10; y++) for (let x = 0; x < TS; x++) {
    let c = y === 0 ? L : y > 7 ? D : M;
    if (x === 0 || x === TS - 1 || y === 9) c = O;
    if ((x === 5 && y > 1 && y < 7) || (x === 6 && y > 4) || (x === 11 && y < 6) || (x === 10 && y >= 5 && y < 9)) c = O;
    if (y > 8 && (x % 4 === 1)) continue;
    b.set(x, y, c);
  }
  return b.toCanvas();
}

export function entitySprites() {
  if (SPR.coin) return SPR;
  SPR.coin = makeCoin();
  SPR.gem = {};
  for (const el of Object.keys(GEM_COLORS)) SPR.gem[el] = makeGem(el);
  SPR.mushroom = makeMushroom();
  SPR.crumble = makeCrumble();
  SPR.slabs = {};
  return SPR;
}

function slab(w) {
  const S = entitySprites();
  if (!S.slabs[w]) S.slabs[w] = makeSlab(w);
  return S.slabs[w];
}

// ---------- Zeichnen ----------
export function drawCoin(ctx, c, camX, camY, s, time) {
  const S = entitySprites();
  const k = s / TS;
  const spin = Math.abs(Math.cos(time * 3.2 + c.x * 0.7));
  const w = Math.max(2, 12 * k * Math.max(0.18, spin)), h = 12 * k;
  const bob = Math.sin(time * 3 + c.x) * 0.06 * s;
  ctx.drawImage(S.coin, Math.round((c.x - camX) * s - w / 2), Math.round((c.y - camY) * s - h / 2 + bob), Math.round(w), Math.round(h));
}

export function drawGem(ctx, g, camX, camY, s, time) {
  const S = entitySprites();
  const k = s / TS;
  const bob = Math.sin(time * 2.4 + g.x) * 0.12 * s;
  const x = (g.x - camX) * s, y = (g.y - camY) * s + bob;
  const G = GEM_COLORS[g.el] || GEM_COLORS.skill;
  // Leuchten
  const r = s * (0.8 + 0.1 * Math.sin(time * 4));
  drawGlow(ctx, x, y, r, G.glow, 0.7);
  if (g.el !== 'skill') {
    // Element-Ring: zeigt, welche Faehigkeit man braucht
    ctx.strokeStyle = `rgba(${G.glow},0.55)`; ctx.lineWidth = Math.max(1, k);
    ctx.beginPath(); ctx.arc(x, y, s * (0.62 + 0.04 * Math.sin(time * 3 + g.x)), time * 1.5, time * 1.5 + Math.PI * 1.4); ctx.stroke();
  }
  ctx.drawImage(S.gem[g.el] || S.gem.skill, Math.round(x - 7 * k), Math.round(y - 8 * k), Math.round(14 * k), Math.round(16 * k));
  // Funkeln
  const t = (time * 1.3 + g.x * 0.37) % 1;
  if (t < 0.35) {
    const a = Math.sin(t / 0.35 * Math.PI);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    const sx = x - 6 * k, sy = y - 9 * k, z = 4 * k * a;
    ctx.fillRect(sx - z, sy - k * 0.5, z * 2, k); ctx.fillRect(sx - k * 0.5, sy - z, k, z * 2);
  }
}

export function drawSpring(ctx, sp, camX, camY, s) {
  const S = entitySprites();
  const k = s / TS;
  const sq = sp.squash;
  const w = 22 * k * (1 + sq * 0.25), h = 18 * k * (1 - sq * 0.35);
  const x = (sp.x + 0.5 - camX) * s, y = (sp.y + 1 - camY) * s;
  ctx.drawImage(S.mushroom, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
}

export function drawCrumble(ctx, c, camX, camY, s, time) {
  const S = entitySprites();
  if (c.state === 'gone') return;
  const k = s / TS;
  let ox = 0, oy = 0, a = 1;
  if (c.state === 'shake') ox = Math.sin(time * 70) * 0.05 * s;
  if (c.state === 'fall') { oy = c.fallY * s; a = Math.max(0, 1 - c.t * 1.6); }
  if (c.state === 'respawn') a = Math.min(1, c.t / 0.4);
  ctx.globalAlpha = a;
  ctx.drawImage(S.crumble, Math.round((c.x - camX) * s + ox), Math.round((c.y - camY) * s + oy), Math.ceil(TS * k), Math.round(10 * k));
  ctx.globalAlpha = 1;
}

export function drawMover(ctx, m, camX, camY, s) {
  const img = slab(m.w);
  const k = s / TS;
  ctx.drawImage(img, Math.round((m.x - camX) * s), Math.round((m.y - camY) * s - 1 * k), Math.round(img.width * k), Math.round(img.height * k));
}

const ELEM = ['#9fdcff', '#3fd6d0', '#9bd25a', '#ff8a3d'];

export function drawCheckpoint(ctx, cp, camX, camY, s, time) {
  const k = s / TS;
  const bx = (cp.x - camX) * s, by = (cp.y - camY) * s;
  // Sockel
  ctx.fillStyle = '#5b5347'; ctx.fillRect(bx - 5 * k, by - 4 * k, 10 * k, 4 * k);
  ctx.fillStyle = '#c7bda6'; ctx.fillRect(bx - 4 * k, by - 4 * k, 8 * k, 3 * k);
  // Stab
  ctx.fillStyle = '#4a2918'; ctx.fillRect(bx - 1.5 * k, by - 34 * k, 3 * k, 30 * k);
  ctx.fillStyle = '#a8703c'; ctx.fillRect(bx - 0.5 * k, by - 34 * k, 1 * k, 30 * k);
  // Kristall oben
  const glow = cp.active ? 0.6 + 0.4 * Math.sin(time * 5) : 0;
  ctx.fillStyle = cp.active ? '#ffffff' : '#8a8477';
  ctx.beginPath();
  ctx.moveTo(bx, by - 41 * k); ctx.lineTo(bx + 3 * k, by - 37 * k); ctx.lineTo(bx, by - 33 * k); ctx.lineTo(bx - 3 * k, by - 37 * k); ctx.fill();
  if (cp.active) {
    const r = 10 * k * (1 + glow * 0.3);
    const grd = ctx.createRadialGradient(bx, by - 37 * k, 0, bx, by - 37 * k, r);
    grd.addColorStop(0, 'rgba(255,255,220,0.8)'); grd.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = grd; ctx.fillRect(bx - r, by - 37 * k - r, r * 2, r * 2);
  }
  // Banner: 4 Elementstreifen
  const raise = cp.active ? Math.min(1, cp.t * 2.5) : 0;
  const top = by - (12 + 18 * raise) * k;
  const bw = 14, bh = 10;
  for (let i = 0; i < bw; i++) {
    const wave = Math.sin(time * 6 - i * 0.6) * (cp.active ? 1.2 : 0.3) * (i / bw);
    for (let j = 0; j < bh; j++) {
      const stripe = Math.floor(j / (bh / 4));
      ctx.fillStyle = cp.active ? ELEM[stripe] : (j % 2 ? '#7d756a' : '#948b7d');
      if (i === bw - 1 && j % 3 === 2) continue;
      ctx.fillRect(Math.round(bx + 1.5 * k + i * k), Math.round(top + (j + wave) * k), Math.ceil(k), Math.ceil(k));
    }
  }
}

export function drawGoal(ctx, g, camX, camY, s, time) {
  const k = s / TS;
  const cx = (g.x - camX) * s, by = (g.y - camY) * s;
  const W = 64, H = 80;
  const x0 = cx - W / 2 * k, y0 = by - H * k;
  // Portal
  const pr = 18 * k;
  const pcx = cx, pcy = by - 30 * k;
  for (let i = 5; i >= 0; i--) {
    const r = pr * (0.3 + i * 0.14) * (1 + 0.05 * Math.sin(time * 4 + i));
    ctx.fillStyle = ['#ffffff', '#c9f6ff', '#8fe6ff', '#5cc8ff', '#7a8cff', '#b07cff'][i];
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.ellipse(pcx, pcy, r * 0.75, r, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(1, k);
  for (let i = 0; i < 3; i++) {
    const a0 = time * 2.5 + i * 2.1;
    ctx.beginPath(); ctx.ellipse(pcx, pcy, pr * 0.55, pr * 0.75, 0, a0, a0 + 1.2); ctx.stroke();
  }
  // Steinbogen
  const st = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x0 + x * k), Math.round(y0 + y * k), Math.ceil(w * k), Math.ceil(h * k)); };
  for (const px0 of [4, 46]) {
    st(px0, 26, 14, 54, '#5b5347'); st(px0 + 1, 27, 12, 52, '#c7bda6'); st(px0 + 1, 27, 4, 52, '#ebe4d2'); st(px0 + 10, 27, 3, 52, '#99907c');
    for (let y = 34; y < 80; y += 9) st(px0 + 1, y, 12, 1, '#5b5347');
    st(px0 - 2, 74, 18, 6, '#5b5347'); st(px0 - 1, 75, 16, 4, '#c7bda6');
  }
  // Bogen oben
  ctx.save();
  ctx.translate(cx, y0 + 30 * k);
  for (let r = 18; r <= 30; r++) {
    ctx.strokeStyle = r === 18 || r === 30 ? '#5b5347' : r < 22 ? '#99907c' : r > 27 ? '#ebe4d2' : '#c7bda6';
    ctx.lineWidth = k * 1.05;
    ctx.beginPath(); ctx.arc(0, 0, r * k, Math.PI, 0); ctx.stroke();
  }
  ctx.restore();
  // Schlussstein mit Kristall
  st(28, -2, 8, 10, '#5b5347'); st(29, -1, 6, 8, '#ebe4d2');
  const gl = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(190,140,255,${gl})`; ctx.fillRect(Math.round(x0 + 30 * k), Math.round(y0 + 1 * k), Math.ceil(4 * k), Math.ceil(4 * k));
}

export function drawFireball(ctx, f, camX, camY, s, time) {
  const x = (f.x - camX) * s, y = (f.y - camY) * s;
  const r = s * 0.32;
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
  grd.addColorStop(0, 'rgba(255,240,180,1)'); grd.addColorStop(0.35, 'rgba(255,170,60,0.95)'); grd.addColorStop(0.7, 'rgba(230,70,30,0.5)'); grd.addColorStop(1, 'rgba(230,70,30,0)');
  ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6d0';
  const z = r * 0.45 * (1 + 0.2 * Math.sin(time * 30));
  ctx.fillRect(Math.round(x - z), Math.round(y - z), Math.round(z * 2), Math.round(z * 2));
}

export function drawUpdrafts(ctx, level, camX, camY, s, viewW, viewH, time) {
  if (!level._draftRuns) {
    // zusammenhaengende Aufwind-Spalten einmalig bestimmen
    const runs = [];
    for (let x = 0; x < level.w; x++) {
      let y = 0;
      while (y < level.h) {
        if (!level.isUpdraft(x, y)) { y++; continue; }
        const y0 = y;
        while (y < level.h && level.isUpdraft(x, y)) y++;
        runs.push({ x, y0, y1: y });
      }
    }
    level._draftRuns = runs;
  }
  for (const r of level._draftRuns) {
    if (r.x < camX - 2 || r.x > camX + viewW + 2) continue;
    const x0 = Math.round((r.x - camX) * s), x1 = Math.round((r.x + 1 - camX) * s);
    const yTop = (r.y0 - camY) * s, yBot = (r.y1 - camY) * s;
    const grd = ctx.createLinearGradient(0, yTop - s, 0, yBot);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.15, 'rgba(255,255,255,0.10)');
    grd.addColorStop(1, 'rgba(255,255,255,0.16)');
    ctx.fillStyle = grd;
    ctx.fillRect(x0, Math.round(yTop - s), x1 - x0, Math.round(yBot - yTop + s));
    const len = r.y1 - r.y0 + 1;
    const n = Math.ceil(len / 2.2);
    for (let i = 0; i < n; i++) {
      const ph = ((time * 0.9 + i / n + r.x * 0.173) % 1);
      const ly = r.y1 - ph * len;
      const lx = r.x + 0.25 + ((r.x * 7 + i * 5) % 6) / 11 + Math.sin(time * 3 + ly * 0.8) * 0.12;
      const a = 0.6 * Math.sin(ph * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(Math.round((lx - camX) * s), Math.round((ly - camY) * s), Math.max(1, Math.round(s * 0.06)), Math.round(s * 0.45));
    }
  }
}


// ---------- Leuchten (vorberechnet, schnell) ----------
const GLOWS = new Map();
function glowSprite(col) {
  let c = GLOWS.get(col);
  if (c) return c;
  c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, `rgba(${col},1)`); grd.addColorStop(0.35, `rgba(${col},0.45)`); grd.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  GLOWS.set(col, c);
  return c;
}
export function drawGlow(ctx, x, y, r, col, alpha = 1) {
  const a = ctx.globalAlpha, sm = ctx.imageSmoothingEnabled;
  ctx.globalAlpha = a * alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = a; ctx.imageSmoothingEnabled = sm;
}

// ---------- Seitenwind ----------
export function drawWind(ctx, level, camX, camY, s, viewW, viewH, time) {
  if (!level._windRuns) {
    const runs = [];
    for (let y = 0; y < level.h; y++) {
      let x = 0;
      while (x < level.w) {
        const d = level.windAt(x, y);
        if (!d) { x++; continue; }
        const x0 = x;
        while (x < level.w && level.windAt(x, y) === d) x++;
        runs.push({ y, x0, x1: x, d });
      }
    }
    level._windRuns = runs;
  }
  for (const r of level._windRuns) {
    if (r.x1 < camX - 1 || r.x0 > camX + viewW + 1 || r.y < camY - 1 || r.y > camY + viewH + 1) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(Math.round((r.x0 - camX) * s), Math.round((r.y - camY) * s), Math.round((r.x1 - r.x0) * s), Math.ceil(s));
    const len = r.x1 - r.x0;
    const n = Math.max(1, Math.ceil(len / 3));
    for (let i = 0; i < n; i++) {
      const ph = (time * 0.75 + i / n + r.y * 0.37) % 1;
      const u = r.d > 0 ? ph : 1 - ph;
      const lx = r.x0 + u * len;
      const ly = r.y + 0.2 + ((i * 7 + r.y * 3) % 5) / 7 + Math.sin(time * 4 + i) * 0.06;
      const a = 0.55 * Math.sin(ph * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      const w = s * 0.9;
      ctx.fillRect(Math.round((lx - camX) * s - w / 2), Math.round((ly - camY) * s), Math.round(w), Math.max(1, Math.round(s * 0.06)));
    }
  }
}

// ---------- Wasserfaelle (Deko 'w') ----------
export function drawWaterfalls(ctx, level, camX, camY, s, viewW, viewH, time) {
  if (!level._falls) {
    level._falls = level.decor.filter(d => d.type === 'waterfall').map(d => {
      let y = d.y;
      while (y < level.h && !level.solid(d.x, y + 1)) y++;
      return { x: d.x, y0: d.y, y1: Math.min(level.h + 2, y + 1) };
    });
  }
  const k = s / TS;
  for (const f of level._falls) {
    if (f.x < camX - 2 || f.x > camX + viewW + 2) continue;
    const x0 = Math.round((f.x + 0.1 - camX) * s), w = Math.round(0.8 * s);
    const yTop = Math.round((f.y0 + 0.3 - camY) * s), yBot = Math.round((f.y1 - camY) * s);
    const grd = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    grd.addColorStop(0, 'rgba(120,200,250,0.85)'); grd.addColorStop(0.4, 'rgba(225,248,255,0.95)'); grd.addColorStop(1, 'rgba(90,170,235,0.85)');
    ctx.fillStyle = grd;
    ctx.fillRect(x0, yTop, w, yBot - yTop);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const n = Math.ceil((f.y1 - f.y0) / 1.3);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) {
        const ph = (time * 1.6 + i / n + j * 0.37) % 1;
        const yy = yTop + ph * (yBot - yTop);
        ctx.fillRect(x0 + Math.round((0.15 + j * 0.25) * w), Math.round(yy), Math.max(1, Math.round(k * 1.5)), Math.round(k * 5));
      }
    }
    // Gischt oben
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 4; i++) {
      const a = time * 5 + i * 1.7;
      ctx.beginPath(); ctx.arc(x0 + w * (0.15 + i * 0.23), yTop + Math.sin(a) * k * 1.5, k * (2 + Math.sin(a * 1.3)), 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ---------- Feuerspeier ----------
export function drawSpitter(ctx, sp, camX, camY, s, time) {
  const k = s / TS;
  const x = (sp.x - camX) * s, y = (sp.y - camY) * s;
  const cyc = (((time - sp.phase) % sp.period) + sp.period) % sp.period;
  const charge = Math.max(0, 1 - (sp.period - cyc) / 0.7); // gluehen kurz vor dem Spucken
  const flash = cyc < 0.15 ? 1 - cyc / 0.15 : 0;
  const R = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + (sp.dir > 0 ? px : 16 - px - w) * k), Math.round(y + py * k), Math.ceil(w * k), Math.ceil(h * k)); };
  // Steinkopf
  R(1, 1, 14, 14, '#6e6556'); R(2, 2, 12, 12, '#a99f8a'); R(2, 2, 12, 2, '#cfc6b0'); R(3, 12, 10, 2, '#8a8170');
  // Augen
  const eye = charge > 0 ? `rgba(255,${200 - charge * 120},60,1)` : '#3a332b';
  R(5, 5, 3, 2, '#3a332b'); R(10, 5, 3, 2, '#3a332b');
  R(6, 5, 2, 1, eye); R(11, 5, 2, 1, eye);
  // Maul (zur Spuckrichtung)
  R(10, 9, 6, 4, '#2a1a12');
  R(11, 10, 5, 2, flash > 0 ? '#ffe39a' : charge > 0 ? `rgba(255,${150 - charge * 60},40,${0.4 + charge * 0.6})` : '#4a2918');
  if (charge > 0 || flash > 0) drawGlow(ctx, x + (sp.dir > 0 ? 14 : 2) * k, y + 11 * k, s * (0.5 + 0.6 * Math.max(charge, flash)), '255,150,60', 0.6);
}

export function drawFlame(ctx, f, camX, camY, s, time) {
  const x = (f.x - camX) * s, y = (f.y - camY) * s;
  const r = s * 0.36;
  drawGlow(ctx, x, y, r * 2.4, '255,130,50', 0.8);
  // Schweif
  for (let i = 1; i <= 4; i++) {
    const tx = x - f.sp.dir * r * 0.55 * i, ty = y + Math.sin(time * 20 + i * 1.3) * r * 0.15;
    ctx.fillStyle = i < 2 ? 'rgba(255,200,80,0.8)' : 'rgba(255,110,40,0.55)';
    ctx.beginPath(); ctx.arc(tx, ty, r * (1 - i * 0.18), 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(x + f.sp.dir * r * 0.2, y - r * 0.1, r * 0.5, 0, Math.PI * 2); ctx.fill();
}

// ---------- Riesenrad: Nabe, Speichen, Felge ----------
export function drawHub(ctx, hub, movers, camX, camY, s, time) {
  const k = s / TS;
  const cx = (hub.x - camX) * s, cy = (hub.y - camY) * s;
  ctx.strokeStyle = 'rgba(120,80,40,0.55)'; ctx.lineWidth = Math.max(2, 2.5 * k);
  ctx.beginPath(); ctx.arc(cx, cy, hub.r * s, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,215,120,0.45)'; ctx.lineWidth = Math.max(1, 1 * k);
  ctx.beginPath(); ctx.arc(cx, cy, hub.r * s - 2 * k, 0, Math.PI * 2); ctx.stroke();
  for (const m of movers) {
    if (!m.hub || m.hub[0] !== hub.x || m.hub[1] !== hub.y) continue;
    const px = (m.x + m.w / 2 - camX) * s, py = (m.y + 0.35 - camY) * s;
    ctx.strokeStyle = '#5a3519'; ctx.lineWidth = Math.max(2, 3 * k);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.strokeStyle = '#b07a45'; ctx.lineWidth = Math.max(1, 1.2 * k);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
  }
  // Zahnrad-Nabe
  const r = 0.55 * s;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 0.6);
  ctx.fillStyle = '#6c3e23';
  for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-r * 0.22, -r * 1.25, r * 0.44, r * 0.5); }
  ctx.restore();
  ctx.fillStyle = '#8f5631'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9975a'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2); ctx.fill();
}
