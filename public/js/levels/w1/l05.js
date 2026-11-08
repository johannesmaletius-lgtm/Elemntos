// Level 5: Ruinenstadt – Steinhaeuser, Turmhaus, Daecher. Neu: Feuerspeier
// (Steinkoepfe spucken im Takt Flammen – drueberspringen; Feuer ist immun).
import { MapBuilder, waterTunnel, earthVault, fireCave, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(420, 24);

  // ===== 1. Stadttor (0-58): erster Feuerspeier =====
  b.ground(0, 100, 19);
  b.start(3, 18);
  b.decor('T', 6, 18); b.decor('A', 14, 18); b.decor('i', 20, 18);
  b.coins(9, 12, 17);
  b.spitter(34, 18, -1, 2.6, 0.4, 6.5, 12); // spuckt am Boden entlang nach links
  b.coins(25, 31, 16);
  b.stone(37, 40, 17, 18);
  b.coins(37, 40, 16);
  // LUFT: Steg hoch ueber dem Mauerstueck
  airPerch(b, 37, 40, 11, 'plank');
  b.mummy(46, 18);
  b.decor('i', 53, 18);

  // ===== 2. Turmhaus (59-100): Stockwerke, Speier in den Fluren =====
  b.stone(60, 60, 5, 16);                 // linke Wand (Eingang unten)
  b.stone(76, 76, 9, 18);                 // rechte Wand
  b.stone(60, 76, 4, 4);                  // Dach
  b.plank(61, 66, 16); b.plank(70, 75, 13); b.plank(61, 66, 10); b.plank(68, 75, 7);
  b.spitter(75, 15, -1, 2.4, 0.0);
  b.spitter(61, 9, 1, 2.4, 1.2);
  b.coins(62, 65, 15); b.coins(71, 74, 12); b.coins(63, 66, 9); b.coins(69, 74, 6);
  b.clear(76, 76, 5, 6);                  // Ausgang oben rechts
  b.stone(76, 76, 7, 8);
  b.stone(77, 85, 7, 8);                  // Dachterrasse
  b.coins(78, 84, 6);
  b.decor('i', 84, 6);
  b.mummyTall(88, 18);
  b.decor('A', 95, 18);
  b.coins(86, 92, 17);

  // ===== 3. Daecher ueber dem Abgrund (101-170) =====
  pit(b, 101, 170);
  b.stone(102, 107, 16, 23);
  b.stone(110, 114, 13, 23);
  b.mummy(112, 12);
  b.stone(118, 123, 15, 23);
  b.spitter(123, 14, 1, 2.8, 0.9);        // spuckt ueber die naechste Luecke
  b.stone(127, 132, 12, 23);
  b.crumble(133, 139, 12);
  b.coins(133, 139, 10);
  b.stone(140, 146, 12, 23);
  b.decor('i', 145, 11);
  b.stone(150, 155, 15, 23);
  b.stone(159, 165, 13, 23);
  b.mummy(163, 12);
  b.coins(103, 106, 15); b.coins(110, 114, 11); b.coins(118, 122, 14); b.coins(127, 131, 11); b.coins(141, 144, 11); b.coins(150, 155, 14); b.coins(159, 162, 12);
  b.arc(107, 110, 12, 1); b.arc(146, 150, 11, 1); b.arc(155, 159, 12, 1);

  // ===== 4. Saeulenstrasse (166-240) + ERDE + FEUER =====
  b.ground(166, 240, 19);
  b.checkpoint(170, 18);
  b.decor('A', 177, 18);
  b.stone(187, 187, 17, 18); b.spitter(187, 16, -1, 2.2, 0.5, 6.5, 14);
  b.coins(180, 185, 15);
  // ERDE: Haus mit Gewoelbe; unten ein Durchgang fuer alle
  b.stone(196, 197, 16, 18);
  b.stone(199, 209, 13, 18);
  earthVault(b, 200, 208, 13, 2);
  b.clear(199, 209, 17, 18);              // Durchgang unter dem Gewoelbe
  b.coins(201, 207, 18);
  b.mummy(214, 18);
  // FEUER: Ruine mit Rankentuer (rechts)
  b.stone(216, 217, 17, 18);
  fireCave(b, 220, 224, 16, 18, 1);
  b.coins(219, 225, 14);
  b.mummyTall(232, 18);
  b.decor('i', 237, 18);

  // ===== 5. Bruecke der Speier (241-290) =====
  pit(b, 241, 289);
  b.mover(3, [[242, 16], [250, 16]], 2.4);
  b.stone(254, 257, 14, 23);
  b.spitter(254, 15, -1, 2.6, 1.6);       // fegt ueber die Faehre
  b.coins(243, 250, 14);
  b.mover(2, [[260, 13], [260, 7]], 2.0);
  b.island(264, 271, 7, 2);
  b.decor('i', 266, 6);
  b.mummy(270, 6);
  b.coins(264, 271, 6);
  b.plank(275, 279, 11); b.plank(283, 287, 15);
  b.coins(275, 279, 10); b.coins(283, 287, 14);

  // ===== 6. Tempelstrasse (290-360) + WASSER + GESCHICK =====
  b.ground(290, 362, 19);
  b.checkpoint(293, 18);
  b.stone(298, 299, 17, 18);
  b.stone(300, 302, 14, 16);
  b.coins(300, 302, 13);
  waterTunnel(b, 303, 14, { gaps: 2, after: 3 });
  b.mummy(320, 18);
  // Geschick: Broeckeltreppe zum Speier-Sims
  b.crumble(331, 332, 16); b.crumble(335, 336, 13); b.crumble(339, 340, 10);
  b.stone(343, 346, 7, 7);
  b.spitter(349, 6, -1, 2.6, 0.2);
  b.stone(349, 349, 7, 7);
  b.gem(344, 5);
  b.coins(331, 332, 15); b.coins(335, 336, 12); b.coins(339, 340, 9);
  b.decor('A', 352, 18);
  b.mummyTall(357, 18);

  // ===== 7. Grosses Tor (363-419): Ziel =====
  b.ground(363, 419, 19);
  b.decor('i', 366, 18); b.decor('i', 372, 18);
  b.spitter(386, 18, -1, 2.4, 0.0, 6.5, 14);
  b.coins(376, 383, 16);
  b.mummy(380, 18);
  b.decor('A', 392, 18);
  b.goal(404, 18);
  b.decor('T', 413, 18);

  // ===== Neu (eingeschoben, von rechts nach links): =====
  // B) Palasthof: Speier am Boden, Treppenhaus, Stege ueber Dornenbeeten (vor dem Tor)
  {
    const x = 365;
    b.splice(x, 85);
    b.ground(x, x + 84, 19);
    b.checkpoint(x + 2, 18);
    b.spitter(x + 14, 18, -1, 2.4, 0.3, 6.5, 10);
    b.coins(x + 6, x + 11, 16);
    b.stone(x + 18, x + 21, 16, 18); b.stone(x + 22, x + 25, 13, 18);
    b.mummy(x + 24, 12);
    b.coins(x + 18, x + 21, 15);
    b.thorns(x + 26, x + 37, 18);
    b.plank(x + 29, x + 34, 13); b.coins(x + 29, x + 34, 12);
    b.stone(x + 38, x + 41, 11, 18);
    b.spitter(x + 41, 10, 1, 2.6, 1.0);
    b.coins(x + 38, x + 40, 10);
    b.thorns(x + 42, x + 53, 18);
    b.plank(x + 45, x + 50, 13); b.coins(x + 45, x + 50, 12);
    b.stone(x + 54, x + 57, 15, 18);
    b.coins(x + 54, x + 57, 14);
    b.decor('A', x + 66, 18); b.decor('i', x + 80, 18);
    b.mummyTall(x + 62, 18); b.mummy(x + 74, 18);
    b.coins(x + 68, x + 73, 17);
  }
  // A) Marktdaecher: Daecher, Broeckelbruecke, Speier, Faehre (vor der Bruecke der Speier)
  {
    const x = 239;
    b.splice(x, 85);
    b.ground(x, x + 3, 19);
    pit(b, x + 4, x + 70);
    b.stone(x + 5, x + 10, 16, 23);
    b.stone(x + 14, x + 18, 13, 23); b.mummy(x + 16, 12);
    b.crumble(x + 19, x + 24, 13);
    b.stone(x + 25, x + 30, 13, 23);
    b.spitter(x + 30, 12, 1, 2.6, 0.5, 6.5, 9);
    b.stone(x + 34, x + 39, 15, 23);
    b.mover(3, [[x + 42, 14], [x + 50, 14]], 2.4);
    b.stone(x + 56, x + 61, 12, 23); b.decor('i', x + 59, 11);
    b.stone(x + 65, x + 70, 15, 23); b.mummy(x + 68, 14);
    b.coins(x + 6, x + 9, 15); b.coins(x + 14, x + 17, 12); b.coins(x + 19, x + 24, 11); b.coins(x + 26, x + 29, 12);
    b.coins(x + 34, x + 38, 14); b.coins(x + 43, x + 51, 12); b.coins(x + 57, x + 60, 11);
    b.arc(x + 10, x + 14, 13, 1); b.arc(x + 61, x + 65, 11, 1);
    b.ground(x + 71, x + 84, 19);
    b.checkpoint(x + 74, 18);
    b.coins(x + 77, x + 82, 17);
  }

  return b.section('Ruinenstadt');
}
