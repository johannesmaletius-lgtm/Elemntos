// Einfaches Partikelsystem (Staub, Funken, Tropfen, Glut, Blaetter, Wind, Truemmer)
export class Particles {
  constructor() { this.list = []; }

  add(p) {
    if (this.list.length > 700) this.list.shift();
    this.list.push(Object.assign({ vx: 0, vy: 0, grav: 0, drag: 0, life: 0.5, size: 0.12, color: '#fff', type: 'rect', rot: 0, vr: 0, t: 0, fade: true, grow: 0, glow: false }, p));
  }

  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = (opts.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 2);
      const sp = (opts.speed ?? 3) * (0.4 + Math.random() * 0.8);
      this.add({
        x: x + (Math.random() - 0.5) * (opts.jitter ?? 0.2), y: y + (Math.random() - 0.5) * (opts.jitterY ?? opts.jitter ?? 0.2),
        vx: Math.cos(a) * sp + (opts.vx ?? 0), vy: Math.sin(a) * sp + (opts.vy ?? 0),
        grav: opts.grav ?? 0, drag: opts.drag ?? 2, life: (opts.life ?? 0.5) * (0.6 + Math.random() * 0.8),
        size: (opts.size ?? 0.12) * (0.6 + Math.random() * 0.8), color: Array.isArray(opts.color) ? opts.color[Math.floor(Math.random() * opts.color.length)] : opts.color,
        type: opts.type ?? 'rect', vr: (Math.random() - 0.5) * (opts.spin ?? 0), grow: opts.grow ?? 0, glow: !!opts.glow,
      });
    }
  }

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt;
      if (p.t >= p.life) { L.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size += p.grow * dt;
    }
  }

  // glow=false: normale Partikel; glow=true: leuchtende (nach dem Licht-Tint, additiv)
  draw(ctx, camX, camY, s, glow = false) {
    const op = ctx.globalCompositeOperation;
    if (glow) ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      if (p.glow !== glow) continue;
      const a = p.fade ? 1 - p.t / p.life : 1;
      const x = (p.x - camX) * s, y = (p.y - camY) * s;
      const z = Math.max(1, p.size * s);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = p.color;
      if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, s * 0.08 * a);
        ctx.beginPath(); ctx.arc(x, y, z, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'star') {
        const r = z * (0.6 + 0.4 * Math.sin(p.t * 20));
        ctx.fillRect(x - r, y - r * 0.25, r * 2, r * 0.5);
        ctx.fillRect(x - r * 0.25, y - r, r * 0.5, r * 2);
      } else if (p.type === 'circle') {
        ctx.beginPath(); ctx.arc(x, y, z / 2, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'drop') {
        // Tropfen: in Flugrichtung gestreckt
        const ang = Math.atan2(p.vy, p.vx), L = Math.min(3, 1 + Math.hypot(p.vx, p.vy) * 0.12);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, z * 0.5 * L, z * 0.42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (p.type === 'leaf') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, z * 0.6, z * 0.3 * (0.4 + 0.6 * Math.abs(Math.cos(p.t * 7))), 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (p.type === 'wisp') {
        // Luft-Wirbel: kleiner Bogen
        ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, z * 0.25);
        ctx.beginPath(); ctx.arc(x, y, z, p.rot, p.rot + Math.PI * 1.1); ctx.stroke();
      } else if (p.rot) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillRect(-z / 2, -z / 2, z, z); ctx.restore();
      } else {
        ctx.fillRect(Math.round(x - z / 2), Math.round(y - z / 2), Math.round(z), Math.round(z));
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = op;
  }
}
