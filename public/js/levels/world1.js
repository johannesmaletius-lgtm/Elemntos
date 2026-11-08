// Welt 1: Himmelsinseln. Weitere Maps einfach in "maps" ergaenzen.
import { MapBuilder } from '../level.js';

function map1() {
  const b = new MapBuilder(605, 24);

  // ===== 1. Startwiese (0-48): Laufen, Springen, erster Pilz =====
  b.ground(0, 25, 19);
  b.start(3, 18);
  b.decor('T', 6, 18); b.decor('b', 15, 18); b.decor('r', 23, 18);
  b.coins(9, 12, 17);
  b.plank(16, 20, 16); b.coins(16, 20, 15);
  b.ground(26, 33, 18);
  b.decor('i', 31, 17);
  b.ground(36, 46, 18);                 // Luecke 34-35
  b.spring(41, 17);
  b.arc(38, 44, 11, 2);
  b.decor('b', 37, 17);
  b.mummy(29, 17);                      // erste Mumie: draufspringen!
  b.mummy(44, 17);

  // ===== 2. Erste Inseln (47-106): Luecken, Hoehenwechsel =====
  b.ground(50, 57, 19);                 // Luecke 47-49
  b.decor('b', 54, 18);
  b.arc(58, 60, 16, 1);
  b.island(61, 66, 17, 3);
  b.arc(67, 69, 14, 1);
  b.island(70, 74, 15, 3);
  // LUFT-Geheimnis: nur mit Doppelsprung erreichbar
  b.plank(70, 73, 9); b.gem(72, 8); b.coins(70, 71, 8);
  b.arc(75, 78, 13, 1);
  b.island(79, 85, 16, 4);
  b.mummy(80, 15);
  b.arc(86, 90, 14, 2);                 // 5er-Luecke: Anlauf nehmen!
  b.island(91, 94, 17, 2);
  b.island(98, 103, 15, 3);
  b.plank(99, 102, 11); b.coins(99, 102, 10);
  b.mummy(101, 14);
  b.arc(104, 107, 14, 1);

  // ===== 3. Pilzspruenge (107-148) =====
  b.ground(107, 121, 19);
  b.checkpoint(110, 18);
  b.decor('b', 116, 18);
  b.thorns(113, 114, 18);
  b.coins(113, 114, 15);
  b.spring(120, 18);
  b.coins(121, 121, 12); b.coins(122, 122, 11);
  b.island(123, 128, 11, 2);
  b.coins(124, 127, 10);
  b.island(132, 133, 15, 1);
  b.spring(133, 14);
  b.arc(129, 132, 9, 1);
  b.island(138, 145, 9, 2);
  b.thorns(141, 142, 8);
  b.arc(140, 143, 7, 1);
  b.coins(144, 145, 8);

  // ===== 4. Faehren ueber dem Wolkenmeer (149-202) =====
  b.ground(149, 162, 19);
  b.decor('A', 157, 18);
  b.coins(151, 154, 17);
  b.mummy(159, 18);
  b.mover(3, [[164, 18], [172, 18]], 2.4);
  b.coins(166, 170, 16);
  b.island(177, 179, 17, 2);
  b.coin(178, 16);
  b.mover(2, [[181, 17], [181, 10]], 2.1);
  b.island(184, 190, 10, 2);
  b.coins(185, 189, 9);
  b.decor('i', 186, 9);
  b.mummy(188, 9);
  // WASSER-Geheimnis: weite Luecke, nur mit Dash (oder Gleiten)
  b.island(200, 203, 8, 2); b.gem(202, 7); b.coin(201, 7);
  b.arc(192, 199, 8, 2);
  b.mover(3, [[192, 13], [197, 17]], 2.3);

  // ===== 5. Broeckelbruecke & Dornenfeld (203-250) =====
  b.ground(203, 215, 19);
  b.checkpoint(206, 18);
  b.decor('r', 212, 18);
  b.crumble(216, 227, 19);              // weitergehen, nicht stehenbleiben!
  b.coins(217, 226, 17);
  b.ground(228, 231, 19);
  b.ground(232, 250, 22); b.thorns(232, 250, 21);
  b.island(234, 235, 18, 1);
  b.crumble(238, 239, 17);
  b.island(242, 243, 16, 1);
  b.crumble(246, 248, 17);
  b.arc(232, 234, 16, 1); b.arc(236, 238, 15, 1); b.arc(240, 242, 14, 1); b.arc(244, 246, 14, 1); b.arc(249, 251, 16, 1);

  // ===== 6. Ruinenturm (251-290): Klettern + ERDE-Geheimnis =====
  b.ground(251, 290, 19);
  b.decor('b', 254, 18);
  b.mummy(256, 18);
  // Turm: Waende 259 und 269, oben offen nach rechts
  b.stone(259, 259, 5, 15);             // linke Wand (unten Eingang 16-18)
  b.stone(269, 269, 8, 18);             // rechte Wand
  b.stone(259, 269, 4, 4);              // Dach
  b.plank(260, 263, 16);
  b.plank(265, 268, 13);
  b.plank(260, 263, 10);
  b.plank(264, 268, 7);
  b.coins(261, 262, 15); b.coins(266, 267, 12); b.coins(261, 262, 9);
  b.clear(269, 269, 5, 6);              // Ausgang oben rechts
  b.stone(269, 269, 7, 7);
  // Ausgangs-Sims mit Kammer darunter
  b.stone(270, 278, 7, 8);
  b.cracked(273, 274, 7, 8);            // nur der Erd-Stampfer bricht durch
  b.stone(270, 270, 9, 12);             // linke Kammerwand
  b.stone(278, 278, 9, 12);             // rechte Kammerwand
  b.stone(270, 276, 12, 12);            // Kammerboden, Loch bei 277 -> nach unten raus
  b.gem(275, 11); b.coins(271, 272, 11);
  b.island(280, 283, 11, 1);
  b.island(285, 287, 15, 1);
  b.coins(280, 283, 10); b.arc(284, 287, 13, 1);
  b.decor('i', 288, 18);
  b.mummyTall(278, 18); b.mummy(285, 18);

  // ===== 7. Aufwind-Schlucht (291-334) =====
  b.ground(291, 305, 19);
  b.checkpoint(294, 18);
  b.decor('A', 300, 18);
  b.updraft(306, 312, 8, 23);           // Aufwind hebt dich hoch
  b.coins(309, 309, 12); b.coins(309, 309, 9);
  b.island(314, 318, 9, 2);
  b.coins(315, 317, 8);
  b.mummy(317, 8);
  b.updraft(320, 326, 7, 23);
  b.stone(322, 323, 13, 13); b.thorns(322, 323, 12); b.ceilThorns(322, 323, 14);
  b.coins(321, 321, 9); b.coins(325, 325, 9); b.coins(323, 323, 6);
  b.island(328, 332, 8, 2);
  b.coins(329, 331, 7);

  // ===== 8. Dornenhain (333-392) + FEUER-Geheimnis =====
  b.ground(333, 340, 19);
  b.decor('r', 335, 18);
  b.mummy(338, 18);
  b.ground(341, 375, 22); b.thorns(341, 375, 21);
  b.island(343, 344, 18, 1);
  b.island(347, 348, 16, 1);
  b.ceilThorns(346, 349, 11);
  b.crumble(351, 352, 16);
  b.island(355, 356, 17, 1);
  b.mover(2, [[358, 15], [364, 15]], 2.6);
  b.island(367, 368, 15, 1);
  b.crumble(371, 372, 17);
  b.arc(341, 343, 16, 1); b.arc(345, 347, 14, 1); b.arc(349, 351, 14, 1); b.arc(353, 355, 15, 1);
  b.coins(359, 364, 13); b.arc(369, 371, 14, 1); b.arc(373, 376, 16, 1);
  b.ground(376, 383, 19);
  b.mummyTall(380, 18);
  b.ground(384, 392, 16);               // Felsstufe
  b.clear(385, 387, 17, 18);            // Hoehle in der Stufe...
  b.vine(384, 384, 17, 18);             // ...versperrt von Ranken (Feuerball!)
  b.gem(386, 18); b.coin(385, 18); b.coin(387, 18);
  b.checkpoint(390, 15);

  // ===== 9. Wasserfall-Klippen (393-450) =====
  b.mover(2, [[394, 17], [394, 9]], 2.0);
  b.island(398, 401, 9, 2);
  b.coins(398, 401, 8);
  b.mummy(400, 8);
  b.crumble(404, 406, 10);
  b.mover(3, [[409, 12], [415, 12]], 2.8);
  b.coins(410, 416, 10);
  b.island(419, 421, 13, 2);
  b.mover(2, [[424, 15], [424, 8]], 2.3);
  b.island(427, 432, 8, 2);
  b.coins(428, 431, 7);
  b.mummy(430, 7);
  // Geschick-Kristall: Broeckeltreppe nach oben
  b.crumble(434, 435, 6);
  b.crumble(438, 439, 4);
  b.island(441, 443, 3, 1); b.gem(442, 2);
  b.coins(434, 435, 5); b.coins(438, 439, 3);
  b.ground(433, 452, 19);
  b.decor('T', 443, 18);
  b.checkpoint(449, 18);

  // ===== 10. Himmelstreppe (453-490) =====
  b.ground(453, 490, 22); b.thorns(453, 490, 21);
  b.mover(2, [[454, 18], [454, 13]], 2.3);
  b.island(458, 460, 13, 1);
  b.coins(458, 460, 12);
  b.crumble(463, 464, 12);
  b.mover(3, [[467, 12], [474, 12]], 3.0);
  b.coins(468, 474, 10);
  b.island(478, 479, 13, 1);
  b.spring(479, 12);
  b.island(483, 488, 7, 2);
  b.coins(483, 488, 6);
  b.mummy(486, 6);
  b.arc(480, 483, 4, 1);

  // ===== 11. Sturmkante (491-551): Aufwind, Broeckelkette, Faehre, Pilz =====
  b.ground(491, 498, 19);
  b.decor('b', 494, 18);
  b.mummy(497, 18);
  b.updraft(500, 503, 9, 23);
  b.coins(501, 502, 13); b.coins(501, 502, 10);
  b.island(506, 508, 9, 1);
  b.thorns(508, 508, 8);
  b.crumble(511, 512, 11);
  b.crumble(515, 516, 9);
  b.crumble(519, 520, 11);
  b.crumble(523, 524, 9);
  b.arc(509, 511, 9, 1); b.arc(513, 515, 7, 1); b.arc(517, 519, 8, 1); b.arc(521, 523, 7, 1);
  b.mover(3, [[527, 10], [534, 14]], 2.6);
  b.coins(528, 533, 8);
  b.island(538, 540, 15, 2);
  b.spring(540, 14);
  b.island(544, 549, 8, 2);
  b.coins(544, 549, 7);
  b.decor('i', 546, 7);
  b.mummy(548, 7);

  // ===== 12. Ruinen-Tor (552-604): Ziel =====
  b.ground(552, 604, 19);
  b.decor('i', 558, 18); b.decor('b', 562, 18); b.decor('A', 570, 18); b.decor('i', 578, 18);
  b.coins(560, 568, 17);
  b.arc(572, 582, 15, 3);
  b.mummy(562, 18); b.mummyTall(575, 18); b.mummy(580, 18); b.mummyTall(586, 18);
  b.goal(592, 18);
  b.decor('T', 600, 18);

  return b.section('Himmelsinseln 1');
}

export const WORLD1 = {
  id: 'w1',
  name: 'Himmelsinseln',
  maps: [
    { id: 'w1-1', name: 'Der Aufbruch', height: 24, sections: [map1()] },
  ],
};
