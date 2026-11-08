// Level 8: Dornenlabyrinth – Dornengaenge mit niedriger Decke (kurz tippen
// zum Springen!), Speier-Faehren, Dornenturm mit Geistern, Windschneisen.
import { MapBuilder, waterTunnel, earthVault, fireCave, fireCage, airPerch, pit } from '../parts.js';

export default function build() {
  const b = new MapBuilder(440, 24);

  // ===== 1. Dornengarten (0-50) =====
  b.ground(0, 50, 19);
  b.start(3, 18);
  b.decor('T', 6, 18); b.decor('b', 12, 18);
  b.thorns(18, 18, 18); b.thorns(25, 26, 18); b.thorns(33, 34, 18);
  b.coins(17, 19, 16); b.coins(24, 27, 15); b.coins(32, 35, 15);
  b.mummy(29, 18);
  b.decor('r', 39, 18);
  b.mummy(44, 18);

  // ===== 2. Dornengang (51-110): niedrige Dornendecke =====
  b.stone(51, 107, 11, 13);
  b.ceilThorns(52, 106, 14);
  b.ground(51, 108, 19);
  b.thorns(58, 59, 18); b.thorns(66, 66, 18); b.thorns(72, 74, 18); b.thorns(81, 82, 18); b.thorns(90, 90, 18); b.thorns(97, 99, 18);
  b.coins(55, 57, 17); b.coins(61, 64, 17); b.coins(68, 70, 17); b.coins(76, 79, 17); b.coins(85, 88, 17); b.coins(93, 95, 17); b.coins(102, 105, 17);
  b.mummy(63, 18); b.mummy(86, 18);
  // LUFT: Wolke ueber dem Garten, von dort aufs Gangdach
  airPerch(b, 40, 44, 13);
  b.coins(55, 100, 10);

  // ===== 3. Speier-Faehren ueber dem Dornengrund (109-170) =====
  b.ground(109, 115, 19);
  b.checkpoint(111, 18);
  b.mover(3, [[117, 17], [125, 17]], 2.4);
  b.stone(129, 131, 13, 23);
  b.spitter(131, 14, 1, 2.6, 0.8);
  b.mover(3, [[133, 15], [141, 15]], 2.6);
  b.stone(145, 147, 12, 23);
  b.spitter(145, 13, -1, 2.6, 2.1);
  b.mover(2, [[150, 14], [150, 8]], 2.0);
  b.island(154, 160, 9, 2);
  b.mummy(158, 8);
  b.coins(118, 125, 15); b.coins(134, 141, 13); b.coins(154, 159, 8);
  pit(b, 116, 166);
  b.cloud(163, 166, 14);

  // ===== 4. Dornenturm (167-235) + ERDE =====
  b.ground(168, 235, 19);
  b.checkpoint(171, 18);
  b.stone(178, 179, 8, 18);               // Turm links
  b.stone(196, 197, 8, 18);               // Turm rechts
  b.clear(178, 179, 17, 18);              // Eingang
  b.plank(180, 184, 16); b.plank(190, 195, 13); b.plank(180, 185, 10);
  b.thorns(186, 189, 18);
  b.ceilThorns(186, 189, 9);
  b.ghost(188, 12, 182, 194);
  b.coins(181, 184, 15); b.coins(191, 194, 12); b.coins(181, 184, 9);
  b.stone(178, 197, 7, 7);                // Dach
  b.clear(196, 197, 8, 9);                // Ausgang oben rechts
  b.stone(198, 206, 10, 11);
  b.coins(199, 205, 9);
  // ERDE: Gewoelbe unter der Terrasse (Ausgang nach unten)
  b.stone(207, 215, 9, 12);
  earthVault(b, 208, 214, 9, 2);
  b.mummyTall(204, 18); b.mummy(222, 18);
  b.decor('T', 228, 18);

  // ===== 5. Windschneise (236-300) + FEUER =====
  b.wind(236, 260, 8, 18, 1);
  pit(b, 236, 262);
  b.island(240, 241, 17, 1);
  b.island(247, 249, 16, 1);
  b.thorns(248, 248, 15);
  b.island(255, 257, 15, 1);
  b.coins(240, 241, 16); b.coins(255, 257, 14); b.arc(250, 254, 12, 1);
  b.ground(263, 300, 19);
  b.checkpoint(266, 18);
  b.ground(270, 282, 16);
  fireCage(b, 274, 277, 16);
  b.mummy(281, 15);
  b.wind(283, 296, 13, 18, -1);
  b.thorns(287, 289, 18);
  b.coins(286, 290, 15);
  b.mummyTall(296, 18);

  // ===== 6. Labyrinth (301-370) + WASSER + GESCHICK =====
  b.ground(301, 370, 19);
  b.stone(306, 307, 17, 18);
  b.stone(308, 310, 14, 16);
  b.coins(308, 310, 13);
  waterTunnel(b, 311, 14, { gaps: 2, after: 3 });
  b.mummy(322, 18);
  // Geschick: Zickzack zwischen Dornenwaenden nach oben
  b.stone(332, 344, 5, 5);
  b.stone(332, 332, 6, 16);
  b.stone(344, 344, 6, 16);
  b.plank(333, 336, 16); b.plank(340, 343, 13); b.plank(333, 336, 10);
  b.ceilThorns(337, 339, 6);
  b.thorns(337, 339, 15);
  b.stone(337, 339, 16, 16);
  b.gem(342, 8);
  b.coins(333, 336, 15); b.coins(340, 343, 12); b.coins(333, 336, 9);
  b.spitter(344, 12, -1, 2.4, 0.0);
  b.mummy(356, 18);
  b.decor('i', 364, 18);

  // ===== 7. Dornentor (371-439): Ziel =====
  b.ground(371, 439, 19);
  b.thorns(380, 381, 18); b.thorns(389, 390, 18);
  b.coins(379, 382, 16); b.coins(388, 391, 16);
  b.ghost(397, 15, 392, 404);
  b.mummy(384, 18); b.mummyTall(408, 18);
  b.decor('A', 400, 18); b.decor('i', 414, 18);
  b.goal(424, 18);
  b.decor('T', 433, 18);

  return b.section('Dornenlabyrinth');
}
