// Gegner: Mumien. Sie laufen auf ihrer Plattform hin und her (drehen an Waenden,
// Kanten und Dornen um). Die Bewegung haengt nur von der gemeinsamen Spielzeit ab,
// darum sehen alle Mitspieler die Mumien an derselben Stelle.
import { T } from './level.js';
import { neutralPose, drawRigOutlined } from './rig.js';

export const ENEMY_TYPES = {
  // klein, gedrungen: wie ein Gumba – einmal draufspringen
  mummy: { rig: 'mummy', w: 0.95, h: 1.05, spriteH: 1.42, speed: 1.45, hp: 1, angrySpeed: 1.45, score: 1 },
  // gross, schlaksig: zweimal draufspringen, nach dem ersten Treffer wird sie schnell
  mummyTall: { rig: 'mummy_tall', w: 0.8, h: 2.15, spriteH: 2.75, speed: 1.05, hp: 2, angrySpeed: 2.7, score: 2 },
  // Geister-Mumie: schwebt hin und her (auch ueber Abgruende) – einmal draufspringen
  ghost: { rig: 'mummy', w: 0.95, h: 1.0, spriteH: 1.42, speed: 1.7, hp: 1, angrySpeed: 1.7, score: 1, fly: true },
};

// Laufstrecke einer Mumie aus dem Level bestimmen
function patrolRange(level, sx, sy, type) {
  const def = ENEMY_TYPES[type];
  const tall = Math.ceil(def.h);
  const springAt = new Set(level.springs.map(s => `${s.x},${s.y}`));
  // Saeulen und Felsen sind fuer Mumien Hindernisse
  for (const d of level.decor) if (d.type === 'pillar' || d.type === 'rock') springAt.add(`${d.x},${d.y}`);
  const walkable = (x) => {
    if (x < 0 || x >= level.w) return false;
    if (!(level.solid(x, sy + 1) || level.oneway(x, sy + 1))) return false;
    for (let k = 0; k < tall; k++) if (level.solid(x, sy - k)) return false;
    const here = level.get(x, sy);
    if (here === T.THORN_UP || here === T.THORN_DOWN) return false;
    if (springAt.has(`${x},${sy}`)) return false;
    return true;
  };
  let x0 = sx, x1 = sx;
  while (walkable(x0 - 1)) x0--;
  while (walkable(x1 + 1)) x1++;
  return { min: x0 + def.w / 2 + 0.02, max: x1 + 1 - def.w / 2 - 0.02 };
}

// Hin-und-her-Bewegung: Startpunkt x0 mit Richtung dir, nach Strecke dist
function pingpong(min, max, x0, dir, dist) {
  const L = max - min;
  if (L <= 0.001) return { x: min, dir };
  let u = dir > 0 ? (x0 - min) : (2 * L - (x0 - min));
  u = ((u + dist) % (2 * L) + 2 * L) % (2 * L);
  return u < L ? { x: min + u, dir: 1 } : { x: min + 2 * L - u, dir: -1 };
}

export function createEnemies(level) {
  return level.enemySpawns.map((s, id) => {
    const def = ENEMY_TYPES[s.type];
    const r = def.fly ? { min: s.range[0] + def.w / 2, max: s.range[1] + 1 - def.w / 2 } : patrolRange(level, s.x, s.y, s.type);
    const x = Math.min(r.max, Math.max(r.min, s.x + 0.5));
    return {
      id, type: s.type, def, min: r.min, max: r.max,
      x, y: s.y + 1, baseY: s.y + 1, dir: -1, hp: def.hp, alive: true, angry: false,
      motion: { t0: 0, x0: x, dir: -1, v: def.speed },
      deadT: 0, deadHow: null, vy: 0, dy: 0, spin: 0, hitT: 0, pose: neutralPose(),
      get left() { return this.x - this.def.w / 2; },
      get right() { return this.x + this.def.w / 2; },
      get top() { return this.y - this.def.h; },
    };
  });
}

export function enemyPosAt(e, t) {
  const m = e.motion;
  return pingpong(e.min, e.max, m.x0, m.dir, Math.max(0, t - m.t0) * m.v);
}

export function updateEnemies(enemies, clock, dt) {
  for (const e of enemies) {
    e.hitT = Math.max(0, e.hitT - dt);
    if (e.alive) {
      const p = enemyPosAt(e, clock);
      e.x = p.x; e.dir = p.dir;
      if (e.def.fly) e.y = e.baseY + Math.sin(clock * 2.1 + e.id * 1.7) * 0.45;
    } else {
      e.deadT += dt;
      if (e.deadHow !== 'stomp') {
        // weggeschleudert
        e.vy += 30 * dt; e.dy += e.vy * dt; e.spin += dt * 9 * -e.dir;
      }
    }
  }
}

// Treffer (geteiltes Ereignis) anwenden
export function hitEnemy(e, how, at) {
  if (!e.alive) return false;
  if (how === 'stomp' && e.hp > 1) {
    const p = enemyPosAt(e, at);
    e.hp--; e.angry = true; e.hitT = 0.35;
    e.motion = { t0: at, x0: p.x, dir: p.dir, v: e.def.angrySpeed };
    return false; // lebt noch
  }
  e.alive = false; e.deadHow = how; e.deadT = 0; e.vy = how === 'stomp' ? 0 : -11; e.dy = 0;
  return true;
}

// ---------- Animation ----------
const lerp = (a, b, t) => a + (b - a) * t;

export function enemyPose(e, time, dt) {
  const T = neutralPose();
  const tall = e.type === 'mummyTall';
  if (e.def.fly) return ghostPose(e, time, dt);
  const speed = e.angry ? e.def.angrySpeed : e.def.speed;
  // Schrittphase aus der Position -> Fuesse rutschen nicht
  const ph = e.x * (tall ? 2.3 : 3.6) * Math.PI / 2 + e.id;
  const s = Math.sin(ph), c = Math.cos(ph);
  if (tall) {
    T.thighF = -0.42 * s; T.thighB = 0.42 * s;
    T.shinF = 0.1 + 0.75 * Math.max(0, c) ** 1.4;
    T.shinB = 0.1 + 0.75 * Math.max(0, -c) ** 1.4;
    T.armF = -0.25 + 0.18 * Math.sin(ph + Math.PI) + 0.05 * Math.sin(time * 3);
    T.armB = -0.2 + 0.18 * s;
    T.bodyY = -5 * Math.abs(c);
    T.lean = 0.06 + (e.angry ? 0.12 : 0);
    T.tilt = 0.02;
    T.conv = 0.25;
    T.tailAmp = e.angry ? 9 : 5; T.tailSpeed = e.angry ? 14 : 6; T.tailLift = 0.15;
  } else {
    // watscheln
    T.thighF = -0.32 * s; T.thighB = 0.32 * s;
    T.tilt = 0.07 * c;
    T.bodyY = -4 * Math.abs(s);
    T.sy = 1 + 0.03 * Math.abs(s); T.sx = 1 - 0.02 * Math.abs(s);
    T.armF = 0.25 * s - 0.1; T.armB = -0.3 * s;
    T.tailAmp = 6; T.tailSpeed = 7; T.tailLift = 0.1;
    T.conv = 0.1;
  }
  if (e.hitT > 0) {
    const k = e.hitT / 0.35;
    T.sy -= 0.35 * k; T.sx += 0.25 * k;
  }
  if (!e.alive) {
    if (e.deadHow === 'stomp') {
      const k = Math.min(1, e.deadT / 0.08);
      T.sy = lerp(1, 0.32, k); T.sx = lerp(1, 1.35, k);
      T.alpha = e.deadT < 0.45 ? 1 : Math.max(0, 1 - (e.deadT - 0.45) * 4);
    } else {
      T.armF = 2.4; T.armB = -2.4; T.thighF = -0.6; T.thighB = 0.6;
      T.alpha = Math.max(0, 1 - e.deadT * 0.8);
    }
  }
  // weich blenden (ausser Plattdruecken)
  const P = e.pose;
  const k = (!e.alive && e.deadHow === 'stomp') || e.hitT > 0 ? 1 : 1 - Math.exp(-dt * 14);
  for (const key in T) P[key] += (T[key] - P[key]) * k;
  P.spin = e.alive ? 0 : e.spin;
  P.alpha = T.alpha;
  void speed;
  return P;
}

function ghostPose(e, time, dt) {
  const T = neutralPose();
  const w = Math.sin(time * 4 + e.id);
  T.armF = -1.35 + 0.15 * w; T.armB = -1.2 - 0.15 * w;   // Arme nach vorn
  T.thighF = 0.25 + 0.12 * w; T.thighB = 0.45 - 0.12 * w; T.shinF = 0.35; T.shinB = 0.5;
  T.lean = 0.12; T.tilt = 0.06 * Math.sin(time * 2.1 + e.id * 1.7);
  T.tailAmp = 9; T.tailSpeed = 6; T.tailLift = 0.5; T.alpha = 0.82;
  if (e.hitT > 0) { const k = e.hitT / 0.35; T.sy -= 0.35 * k; T.sx += 0.25 * k; }
  if (!e.alive) {
    if (e.deadHow === 'stomp') { const k = Math.min(1, e.deadT / 0.08); T.sy = lerp(1, 0.32, k); T.sx = lerp(1, 1.35, k); T.alpha = Math.max(0, 0.82 - e.deadT * 2); }
    else { T.armF = 2.4; T.armB = -2.4; T.alpha = Math.max(0, 0.82 - e.deadT * 0.8); }
  }
  const P = e.pose;
  const k = (!e.alive && e.deadHow === 'stomp') || e.hitT > 0 ? 1 : 1 - Math.exp(-dt * 10);
  for (const key in T) P[key] += (T[key] - P[key]) * k;
  P.spin = e.alive ? 0 : e.spin;
  P.alpha = T.alpha;
  return P;
}

export function drawEnemy(ctx, e, rig, camX, camY, s, time) {
  if (!rig) return;
  if (!e.alive && e.deadT > 1.6) return;
  const x = (e.x - camX) * s, y = (e.y + e.dy - camY) * s;
  if (x < -4 * s || x > ctx.canvas.width + 4 * s) return;
  if (e.def.fly) {
    // geisterhaftes Leuchten + Schweif
    if (e.alive) {
      const r = s * 1.1, cy = y - s * 0.6;
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, r);
      g.addColorStop(0, 'rgba(170,230,255,0.45)'); g.addColorStop(1, 'rgba(170,230,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = 'rgba(210,245,255,0.35)';
      for (let i = 1; i <= 3; i++) {
        const tx = x - e.dir * s * 0.32 * i, ty = y - s * 0.25 + Math.sin(time * 6 - i) * s * 0.08;
        ctx.beginPath(); ctx.arc(tx, ty, s * (0.22 - i * 0.05), 0, Math.PI * 2); ctx.fill();
      }
    }
    drawRigOutlined(ctx, rig, e.pose, x, y + s * 0.03, e.def.spriteH * s, e.dir, time, 'rgba(40,90,130,0.9)');
    return;
  }
  if (e.alive) {
    ctx.fillStyle = 'rgba(20,40,20,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.02, s * e.def.w * 0.55, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (e.angry && e.alive) {
    // wuetendes Gluehen
    const r = s * 1.3;
    const g = ctx.createRadialGradient(x, y - s * 1.4, 0, x, y - s * 1.4, r);
    g.addColorStop(0, `rgba(255,60,40,${0.25 + 0.1 * Math.sin(time * 12)})`); g.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - s * 1.4 - r, r * 2, r * 2);
  }
  drawRigOutlined(ctx, rig, e.pose, x, y + s * 0.03, e.def.spriteH * s, e.dir, time, e.angry ? '#4a0e0e' : '#2a2026');
}
