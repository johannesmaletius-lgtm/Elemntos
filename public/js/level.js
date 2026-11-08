// Level-Aufbau aus ASCII-Abschnitten.
//
// Legende (Kacheln):
//   #  Erde/Gras (fest)          S  Ruinenstein (fest)
//   =  Holzsteg (von unten durchspringbar)
//   X  rissiger Stein (Erde-Stampfer zerbricht ihn)
//   V  Rankenwand (Feuerball verbrennt sie)
//   ^  Dornen am Boden           v  Dornen an der Decke
//   ~  Broeckelplattform         U  Aufwind (hebt Spieler an)
// Objekte:
//   c  Wolke (wie Holzsteg, von unten durchspringbar)
//   >  Seitenwind nach rechts    <  Seitenwind nach links
//   o  Muenze   *  Geschick-Kristall (fuer alle)   M  Pilz-Trampolin   C  Checkpoint
//   1 2 3 4  Element-Kristall (1 Luft, 2 Wasser, 3 Erde, 4 Feuer)
//   G  Ziel-Tor P  Start
//   e  kleine Mumie (1x draufspringen)   E  grosse Mumie (2x draufspringen)
// Deko:
//   T  grosser Baum   A  Ruinenbogen   i  Saeule   b  Busch   r  Felsen
//   w  Wasserfall (faellt von hier nach unten)

export const T = {
  EMPTY: 0, GROUND: 1, STONE: 2, ONEWAY: 3, CRACKED: 4, VINE: 5, THORN_UP: 6, THORN_DOWN: 7, CLOUD: 8,
};

export const GEM_ELEMENTS = { '*': 'skill', '1': 'air', '2': 'water', '3': 'earth', '4': 'fire' };
const GEM_CHAR = { skill: '*', air: '1', water: '2', earth: '3', fire: '4' };

const TILE_CHARS = { '#': T.GROUND, 'S': T.STONE, '=': T.ONEWAY, 'X': T.CRACKED, 'V': T.VINE, '^': T.THORN_UP, 'v': T.THORN_DOWN, 'c': T.CLOUD };
const DECOR_CHARS = { 'T': 'tree', 'A': 'arch', 'i': 'pillar', 'b': 'bush', 'r': 'rock', 'w': 'waterfall' };

export class Level {
  constructor(def) {
    this.def = def;
    this.name = def.name;
    this.id = def.id;
    this.theme = def.theme || 'day';
    this.biome = def.biome || 'meadow';
    this.h = def.height;
    const rows = [];
    for (let y = 0; y < this.h; y++) rows.push([]);
    const movers = [], objects = [];
    let x0 = 0;
    for (const sec of def.sections) {
      const lines = sec.rows;
      const w = Math.max(...lines.map(l => l.length));
      const pad = this.h - lines.length;
      if (pad < 0) throw new Error(`Abschnitt "${sec.name}" ist zu hoch (${lines.length} > ${this.h})`);
      for (let y = 0; y < this.h; y++) {
        const line = y < pad ? '' : lines[y - pad];
        for (let x = 0; x < w; x++) rows[y].push(line[x] || ' ');
      }
      for (const m of sec.movers || []) {
        movers.push({
          ...m,
          path: m.path.map(([px, py]) => [px + x0, py + pad]),
          hub: m.hub ? [m.hub[0] + x0, m.hub[1] + pad] : null,
        });
      }
      for (const o of sec.objects || []) {
        const c = { ...o, x: o.x + x0, y: o.y + pad };
        // Geister: range = [x0, x1] (Strecke); Feuerspeier: range = Zahl (max. Flammenweite)
        if (Array.isArray(o.range)) c.range = [o.range[0] + x0, o.range[1] + x0];
        objects.push(c);
      }
      sec.x0 = x0;
      x0 += w;
    }
    this.w = x0;
    const W = this.w, H = this.h;
    this.tiles = new Uint8Array(W * H);
    this.updraft = new Uint8Array(W * H);
    this.coins = []; this.gems = []; this.springs = []; this.checkpoints = [];
    this.crumbles = []; this.decor = []; this.enemySpawns = []; this.goal = null; this.start = { x: 3, y: H - 6 };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const ch = rows[y][x];
        const i = y * W + x;
        if (TILE_CHARS[ch] !== undefined) { this.tiles[i] = TILE_CHARS[ch]; continue; }
        switch (ch) {
          case 'o': this.coins.push({ id: this.coins.length, x: x + 0.5, y: y + 0.5, taken: false }); break;
          case '*': case '1': case '2': case '3': case '4':
            this.gems.push({ id: this.gems.length, x: x + 0.5, y: y + 0.5, el: GEM_ELEMENTS[ch], taken: false }); break;
          case 'M': this.springs.push({ x, y, squash: 0 }); break;
          case 'C': this.checkpoints.push({ id: this.checkpoints.length, x: x + 0.5, y: y + 1, active: false, t: 0 }); break;
          case 'G': this.goal = { x: x + 0.5, y: y + 1 }; break;
          case 'P': this.start = { x: x + 0.5, y: y + 1 }; break;
          case '~': this.crumbles.push({ id: this.crumbles.length, x, y, state: 'idle', t: 0 }); break;
          case 'U': this.updraft[i] = 1; break;
          case '>': this.updraft[i] = 2; break;
          case '<': this.updraft[i] = 3; break;
          case 'e': this.enemySpawns.push({ type: 'mummy', x, y }); break;
          case 'E': this.enemySpawns.push({ type: 'mummyTall', x, y }); break;
          default:
            if (DECOR_CHARS[ch]) this.decor.push({ type: DECOR_CHARS[ch], x, y });
        }
      }
    }
    this.movers = movers.map((m, id) => this._initMover(m, id));
    // Feuerspeier (Steinkoepfe, die regelmaessig Flammen spucken) und fliegende Geister
    this.spitters = [];
    this.hubs = [];
    for (const o of objects) {
      if (o.kind === 'spitter') {
        this.tiles[o.y * W + o.x] = T.STONE;
        const sp = { id: this.spitters.length, x: o.x, y: o.y, dir: o.dir, period: o.period || 2.4, phase: o.phase || 0, speed: o.speed || 6.5, range: 0 };
        let r = 1;
        while (r < (o.range || 30) && !this.solid(o.x + o.dir * r, o.y)) r++;
        sp.range = r - 0.6;
        this.spitters.push(sp);
      } else if (o.kind === 'hub') {
        this.hubs.push({ x: o.x, y: o.y, r: o.r });
      } else if (o.kind === 'ghost') {
        this.enemySpawns.push({ type: 'ghost', x: o.x, y: o.y, range: o.range });
      }
    }
    this.totalCoins = this.coins.length;
    this.totalGems = this.gems.length;
    // Rankenwaende brennen, rissige Steine brechen: Zustand fuer Effekte
    this.burning = [];
  }

  _initMover(m, id) {
    // Pfad als Ping-Pong-Strecke; Dauer aus Geschwindigkeit
    let len = 0;
    const segs = [];
    const pts = m.path;
    const loop = m.loop ? [...pts, pts[0]] : [...pts, ...pts.slice(0, -1).reverse()];
    for (let i = 0; i < loop.length - 1; i++) {
      const [ax, ay] = loop[i], [bx, by] = loop[i + 1];
      const l = Math.hypot(bx - ax, by - ay);
      segs.push({ ax, ay, bx, by, l, s: len });
      len += l;
    }
    const mv = { id, w: m.w || 3, speed: m.speed || 2.5, segs, len, phase: m.phase || 0, x: pts[0][0], y: pts[0][1], dx: 0, dy: 0, style: m.style || 'stone', hub: m.hub || null };
    this.moverAt(mv, 0);
    mv.dx = mv.dy = 0;
    return mv;
  }

  moverAt(mv, time) {
    if (mv.len === 0) return;
    let d = ((time * mv.speed + mv.phase * mv.len) % mv.len + mv.len) % mv.len;
    for (const s of mv.segs) {
      if (d <= s.s + s.l) {
        const t = s.l ? (d - s.s) / s.l : 0;
        // sanftes Abbremsen an den Wendepunkten
        const e = t * t * (3 - 2 * t);
        const k = s.l > 0.01 ? (0.35 * t + 0.65 * e) : t;
        const nx = s.ax + (s.bx - s.ax) * k, ny = s.ay + (s.by - s.ay) * k;
        mv.dx = nx - mv.x; mv.dy = ny - mv.y;
        mv.x = nx; mv.y = ny;
        return;
      }
    }
  }

  get(tx, ty) {
    if (tx < 0 || tx >= this.w) return T.STONE;   // unsichtbare Wand links/rechts
    if (ty < 0 || ty >= this.h) return T.EMPTY;
    return this.tiles[ty * this.w + tx];
  }
  set(tx, ty, v) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return;
    this.tiles[ty * this.w + tx] = v;
  }
  solid(tx, ty) {
    const t = this.get(tx, ty);
    return t === T.GROUND || t === T.STONE || t === T.CRACKED || t === T.VINE;
  }
  oneway(tx, ty) { const t = this.get(tx, ty); return t === T.ONEWAY || t === T.CLOUD; }
  isUpdraft(tx, ty) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return false;
    return this.updraft[ty * this.w + tx] === 1;
  }
  // Seitenwind: +1 nach rechts, -1 nach links, 0 kein Wind
  windAt(tx, ty) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return 0;
    const v = this.updraft[ty * this.w + tx];
    return v === 2 ? 1 : v === 3 ? -1 : 0;
  }
  // aktive Flammen der Feuerspeier zur Zeit t: [{x, y, sp}]
  flamesAt(t, out = []) {
    out.length = 0;
    for (const sp of this.spitters) {
      const life = sp.range / sp.speed;
      const kMax = Math.floor((t - sp.phase) / sp.period);
      for (let k = kMax; k >= 0 && k > kMax - 8; k--) {
        const age = t - (sp.phase + k * sp.period);
        if (age < 0) continue;
        if (age > life) break;
        out.push({ x: sp.x + 0.5 + sp.dir * (0.6 + age * sp.speed), y: sp.y + 0.5, sp, age });
      }
    }
    return out;
  }
}

// Komfortables Bauen von Maps per Code. Erzeugt dieselben ASCII-Zeilen,
// die der Parser versteht (Zeile 0 = oben).
export class MapBuilder {
  constructor(width, height = 24) {
    this.W = width; this.H = height;
    this.g = [];
    for (let y = 0; y < height; y++) this.g.push(new Array(width).fill(' '));
    this.movers = [];
    this.objects = [];
  }
  put(x, y, ch) { if (x >= 0 && x < this.W && y >= 0 && y < this.H) this.g[y][x] = ch; return this; }
  fill(x0, x1, y0, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, ch); return this; }
  ground(x0, x1, top, bottom = this.H - 1) { return this.fill(x0, x1, top, bottom, '#'); }
  island(x0, x1, top, depth = 2) { return this.fill(x0, x1, top, top + depth - 1, '#'); }
  stone(x0, x1, y0, y1 = y0) { return this.fill(x0, x1, y0, y1, 'S'); }
  plank(x0, x1, y) { return this.fill(x0, x1, y, y, '='); }
  thorns(x0, x1, y) { return this.fill(x0, x1, y, y, '^'); }
  ceilThorns(x0, x1, y) { return this.fill(x0, x1, y, y, 'v'); }
  crumble(x0, x1, y) { return this.fill(x0, x1, y, y, '~'); }
  cracked(x0, x1, y0, y1 = y0) { return this.fill(x0, x1, y0, y1, 'X'); }
  vine(x0, x1, y0, y1 = y0) { return this.fill(x0, x1, y0, y1, 'V'); }
  updraft(x0, x1, y0, y1) { return this.fill(x0, x1, y0, y1, 'U'); }
  clear(x0, x1, y0, y1 = y0) { return this.fill(x0, x1, y0, y1, ' '); }
  coin(x, y) { return this.put(x, y, 'o'); }
  coins(x0, x1, y) { for (let x = x0; x <= x1; x++) this.put(x, y, 'o'); return this; }
  // Muenzbogen ueber einer Luecke: von x0 bis x1, Scheitel h Kacheln ueber y
  arc(x0, x1, y, h) {
    const n = x1 - x0;
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0.5;
      this.put(x0 + i, Math.round(y - Math.sin(t * Math.PI) * h), 'o');
    }
    return this;
  }
  // Kristall: el = 'skill' (fuer alle) oder 'air' | 'water' | 'earth' | 'fire'
  gem(x, y, el = 'skill') { return this.put(x, y, GEM_CHAR[el]); }
  cloud(x0, x1, y) { return this.fill(x0, x1, y, y, 'c'); }
  wind(x0, x1, y0, y1, dir) { return this.fill(x0, x1, y0, y1, dir > 0 ? '>' : '<'); }
  spring(x, y) { return this.put(x, y, 'M'); }
  checkpoint(x, y) { return this.put(x, y, 'C'); }
  goal(x, y) { return this.put(x, y, 'G'); }
  start(x, y) { return this.put(x, y, 'P'); }
  decor(ch, x, y) { return this.put(x, y, ch); }
  // Gegner: y = Zeile direkt ueber dem Boden
  mummy(x, y) { return this.put(x, y, 'e'); }
  mummyTall(x, y) { return this.put(x, y, 'E'); }
  // fliegende Geister-Mumie: schwebt zwischen x0 und x1 auf Hoehe y (Fuesse)
  ghost(x, y, x0, x1) { this.objects.push({ kind: 'ghost', x, y, range: [x0, x1] }); return this; }
  // Feuerspeier: Steinkopf bei (x,y), spuckt in Richtung dir (+1/-1) alle period Sekunden
  spitter(x, y, dir, period = 2.4, phase = 0, speed = 6.5, range = 30) { this.put(x, y, 'S'); this.objects.push({ kind: 'spitter', x, y, dir, period, phase, speed, range }); return this; }
  // Plattform auf Kreisbahn um (cx,cy) mit Radius r (Mittelpunkt der Plattform);
  // dir = +1 im Uhrzeigersinn, -1 dagegen. phase 0..1 = Startpunkt auf dem Kreis
  circle(w, cx, cy, r, speed = 2, phase = 0, dir = 1, n = 24) {
    const path = [];
    for (let i = 0; i < n; i++) {
      const a = dir * (i / n) * Math.PI * 2;
      path.push([+(cx + Math.cos(a) * r - w / 2).toFixed(3), +(cy + Math.sin(a) * r).toFixed(3)]);
    }
    return this.mover(w, path, speed, { loop: true, phase, circle: true, hub: [cx, cy] });
  }
  // Riesenrad: k Plattformen auf einem Kreis
  wheel(cx, cy, r, k = 4, w = 3, speed = 2, dir = 1) {
    for (let i = 0; i < k; i++) this.circle(w, cx, cy, r, speed, i / k, dir);
    this.objects.push({ kind: 'hub', x: cx, y: cy, r });
    return this;
  }
  // bewegliche Plattform: x,y = linke obere Ecke, Pfad als Punkte
  mover(w, path, speed = 2.5, opts = {}) { this.movers.push({ w, path, speed, ...opts }); return this; }
  // Fuegt bei Spalte x0 n leere Spalten ein; alles ab x0 (Kacheln, Plattformen,
  // Objekte) rutscht um n nach rechts. Danach kann der neue Abschnitt in
  // x0..x0+n-1 gebaut werden. Mehrere Einschuebe am besten von rechts nach links.
  splice(x0, n) {
    for (const r of this.g) r.splice(x0, 0, ...new Array(n).fill(' '));
    this.W += n;
    for (const m of this.movers) {
      const xs = m.path.map(p => p[0]);
      const lo = Math.min(...xs), hi = Math.max(...xs) + (m.w || 3);
      if (lo >= x0) { m.path = m.path.map(([px, py]) => [px + n, py]); if (m.hub) m.hub = [m.hub[0] + n, m.hub[1]]; }
      else if (hi > x0) throw new Error(`splice(${x0}) schneidet eine bewegliche Plattform (${lo}-${hi})`);
    }
    for (const o of this.objects) {
      const span = Array.isArray(o.range);
      const lo = span ? Math.min(o.x, o.range[0]) : o.x, hi = span ? Math.max(o.x, o.range[1]) : o.x;
      if (lo >= x0) { o.x += n; if (span) o.range = [o.range[0] + n, o.range[1] + n]; }
      else if (hi >= x0) throw new Error(`splice(${x0}) schneidet ein Objekt (${o.kind} ${lo}-${hi})`);
    }
    return this;
  }
  // Inhalt einer Spalte (zum Pruefen der Anschluesse)
  column(x) { return this.g.map(r => r[x]).join(''); }
  rows() { return this.g.map(r => r.join('')); }
  section(name) { return { name, rows: this.rows(), movers: this.movers, objects: this.objects }; }
}
