// Level 3: Pilzhain – Pilz-Ketten ueber dem Abgrund, Pilztuerme, Rankenkaefig,
// tiefe Erd-Gruft. Viele Mumien.
import { MapBuilder, waterTunnel, earthShaft, fireCage, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(400, 24);

  // ===== 1. Pilzwiese (0-52) =====
  b.ground(0, 30, 19);
  b.start(3, 18);
  b.decor('T', 7, 18); b.decor('b', 13, 18); b.decor('T', 27, 18);
  b.coins(9, 12, 17);
  b.spring(19, 18);
  b.plank(21, 26, 11); b.coins(21, 26, 10);
  b.mummy(24, 18);
  b.ground(35, 52, 19);                  // Luecke 31-34
  b.arc(30, 35, 16, 2);
  b.decor('r', 39, 18);
  b.mummy(45, 18);

  // ===== 2. Pilzkette ueber dem Abgrund (53-105) =====
  b.island(54, 56, 18, 1); b.spring(55, 17);
  b.coins(55, 55, 13); b.coins(56, 56, 11);
  b.island(60, 65, 11, 2);
  b.coins(61, 64, 10);
  b.island(69, 70, 16, 1); b.spring(69, 15);
  b.island(74, 80, 9, 2);
  b.decor('b', 75, 8);
  b.mummy(78, 8);
  b.island(84, 86, 15, 1); b.spring(85, 14);
  b.coins(85, 85, 10);
  b.island(90, 96, 10, 2);
  b.coins(91, 95, 9);
  b.cloud(100, 103, 14); b.coins(100, 103, 13);
  pit(b, 53, 105);

  // ===== 3. Rankenhain (106-160) + FEUER =====
  b.ground(106, 160, 19);
  b.checkpoint(109, 18);
  b.decor('T', 114, 18);
  b.ground(118, 128, 16);
  b.decor('b', 119, 15);
  // FEUER: Kristall im Rankenkaefig auf dem Huegel
  fireCage(b, 122, 125, 16);
  b.mummyTall(135, 18);
  b.mummy(142, 18);
  b.spring(147, 18);
  b.plank(149, 154, 10); b.coins(149, 154, 9);
  b.decor('i', 152, 18); b.decor('b', 157, 18); b.decor('r', 131, 18);
  b.coins(130, 140, 17);

  // ===== 4. Pilztuerme (161-232) + LUFT =====
  b.ground(161, 232, 19);
  b.spring(166, 18);
  b.stone(169, 172, 11, 18);
  b.coins(169, 172, 10);
  b.stone(178, 181, 9, 18);
  b.mummy(180, 8);
  b.coins(175, 176, 8);
  // LUFT: Wolke hoch ueber dem zweiten Turm
  airPerch(b, 178, 181, 3);
  b.stone(187, 190, 12, 18);
  b.spring(193, 18);
  b.stone(196, 199, 10, 18);
  b.coins(196, 199, 9);
  b.mummy(184, 18); b.mummy(202, 18);
  b.decor('T', 217, 18); b.decor('b', 222, 18);
  // ERDE: schwebender Steinblock mit tiefer Gruft (3 Lagen rissiger Stein)
  earthShaft(b, 206, 10, 3);
  b.coins(205, 208, 9);
  b.mummy(214, 18); b.mummyTall(226, 18);

  // ===== 5. Faehren & Bruecke (233-300) + WASSER =====
  b.mover(3, [[234, 17], [242, 17]], 2.4);
  b.coins(236, 242, 15);
  b.island(246, 249, 15, 2);
  b.spring(248, 14);
  b.island(252, 258, 9, 2);
  b.mummy(256, 8);
  b.crumble(261, 263, 12); b.crumble(266, 267, 14);
  b.coins(261, 263, 11); b.coins(266, 267, 13);
  pit(b, 233, 270);
  b.ground(270, 300, 19);
  b.checkpoint(273, 18);
  b.stone(276, 277, 17, 18);
  b.stone(278, 280, 14, 16);
  b.coins(278, 280, 13);
  waterTunnel(b, 281, 14, { gaps: 2, after: 3 });
  b.mummy(295, 18);

  // ===== 6. Pilzgipfel (301-350) + GESCHICK =====
  b.island(303, 305, 18, 1); b.spring(304, 17);
  b.island(309, 316, 10, 2);
  b.coins(310, 315, 9);
  b.mummy(314, 9);
  // Geschick: Pilz -> Broeckel -> Broeckel -> hoch oben
  b.island(320, 321, 14, 1); b.spring(320, 13);
  b.crumble(324, 325, 6); b.crumble(328, 329, 4);
  b.island(332, 334, 3, 1); b.gem(333, 1);
  b.coins(324, 325, 5); b.coins(328, 329, 3);
  b.cloud(325, 329, 13); b.coins(325, 329, 12);
  b.island(333, 340, 16, 2);
  pit(b, 301, 343);

  // ===== 7. Ziel im Pilzwald (344-399) =====
  b.ground(344, 399, 19);
  b.decor('T', 348, 18); b.decor('b', 356, 18); b.decor('T', 366, 18); b.decor('b', 377, 18); b.decor('r', 380, 18);
  b.coins(350, 358, 17);
  b.spring(361, 18); b.arc(361, 371, 11, 3);
  b.mummy(358, 18); b.mummyTall(372, 18);
  b.goal(386, 18);
  b.decor('T', 394, 18);

  // ===== Neu (eingeschoben, von rechts nach links): =====
  // B) Riesenpilz-Stufen und Lichtung (vor dem Ziel)
  {
    const x = 346;
    b.splice(x, 100);
    b.ground(x, x + 9, 19);
    b.checkpoint(x + 3, 18);
    b.coins(x + 5, x + 8, 17);
    pit(b, x + 10, x + 61);
    b.island(x + 11, x + 13, 18, 1); b.spring(x + 12, 17);
    b.coins(x + 12, x + 12, 13);
    b.island(x + 17, x + 24, 11, 2);
    b.coins(x + 18, x + 21, 10); b.mummy(x + 23, 10);
    b.island(x + 28, x + 29, 16, 1); b.spring(x + 28, 15);
    b.coins(x + 29, x + 29, 11);
    b.island(x + 33, x + 40, 8, 2);
    b.decor('b', x + 34, 7); b.mummyTall(x + 38, 7);
    b.coins(x + 34, x + 37, 7);
    b.cloud(x + 44, x + 47, 11); b.cloud(x + 51, x + 54, 14); b.cloud(x + 57, x + 60, 17);
    b.arc(x + 41, x + 44, 9, 1); b.arc(x + 47, x + 51, 12, 1); b.arc(x + 54, x + 57, 15, 1);
    b.ground(x + 62, x + 99, 19);
    b.decor('T', x + 64, 18); b.decor('b', x + 72, 18); b.decor('T', x + 82, 18); b.decor('r', x + 90, 18);
    b.mummy(x + 69, 18); b.mummy(x + 86, 18); b.mummyTall(x + 94, 18);
    b.spring(x + 76, 18);
    b.plank(x + 78, x + 83, 11); b.coins(x + 78, x + 83, 10);
    b.coins(x + 65, x + 68, 17); b.coins(x + 88, x + 92, 17);
  }
  // A) Sporen-Schlucht: Pilze, Broeckelsteine, Faehre (vor den Pilztuermen)
  {
    const x = 161;
    b.splice(x, 95);
    b.ground(x, x + 6, 19);
    b.coins(x + 2, x + 5, 17);
    pit(b, x + 7, x + 68);
    b.island(x + 9, x + 11, 18, 1); b.spring(x + 10, 17);
    b.island(x + 15, x + 21, 10, 2);
    b.coins(x + 15, x + 18, 9); b.mummy(x + 20, 9);
    b.crumble(x + 25, x + 26, 11); b.crumble(x + 29, x + 30, 12);
    b.coins(x + 25, x + 26, 10); b.coins(x + 29, x + 30, 11);
    b.island(x + 33, x + 35, 15, 1); b.spring(x + 34, 14);
    b.island(x + 39, x + 46, 9, 2);
    b.decor('b', x + 40, 8); b.mummy(x + 44, 8);
    b.coins(x + 41, x + 43, 8);
    b.cloud(x + 50, x + 53, 12); b.coins(x + 50, x + 53, 11);
    b.mover(3, [[x + 56, 14], [x + 63, 14]], 2.3);
    b.coins(x + 57, x + 64, 12);
    b.ground(x + 69, x + 94, 19);
    b.checkpoint(x + 72, 18);
    b.decor('T', x + 84, 18); b.decor('r', x + 76, 18);
    b.mummy(x + 80, 18); b.mummy(x + 90, 18);
    b.coins(x + 77, x + 82, 17);
  }

  return b.section('Pilzhain');
}
