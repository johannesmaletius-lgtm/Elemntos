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

export function neutralPose() {
  return {
    sx: 1, sy: 1, tilt: 0, bodyY: 0, lean: 0, spin: 0,
    thighF: 0, shinF: 0, thighB: 0, shinB: 0, armF: 0, armB: 0,
    conv: 0, tailAmp: 3, tailSpeed: 3, tailLift: 0, alpha: 1,
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
    ctx.scale(facing * this.natural * k, k);
    if (pose.spin) {
      const cy = -this.height * 0.45;
      ctx.translate(0, cy);
      ctx.rotate(pose.spin);
      ctx.translate(0, -cy);
    }
    ctx.rotate(pose.tilt);
    ctx.scale(pose.sx, pose.sy);
    ctx.translate(0, pose.bodyY);

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
