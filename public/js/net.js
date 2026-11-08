// Mehrspieler-Client. Zwei Wege:
//  1) Node-Server (npm start / Render): WebSocket zu /ws.
//  2) Ohne Server (z.B. GitHub Pages): Peer-to-Peer per WebRTC (PeerJS).
//     Das Geraet des Gastgebers verwaltet dann den Raum selbst.
import { Room, makeCode } from './room.js';

const PEER_PREFIX = 'elementos-w1-';

function loadScript(src) {
  return new Promise((res, rej) => {
    if (window.Peer) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error('PeerJS konnte nicht geladen werden'));
    document.head.appendChild(s);
  });
}

function peerOptions() {
  // Fuer Tests kann ein eigener PeerJS-Server angegeben werden: ?peerserver=host:port
  const q = new URLSearchParams(location.search);
  const ps = q.get('peerserver');
  const o = { debug: 0 };
  if (ps) {
    const [host, port] = ps.split(':');
    Object.assign(o, { host, port: +(port || 9000), path: '/', secure: location.protocol === 'https:' });
  }
  if (q.get('noice') === '1') o.config = { iceServers: [] };
  return o;
}

export class Net {
  constructor() {
    this.handlers = {};
    this.offset = 0; this.bestRtt = 1e9;
    this.levelStart = 0;
    this.id = null; this.room = null; this.host = false;
    this.connected = false;
    this.mode = null;         // 'ws' | 'p2p-host' | 'p2p-guest'
  }

  on(type, fn) { (this.handlers[type] ||= []).push(fn); return this; }
  _emit(type, msg) { for (const fn of this.handlers[type] || []) fn(msg); }

  _dispatch(msg) {
    if (msg.type === 'pong') { this._pong(msg); return; }
    if (msg.type === 'joined') {
      this.id = msg.id; this.room = msg.room; this.host = msg.host;
      if (this.mode === 'p2p-guest') this._openFast();
    }
    if (msg.type === 'lobby') { this.host = msg.hostId === this.id; }
    if (msg.type === 'start') this.levelStart = msg.levelStart;
    this._emit(msg.type, msg);
  }

  static wantsP2P() {
    const q = new URLSearchParams(location.search);
    if (q.get('p2p') === '1') return true;
    if (q.get('p2p') === '0') return false;
    return location.protocol === 'file:' || /\.github\.io$/.test(location.hostname) || !!window.__EW_STATIC;
  }

  // opts: { mode: 'host' | 'join', code }
  async connect(opts) {
    if (!Net.wantsP2P()) {
      try { await this._connectWs(); return; } catch { /* kein Server -> Peer-to-Peer */ }
    }
    if (opts.mode === 'host') await this._p2pHost();
    else await this._p2pJoin(opts.code);
  }

  // ---------- WebSocket (Node-Server) ----------
  _connectWs() {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      let ws;
      try { ws = new WebSocket(`${proto}//${location.host}/ws`); } catch (e) { reject(e); return; }
      const to = setTimeout(() => { reject(new Error('timeout')); try { ws.close(); } catch {} }, 2500);
      ws.onopen = () => {
        clearTimeout(to);
        this.ws = ws; this.mode = 'ws'; this.connected = true;
        this._pingLoop();
        resolve();
      };
      ws.onerror = () => { clearTimeout(to); if (!this.connected) reject(new Error('Verbindung fehlgeschlagen')); };
      ws.onclose = () => { if (this.mode !== 'ws') return; this.connected = false; clearInterval(this._pingT); this._emit('close', {}); };
      ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } this._dispatch(m); };
    });
  }

  // ---------- Peer-to-Peer: Gastgeber ----------
  async _p2pHost() {
    await loadScript('vendor/peerjs.min.js');
    let tries = 0;
    for (;;) {
      const code = makeCode();
      try {
        this.peer = await this._openPeer(PEER_PREFIX + code);
        this.roomObj = new Room(code, () => performance.now());
        break;
      } catch (e) {
        if (e && e.type === 'unavailable-id' && tries++ < 5) continue;
        throw e;
      }
    }
    this.mode = 'p2p-host'; this.connected = true;
    // eigener Spieler: direkte Verbindung ohne Netzwerk
    this.loop = { send: (msg) => { const copy = JSON.parse(JSON.stringify(msg)); queueMicrotask(() => this._dispatch(copy)); } };
    this.peer.on('connection', (dc) => {
      if (dc.metadata && dc.metadata.fast) this._acceptFast(dc);
      else this._acceptGuest(dc);
    });
    // beim Schliessen der Seite die Gaeste informieren
    this._bye = () => this.roomObj && this.roomObj.broadcast({ type: 'error', msg: 'Der Gastgeber hat das Spiel verlassen.', fatal: true }, this.me);
    window.addEventListener('pagehide', this._bye);
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch {} });
    this.peer.on('error', (e) => console.warn('PeerJS:', e.type || e));
  }

  // zweiter, ungeordneter Kanal nur fuer Positionen: verlorene Pakete halten
  // die folgenden nicht auf (kein Ruckeln bei schlechtem Netz)
  _acceptFast(dc) {
    const room = this.roomObj;
    const player = room.players.get(dc.metadata.fast);
    if (!player || player.fast) { setTimeout(() => { try { dc.close(); } catch {} }, 200); return; }
    player.fast = dc;
    dc.on('open', () => { player.conn.sendFast = (msg) => { try { if (dc.open) dc.send(msg); else player.conn.send(msg); } catch {} }; });
    dc.on('data', (msg) => { if (msg && msg.type === 'st' && room.players.get(player.id) === player) room.message(player, msg); });
    const gone = () => { if (player.fast === dc) { player.fast = null; delete player.conn.sendFast; } };
    dc.on('close', gone); dc.on('error', gone);
  }

  _openFast() {
    if (this.fdc || !this.peer || !this.code) return;
    try {
      const f = this.peer.connect(PEER_PREFIX + this.code, { reliable: false, serialization: 'json', metadata: { fast: this.id } });
      this.fdc = f;
      f.on('data', (msg) => { if (msg && typeof msg === 'object') this._dispatch(msg); });
      f.on('close', () => { if (this.fdc === f) this.fdc = null; });
      f.on('error', () => { if (this.fdc === f) this.fdc = null; });
    } catch { this.fdc = null; }
  }

  _acceptGuest(dc) {
    const room = this.roomObj;
    let player = null;
    const conn = { send: (msg) => { try { if (dc.open) dc.send(msg); } catch {} } };
    dc.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'ping') { conn.send({ type: 'pong', c: msg.c, s: room.now() }); return; }
      if (!player) {
        if (msg.type === 'join') player = room.add(conn, msg);
        if (!player) setTimeout(() => { try { dc.close(); } catch {} }, 500);
        return;
      }
      room.message(player, msg);
    });
    const gone = () => { if (player) { try { player.fast && player.fast.close(); } catch {} room.remove(player); player = null; } };
    dc.on('close', gone);
    dc.on('error', gone);
  }

  // ---------- Peer-to-Peer: Gast ----------
  async _p2pJoin(code) {
    await loadScript('vendor/peerjs.min.js');
    this.peer = await this._openPeer(null);
    this.code = String(code).toUpperCase();
    const dc = this.peer.connect(PEER_PREFIX + this.code, { reliable: true, serialization: 'json' });
    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('Der Raum wurde nicht gefunden. Ist der Gastgeber noch online?')), 15000);
      dc.on('open', () => { clearTimeout(to); resolve(); });
      this.peer.on('error', (e) => {
        clearTimeout(to);
        reject(new Error(e && e.type === 'peer-unavailable' ? `Raum ${code} gibt es nicht (mehr).` : 'Verbindung fehlgeschlagen.'));
      });
    });
    this.dc = dc; this.mode = 'p2p-guest'; this.connected = true;
    dc.on('data', (msg) => { if (msg && typeof msg === 'object') this._dispatch(msg); });
    dc.on('close', () => { if (this.mode !== 'p2p-guest') return; this.mode = null; this.connected = false; clearInterval(this._pingT); this._emit('close', {}); });
    this._pingLoop();
  }

  _openPeer(id) {
    return new Promise((resolve, reject) => {
      const peer = id ? new window.Peer(id, peerOptions()) : new window.Peer(peerOptions());
      const to = setTimeout(() => { reject(new Error('Keine Verbindung zum Vermittlungsserver.')); try { peer.destroy(); } catch {} }, 12000);
      peer.on('open', () => { clearTimeout(to); resolve(peer); });
      peer.on('error', (e) => { clearTimeout(to); try { peer.destroy(); } catch {} reject(e); });
    });
  }

  // ---------- Senden ----------
  send(obj) {
    if (obj.type === 'st') obj.t = Math.round(this.now());
    if (this.mode === 'ws') {
      if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
    } else if (this.mode === 'p2p-guest') {
      try {
        if (obj.type === 'st' && this.fdc && this.fdc.open) this.fdc.send(obj);
        else if (this.dc && this.dc.open) this.dc.send(obj);
      } catch {}
    } else if (this.mode === 'p2p-host') {
      const room = this.roomObj;
      if (obj.type === 'ping') return;
      if (!this.me) {
        if (obj.type === 'create') this.me = room.add(this.loop, obj, true);
        return;
      }
      room.message(this.me, JSON.parse(JSON.stringify(obj)));
    }
  }

  _pingLoop() {
    this.lastPong = performance.now();
    const ping = () => {
      // keine Antwort mehr -> Verbindung gilt als getrennt
      if (this.mode && this.mode !== 'p2p-host' && performance.now() - this.lastPong > 9000) {
        const m = this.mode; this.close(); if (m) this._emit('close', {});
        return;
      }
      this.send({ type: 'ping', c: performance.now() });
    };
    ping(); setTimeout(ping, 300); setTimeout(ping, 700);
    this._pingT = setInterval(ping, 2000);
  }
  _pong(m) {
    const now = performance.now();
    this.lastPong = now;
    const rtt = now - m.c;
    this.rtt = rtt;
    if (rtt < this.bestRtt * 1.3 || this.bestRtt === 1e9) {
      const off = m.s - (m.c + rtt / 2);
      this.offset = this.bestRtt === 1e9 ? off : this.offset * 0.7 + off * 0.3;
      this.bestRtt = Math.min(this.bestRtt, rtt);
    }
  }
  // gemeinsame Raumzeit in ms (beim Gastgeber: eigene Uhr)
  now() { return performance.now() + (this.mode === 'p2p-host' ? 0 : this.offset); }

  close() {
    const m = this.mode;
    this.mode = null; this.connected = false;
    clearInterval(this._pingT);
    try { this.ws && this.ws.close(); } catch {}
    try { this.dc && this.dc.close(); } catch {}
    try { this.fdc && this.fdc.close(); } catch {}
    try { this.peer && this.peer.destroy(); } catch {}
    if (this._bye) window.removeEventListener('pagehide', this._bye);
    void m;
  }
}
