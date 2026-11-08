// Spielablauf: Schleife, Kamera, Objekte, geteilte Ereignisse (fuer Mehrspieler),
// Rendering. Ein Game-Objekt = ein laufendes Level.
import { PHYS, VIEW_TILES_Y, MIN_VIEW_TILES_X, CHARACTERS } from './config.js';
import { Level, T } from './level.js';
import { TileRenderer } from './tiles.js';
import { Background } from './background.js';
import { Particles } from './particles.js';
import { Player } from './player.js';
import { loadRig } from './rig.js';
import { createAnimState, updateAnim } from './anim.js';
import * as E from './entities.js';
import { createEnemies, updateEnemies, hitEnemy, enemyPose, drawEnemy, ENEMY_TYPES } from './enemies.js';
import { sfx } from './audio.js';
import { clamp } from './util.js';

export class RemotePlayer {
  constructor(id, charId, name) {
    this.id = id; this.charId = charId; this.name = name;
    this.w = PHYS.w; this.h = PHYS.h;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.facing = 1;
    this.onGround = true; this.gliding = false; this.skid = false; this.dead = false; this.finished = false;
    this.dashT = 0; this.throwT = 0; this.pound = null; this.flipT = 0; this.flipDur = 0.36; this.invuln = 0; this.deadT = 0;
    this.buf = []; this.anim = createAnimState(); this.dx = 0; this.dy = 0;
    this.coins = 0; this.deaths = 0; this.remote = true; this.seen = false;
  }
  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h; }
  push(t, s) {
    this.buf.push({ t, s });
    if (this.buf.length > 30) this.buf.shift();
    if (!this.seen) { this.seen = true; this._apply(s, s, 0); }
  }
  _apply(a, b, k) {
    const nx = a[0] + (b[0] - a[0]) * k, ny = a[1] + (b[1] - a[1]) * k;
    // Teleport (Respawn) nicht interpolieren
    if (Math.abs(b[0] - a[0]) > 4 || Math.abs(b[1] - a[1]) > 4) { this.dx = 0; this.dy = 0; this.x = b[0]; this.y = b[1]; }
    else { this.dx = nx - this.x; this.dy = ny - this.y; this.x = nx; this.y = ny; }
    this.vx = b[2]; this.vy = b[3]; this.facing = b[4];
    const f = b[5];
    this.onGround = !!(f & 1); this.gliding = !!(f & 2); this.skid = !!(f & 4); this.dead = !!(f & 8);
    this.finished = !!(f & 16); this.dashT = (f & 32) ? 0.1 : 0; this.throwT = (f & 64) ? 0.1 : 0;
    this.pound = b[6] === 1 ? 'windup' : b[6] === 2 ? 'slam' : null;
    this.flipT = b[7]; this.invuln = b[8]; this.deadT = b[9];
  }
  update(dt, renderT, time) {
    const B = this.buf;
    if (B.length === 0) return;
    let i = B.length - 1;
    while (i > 0 && B[i - 1].t > renderT) i--;
    if (i === 0 || B[i].t <= renderT) {
      const last = B[B.length - 1];
      this._apply(last.s, last.s, 0);
    } else {
      const a = B[i - 1], b = B[i];
      const k = clamp((renderT - a.t) / Math.max(0.001, b.t - a.t), 0, 1);
      this._apply(a.s, b.s, k);
    }
    updateAnim(this.anim, this, dt, time);
  }
}

export class Game {
  constructor({ canvas, levelDef, worldDef, local, net, onFinish, onHud }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.levelDef = levelDef;
    this.worldDef = worldDef;
    this.level = new Level(levelDef);
    this.tiles = new TileRenderer(this.level);
    this.bg = new Background();
    this.fxp = new Particles();
    this.net = net || null;
    this.onFinish = onFinish;
    this.onHud = onHud || (() => {});
    this.players = new Map();
    this.rigs = {};
    this.fireballs = [];
    this.enemies = createEnemies(this.level);
    this.enemiesDefeated = 0;
    this.time = 0;          // Spielzeit (Animationen)
    this.levelTime = 0;     // Stoppuhr
    this.startClock = null; // fuer synchronisierte Plattformen
    this.cam = { x: 0, y: 0, look: 0 };
    this.shakeT = 0; this.shakeA = 0;
    this.paused = false;
    this.ended = false;
    this.respawnCp = -1;
    this.teamCoins = 0; this.teamGems = 0;
    this.fx = this._makeFx();
    const st = this.level.start;
    this.me = new Player(local.id, local.charId, local.name, true);
    this.me.reset(st.x, st.y);
    this.players.set(this.me.id, this.me);
    this._acc = 0;
    this._last = 0;
    this.resize();
  }

  async load() {
    const ids = new Set([this.me.charId, ...[...this.players.values()].map(p => p.charId), 'mummy', 'mummy_tall']);
    await Promise.all([...ids].map(async id => {
      try { this.rigs[id] = await loadRig(id); } catch (e) { console.warn('Rig fehlt:', id, e); }
    }));
    // restliche Rigs im Hintergrund (fuer spaeter beitretende Spieler)
    for (const id of Object.keys(CHARACTERS)) if (!this.rigs[id]) loadRig(id).then(r => { this.rigs[id] = r; });
    this._snapCamera();
  }

  addRemote(id, charId, name) {
    if (this.players.has(id)) return this.players.get(id);
    const rp = new RemotePlayer(id, charId, name);
    this.players.set(id, rp);
    if (!this.rigs[charId]) loadRig(charId).then(r => { this.rigs[charId] = r; });
    return rp;
  }
  removeRemote(id) { this.players.delete(id); }

  // ---------- Hilfen fuer Spieler ----------
  sfx(name) { sfx(name); }
  netFx(fx) { if (this.net) this.net.send({ type: 'fx', fx }); }
  shake(t, a) { this.shakeT = Math.max(this.shakeT, t); this.shakeA = Math.max(this.shakeA, a); }
  countFireballs(id) { return this.fireballs.filter(f => f.owner === id).length; }

  clock() {
    // gemeinsame Zeit fuer Plattformen (im Mehrspieler vom Server)
    if (this.net && this.net.levelStart) return (this.net.now() - this.net.levelStart) / 1000;
    return this.levelTime;
  }

  platforms() {
    const out = [];
    for (const m of this.level.movers) out.push({ x: m.x, w: m.w, y: m.y, dy: m.dy, moving: true, ref: m });
    for (const c of this.level.crumbles) {
      if (c.state === 'idle' || c.state === 'shake') out.push({ x: c.x, w: 1, y: c.y, dy: 0, moving: false, onStand: () => this._stepCrumble(c) });
    }
    for (const p of this.players.values()) {
      if (p === this.me || !p.remote || p.dead || p.finished) continue;
      out.push({ x: p.left + 0.05, w: p.w - 0.1, y: p.top, dy: p.dy, moving: true, ref: p });
    }
    return out;
  }

  _stepCrumble(c) {
    if (c.state !== 'idle') return;
    this.emit({ t: 'crumble', id: c.id });
  }

  spawnFireball(owner, x, y, vx, vy, fromNet = false) {
    this.fireballs.push({ owner: owner.id, x, y, vx, vy, t: 0, bounces: 0, local: !fromNet });
    if (!fromNet) this.netFx({ k: 'fireball', x, y, vx, vy });
  }

  breakBlocks(cells, local) {
    if (local) this.emit({ t: 'break', cells });
  }

  kill(p, cause) {
    if (p.dead || p.finished) return;
    p.dead = true; p.deadT = 0; p.deaths++;
    p.vy = -6; p.pound = null; p.dashT = 0;
    const col = CHARACTERS[p.charId].color;
    this.fxp.burst(p.x, p.y - 0.8, 26, { speed: 6, color: [col, '#ffffff', CHARACTERS[p.charId].dark], life: 0.7, size: 0.16, drag: 3, type: 'circle' });
    this.sfx('death');
    if (p === this.me) { this.shake(0.2, 0.12); navigator.vibrate?.(60); }
  }

  respawnPoint() {
    if (this.respawnCp >= 0) {
      const cp = this.level.checkpoints[this.respawnCp];
      return { x: cp.x, y: cp.y };
    }
    return { ...this.level.start };
  }

  respawn(p) {
    const r = this.respawnPoint();
    const deaths = p.deaths, coins = p.coins;
    p.reset(r.x, r.y - 0.01);
    p.deaths = deaths; p.coins = coins;
    p.invuln = 1.2;
    this.fxp.burst(r.x, r.y - 0.8, 16, { speed: 3, color: ['#ffffff', CHARACTERS[p.charId].color], life: 0.5, size: 0.14, type: 'star' });
    if (p === this.me) this._snapCamera(true);
  }

  // ---------- Ereignisse (lokal + Netzwerk) ----------
  emit(ev) {
    ev.by = this.me.id;
    this.applyEvent(ev, false);
    if (this.net) this.net.send({ type: 'ev', ev });
  }

  applyEvent(ev, fromNet) {
    const lv = this.level;
    switch (ev.t) {
      case 'coin': {
        const c = lv.coins[ev.id];
        if (!c || c.taken) return;
        c.taken = true; this.teamCoins++;
        const p = this.players.get(ev.by); if (p) p.coins++;
        this.fxp.burst(c.x, c.y, 7, { speed: 2.5, color: ['#fff6a8', '#ffd43b'], life: 0.4, size: 0.12, type: 'star' });
        if (ev.by === this.me.id) this.sfx('coin');
        break;
      }
      case 'gem': {
        const g = lv.gems[ev.id];
        if (!g || g.taken) return;
        g.taken = true; this.teamGems++;
        this.fxp.burst(g.x, g.y, 22, { speed: 4.5, color: ['#e3cdff', '#a873ff', '#ffffff'], life: 0.8, size: 0.16, type: 'star' });
        this.fxp.add({ x: g.x, y: g.y, type: 'ring', size: 0.2, grow: 4, life: 0.5, color: '#e3cdff' });
        this.sfx('gem');
        this.toast(`Kristall gefunden! (${this.teamGems}/${lv.totalGems})`);
        break;
      }
      case 'cp': {
        const cp = lv.checkpoints[ev.id];
        if (!cp) return;
        if (!cp.active) {
          cp.active = true; cp.t = 0;
          this.fxp.burst(cp.x, cp.y - 2.2, 20, { speed: 4, color: ['#9fdcff', '#3fd6d0', '#9bd25a', '#ff8a3d', '#ffffff'], life: 0.8, size: 0.14, type: 'star' });
          this.sfx('checkpoint');
          this.toast('Checkpoint!');
        }
        if (ev.id > this.respawnCp) this.respawnCp = ev.id;
        break;
      }
      case 'crumble': {
        const c = lv.crumbles[ev.id];
        if (!c || c.state !== 'idle') return;
        c.state = 'shake'; c.t = 0;
        break;
      }
      case 'break': {
        for (const [x, y] of ev.cells) {
          if (lv.get(x, y) !== T.CRACKED) continue;
          lv.set(x, y, T.EMPTY);
          this.fxp.burst(x + 0.5, y + 0.5, 12, { speed: 6, color: ['#ebe4d2', '#c7bda6', '#99907c', '#5b5347'], life: 0.9, size: 0.2, grav: 30, drag: 0.5, spin: 12 });
        }
        this.sfx('break');
        this.shake(0.15, 0.1);
        break;
      }
      case 'burn': {
        const [x, y] = ev.cell;
        this._ignite(x, y);
        break;
      }
      case 'enemy': {
        const e = this.enemies[ev.id];
        if (!e || !e.alive) return;
        const at = ev.at ?? this.clock();
        const killed = hitEnemy(e, ev.how, at);
        const cx = e.x, cy = e.y - e.def.h * 0.6;
        if (killed) {
          this.enemiesDefeated++;
          if (this.clock() - at > 2) e.deadT = 9; // altes Ereignis (Nachzuegler)
          this.fxp.burst(cx, cy, 14, { speed: 4.5, color: ['#f3ead8', '#c9c3d6', '#9aa0b8', '#ffffff'], life: 0.6, size: 0.16, grav: 12, drag: 1.2, spin: 10 });
          if (ev.how === 'stomp') { this.fx.dust(e.x, e.y, 8); this.sfx('stomp'); }
          else this.sfx('kick');
        } else {
          this.fxp.burst(cx, cy, 10, { speed: 3.5, color: ['#f3ead8', '#ff6a4a', '#ffffff'], life: 0.5, size: 0.14, grav: 10 });
          this.sfx('enemyHit');
        }
        break;
      }
      case 'finish': {
        const p = this.players.get(ev.by);
        if (p) { p.finished = true; p.finishTime = ev.time; }
        if (p && p !== this.me) this.toast(`${p.name} ist im Ziel!`);
        this._checkAllFinished();
        break;
      }
    }
    this.onHud();
  }

  applyFx(fx, from) {
    const p = this.players.get(from);
    switch (fx.k) {
      case 'wind': this.fx.windPuff(fx.x, fx.y); break;
      case 'splash': this.fx.splash(fx.x, fx.y, fx.d); break;
      case 'shock': this.fx.shockwave(fx.x, fx.y); break;
      case 'spring': { const sp = this.level.springs[fx.i]; if (sp) { sp.squash = 1; this.fx.bounce(sp.x + 0.5, sp.y + 0.35, false); } break; }
      case 'fireball': if (p) this.spawnFireball(p, fx.x, fx.y, fx.vx, fx.vy, true); break;
    }
  }

  _ignite(x, y) {
    const lv = this.level;
    if (lv.get(x, y) !== T.VINE) return;
    if (lv.burning.some(b => b.x === x && b.y === y)) return;
    lv.burning.push({ x, y, t: 0, spread: false });
    this.sfx('burn');
  }

  _checkAllFinished() {
    const all = [...this.players.values()];
    if (all.length && all.every(p => p.finished)) {
      if (!this.ended) {
        this.ended = true;
        setTimeout(() => this.onFinish && this.onFinish(this.results()), 1800);
      }
    }
  }

  results() {
    return {
      time: this.me.finishTime ?? this.levelTime,
      coins: this.teamCoins, totalCoins: this.level.totalCoins,
      gems: this.teamGems, totalGems: this.level.totalGems,
      enemies: this.enemiesDefeated, totalEnemies: this.enemies.length,
      players: [...this.players.values()].map(p => ({ name: p.name, charId: p.charId, coins: p.coins, deaths: p.deaths, time: p.finishTime })),
    };
  }

  toast(msg) { if (this.onToast) this.onToast(msg); }

  // ---------- Effekte ----------
  _makeFx() {
    const P = () => this.fxp;
    return {
      dust: (x, y, n) => P().burst(x, y - 0.05, n, { angle: -Math.PI / 2, spread: Math.PI * 0.9, speed: 1.6, color: ['#f3e6c8', '#e2d1ad', '#ffffff'], life: 0.45, size: 0.18, grow: 0.25, drag: 4, jitter: 0.3, jitterY: 0.05 }),
      wind: (x, y) => P().add({ x: x + (Math.random() - 0.5) * 0.6, y, vx: (Math.random() - 0.5), vy: -4, life: 0.4, size: 0.1, color: 'rgba(255,255,255,0.8)' }),
      windPuff: (x, y) => { P().burst(x, y, 12, { angle: Math.PI / 2, spread: Math.PI * 1.2, speed: 4, color: ['#ffffff', '#cdeeff', '#9fdcff'], life: 0.45, size: 0.16, drag: 4, type: 'circle' }); P().add({ x, y, type: 'ring', size: 0.15, grow: 3.5, life: 0.35, color: '#ffffff' }); },
      splash: (x, y, d) => { P().burst(x - d * 0.3, y, 16, { angle: d > 0 ? Math.PI : 0, spread: 1.4, speed: 6, color: ['#3fd6d0', '#9ff4ff', '#ffffff', '#1d78c9'], life: 0.5, size: 0.14, grav: 18, drag: 1.5, type: 'circle' }); },
      shockwave: (x, y) => {
        P().add({ x, y: y - 0.1, type: 'ring', size: 0.2, grow: 7, life: 0.35, color: '#e2c79a' });
        P().burst(x, y - 0.1, 18, { angle: -Math.PI / 2, spread: Math.PI * 0.95, speed: 6, color: ['#8f5631', '#b8743f', '#d9975a', '#9bd25a'], life: 0.6, size: 0.18, grav: 25, drag: 0.8, spin: 10 });
        this.fx.dust(x, y, 10);
      },
      bounce: (x, y, mega) => { P().burst(x, y, mega ? 18 : 8, { angle: -Math.PI / 2, spread: 2, speed: mega ? 6 : 3.5, color: ['#ffffff', '#ff7a6e', '#ffd1ea'], life: 0.45, size: 0.14, type: 'star' }); },
      bonk: (x, y) => P().burst(x, y, 4, { speed: 2, color: ['#ffffff', '#ffe28a'], life: 0.25, size: 0.1, type: 'star' }),
    };
  }

  // ---------- Schleife ----------
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    let viewH = VIEW_TILES_Y;
    let s = this.canvas.height / viewH;
    if (this.canvas.width / s < MIN_VIEW_TILES_X) s = this.canvas.width / MIN_VIEW_TILES_X;
    this.scale = s;
    this.viewW = this.canvas.width / s;
    this.viewH = this.canvas.height / s;
  }

  frame(now, input) {
    if (!this._last) this._last = now;
    let dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    if (!this.paused) {
      this._acc += dt;
      let first = true;
      let steps = 0;
      while (this._acc >= PHYS.step && steps < 12) {
        const inp = first ? input : { ...input, jumpPressed: false, abilityPressed: false };
        this.step(PHYS.step, inp);
        first = false;
        this._acc -= PHYS.step;
        steps++;
      }
      if (steps >= 12) this._acc = 0;
    }
    this.render();
  }

  step(dt, inp) {
    this.time += dt;
    if (!this.me.finished) this.levelTime = this.net && this.net.levelStart ? Math.max(0, this.clock()) : this.levelTime + dt;
    const lv = this.level;
    // Plattformen
    const ct = this.clock();
    for (const m of lv.movers) lv.moverAt(m, ct);
    for (const c of lv.crumbles) {
      c.t += dt;
      if (c.state === 'shake' && c.t > 0.45) { c.state = 'fall'; c.t = 0; c.fallY = 0; c.vy = 0; this.sfx('crumble'); this.fxp.burst(c.x + 0.5, c.y + 0.3, 6, { speed: 2, color: ['#d6ae6c', '#a57c43'], life: 0.5, size: 0.14, grav: 20 }); }
      else if (c.state === 'fall') { c.vy += 30 * dt; c.fallY += c.vy * dt; if (c.t > 0.7) { c.state = 'gone'; c.t = 0; } }
      else if (c.state === 'gone' && c.t > 2.6) { c.state = 'respawn'; c.t = 0; }
      else if (c.state === 'respawn' && c.t > 0.4) {
        // nur wiederherstellen, wenn niemand drin steht
        const blocked = [...this.players.values()].some(p => p.right > c.x && p.left < c.x + 1 && p.y > c.y && p.top < c.y + 0.6);
        if (!blocked) { c.state = 'idle'; c.t = 0; }
      }
    }
    updateEnemies(this.enemies, ct, dt);
    for (const sp of lv.springs) sp.squash = Math.max(0, sp.squash - dt * 5);
    for (const cp of lv.checkpoints) cp.t += dt;
    // brennende Ranken
    for (let i = lv.burning.length - 1; i >= 0; i--) {
      const b = lv.burning[i];
      b.t += dt;
      if (Math.random() < 0.5) this.fxp.add({ x: b.x + Math.random(), y: b.y + Math.random(), vy: -2.5, vx: (Math.random() - 0.5), life: 0.5, size: 0.18, color: Math.random() < 0.5 ? '#ff8a3d' : '#ffd23d', grow: -0.2 });
      if (!b.spread && b.t > 0.09) {
        b.spread = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this._ignite(b.x + dx, b.y + dy);
      }
      if (b.t > 0.38) {
        lv.set(b.x, b.y, T.EMPTY);
        this.fxp.burst(b.x + 0.5, b.y + 0.5, 6, { speed: 1.5, color: ['#3a3a3a', '#6b6b6b', '#ff8a3d'], life: 0.7, size: 0.14, grav: -2 });
        lv.burning.splice(i, 1);
      }
    }
    // Remote-Spieler (interpoliert, ~110 ms Verzoegerung)
    if (this.net) {
      const rt = this.net.now() - 110;
      for (const p of this.players.values()) if (p.remote) p.update(dt, rt, this.time);
    }
    // lokaler Spieler
    const prevY = this.me.y;
    this.me.update(dt, inp, this);
    if (!this.me.dead) { this._collect(); this._enemyContacts(prevY, inp); }
    // Feuerbaelle
    this._updateFireballs(dt);
    this.fxp.update(dt);
    this._camera(dt);
    if (this.shakeT > 0) this.shakeT -= dt;
    // Netzwerk: Zustand senden (20/s)
    if (this.net) {
      this._sendT = (this._sendT || 0) - dt;
      if (this._sendT <= 0) { this._sendT = 0.05; this.net.send({ type: 'st', s: this.me.snapshot() }); }
    }
  }

  _collect() {
    const p = this.me, lv = this.level;
    const cx = p.x, cy = p.y - p.h / 2;
    for (const c of lv.coins) {
      if (c.taken) continue;
      if (Math.abs(c.x - cx) < 0.65 && Math.abs(c.y - cy) < 1.0) this.emit({ t: 'coin', id: c.id });
    }
    for (const g of lv.gems) {
      if (g.taken) continue;
      if (Math.abs(g.x - cx) < 0.75 && Math.abs(g.y - cy) < 1.1) this.emit({ t: 'gem', id: g.id });
    }
    for (const cp of lv.checkpoints) {
      if (cp.id <= this.respawnCp && cp.active) continue;
      if (Math.abs(cp.x - p.x) < 0.9 && p.y > cp.y - 3 && p.y <= cp.y + 0.2) this.emit({ t: 'cp', id: cp.id });
    }
    const g = lv.goal;
    if (g && !p.finished && Math.abs(p.x - g.x) < 1.1 && p.y > g.y - 4 && p.y <= g.y + 0.1) {
      p.finished = true; p.finishTime = this.levelTime; p.vx = 0;
      this.sfx('goal');
      this.fxp.burst(g.x, g.y - 2, 40, { speed: 7, color: ['#ffffff', '#8fe6ff', '#b07cff', '#ffd43b'], life: 1.1, size: 0.18, type: 'star' });
      this.emit({ t: 'finish', time: this.levelTime });
    }
  }

  _enemyContacts(prevY, inp) {
    const p = this.me;
    if (p.dead || p.finished) return;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (p.right <= e.left + 0.1 || p.left >= e.right - 0.1 || p.y <= e.top + 0.02 || p.top >= e.y - 0.05) continue;
      if (p.pound === 'slam' || p.dashT > 0) {
        // Erd-Stampfer und Wasser-Dash besiegen Mumien sofort
        this.emit({ t: 'enemy', id: e.id, how: 'power', hp: e.hp, at: this.clock() });
        continue;
      }
      if (p.vy >= 0 && prevY <= e.top + 0.35) {
        this.emit({ t: 'enemy', id: e.id, how: 'stomp', hp: e.hp, at: this.clock() });
        p.vy = -15.5; p.jumping = true; p.onGround = false; p.ride = null;
        p.y = Math.min(p.y, e.top - 0.01);
        p.airJumps = 1; p.dashReady = true; p.pound = null;
        navigator.vibrate?.(20);
        continue;
      }
      if (p.invuln <= 0) this.kill(p, 'enemy');
      return;
    }
  }

  _updateFireballs(dt) {
    const lv = this.level;
    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const f = this.fireballs[i];
      f.t += dt;
      let dead = f.t > 1.7;
      f.vy += 32 * dt;
      // x
      const nx = f.x + f.vx * dt;
      const txh = Math.floor(nx + Math.sign(f.vx) * 0.22), tyc = Math.floor(f.y);
      if (lv.solid(txh, tyc)) {
        if (lv.get(txh, tyc) === T.VINE && f.local) this.emit({ t: 'burn', cell: [txh, tyc] });
        dead = true;
      } else f.x = nx;
      // y
      const ny = f.y + f.vy * dt;
      const tyv = Math.floor(ny + (f.vy > 0 ? 0.22 : -0.22)), txc = Math.floor(f.x);
      if (lv.solid(txc, tyv) || (f.vy > 0 && lv.oneway(txc, tyv) && f.y + 0.22 <= tyv + 0.01)) {
        if (lv.get(txc, tyv) === T.VINE && f.local) { this.emit({ t: 'burn', cell: [txc, tyv] }); dead = true; }
        if (f.vy > 0) { f.vy = -8.5; f.bounces++; if (f.bounces > 3) dead = true; this.fxp.burst(f.x, f.y + 0.2, 3, { speed: 1.5, color: ['#ffd23d', '#ff8a3d'], life: 0.3, size: 0.1 }); }
        else f.vy = 0;
      } else f.y = ny;
      for (const e of this.enemies) {
        if (!e.alive || dead) continue;
        if (f.x > e.left - 0.2 && f.x < e.right + 0.2 && f.y > e.top - 0.2 && f.y < e.y + 0.1) {
          if (f.local) this.emit({ t: 'enemy', id: e.id, how: 'fire', hp: e.hp, at: this.clock() });
          dead = true;
        }
      }
      if (Math.random() < 0.8) this.fxp.add({ x: f.x, y: f.y, vx: -f.vx * 0.1, vy: -1, life: 0.3, size: 0.2, grow: -0.5, color: Math.random() < 0.5 ? '#ff8a3d' : '#ffd23d' });
      if (dead) {
        this.fxp.burst(f.x, f.y, 10, { speed: 3, color: ['#ffd23d', '#ff8a3d', '#ff4a2a'], life: 0.35, size: 0.14 });
        this.fireballs.splice(i, 1);
      }
    }
  }

  _snapCamera(soft = false) {
    const p = this.me;
    const tx = clamp(p.x - this.viewW / 2, 0, Math.max(0, this.level.w - this.viewW));
    const ty = clamp(p.y - this.viewH * 0.62, -1, this.level.h - this.viewH + 0.2);
    if (soft) { this.cam.x += (tx - this.cam.x) * 0.5; this.cam.y += (ty - this.cam.y) * 0.5; }
    else { this.cam.x = tx; this.cam.y = ty; }
  }

  _camera(dt) {
    const p = this.me;
    const lookTarget = p.dead ? this.cam.look : clamp(p.vx / PHYS.runMax, -1, 1) * this.viewW * 0.14 + p.facing * this.viewW * 0.04;
    this.cam.look += (lookTarget - this.cam.look) * (1 - Math.exp(-dt * 2.2));
    const tx = clamp(p.x - this.viewW / 2 + this.cam.look, 0, Math.max(0, this.level.w - this.viewW));
    this.cam.x += (tx - this.cam.x) * (1 - Math.exp(-dt * 7));
    // vertikal: Totzone, schneller nachziehen wenn am Boden
    const feetScreen = p.y - this.cam.y;
    let ty = this.cam.y;
    const lo = this.viewH * 0.78, hi = this.viewH * 0.38;
    if (p.onGround || p.inUpdraft) ty = p.y - this.viewH * 0.66;
    else if (feetScreen > lo) ty = p.y - lo;
    else if (feetScreen < hi) ty = p.y - hi;
    if (p.dead) ty = this.cam.y;
    ty = clamp(ty, -1, this.level.h - this.viewH + 0.2);
    const rate = p.onGround ? 4.5 : 6;
    this.cam.y += (ty - this.cam.y) * (1 - Math.exp(-dt * rate));
  }

  render() {
    const ctx = this.ctx, s = this.scale, W = this.canvas.width, H = this.canvas.height;
    let cx = this.cam.x, cy = this.cam.y;
    if (this.shakeT > 0) {
      cx += (Math.random() - 0.5) * this.shakeA;
      cy += (Math.random() - 0.5) * this.shakeA;
    }
    // auf Bildschirmpixel einrasten (keine Naehte)
    cx = Math.round(cx * s) / s; cy = Math.round(cy * s) / s;
    const lv = this.level, t = this.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.bg.drawBack(ctx, cx, cy, s, W, H, lv, t);
    this.tiles.draw(ctx, cx, cy, s, this.viewW, this.viewH);
    this.tiles.drawDynamic(ctx, cx, cy, s, this.viewW, this.viewH);
    E.drawUpdrafts(ctx, lv, cx, cy, s, this.viewW, this.viewH, t);
    ctx.imageSmoothingEnabled = false;
    const vis = (x, pad = 3) => x > cx - pad && x < cx + this.viewW + pad;
    for (const m of lv.movers) if (vis(m.x, m.w + 2)) E.drawMover(ctx, m, cx, cy, s);
    for (const c of lv.crumbles) if (vis(c.x)) E.drawCrumble(ctx, c, cx, cy, s, t);
    if (lv.goal && vis(lv.goal.x, 6)) E.drawGoal(ctx, lv.goal, cx, cy, s, t);
    for (const cp of lv.checkpoints) if (vis(cp.x)) E.drawCheckpoint(ctx, cp, cx, cy, s, t);
    for (const sp of lv.springs) if (vis(sp.x)) E.drawSpring(ctx, sp, cx, cy, s);
    for (const c of lv.coins) if (!c.taken && vis(c.x)) E.drawCoin(ctx, c, cx, cy, s, t);
    for (const g of lv.gems) if (!g.taken && vis(g.x)) E.drawGem(ctx, g, cx, cy, s, t);
    // Gegner + Spieler (eigener zuletzt)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const fdt = Math.min(0.05, Math.max(0.001, t - (this._lastRenderT ?? t)));
    this._lastRenderT = t;
    for (const e of this.enemies) {
      if (!vis(e.x, 4)) continue;
      enemyPose(e, t, fdt);
      drawEnemy(ctx, e, this.rigs[e.def.rig], cx, cy, s, t);
    }
    const order = [...this.players.values()].filter(p => p !== this.me);
    order.push(this.me);
    for (const p of order) this._drawPlayer(ctx, p, cx, cy, s, t);
    ctx.imageSmoothingEnabled = false;
    for (const f of this.fireballs) E.drawFireball(ctx, f, cx, cy, s, t);
    this.fxp.draw(ctx, cx, cy, s);
    this.bg.drawFront(ctx, cx, cy, s, W, H, lv, t);
    this._drawIndicators(ctx, cx, cy, s, W, H);
  }

  _drawPlayer(ctx, p, cx, cy, s, t) {
    const rig = this.rigs[p.charId];
    if (!rig) return;
    if (p.dead && p.deadT > 0.5) return;
    const x = (p.x - cx) * s, y = (p.y - cy) * s;
    if (x < -3 * s || x > this.canvas.width + 3 * s) return;
    // Schatten
    if (p.onGround && !p.dead) {
      ctx.fillStyle = 'rgba(20,40,20,0.22)';
      ctx.beginPath(); ctx.ellipse(x, y - s * 0.02, s * 0.42, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    }
    rig.draw(ctx, p.anim.pose, x, y + s * 0.04, PHYS.spriteH * s, p.facing, t);
    // Namensschild fuer Mitspieler
    if (this.players.size > 1 && !p.dead) {
      const col = CHARACTERS[p.charId].color;
      ctx.font = `700 ${Math.round(s * 0.3)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      const ny = y - PHYS.spriteH * s - s * 0.12;
      const tw = ctx.measureText(p.name).width + s * 0.3;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x - tw / 2, ny - s * 0.3, tw, s * 0.4);
      ctx.fillStyle = col;
      ctx.fillText(p.name, x, ny);
    }
  }

  _drawIndicators(ctx, cx, cy, s, W, H) {
    if (this.players.size < 2) return;
    for (const p of this.players.values()) {
      if (p === this.me || p.finished) continue;
      const x = (p.x - cx) * s, y = (p.y - 0.8 - cy) * s;
      if (x > 0 && x < W && y > 0 && y < H) continue;
      const ix = clamp(x, s * 0.5, W - s * 0.5), iy = clamp(y, s * 0.9, H - s * 0.5);
      const a = Math.atan2(y - iy, x - ix);
      ctx.save();
      ctx.translate(ix, iy);
      ctx.fillStyle = CHARACTERS[p.charId].color;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(s * 0.48, 0); ctx.lineTo(s * 0.3, -s * 0.13); ctx.lineTo(s * 0.3, s * 0.13); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#000'; ctx.font = `800 ${Math.round(s * 0.28)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.name.slice(0, 1).toUpperCase(), ix, iy + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }
}
