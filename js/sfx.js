// Chiptune sound effects synthesised in code (Web Audio). Ideas from the
// animation-skills kit (whoosh, thud, clang, pop, tick, chime, riser, pluck),
// rebuilt as 8-bit square/noise voices. Sound is presentation only: it never
// touches the battle state, so online play stays in sync.
let ac = null, master = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem("boltrumble.muted") === "1"; } catch { /* storage blocked */ }

function ctx() {
  if (muted) return null;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.32;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === "suspended") ac.resume();
  return ac;
}

function tone({ type = "square", f0 = 440, f1 = f0, dur = 0.12, vol = 0.5, at = 0, curve = "exp" }) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) curve === "exp" ? o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur) : o.frequency.linearRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.2, vol = 0.5, at = 0, lo = 200, hi = 4000, sweep = 0 }) {
  const a = ctx(); if (!a) return;
  const t = a.currentTime + at;
  const s = a.createBufferSource(); s.buffer = noiseBuf;
  const f = a.createBiquadFilter(); f.type = "bandpass";
  const mid = Math.sqrt(lo * hi);
  f.frequency.setValueAtTime(sweep > 0 ? lo : sweep < 0 ? hi : mid, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep > 0 ? hi : lo, t + dur);
  f.Q.value = 0.9;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

const notes = (seq, step, type = "square", vol = 0.35) => seq.forEach((n, i) => n && tone({ type, f0: 440 * 2 ** ((n - 69) / 12), dur: step * 1.6, vol, at: i * step }));

export const sfx = {
  get muted() { return muted; },
  toggle() {
    muted = !muted;
    try { localStorage.setItem("boltrumble.muted", muted ? "1" : "0"); } catch { /* ignore */ }
    if (!muted) { this.pop(); playMusic(want); } else stopMusic();
    return muted;
  },
  unlock() { ctx(); if (want && !cur) playMusic(want); },
  // background music: "title", "battle", "boss" or null
  music(name) { want = name; if (name !== cur) playMusic(name); },
  tick() { tone({ f0: 1800, dur: 0.03, vol: 0.18 }); },
  pop() { tone({ f0: 520, f1: 1040, dur: 0.07, vol: 0.3 }); },
  back() { tone({ f0: 700, f1: 350, dur: 0.08, vol: 0.25 }); },
  whoosh(up = true) { noise({ dur: 0.22, vol: 0.35, lo: 300, hi: 3500, sweep: up ? 1 : -1 }); },
  shoot() { tone({ f0: 1400, f1: 300, dur: 0.07, vol: 0.28 }); noise({ dur: 0.05, vol: 0.25, lo: 2000, hi: 8000 }); },
  beam() { tone({ type: "sawtooth", f0: 200, f1: 1600, dur: 0.28, vol: 0.22 }); tone({ f0: 1600, dur: 0.18, vol: 0.12, at: 0.26 }); },
  laser() { tone({ f0: 2400, f1: 600, dur: 0.16, vol: 0.22 }); },
  missile() { noise({ dur: 0.4, vol: 0.25, lo: 400, hi: 2500, sweep: 1 }); tone({ type: "triangle", f0: 300, f1: 900, dur: 0.35, vol: 0.2 }); },
  strike() { this.whoosh(true); },
  thud(big = false) { tone({ type: "triangle", f0: big ? 140 : 110, f1: 40, dur: big ? 0.3 : 0.18, vol: 0.6 }); noise({ dur: 0.08, vol: 0.3, lo: 80, hi: 900 }); },
  hit(big = false) { this.thud(big); noise({ dur: 0.1, vol: 0.35, lo: 1200, hi: 6000 }); },
  miss() { this.whoosh(false); },
  clang() { [523, 1191, 1709].forEach((f, i) => tone({ type: "square", f0: f, f1: f * 0.98, dur: 0.45, vol: 0.12 / (i + 1) })); },
  crit() { this.hit(true); this.clang(); },
  break() { this.clang(); noise({ dur: 0.3, vol: 0.35, lo: 200, hi: 3000, sweep: -1 }); },
  explode() { noise({ dur: 0.7, vol: 0.6, lo: 60, hi: 2500, sweep: -1 }); tone({ type: "triangle", f0: 120, f1: 30, dur: 0.6, vol: 0.6 }); },
  chime() { notes([84, 88, 91], 0.06, "triangle", 0.25); },
  shield() { tone({ type: "triangle", f0: 400, f1: 1200, dur: 0.25, vol: 0.25 }); },
  scan() { [0, 0.12, 0.24].forEach((at) => tone({ f0: 1200, dur: 0.06, vol: 0.15, at })); },
  riser() { tone({ type: "sawtooth", f0: 110, f1: 880, dur: 0.6, vol: 0.18 }); noise({ dur: 0.6, vol: 0.2, lo: 300, hi: 6000, sweep: 1 }); },
  land() { tone({ type: "triangle", f0: 160, f1: 50, dur: 0.12, vol: 0.4 }); noise({ dur: 0.06, vol: 0.18, lo: 100, hi: 800 }); },
  go() { notes([72, 76, 79, 84], 0.07, "square", 0.25); },
  victory() { notes([72, 72, 72, 76, 79, 0, 76, 79, 84], 0.11, "square", 0.25); notes([48, 0, 52, 0, 55, 0, 52, 55, 60], 0.11, "triangle", 0.3); },
  defeat() { notes([67, 0, 64, 0, 60, 0, 55], 0.14, "square", 0.22); },
  unlock2() { notes([79, 83, 86, 91], 0.06, "square", 0.22); },
};

// ---------------------------------------------------------------- chiptune music
// Original tunes on a GBA-like set of voices: square lead, quiet square arpeggio,
// triangle bass and noise drums. Scheduled ahead on the audio clock so it never drifts.
const bar4 = (...bars) => bars.flat();
const B1 = [76, 0, 76, 0, 74, 0, 72, 0, 69, 0, 72, 0, 76, 0, 0, 0], B2 = [77, 0, 76, 0, 74, 0, 72, 0, 69, 0, 0, 0, 65, 0, 69, 0];
const B3 = [74, 0, 74, 0, 72, 0, 71, 0, 67, 0, 71, 0, 74, 0, 0, 0], B4 = [76, 0, 0, 0, 75, 0, 76, 0, 80, 0, 0, 0, 76, 0, 74, 0];
const B8 = [81, 0, 0, 0, 80, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0];
const T1 = [72, 0, 0, 0, 76, 0, 79, 0, 0, 0, 76, 0, 74, 0, 72, 0], T2 = [72, 0, 0, 0, 69, 0, 0, 0, 72, 0, 74, 0, 76, 0, 0, 0];
const T3 = [77, 0, 0, 0, 76, 0, 74, 0, 72, 0, 0, 0, 69, 0, 72, 0], T4 = [74, 0, 0, 0, 0, 0, 71, 0, 74, 0, 79, 0, 0, 0, 0, 0];
const T8 = [72, 0, 0, 0, 0, 0, 67, 0, 72, 0, 0, 0, 0, 0, 0, 0];
const X1 = [74, 0, 77, 0, 81, 0, 77, 0, 74, 0, 77, 0, 82, 0, 81, 0], X2 = [82, 0, 0, 0, 81, 0, 77, 0, 74, 0, 0, 0, 70, 0, 74, 0];
const X3 = [79, 0, 79, 0, 76, 0, 72, 0, 76, 0, 79, 0, 84, 0, 0, 0], X4 = [81, 0, 0, 0, 80, 0, 81, 0, 85, 0, 0, 0, 81, 0, 79, 0];
const SONGS = {
  title: { bpm: 112, roots: [48, 45, 41, 43], chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], lead: bar4(T1, T2, T3, T4, T1, T2, T3, T8), drums: "k...h...s...h.h.", bass: [0, 0, 12, 0, 7, 0, 12, 0] },
  battle: { bpm: 152, roots: [45, 41, 43, 40], chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], lead: bar4(B1, B2, B3, B4, B1, B2, B3, B8), drums: "k.h.s.h.k.k.s.hh", bass: [0, 0, 12, 0, 0, 12, 0, 7] },
  boss: { bpm: 164, roots: [38, 34, 36, 33], chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]], lead: bar4(X1, X2, X3, X4, X1, X2, X3, X4), drums: "k.hkk.hks.hkk.ss", bass: [0, 12, 0, 12, 0, 12, 7, 12] },
};
let want = null, cur = null, timer = null, mg = null, step = 0, nextT = 0;
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
function voice(type, n, t, dur, vol) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(hz(n), t);
  g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(mg); o.start(t); o.stop(t + dur + 0.02);
}
function hit(kind, t) {
  if (kind === "k") {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.connect(g).connect(mg); o.start(t); o.stop(t + 0.15);
    return;
  }
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = kind === "s" ? "bandpass" : "highpass"; f.frequency.value = kind === "s" ? 1800 : 7000;
  const g = ac.createGain(), d = kind === "s" ? 0.11 : 0.03;
  g.gain.setValueAtTime(kind === "s" ? 0.28 : 0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  src.connect(f).connect(g).connect(mg); src.start(t, Math.random() * 0.5); src.stop(t + d + 0.02);
}
function schedule() {
  const S = SONGS[cur];
  if (!S || !ac || ac.state !== "running") return;
  const dt = 60 / S.bpm / 4;
  if (nextT < ac.currentTime - 0.2) nextT = ac.currentTime + 0.05; // after a pause, don't burst
  while (nextT < ac.currentTime + 0.2) {
    const s = step % 16, bar = Math.floor(step / 16) % 4, t = nextT;
    const n = S.lead[step % S.lead.length];
    if (n) voice("square", n, t, dt * 1.7, 0.085);
    voice("square", S.chords[bar][s % 3] + 12, t, dt * 0.8, 0.03);
    if (s % 2 === 0) voice("triangle", S.roots[bar] + S.bass[s / 2], t, dt * 1.6, 0.2);
    if (S.drums[s] !== ".") hit(S.drums[s], t);
    step++; nextT += dt;
  }
}
function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  if (mg) { const g = mg; try { g.gain.setTargetAtTime(0, ac.currentTime, 0.05); } catch { /* closed */ } setTimeout(() => g.disconnect(), 400); }
  mg = null; cur = null;
}
function playMusic(name) {
  stopMusic();
  if (!name || muted) return;
  const a = ctx(); if (!a) return;
  cur = name; step = 0; nextT = a.currentTime + 0.08;
  mg = a.createGain(); mg.gain.value = 0.55; mg.connect(master);
  timer = setInterval(schedule, 40);
  schedule();
}
