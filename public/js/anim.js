// Animations-Steuerung: berechnet aus dem Spielerzustand eine Ziel-Pose
// und blendet weich dorthin. Laufen/Rennen nutzen einen Schrittzyklus,
// dessen Phase an die zurueckgelegte Strecke gekoppelt ist (kein Rutschen).
import { neutralPose, blendPose } from './rig.js';
import { PHYS, CHARACTERS } from './config.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };

export function createAnimState() {
  return { pose: neutralPose(), phase: 0, landT: 0, landPower: 0, jumpT: 0 };
}

export function updateAnim(a, p, dt, time) {
  const { T, rate } = targetPose(a, p, dt, time);
  const pose = a.pose;
  const k = 1 - Math.exp(-dt * rate);
  blendPose(pose, T, k);
  // Drehung beim Doppelsprung exakt (nicht geblendet)
  pose.spin = p.flipT > 0 ? (1 - p.flipT / p.flipDur) * TAU : 0;
  if (p.dead) pose.alpha = Math.max(0, 1 - p.deadT * 2.2); else pose.alpha = 1;
  if (p.invuln > 0 && !p.dead) pose.alpha = (Math.floor(time * 16) % 2) ? 0.35 : 1;
  return pose;
}

export function targetPose(a, p, dt, time) {
  const speed = Math.abs(p.vx);
  const T = neutralPose();
  const runR = smooth((speed - PHYS.walkMax * 0.75) / (PHYS.runMax - PHYS.walkMax * 0.75));
  let rate = 16;

  a.landT = Math.max(0, a.landT - dt);
  a.jumpT = Math.max(0, a.jumpT - dt);

  if (p.dead) {
    T.thighF = -0.6; T.shinF = 1.2; T.thighB = 0.5; T.shinB = 1.0;
    T.armF = 2.6; T.armB = -2.6; T.tailLift = 0.8; T.tailAmp = 8; T.tailSpeed = 14;
    rate = 10;
  } else if (p.finished) {
    // Jubeln
    const c = Math.abs(Math.sin(time * 5));
    T.armF = 2.7 + 0.2 * Math.sin(time * 10); T.armB = -2.7 - 0.2 * Math.sin(time * 10);
    T.bodyY = -c * 10; T.sy = 1 + c * 0.05; T.sx = 1 - c * 0.03;
    T.tailAmp = 6; T.tailSpeed = 8; T.tailLift = 0.3;
  } else if (p.dashT > 0) {
    T.tilt = 0.42; T.sx = 1.12; T.sy = 0.92; T.lean = 0.1;
    T.thighF = 0.55; T.shinF = 0.9; T.thighB = 0.85; T.shinB = 0.8;
    T.armF = 1.3; T.armB = 1.1; T.conv = 0.5;
    T.tailLift = 0.5; T.tailAmp = 9; T.tailSpeed = 22;
    rate = 30;
  } else if (p.pound === 'windup') {
    T.thighF = -1.25; T.shinF = 2.0; T.thighB = -0.9; T.shinB = 1.9;
    T.armF = -0.8; T.armB = -0.8; T.sy = 0.9; T.sx = 1.05; T.conv = 0.5;
    T.tailLift = 0.6; rate = 30;
  } else if (p.pound === 'slam') {
    T.thighF = -0.1; T.shinF = 0.1; T.thighB = 0.1; T.shinB = 0.1;
    T.armF = 2.7; T.armB = -2.7; T.sy = 1.12; T.sx = 0.9; T.conv = 0.6;
    T.tailLift = 1.2; T.tailAmp = 6; T.tailSpeed = 20; rate = 30;
  } else if (!p.onGround) {
    if (p.gliding) {
      const s = Math.sin(time * 6);
      T.tilt = 0.22; T.armF = 2.25 + s * 0.12; T.armB = -2.35 - s * 0.12;
      T.thighF = 0.25; T.shinF = 0.5; T.thighB = 0.55; T.shinB = 0.6;
      T.conv = 0.4; T.tailLift = 0.9; T.tailAmp = 10; T.tailSpeed = 12;
      T.bodyY = s * 3; rate = 10;
    } else if (p.vy < -2) {
      // steigen
      const s = clamp01(-p.vy / PHYS.jumpV);
      T.thighF = -0.75; T.shinF = 1.15; T.thighB = 0.35; T.shinB = 0.75;
      T.armF = lerp(0.6, 1.4, s); T.armB = lerp(-1.0, -1.9, s);
      T.sy = 1 + 0.07 * s; T.sx = 1 - 0.05 * s; T.tilt = 0.06 * Math.sign(p.vx) * p.facing;
      T.conv = 0.45; T.tailLift = 0.15; T.tailAmp = 6; T.tailSpeed = 10;
      rate = 20;
    } else {
      // fallen
      const w = Math.sin(time * 13);
      const f = clamp01(p.vy / 12);
      T.thighF = lerp(-0.45, -0.2, f); T.shinF = lerp(0.8, 0.35, f);
      T.thighB = lerp(0.25, 0.15, f); T.shinB = lerp(0.6, 0.3, f);
      T.armF = 1.6 + w * 0.25 * f; T.armB = -1.9 - w * 0.25 * f;
      T.conv = 0.35; T.tailLift = lerp(0.3, 0.75, f); T.tailAmp = 7; T.tailSpeed = 14;
      T.sy = 1 + 0.04 * f; T.sx = 1 - 0.03 * f;
      rate = 9;
    }
    if (p.flipT > 0) {
      // Rolle beim Doppelsprung: Beine anziehen
      T.thighF = -1.3; T.shinF = 2.1; T.thighB = -1.0; T.shinB = 2.0;
      T.armF = -0.6; T.armB = -0.9; T.conv = 0.6; rate = 30;
    }
    if (p.throwT > 0) T.armB = -1.6;
  } else if (p.skid) {
    T.thighF = -0.55; T.shinF = 0.25; T.thighB = -0.15; T.shinB = 0.5;
    T.lean = -0.18; T.tilt = -0.1; T.armF = -0.9; T.armB = -1.1; T.conv = 0.3;
    T.sy = 0.96; T.tailLift = 0.4; T.tailAmp = 6; T.tailSpeed = 14;
    rate = 22;
  } else if (speed > 0.25) {
    // laufen / rennen
    const stride = lerp(2.25, 3.1, runR);
    a.phase += speed * dt * TAU / stride;
    const ph = a.phase, s = Math.sin(ph), c = Math.cos(ph);
    const sB = Math.sin(ph + Math.PI), cB = Math.cos(ph + Math.PI);
    const A = lerp(0.42, 0.78, runR) * clamp01(speed / 2.5 + 0.35);
    const K = lerp(0.55, 1.35, runR);
    T.thighF = -A * s; T.thighB = -A * sB;
    T.shinF = 0.12 + K * Math.pow(Math.max(0, c), 1.4);
    T.shinB = 0.12 + K * Math.pow(Math.max(0, cB), 1.4);
    const armA = lerp(0.32, 0.85, runR);
    T.armF = armA * s - 0.35 * runR;
    T.armB = armA * sB - 0.45 * runR;
    const bob = lerp(3.5, 7, runR);
    T.bodyY = -bob * lerp(Math.abs(c), Math.abs(s), runR);
    T.lean = lerp(0.03, 0.13, runR);
    T.tilt = lerp(0.015, 0.06, runR);
    T.conv = lerp(0.35, 0.62, runR);
    T.tailAmp = lerp(4, 9, runR); T.tailSpeed = lerp(8, 17, runR); T.tailLift = lerp(0.1, 0.4, runR);
    rate = 22;
  } else {
    // stehen / atmen
    const b = Math.sin(time * 2.4);
    T.sy = 1 + 0.012 * b; T.sx = 1 - 0.006 * b;
    T.armF = 0.05 * b; T.armB = -0.05 * b;
    T.tailAmp = 3.5; T.tailSpeed = 3; T.tailLift = 0.02;
    rate = 10;
  }

  if (p.throwT > 0 && p.onGround) T.armB = -1.6;
  const ch = CHARACTERS[p.charId];
  if (ch && ch.armBScale !== undefined && !(p.throwT > 0)) T.armB *= ch.armBScale;

  // Landung: kurzes Einfedern
  if (a.landT > 0 && p.onGround && !p.dead) {
    const e = (a.landT / 0.16) * a.landPower;
    T.sy -= 0.2 * e; T.sx += 0.14 * e;
    T.shinF += 0.5 * e; T.shinB += 0.5 * e; T.thighF -= 0.25 * e; T.thighB -= 0.1 * e;
    T.armF += 0.4 * e; T.armB -= 0.4 * e;
  }
  // Absprung: kurzes Strecken
  if (a.jumpT > 0) {
    const e = a.jumpT / 0.12;
    T.sy += 0.1 * e; T.sx -= 0.07 * e;
  }

  return { T, rate };
}

export function onLand(a, impact) {
  a.landT = 0.16;
  a.landPower = Math.min(1, impact / 18);
}
export function onJump(a) { a.jumpT = 0.12; a.landT = 0; }
