// Profile (saved in this browser) and the arcade ladder.
import { DATA } from "./data.js?v=20";
import { coreLevel, MAX_CORE_LV, CHIP_IDS } from "./engine.js?v=20";

const KEY = "boltrumble.profile.v1";
const STARTERS = ["r01", "r02", "r03", "r04"];
export const SLOTS = ["head", "rarm", "larm", "legs"];

export function defaultBuild(id, core) {
  return { head: id, rarm: id, larm: id, legs: id, core, name: DATA.robots.find((r) => r.id === id).name };
}

// parts are collected one by one; owning a whole robot means owning its four parts
function givesAll(p, id) { for (const s of SLOTS) if (!p.parts[s].includes(id)) p.parts[s].push(id); }

export function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { p = null; }
  if (!p || !Array.isArray(p.unlocked)) {
    p = {
      unlocked: [...STARTERS],
      team: [defaultBuild("r01", "c1"), defaultBuild("r02", "c3"), defaultBuild("r03", "c2")],
      best: 0, clears: 0, wins: 0,
    };
  }
  // migrate older saves: per-part collection and core experience
  if (!p.parts) { p.parts = { head: [], rarm: [], larm: [], legs: [] }; for (const id of p.unlocked) givesAll(p, id); }
  if (!p.coreXP) p.coreXP = {};
  if (typeof p.bolts !== "number") p.bolts = 0;
  if (!Array.isArray(p.seen)) p.seen = [...p.unlocked];
  if (!Array.isArray(p.chips)) p.chips = [];
  if (!p.watch) p.watch = { steps: 0, energy: 100, target: null, built: 0, done: 0 };
  return p;
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: progress lasts this visit only */ }
}

export function resetProfile() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return loadProfile();
}

export const coreLvOf = (p, coreId) => coreLevel(p.coreXP[coreId] || 0);
export const withCoreLevels = (p, team) => team.map((b) => ({ ...b, coreLv: coreLvOf(p, b.core) }));

// XP for every core in the team; returns level-ups [{core, from, to}]
export function grantCoreXP(p, team, won, round) {
  const ups = [];
  const gain = (won ? 70 : 25) + round * 4;
  for (const id of new Set(team.map((b) => b.core))) {
    const from = coreLvOf(p, id);
    p.coreXP[id] = (p.coreXP[id] || 0) + gain;
    const to = coreLvOf(p, id);
    if (to > from) ups.push({ core: id, from, to });
  }
  return { gain, ups };
}

export const ownsPart = (p, slot, id) => p.parts[slot].includes(id);

// bolts: earned in every fight, spent in the shop on parts of robots you've seen
export const partPrice = (id) => 60 * (DATA.robots.find((r) => r.id === id)?.tier || 1);
export function earnBolts(p, won, round = 0) {
  const n = won ? 40 + round * 8 : 10 + round * 2;
  p.bolts += n;
  return n;
}
export function markSeen(p, team) { for (const b of team) for (const s of SLOTS) if (!p.seen.includes(b[s])) p.seen.push(b[s]); }
export const CHIP_PRICE = 180;
export function buyChip(p, id) {
  if (p.chips.includes(id) || !CHIP_IDS.includes(id) || p.bolts < CHIP_PRICE) return false;
  p.bolts -= CHIP_PRICE; p.chips.push(id); return true;
}
// bosses hand over a chip you don't have yet
export function takeChip(p, k) {
  const order = CHIP_IDS.map((_, i) => CHIP_IDS[(i + k) % CHIP_IDS.length]);
  const id = order.find((c) => !p.chips.includes(c));
  if (id) p.chips.push(id);
  return id || null;
}

// Bolt Watch: a mystery robot assembles itself as you take steps in battle.
// Every 40 steps adds the next part (head, arms, legs) and that part is yours.
export const WATCH_STEP = 40;
export function watchTarget(p) {
  const w = p.watch;
  if (w.target && SLOTS.some((s) => !ownsPart(p, s, w.target))) return w.target;
  const missing = DATA.robots.filter((r) => SLOTS.some((s) => !ownsPart(p, s, r.id))).sort((a, b) => a.tier - b.tier);
  w.target = missing.length ? missing[Math.floor(Math.random() * Math.min(4, missing.length))].id : null;
  w.built = 0; w.steps = 0;
  return w.target;
}
export function watchSteps(p, n) {
  const w = p.watch, got = [];
  const id = watchTarget(p);
  if (!id) return got;
  const usable = Math.min(n, Math.floor(w.energy * 3));
  w.energy = Math.max(0, w.energy - Math.ceil(usable / 3));
  w.steps += usable;
  while (w.steps >= WATCH_STEP && w.target) {
    w.steps -= WATCH_STEP;
    const slot = SLOTS.find((s) => !ownsPart(p, s, w.target));
    if (!slot) break;
    p.parts[slot].push(w.target);
    got.push({ slot, id: w.target });
    w.built = SLOTS.filter((s) => ownsPart(p, s, w.target)).length;
    if (w.built === 4) { if (!p.unlocked.includes(w.target)) p.unlocked.push(w.target); w.done++; w.target = null; watchTarget(p); }
  }
  return got;
}
export function watchRefuel(p, quality) { p.watch.energy = Math.min(100, p.watch.energy + Math.round(20 + 40 * quality)); }

export function buyPart(p, slot, id) {
  const cost = partPrice(id);
  if (ownsPart(p, slot, id) || !p.seen.includes(id) || p.bolts < cost) return false;
  p.bolts -= cost;
  p.parts[slot].push(id);
  if (SLOTS.every((s) => ownsPart(p, s, id)) && !p.unlocked.includes(id)) p.unlocked.push(id);
  return true;
}

// the loser hands over one random part from its team that you don't own yet
export function takeSpoils(p, enemyTeam, rnd = Math.random, fallbackIds = []) {
  let options = [];
  for (const b of enemyTeam) for (const s of SLOTS) if (!ownsPart(p, s, b[s])) options.push({ slot: s, id: b[s] });
  // nothing new on the enemy team: a random part you don't have yet from the fallback robots
  for (const id of fallbackIds) {
    if (options.length) break;
    for (const s of SLOTS) if (!ownsPart(p, s, id)) options.push({ slot: s, id });
  }
  if (!options.length) return null;
  const got = options[Math.floor(rnd() * options.length)];
  p.parts[got.slot].push(got.id);
  // owning all four parts of a robot also counts it as unlocked
  if (SLOTS.every((s) => ownsPart(p, s, got.id)) && !p.unlocked.includes(got.id)) p.unlocked.push(got.id);
  return got;
}

// bosses hand over a whole robot on top of the part
export function takeWholeRobot(p, ids) {
  const id = ids.find((x) => !p.unlocked.includes(x));
  if (!id) return null;
  givesAll(p, id);
  p.unlocked.push(id);
  return id;
}

// 20 rounds: [title, tiers per enemy, ai level, mixed parts?, rule]
const PLAN = [
  ["Warm-Up", [1], 1], ["Rookie Run", [1], 1], ["Double Trouble", [1, 1], 1], ["Junk Heap", [2, 1], 2, false, "all"],
  ["BOSS: Iron Gate", [3, 2, 1], 2, true],
  ["Steel Shell", [2, 2], 2], ["Sky Hunt", [2, 2, 1], 2, true], ["Gear Grinder", [2, 2, 2], 3, false, "all"],
  ["Sharp Edges", [3, 2, 2], 3], ["BOSS: Thunder Hall", [4, 3, 2], 3, true],
  ["Deep Water", [3, 3, 2], 3], ["Heavy Metal", [3, 3, 3], 3, true, "all"], ["Glass Cannons", [4, 3, 3], 4],
  ["Night Shift", [4, 3, 3], 4, true], ["BOSS: Storm Core", [5, 4, 3], 4],
  ["Crossfire", [4, 4, 3], 4, true, "all"], ["Elite Squad", [4, 4, 4], 4], ["No Mercy", [5, 4, 4], 5, true],
  ["Last Gate", [5, 4, 4], 5, false, "all"], ["FINAL: Omega Rumble", [5, 5, 5], 5],
];
// arena field for each round
const FIELD_PLAN = ["normal", "normal", "lab", "swamp", "storm", "ice", "fog", "junkyard", "lab", "storm",
  "swamp", "junkyard", "fog", "ice", "storm", "lab", "junkyard", "fog", "ice", "normal"];

export const LADDER_LENGTH = PLAN.length;

export function ladderRound(k) {
  const [title, tiers, level, mixed, rule = "leader"] = PLAN[k];
  const used = new Set();
  const scale = [0.7, 0.8, 0.85, 0.88, 0.9, 0.92, 0.92, 0.94, 0.94, 0.95][k] || 1;
  const coreLv = Math.min(MAX_CORE_LV, 1 + k);
  const team = tiers.map((t, i) => {
    const pool = DATA.robots.filter((r) => r.tier === t && !used.has(r.id));
    const r = pool[(k * 5 + i * 3) % pool.length];
    used.add(r.id);
    const core = DATA.cores[(k + i * 2) % DATA.cores.length].id;
    if (mixed && i > 0) {
      const same = DATA.robots.filter((x) => x.tier === t);
      const pick = (o) => same[(k + i + o) % same.length].id;
      return { head: r.id, rarm: pick(1), larm: pick(2), legs: pick(3), core, name: r.name, scale, coreLv };
    }
    return { ...defaultBuild(r.id, core), scale, coreLv, chip: (title.startsWith("BOSS") || title.startsWith("FINAL")) && i === 0 ? CHIP_IDS[k % CHIP_IDS.length] : undefined };
  });
  return { title, team, level, rule, field: FIELD_PLAN[k] || "normal", boss: title.startsWith("BOSS") || title.startsWith("FINAL") };
}

// whole robots a boss round can hand over: its own robots first, then anything of that tier or lower
export function rewardsFor(k) {
  const r = ladderRound(k);
  const top = Math.max(...r.team.map((b) => DATA.robots.find((x) => x.id === b.head).tier));
  const rest = [...DATA.robots].sort((a, b) => a.tier - b.tier).map((x) => x.id);
  const near = DATA.robots.filter((x) => x.tier <= top).map((x) => x.id);
  return [...new Set([...r.team.map((b) => b.head), ...near, ...rest])];
}
