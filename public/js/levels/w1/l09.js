// Level 9: Sternennacht – leuchtende Wolkenwege, Aufwind-Ketten, das Mondrad
// und viele Geister-Mumien in der Nacht.
import { MapBuilder, waterTunnel, earthVault, fireCave, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(440, 24);

  // ===== 1. Sternenwiese (0-52) =====
  b.ground(0, 30, 19);
  b.start(3, 18);
  b.decor('T', 7, 18); b.decor('b', 15, 18); b.decor('r', 22, 18);
  b.coins(10, 14, 17);
  b.cloud(33, 36, 17); b.cloud(39, 42, 15);
  b.coins(33, 36, 16); b.coins(39, 42, 14);
  b.ghost(38, 11, 32, 44);
  pit(b, 31, 44);
  b.ground(45, 58, 19);
  b.mummy(52, 18);

  // ===== 2. Wolkenmeer der Geister (59-125) =====
  b.cloud(60, 63, 16);
  b.cloud(67, 70, 13);
  b.ghost(73, 12, 70, 78);
  b.cloud(76, 79, 14);
  b.cloud(83, 85, 11);
  b.ghost(89, 10, 86, 94);
  b.cloud(91, 95, 13);
  // LUFT: Wolke hoch ueber dem Wolkenmeer
  airPerch(b, 82, 86, 5);
  b.cloud(99, 102, 16);
  b.ghost(106, 15, 103, 110);
  b.cloud(108, 111, 17);
  b.coins(60, 63, 15); b.coins(67, 70, 12); b.coins(76, 79, 13); b.coins(83, 85, 10); b.coins(91, 95, 12); b.coins(99, 102, 15); b.coins(108, 111, 16);
  pit(b, 59, 114);
  b.ground(115, 132, 19);
  b.checkpoint(118, 18);
  b.mummyTall(127, 18);

  // ===== 3. Aufwind-Kette (133-190) =====
  b.updraft(134, 137, 10, 23);
  b.cloud(140, 143, 11);
  b.updraft(146, 149, 6, 23);
  b.ghost(149, 9, 144, 154);
  b.cloud(152, 156, 7);
  b.coins(153, 155, 6);
  b.updraft(159, 162, 9, 23);
  b.cloud(165, 168, 12);
  b.island(172, 180, 14, 3);
  b.mummy(178, 13);
  // ERDE: Gewoelbe in der Insel, darunter Wolke als Auffang
  earthVault(b, 173, 179, 14, 2, { lid: [174, 175], floor: [178, 179] });
  b.cloud(176, 184, 20);
  b.coins(135, 136, 15); b.coins(147, 148, 12); b.coins(160, 161, 13);
  pit(b, 133, 188);
  b.ground(187, 200, 19);

  // ===== 4. Mondrad (195-250) =====
  b.checkpoint(190, 18);
  b.stone(200, 200, 17, 18);
  b.spitter(200, 16, 1, 3.0, 0.5);        // Speier fegt unter dem Rad entlang
  b.wheel(209, 12, 5, 4, 3, 2.2, -1);
  b.coins(208, 210, 5);
  b.island(220, 223, 14, 2);
  b.coins(220, 223, 13);
  pit(b, 201, 229);
  b.ground(230, 254, 19);
  b.ground(238, 246, 16);
  fireCave(b, 241, 245, 17, 18, 1);       // FEUER: Ranken rechts
  b.coins(238, 247, 15);
  b.mummy(236, 18);

  // ===== 5. Sternenbruecke (255-320) =====
  b.crumble(256, 268, 17);
  b.coins(256, 268, 15);
  b.ghost(262, 12, 256, 268);
  b.island(271, 275, 17, 2);
  b.mover(3, [[278, 15], [286, 11]], 2.4);
  b.island(290, 297, 11, 3);
  b.mummy(295, 10);
  b.coins(290, 296, 10);
  b.circle(3, 304, 14, 3, 2.0, 0, 1);
  b.cloud(310, 313, 16);
  pit(b, 255, 316);

  // ===== 6. Mondtempel (317-380) + WASSER + GESCHICK =====
  b.ground(317, 382, 19);
  b.checkpoint(320, 18);
  b.stone(324, 325, 17, 18);
  b.stone(326, 328, 14, 16);
  b.coins(326, 328, 13);
  waterTunnel(b, 329, 14, { gaps: 2 });
  b.mummy(346, 18);
  // Geschick: Geister-Treppe – auf Geistern nach oben huepfen (oder Wolken nehmen)
  b.cloud(352, 354, 16); b.cloud(357, 359, 13); b.cloud(362, 364, 10); b.cloud(367, 369, 7);
  b.ghost(360, 13, 355, 366);
  b.gem(368, 5);
  b.coins(352, 354, 15); b.coins(357, 359, 12); b.coins(362, 364, 9);
  b.mummyTall(376, 18);

  // ===== 7. Sternentor (383-439): Ziel =====
  b.ground(383, 439, 19);
  b.decor('i', 386, 18); b.decor('A', 395, 18); b.decor('i', 404, 18);
  b.coins(388, 394, 17);
  b.ghost(400, 14, 392, 410);
  b.mummy(398, 18); b.mummyTall(410, 18);
  b.goal(424, 18);
  b.decor('T', 433, 18);

  // ===== Neu (eingeschoben, von rechts nach links): =====
  // B) Sternwarte: Aufwinde, zweites Mondrad, Geister (vor dem Sternentor)
  {
    const x = 385;
    b.splice(x, 85);
    b.ground(x, x + 5, 19);
    b.checkpoint(x + 2, 18);
    b.updraft(x + 7, x + 10, 8, 20);
    b.coins(x + 8, x + 9, 14); b.coins(x + 8, x + 9, 11);
    b.cloud(x + 13, x + 16, 9); b.coins(x + 13, x + 16, 8);
    b.ghost(x + 18, 6, x + 14, x + 22);
    b.wheel(x + 25, 12, 4, 3, 3, 2.0, 1);
    b.coins(x + 24, x + 26, 6);
    b.island(x + 33, x + 40, 10, 2);
    b.mummy(x + 38, 9); b.coins(x + 33, x + 36, 9);
    b.updraft(x + 43, x + 46, 7, 20);
    b.coins(x + 44, x + 45, 12);
    b.cloud(x + 49, x + 52, 8); b.cloud(x + 55, x + 58, 12);
    b.coins(x + 49, x + 52, 7); b.coins(x + 55, x + 58, 11);
    pit(b, x + 6, x + 58);
    b.ground(x + 59, x + 84, 19);
    b.decor('A', x + 66, 18); b.decor('b', x + 81, 18);
    b.mummyTall(x + 70, 18);
    b.ghost(x + 77, 15, x + 72, x + 82);
    b.coins(x + 61, x + 64, 17); b.coins(x + 73, x + 80, 17);
  }
  // A) Leuchtwolken und Geisterfaehre (nach der Wolkenmeer-Landung)
  {
    const x = 120;
    b.splice(x, 85);
    b.ground(x, x + 3, 19);
    b.cloud(x + 5, x + 8, 17); b.cloud(x + 12, x + 15, 14);
    b.ghost(x + 17, 12, x + 14, x + 21);
    b.mover(3, [[x + 19, 12], [x + 27, 8]], 2.4);
    b.island(x + 31, x + 37, 8, 2);
    b.mummy(x + 35, 7);
    b.circle(3, x + 44, 11, 3, 2.0, 0, -1);
    b.cloud(x + 50, x + 53, 13);
    b.ghost(x + 52, 10, x + 47, x + 57);
    b.cloud(x + 56, x + 59, 16);
    b.coins(x + 5, x + 8, 16); b.coins(x + 12, x + 15, 13); b.coins(x + 20, x + 28, 7); b.coins(x + 31, x + 34, 7);
    b.coins(x + 43, x + 45, 6); b.coins(x + 50, x + 53, 12); b.coins(x + 56, x + 59, 15);
    pit(b, x + 4, x + 60);
    b.ground(x + 61, x + 84, 19);
    b.checkpoint(x + 64, 18);
    b.decor('T', x + 78, 18); b.decor('r', x + 70, 18);
    b.mummy(x + 73, 18);
    b.coins(x + 66, x + 69, 17);
  }

  return b.section('Sternennacht');
}
