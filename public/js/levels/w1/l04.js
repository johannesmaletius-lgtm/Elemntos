// Level 4: Sturmbruecken – Seitenwind! Rueckenwind traegt dich ueber weite
// Luecken, Gegenwind bremst auf schmalen Stegen. Aufwind + Seitenwind.
import { MapBuilder, waterTunnel, earthVault, fireCave, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(430, 24);

  // ===== 1. Windige Wiese (0-60): erster Rueckenwind =====
  b.ground(0, 26, 19);
  b.start(3, 18);
  b.decor('T', 8, 18); b.decor('b', 17, 18);
  b.coins(11, 15, 17);
  b.mummy(22, 18);
  // Rueckenwind ueber einer 10er-Luecke
  b.wind(27, 37, 9, 18, 1);
  b.arc(26, 38, 15, 3);
  pit(b, 27, 37);
  b.ground(38, 60, 19);
  b.decor('i', 42, 18);
  b.mummy(50, 18);
  b.plank(52, 57, 15); b.coins(52, 57, 14);

  // ===== 2. Gegenwind-Stege (61-120) =====
  b.plank(61, 70, 17);
  b.wind(61, 90, 12, 16, -1);
  b.coins(62, 69, 16);
  b.island(73, 76, 17, 2);
  b.plank(79, 86, 16);
  b.coins(80, 85, 15);
  b.island(89, 94, 17, 3);
  b.mummy(92, 16);
  // LUFT: hoch ueber den Stegen
  airPerch(b, 80, 83, 10);
  pit(b, 61, 99);
  b.crumble(97, 99, 17);
  b.ground(100, 125, 19);
  b.checkpoint(103, 18);
  b.decor('A', 110, 18);
  b.mummyTall(118, 18);
  b.coins(106, 114, 17);

  // ===== 3. Windsaeule (126-175): Aufwind, oben traegt der Seitenwind nach rechts =====
  b.updraft(127, 131, 5, 23);
  b.wind(132, 149, 2, 6, 1);
  b.coins(129, 129, 16); b.coins(129, 129, 12); b.coins(129, 129, 8);
  b.cloud(134, 137, 7); b.cloud(141, 144, 7);
  b.coins(134, 137, 6); b.coins(141, 144, 6); b.arc(137, 141, 5, 1); b.arc(144, 149, 5, 1);
  b.island(149, 158, 7, 3);
  b.mummy(155, 6);
  b.decor('i', 157, 6);
  // ERDE: Kammer in der Hochinsel
  earthVault(b, 152, 156, 7, 2);
  b.cloud(154, 160, 14);                 // Auffang unter dem Kammer-Ausgang
  b.cloud(162, 165, 11); b.cloud(168, 171, 15);
  b.arc(159, 162, 8, 1); b.arc(165, 168, 12, 1);
  pit(b, 126, 175);

  // ===== 4. Broeckelbruecke im Querwind (176-230) =====
  b.ground(174, 186, 19);
  b.checkpoint(177, 18);
  b.mummy(183, 18);
  b.crumble(187, 200, 19);
  b.wind(187, 200, 14, 18, -1);
  b.coins(188, 199, 17);
  b.ground(201, 206, 19);
  b.crumble(207, 214, 17);
  b.wind(207, 214, 12, 16, 1);
  b.coins(207, 214, 15);
  b.ground(215, 240, 19);
  pit(b, 187, 200, 23); pit(b, 207, 214, 23);
  b.decor('b', 218, 18);
  b.mummy(226, 18);

  // ===== 5. Ruinenbruecke (231-290) + WASSER =====
  b.stone(229, 230, 17, 18);
  b.stone(231, 233, 14, 16);
  b.coins(231, 233, 13);
  waterTunnel(b, 234, 14);
  b.decor('i', 238, 18);
  b.ground(241, 252, 19);
  b.mummyTall(248, 18);
  // grosse Luecke mit Rueckenwind und Faehre
  b.mover(3, [[255, 16], [264, 16]], 2.6);
  b.wind(253, 272, 8, 15, 1);
  b.coins(256, 263, 14);
  b.island(268, 272, 15, 2);
  b.plank(275, 280, 13);
  b.coins(275, 280, 12);
  pit(b, 253, 283);
  b.ground(284, 310, 19);
  b.checkpoint(287, 18);

  // ===== 6. Sturmfelsen (291-340) + FEUER =====
  b.ground(293, 295, 17);
  b.ground(298, 306, 15);
  fireCave(b, 299, 302, 17, 18, -1);
  b.coins(296, 304, 13);
  b.mummy(304, 14);
  b.decor('T', 309, 18);
  b.ground(311, 316, 17);
  // Gegenwind am Abhang, Luecke mit Pilz
  b.wind(317, 330, 10, 18, -1);
  b.island(320, 322, 18, 1); b.spring(321, 17);
  b.island(326, 333, 11, 3);
  b.coins(327, 332, 10);
  b.mummy(331, 10);
  pit(b, 317, 340);

  // ===== 7. Windkanal (336-380) + GESCHICK =====
  b.cloud(337, 340, 14);
  b.ground(343, 360, 19);
  b.decor('b', 345, 18);
  // Geschick: Windkanal hoch oben – Rueckenwind traegt ueber die Broeckelsteine
  b.stone(347, 348, 17, 18); b.stone(349, 351, 14, 18);
  b.stone(352, 355, 12, 18);
  b.crumble(358, 359, 10); b.crumble(363, 364, 10); b.crumble(368, 369, 10);
  b.wind(356, 375, 8, 9, 1);
  b.island(372, 375, 10, 1); b.gem(374, 8);
  b.coins(358, 359, 9); b.coins(363, 364, 9); b.coins(368, 369, 9);
  b.ground(361, 378, 19);
  b.mummy(366, 18);

  // ===== 8. Sturmtor (379-429): Ziel =====
  b.wind(379, 392, 12, 18, 1);
  pit(b, 379, 386);
  b.ground(387, 429, 19);
  b.arc(378, 388, 14, 3);
  b.decor('i', 392, 18); b.decor('A', 400, 18);
  b.mummy(396, 18); b.mummyTall(405, 18);
  b.coins(393, 401, 17);
  b.goal(416, 18);
  b.decor('T', 424, 18);

  return b.section('Sturmbrücken');
}
