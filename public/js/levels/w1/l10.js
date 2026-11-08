// Level 10: Das Himmelstor – Finale unter dem Polarlicht. Alles kommt
// zusammen: Sturm, Riesenraeder, Speier, Geister, Aufwinde, Wolken.
import { MapBuilder, waterTunnel, earthShaft, fireCave, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(520, 24);

  // ===== 1. Polarlicht-Klippe (0-50) =====
  b.ground(0, 26, 17);
  b.start(3, 16);
  b.decor('T', 7, 16); b.decor('b', 14, 16); b.decor('i', 21, 16);
  b.coins(9, 13, 15);
  b.cloud(29, 32, 15); b.cloud(35, 38, 13);
  b.ghost(34, 9, 28, 40);
  b.coins(29, 32, 14); b.coins(35, 38, 12);
  pit(b, 27, 41);
  b.ground(42, 58, 15);
  b.mummy(50, 14);
  b.decor('r', 46, 14);

  // ===== 2. Sturmbruecke (59-125) =====
  b.crumble(59, 70, 15);
  b.wind(59, 70, 10, 14, -1);
  b.coins(59, 70, 13);
  b.island(73, 76, 15, 2);
  b.spitter(76, 14, 1, 2.4, 0.3);
  b.wind(77, 92, 8, 16, 1);
  b.island(87, 89, 16, 1);
  b.island(95, 101, 14, 3);
  b.mummyTall(99, 13);
  b.mover(3, [[104, 14], [112, 10]], 2.6);
  b.ghost(108, 6, 103, 113);
  b.island(116, 124, 10, 3);
  b.coins(117, 123, 9);
  b.mummy(122, 9);
  pit(b, 59, 125);

  // ===== 3. Zwillingsraeder (126-195) =====
  b.ground(126, 136, 13);
  b.checkpoint(129, 12);
  b.stone(126, 126, 14, 23);
  b.wheel(146, 12, 4, 3, 3, 2.1, 1);
  b.ghost(153, 16, 149, 158);
  b.wheel(161, 10, 4, 3, 3, 2.1, -1);
  b.spitter(172, 10, -1, 2.8, 1.0);       // Speier ueber den Raedern
  b.stone(172, 175, 11, 23);
  b.coins(145, 147, 7); b.coins(160, 162, 5); b.coins(172, 175, 10);
  b.island(179, 189, 13, 3);
  b.mummy(184, 12);
  // LUFT: Wolke hoch ueber der Insel
  airPerch(b, 185, 189, 6);
  pit(b, 137, 190);
  b.cloud(191, 193, 16);

  // ===== 4. Aufwindturm (193-260) + ERDE =====
  b.ground(195, 214, 19);
  b.checkpoint(198, 18);
  b.mummy(206, 18);
  b.updraft(215, 219, 6, 23);
  b.wind(215, 232, 2, 5, 1);
  b.coins(217, 217, 16); b.coins(217, 217, 12); b.coins(217, 217, 8);
  b.cloud(222, 225, 6); b.cloud(229, 232, 6);
  b.coins(222, 232, 4);
  b.island(236, 246, 7, 2);
  b.decor('i', 238, 6);
  // ERDE: Gruft im schwebenden Steinblock (Ausgang nach unten auf die Wolke)
  earthShaft(b, 242, 7, 2);
  b.coins(242, 243, 6);
  b.cloud(240, 252, 16);
  b.coins(247, 251, 15);
  pit(b, 215, 258);
  b.mummy(244, 6);

  // ===== 5. Speier-Ruinen (259-330) + FEUER =====
  b.ground(257, 330, 19);
  b.checkpoint(260, 18);
  b.spitter(272, 18, -1, 2.4, 0.0, 6.5, 9);
  b.coins(262, 266, 15);
  b.decor('A', 274, 18);
  b.ground(283, 291, 15);
  fireCave(b, 284, 288, 16, 18, -1);
  b.ground(279, 280, 17);
  b.coins(283, 290, 14);
  b.mummyTall(298, 18);
  b.spitter(305, 18, -1, 2.0, 1.0, 6.5, 12);
  b.spitter(313, 18, -1, 2.0, 0.0);
  b.coins(306, 312, 15);
  b.mummy(320, 18);
  b.decor('i', 326, 18);

  // ===== 6. Geistersee (331-400) =====
  b.cloud(333, 336, 17);
  b.ghost(340, 13, 336, 344);
  b.cloud(341, 344, 15);
  b.circle(3, 352, 13, 3, 2.0, 0, 1);
  b.ghost(359, 9, 355, 364);
  b.cloud(361, 364, 13);
  b.mover(2, [[368, 17], [368, 9]], 2.1);
  b.island(372, 379, 9, 2);
  b.mummy(377, 8);
  b.cloud(383, 386, 13); b.cloud(390, 393, 16);
  b.coins(333, 336, 16); b.coins(341, 344, 14); b.coins(361, 364, 12); b.coins(372, 378, 8); b.coins(383, 386, 12);
  pit(b, 331, 396);

  // ===== 7. Letzte Pruefung (397-465) + WASSER + GESCHICK =====
  b.ground(397, 465, 19);
  b.checkpoint(400, 18);
  b.stone(404, 405, 17, 18);
  b.stone(406, 408, 14, 16);
  b.coins(406, 408, 13);
  waterTunnel(b, 409, 14, { gaps: 2, after: 3 });
  b.mummy(428, 18);
  // Geschick: Rad-Gipfel – vom kleinen Rad auf die Spitze
  b.stone(434, 435, 16, 18);
  b.stone(437, 440, 13, 18);
  b.wheel(447, 9, 3, 2, 2, 1.9, 1);
  b.stone(454, 457, 12, 18);
  b.gem(447, 3);
  b.coins(437, 440, 12); b.coins(454, 457, 11);
  b.mummyTall(461, 18);

  // ===== 8. Treppe zum Himmelstor (466-519): Ziel =====
  b.ground(466, 476, 17);
  b.ground(477, 487, 15);
  b.ground(488, 519, 13);
  b.ghost(482, 10, 476, 490);
  b.coins(467, 475, 15); b.coins(478, 486, 13);
  b.decor('i', 492, 12); b.decor('A', 498, 12);
  b.mummyTall(494, 12);
  b.goal(508, 12);
  b.decor('T', 515, 12);

  return b.section('Das Himmelstor');
}
