// Level 7: Abendrot-Klippen – Klippen mit Wasserfaellen, Aufwinde an den
// Felswaenden, Feuerspeier in den Klippen, Geister ueber den Schluchten.
import { MapBuilder, waterTunnel, earthShaft, fireCave, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(450, 24);

  // ===== 1. Klippenrand (0-50) =====
  b.ground(0, 18, 15);
  b.start(3, 14);
  b.decor('T', 7, 14); b.decor('b', 14, 14);
  b.decor('w', 19, 15);
  b.ground(19, 34, 19);
  b.coins(20, 24, 17);
  b.ground(28, 34, 17);
  b.mummy(31, 16);
  b.ground(35, 48, 14);
  b.decor('w', 49, 14);
  b.coins(36, 46, 13);
  b.mummy(42, 13);

  // ===== 2. Aufwind-Klippen (50-110) =====
  pit(b, 49, 108);
  b.updraft(51, 54, 7, 23);
  b.coins(52, 53, 12); b.coins(52, 53, 9);
  b.ground(56, 63, 8, 23);
  b.stone(56, 56, 9, 23);
  b.coins(57, 62, 7);
  b.decor('i', 61, 7);
  b.ghost(67, 9, 65, 72);
  b.updraft(66, 70, 11, 23);
  b.ground(73, 80, 11);
  b.spitter(80, 10, 1, 2.6, 0.3);         // spuckt ueber die naechste Schlucht
  b.coins(73, 79, 10);
  b.updraft(82, 86, 9, 23);
  b.ground(88, 96, 9);
  b.decor('w', 97, 9);
  b.mummy(93, 8);
  b.coins(89, 95, 8);
  b.cloud(99, 102, 13); b.cloud(104, 107, 17);
  b.coins(99, 102, 12);

  // ===== 3. Wasserfall-Schlucht (108-170) + FEUER =====
  b.ground(108, 128, 19);
  b.checkpoint(111, 18);
  b.ground(114, 116, 17);
  b.ground(119, 128, 14);
  // FEUER: Hoehle hinter Ranken in der Felswand (links)
  fireCave(b, 120, 124, 16, 18, -1);
  b.coins(119, 126, 13);
  b.decor('w', 129, 14);
  b.mover(3, [[131, 18], [137, 18]], 2.4);
  b.island(141, 143, 18, 1);
  b.mover(3, [[144, 16], [144, 7]], 2.0);
  b.ghost(138, 11, 132, 142);
  b.coins(132, 139, 16);
  b.ground(149, 160, 8);
  b.mummyTall(155, 7);
  b.decor('w', 161, 8);
  b.coins(149, 158, 7);
  pit(b, 129, 168);

  // ===== 4. Hohe Klippe (161-230) + LUFT (Gleitflug) + ERDE =====
  b.cloud(163, 166, 12); b.cloud(170, 173, 16);
  b.ground(176, 196, 19);
  b.checkpoint(179, 18);
  b.mummy(186, 18);
  b.ground(190, 196, 15);
  b.decor('T', 194, 14);
  // ERDE: Gruft in der Felsnase
  earthShaft(b, 203, 12, 2);
  b.coins(203, 204, 11);
  b.ground(197, 228, 19);
  b.spitter(222, 18, -1, 2.4, 0.6, 6.5, 12);
  b.mummy(216, 18);
  // LUFT: von der Hochinsel weit nach rechts gleiten
  b.island(212, 216, 7, 2);
  b.decor('i', 214, 6);
  b.mover(2, [[209, 17], [209, 8]], 2.0);

  // ===== 5. Abendbruecke (229-300) =====
  pit(b, 229, 300);
  b.crumble(231, 233, 17); b.crumble(237, 238, 15);
  // LUFT: nur im Gleitflug von der Hochinsel (212-216) zu erreichen
  airPerch(b, 233, 236, 9, 'island');
  b.island(241, 246, 15, 2);
  b.spitter(246, 14, 1, 2.6, 1.0);
  b.ghost(252, 12, 249, 258);
  b.mover(3, [[250, 15], [258, 15]], 2.5);
  b.island(262, 268, 13, 2);
  b.mummy(266, 12);
  b.updraft(270, 273, 9, 23);
  b.coins(271, 272, 14); b.coins(271, 272, 11);
  b.ground(275, 284, 10);
  b.decor('w', 285, 10);
  b.coins(276, 283, 9);
  b.cloud(289, 292, 15); b.cloud(295, 298, 17);
  b.coins(289, 292, 14);

  // ===== 6. Klippenweg (300-370) + WASSER + GESCHICK =====
  b.ground(300, 370, 19);
  b.checkpoint(303, 18);
  b.stone(307, 308, 17, 18);
  b.stone(309, 311, 14, 16);
  b.coins(309, 311, 13);
  waterTunnel(b, 312, 14, { gaps: 2 });
  b.mummyTall(330, 18);
  // Geschick: Aufwind mit Speiern zu beiden Seiten
  b.stone(336, 337, 6, 16);
  b.stone(344, 345, 6, 16);
  b.updraft(338, 343, 3, 15);
  b.spitter(337, 10, 1, 2.0, 0.0);
  b.spitter(344, 13, -1, 2.0, 1.0);
  b.gem(340, 2);
  b.coins(340, 341, 15); b.coins(340, 341, 8);
  b.mummy(355, 18);
  b.decor('i', 362, 18);

  // ===== 7. Sonnenuntergangs-Tor (371-449): Ziel =====
  b.ground(371, 382, 17);
  b.ground(383, 449, 15);
  b.coins(384, 392, 13);
  b.mummy(390, 14); b.mummyTall(402, 14);
  b.ghost(411, 10, 405, 418);
  b.decor('A', 396, 14); b.decor('i', 418, 14);
  b.goal(432, 14);
  b.decor('T', 442, 14);

  // ===== Neu (eingeschoben, von rechts nach links): =====
  // B) Abendrot-Grat: zwei Aufwinde an Klippen, Wolken hinab (vor dem Tor, Hoehe 15)
  {
    const x = 386;
    b.splice(x, 80);
    b.ground(x, x + 5, 15);
    b.checkpoint(x + 2, 14);
    b.updraft(x + 8, x + 11, 9, 21);
    b.coins(x + 9, x + 10, 12);
    b.ground(x + 13, x + 20, 8);
    b.decor('w', x + 21, 8); b.mummy(x + 18, 7);
    b.coins(x + 13, x + 16, 7);
    b.island(x + 25, x + 29, 10, 2); b.coins(x + 25, x + 29, 9);
    b.updraft(x + 32, x + 35, 6, 21);
    b.coins(x + 33, x + 34, 10);
    b.ground(x + 37, x + 44, 7);
    b.decor('i', x + 42, 6); b.coins(x + 37, x + 41, 6);
    b.cloud(x + 48, x + 51, 11); b.cloud(x + 54, x + 57, 14);
    b.arc(x + 45, x + 48, 8, 1); b.coins(x + 54, x + 57, 13);
    b.ghost(x + 52, 9, x + 46, x + 58);
    pit(b, x + 6, x + 57);
    b.ground(x + 58, x + 79, 15);
    b.decor('T', x + 62, 14); b.decor('b', x + 71, 14);
    b.mummyTall(x + 67, 14); b.mummy(x + 76, 14);
    b.coins(x + 72, x + 75, 13);
  }
  // A) Wasserfall-Pendel: Pendelfaehre, Pilz zur Hochinsel, Broeckelstein (nach dem Klippenweg)
  {
    const x = 366;
    b.splice(x, 80);
    b.ground(x, x + 4, 19);
    b.mover(3, [[x + 6, 17], [x + 13, 13], [x + 20, 17]], 2.4);
    b.coins(x + 8, x + 18, 12);
    b.island(x + 24, x + 28, 15, 2);
    b.decor('w', x + 29, 15); b.spring(x + 27, 14);
    b.island(x + 31, x + 38, 7, 2);
    b.mummy(x + 36, 6); b.coins(x + 31, x + 34, 6);
    b.cloud(x + 42, x + 45, 12); b.crumble(x + 49, x + 51, 15);
    b.coins(x + 42, x + 45, 11); b.coins(x + 49, x + 51, 14);
    b.ghost(x + 46, 10, x + 40, x + 52);
    pit(b, x + 5, x + 55);
    b.ground(x + 56, x + 79, 19);
    b.checkpoint(x + 59, 18);
    b.spitter(x + 70, 18, -1, 2.4, 0.4, 6.5, 8);
    b.coins(x + 63, x + 68, 16);
    b.mummy(x + 76, 18); b.decor('r', x + 73, 18);
  }

  return b.section('Abendrot-Klippen');
}
