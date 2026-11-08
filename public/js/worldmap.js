// Weltkarte: schwebende Inseln auf einem geschwungenen Pfad, von Morgen (links)
// bis Polarlicht (rechts). Gezeichnet ins Spiel-Canvas; Klick waehlt ein Level.
import { PixBuf, rgb } from './tiles.js';
import { Background, THEMES } from './background.js';
import { mulberry32 } from './util.js';
import { GEM_COLORS, GEM_ORDER } from './config.js';
import { getBiome } from './biomes.js';

function makeMapIsland(seed, w, biomeId) {
  const h = Math.floor(w * 0.9);
  const b = new PixBuf(w, h), rnd = mulberry32(seed);
  const B = getBiome(biomeId), P = B.pal || {};
  const gp = (k, d) => rgb(P[k] || d);
  const grass = [gp('grassHi', '#d4f75a'), gp('grassL', '#97e033'), gp('grassM', '#5cb82b'), gp('grassD', '#2f8a26'), gp('grassO', '#1b5a1e')];
  const rock = [gp('rockL', '#d9975a'), gp('rockM', '#b8743f'), gp('rockD', '#8f5631'), gp('rockDD', '#6c3e23'), gp('mortar', '#4a2918')];
  const lv = (B.tree.leaves || B.tree.caps[0]).map(c => rgb(c));
  const topY = Math.floor(h * 0.3);
  const depthAt = [];
  for (let x = 0; x < w; x++) {
    const t = Math.abs(x - w / 2 + 0.5) / (w / 2);
    depthAt.push(Math.floor((1 - Math.pow(t, 1.7)) * (h - topY - 1) * (0.78 + rnd() * 0.22)));
  }
  for (let x = 0; x < w; x++) {
    const d = depthAt[x];
    for (let y = topY; y < topY + d; y++) {
      const v = (y - topY) / Math.max(1, d);
      let c = x < w * 0.35 ? rock[0] : x < w * 0.7 ? rock[1] : rock[2];
      if (v > 0.75) c = rock[3];
      if ((x * 7 + y * 13) % 17 === 0) c = rock[2];
      if (y === topY + d - 1) c = rock[4];
      b.set(x, y, c);
    }
  }
  for (let x = 1; x < w - 1; x++) {
    const d = 3 + Math.floor(rnd() * 2);
    for (let y = topY - 1; y < topY + d; y++) b.set(x, y, y < topY ? grass[0] : y < topY + 1 ? grass[1] : y < topY + d - 1 ? grass[2] : grass[3]);
    if (rnd() < 0.35) b.set(x, topY - 2, grass[1]);
  }
  // Baeumchen und Ranken
  const nt = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < nt; i++) {
    const cx = Math.floor(w * (0.2 + rnd() * 0.6)), r = 3 + Math.floor(rnd() * 3);
    if (Math.abs(cx - w / 2) < 6) continue; // Mitte frei fuer Figuren
    for (let y = 0; y < 4; y++) b.set(cx, topY - 1 - y, rgb('#5a3519'));
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) b.set(cx + x, topY - 4 - r + y, (x + y) < -1 ? lv[0] : (x + y) < 2 ? lv[1] : lv[2]);
  }
  for (let k = 0; k < 3; k++) {
    const vx = Math.floor(w * (0.25 + rnd() * 0.5)), len = 3 + Math.floor(rnd() * 6);
    for (let y = 0; y < len; y++) b.set(vx, topY + depthAt[vx] - 2 + y, y % 3 ? rgb('#3f9a3c') : rgb('#7fcf4a'));
  }
  return { canvas: b.toCanvas(), w, h, topY };
}

export class WorldMap {
  constructor(world) {
    this.world = world;
    this.bg = new Background('day');
    this.islands = world.maps.map((m, i) => makeMapIsland(31 + i * 7, 40 + (i % 3) * 4, m.biome));
    this.nodes = [];
    this.stars = [];
    const rnd = mulberry32(5);
    for (let i = 0; i < 90; i++) this.stars.push([0.55 + rnd() * 0.45, rnd() * 0.65, rnd() * 6]);
  }

  layout(W, H, area) {
    const n = this.world.maps.length;
    const padX = Math.min(area.w * 0.08, 60 * area.k);
    const x0 = area.x + padX, x1 = area.x + area.w - padX;
    const cy = area.y + area.h * 0.5, A = area.h * 0.24;
    this.unit = Math.min((x1 - x0) / Math.max(1, n - 1) * 0.9, area.h * 0.28, 120 * area.k);
    this.nodes = this.world.maps.map((m, i) => {
      const u = n > 1 ? i / (n - 1) : 0.5;
      return { i, x: x0 + (x1 - x0) * u, y: cy + A * Math.sin(u * Math.PI * 2.6 + 0.5) };
    });
    this.area = area;
  }

  hit(px, py) {
    let best = -1, bd = Infinity;
    for (const nd of this.nodes) {
      const d = Math.hypot(px - nd.x, (py - nd.y) * 1.2);
      if (d < this.unit * 0.65 && d < bd) { bd = d; best = nd.i; }
    }
    return best;
  }

  // info: { sel, unlocked, prog(i) -> {done, gems[]}, gemInfo(i) -> [{id, el}], party: [charId], drawChar(ctx, charId, x, y, h, t) }
  draw(ctx, W, H, time, info) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Himmel: links Morgen, rechts Nacht
    const v = ctx.createLinearGradient(0, 0, 0, H);
    v.addColorStop(0, '#0a7ff5'); v.addColorStop(0.6, '#5cbcff'); v.addColorStop(1, '#bfe6ff');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const hz = ctx.createLinearGradient(0, 0, W, 0);
    hz.addColorStop(0, 'rgba(255,230,200,0.25)'); hz.addColorStop(0.45, 'rgba(255,200,140,0)');
    hz.addColorStop(0.62, 'rgba(255,140,110,0.35)'); hz.addColorStop(0.78, 'rgba(60,40,110,0.75)'); hz.addColorStop(1, 'rgba(6,10,34,0.95)');
    ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
    for (const [sx, sy, ph] of this.stars) {
      const a = Math.max(0, (sx - 0.62) * 3) * (0.5 + 0.5 * Math.sin(time * 1.5 + ph * 3));
      ctx.fillStyle = `rgba(255,255,235,${a})`;
      const z = Math.max(1.5, H / 300);
      ctx.fillRect(sx * W, sy * H, z, z);
    }
    // Wolken
    const k = Math.max(1, H / 260);
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < 7; i++) {
      const cl = this.bg.clouds[i % this.bg.clouds.length];
      const w = cl.width * k * 1.2, x = ((i * 0.19 * W + time * 6 * k * (1 + (i % 3) * 0.4)) % (W + w * 2)) - w;
      ctx.globalAlpha = 0.55 + (i % 3) * 0.12;
      ctx.drawImage(cl, Math.round(x), Math.round(H * (0.08 + (i * 0.37 % 1) * 0.55)), Math.round(w), Math.round(cl.height * k * 1.2));
    }
    ctx.globalAlpha = 1;
    this.bg._band(ctx, this.bg.seaBack, time * 8 * k, H - 44 * k, k * 1.2, W, H);

    const U = this.unit;
    // Pfad
    ctx.lineCap = 'round';
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i], b = this.nodes[i + 1];
      const open = i + 1 < info.unlocked;
      ctx.strokeStyle = open ? 'rgba(255,224,120,0.95)' : 'rgba(255,255,255,0.45)';
      ctx.lineWidth = Math.max(2, U * 0.07);
      ctx.setLineDash([U * 0.08, U * 0.12]);
      ctx.lineDashOffset = -time * U * 0.25;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y + U * 0.15);
      const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - U * 0.25;
      ctx.quadraticCurveTo(mx, my, b.x, b.y + U * 0.15);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Inseln
    for (const nd of this.nodes) {
      const i = nd.i, isl = this.islands[i];
      const locked = i >= info.unlocked, sel = i === info.sel;
      const bob = Math.sin(time * 1.4 + i * 0.9) * U * 0.04;
      const sc = U / isl.w * (sel ? 1.12 : 1);
      const iw = isl.w * sc, ih = isl.h * sc;
      const ix = nd.x - iw / 2, iy = nd.y - isl.topY * sc + bob;
      nd.top = iy + isl.topY * sc;
      if (sel) {
        const r = U * (0.75 + 0.05 * Math.sin(time * 4));
        const g = ctx.createRadialGradient(nd.x, nd.top, 0, nd.x, nd.top, r);
        g.addColorStop(0, 'rgba(255,240,150,0.7)'); g.addColorStop(1, 'rgba(255,240,150,0)');
        ctx.fillStyle = g; ctx.fillRect(nd.x - r, nd.top - r, r * 2, r * 2);
      }
      ctx.globalAlpha = locked ? 0.45 : 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(isl.canvas, Math.round(ix), Math.round(iy), Math.round(iw), Math.round(ih));
      ctx.globalAlpha = 1;
      const p = info.prog(i), gi = info.gemInfo(i);
      // Fahne bei geschafften Levels
      if (p.done) {
        const fx = nd.x + iw * 0.3, fy = nd.top;
        ctx.fillStyle = '#4a2918'; ctx.fillRect(fx, fy - U * 0.42, Math.max(2, U * 0.03), U * 0.42);
        ctx.fillStyle = '#ffd43b';
        ctx.beginPath(); ctx.moveTo(fx + U * 0.03, fy - U * 0.42); ctx.lineTo(fx + U * 0.22, fy - U * 0.35 + Math.sin(time * 5 + i) * U * 0.02); ctx.lineTo(fx + U * 0.03, fy - U * 0.27); ctx.fill();
      }
      // Nummer
      const br = U * 0.17, by = nd.top - U * 0.62 + bob * 0.5;
      ctx.fillStyle = locked ? 'rgba(40,50,80,0.75)' : sel ? '#ffb020' : '#1b2440';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, U * 0.035);
      ctx.beginPath(); ctx.arc(nd.x, by, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = sel ? '#3a2100' : '#fff';
      ctx.font = `900 ${Math.round(br * 1.15)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(locked ? '🔒' : String(i + 1), nd.x, by + br * 0.06);
      ctx.textBaseline = 'alphabetic';
      // Kristall-Punkte
      if (!locked) {
        const sorted = [...gi].sort((a, b) => GEM_ORDER.indexOf(a.el) - GEM_ORDER.indexOf(b.el));
        const pw = U * 0.13, gap = U * 0.04, tw = sorted.length * pw + (sorted.length - 1) * gap;
        let gx = nd.x - tw / 2;
        const gy = nd.y + ih * 0.62 - isl.topY * sc + bob;
        for (const g of sorted) {
          const have = p.gems.includes(g.id);
          const G = GEM_COLORS[g.el];
          ctx.fillStyle = have ? G.mid : 'rgba(255,255,255,0.28)';
          ctx.strokeStyle = have ? '#fff' : G.mid; ctx.lineWidth = Math.max(1.5, U * 0.02);
          ctx.beginPath();
          ctx.moveTo(gx + pw / 2, gy - pw * 0.6); ctx.lineTo(gx + pw, gy - pw * 0.1); ctx.lineTo(gx + pw / 2, gy + pw * 0.6); ctx.lineTo(gx, gy - pw * 0.1); ctx.closePath();
          ctx.fill(); ctx.stroke();
          gx += pw + gap;
        }
      }
    }
    // Figuren auf dem ausgewaehlten Level
    const nd = this.nodes[info.sel];
    if (nd && info.party.length) {
      const n = info.party.length, h = U * 0.55;
      info.party.forEach((c, j) => {
        const x = nd.x + (j - (n - 1) / 2) * U * 0.24;
        info.drawChar(ctx, c, x, nd.top + U * 0.02, h, time + j * 0.3);
      });
    }
  }
}

export { THEMES };
