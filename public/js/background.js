// Parallax-Hintergrund: Himmelsverlauf, ferne Schwebeinseln mit Ruinen und
// Wasserfaellen, Wolkenschichten und ein Wolkenmeer am unteren Rand.
import { PixBuf, rgb, TS } from './tiles.js';
import { mulberry32, makeCanvas } from './util.js';

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

function makeIsland(seed, w) {
  const h = Math.floor(w * 0.85);
  const b = new PixBuf(w, h), rnd = mulberry32(seed);
  const grass = [rgb('#b6e6a0'), rgb('#8fcf8f'), rgb('#6eb486'), rgb('#4f8f78')];
  const rock = [rgb('#a9bfdc'), rgb('#8ea6cc'), rgb('#7890bd'), rgb('#5f78a8')];
  const topY = Math.floor(h * 0.42);
  // Felskoerper: umgedrehter Kegel mit Zacken
  for (let x = 0; x < w; x++) {
    const t = Math.abs(x - w / 2) / (w / 2);
    const depth = Math.floor((1 - Math.pow(t, 1.6)) * (h - topY) * (0.75 + rnd() * 0.25));
    for (let y = topY; y < topY + depth; y++) {
      const v = (y - topY) / Math.max(1, depth);
      let c = x < w * 0.4 ? rock[0] : x < w * 0.7 ? rock[1] : rock[2];
      if (v > 0.8) c = rock[3];
      if ((x * 13 + y * 7) % 23 === 0) c = rock[2];
      b.set(x, y, c);
    }
  }
  // Grasdecke
  for (let x = 1; x < w - 1; x++) {
    const d = 3 + Math.floor(rnd() * 3);
    for (let y = topY - 2; y < topY + d; y++) b.set(x, y, y < topY ? grass[0] : y < topY + 2 ? grass[1] : grass[2]);
  }
  // Baeume
  const nt = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < nt; i++) {
    const cx = Math.floor(w * (0.15 + rnd() * 0.3) + i * w * 0.25), r = 4 + Math.floor(rnd() * 4);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      b.set(cx + x, topY - r - 3 + y, (x + y) < -2 ? grass[0] : (x + y) < 3 ? grass[2] : grass[3]);
    }
    for (let y = 0; y < 4; y++) b.set(cx, topY - 3 + y, rock[3]);
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

function makeSeaBand(seed, w, h, tint) {
  const b = new PixBuf(w, h), rnd = mulberry32(seed);
  const cols = tint
    ? [rgb('#f2f8ff'), rgb('#d9eafc'), rgb('#bad6f4'), rgb('#a0c4ec')]
    : [rgb('#ffffff'), rgb('#eef7ff'), rgb('#d2e8fc'), rgb('#b4d7f7')];
  // Kreise entlang der Oberkante, nahtlos
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
  return b.toCanvas();
}

export class Background {
  constructor() {
    this.clouds = [];
    for (let i = 0; i < 6; i++) this.clouds.push(makeCloud(10 + i, 48 + i * 10, 22 + (i % 3) * 6, i % 2));
    this.islands = [makeIsland(3, 110), makeIsland(8, 80), makeIsland(15, 140), makeIsland(21, 64)];
    this.seaBack = makeSeaBand(5, 256, 64, true);
    this.seaFront = makeSeaBand(9, 256, 48, false);
    this.sky = null;
    this.skyH = 0;
  }

  _skyGradient(ctx, h) {
    if (this.sky && this.skyH === h) return this.sky;
    const c = makeCanvas(1, h);
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0a7ff5');
    grd.addColorStop(0.45, '#2fa4fb');
    grd.addColorStop(0.8, '#71c6ff');
    grd.addColorStop(1, '#b2e1ff');
    g.fillStyle = grd; g.fillRect(0, 0, 1, h);
    this.sky = c; this.skyH = h;
    return c;
  }

  drawBack(ctx, camX, camY, s, W, H, level, time) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._skyGradient(ctx, H), 0, 0, W, H);
    const k = s / TS; // Art-Pixel -> Bildschirm
    const lvH = level.h;
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
        // Wasserfall
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
    // darunter auffuellen
    const bottom = Math.round(y + hh);
    if (bottom < H) {
      ctx.fillStyle = '#b4d7f7';
      ctx.fillRect(0, bottom - 1, W, H - bottom + 1);
    }
  }
}
