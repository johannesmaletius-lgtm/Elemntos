// Baut eine Einzeldatei-Vorschau (nur Einzelspieler) nach dist/elementos-vorschau.html.
// Braucht esbuild:  npx esbuild  (oder Pfad per ESBUILD=/pfad/zu/esbuild)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });
const esbuild = process.env.ESBUILD || 'esbuild';
const js = execFileSync(esbuild, [path.join(pub, 'js', 'main.js'), '--bundle', '--format=iife', '--minify', '--target=es2020'], { encoding: 'utf8', maxBuffer: 64 << 20 });
const assets = {};
for (const id of ['air', 'water', 'earth', 'fire', 'mummy', 'mummy_tall']) {
  assets[id] = {
    meta: JSON.parse(fs.readFileSync(path.join(pub, 'assets', 'chars', `${id}.json`), 'utf8')),
    png: 'data:image/png;base64,' + fs.readFileSync(path.join(pub, 'assets', 'chars', `${id}.png`)).toString('base64'),
  };
}
let html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(pub, 'css', 'style.css'), 'utf8');
html = html.replace(/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n/g, '');
html = html.replace('<link rel="stylesheet" href="css/style.css">', () => `<style>${css}</style>`);
const boot = `<script>window.__EW_PREVIEW=true;window.__EW_ASSETS=${JSON.stringify(assets)};</script>\n<script>${js.replace(/<\/script/g, '<\\/script')}</script>`;
html = html.replace('<script type="module" src="js/main.js"></script>', () => boot);
const file = path.join(out, 'elementos-vorschau.html');
fs.writeFileSync(file, html);
console.log(file, (fs.statSync(file).size / 1024).toFixed(0) + ' KB');
