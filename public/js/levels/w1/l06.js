// Level 6: Uhrwerk-Inseln – Riesenraeder (Plattformen auf Kreisbahnen),
// Aufzuege, Broeckelsteine. Neu: Geister-Mumien schweben ueber Abgruenden.
import { MapBuilder, waterTunnel, earthVault, fireCage, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(440, 24);

  // ===== 1. Goldene Wiese (0-48): erstes Riesenrad =====
  b.ground(0, 28, 19);
  b.start(3, 18);
  b.decor('T', 8, 18); b.decor('b', 16, 18); b.decor('i', 24, 18);
  b.coins(11, 15, 17);
  b.wheel(36, 13, 4, 4, 3, 2.1, 1);
  b.coins(35, 37, 7);
  pit(b, 29, 44);
  b.ground(45, 66, 19);
  b.decor('r', 49, 18);
  b.mummy(56, 18);
  b.coins(50, 55, 17);

  // ===== 2. Uhrturm (60-110): Aufzuege und Geister =====
  b.stone(62, 66, 16, 18);
  b.coins(62, 66, 15);
  b.mover(2, [[68, 16], [68, 8]], 2.2);
  b.island(72, 79, 8, 3);
  b.decor('i', 77, 7);
  b.coins(72, 76, 7);
  b.ghost(83, 7, 81, 89);
  b.mover(3, [[83, 11], [88, 11]], 2.3, { phase: 0.5 });
  b.island(92, 97, 10, 2);
  b.mummy(95, 9);
  b.crumble(100, 101, 12); b.crumble(104, 105, 14);
  b.coins(100, 101, 11); b.coins(104, 105, 13);
  pit(b, 67, 108);
  b.ground(108, 130, 19);
  b.checkpoint(111, 18);
  // ERDE: Kammer unter dem Turmsockel
  b.stone(112, 113, 16, 18);
  b.stone(115, 125, 13, 18);
  earthVault(b, 117, 123, 13, 2, { lid: [119, 120], floor: [122, 123] });
  b.clear(115, 125, 17, 18);              // Durchgang fuer alle
  b.coins(116, 124, 12);
  b.mummy(128, 18);

  // ===== 3. Doppelrad (131-185) =====
  b.wheel(140, 13, 4, 3, 3, 2.0, 1);
  b.wheel(154, 11, 4, 3, 3, 2.0, -1);
  b.coins(139, 141, 7); b.coins(153, 155, 5);
  b.ghost(147, 15, 144, 150);
  pit(b, 131, 162);
  b.island(163, 170, 13, 3);
  b.mummy(168, 12);
  b.coins(164, 169, 12);
  b.cloud(173, 176, 16); b.coins(173, 176, 15);
  b.ground(179, 210, 19);
  b.checkpoint(182, 18);

  // ===== 4. Zahnradgarten (186-250) + FEUER =====
  b.decor('T', 188, 18);
  b.ground(193, 203, 16);
  fireCage(b, 196, 199, 16);
  // LUFT: Wolke hoch ueber dem Rankenkaefig
  airPerch(b, 193, 197, 7);
  b.mummy(202, 15);
  b.decor('b', 207, 18);
  b.wheel(220, 12, 5, 4, 3, 2.4, 1);
  b.coins(219, 221, 5);
  b.ghost(221, 17, 214, 228);
  pit(b, 211, 230);
  b.ground(231, 254, 19);
  b.mummyTall(238, 18);
  b.decor('A', 246, 18);
  b.coins(232, 236, 17);

  // ===== 5. Pendelbahn (255-310) =====
  b.mover(3, [[256, 16], [264, 12], [272, 16]], 2.6);
  b.coins(258, 270, 11);
  b.ghost(268, 9, 262, 276);
  b.island(276, 281, 15, 2);
  b.spring(280, 14);
  b.mover(2, [[284, 9], [292, 9]], 2.3);
  b.island(296, 303, 11, 3);
  b.mummy(301, 10);
  b.coins(296, 302, 10);
  b.cloud(306, 309, 15);
  pit(b, 255, 311);

  // ===== 6. Werkstatt (311-370) + WASSER + GESCHICK =====
  b.ground(311, 372, 19);
  b.checkpoint(314, 18);
  b.stone(318, 319, 17, 18);
  b.stone(320, 322, 14, 16);
  b.coins(320, 322, 13);
  waterTunnel(b, 323, 14);
  b.mummy(338, 18);
  // Geschick: kleines Rad hoch oben, Kristall auf der Spitze erwischen
  b.stone(342, 343, 16, 18);
  b.stone(345, 348, 13, 18);
  b.wheel(355, 9, 3, 2, 2, 1.8, 1);
  b.gem(355, 3);
  b.coins(345, 348, 12);
  b.stone(362, 365, 12, 18);
  b.coins(362, 365, 11);
  b.mummyTall(369, 18);

  // ===== 7. Glockentor (373-439): Ziel =====
  b.island(374, 375, 17, 1);
  b.wheel(381, 14, 3, 3, 3, 2.0, -1);
  pit(b, 373, 388);
  b.ground(389, 439, 19);
  b.decor('i', 393, 18); b.decor('A', 401, 18);
  b.coins(394, 402, 17);
  b.mummy(398, 18); b.mummyTall(410, 18);
  b.ghost(414, 15, 406, 420);
  b.goal(426, 18);
  b.decor('T', 434, 18);

  return b.section('Uhrwerk-Inseln');
}
