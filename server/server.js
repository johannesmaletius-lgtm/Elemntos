// Elementos-Server: liefert das Spiel aus (public/) und verwaltet
// Mehrspieler-Raeume ueber WebSocket (/ws). Start: npm start
// (Ohne Server – z.B. auf GitHub Pages – verbinden sich die Spieler direkt per WebRTC.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { Room, makeCode } from '../public/js/room.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const PORT = +(process.env.PORT || 3000);
const T0 = Date.now();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') { res.writeHead(200); res.end('ok'); return; }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Nicht gefunden'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
});

const rooms = new Map();
const now = () => Date.now() - T0;

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  let me = null, room = null;
  const conn = { send: (msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); } };

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'ping') { conn.send({ type: 'pong', c: msg.c, s: now() }); return; }
    if (!room) {
      if (msg.type === 'create') {
        const r = new Room(makeCode(c => rooms.has(c)), now);
        rooms.set(r.code, r);
        room = r; me = r.add(conn, msg, true);
        log(`Raum ${r.code} erstellt von ${me.name}`);
      } else if (msg.type === 'join') {
        const code = String(msg.room || '').toUpperCase();
        const r = rooms.get(code);
        if (!r) { conn.send({ type: 'error', msg: `Raum ${code} gibt es nicht (mehr).`, fatal: true }); return; }
        const p = r.add(conn, msg);
        if (!p) return;
        room = r; me = p;
        log(`${me.name} betritt Raum ${code} (${r.size}/4)`);
      }
      return;
    }
    room.message(me, msg);
  });

  ws.on('close', () => {
    if (!room || !me) return;
    if (room.remove(me)) { rooms.delete(room.code); log(`Raum ${room.code} geschlossen`); }
  });
});

function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

server.listen(PORT, () => {
  console.log(`\n  Elementos läuft!  →  http://localhost:${PORT}`);
  for (const ifs of Object.values(os.networkInterfaces())) {
    for (const i of ifs || []) if (i.family === 'IPv4' && !i.internal) console.log(`  Im WLAN (Handy):  →  http://${i.address}:${PORT}`);
  }
  console.log('');
});
