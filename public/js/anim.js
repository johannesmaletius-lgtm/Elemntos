// Animations-Steuerung: berechnet aus dem Spielerzustand eine Ziel-Pose und
// blendet weich dorthin. Darueber liegen federnde Schichten (Landung,
// Absprung, Vorlehnen beim Beschleunigen, Wende-Drehung).
//
// Laufen/Rennen nutzen Keyframe-Zyklen (Fersenaufsatz, Abfedern, Abdruck,
// Durchschwung). Die Phase haengt an der zurueckgelegten Strecke, und das Rig
// setzt die tiefste Sohle auf den Boden (pose.plant) – dadurch entsteht das
// Auf und Ab der Huefte aus der Beinstellung selbst.
//
// Winkel: Oberschenkel negativ = nach vorn, Unterschenkel positiv = Knie
// gebeugt, Unterarme negativ = nach vorn (Drehpunkt am Ellbogen). Hochgerissene
// Arme: armF positiv, armB negativ (nach aussen) – nach innen gedreht laege der
// Unterarm sonst auf der Brust, weil der Oberarm Teil des Rumpfs ist.
import { neutralPose, blendPose } from './rig.js';
import { PHYS, CHARACTERS } from './config.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = (v) => clamp(v, 0, 1);
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const frac = (v) => v - Math.floor(v);

// ---------- Schrittzyklen ----------
// Keyframes fuer EIN Bein ueber einen Doppelschritt u = 0..1:
// [u, Oberschenkel, Unterschenkel]. Das andere Bein laeuft um 0.5 versetzt.
function cycle(keys) {
  return (u) => {
    u = frac(u);
    const n = keys.length;
    let i = n - 1;
    while (i > 0 && keys[i][0] > u) i--;
    const k1 = keys[i], k2 = keys[(i + 1) % n];
    const k0 = keys[(i - 1 + n) % n], k3 = keys[(i + 2) % n];
    const span = (k2[0] - k1[0] + 1) % 1 || 1;
    const t = ((u - k1[0] + 1) % 1) / span;
    // Catmull-Rom: weich durch alle Keyframes
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    return [cr(k0[1], k1[1], k2[1], k3[1]), cr(k0[2], k1[2], k2[2], k3[2])];
  };
}

const WALK = cycle([
  [0.00, -0.40, 0.06],   // Ferse setzt vorn auf, Bein fast gestreckt
  [0.12, -0.30, 0.26],   // Abfedern
  [0.25, -0.04, 0.10],   // Standbein unter dem Koerper
  [0.40, 0.24, 0.10],
  [0.50, 0.38, 0.32],    // Abdruck ueber die Fussspitze
  [0.62, 0.16, 0.92],    // Fuss hebt ab, Knie maximal gebeugt
  [0.75, -0.22, 0.74],   // Schwungbein zieht unter dem Koerper durch
  [0.88, -0.44, 0.22],   // Bein streckt sich nach vorn
]);

const RUN = cycle([
  [0.00, -0.52, 0.30],   // Aufsatz unter dem Koerperschwerpunkt
  [0.10, -0.20, 0.62],   // Abfedern, Knie gebeugt
  [0.24, 0.44, 0.30],    // kraeftiger Abdruck
  [0.34, 0.50, 0.98],    // Flugphase: Ferse geht hoch
  [0.48, 0.02, 1.78],    // Ferse unter dem Po
  [0.62, -0.82, 1.32],   // Knie zieht nach vorn
  [0.78, -0.94, 0.56],   // Unterschenkel schwingt vor
  [0.90, -0.72, 0.30],
]);

// Flugphasen beim Rennen (nach jedem Abdruck kurz beide Fuesse in der Luft)
const runLift = (u) => Math.pow(Math.max(0, Math.cos(TAU * 2 * (u - 0.37))), 1.6);

export function createAnimState() {
  return {
    pose: neutralPose(),   // Ausgabe (Basis + Schichten)
    base: neutralPose(),   // weich geblendete Basis-Pose
    phase: 0,              // Schrittphase in Radiant (2*PI = Doppelschritt)
    sq: 0, sqV: 0,         // Feder: Stauchen (-) / Strecken (+)
    accLean: 0, prevVx: 0, // Vorlehnen beim Beschleunigen
    face: 0, turnT: 0,     // Wende
    idleT: 0,              // Zeit im Stand (fuer kleine Zappel-Animation)
    airT: 0, takeoffRun: 0,
  };
}

const TURN_DUR = 0.11;

export function updateAnim(a, p, dt, time) {
  // ---- Zustands-Zeiten ----
  const speed = Math.abs(p.vx);
  if (p.onGround && !p.dead && speed < 0.25 && !p.skid && !p.finished) a.idleT += dt; else a.idleT = 0;
  if (p.onGround) { a.airT = 0; a.takeoffRun = smooth((speed - PHYS.walkMax * 0.8) / (PHYS.runMax - PHYS.walkMax * 0.8)); }
  else a.airT += dt;

  const { T, rate } = targetPose(a, p, dt, time);
  blendPose(a.base, T, 1 - Math.exp(-dt * rate));
  const out = a.pose;
  Object.assign(out, a.base);

  // ---- Feder: Landung staucht, Absprung streckt (mit Nachschwingen) ----
  if (dt > 0) {
    const K = 280, D = 17;
    a.sqV += (-K * a.sq - D * a.sqV) * dt;
    a.sq += a.sqV * dt;
    a.sq = clamp(a.sq, -0.32, 0.22);
  }
  const sq = a.sq;
  if (!p.dead) {
    out.sy += sq; out.sx -= sq * 0.6;
    if (sq < 0 && p.onGround) {
      // Knie federn mit – das Rig senkt die Huefte dadurch von selbst ab
      const b = -sq;
      out.shinF += b * 2.6; out.shinB += b * 2.6;
      out.thighF -= b * 1.3; out.thighB -= b * 1.3;
      out.armF += b * 1.4; out.armB -= b * 1.1;
      out.lean += b * 0.5;
    }
  }

  // ---- Vorlehnen beim Beschleunigen, Zuruecklehnen beim Bremsen ----
  if (dt > 0) {
    const acc = (p.vx - a.prevVx) / dt;
    a.prevVx = p.vx;
    const want = p.onGround && !p.skid && !p.dead && p.dashT <= 0 && !p.pound
      ? clamp(acc * (p.facing || 1) * 0.0045, -0.16, 0.16) : 0;
    a.accLean += (want - a.accLean) * (1 - Math.exp(-dt * 9));
  }
  out.lean += a.accLean;
  out.tilt += a.accLean * 0.25;

  // ---- Wende: kurz schmal werden und in die neue Richtung klappen ----
  // Beim Bremsen (skid) schaut die Figur noch in die alte Richtung und stemmt
  // sich gegen die Bewegung; gedreht wird erst, wenn sie steht.
  const f = p.facing || 1;
  if (a.face === 0) a.face = f;
  if (f !== a.face) { a.face = f; a.turnT = (p.dead || p.flipT > 0 || p.dashT > 0) ? 0 : TURN_DUR; }
  if (p.skid && !p.dead && Math.sign(p.vx) === -f) a.turnT = TURN_DUR;
  else a.turnT = Math.max(0, a.turnT - dt);
  out.turn = a.turnT > 0 ? -Math.cos(Math.PI * (1 - a.turnT / TURN_DUR)) : 1;

  // ---- exakt (nicht geblendet) ----
  out.spin = p.flipT > 0 ? (1 - p.flipT / p.flipDur) * TAU : 0;
  if (p.dead) out.alpha = Math.max(0, 1 - Math.max(0, p.deadT - 0.25) * 4);
  else out.alpha = 1;
  if (p.invuln > 0 && !p.dead) out.alpha = (Math.floor(time * 16) % 2) ? 0.35 : 1;
  return out;
}

export function targetPose(a, p, dt, time) {
  const speed = Math.abs(p.vx);
  const T = neutralPose();
  const runR = smooth((speed - PHYS.walkMax * 0.75) / (PHYS.runMax - PHYS.walkMax * 0.75));
  const fwd = (p.vx || 0) * (p.facing || 1);   // Tempo in Blickrichtung
  let rate = 16;

  if (p.dead) {
    // Getroffen: Ruck nach hinten, Arme hoch, kleiner Huepfer, dann weg
    const d = p.deadT || 0;
    const k = smooth(d / 0.22);
    T.tilt = -0.55 * k; T.lean = -0.25 * k;
    T.thighF = -0.7; T.shinF = 1.3; T.thighB = 0.2; T.shinB = 1.1;
    T.armF = 2.3; T.armB = -2.4;
    T.bodyY = -55 * Math.sin(Math.min(1, d / 0.55) * Math.PI);
    T.sx = 1 + 0.12 * (1 - k); T.sy = 1 - 0.12 * (1 - k);
    T.tailLift = 0.9; T.tailAmp = 9; T.tailSpeed = 16;
    rate = 24;
  } else if (p.finished) {
    // Jubeln: Huepfer mit beiden Armen hoch
    const c = Math.abs(Math.sin(time * 5));
    T.plant = 1;
    T.armF = 2.35 + 0.22 * Math.sin(time * 10); T.armB = -2.45 - 0.22 * Math.sin(time * 10);
    T.bodyY = -c * 14; T.sy = 1 + c * 0.06; T.sx = 1 - c * 0.04;
    T.shinF = T.shinB = 0.5 * (1 - c); T.thighF = T.thighB = -0.25 * (1 - c);
    T.tailAmp = 6; T.tailSpeed = 8; T.tailLift = 0.3;
    rate = 18;
  } else if (p.dashT > 0) {
    // Wasser-Dash: gestreckt wie ein Hechtsprung
    T.tilt = 0.42; T.sx = 1.14; T.sy = 0.9; T.lean = 0.12;
    T.thighF = 0.55; T.shinF = 0.85; T.thighB = 0.9; T.shinB = 0.7;
    T.armF = -1.25; T.armB = -1.05; T.conv = 0.5;
    T.tailLift = 0.6; T.tailAmp = 10; T.tailSpeed = 24;
    rate = 32;
  } else if (p.pound === 'windup') {
    // Erd-Stampfer: zusammenrollen und Schwung holen
    T.thighF = -1.3; T.shinF = 2.05; T.thighB = -1.0; T.shinB = 1.95;
    T.armF = -1.1; T.armB = -0.9; T.sy = 0.88; T.sx = 1.08; T.conv = 0.55;
    T.tilt = 0.18; T.tailLift = 0.6; rate = 32;
  } else if (p.pound === 'slam') {
    // ... und senkrecht nach unten, Arme hoch
    T.thighF = -0.12; T.shinF = 0.15; T.thighB = 0.12; T.shinB = 0.12;
    T.armF = 2.4; T.armB = -2.5; T.sy = 1.14; T.sx = 0.88; T.conv = 0.6; T.plant = 1;
    T.tailLift = 1.3; T.tailAmp = 7; T.tailSpeed = 22; rate = 32;
  } else if (!p.onGround) {
    airPose(T, a, p, time, fwd);
    rate = p.flipT > 0 ? 30 : 13;
    if (p.gliding) rate = 10;
  } else if (p.skid) {
    // Bremsen beim Richtungswechsel: Fersen in den Boden, zuruecklehnen
    T.plant = 1;
    T.thighF = -0.6; T.shinF = 0.2; T.thighB = 0.05; T.shinB = 0.55;
    T.lean = -0.22; T.tilt = -0.12; T.armF = -0.9; T.armB = -1.1; T.conv = 0.3;
    T.sy = 0.95; T.tailLift = 0.5; T.tailAmp = 7; T.tailSpeed = 15;
    rate = 24;
  } else if (p.pushing) {
    // gegen eine Wand druecken: tief vorgelehnt, kleine Schritte auf der Stelle
    T.plant = 1;
    const ph = time * 5.5, s = Math.sin(ph);
    T.thighF = -0.45 + 0.08 * s; T.shinF = 0.55 - 0.15 * s;
    T.thighB = 0.55 - 0.08 * s; T.shinB = 0.2 + 0.15 * Math.max(0, s);
    T.lean = 0.32; T.tilt = 0.12; T.armF = -1.35 + 0.06 * s; T.armB = -1.2 - 0.06 * s;
    T.conv = 0.4; T.tailAmp = 4; T.tailSpeed = 6; T.tailLift = 0.1;
    rate = 12;
  } else if (speed > 0.25) {
    locomotion(T, a, p, dt, speed, runR);
    rate = 24;
  } else {
    idlePose(T, a, time);
    rate = 9;
  }

  // ---- Feuerball werfen ----
  // Die Flammenhand der Feuer-Figur zeigt schon im Bild nach oben: kurz zum
  // Kopf zurueckziehen, dann nach vorn stossen (im Uhrzeigersinn = nach vorn).
  if (p.throwT > 0 && !p.dead) {
    const u = 1 - p.throwT / 0.18;
    T.armB = u < 0.25 ? lerp(0, -0.5, smooth(u / 0.25)) : lerp(-0.5, 1.15, smooth((u - 0.25) / 0.3));
    T.lean += 0.04 + 0.08 * smooth((u - 0.25) / 0.3); T.tilt += 0.03;
    rate = Math.max(rate, 34);
  }
  const ch = CHARACTERS[p.charId];
  if (ch && ch.armBScale !== undefined && !(p.throwT > 0)) T.armB *= ch.armBScale;

  // Seitenwind (nur lokal bekannt): dagegen lehnen, Schal flattert
  if (p.wind && !p.dead) {
    T.lean -= 0.1 * p.wind * (p.facing || 1);
    T.tailLift += 0.35; T.tailAmp += 4; T.tailSpeed += 8;
  }

  return { T, rate };
}

function locomotion(T, a, p, dt, speed, runR) {
  // Schrittlaenge (Kacheln pro Doppelschritt) waechst mit dem Tempo
  const stride = lerp(2.25, 3.15, runR);
  a.phase += speed * dt * TAU / stride;
  const u = frac(a.phase / TAU);
  // kleine Schritte beim Anlaufen
  const amp = clamp01(speed / 2.6 + 0.3);

  const [wtF, wsF] = WALK(u), [wtB, wsB] = WALK(u + 0.5);
  const [rtF, rsF] = RUN(u), [rtB, rsB] = RUN(u + 0.5);
  T.thighF = lerp(wtF, rtF, runR) * amp;
  T.thighB = lerp(wtB, rtB, runR) * amp;
  T.shinF = 0.06 + (lerp(wsF, rsF, runR) - 0.06) * amp;
  T.shinB = 0.06 + (lerp(wsB, rsB, runR) - 0.06) * amp;
  T.plant = 1;

  // Arme gegengleich zu den Beinen; beim Rennen angewinkelt nach vorn
  const sw = Math.cos(TAU * (u - 0.04));
  const armA = lerp(0.42, 0.8, runR) * amp;
  T.armF = -0.6 * runR + armA * sw;
  T.armB = -0.75 * runR - armA * sw;

  // Oberkoerper: vorlehnen, leicht mitwippen; Flugphasen beim Rennen
  const step = Math.cos(TAU * 2 * u);
  T.bodyY = -runLift(u) * 7 * runR;
  T.lean = lerp(0.04, 0.15, runR) + 0.02 * step * runR;
  T.tilt = lerp(0.015, 0.07, runR);
  T.sy = 1 + 0.015 * step; T.sx = 1 - 0.01 * step;
  T.conv = lerp(0.35, 0.62, runR);
  T.tailAmp = lerp(4, 10, runR); T.tailSpeed = lerp(8, 18, runR); T.tailLift = lerp(0.12, 0.5, runR);
}

function airPose(T, a, p, time, fwd) {
  if (p.gliding) {
    // Luft-Figur gleitet: Arme ausgebreitet, Beine locker nach hinten
    const s = Math.sin(time * 6);
    T.tilt = 0.24; T.armF = 2.25 + s * 0.12; T.armB = -2.35 - s * 0.12;
    T.thighF = 0.2; T.shinF = 0.55; T.thighB = 0.55; T.shinB = 0.65;
    T.conv = 0.4; T.tailLift = 1.0; T.tailAmp = 11; T.tailSpeed = 12;
    T.bodyY = s * 3;
    return;
  }
  if (p.flipT > 0) {
    // Doppelsprung-Rolle: eng zusammengerollt
    T.thighF = -1.35; T.shinF = 2.15; T.thighB = -1.05; T.shinB = 2.05;
    T.armF = -1.0; T.armB = -0.8; T.conv = 0.6; T.sy = 0.94; T.sx = 1.04;
    T.tailLift = 0.8; T.tailAmp = 9; T.tailSpeed = 18;
    return;
  }
  // Sprungbogen stufenlos: 0 = steigen, ~0.45 = Scheitel, 1 = fallen
  const vy = p.vy || 0;
  const t = clamp01((vy + 15) / 33);
  const leap = a.takeoffRun || 0;   // aus dem Rennen gesprungen -> Weitsprung
  const up = smooth(clamp01((0.45 - t) / 0.45));
  const down = smooth(clamp01((t - 0.45) / 0.55));
  const mid = 1 - up - down;

  // steigen: ein Knie hoch, anderes Bein haengt nach / Weitsprung: Beine weit
  const rise = {
    thighF: lerp(-0.95, -1.05, leap), shinF: lerp(1.35, 0.6, leap),
    thighB: lerp(0.3, 0.6, leap), shinB: lerp(0.55, 0.95, leap),
    armF: lerp(0.9, 1.15, leap), armB: lerp(-1.3, -1.5, leap),
  };
  // Scheitel: Beine kurz angezogen, Arme zur Balance
  const apex = { thighF: -0.7, shinF: 1.2, thighB: -0.15, shinB: 1.05, armF: 0.85, armB: -1.0 };
  // fallen: Beine strecken sich zur Landung, Arme hoch
  const flail = Math.sin(time * 14) * 0.18 * clamp01((vy - 8) / 10);
  const fall = { thighF: -0.35, shinF: 0.5, thighB: 0.2, shinB: 0.38, armF: 1.45 + flail, armB: -1.55 - flail };
  for (const k of ['thighF', 'shinF', 'thighB', 'shinB', 'armF', 'armB'])
    T[k] = rise[k] * up + apex[k] * mid + fall[k] * down;

  const s = clamp01(-vy / PHYS.jumpV);
  T.sy = 1 + 0.07 * s + 0.04 * clamp01((vy - 10) / 10);
  T.sx = 1 - 0.05 * s - 0.03 * clamp01((vy - 10) / 10);
  T.tilt = 0.09 * clamp(fwd / PHYS.runMax, -1, 1) - 0.06 * down;
  T.lean = 0.05 * up - 0.04 * down;
  T.conv = 0.45;
  // beim Fallen die Sohlen an die Unterkante setzen -> Landung genau auf dem Boden
  T.plant = down;
  T.tailLift = lerp(0.15, 0.8, t); T.tailAmp = lerp(6, 9, t); T.tailSpeed = lerp(10, 15, t);
  if (p.inUpdraft) { T.armF = 2.0; T.armB = -2.1; T.tailLift = 1.1; T.tailAmp = 11; }
}

function idlePose(T, a, time) {
  T.plant = 1;
  const b = Math.sin(time * 2.4);
  // Atmen
  T.sy = 1 + 0.014 * b; T.sx = 1 - 0.007 * b;
  // Gewicht langsam von einem Bein aufs andere
  const w = Math.sin(time * 0.75);
  T.thighF = -0.06 + 0.05 * w; T.shinF = 0.08 + 0.08 * Math.max(0, -w);
  T.thighB = 0.06 + 0.05 * w; T.shinB = 0.08 + 0.08 * Math.max(0, w);
  T.lean = 0.012 * b; T.tilt = 0.012 * w;
  T.armF = 0.06 * b + 0.03 * w; T.armB = -0.06 * b + 0.03 * w;
  T.tailAmp = 3.5; T.tailSpeed = 3; T.tailLift = 0.03;
  // nach einer Weile im Stand: ab und zu froehlich in den Knien wippen
  const it = (a.idleT || 0) > 0 ? a.idleT : time;
  if (it > 3) {
    const c = (it - 3) % 6.5;
    if (c < 1.1) {
      const bump = Math.pow(Math.max(0, Math.sin(c / 1.1 * Math.PI * 3)), 2);
      T.shinF += 0.42 * bump; T.shinB += 0.42 * bump;
      T.thighF -= 0.21 * bump; T.thighB -= 0.21 * bump;
      T.armF -= 0.35 * bump; T.armB += 0.3 * bump;
      T.tailAmp = 6; T.tailSpeed = 7;
    }
  }
}

// Ereignisse aus der Physik
export function onLand(a, impact) {
  const power = Math.min(1, impact / 20);
  a.sqV -= 1.2 + 3.4 * power;
}
export function onJump(a) {
  a.sqV = Math.max(a.sqV, 0) + 2.4;
  if (a.sq < 0) a.sq *= 0.3;
}
