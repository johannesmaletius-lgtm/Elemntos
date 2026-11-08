// Synthetische Soundeffekte + kleine Chiptune-Musik ueber WebAudio (keine Dateien noetig).
import { load, save } from './storage.js';

let ac = null, master = null, musicGain = null, sfxGain = null;
let muted = load('ew-muted') === '1';

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
  sfxGain = ac.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(master);
  musicGain = ac.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
}

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m; save('ew-muted', m ? '1' : '0');
  if (master) master.gain.value = m ? 0 : 0.8;
}

function tone(type, f0, f1, dur, vol = 0.3, when = 0, dest = sfxGain) {
  if (!ac) return;
  const t = ac.currentTime + when;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, vol = 0.3, f = 1200, q = 1, when = 0, sweep = 0) {
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ac.currentTime + when;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t); bp.Q.value = q;
  if (sweep) bp.frequency.exponentialRampToValueAtTime(Math.max(50, f + sweep), t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(bp); bp.connect(g); g.connect(sfxGain);
  s.start(t); s.stop(t + dur + 0.02);
}

const SFX = {
  jump: () => tone('square', 260, 520, 0.14, 0.12),
  airjump: () => { tone('triangle', 400, 900, 0.18, 0.2); noise(0.25, 0.15, 1800, 0.8, 0, 1500); },
  land: () => noise(0.08, 0.12, 300, 1),
  coin: () => { tone('square', 988, 988, 0.07, 0.1); tone('square', 1319, 1319, 0.18, 0.1, 0.07); },
  gem: () => { [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.2, 0.18, i * 0.07)); },
  bounce: () => tone('sine', 200, 700, 0.22, 0.3),
  megabounce: () => { tone('sine', 150, 900, 0.35, 0.35); tone('square', 300, 1200, 0.3, 0.06); },
  dash: () => { noise(0.22, 0.25, 900, 0.7, 0, 2500); tone('sine', 600, 300, 0.2, 0.12); },
  poundStart: () => tone('square', 700, 350, 0.1, 0.08),
  pound: () => { noise(0.25, 0.45, 160, 0.8); tone('sine', 120, 50, 0.25, 0.4); },
  fire: () => { noise(0.18, 0.25, 1500, 0.6, 0, -900); tone('sawtooth', 300, 120, 0.15, 0.05); },
  burn: () => noise(0.4, 0.18, 2500, 0.5, 0, -1800),
  break: () => { noise(0.3, 0.4, 500, 0.6, 0, -300); tone('square', 180, 60, 0.15, 0.08); },
  crumble: () => noise(0.35, 0.18, 400, 0.8, 0, -200),
  checkpoint: () => { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.14, 0.09, i * 0.08)); },
  death: () => { tone('square', 494, 247, 0.22, 0.12); tone('square', 370, 185, 0.3, 0.1, 0.18); },
  goal: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, i === 6 ? 0.5 : 0.13, 0.1, i * 0.11)); },
  bonk: () => tone('square', 160, 120, 0.06, 0.08),
  stomp: () => { tone('square', 520, 180, 0.12, 0.14); noise(0.1, 0.2, 700, 1); },
  enemyHit: () => { tone('square', 300, 600, 0.08, 0.12); tone('square', 600, 250, 0.12, 0.1, 0.08); },
  kick: () => { tone('square', 800, 200, 0.18, 0.12); noise(0.15, 0.2, 1200, 0.8); },
  join: () => { tone('triangle', 660, 660, 0.1, 0.15); tone('triangle', 880, 880, 0.15, 0.15, 0.1); },
};

export function sfx(name) {
  if (!ac || muted) return;
  const f = SFX[name];
  if (f) f();
}

// ---- Musik: froehliche Schleife (Melodie + Bass + Hi-Hat) ----
let musicTimer = null, nextTime = 0, step = 0;
const BPM = 132, STEP = 60 / BPM / 2; // Achtel
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
// MIDI-Noten, 0 = Pause. 64 Achtel = 8 Takte
const MEL = [
  72, 0, 76, 79, 81, 0, 79, 76, 74, 0, 76, 74, 72, 0, 67, 0,
  69, 0, 72, 76, 74, 0, 72, 69, 71, 0, 72, 74, 76, 0, 0, 0,
  72, 0, 76, 79, 84, 0, 83, 81, 79, 0, 76, 79, 81, 0, 79, 76,
  77, 0, 76, 74, 72, 0, 74, 76, 72, 0, 0, 0, 67, 69, 71, 0,
];
const BASS = [48, 55, 52, 55, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50];

function schedule() {
  if (!ac) return;
  while (nextTime < ac.currentTime + 0.2) {
    const i = step % 64;
    const m = MEL[i];
    if (m) tone('square', N(m), N(m), STEP * 0.9, 0.22, nextTime - ac.currentTime, musicGain);
    if (i % 4 === 0) {
      const b = BASS[(i / 4) % 16];
      tone('triangle', N(b), N(b), STEP * 3.6, 0.5, nextTime - ac.currentTime, musicGain);
    }
    if (i % 2 === 1) {
      // Hi-Hat
      const t = nextTime;
      if (noiseBuf) {
        const s = ac.createBufferSource(); s.buffer = noiseBuf;
        const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
        const g = ac.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        s.connect(hp); hp.connect(g); g.connect(musicGain); s.start(t); s.stop(t + 0.05);
      }
    }
    nextTime += STEP;
    step++;
  }
}

export function startMusic() {
  if (!ac || musicTimer) return;
  if (!noiseBuf) noise(0.01, 0.0001);
  nextTime = ac.currentTime + 0.1; step = 0;
  musicTimer = setInterval(schedule, 50);
}
export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
