// Bausteine fuer Level: Element-Geheimnisse und wiederkehrende Stuecke.
import { MapBuilder } from '../level.js';
export { MapBuilder };

// ---------- Bausteine fuer Element-Geheimnisse ----------

// WASSER: Tunnel mit Dornendecke (Springen unmoeglich), im Boden 3er-Luecken
// ueber Dornengraeben – nur der Wasser-Dash kommt rueber (und wieder zurueck).
// x = Tunnelmund, y = Bodenzeile (Spieler steht auf y). Gibt die rechte Kante zurueck.
export function waterTunnel(b, x, y, { pre = 2, gaps = 1, after = 4 } = {}) {
  const gx = [];
  let c = x + pre;
  for (let i = 0; i < gaps; i++) { gx.push(c); c += 6; }
  const end = gx[gx.length - 1] + 3 + after - 1;
  b.stone(x, end, y, y + 2);
  for (const g of gx) { b.clear(g, g + 2, y, y); b.thorns(g, g + 2, y + 1); }
  b.ceilThorns(x, end, y - 2);
  b.stone(x, end + 1, y - 4, y - 3);
  b.stone(end + 1, end + 1, y - 2, y + 2);
  for (let i = 1; i < gx.length; i++) b.coins(gx[i] - 3, gx[i] - 1, y - 1);
  b.coins(gx[gx.length - 1] + 3, end - 2, y - 1);
  b.gem(end, y - 1, 'water');
  return end + 1;
}

// ERDE: Kammer unter einem Deckel aus rissigem Stein; der Boden ist ebenfalls
// rissig – mit dem naechsten Stampfer geht es unten wieder raus.
// x0..x1 = Innenraum, top = Zeile des Deckels, Innenraum top+1..top+h
export function earthVault(b, x0, x1, top, h = 2, { lid = [x0 + 1, x0 + 2], floor = [x1 - 1, x1], gemX = x0 + Math.floor((x1 - x0) / 2) } = {}) {
  b.stone(x0 - 1, x1 + 1, top, top + h + 1);
  b.clear(x0, x1, top + 1, top + h);
  b.cracked(lid[0], lid[1], top);
  b.cracked(floor[0], floor[1], top + h + 1);
  b.gem(gemX, top + h, 'earth');
  for (let x = x0; x <= x1; x++) if (x !== gemX && (x < floor[0] || x > floor[1])) b.coin(x, top + h);
}

// FEUER: Hoehle hinter einer Rankenwand (dir = Seite der Ranken: -1 links, +1 rechts)
export function fireCave(b, x0, x1, y0, y1, dir = -1) {
  b.stone(x0 - 1, x1 + 1, y0 - 1, y1 + 1);
  b.clear(x0, x1, y0, y1);
  b.vine(dir < 0 ? x0 - 1 : x1 + 1, dir < 0 ? x0 - 1 : x1 + 1, y0, y1);
  const gx = dir < 0 ? x1 : x0;
  b.gem(gx, y1, 'fire');
  for (let x = x0; x <= x1; x++) if (x !== gx) b.coin(x, y1);
}


// LUFT: hoher Sitzplatz (Wolke/Steg) – mehr als 6 Kacheln ueber allem, was
// man ohne Doppelsprung erreicht. Kristall 2 Kacheln ueber der Plattform.
export function airPerch(b, x0, x1, y, kind = 'cloud') {
  if (kind === 'cloud') b.cloud(x0, x1, y); else if (kind === 'plank') b.plank(x0, x1, y); else b.island(x0, x1, y, 1);
  b.gem(Math.floor((x0 + x1) / 2), y - 2, 'air');
}

// Dornengrube am Boden eines Abgrunds
export function pit(b, x0, x1, y = 22) { b.ground(x0, x1, y); b.thorns(x0, x1, y - 1); }

// ERDE (Variante): 2 breiter Schacht durch mehrere Lagen rissigen Stein in eine Gruft.
// x = linke Schachtspalte, top = oberste Lage, layers = Anzahl Lagen; Gruft x-2..x+3
export function earthShaft(b, x, top, layers = 3, h = 2) {
  const y0 = top + layers;             // erste Zeile der Gruft
  b.stone(x - 3, x + 4, top, y0 + h);
  b.cracked(x, x + 1, top, top + layers - 1);
  b.clear(x - 2, x + 3, y0, y0 + h - 1);
  b.cracked(x + 2, x + 3, y0 + h);      // Ausgang nach unten
  b.gem(x - 2, y0 + h - 1, 'earth');
  b.coins(x - 1, x + 1, y0 + h - 1);
}

// FEUER (Variante): Kristall in einem Rankenkaefig auf einer Plattform
export function fireCage(b, x0, x1, y) {
  // y = Bodenzeile des Kaefigs (Spieler steht auf y); Innenraum x0..x1, 2 hoch
  b.stone(x0 - 1, x1 + 1, y, y);
  b.vine(x0 - 1, x0 - 1, y - 2, y - 1);
  b.vine(x1 + 1, x1 + 1, y - 2, y - 1);
  b.vine(x0 - 1, x1 + 1, y - 3, y - 3);
  const gx = Math.floor((x0 + x1) / 2);
  b.gem(gx, y - 1, 'fire');
  for (let x = x0; x <= x1; x++) if (x !== gx) b.coin(x, y - 1);
}
