// Welt 1: Himmelsinseln – 10 Level von Morgen bis Polarlicht.
//
// Jedes Level hat 5 Kristalle: 4 Element-Kristalle (nur mit der passenden
// Faehigkeit erreichbar) und einen Geschick-Kristall (fuer alle).
// Der Hauptweg ist mit jeder Figur ohne Faehigkeit schaffbar.
// Pruefen:  node tools/check_level.mjs --matrix
import l01 from './w1/l01.js';
import l02 from './w1/l02.js';
import l03 from './w1/l03.js';
import l04 from './w1/l04.js';
import l05 from './w1/l05.js';
import l06 from './w1/l06.js';
import l07 from './w1/l07.js';
import l08 from './w1/l08.js';
import l09 from './w1/l09.js';
import l10 from './w1/l10.js';

const L = (n, id, name, theme, build) => ({ id, name, theme, height: 24, sections: [build()] });

export const WORLD1 = {
  id: 'w1',
  name: 'Himmelsinseln',
  maps: [
    L(1, 'w1-1', 'Der Aufbruch', 'day', l01),
    L(2, 'w1-2', 'Wolkenpfad', 'morning', l02),
    L(3, 'w1-3', 'Pilzhain', 'noon', l03),
    L(4, 'w1-4', 'Sturmbrücken', 'afternoon', l04),
    L(5, 'w1-5', 'Ruinenstadt', 'afternoon', l05),
    L(6, 'w1-6', 'Uhrwerk-Inseln', 'golden', l06),
    L(7, 'w1-7', 'Abendrot-Klippen', 'sunset', l07),
    L(8, 'w1-8', 'Dornenlabyrinth', 'dusk', l08),
    L(9, 'w1-9', 'Sternennacht', 'night', l09),
    L(10, 'w1-10', 'Das Himmelstor', 'aurora', l10),
  ],
};
