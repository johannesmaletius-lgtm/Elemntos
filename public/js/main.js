// Einstieg: Menues, Charakterwahl, Lobby, Spielstart (allein oder online).
import { CHARACTERS, CHAR_ORDER } from './config.js';
import { WORLD1 } from './levels/world1.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { loadRig, neutralPose } from './rig.js';
import { targetPose, createAnimState } from './anim.js';
import { initAudio, startMusic, stopMusic, isMuted, setMuted, sfx } from './audio.js';
import { load, save, setUrl } from './storage.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const input = new Input(document.body);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const WORLDS = [WORLD1];
const state = {
  screen: 'title',
  mode: 'solo',          // solo | host | join
  charId: load('ew-char', 'air'),
  name: load('ew-name', ''),
  game: null,
  demo: null,
  net: null,
  lobby: null,
  joinCode: null,
  mapIndex: 0,
};

// ---------- Hilfen ----------
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== id);
  state.screen = id;
}
function hideScreens() { for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden'); state.screen = null; }
function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t * 10) % 10);
  return `${m}:${String(s).padStart(2, '0')}.${d}`;
}
let toastT = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1800);
}
function message(title, text, onOk) {
  $('#msg-title').textContent = title; $('#msg-text').textContent = text;
  const prev = state.screen;
  show('scr-msg');
  $('#btn-msg-ok').onclick = () => { if (onOk) onOk(); else show(prev && prev !== 'scr-msg' ? prev : 'scr-title'); };
}
function updateMuteButtons() {
  const t = isMuted() ? '🔇 Ton aus' : '🔊 Ton an';
  $('#btn-mute').textContent = t; $('#btn-mute2').textContent = t;
}
function randomName() {
  const n = ['Wolke', 'Funke', 'Welle', 'Moos', 'Böe', 'Glut', 'Tau', 'Kiesel'];
  return n[Math.floor(Math.random() * n.length)] + Math.floor(Math.random() * 90 + 10);
}

async function enterFullscreen() {
  if (!isTouch) return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
  } catch { /* iOS: nicht unterstuetzt */ }
}

// ---------- Charakter-Vorschauen ----------
const previews = []; // {canvas, charId, getState}
const rigs = {};
Promise.all(CHAR_ORDER.map(async id => { rigs[id] = await loadRig(id); }));

function addPreview(cv, charId, mode) {
  previews.push({ cv, charId, mode, anim: createAnimState() });
}
function drawPreviews(time) {
  for (const p of previews) {
    if (!p.cv.isConnected) continue;
    const rig = rigs[p.charId];
    const r = p.cv.getBoundingClientRect();
    if (r.width === 0) continue;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (p.cv.width !== W || p.cv.height !== H) { p.cv.width = W; p.cv.height = H; }
    const ctx = p.cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (!rig) continue;
    const mode = typeof p.mode === 'function' ? p.mode() : p.mode;
    const fake = { vx: 0, vy: 0, onGround: true, facing: 1, flipT: 0, flipDur: 0.36, dashT: 0, pound: null, gliding: false, skid: false, throwT: 0, dead: false, finished: false, invuln: 0, charId: p.charId };
    if (mode === 'run') { fake.vx = 9; p.anim.phase = time * 9 * Math.PI * 2 / 3.1; }
    if (mode === 'cheer') fake.finished = true;
    const { T } = targetPose(p.anim, fake, 0, time);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const h = H * 0.9;
    rig.draw(ctx, T, W / 2, H * 0.97, h, 1, time);
  }
}

function buildTitleChars() {
  const box = $('#title-chars');
  box.innerHTML = '';
  for (const id of CHAR_ORDER) {
    const cv = document.createElement('canvas');
    box.appendChild(cv);
    addPreview(cv, id, 'cheer');
  }
}

function buildCharGrid(el, { onPick, takenBy = {}, selected }) {
  el.innerHTML = '';
  for (const id of CHAR_ORDER) {
    const ch = CHARACTERS[id];
    const card = document.createElement('div');
    card.className = 'char-card';
    card.style.borderColor = ch.color;
    card.style.background = `linear-gradient(180deg, ${ch.color}55, #f6f8fc 70%)`;
    const who = takenBy[id];
    if (who && who.self === false) card.classList.add('taken');
    if (selected === id) card.classList.add('sel');
    card.innerHTML = `${who ? `<div class="who">${who.name}</div>` : ''}<canvas></canvas><div class="el">${ch.icon} ${ch.element}</div><div class="ab">${ch.ability}</div>`;
    const cv = card.querySelector('canvas');
    addPreview(cv, id, () => (card.classList.contains('sel') ? 'run' : 'idle'));
    card.onclick = () => { initAudio(); onPick(id); };
    el.appendChild(card);
  }
}

// ---------- Titel ----------
function goTitle() {
  stopGame();
  leaveNet();
  show('scr-title');
  buildTitleChars();
  setUrl(location.pathname);
}

$('#btn-solo').onclick = () => { initAudio(); state.mode = 'solo'; openSelect(); };
$('#btn-host').onclick = () => { initAudio(); state.mode = 'host'; openSelect(); };
$('#btn-mute').onclick = () => { initAudio(); setMuted(!isMuted()); updateMuteButtons(); };
$('#btn-mute2').onclick = () => { setMuted(!isMuted()); updateMuteButtons(); };
updateMuteButtons();

// ---------- Auswahl ----------
function openSelect() {
  show('scr-select');
  $('#inp-name').value = state.name || randomName();
  $('#select-title').textContent = state.mode === 'join' ? `Raum ${state.joinCode} beitreten` : 'Wähle dein Element';
  $('#btn-select-go').textContent = state.mode === 'solo' ? "Los geht's!" : state.mode === 'host' ? 'Raum erstellen' : 'Beitreten';
  const render = () => buildCharGrid($('#char-grid'), { selected: state.charId, onPick: (id) => { state.charId = id; render(); } });
  render();
}
$('#btn-select-back').onclick = () => goTitle();
$('#btn-select-go').onclick = async () => {
  initAudio();
  state.name = ($('#inp-name').value || '').trim().slice(0, 12) || randomName();
  save('ew-name', state.name);
  save('ew-char', state.charId);
  if (state.mode === 'solo') { await enterFullscreen(); startSolo(); }
  else await connectOnline();
};

// ---------- Solo ----------
function startSolo() {
  startGame({ net: null, players: [{ id: 'me', name: state.name, charId: state.charId }], myId: 'me' });
}

// ---------- Online ----------
async function connectOnline() {
  const net = new Net();
  const btn = $('#btn-select-go');
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Verbinde …';
  try {
    await net.connect({ mode: state.mode === 'host' ? 'host' : 'join', code: state.joinCode });
  } catch (e) {
    btn.disabled = false; btn.textContent = label;
    message('Keine Verbindung', window.__EW_PREVIEW
      ? 'In dieser Vorschau gibt es nur den Einzelspieler-Modus. Für Mehrspieler das Spiel über GitHub Pages oder den Spiel-Server öffnen – siehe README.'
      : (e && e.message) || 'Verbindung fehlgeschlagen.');
    net.close();
    return;
  }
  btn.disabled = false; btn.textContent = label;
  state.net = net;
  net.on('joined', (m) => {
    const link = `${location.origin}${location.pathname}?raum=${m.room}`;
    $('#lobby-code').textContent = m.room;
    $('#lobby-link').value = link;
    setUrl(`?raum=${m.room}`);
  });
  net.on('lobby', (m) => onLobby(m));
  net.on('start', (m) => onNetStart(m));
  net.on('st', (m) => { const p = state.game && state.game.players.get(m.id); if (p && p.remote) p.push(m.t, m.s); });
  net.on('ev', (m) => { if (state.game) state.game.applyEvent(m.ev, true); });
  net.on('fx', (m) => { if (state.game) state.game.applyFx(m.fx, m.id); });
  net.on('left', (m) => { if (state.game) { const p = state.game.players.get(m.id); if (p) toast(`${p.name} hat das Spiel verlassen`); state.game.removeRemote(m.id); state.game._checkAllFinished(); } });
  net.on('error', (m) => {
    if (m.fatal) { leaveNet(); if (state.game) input.enabled = false; message('Hinweis', m.msg, () => goTitle()); }
    else message('Hinweis', m.msg);
  });
  net.on('close', () => {
    if (state.net !== net) return;
    state.net = null;
    if (state.screen === 'scr-title') return;
    if (state.game) input.enabled = false;
    message('Verbindung getrennt', 'Die Verbindung zum Raum wurde unterbrochen.', () => goTitle());
  });
  if (state.mode === 'host') net.send({ type: 'create', name: state.name, charId: state.charId });
  else net.send({ type: 'join', room: state.joinCode, name: state.name, charId: state.charId });
}

function onLobby(m) {
  state.lobby = m;
  const me = m.players.find(p => p.id === state.net.id);
  if (me && me.charId) state.charId = me.charId;
  if (m.phase === 'play' && state.game) {
    // Spieler kommen/gehen waehrend des Spiels
    for (const p of m.players) if (p.id !== state.net.id && p.charId && !state.game.players.has(p.id)) { state.game.addRemote(p.id, p.charId, p.name); toast(`${p.name} ist beigetreten!`); sfx('join'); }
    return;
  }
  if (state.screen !== 'scr-lobby' && !state.game) show('scr-lobby');
  if (state.game) return;
  const takenBy = {};
  for (const p of m.players) if (p.charId) takenBy[p.charId] = { name: p.name, self: p.id === state.net.id };
  buildCharGrid($('#lobby-grid'), {
    selected: me && me.charId, takenBy,
    onPick: (id) => { if (takenBy[id] && !takenBy[id].self) return; state.net.send({ type: 'pick', charId: id }); },
  });
  const isHost = m.hostId === state.net.id;
  const n = m.players.length;
  $('#btn-lobby-start').disabled = !isHost || m.players.some(p => !p.charId);
  $('#btn-lobby-start').textContent = isHost ? `Spiel starten (${n}/4)` : 'Warte auf Host …';
  const p2pHost = state.net.mode === 'p2p-host';
  $('#lobby-hint').textContent = isHost
    ? `Teile den Link mit bis zu 3 Freunden. Jeder wählt ein anderes Element.${p2pHost ? ' Lass diese Seite offen – dein Gerät ist der Raum.' : ''}`
    : 'Wähle ein freies Element. Der Host startet das Spiel.';
}

$('#btn-share').onclick = async () => {
  const url = $('#lobby-link').value;
  if (navigator.share) { try { await navigator.share({ title: 'Elementos', text: 'Spiel mit mir Elementos!', url }); return; } catch { /* abgebrochen */ } }
  copyLink();
};
$('#btn-copy').onclick = () => copyLink();
async function copyLink() {
  const inp = $('#lobby-link');
  try { await navigator.clipboard.writeText(inp.value); toastLobby('Link kopiert!'); }
  catch { inp.select(); document.execCommand('copy'); toastLobby('Link kopiert!'); }
}
function toastLobby(msg) { $('#lobby-hint').textContent = msg; }
$('#btn-lobby-leave').onclick = () => goTitle();
$('#btn-lobby-start').onclick = async () => { await enterFullscreen(); state.net.send({ type: 'start', map: state.mapIndex }); };

function onNetStart(m) {
  const players = m.players.filter(p => p.charId);
  startGame({ net: state.net, players, myId: state.net.id, events: m.events || [] });
}

function leaveNet() {
  if (state.net) { const n = state.net; state.net = null; n.close(); }
  state.lobby = null;
}

// ---------- Spiel ----------
async function startGame({ net, players, myId, events = [] }) {
  stopGame(true);
  const me = players.find(p => p.id === myId);
  const worldDef = WORLDS[0];
  const levelDef = worldDef.maps[state.mapIndex];
  const game = new Game({
    canvas, levelDef, worldDef, net,
    local: { id: myId, charId: me.charId, name: me.name },
    onFinish: (res) => showResults(res),
    onHud: () => updateHud(),
  });
  game.onToast = toast;
  for (const p of players) if (p.id !== myId) game.addRemote(p.id, p.charId, p.name);
  await game.load();
  for (const ev of events) game.applyEvent(ev, true);
  if (events.length) { const r = game.respawnPoint(); game.me.reset(r.x, r.y - 0.01); game._snapCamera(); }
  state.game = game;
  if (state.demo) state.demo = null;
  hideScreens();
  $('#hud').classList.remove('hidden');
  $('#touch').classList.toggle('hidden', !isTouch);
  setupHud(game);
  input.enabled = true;
  startMusic();
  setTimeout(() => $('#stick-hint').style.opacity = '0', 6000);
}

function stopGame(keepNet = false) {
  if (state.game) { state.game = null; }
  stopMusic();
  $('#hud').classList.add('hidden');
  $('#touch').classList.add('hidden');
  if (!keepNet) { /* nichts */ }
  ensureDemo();
}

function setupHud(game) {
  const ch = CHARACTERS[game.me.charId];
  $('#hud-ability').textContent = `${ch.icon} ${ch.ability}`;
  $('#btn-ability-ico').textContent = ch.icon;
  $('#btn-ability').style.background = ch.color + 'cc';
  const gems = $('#hud-gems');
  gems.innerHTML = '';
  for (let i = 0; i < game.level.totalGems; i++) { const d = document.createElement('div'); d.className = 'gem-slot'; gems.appendChild(d); }
  $('#pause-help').innerHTML = `<b>${ch.icon} ${ch.element}: ${ch.ability}</b><br>${ch.abilityHint}<br>Mumien: von oben draufspringen! Die große Mumie braucht zwei Sprünge.<br><span class="small">Tastatur: ←/→ laufen · Shift rennen · Leertaste springen · E Fähigkeit</span>`;
  updateHud();
}

let hudCache = {};
function updateHud() {
  const g = state.game;
  if (!g) return;
  const coins = `${g.teamCoins}`;
  if (hudCache.coins !== coins) { $('#hud-coins').textContent = coins; hudCache.coins = coins; }
  if (hudCache.gems !== g.teamGems) {
    hudCache.gems = g.teamGems;
    [...$('#hud-gems').children].forEach((d, i) => d.classList.toggle('on', i < g.teamGems));
  }
}

function showResults(res) {
  const g = state.game;
  input.enabled = false;
  $('#scr-wait').classList.add('hidden');
  show('scr-results');
  $('#res-title').textContent = 'Geschafft! 🎉';
  $('#res-stats').innerHTML = `
    <div class="res-stat">Zeit<b>${fmtTime(res.time)}</b></div>
    <div class="res-stat">Münzen<b>${res.coins}/${res.totalCoins}</b></div>
    <div class="res-stat">Kristalle<b>${res.gems}/${res.totalGems}</b></div>
    <div class="res-stat">Mumien<b>${res.enemies}/${res.totalEnemies}</b></div>`;
  $('#res-players').innerHTML = res.players.map(p => `<div class="res-player" style="background:${CHARACTERS[p.charId].dark}">${CHARACTERS[p.charId].icon} ${p.name} · ${p.coins} Münzen · ${p.deaths}× gestürzt${p.time ? ' · ' + fmtTime(p.time) : ''}</div>`).join('');
  const canAgain = !state.net || state.net.host;
  $('#btn-res-again').disabled = !canAgain;
  $('#btn-res-again').textContent = canAgain ? 'Nochmal' : 'Host startet neu …';
  void g;
}
$('#btn-res-menu').onclick = () => goTitle();
$('#btn-res-again').onclick = () => {
  if (state.net) state.net.send({ type: 'start', map: state.mapIndex });
  else startSolo();
};

// Pause
$('#btn-pause').onclick = () => openPause();
function openPause() {
  if (!state.game) return;
  if (!state.net) state.game.paused = true;
  input.enabled = false;
  show('scr-pause');
  $('#btn-restart').classList.toggle('hidden', !!state.net && !state.net.host);
}
$('#btn-resume').onclick = () => { hideScreens(); if (state.game) { state.game.paused = false; state.game._last = 0; } input.enabled = true; };
$('#btn-restart').onclick = () => { if (state.net) state.net.send({ type: 'start', map: state.mapIndex }); else startSolo(); };
$('#btn-menu').onclick = () => goTitle();
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state.screen === 'scr-pause') $('#btn-resume').onclick();
    else if (state.game && !state.screen) openPause();
  }
});
$('#btn-wait-results').onclick = () => { if (state.game) showResults(state.game.results()); };

// ---------- Hintergrund-Demo hinter den Menues ----------
function ensureDemo() {
  if (state.demo || state.game) return;
  const levelDef = WORLDS[0].maps[0];
  const demo = new Game({ canvas, levelDef, worldDef: WORLDS[0], net: null, local: { id: 'demo', charId: 'air', name: '' } });
  demo.demo = true;
  state.demo = demo;
}

// ---------- Schleife ----------
let lastHudTime = -1;
function loop(now) {
  requestAnimationFrame(loop);
  const t = now / 1000;
  const g = state.game;
  if (g) {
    const inp = input.poll();
    g.frame(now, inp);
    const tt = Math.floor(g.levelTime * 10);
    if (tt !== lastHudTime) { lastHudTime = tt; $('#hud-time').textContent = fmtTime(g.levelTime).slice(0, -2); }
    // Im Ziel, aber andere noch unterwegs
    const waiting = g.me.finished && !g.ended && g.players.size > 1;
    $('#scr-wait').classList.toggle('hidden', !waiting || state.screen === 'scr-results');
    if (g.me.finished && !g.ended && g.players.size === 1 && !g._soloDone) { g._soloDone = true; }
  } else if (state.demo) {
    const d = state.demo;
    d.time += 1 / 60;
    d.cam.x = (t * 2.2) % (d.level.w - d.viewW);
    d.cam.y = d.level.h - d.viewH - 0.5 + Math.sin(t * 0.3) * 1.5;
    for (const m of d.level.movers) d.level.moverAt(m, t);
    d.render();
  }
  if (state.screen === 'scr-title' || state.screen === 'scr-select' || state.screen === 'scr-lobby' || state.screen === 'scr-results') drawPreviews(t);
}

// ---------- Fenster ----------
function onResize() {
  if (state.game) state.game.resize();
  if (state.demo) state.demo.resize();
  const rot = $('#rotate');
  rot.classList.toggle('need', isTouch);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));
document.addEventListener('visibilitychange', () => { if (document.hidden && state.game && !state.net && !state.game.paused) openPause(); });

// ---------- Start ----------
const params = new URLSearchParams(location.search);
const code = (params.get('raum') || params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
ensureDemo();
onResize();
if (code) { state.mode = 'join'; state.joinCode = code; openSelect(); }
else { show('scr-title'); buildTitleChars(); }
requestAnimationFrame(loop);

// Debug-Zugriff fuer Tests
window.__ew = state;
