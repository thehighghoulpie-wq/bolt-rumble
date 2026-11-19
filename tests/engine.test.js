import { createBattle, step, pending, giveCommand, aiCommand, autoCommands, actionsFor, cloneState, hashState, PARTS } from "../js/engine.js";
import { DATA } from "../js/data.js";
import { ladderRound } from "../js/meta.js";
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const R = DATA.robots, cores = DATA.cores.map((c) => c.id);
const full = (id, k = 0) => ({ head: id, rarm: id, larm: id, legs: id, core: cores[k % 6] });
function play(tA, tB, seed, lvA = 3, lvB = 3) {
  const st = createBattle({ teams: [tA, tB], data: DATA, seed });
  let frames = 0;
  while (st.winner === null) {
    autoCommands(st, [0, 1], { 0: lvA, 1: lvB });
    step(st);
    frames++;
    if (frames > 60 * 60 * 20) throw new Error("no end");
  }
  for (const s of st.sides) for (const u of s.units) for (const p of PARTS) {
    const hp = u.parts[p].hp;
    if (!Number.isFinite(hp) || hp < 0 || hp > u.parts[p].max) throw new Error("bad hp");
  }
  return { winner: st.winner, secs: frames / 60 };
}
let crashes = 0, wins = [0, 0, 0], secs = 0, n = 0;
for (let i = 0; i < 1500; i++) {
  const pick = (k) => R[(i * 7 + k * 13) % R.length].id;
  const mix = (k) => ({ head: pick(k), rarm: pick(k + 1), larm: pick(k + 2), legs: pick(k + 3), core: cores[(i + k) % 6] });
  try { const r = play([mix(0), mix(4), mix(8)], [mix(12), mix(16), mix(20)], i + 1); n++; secs += r.secs; wins[r.winner === "draw" ? 2 : r.winner]++; }
  catch (e) { crashes++; if (crashes < 3) console.log(e.stack); }
}
ok(crashes === 0, `1500 mixed-part battles, no crashes (${crashes})`);
ok(wins[0] > 450 && wins[1] > 450, `both sides win (A ${wins[0]} / B ${wins[1]} / draw ${wins[2]})`);
ok(secs / n > 20 && secs / n < 120, `battles last ${(secs / n).toFixed(0)} s on average (not counting menus)`);
// lockstep: two peers apply the same commands -> identical battles
const teams = [[full("r01"), full("r05", 1), full("r09", 2)], [full("r03"), full("r07", 3), full("r11", 4)]];
const A = createBattle({ teams, data: DATA, seed: 42 }), Bb = cloneState(A);
let same = true;
for (let f = 0; f < 6000 && A.winner === null; f++) {
  for (const [s, i] of pending(A)) {
    const cmd = aiCommand(cloneState(A), s, i, 3); // decided on one peer only
    giveCommand(A, s, i, cmd); giveCommand(Bb, s, i, cmd);
  }
  step(A); step(Bb);
  if (hashState(A) !== hashState(Bb)) { same = false; break; }
}
ok(same && A.winner !== null, "lockstep: two copies with the same commands stay identical to the end");
// the battle pauses while a robot waits for a command
const P = createBattle({ teams, data: DATA, seed: 3 });
const t0 = P.tick; step(P); step(P);
ok(P.tick === t0 && pending(P).length === 6, "battle waits for commands on the command line");
// tiers matter
const byTier = (t) => R.filter((r) => r.tier === t).map((r) => r.id);
let t5 = 0;
for (let i = 0; i < 200; i++) {
  const hi = byTier(5), lo = byTier(1);
  if (play([full(hi[i % 3], i), full(hi[(i + 1) % 3], i + 1), full(hi[(i + 2) % 3], i + 2)], [full(lo[i % 8], i), full(lo[(i + 3) % 8], i), full(lo[(i + 5) % 8], i)], 500 + i).winner === 0) t5++;
}
ok(t5 / 200 > 0.85, `tier-5 team beats tier-1 team ${(t5 / 2).toFixed(0)}%`);
// balance per robot vs same tier
const rate = {};
for (const r of R) {
  const peers = R.filter((x) => x.tier === r.tier && x.id !== r.id).map((x) => x.id);
  let w = 0;
  for (let i = 0; i < 40; i++) if (play([full(r.id, i), full(r.id, i + 1), full(r.id, i + 2)], [full(peers[i % peers.length], i), full(peers[(i + 1) % peers.length], i), full(peers[(i + 2) % peers.length], i)], 900 + i).winner === 0) w++;
  rate[r.name] = Math.round(100 * w / 40);
}
const v = Object.values(rate);
ok(Math.min(...v) >= 8 && Math.max(...v) <= 92, `no robot hopeless or unbeatable in its tier (min ${Math.min(...v)}%, max ${Math.max(...v)}%)`);
// arcade curve with starter team (first rounds) and tier-appropriate team (later)
const curve = [];
for (const k of [0, 1, 2, 3, 4, 9, 14, 19]) {
  const r = ladderRound(k), tier = Math.min(5, 1 + Math.floor(k / 4));
  const team = R.filter((x) => x.tier === tier).slice(0, 3).map((x, i) => full(x.id, i));
  let w = 0;
  for (let i = 0; i < 80; i++) if (play(team, r.team, 3000 + i, 3, r.level).winner === 0) w++;
  curve.push(`${k + 1}:${Math.round(w / 0.8)}%`);
}
console.log("arcade win rate with a tier-matched team:", curve.join(" "));
ok(true, "arcade curve printed");
const s = createBattle({ teams, data: DATA, seed: 3 });
s.sides[1].units[1].down = true;
ok(actionsFor(s, 0, 0).every((a) => !a.targets.includes(1) || a.ally), "downed robots can't be targeted");
console.log(fails ? `\n${fails} FAILED` : "\nALL PASS");
process.exit(fails ? 1 : 0);
