// Profile (saved in this browser) and the arcade ladder.
import { DATA } from "./data.js?v=9";

const KEY = "boltrumble.profile.v1";
const STARTERS = ["r01", "r02", "r03", "r04"];

export function defaultBuild(id, core) {
  return { head: id, rarm: id, larm: id, legs: id, core, name: DATA.robots.find((r) => r.id === id).name };
}

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
  return p;
}

export function saveProfile(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: progress lasts this visit only */ }
}

export function resetProfile() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return loadProfile();
}

// 20 rounds: [title, tiers per enemy, ai level, mixed parts?]
const PLAN = [
  ["Warm-Up", [1], 1], ["Rookie Run", [1], 1], ["Double Trouble", [1, 1], 1], ["Junk Heap", [2, 1], 2],
  ["BOSS: Iron Gate", [3, 2, 1], 2, true],
  ["Steel Shell", [2, 2], 2], ["Sky Hunt", [2, 2, 1], 2, true], ["Gear Grinder", [2, 2, 2], 3],
  ["Sharp Edges", [3, 2, 2], 3], ["BOSS: Thunder Hall", [4, 3, 2], 3, true],
  ["Deep Water", [3, 3, 2], 3], ["Heavy Metal", [3, 3, 3], 3, true], ["Glass Cannons", [4, 3, 3], 4],
  ["Night Shift", [4, 3, 3], 4, true], ["BOSS: Storm Core", [5, 4, 3], 4],
  ["Crossfire", [4, 4, 3], 4, true], ["Elite Squad", [4, 4, 4], 4], ["No Mercy", [5, 4, 4], 5, true],
  ["Last Gate", [5, 4, 4], 5], ["FINAL: Omega Rumble", [5, 5, 5], 5],
];

export const LADDER_LENGTH = PLAN.length;

export function ladderRound(k) {
  const [title, tiers, level, mixed] = PLAN[k];
  const used = new Set();
  const scale = [0.7, 0.8, 0.85, 0.9][k] || 1;
  const team = tiers.map((t, i) => {
    const pool = DATA.robots.filter((r) => r.tier === t && !used.has(r.id));
    const r = pool[(k * 5 + i * 3) % pool.length];
    used.add(r.id);
    const core = DATA.cores[(k + i * 2) % DATA.cores.length].id;
    if (mixed && i > 0) {
      const same = DATA.robots.filter((x) => x.tier === t);
      const pick = (o) => same[(k + i + o) % same.length].id;
      return { head: r.id, rarm: pick(1), larm: pick(2), legs: pick(3), core, name: r.name, scale };
    }
    return { ...defaultBuild(r.id, core), scale };
  });
  return { title, team, level, boss: title.startsWith("BOSS") || title.startsWith("FINAL") };
}

// robots the player can unlock by beating round k: the enemy heads first, then
// other robots of that tier or lower, then anything still locked (lowest tier first)
export function rewardsFor(k) {
  const r = ladderRound(k);
  const top = Math.max(...r.team.map((b) => DATA.robots.find((x) => x.id === b.head).tier));
  const rest = [...DATA.robots].sort((a, b) => a.tier - b.tier).map((x) => x.id);
  const near = DATA.robots.filter((x) => x.tier <= top).map((x) => x.id);
  return [...new Set([...r.team.map((b) => b.head), ...near, ...rest])];
}
