// Zentrale Spielkonstanten. Einheiten: Kacheln (Tiles) und Sekunden.

export const TILE_ART = 16;          // Pixel pro Kachel in der Pixel-Art
export const VIEW_TILES_Y = 11.5;    // sichtbare Kacheln vertikal (Querformat)
export const MIN_VIEW_TILES_X = 18;  // mindestens so viele Kacheln breit

export const PHYS = {
  step: 1 / 120,
  walkMax: 5.6,
  runMax: 9.4,
  accelGround: 34,
  accelRun: 26,
  decelGround: 40,
  skidDecel: 75,
  accelAir: 24,
  decelAir: 6,
  gravityUp: 40,          // beim Halten der Sprungtaste
  gravityUpCut: 105,      // Sprungtaste losgelassen -> kurzer Sprung
  gravityFall: 58,
  maxFall: 21,
  jumpV: 17.0,            // Standsprung ~3.6 Kacheln hoch
  jumpRunBonus: 2.3,      // + bis zu diesem Wert bei vollem Rennen (~4.6 Kacheln)
  coyote: 0.1,
  jumpBuffer: 0.13,
  springV: 25.5,          // Pilz-Trampolin (~8 Kacheln)
  springPoundV: 31,       // Erd-Stampfer auf Pilz (~12 Kacheln)
  updraftAccel: 95,
  updraftMaxUp: 10.5,
  w: 0.72,                // Hitbox-Breite
  h: 1.55,                // Hitbox-Hoehe
  spriteH: 1.95,          // gezeichnete Figurenhoehe
};

export const CHARACTERS = {
  air: {
    id: 'air', element: 'Luft', color: '#9fdcff', dark: '#3d7fb8',
    ability: 'Doppelsprung', abilityHint: 'In der Luft nochmal springen. Sprung halten = gleiten.',
    icon: '🌪️',
  },
  water: {
    id: 'water', element: 'Wasser', color: '#3fd6d0', dark: '#1d4f9c',
    ability: 'Wasser-Dash', abilityHint: 'Schneller Sprint durch die Luft – überwindet weite Lücken.',
    icon: '🌊',
  },
  earth: {
    id: 'earth', element: 'Erde', color: '#9bd25a', dark: '#5a3a1e',
    ability: 'Stampfer', abilityHint: 'In der Luft nach unten stampfen – zerbricht rissige Steine. Auf Pilzen: Mega-Sprung!',
    icon: '🪨',
  },
  fire: {
    id: 'fire', element: 'Feuer', color: '#ff8a3d', dark: '#8c1f1f',
    ability: 'Feuerball', abilityHint: 'Wirft Feuerbälle – verbrennt Rankenwände (und später Gegner).',
    icon: '🔥',
    armBScale: 0.22,   // Flammen-Hand bleibt sichtbar
  },
};

export const CHAR_ORDER = ['air', 'water', 'earth', 'fire'];
