// Gibt eine Map als ASCII aus (zum Pruefen):  node tools/dump_level.mjs [mapIndex]
import { WORLD1 } from '../public/js/levels/world1.js';
import { Level } from '../public/js/level.js';
const i = +(process.argv[2] || 0);
const def = WORLD1.maps[i];
const lv = new Level(def);
const rows = def.sections.flatMap(s => s.rows);
console.log(JSON.stringify({ w: lv.w, h: lv.h, coins: lv.totalCoins, gems: lv.totalGems, checkpoints: lv.checkpoints.length, movers: lv.movers.length, crumbles: lv.crumbles.length }));
if (process.argv.includes('--rows')) for (const r of def.sections[0].rows) console.log(r);
