// Level 2: Wolkenpfad – Wolken-Plattformen (von unten durchspringbar),
// Wolkentreppen, Broeckelwolken ueber dem Wolkenmeer, Aufwind zum Ziel.
import { MapBuilder, waterTunnel, earthVault, fireCave, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(352, 24);

  // ===== 1. Morgenwiese (0-60): erste Wolken =====
  b.ground(0, 22, 19);
  b.start(3, 18);
  b.decor('T', 8, 18); b.decor('b', 16, 18);
  b.coins(11, 14, 17);
  b.cloud(25, 28, 17); b.cloud(31, 34, 15); b.cloud(37, 40, 17);
  b.arc(23, 26, 15, 1); b.coins(31, 34, 13); b.arc(35, 39, 14, 1);
  // LUFT: Wolke hoch ueber der Wolkentreppe
  airPerch(b, 30, 33, 9);
  b.ground(43, 60, 19);
  b.decor('r', 47, 18);
  b.mummy(52, 18);
  b.spring(58, 18);

  // ===== 2. Ruineninsel (61-112): oben Wolkenweg, unten Mumien =====
  b.ground(64, 112, 19);
  b.checkpoint(67, 18);
  b.cloud(64, 67, 12); b.cloud(71, 74, 11);
  b.coins(64, 67, 11); b.coins(71, 74, 10);
  b.island(78, 88, 11, 4);
  b.decor('i', 79, 10);
  // ERDE: Kammer in der Insel (Deckel stampfen, unten wieder raus)
  earthVault(b, 81, 85, 11, 2);
  b.mummy(87, 10);
  b.cloud(92, 95, 14); b.coins(92, 95, 13);
  b.mummy(73, 18); b.mummyTall(98, 18); b.mummy(108, 18);
  b.decor('b', 103, 18); b.decor('A', 110, 18);
  b.coins(95, 101, 17);

  // ===== 3. Wolkenmeer (113-160): Broeckelwolken, Faehre =====
  b.crumble(115, 117, 17);
  b.cloud(121, 124, 15);
  b.crumble(128, 129, 14);
  b.cloud(133, 136, 13);
  b.mover(3, [[140, 14], [148, 14]], 2.5);
  b.cloud(152, 155, 16);
  b.arc(113, 116, 15, 1); b.arc(118, 121, 13, 1); b.coins(128, 129, 12); b.coins(133, 136, 11); b.coins(141, 148, 12); b.coins(152, 155, 14);
  b.mover(2, [[124, 19], [131, 19]], 2.2);   // Rettungsfaehre tief unten
  b.coins(125, 130, 18);

  // ===== 4. Dornentunnel (158-188) + WASSER =====
  b.ground(158, 188, 19);
  b.checkpoint(161, 18);
  b.stone(166, 167, 17, 18);
  b.stone(168, 170, 14, 16);
  b.coins(168, 170, 13);
  waterTunnel(b, 171, 14);
  b.decor('i', 184, 18);
  b.mummy(186, 18);

  // ===== 5. Himmelsfaehre (189-232) =====
  b.mover(2, [[190, 18], [190, 10]], 2.1);
  b.cloud(194, 198, 10); b.coins(194, 198, 9);
  b.cloud(202, 205, 8); b.coins(202, 205, 7);
  b.island(209, 216, 9, 3);
  b.decor('b', 210, 8);
  b.mummy(214, 8);
  b.cloud(220, 223, 12); b.cloud(226, 229, 15);
  b.arc(217, 220, 9, 1); b.arc(224, 227, 12, 1);
  pit(b, 189, 230);

  // ===== 6. Felsnase (231-266) + FEUER =====
  b.ground(231, 266, 19);
  b.ground(241, 243, 17);
  b.ground(246, 256, 15);
  fireCave(b, 247, 250, 17, 18, -1);
  b.decor('T', 236, 18);
  b.mummy(254, 14);
  b.coins(246, 252, 13);
  b.checkpoint(262, 18);

  // ===== 7. Aufwind zur Himmelsinsel (267-310) + GESCHICK =====
  b.updraft(268, 272, 7, 23);
  b.coins(270, 270, 15); b.coins(270, 270, 11);
  b.cloud(275, 279, 8); b.coins(275, 279, 7);
  b.island(283, 292, 10, 3);
  b.decor('i', 285, 9);
  b.mummy(290, 9);
  // Geschick: Broeckeltreppe nach oben
  b.crumble(295, 296, 8); b.crumble(299, 300, 6); b.cloud(303, 305, 4);
  b.gem(304, 2);
  b.coins(295, 296, 7); b.coins(299, 300, 5);
  b.cloud(296, 299, 13); b.arc(293, 297, 11, 1);

  // ===== 8. Morgentor (300-351): Ziel =====
  b.ground(301, 351, 19);
  b.decor('b', 306, 18); b.decor('A', 314, 18); b.decor('i', 322, 18);
  b.coins(308, 316, 17);
  b.mummy(318, 18); b.mummyTall(326, 18);
  b.cloud(311, 315, 15); b.coins(311, 315, 14);
  b.goal(338, 18);
  b.decor('T', 346, 18);

  // ===== Neu (eingeschoben, von rechts nach links): =====
  // B) Wolkenbruecke ueber der Dornengrube (vor dem Morgentor)
  {
    const x = 310;
    b.splice(x, 120);
    b.ground(x, x + 8, 19);
    b.checkpoint(x + 3, 18);
    b.decor('b', x + 6, 18);
    pit(b, x + 9, x + 62);
    b.cloud(x + 11, x + 14, 17); b.cloud(x + 18, x + 21, 15);
    b.crumble(x + 25, x + 26, 14); b.cloud(x + 30, x + 33, 13);
    b.mover(3, [[x + 37, 13], [x + 45, 13]], 2.4);
    b.cloud(x + 51, x + 54, 15); b.cloud(x + 58, x + 61, 17);
    b.arc(x + 8, x + 11, 15, 1); b.arc(x + 14, x + 18, 13, 1); b.coins(x + 25, x + 26, 12); b.coins(x + 30, x + 33, 11);
    b.coins(x + 38, x + 47, 11); b.arc(x + 54, x + 58, 13, 1);
    b.cloud(x + 40, x + 46, 19); b.coins(x + 41, x + 45, 18);   // tiefe Rettungswolke
    b.ground(x + 63, x + 88, 19);
    b.decor('b', x + 66, 18); b.decor('i', x + 75, 18); b.decor('T', x + 84, 18);
    b.mummy(x + 70, 18); b.mummyTall(x + 80, 18);
    b.coins(x + 65, x + 69, 17); b.coins(x + 76, x + 79, 17);
    // Bluetenstufen: Pilz hinauf zu einem Wolkenbogen, unten weiter Boden
    b.ground(x + 89, x + 119, 19);
    b.spring(x + 94, 18);
    b.cloud(x + 97, x + 101, 11); b.cloud(x + 104, x + 107, 12); b.cloud(x + 110, x + 113, 14);
    b.coins(x + 97, x + 101, 10); b.coins(x + 104, x + 107, 11); b.coins(x + 110, x + 113, 13);
    b.mummy(x + 104, 18); b.mummy(x + 114, 18);
    b.decor('r', x + 91, 18); b.decor('b', x + 117, 18);
  }
  // A) Kirschbluetenterrassen und Bluetenbruecke (nach der Ruineninsel)
  {
    const x = 105;
    b.splice(x, 130);
    b.ground(x, x + 11, 19);
    b.coins(x + 2, x + 8, 17);
    b.island(x + 13, x + 18, 17, 3); b.island(x + 21, x + 26, 15, 3); b.island(x + 29, x + 35, 13, 3);
    b.decor('b', x + 14, 16); b.decor('T', x + 23, 14); b.mummy(x + 33, 12);
    b.cloud(x + 39, x + 42, 15); b.cloud(x + 46, x + 49, 17);
    b.coins(x + 13, x + 18, 15); b.arc(x + 18, x + 21, 13, 1); b.arc(x + 26, x + 29, 11, 1);
    b.arc(x + 35, x + 39, 12, 1); b.arc(x + 42, x + 46, 14, 1);
    pit(b, x + 12, x + 51);
    b.ground(x + 52, x + 70, 19);
    b.checkpoint(x + 55, 18);
    b.decor('A', x + 61, 18); b.mummy(x + 66, 18);
    b.coins(x + 58, x + 64, 17);
    // Bluetenbruecke: Stege mit Broeckelstuecken ueber der Grube, oben Wolken mit Muenzen
    b.plank(x + 72, x + 79, 17); b.crumble(x + 80, x + 83, 17);
    b.plank(x + 84, x + 90, 17); b.crumble(x + 91, x + 94, 17);
    b.plank(x + 95, x + 104, 17); b.cloud(x + 108, x + 111, 18);
    b.mummy(x + 88, 16); b.mummy(x + 101, 16);
    b.cloud(x + 81, x + 84, 12); b.cloud(x + 92, x + 95, 11);
    b.coins(x + 73, x + 78, 16); b.coins(x + 80, x + 83, 15); b.coins(x + 91, x + 94, 15);
    b.coins(x + 81, x + 84, 11); b.coins(x + 92, x + 95, 10); b.coins(x + 108, x + 111, 17);
    pit(b, x + 71, x + 113);
    b.ground(x + 114, x + 129, 19);
    b.mummy(x + 121, 18); b.coins(x + 116, x + 119, 17);
    b.decor('r', x + 126, 18);
  }

  return b.section('Wolkenpfad');
}
