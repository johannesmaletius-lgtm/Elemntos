// Spielstand (lokal im Browser): pro Level geschafft?, Bestzeit, Muenzen-Rekord
// und welche Kristalle schon gefunden wurden. Kristalle sammeln sich ueber alle
// Laeufe an – mit jeder Figur einmal spielen (oder im Team) fuellt die Liste.
import { load, save } from './storage.js';
import { Level } from './level.js';

const KEY = 'ew-progress-v1';
let cache = null;

function all() {
  if (cache) return cache;
  try { cache = JSON.parse(load(KEY, '{}')) || {}; } catch { cache = {}; }
  return cache;
}
function store() { save(KEY, JSON.stringify(cache)); }

export function levelProgress(id) {
  const p = all()[id];
  return { done: false, best: null, coins: 0, gems: [], ...(p || {}) };
}

// Ergebnis eines Laufs eintragen. Gibt die neu gefundenen Kristall-IDs zurueck.
export function recordRun(id, { finished, time, coins, gemIds }) {
  const db = all();
  const p = levelProgress(id);
  const before = new Set(p.gems);
  const fresh = (gemIds || []).filter(g => !before.has(g));
  p.gems = [...new Set([...p.gems, ...(gemIds || [])])].sort((a, b) => a - b);
  let newBest = false;
  if (finished) {
    p.done = true;
    if (time > 0 && (p.best === null || time < p.best)) { p.best = time; newBest = true; }
    p.coins = Math.max(p.coins || 0, coins || 0);
  }
  db[id] = p;
  store();
  return { fresh, newBest };
}

// Kristalle sofort beim Einsammeln merken (falls das Level abgebrochen wird)
export function recordGem(id, gemId) {
  const db = all();
  const p = levelProgress(id);
  if (p.gems.includes(gemId)) return false;
  p.gems.push(gemId); p.gems.sort((a, b) => a - b);
  db[id] = p; store();
  return true;
}

// Anzahl freigeschalteter Level: Level i ist offen, wenn Level i-1 geschafft ist
export function unlockedCount(world) {
  let n = 1;
  for (let i = 0; i < world.maps.length - 1; i++) {
    if (levelProgress(world.maps[i].id).done) n = i + 2; else break;
  }
  return Math.min(n, world.maps.length);
}

// Kristall-/Muenz-Infos eines Levels (einmal geparst)
const infoCache = new Map();
export function levelInfo(def) {
  if (!infoCache.has(def.id)) {
    const lv = new Level(def);
    infoCache.set(def.id, { gems: lv.gems.map(g => ({ id: g.id, el: g.el })), coins: lv.totalCoins, width: lv.w });
  }
  return infoCache.get(def.id);
}

export function worldGems(world) {
  let have = 0, total = 0;
  for (const m of world.maps) {
    const info = levelInfo(m);
    total += info.gems.length;
    have += levelProgress(m.id).gems.filter(g => info.gems.some(x => x.id === g)).length;
  }
  return { have, total };
}
