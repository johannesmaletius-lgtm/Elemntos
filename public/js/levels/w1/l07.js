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

  return b.section('Abendrot-Klippen');
}
