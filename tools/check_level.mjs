// Prueft mit der echten Spielphysik, ob eine Map durchspielbar ist.
// Knoten = zusammenhaengende Bodenstuecke ("Segmente") und bewegliche Plattformen.
// Von jedem Segment aus werden viele Spruenge simuliert; per Breitensuche wird
// ein Weg vom Start zum Ziel gesucht.
//
//   node tools/check_level.mjs [charId] [--ability] [--map N]
//
// Ohne --ability werden keine Spezialfaehigkeiten benutzt (Grundbewegung).
import { WORLD1 } from '../public/js/levels/world1.js';
import { Level, T } from '../public/js/level.js';
import { Player } from '../public/js/player.js';
import { PHYS } from '../public/js/config.js';

const args = process.argv.slice(2);
const charId = args.find(a => !a.startsWith('--') && isNaN(+a)) || 'fire';
const useAbility = args.includes('--ability');
const mapIndex = args.includes('--map') ? +args[args.indexOf('--map') + 1] : 0;
const lv = new Level(WORLD1.maps[mapIndex]);

// ---------- Mini-Spielumgebung ----------
const noop = () => {};
const game = {
  level: lv, time: 0, t: 0,
  fx: new Proxy({}, { get: () => noop }), sfx: noop, netFx: noop, shake: noop,
  countFireballs: () => 0, spawnFireball: noop, breakBlocks: noop,
  kill: (p) => { p.dead = true; }, respawn: noop,
  clock: () => game.t,
  _pl: null,
  platforms() {
    if (!this._pl) {
      this._mv = lv.movers.map(m => ({ x: 0, w: m.w, y: 0, dy: 0, moving: true, ref: m }));
      this._pl = [...this._mv, ...lv.crumbles.map(c => ({ x: c.x, w: 1, y: c.y, dy: 0, moving: false }))];
    }
    for (const o of this._mv) { o.x = o.ref.x; o.y = o.ref.y; o.dy = o.ref.dy; }
    return this._pl;
  },
};

// ---------- Segmente ----------
const crumbleAt = new Set(lv.crumbles.map(c => `${c.x},${c.y}`));
function standable(tx, ty) {
  const t = lv.get(tx, ty);
  const floor = lv.solid(tx, ty) || t === T.ONEWAY || crumbleAt.has(`${tx},${ty}`);
  if (!floor || tx < 0 || tx >= lv.w) return false;
  if (lv.solid(tx, ty - 1) || lv.solid(tx, ty - 2)) return false;
  const a = lv.get(tx, ty - 1);
  if (a === T.THORN_UP || a === T.THORN_DOWN || lv.get(tx, ty - 2) === T.THORN_DOWN) return false;
  return true;
}
const segs = [];
const segAt = new Map();
for (let y = 1; y < lv.h; y++) {
  let x = 0;
  while (x < lv.w) {
    if (!standable(x, y)) { x++; continue; }
    const x0 = x;
    while (x < lv.w && standable(x, y)) x++;
    const seg = { id: segs.length, x0, x1: x - 1, y };
    segs.push(seg);
    for (let k = x0; k <= x - 1; k++) segAt.set(`${k},${y}`, seg);
  }
}
function findSeg(x, y) {
  const ty = Math.round(y);
  return segAt.get(`${Math.floor(x)},${ty}`) || segAt.get(`${Math.floor(x - 0.3)},${ty}`) || segAt.get(`${Math.floor(x + 0.3)},${ty}`);
}

// ---------- Simulation ----------
const programs = [];
for (const dir of [-1, 1]) for (const run of [false, true]) for (const hold of [0, 0.12, 2]) for (const rel of [9, 0.3]) for (const v0 of [0, 1]) {
  if (!run && v0 && hold === 0) continue;
  programs.push({ dir, run, hold, rel, v0 });
}
if (useAbility) {
  for (const dir of [-1, 1]) for (const at of [0.15, 0.3, 0.45, 0.6]) for (const hold of [0.12, 2]) programs.push({ dir, run: true, hold, rel: 9, v0: 1, ability: at });
}

function simulate(x, y, prog, t0, ride) {
  const p = new Player('t', charId, 't');
  p.noAnim = true;
  p.reset(x, y);
  p.onGround = true; p.ride = ride || null;
  p.vx = prog.v0 ? prog.dir * (prog.run ? PHYS.runMax : PHYS.walkMax) : 0;
  p.facing = prog.dir;
  game.t = t0;
  for (const m of lv.movers) { lv.moverAt(m, t0); m.dx = 0; m.dy = 0; }
  let t = 0, left = false;
  const dt = PHYS.step;
  while (t < 2.8) {
    const inp = {
      axis: t < prog.rel ? prog.dir : 0, run: prog.run,
      jump: prog.hold > 0 && t < prog.hold, jumpPressed: prog.hold > 0 && t === 0,
      ability: false, abilityPressed: prog.ability !== undefined && Math.abs(t - prog.ability) < dt / 2,
    };
    if (prog.ability !== undefined && charId === 'air' && t >= prog.ability) inp.jump = true; // gleiten
    game.t = t0 + t;
    for (const m of lv.movers) lv.moverAt(m, game.t);
    p.update(dt, inp, game);
    t += dt;
    if (p.dead || p.y > lv.h + 1) return null;
    if (!p.onGround) left = true;
    if (left && p.onGround && t > 0.05) return { x: p.x, y: p.y, ride: p.ride, t };
  }
  return null;
}

// ---------- Breitensuche ----------
const startSeg = findSeg(lv.start.x, lv.start.y);
const key = (o) => (o.mover !== undefined ? `m${o.mover}` : `s${o.id}`);
const seen = new Map([[`s${startSeg.id}`, null]]);
const queue = [`s${startSeg.id}`];
let sims = 0;
const edges = [];
const moverNearSeg = (sg) => lv.movers.some(m => m.segs.some(s => Math.min(s.ax, s.bx) - 6 < sg.x1 + 1 && sg.x0 < Math.max(s.ax, s.bx) + m.w + 6 && Math.min(s.ay, s.by) - 7 < sg.y && sg.y < Math.max(s.ay, s.by) + 7));

while (queue.length) {
  const k = queue.shift();
  const starts = [];
  if (k[0] === 'm') {
    const m = lv.movers[+k.slice(1)];
    const period = m.len / m.speed;
    for (let ph = 0; ph < 8; ph++) {
      const t0 = (ph / 8) * period;
      lv.moverAt(m, t0);
      for (const off of [0.35, m.w - 0.35]) starts.push({ x: m.x + off, y: m.y, t0, ride: m, reduced: true });
    }
  } else {
    const sg = segs[+k.slice(1)];
    const xs = new Set([sg.x0 + 0.2, sg.x1 + 0.8]);
    for (let x = sg.x0 + 1; x < sg.x1; x += 3) xs.add(x + 0.5);
    const phases = moverNearSeg(sg) ? 6 : 1;
    for (let ph = 0; ph < phases; ph++) for (const x of xs) starts.push({ x, y: sg.y, t0: ph * 1.31, reduced: ph > 0 });
  }
  for (const s of starts) {
    for (const prog of programs) {
      if (s.reduced && (prog.rel !== 9 || prog.hold === 0.12)) continue;
      sims++;
      const r = simulate(s.x, s.y, prog, s.t0, s.ride);
      if (!r) continue;
      let nk = null;
      if (r.ride) nk = `m${r.ride.id}`;
      else { const sg = findSeg(r.x, r.y); if (sg) nk = `s${sg.id}`; }
      if (nk && !seen.has(nk)) { seen.set(nk, k); queue.push(nk); }
      if (nk) edges.push({ from: k, to: nk, sx: s.x, lx: r.x, t: r.t, wait: s.ride ? 0 : s.t0 > 0 ? 1.5 : 0 });
    }
  }
}

// ---------- Auswertung ----------
const reachedSegs = [...seen.keys()].filter(k => k[0] === 's').map(k => segs[+k.slice(1)]);
const near = (x, y, dy = 2.6) => reachedSegs.some(sg => x >= sg.x0 - 0.6 && x <= sg.x1 + 1.6 && sg.y - y > 0 && sg.y - y < dy);
const goal = lv.goal && near(lv.goal.x, lv.goal.y - 0.5, 1.2);
const gems = lv.gems.map(g => `${g.id}@x${Math.floor(g.x)}:${near(g.x, g.y) ? 'ja' : 'nein'}`);
const coinsOk = lv.coins.filter(c => near(c.x, c.y, 4.2)).length;
const furthest = Math.max(...reachedSegs.map(s => s.x1));
console.log(JSON.stringify({ charId, ability: useAbility, sims, segments: segs.length, reached: seen.size, goal, furthest, gems, coinsInReach: `${coinsOk}/${lv.coins.length}` }));
if (!goal) {
  const top = reachedSegs.sort((a, b) => b.x1 - a.x1).slice(0, 6).map(s => `[${s.x0}-${s.x1} @${s.y}]`);
  console.log('weiteste Segmente:', top.join(' '));
}

// ---------- Bestzeit-Schaetzung (Dijkstra, perfektes Spiel ohne Fehler) ----------
{
  const adj = new Map();
  for (const e of edges) { if (!adj.has(e.from)) adj.set(e.from, []); adj.get(e.from).push(e); }
  const best = new Map();
  const startK = `s${startSeg.id}`;
  const pq = [{ k: startK, x: lv.start.x, c: 0 }];
  best.set(startK, 0);
  let goalCost = null;
  const goalSeg = lv.goal && findSeg(lv.goal.x, lv.goal.y);
  while (pq.length) {
    pq.sort((a, b) => a.c - b.c);
    const cur = pq.shift();
    if (cur.c > (best.get(cur.k + '@' + Math.round(cur.x)) ?? Infinity)) continue;
    if (goalSeg && cur.k === `s${goalSeg.id}`) { goalCost = cur.c + Math.abs(lv.goal.x - cur.x) / PHYS.runMax; break; }
    for (const e of adj.get(cur.k) || []) {
      const walk = cur.k[0] === 'm' ? 0 : Math.abs(e.sx - cur.x) / PHYS.runMax;
      const c = cur.c + walk + e.t + e.wait;
      const bk = e.to + '@' + Math.round(e.lx);
      if (c < (best.get(bk) ?? Infinity)) { best.set(bk, c); pq.push({ k: e.to, x: e.lx, c }); }
    }
  }
  console.log(`Bestzeit (perfekt, ohne Wartezeiten): ${goalCost ? goalCost.toFixed(1) + ' s' : '-'}`);
}

// Herkunft eines Segments anzeigen:  --why X,Y
if (args.includes('--why')) {
  const [wx, wy] = args[args.indexOf('--why') + 1].split(',').map(Number);
  let k = (() => { const sg = findSeg(wx + 0.5, wy); return sg && `s${sg.id}`; })();
  const chain = [];
  while (k) {
    const d = k[0] === 'm' ? `Plattform${k.slice(1)}` : (() => { const s = segs[+k.slice(1)]; return `[${s.x0}-${s.x1} @${s.y}]`; })();
    chain.push(d); k = seen.get(k);
  }
  console.log('Weg:', chain.reverse().slice(-6).join(' -> '));
  const e = edges.filter(e => { const sg = findSeg(wx + 0.5, wy); return sg && e.to === `s${sg.id}`; });
  console.log('Kanten dorthin:', e.slice(0, 5).map(e => `${e.from} x${e.sx.toFixed(1)} t${e.t.toFixed(2)}`).join(' | '));
}
