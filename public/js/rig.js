// Charakter-Rig: zeichnet eine Figur aus Einzelteilen (Rumpf, Beine, Arme, Schal)
// mit einer Pose. Winkel in Radiant, positiv = Glied schwingt nach hinten
// (bei Blickrichtung rechts, also im Uhrzeigersinn).

const cache = new Map();

export async function loadRig(id) {
  if (cache.has(id)) return cache.get(id);
  const p = (async () => {
    const emb = window.__EW_ASSETS && window.__EW_ASSETS[id];
    const [meta, img] = await Promise.all([
      emb ? emb.meta : fetch(`assets/chars/${id}.json`).then(r => r.json()),
      new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = emb ? emb.png : `assets/chars/${id}.png`;
      }),
    ]);
    return new Rig(id, meta, img);
  })();
  cache.set(id, p);
  return p;
}

// plant: 0..1 – wie stark die Figur auf den Boden gesetzt wird. Bei 1 sitzt die
//   tiefste Sohle genau auf dem Fusspunkt, egal wie die Beine gerade stehen
//   (gespreizte Beine -> Huefte tiefer, gestrecktes Standbein -> hoeher).
// turn: -1..1 – Wende-Drehung (Faktor auf die Blickrichtung, 1 = normal).
export function neutralPose() {
  return {
    sx: 1, sy: 1, tilt: 0, bodyY: 0, lean: 0, spin: 0,
    thighF: 0, shinF: 0, thighB: 0, shinB: 0, armF: 0, armB: 0,
    conv: 0, tailAmp: 3, tailSpeed: 3, tailLift: 0, alpha: 1,
    plant: 0, turn: 1,
  };
}

const POSE_KEYS = Object.keys(neutralPose());

export function blendPose(cur, target, k) {
  for (const key of POSE_KEYS) cur[key] += (target[key] - cur[key]) * k;
  return cur;
}

export class Rig {
  constructor(id, meta, img) {
    this.id = id;
    this.meta = meta;
    this.img = img;
    this.parts = meta.parts;
    this.height = meta.height;
    this.natural = meta.facing || 1;   // Blickrichtung des Originalbilds
    const tf = this.parts.thighF.joint, tb = this.parts.thighB.joint;
    this.hip = [(tf[0] + tb[0]) / 2, (tf[1] + tb[1]) / 2];
    const tail = this.parts.tail;
    if (tail) {
      const [, , w] = tail.rect;
      this.tailDir = (tail.off[0] + w / 2) < 0 ? -1 : 1;
    }
    // Sohlen (Ferse + Spitze) der Unterschenkel, fuer den Bodenkontakt
    this.soles = { shinF: this._findSole('shinF'), shinB: this._findSole('shinB') };
    this.baseSole = this.soleY(0, 0, 0, 0);
  }

  // Unterste deckende Pixelreihe des Teils -> linker und rechter Sohlenpunkt
  // (in Teil-Koordinaten relativ zum Gelenk). Rueckfall: untere Rechteck-Ecken.
  _findSole(name) {
    const p = this.parts[name];
    if (!p) return null;
    const [sx, sy, w, h] = p.rect;
    const fallback = [[p.off[0] + w * 0.2, p.off[1] + h], [p.off[0] + w * 0.8, p.off[1] + h]];
    try {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(this.img, sx, sy, w, h, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data;
      for (let y = h - 1; y >= h * 0.5; y--) {
        let x0 = -1, x1 = -1;
        for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 140) { if (x0 < 0) x0 = x; x1 = x; }
        if (x0 >= 0 && x1 - x0 >= 3) return [[p.off[0] + x0, p.off[1] + y + 1], [p.off[0] + x1 + 1, p.off[1] + y + 1]];
      }
    } catch (e) { /* Bild nicht lesbar (z.B. file://) */ }
    return fallback;
  }

  // Tiefster Sohlenpunkt (groesstes y, Figurenkoordinaten) fuer die Beinwinkel.
  // (Das Zusammenruecken der Beine 'conv' verschiebt nur waagerecht.)
  soleY(thighF, shinF, thighB, shinB) {
    return Math.max(this._legSole('thighF', 'shinF', thighF, shinF),
      this._legSole('thighB', 'shinB', thighB, shinB));
  }

  _legSole(thigh, shin, aT, aS) {
    const t = this.parts[thigh], s = this.parts[shin], pts = this.soles[shin];
    if (!t || !s || !pts) return -Infinity;
    const kx = s.joint[0] - t.joint[0], ky = s.joint[1] - t.joint[1];
    const sT = Math.sin(aT), cT = Math.cos(aT), a2 = aT + aS, s2 = Math.sin(a2), c2 = Math.cos(a2);
    const kneeY = t.joint[1] + kx * sT + ky * cT;
    let best = -Infinity;
    for (const [px, py] of pts) best = Math.max(best, kneeY + px * s2 + py * c2);
    return best;
  }

  _part(ctx, name) {
    const p = this.parts[name];
    if (!p) return;
    const [sx, sy, w, h] = p.rect;
    ctx.drawImage(this.img, sx, sy, w, h, p.off[0], p.off[1], w, h);
  }

  _leg(ctx, thigh, shin, aThigh, aShin, conv) {
    const t = this.parts[thigh], s = this.parts[shin];
    if (!t) return;
    const jx = t.joint[0] + (this.hip[0] - t.joint[0]) * conv;
    ctx.save();
    ctx.translate(jx, t.joint[1]);
    ctx.rotate(aThigh);
    // Unterschenkel zuerst (liegt unter dem Oberschenkel)
    if (s) {
      ctx.save();
      ctx.translate(s.joint[0] - t.joint[0], s.joint[1] - t.joint[1]);
      ctx.rotate(aShin);
      this._part(ctx, shin);
      ctx.restore();
    }
    this._part(ctx, thigh);
    ctx.restore();
  }

  _arm(ctx, name, a) {
    const p = this.parts[name];
    if (!p) return;
    ctx.save();
    ctx.translate(p.joint[0], p.joint[1]);
    ctx.rotate(a);
    this._part(ctx, name);
    ctx.restore();
  }

  _tail(ctx, pose, time) {
    const p = this.parts.tail;
    if (!p) return;
    const [sx, sy, w, h] = p.rect;
    const dir = this.tailDir;
    ctx.save();
    ctx.translate(p.joint[0], p.joint[1]);
    ctx.rotate(-dir * pose.tailLift);
    const maxd = Math.max(Math.abs(p.off[0]), Math.abs(p.off[0] + w));
    const step = 3;
    for (let i = 0; i < w; i += step) {
      const lx = p.off[0] + i;
      const d = Math.abs(lx + step / 2) / maxd;
      const yo = pose.tailAmp * Math.pow(d, 1.25) * Math.sin(time * pose.tailSpeed - d * 4.2);
      ctx.drawImage(this.img, sx + i, sy, Math.min(step, w - i) + 0.6, h, lx, p.off[1] + yo, Math.min(step, w - i) + 0.6, h);
    }
    ctx.restore();
  }

  // x,y = Fusspunkt in Bildschirm-Pixeln, heightPx = gewuenschte Figurenhoehe
  draw(ctx, pose, x, y, heightPx, facing, time) {
    const k = heightPx / this.height;
    ctx.save();
    ctx.globalAlpha *= pose.alpha;
    ctx.translate(x, y);
    // Wende: Figur wird kurz schmal und klappt in die neue Richtung
    const tn = pose.turn === undefined ? 1 : pose.turn;
    const tw = (tn < 0 ? -1 : 1) * Math.max(0.32, Math.abs(tn));
    ctx.scale(facing * this.natural * k * tw, k);
    if (pose.spin) {
      const cy = -this.height * 0.45;
      ctx.translate(0, cy);
      ctx.rotate(pose.spin);
      ctx.translate(0, -cy);
    }
    ctx.rotate(pose.tilt);
    ctx.scale(pose.sx, pose.sy);
    // Bodenkontakt: tiefste Sohle auf den Fusspunkt setzen
    const plant = pose.plant && Number.isFinite(this.baseSole) ? pose.plant * (this.baseSole - this.soleY(pose.thighF, pose.shinF, pose.thighB, pose.shinB)) : 0;
    ctx.translate(0, pose.bodyY + plant);

    const upper = (fn) => {
      ctx.save();
      ctx.translate(this.hip[0], this.hip[1]);
      ctx.rotate(pose.lean);
      ctx.translate(-this.hip[0], -this.hip[1]);
      fn();
      ctx.restore();
    };

    upper(() => { this._tail(ctx, pose, time); this._arm(ctx, 'armB', pose.armB); });
    this._leg(ctx, 'thighB', 'shinB', pose.thighB, pose.shinB, pose.conv);
    this._leg(ctx, 'thighF', 'shinF', pose.thighF, pose.shinF, pose.conv);
    upper(() => { this._part(ctx, 'body'); this._arm(ctx, 'armF', pose.armF); });
    ctx.restore();
  }
}

// ---------- Figur mit Umriss ----------
// Zeichnet die Figur zuerst in eine Hilfs-Leinwand, legt daraus eine dunkle
// Silhouette an und setzt sie in 8 Richtungen versetzt darunter. So hebt sich
// jede Figur von jedem Hintergrund ab (hell, dunkel, bunt).
let SA = null, SB = null;
function scratch(c, w, h) {
  if (!c) { c = document.createElement('canvas'); }
  if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); }
  return c;
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]];

export function drawRigOutlined(ctx, rig, pose, x, y, heightPx, facing, time, outline = '#1a1420', ow = null, rim = null) {
  if (!rig) return;
  if (ow === null) ow = Math.max(1, heightPx * 0.016);
  const W = Math.ceil(heightPx * 1.7), H = Math.ceil(heightPx * 1.8);
  const fx = W / 2, fy = Math.ceil(heightPx * 1.2);
  SA = scratch(SA, W, H); SB = scratch(SB, W, H);
  const a = SA.getContext('2d'), b = SB.getContext('2d');
  a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W, H);
  a.imageSmoothingEnabled = true; a.imageSmoothingQuality = 'high';
  a.globalAlpha = 1;
  rig.draw(a, pose, fx, fy, heightPx, facing, time);
  // Silhouette
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W, H);
  b.globalCompositeOperation = 'source-over';
  b.drawImage(SA, 0, 0, W, H, 0, 0, W, H);
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = outline; b.fillRect(0, 0, W, H);
  b.globalCompositeOperation = 'source-over';
  const ox = Math.round(x - fx), oy = Math.round(y - fy);
  const sm = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  for (const [dx, dy] of DIRS) ctx.drawImage(SB, 0, 0, W, H, ox + dx * ow, oy + dy * ow, W, H);
  ctx.drawImage(SA, 0, 0, W, H, ox, oy, W, H);
  // Randlicht in Elementfarbe (oben/hinten), nur angedeutet
  if (rim) {
    b.clearRect(0, 0, W, H);
    b.drawImage(SA, 0, 0, W, H, 0, 0, W, H);
    b.globalCompositeOperation = 'source-in';
    b.fillStyle = rim; b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = 'destination-out';
    b.drawImage(SA, 0, 0, W, H, -ow * 0.9 * facing, ow * 1.1, W, H);
    b.globalCompositeOperation = 'source-over';
    ctx.globalAlpha *= 0.85;
    ctx.drawImage(SB, 0, 0, W, H, ox, oy, W, H);
    ctx.globalAlpha /= 0.85;
  }
  ctx.imageSmoothingEnabled = sm;
}
