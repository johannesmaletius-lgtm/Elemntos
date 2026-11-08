// Einstieg: Menues, Charakterwahl, Weltkarte, Truppe (Mehrspieler), Spielstart.
//
// Ablauf allein:   Titel -> Figur -> Karte -> Level -> Ergebnis -> Karte ...
// Ablauf Truppe:   Titel -> Figur -> Raum (Karte mit Truppe) -> Gastgeber waehlt Level
//                  -> alle spielen -> Ergebnis -> Gastgeber: Karte / Nochmal / Weiter
import { CHARACTERS, CHAR_ORDER, GEM_COLORS, GEM_ORDER } from './config.js';
import { WORLD1 } from './levels/world1.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { loadRig } from './rig.js';
import { targetPose, createAnimState } from './anim.js';
import { initAudio, startMusic, stopMusic, isMuted, setMuted, sfx } from './audio.js';
import { load, save, setUrl } from './storage.js';
import { levelProgress, recordRun, recordGem, unlockedCount, levelInfo, worldGems } from './progress.js';
import { WorldMap, THEMES } from './worldmap.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const input = new Input(document.body);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

const WORLD = WORLD1;
const worldMap = new WorldMap(WORLD);
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
  mapIndex: Math.max(0, Math.min(WORLD.maps.length - 1, +load('ew-sel', '0') || 0)),
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
const online = () => !!state.net;
const isHost = () => !state.net || state.net.host;
const esc = (t) => String(t).replace(/[<>&"']/g, '');

async function enterFullscreen() {
  if (!isTouch) return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
  } catch { /* iOS: nicht unterstuetzt */ }
}

// ---------- Charakter-Vorschauen ----------
const previews = [];
const rigs = {};
Promise.all(CHAR_ORDER.map(async id => { rigs[id] = await loadRig(id); }));

function addPreview(cv, charId, mode) {
  previews.push({ cv, charId, mode, anim: createAnimState() });
}
function fakeState(charId, mode) {
  return { vx: mode === 'run' ? 9 : 0, vy: 0, onGround: true, facing: 1, flipT: 0, flipDur: 0.36, dashT: 0, pound: null, gliding: false, skid: false, throwT: 0, dead: false, finished: mode === 'cheer', invuln: 0, charId };
}
function drawPreviews(time) {
  for (let i = previews.length - 1; i >= 0; i--) {
    const p = previews[i];
    if (!p.cv.isConnected) { previews.splice(i, 1); continue; }
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
    if (mode === 'run') p.anim.phase = time * 9 * Math.PI * 2 / 3.1;
    const { T } = targetPose(p.anim, fakeState(p.charId, mode), 0, time);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    rig.draw(ctx, T, W / 2, H * 0.97, H * 0.9, 1, time);
  }
}
const mapAnims = {};
function drawMapChar(ctx, charId, x, y, h, time) {
  const rig = rigs[charId];
  if (!rig) return;
  const a = mapAnims[charId] || (mapAnims[charId] = createAnimState());
  const { T } = targetPose(a, fakeState(charId, 'idle'), 0, time);
  ctx.imageSmoothingEnabled = true;
  rig.draw(ctx, T, x, y, h, 1, time);
}

function buildTitleChars() {
  const box = $('#title-chars');
  box.innerHTML = '';
  for (const id of CHAR_ORDER) {
    const cv = document.createElement('canvas');
    box.appendChild(cv);
    addPreview(cv, id, 'cheer');
  }
  const g = worldGems(WORLD), u = unlockedCount(WORLD);
  $('#title-progress').textContent = g.have || u > 1
    ? `Fortschritt: Level ${u}/${WORLD.maps.length} offen · ${g.have}/${g.total} Kristalle`
    : 'Bis zu 4 Spieler – lade Freunde per Link oder Code ein.';
}

function buildCharGrid(el, { onPick, selected }) {
  el.innerHTML = '';
  for (const id of CHAR_ORDER) {
    const ch = CHARACTERS[id];
    const card = document.createElement('div');
    card.className = 'char-card';
    card.style.borderColor = ch.color;
    card.style.background = `linear-gradient(180deg, ${ch.color}55, #f6f8fc 70%)`;
    if (selected === id) card.classList.add('sel');
    card.innerHTML = `<canvas></canvas><div class="el">${ch.icon} ${ch.element}</div><div class="ab">${ch.ability}</div>`;
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
$('#btn-join').onclick = () => {
  initAudio();
  const code = ($('#inp-code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { $('#inp-code').focus(); toastTitle('Bitte den 4-stelligen Code eingeben.'); return; }
  state.mode = 'join'; state.joinCode = code; openSelect();
};
$('#inp-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-join').onclick(); });
function toastTitle(t) { $('#title-progress').textContent = t; }
$('#btn-mute').onclick = () => { initAudio(); setMuted(!isMuted()); updateMuteButtons(); };
$('#btn-mute2').onclick = () => { setMuted(!isMuted()); updateMuteButtons(); };
updateMuteButtons();

// ---------- Auswahl ----------
function openSelect() {
  show('scr-select');
  $('#inp-name').value = state.name || randomName();
  $('#select-title').textContent = state.mode === 'join' ? `Truppe ${state.joinCode} beitreten` : 'Wähle dein Element';
  $('#btn-select-go').textContent = state.mode === 'solo' ? 'Zur Karte' : state.mode === 'host' ? 'Truppe gründen' : 'Beitreten';
  const render = () => buildCharGrid($('#char-grid'), { selected: state.charId, onPick: (id) => { state.charId = id; render(); } });
  render();
}
$('#btn-select-back').onclick = () => goTitle();
$('#btn-select-go').onclick = async () => {
  initAudio();
  state.name = ($('#inp-name').value || '').trim().slice(0, 12) || randomName();
  save('ew-name', state.name);
  save('ew-char', state.charId);
  if (state.mode === 'solo') openMap();
  else await connectOnline();
};

// ---------- Karte ----------
function mapUnlocked() {
  let u = unlockedCount(WORLD);
  if (state.lobby) for (const p of state.lobby.players) u = Math.max(u, p.unlocked || 1);
  return Math.min(u, WORLD.maps.length);
}
function mapParty() {
  if (state.lobby) return state.lobby.players.filter(p => p.charId).map(p => p.charId);
  return [state.charId];
}

function openMap() {
  stopGame();
  show('scr-map');
  if (state.mapIndex >= mapUnlocked()) state.mapIndex = mapUnlocked() - 1;
  renderMapUi();
}

function selectLevel(i) {
  if (i < 0 || i >= mapUnlocked()) { if (i >= 0) toast('Erst das Level davor schaffen!'); return; }
  if (online() && !isHost()) return;
  state.mapIndex = i;
  save('ew-sel', String(i));
  if (online()) state.net.send({ type: 'sel', map: i });
  sfx('coin');
  renderMapUi();
}

function gemChip(el, have, extra = '') {
  const G = GEM_COLORS[el];
  return `<div class="lv-gem ${have ? 'have' : ''}" title="${G.name}-Kristall${have ? ' (gefunden)' : ''}" style="--gc:${G.mid};--gd:${G.dark}"><i></i>${G.name}${extra}</div>`;
}

function renderMapUi() {
  if (state.screen !== 'scr-map') return;
  const i = state.mapIndex, def = WORLD.maps[i];
  const prog = levelProgress(def.id), info = levelInfo(def);
  const wg = worldGems(WORLD);
  $('#map-gems').textContent = `💎 ${wg.have}/${wg.total}`;
  $('#lv-num').textContent = `Level ${i + 1}`;
  $('#lv-theme').textContent = (THEMES[def.theme] || THEMES.day).label;
  $('#lv-name').textContent = def.name;
  const gems = [...info.gems].sort((a, b) => GEM_ORDER.indexOf(a.el) - GEM_ORDER.indexOf(b.el));
  $('#lv-gems').innerHTML = gems.map(g => gemChip(g.el, prog.gems.includes(g.id))).join('');
  $('#lv-stats').textContent = prog.done
    ? `Bestzeit ${fmtTime(prog.best || 0)} · Münzen ${prog.coins}/${info.coins}`
    : 'Noch nicht geschafft';
  const play = $('#btn-map-play');
  if (online()) {
    const lob = state.lobby;
    const allChars = lob && lob.players.every(p => p.charId);
    play.disabled = !isHost() || !allChars;
    play.textContent = isHost() ? `Los! (${lob ? lob.players.length : 1}/4)` : 'Gastgeber startet …';
  } else { play.disabled = false; play.textContent = 'Los!'; }
  $('#btn-map-back').textContent = online() ? '◀ Verlassen' : '◀ Menü';
  // Truppe
  $('#map-party').classList.toggle('hidden', !online());
  if (online() && state.lobby) {
    const lob = state.lobby;
    $('#party-code').textContent = lob.room;
    const rows = lob.players.map(p => {
      const ch = CHARACTERS[p.charId] || { icon: '❔', dark: '#555' };
      const tags = [p.id === lob.hostId ? '👑 Gastgeber' : '', p.id === state.net.id ? 'du' : ''].filter(Boolean).join(' · ');
      return `<div class="party-member" style="background:${ch.dark}"><span class="pm-ico">${ch.icon}</span><span class="pm-name">${esc(p.name)}</span>${tags ? `<span class="pm-tag">${tags}</span>` : ''}</div>`;
    });
    const free = 4 - lob.players.length;
    if (free > 0) rows.push(`<div class="party-empty">+ ${free} ${free === 1 ? 'freier Platz' : 'freie Plätze'} – lade Freunde ein</div>`);
    $('#party-list').innerHTML = rows.join('');
  }
  // Figurenwahl
  const taken = {};
  if (state.lobby) for (const p of state.lobby.players) if (p.charId && p.id !== state.net?.id) taken[p.charId] = p.name;
  const box = $('#map-chars');
  box.innerHTML = '';
  for (const id of CHAR_ORDER) {
    const ch = CHARACTERS[id];
    const b = document.createElement('button');
    b.style.setProperty('--cc', ch.color);
    b.className = id === state.charId ? 'sel' : '';
    b.disabled = !!taken[id];
    b.title = taken[id] ? `${ch.element} – gewählt von ${taken[id]}` : `${ch.element}: ${ch.ability}`;
    b.innerHTML = `<span class="ci">${ch.icon}</span><span class="cl">${ch.element}</span>`;
    b.onclick = () => pickChar(id);
    box.appendChild(b);
  }
}

function pickChar(id) {
  initAudio();
  if (online()) { state.net.send({ type: 'pick', charId: id }); return; }
  state.charId = id; save('ew-char', id); sfx('join'); renderMapUi();
}

$('#btn-map-play').onclick = async () => {
  initAudio();
  await enterFullscreen();
  if (online()) { if (isHost()) state.net.send({ type: 'start', map: state.mapIndex }); }
  else startSolo(state.mapIndex);
};
$('#btn-map-back').onclick = () => goTitle();
$('#btn-party-invite').onclick = async () => {
  if (!state.lobby) return;
  const url = `${location.origin}${location.pathname}?raum=${state.lobby.room}`;
  if (navigator.share) { try { await navigator.share({ title: 'Elementos', text: `Komm in meine Elementos-Truppe! Code: ${state.lobby.room}`, url }); return; } catch { /* abgebrochen */ } }
  try { await navigator.clipboard.writeText(url); toast('Einladungslink kopiert!'); }
  catch { const inp = $('#party-link'); inp.value = url; inp.classList.remove('hidden'); inp.select(); try { document.execCommand('copy'); toast('Link kopiert!'); } catch { /* egal */ } }
};

function mapArea() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const side = $('#map-side').getBoundingClientRect();
  const top = $('.map-top').getBoundingClientRect();
  const W = canvas.width, H = canvas.height;
  const x = 8 * dpr, y = (top.bottom + 4) * dpr;
  return { x, y, w: Math.max(100, (side.left - 8) * dpr - x), h: H - y - 10 * dpr, k: dpr, W, H };
}

canvas.addEventListener('pointerdown', (e) => {
  if (state.screen !== 'scr-map') return;
  const dpr = canvas.width / window.innerWidth;
  const i = worldMap.hit(e.clientX * dpr, e.clientY * dpr);
  if (i >= 0) selectLevel(i);
});

// ---------- Solo ----------
function startSolo(mapIndex) {
  state.mapIndex = mapIndex;
  startGame({ net: null, players: [{ id: 'me', name: state.name, charId: state.charId }], myId: 'me', map: mapIndex });
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
  net.on('joined', (m) => setUrl(`?raum=${m.room}`));
  net.on('lobby', (m) => onLobby(m));
  net.on('start', (m) => onNetStart(m));
  net.on('tomap', () => { if (state.game || state.screen !== 'scr-map') { input.enabled = false; openMap(); } });
  net.on('st', (m) => { const p = state.game && state.game.players.get(m.id); if (p && p.remote) p.push(m.t, m.s, net.now()); });
  net.on('ev', (m) => { if (state.game) state.game.applyEvent(m.ev, true); });
  net.on('fx', (m) => { if (state.game) state.game.applyFx(m.fx, m.id); });
  net.on('left', (m) => { if (state.game) { const p = state.game.players.get(m.id); if (p) toast(`${p.name} hat die Truppe verlassen`); state.game.removeRemote(m.id); state.game._checkAllFinished(); } });
  net.on('error', (m) => {
    if (m.fatal) { leaveNet(); if (state.game) input.enabled = false; message('Hinweis', m.msg, () => goTitle()); }
    else message('Hinweis', m.msg);
  });
  net.on('close', () => {
    if (state.net !== net) return;
    state.net = null; state.lobby = null;
    if (state.screen === 'scr-title') return;
    if (state.game) input.enabled = false;
    message('Verbindung getrennt', 'Die Verbindung zur Truppe wurde unterbrochen.', () => goTitle());
  });
  const unlocked = unlockedCount(WORLD);
  if (state.mode === 'host') net.send({ type: 'create', name: state.name, charId: state.charId, unlocked });
  else net.send({ type: 'join', room: state.joinCode, name: state.name, charId: state.charId, unlocked });
}

function onLobby(m) {
  const first = !state.lobby;
  state.lobby = m;
  const me = m.players.find(p => p.id === state.net.id);
  if (me && me.charId) { state.charId = me.charId; save('ew-char', me.charId); }
  if (!isHost() || first) state.mapIndex = Math.min(m.sel | 0, WORLD.maps.length - 1);
  if (m.phase === 'play' && state.game) {
    // Spieler kommen/gehen waehrend des Spiels
    for (const p of m.players) if (p.id !== state.net.id && p.charId && !state.game.players.has(p.id)) { state.game.addRemote(p.id, p.charId, p.name); toast(`${p.name} ist beigetreten!`); sfx('join'); }
    return;
  }
  if (first && m.phase !== 'play') { openMap(); if (isHost() && state.mapIndex !== (m.sel | 0)) state.net.send({ type: 'sel', map: state.mapIndex }); return; }
  if (state.screen === 'scr-map') renderMapUi();
}

function onNetStart(m) {
  const players = m.players.filter(p => p.charId);
  state.mapIndex = m.map | 0;
  startGame({ net: state.net, players, myId: state.net.id, events: m.events || [], map: state.mapIndex });
}

function leaveNet() {
  if (state.net) { const n = state.net; state.net = null; n.close(); }
  state.lobby = null;
}

// ---------- Spiel ----------
async function startGame({ net, players, myId, events = [], map = 0 }) {
  stopGame(true);
  const me = players.find(p => p.id === myId);
  const levelDef = WORLD.maps[map];
  const game = new Game({
    canvas, levelDef, worldDef: WORLD, net,
    local: { id: myId, charId: me.charId, name: me.name },
    onFinish: (res) => { if (state.game === game) showResults(res); },
    onHud: () => updateHud(),
  });
  game.onToast = toast;
  game.onGem = (g) => recordGem(levelDef.id, g.id);
  for (const p of players) if (p.id !== myId) game.addRemote(p.id, p.charId, p.name);
  state.game = game;
  await game.load();
  if (state.game !== game) return;
  for (const ev of events) game.applyEvent(ev, true);
  if (events.length) { const r = game.respawnPoint(true); game.me.reset(r.x, r.y - 0.01); game._snapCamera(); }
  if (state.demo) state.demo = null;
  hideScreens();
  $('#hud').classList.remove('hidden');
  $('#touch').classList.toggle('hidden', !isTouch);
  setupHud(game);
  input.enabled = true;
  startMusic();
  toast(`Level ${map + 1}: ${levelDef.name}`);
  setTimeout(() => $('#stick-hint').style.opacity = '0', 6000);
}

function stopGame() {
  if (state.game) { state.game = null; }
  stopMusic();
  $('#hud').classList.add('hidden');
  $('#touch').classList.add('hidden');
  $('#scr-wait').classList.add('hidden');
  ensureDemo();
}

function setupHud(game) {
  const ch = CHARACTERS[game.me.charId];
  $('#hud-ability').textContent = `${ch.icon} ${ch.ability}`;
  $('#btn-ability-ico').textContent = ch.icon;
  $('#btn-ability').style.background = ch.color + 'cc';
  const gems = $('#hud-gems');
  gems.innerHTML = '';
  const had = levelProgress(game.level.id).gems;
  const order = [...game.level.gems].sort((a, b) => GEM_ORDER.indexOf(a.el) - GEM_ORDER.indexOf(b.el));
  for (const g of order) {
    const d = document.createElement('div');
    const G = GEM_COLORS[g.el];
    d.className = 'gem-slot' + (had.includes(g.id) ? ' had' : '');
    d.style.setProperty('--gc', G.mid); d.style.setProperty('--gd', G.dark);
    d.dataset.id = g.id;
    gems.appendChild(d);
  }
  $('#pause-help').innerHTML = `<b>${ch.icon} ${ch.element}: ${ch.ability}</b><br>${ch.abilityHint}<br>Mumien: von oben draufspringen! Die große Mumie braucht zwei Sprünge.<br><span class="small">Tastatur: ←/→ laufen · Shift rennen · Leertaste springen · E Fähigkeit</span>`;
  hudCache = {};
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
    for (const d of $('#hud-gems').children) d.classList.toggle('on', g.level.gems[+d.dataset.id].taken);
  }
}

function showResults(res) {
  const g = state.game;
  if (!g) return;
  input.enabled = false;
  $('#scr-wait').classList.add('hidden');
  const def = WORLD.maps[state.mapIndex];
  const unlockedBefore = unlockedCount(WORLD);
  const { fresh, newBest } = recordRun(def.id, { finished: g.me.finished, time: res.time, coins: res.coins, gemIds: res.gemIds });
  const unlockedNow = unlockedCount(WORLD);
  if (online() && unlockedNow > unlockedBefore) state.net.send({ type: 'prog', unlocked: unlockedNow });
  show('scr-results');
  $('#res-title').textContent = `Level ${state.mapIndex + 1} geschafft! 🎉`;
  $('#res-stats').innerHTML = `
    <div class="res-stat">Zeit<b>${fmtTime(res.time)}${newBest ? ' ⭐' : ''}</b></div>
    <div class="res-stat">Münzen<b>${res.coins}/${res.totalCoins}</b></div>
    <div class="res-stat">Mumien<b>${res.enemies}/${res.totalEnemies}</b></div>`;
  const prog = levelProgress(def.id);
  const gems = [...g.level.gems].sort((a, b) => GEM_ORDER.indexOf(a.el) - GEM_ORDER.indexOf(b.el));
  $('#res-gems').innerHTML = gems.map(gm => {
    const G = GEM_COLORS[gm.el];
    const have = prog.gems.includes(gm.id);
    return `<div class="res-gem ${have ? 'have' : ''}" style="--gc:${G.mid};--gd:${G.dark}"><i></i>${G.name}${fresh.includes(gm.id) ? '<span class="new">NEU</span>' : ''}</div>`;
  }).join('');
  const missing = gems.filter(gm => !prog.gems.includes(gm.id) && gm.el !== 'skill').map(gm => CHARACTERS[gm.el].icon + ' ' + CHARACTERS[gm.el].element);
  $('#res-players').innerHTML = res.players.map(p => `<div class="res-player" style="background:${CHARACTERS[p.charId].dark}">${CHARACTERS[p.charId].icon} ${esc(p.name)} · ${p.coins} Münzen · ${p.deaths}× gestürzt${p.time ? ' · ' + fmtTime(p.time) : ''}</div>`).join('')
    + (missing.length ? `<div class="small" style="width:100%">Noch zu finden mit: ${missing.join(', ')}</div>` : '');
  const host = isHost();
  const hasNext = state.mapIndex + 1 < WORLD.maps.length;
  $('#btn-res-menu').textContent = online() && !host ? 'Truppe verlassen' : 'Zur Karte';
  $('#btn-res-again').classList.toggle('hidden', !host);
  $('#btn-res-next').classList.toggle('hidden', !host || !hasNext);
  $('#res-wait').classList.toggle('hidden', !online() || host);
}
$('#btn-res-menu').onclick = () => {
  if (online()) { if (isHost()) state.net.send({ type: 'tomap' }); else goTitle(); }
  else openMap();
};
$('#btn-res-again').onclick = () => restartLevel(state.mapIndex);
$('#btn-res-next').onclick = () => {
  const n = Math.min(state.mapIndex + 1, WORLD.maps.length - 1);
  state.mapIndex = n; save('ew-sel', String(n));
  restartLevel(n);
};
function restartLevel(i) {
  if (online()) { if (isHost()) state.net.send({ type: 'start', map: i }); }
  else startSolo(i);
}

// Pause
$('#btn-pause').onclick = () => openPause();
function openPause() {
  if (!state.game) return;
  if (!online()) state.game.paused = true;
  input.enabled = false;
  show('scr-pause');
  const host = isHost();
  $('#btn-restart').classList.toggle('hidden', !host);
  $('#btn-tomap').classList.toggle('hidden', !host);
  $('#btn-menu').textContent = online() ? 'Truppe verlassen' : 'Hauptmenü';
}
$('#btn-resume').onclick = () => { hideScreens(); if (state.game) { state.game.paused = false; state.game._last = 0; } input.enabled = true; };
$('#btn-restart').onclick = () => restartLevel(state.mapIndex);
$('#btn-tomap').onclick = () => { if (online()) state.net.send({ type: 'tomap' }); else openMap(); };
$('#btn-menu').onclick = () => goTitle();
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state.screen === 'scr-pause') $('#btn-resume').onclick();
    else if (state.game && !state.screen) openPause();
  }
  if (state.screen === 'scr-map' && !(e.target && e.target.tagName === 'INPUT')) {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') selectLevel(Math.min(state.mapIndex + 1, mapUnlocked() - 1));
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') selectLevel(Math.max(0, state.mapIndex - 1));
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!$('#btn-map-play').disabled) $('#btn-map-play').onclick(); }
  }
});
$('#btn-wait-results').onclick = () => { if (state.game) showResults(state.game.results()); };

// ---------- Hintergrund-Demo hinter den Menues ----------
function ensureDemo() {
  if (state.demo || state.game) return;
  const levelDef = WORLD.maps[0];
  const demo = new Game({ canvas, levelDef, worldDef: WORLD, net: null, local: { id: 'demo', charId: 'air', name: '' } });
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
    $('#scr-wait').classList.toggle('hidden', !waiting || state.screen === 'scr-results' || state.screen === 'scr-pause');
  } else if (state.screen === 'scr-map') {
    const ctx = canvas.getContext('2d');
    const area = mapArea();
    worldMap.layout(canvas.width, canvas.height, area);
    worldMap.draw(ctx, canvas.width, canvas.height, t, {
      sel: state.mapIndex, unlocked: mapUnlocked(), party: mapParty(), drawChar: drawMapChar,
      prog: (i) => levelProgress(WORLD.maps[i].id), gemInfo: (i) => levelInfo(WORLD.maps[i]).gems,
    });
  } else if (state.demo) {
    const d = state.demo;
    d.time += 1 / 60;
    d.cam.x = (t * 2.2) % (d.level.w - d.viewW);
    d.cam.y = d.level.h - d.viewH - 0.5 + Math.sin(t * 0.3) * 1.5;
    for (const m of d.level.movers) d.level.moverAt(m, t);
    d.render();
  }
  if (state.screen === 'scr-title' || state.screen === 'scr-select' || state.screen === 'scr-results') drawPreviews(t);
}

// ---------- Fenster ----------
function onResize() {
  if (state.game) state.game.resize();
  if (state.demo) state.demo.resize();
  if (!state.game && !state.demo) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(window.innerWidth * dpr); canvas.height = Math.round(window.innerHeight * dpr);
  }
  const rot = $('#rotate');
  rot.classList.toggle('need', isTouch);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 200));
document.addEventListener('visibilitychange', () => { if (document.hidden && state.game && !online() && !state.game.paused) openPause(); });

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
