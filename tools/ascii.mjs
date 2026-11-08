// ASCII-Ausschnitt einer Map:  node tools/ascii.mjs <mapIndex> [x0] [x1]
// Zeigt Kacheln, Plattformen (P), Objekte und Spaltennummern.
import { WORLD1 } from '../public/js/levels/world1.js';
import { Level } from '../public/js/level.js';
const i = +(process.argv[2] || 0);
const def = WORLD1.maps[i];
const lv = new Level(def);
const x0 = +(process.argv[3] || 0), x1 = Math.min(lv.w - 1, +(process.argv[4] || lv.w - 1));
const rows = def.sections[0].rows.map(r => r.split(''));
for (const m of lv.movers) {
  for (const s of m.segs) {
    for (let k = 0; k <= 10; k++) {
      const x = Math.round(s.ax + (s.bx - s.ax) * k / 10), y = Math.round(s.ay + (s.by - s.ay) * k / 10);
      if (rows[y] && rows[y][x] === ' ') rows[y][x] = '-';
    }
  }
  const [px, py] = [Math.round(m.segs[0].ax), Math.round(m.segs[0].ay)];
  for (let k = 0; k < m.w; k++) if (rows[py]) rows[py][px + k] = 'P';
}
for (const e of lv.spitters) rows[e.y][e.x] = e.dir > 0 ? '}' : '{';
// Deko und Gegner liegen als Objekte ueber dem Raster
const DECO = { tree: 'T', arch: 'A', pillar: 'i', bush: 'b', rock: 'r', waterfall: 'w' };
for (const d of lv.decor) if (rows[d.y][d.x] === ' ') rows[d.y][d.x] = DECO[d.type] || '?';
for (const e of lv.enemySpawns) rows[e.y][e.x] = e.type === 'ghost' ? 'g' : e.type === 'mummyTall' ? 'E' : 'e';
let hdr1 = '', hdr2 = '';
for (let x = x0; x <= x1; x++) { hdr1 += x % 10 === 0 ? String(Math.floor(x / 10) % 10) : ' '; hdr2 += String(x % 10); }
console.log('    ' + hdr1); console.log('    ' + hdr2);
rows.forEach((r, y) => console.log(String(y).padStart(2) + '  ' + r.slice(x0, x1 + 1).join('')));
console.log(`w=${lv.w} coins=${lv.totalCoins} cps=${lv.checkpoints.length}`);
