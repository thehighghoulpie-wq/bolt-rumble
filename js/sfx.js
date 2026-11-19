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
    if (!muted) this.pop();
    return muted;
  },
  unlock() { ctx(); },
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
