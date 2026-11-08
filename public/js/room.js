// Raum-Logik fuer den Mehrspieler. Wird sowohl vom Node-Server (server/server.js)
// als auch im Browser des Gastgebers (Peer-to-Peer, z.B. auf GitHub Pages) benutzt.
// Eine "Verbindung" ist ein Objekt mit send(obj).

export const MAX_PLAYERS = 4;
export const CHARS = ['air', 'water', 'earth', 'fire'];

export function makeCode(exists = () => false) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
    if (!exists(c)) return c;
  }
}

export function cleanName(s) {
  return String(s || 'Spieler').replace(/[<>&"']/g, '').trim().slice(0, 12) || 'Spieler';
}

// Ereignisse, die nur einmal passieren duerfen (Muenze, Kristall, ...)
function eventKey(ev) {
  switch (ev.t) {
    case 'coin': case 'gem': case 'cp': return `${ev.t}:${ev.id}`;
    case 'finish': return `finish:${ev.by}`;
    case 'break': return `break:${(ev.cells || []).map(c => c.join(',')).join(';')}`;
    case 'burn': return `burn:${(ev.cell || []).join(',')}`;
    case 'enemy': return `enemy:${ev.id}:${ev.how === 'stomp' ? ev.hp : 'x'}`;
    default: return null;
  }
}

export class Room {
  constructor(code, now) {
    this.code = code;
    this.now = now;              // Raumzeit in ms
    this.players = new Map();
    this.hostId = null;
    this.phase = 'lobby';
    this.levelStart = 0;
    this.events = [];
    this.keys = new Set();
    this.map = 0;
    this.nextId = 1;
  }

  get size() { return this.players.size; }

  lobbyMsg() {
    return {
      type: 'lobby', room: this.code, hostId: this.hostId, phase: this.phase, levelStart: this.levelStart,
      players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, charId: p.charId })),
    };
  }

  broadcast(msg, except = null) {
    for (const p of this.players.values()) if (p !== except) p.conn.send(msg);
  }

  freeChar(wish) {
    const taken = new Set([...this.players.values()].map(p => p.charId));
    if (wish && CHARS.includes(wish) && !taken.has(wish)) return wish;
    return CHARS.find(c => !taken.has(c)) || null;
  }

  // Neuer Spieler (Raum erstellen oder beitreten). Gibt den Spieler zurueck oder null.
  add(conn, msg, asHost = false) {
    if (this.players.size >= MAX_PLAYERS) {
      conn.send({ type: 'error', msg: 'Der Raum ist schon voll (4 Spieler).', fatal: true });
      return null;
    }
    const p = { id: 'p' + this.nextId++, conn, name: cleanName(msg.name), charId: this.freeChar(msg.charId) };
    this.players.set(p.id, p);
    if (asHost || !this.hostId) this.hostId = p.id;
    conn.send({ type: 'joined', room: this.code, id: p.id, host: this.hostId === p.id });
    this.broadcast(this.lobbyMsg());
    if (this.phase === 'play') {
      // Nachzuegler: direkt ins laufende Spiel
      conn.send({ type: 'start', levelStart: this.levelStart, map: this.map, players: this.lobbyMsg().players, events: this.events });
    }
    return p;
  }

  message(p, msg) {
    switch (msg.type) {
      case 'pick': {
        if (!CHARS.includes(msg.charId) || this.phase === 'play') return;
        if ([...this.players.values()].some(o => o !== p && o.charId === msg.charId)) return;
        p.charId = msg.charId;
        this.broadcast(this.lobbyMsg());
        return;
      }
      case 'start': {
        if (p.id !== this.hostId) return;
        this.phase = 'play';
        this.levelStart = this.now() + 600;
        this.events = []; this.keys = new Set();
        this.map = msg.map | 0;
        this.broadcast({ type: 'start', levelStart: this.levelStart, map: this.map, players: this.lobbyMsg().players, events: [] });
        this.broadcast(this.lobbyMsg());
        return;
      }
      case 'st':
        this.broadcast({ type: 'st', id: p.id, t: msg.t, s: msg.s }, p);
        return;
      case 'fx':
        this.broadcast({ type: 'fx', id: p.id, fx: msg.fx }, p);
        return;
      case 'ev': {
        const ev = msg.ev;
        if (!ev || typeof ev !== 'object') return;
        ev.by = p.id;
        const key = eventKey(ev);
        if (key) {
          if (this.keys.has(key)) return;
          this.keys.add(key);
          this.events.push(ev);
          if (this.events.length > 2000) this.events.shift();
        }
        this.broadcast({ type: 'ev', id: p.id, ev }, p);
        return;
      }
    }
  }

  // Spieler geht. Gibt true zurueck, wenn der Raum jetzt leer ist.
  remove(p) {
    if (!this.players.has(p.id)) return this.players.size === 0;
    this.players.delete(p.id);
    this.broadcast({ type: 'left', id: p.id });
    if (this.players.size === 0) return true;
    if (this.hostId === p.id) this.hostId = this.players.keys().next().value;
    this.broadcast(this.lobbyMsg());
    return false;
  }
}
