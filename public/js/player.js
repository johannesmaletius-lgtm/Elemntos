// Spielerphysik: Laufen/Rennen mit Beschleunigung, variabler Sprunghoehe,
// Coyote-Time und Sprungpuffer, plus die vier Element-Faehigkeiten.
import { PHYS, CHARACTERS } from './config.js';
import { T } from './level.js';
import { createAnimState, updateAnim, onLand, onJump } from './anim.js';

const EPS = 0.001;

export class Player {
  constructor(id, charId, name, local = true) {
    this.id = id;
    this.charId = charId;
    this.name = name;
    this.local = local;
    this.w = PHYS.w; this.h = PHYS.h;
    this.anim = createAnimState();
    this.reset(0, 0);
    this.coins = 0;
    this.deaths = 0;
  }

  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.facing = 1; this.onGround = false; this.wasGround = false;
    this.coyote = 0; this.jumpBuf = 0; this.jumpHeld = false; this.jumping = false;
    this.ride = null; this.skid = false;
    this.airJumps = 1; this.flipT = 0; this.flipDur = 0.36; this.gliding = false;
    this.dashT = 0; this.dashReady = true; this.dashCd = 0;
    this.pound = null; this.poundT = 0;
    this.fireCd = 0; this.throwT = 0;
    this.dead = false; this.deadT = 0; this.invuln = 0;
    this.finished = false;
    this.inUpdraft = false;
    this.lastSafe = { x, y };
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h; }

  // ---- Hauptupdate (nur lokale Spieler) ----
  update(dt, inp, game) {
    const lv = game.level;
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.throwT = Math.max(0, this.throwT - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.flipT = Math.max(0, this.flipT - dt);

    if (this.dead) {
      this.deadT += dt;
      this.vy += 30 * dt;
      if (this.deadT > 0.9) game.respawn(this);
      return;
    }
    if (this.finished) {
      this.vx *= Math.exp(-dt * 8);
      this.vy = Math.min(this.vy + PHYS.gravityFall * dt, PHYS.maxFall);
      this._moveY(this.vy * dt, game);
      return;
    }

    // Eingabe
    const ax = inp.axis;
    const run = inp.run;
    if (inp.jumpPressed) this.jumpBuf = PHYS.jumpBuffer;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.jumpHeld = inp.jump;

    // Mitfahren auf beweglicher Plattform
    if (this.ride && this.onGround) {
      this._moveX(this.ride.dx, game);
      this.y += this.ride.dy;
      if (this.ride.dy > 0) this.y = this.ride.y; // nicht abheben beim Absenken
    }

    // ---- Faehigkeiten ----
    this._abilities(dt, inp, game);

    // ---- Horizontal ----
    const maxV = run ? PHYS.runMax : PHYS.walkMax;
    this.skid = false;
    if (this.dashT > 0) {
      this.dashT -= dt;
      if (this.dashT <= 0) this.vx = Math.sign(this.vx) * Math.min(Math.abs(this.vx), PHYS.runMax);
    } else if (this.pound) {
      this.vx *= Math.exp(-dt * 20);
    } else if (this.onGround) {
      if (ax !== 0) {
        const target = ax * maxV;
        if (Math.sign(this.vx) !== Math.sign(ax) && Math.abs(this.vx) > 2.5) {
          this.vx += Math.sign(ax) * PHYS.skidDecel * dt;
          this.skid = true;
          if (Math.random() < 0.5) game.fx.dust(this.x - Math.sign(ax) * 0.2, this.y, 1);
        } else {
          const acc = Math.abs(this.vx) > PHYS.walkMax ? PHYS.accelRun : PHYS.accelGround;
          if (Math.abs(this.vx) < Math.abs(target) || Math.sign(this.vx) !== Math.sign(target)) {
            this.vx += Math.sign(target - this.vx) * acc * dt;
            if (Math.sign(target - this.vx) !== Math.sign(ax) && Math.abs(this.vx) > Math.abs(target)) this.vx = target;
          } else {
            // schneller als erlaubt (z.B. Rennen losgelassen): sanft abbremsen
            this.vx -= Math.sign(this.vx) * PHYS.decelGround * 0.5 * dt;
            if (Math.abs(this.vx) < Math.abs(target)) this.vx = target;
          }
        }
        this.facing = ax > 0 ? 1 : -1;
      } else {
        const d = PHYS.decelGround * dt;
        this.vx = Math.abs(this.vx) <= d ? 0 : this.vx - Math.sign(this.vx) * d;
      }
    } else {
      if (ax !== 0) {
        const target = ax * Math.max(maxV, Math.abs(this.vx) > PHYS.walkMax ? Math.abs(this.vx) : 0);
        const cap = Math.max(maxV, Math.min(Math.abs(this.vx), PHYS.runMax));
        this.vx += ax * PHYS.accelAir * dt;
        if (Math.abs(this.vx) > cap) this.vx = Math.sign(this.vx) * cap;
        void target;
        this.facing = ax > 0 ? 1 : -1;
      } else {
        const d = PHYS.decelAir * dt;
        this.vx = Math.abs(this.vx) <= d ? 0 : this.vx - Math.sign(this.vx) * d;
      }
    }

    // ---- Springen ----
    if (this.onGround) { this.coyote = PHYS.coyote; this.airJumps = 1; this.dashReady = true; }
    else this.coyote = Math.max(0, this.coyote - dt);

    if (this.jumpBuf > 0 && this.coyote > 0 && !this.pound && this.dashT <= 0) {
      const runBonus = Math.min(1, Math.abs(this.vx) / PHYS.runMax) * PHYS.jumpRunBonus;
      this.vy = -(PHYS.jumpV + runBonus);
      this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumping = true; this.ride = null;
      onJump(this.anim);
      game.fx.dust(this.x, this.y, 4);
      game.sfx('jump');
    } else if (inp.jumpPressed && !this.onGround && this.coyote <= 0 && this.charId === 'air' && this.airJumps > 0 && !this.pound) {
      this._airJump(game);
    }

    // ---- Schwerkraft ----
    this.gliding = false;
    if (this.dashT > 0) {
      this.vy = 0;
    } else if (this.pound === 'windup') {
      // kurzer Hopser (vom Boden) bzw. Schweben in der Luft
      this.vy = this.vy < 0 ? this.vy * Math.exp(-dt * 10) : 0;
    } else if (this.pound === 'slam') {
      this.vy = 28;
    } else {
      let g;
      if (this.vy < 0) g = (this.jumping && !this.jumpHeld) ? PHYS.gravityUpCut : PHYS.gravityUp;
      else g = PHYS.gravityFall;
      this.vy += g * dt;
      let maxFall = PHYS.maxFall;
      if (this.charId === 'air' && this.vy > 0 && (inp.jump || inp.ability) && this.flipT <= 0) {
        this.gliding = true;
        maxFall = 2.6;
        if (this.vy > maxFall) this.vy = Math.max(maxFall, this.vy - 80 * dt);
      }
      if (this.vy > maxFall && !this.gliding) this.vy = maxFall;
    }

    // Aufwind
    this.inUpdraft = this._overlapUpdraft(lv);
    if (this.inUpdraft && this.dashT <= 0 && this.pound !== 'slam') {
      const boost = this.gliding ? 1.35 : 1;
      this.vy -= PHYS.updraftAccel * boost * dt;
      if (this.vy < -PHYS.updraftMaxUp * boost) this.vy = -PHYS.updraftMaxUp * boost;
      this.jumping = false;
      if (Math.random() < 0.15) game.fx.wind(this.x, this.y - 0.3);
    }

    // ---- Bewegen + Kollision ----
    const prevGround = this.onGround;
    const impactV = this.vy;
    this._moveX(this.vx * dt, game);
    this.wind = this._windAt(lv);
    if (this.wind) this._moveX(this.wind * PHYS.windSpeed * dt, game, true);
    this._moveY(this.vy * dt, game);
    this._groundProbe(game);

    if (this.onGround && this.pound === 'slam') {
      this.jumping = false;
      this._poundImpact(game);
    } else if (this.onGround && !prevGround) {
      this.jumping = false;
      if (impactV > 6) { onLand(this.anim, impactV); game.fx.dust(this.x, this.y, Math.min(8, Math.floor(impactV / 3))); if (impactV > 12) game.sfx('land'); }
    }
    if (this.onGround && this.vy >= 0 && !this.ride) {
      this.lastSafe.x = this.x; this.lastSafe.y = this.y;
    }

    // Laufstaub
    if (this.onGround && Math.abs(this.vx) > PHYS.walkMax + 0.5 && Math.random() < dt * 9) game.fx.dust(this.x - this.facing * 0.25, this.y, 1);

    // ---- Interaktionen ----
    this._springs(game);
    this._hazards(game);
    if (this.y > lv.h + 2) game.kill(this, 'fall');

    if (!this.noAnim) updateAnim(this.anim, this, dt, game.time);
  }

  _airJump(game) {
    this.vy = -PHYS.jumpV * 0.92;
    this.airJumps--;
    this.jumpBuf = 0; this.jumping = true;
    this.flipT = this.flipDur;
    onJump(this.anim);
    game.fx.windPuff(this.x, this.y);
    game.sfx('airjump');
    game.netFx({ k: 'wind', x: this.x, y: this.y });
  }

  _abilities(dt, inp, game) {
    const c = this.charId;
    if (!inp.abilityPressed) {
      if (this.pound === 'windup') {
        this.poundT -= dt;
        if (this.poundT <= 0) { this.pound = 'slam'; }
      }
      return;
    }
    if (c === 'air') {
      if (!this.onGround && this.coyote <= 0 && this.airJumps > 0) this._airJump(game);
      else if (this.onGround || this.coyote > 0) this.jumpBuf = PHYS.jumpBuffer;
    } else if (c === 'water') {
      if (this.dashCd <= 0 && (this.onGround || this.dashReady)) {
        const dir = inp.axis !== 0 ? Math.sign(inp.axis) : this.facing;
        this.facing = dir;
        this.dashT = 0.19;
        this.vx = dir * 21;
        this.vy = 0;
        this.dashCd = 0.42;
        if (!this.onGround) this.dashReady = false;
        this.pound = null;
        game.fx.splash(this.x, this.y - 0.7, dir);
        game.sfx('dash');
        game.netFx({ k: 'splash', x: this.x, y: this.y - 0.7, d: dir });
      }
    } else if (c === 'earth') {
      if (!this.pound) {
        if (this.onGround) { this.vy = -9; this.onGround = false; this.jumping = false; this.ride = null; }
        this.pound = 'windup';
        this.poundT = 0.13;
        this.vx *= 0.3;
        game.sfx('poundStart');
      }
    } else if (c === 'fire') {
      if (this.fireCd <= 0 && game.countFireballs(this.id) < 2) {
        this.fireCd = 0.32;
        this.throwT = 0.18;
        game.spawnFireball(this, this.x + this.facing * 0.55, this.y - 1.0, this.facing * 13 + this.vx * 0.35, -3);
        game.sfx('fire');
      }
    }
    if (this.pound === 'windup') {
      this.poundT -= dt;
      if (this.poundT <= 0) this.pound = 'slam';
    }
  }

  _poundImpact(game) {
    const lv = game.level;
    // rissige Steine unter den Fuessen zerbrechen -> weiterfallen
    const ty = Math.floor(this.y + 0.05);
    const cells = [];
    for (let tx = Math.floor(this.left + EPS); tx <= Math.floor(this.right - EPS); tx++) {
      if (lv.get(tx, ty) === T.CRACKED) cells.push([tx, ty]);
    }
    if (cells.length) {
      game.breakBlocks(cells, true);
      this.onGround = false;
      this.pound = 'slam';
      return;
    }
    this.pound = null;
    onLand(this.anim, 22);
    game.shake(0.25, 0.18);
    game.fx.shockwave(this.x, this.y);
    game.sfx('pound');
    game.netFx({ k: 'shock', x: this.x, y: this.y });
  }

  // push = Verschiebung von aussen (Wind, Kamera): Tempo bleibt erhalten
  _moveX(dx, game, push = false) {
    if (dx === 0) return false;
    const lv = game.level;
    this.x += dx;
    const t = this.top + EPS, b = this.y - EPS;
    if (dx > 0) {
      const tx = Math.floor(this.right);
      for (let ty = Math.floor(t); ty <= Math.floor(b); ty++) {
        if (lv.solid(tx, ty)) {
          this.x = tx - this.w / 2 - EPS;
          if (push) return true;
          if (this.dashT > 0) this.dashT = 0;
          this.vx = 0; return true;
        }
      }
    } else {
      const tx = Math.floor(this.left);
      for (let ty = Math.floor(t); ty <= Math.floor(b); ty++) {
        if (lv.solid(tx, ty)) {
          this.x = tx + 1 + this.w / 2 + EPS;
          if (push) return true;
          if (this.dashT > 0) this.dashT = 0;
          this.vx = 0; return true;
        }
      }
    }
    return false;
  }

  _windAt(lv) {
    let w = 0;
    for (let ty = Math.floor(this.top); ty <= Math.floor(this.y - EPS); ty++)
      for (let tx = Math.floor(this.left); tx <= Math.floor(this.right - EPS); tx++) {
        const d = lv.windAt(tx, ty);
        if (d) w = d;
      }
    return w;
  }

  _moveY(dy, game) {
    const lv = game.level;
    const prevB = this.y;
    this.y += dy;
    this.onGround = false;
    if (dy > 0) {
      let best = null;
      const ty = Math.floor(this.y);
      for (let tx = Math.floor(this.left + EPS); tx <= Math.floor(this.right - EPS); tx++) {
        if (lv.solid(tx, ty) || (lv.oneway(tx, ty) && prevB <= ty + EPS)) { best = { y: ty, ride: null }; break; }
      }
      // Plattformen (beweglich, broeckelnd) und Koepfe von Mitspielern
      for (const pl of game.platforms()) {
        if (this.right <= pl.x + EPS || this.left >= pl.x + pl.w - EPS) continue;
        const top = pl.y;
        if (prevB <= top + 0.02 + Math.abs(pl.dy || 0) && this.y >= top) {
          if (!best || top < best.y) best = { y: top, ride: pl };
        }
      }
      if (best) {
        this.y = best.y;
        this.vy = 0;
        this.onGround = true;
        this.ride = best.ride && best.ride.moving ? best.ride.ref : null;
        if (best.ride && best.ride.onStand) best.ride.onStand(this);
      }
    } else if (dy < 0) {
      const ty = Math.floor(this.top);
      for (let tx = Math.floor(this.left + EPS); tx <= Math.floor(this.right - EPS); tx++) {
        if (lv.solid(tx, ty)) {
          this.y = ty + 1 + this.h + EPS;
          if (this.vy < 0) this.vy = 0;
          game.fx.bonk(this.x, this.top);
          break;
        }
      }
    }
  }

  _groundProbe(game) {
    if (this.onGround || this.vy < 0 || this.pound === 'windup') return;
    const lv = game.level;
    const ty = Math.floor(this.y + 0.02);
    if (Math.abs(this.y - ty) < 0.021) {
      for (let tx = Math.floor(this.left + EPS); tx <= Math.floor(this.right - EPS); tx++) {
        if (lv.solid(tx, ty) || lv.oneway(tx, ty)) { this.onGround = true; return; }
      }
    }
  }

  _overlapUpdraft(lv) {
    for (let ty = Math.floor(this.top); ty <= Math.floor(this.y - EPS); ty++)
      for (let tx = Math.floor(this.left); tx <= Math.floor(this.right - EPS); tx++)
        if (lv.isUpdraft(tx, ty)) return true;
    return false;
  }

  _springs(game) {
    if (this.vy <= 0 && !this.onGround) return;
    for (const sp of game.level.springs) {
      if (this.right < sp.x - 0.1 || this.left > sp.x + 1.1) continue;
      const top = sp.y + 0.35;
      if (this.y >= top - 0.05 && this.y <= sp.y + 1.0 && (this.vy >= 0)) {
        const mega = this.pound === 'slam';
        this.vy = -(mega ? PHYS.springPoundV : PHYS.springV);
        this.y = top - 0.01;
        this.onGround = false; this.jumping = false; this.pound = null; this.ride = null;
        this.airJumps = 1; this.dashReady = true;
        sp.squash = 1;
        onJump(this.anim);
        game.fx.bounce(sp.x + 0.5, top, mega);
        game.sfx(mega ? 'megabounce' : 'bounce');
        game.netFx({ k: 'spring', i: game.level.springs.indexOf(sp) });
        return;
      }
    }
  }

  _hazards(game) {
    if (this.invuln > 0) return;
    const lv = game.level;
    const l = this.left + 0.12, r = this.right - 0.12, t = this.top + 0.15, b = this.y - 0.02;
    for (let ty = Math.floor(t); ty <= Math.floor(b); ty++) {
      for (let tx = Math.floor(l); tx <= Math.floor(r); tx++) {
        const tt = lv.get(tx, ty);
        if (tt === T.THORN_UP && b > ty + 0.5) { game.kill(this, 'thorn'); return; }
        if (tt === T.THORN_DOWN && t < ty + 0.5) { game.kill(this, 'thorn'); return; }
      }
    }
  }

  // Zustand fuers Netzwerk
  snapshot() {
    return [
      +this.x.toFixed(3), +this.y.toFixed(3), +this.vx.toFixed(2), +this.vy.toFixed(2),
      this.facing, (this.onGround ? 1 : 0) | (this.gliding ? 2 : 0) | (this.skid ? 4 : 0) | (this.dead ? 8 : 0) | (this.finished ? 16 : 0) | (this.dashT > 0 ? 32 : 0) | (this.throwT > 0 ? 64 : 0),
      this.pound === 'windup' ? 1 : this.pound === 'slam' ? 2 : 0, +this.flipT.toFixed(2), +this.invuln.toFixed(2), +this.deadT.toFixed(2),
    ];
  }
}

export { CHARACTERS };
