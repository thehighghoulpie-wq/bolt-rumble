// Real-time "walk and charge" battle engine. Pure, deterministic, no DOM.
// Each robot waits on its command line (pos 0), gets a command, walks to the
// active line (pos 1) while charging, acts, then walks back to cool down.
// The battle pauses whenever a living robot is on the command line without a
// command, so online play can run in lockstep.
export const PARTS = ["head", "rarm", "larm", "legs"];
export const PART_LABEL = { head: "HEAD", rarm: "R.ARM", larm: "L.ARM", legs: "LEGS" };
const HIT_WEIGHTS = { head: 10, rarm: 27, larm: 27, legs: 36 };
const DMG_SCALE = 0.6;
export const TICKS_PER_SEC = 60;
const TIME_LIMIT = 180 * TICKS_PER_SEC;
const CHARGE_MULT = { strike: 1.25, shoot: 1, beam: 0.8, laser: 0.9, missile: 0.75, repair: 1.3, shield: 1.3, scan: 1.3, guard: 1.4, core: 1.1 };
const COOL_MULT = { strike: 0.8, beam: 0.9, missile: 0.8 };
const HOLD = { strike: 58, missile: 72, core: 64, wait: 8, guard: 30 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Core specials: every core starts with one and unlocks two more as it levels up.
export const SPECIALS = {
  burst: { name: "BURST", desc: "huge shot that never misses", foe: true },
  salvo: { name: "SALVO", desc: "fire every weapon at one foe", foe: true },
  legcrash: { name: "LEG CRASH", desc: "smash every enemy's legs", foe: false },
  shield: { name: "TEAM WALL", desc: "your team takes half damage", foe: false },
  repair: { name: "MEND ALL", desc: "repair your whole team", foe: false },
  overclock: { name: "OVERCLOCK", desc: "+50% power for 3 moves", foe: false },
  focus: { name: "FOCUS", desc: "next 2 moves hit, aimed at heads", foe: false },
  haste: { name: "HASTE", desc: "your team moves 40% faster", foe: false },
  stop: { name: "FREEZE", desc: "enemies can't move for 4 s", foe: false },
  drain: { name: "DRAIN", desc: "hit a foe, repair yourself", foe: true },
};
export const CORE_TREE = {
  burst: ["burst", "salvo", "legcrash"], shield: ["shield", "stop", "repair"], repair: ["repair", "drain", "shield"],
  overclock: ["overclock", "salvo", "burst"], focus: ["focus", "legcrash", "stop"], haste: ["haste", "stop", "drain"],
};
export const TIER_LV = [1, 8, 16];
export const MAX_CORE_LV = 30;
// a core works best with some part types (+15% power, repairs +30%)
export const AFFINITY = { burst: ["shoot", "missile"], shield: ["guard", "shield"], repair: ["repair"], overclock: ["strike"], focus: ["beam", "laser"], haste: ["strike", "shoot"] };
export const coreLevel = (xp) => Math.min(MAX_CORE_LV, 1 + Math.floor((xp || 0) / 60));
export const specialsFor = (core, lv) => (CORE_TREE[core.special] || [core.special]).filter((_, i) => lv >= TIER_LV[i]);
const affine = (u, kind) => (AFFINITY[u.core.special] || []).includes(kind);

function rand(state) {
  state.r = (state.r + 0x6D2B79F5) >>> 0;
  let t = state.r;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function makeUnit(build, data, side, idx) {
  const byId = (id) => data.robots.find((r) => r.id === id);
  const parts = {};
  const sc = build.scale || 1;
  for (const p of PARTS) {
    const src = byId(build[p]);
    if (!src) throw new Error("unknown robot " + build[p]);
    const def = { ...src[p], from: src.id };
    def.armor = Math.max(1, Math.round(def.armor * sc));
    if (def.power) def.power = Math.max(1, Math.round(def.power * sc));
    parts[p] = { ...def, max: def.armor, hp: def.armor, usesLeft: def.uses ?? null };
  }
  const look = byId(build.color || build.head);
  const core = data.cores.find((c) => c.id === build.core) || data.cores[0];
  const coreLv = clamp(Math.floor(build.coreLv || 1), 1, MAX_CORE_LV);
  return {
    coreLv, specials: specialsFor(core, coreLv),
    side, idx, name: build.name || look.name, body: byId(build.legs).body, colors: look.colors,
    build: { ...build }, core, meter: 0, parts, down: false,
    pos: 0, phase: "cmd", cmd: null, lastKind: null,
    st: { shield: 0, overclock: 0, focus: 0, stop: 0, guarding: null, guardedBy: null },
  };
}

export function createBattle({ teams, data, seed = 1, rule = "leader" }) {
  return {
    seed, rule: rule === "all" ? "all" : "leader", r: seed >>> 0, tick: 0, hold: 0, winner: null,
    sides: teams.map((t, s) => ({ units: t.map((b, i) => makeUnit(b, data, s, i)), scan: 0, shield: 0, haste: 0 })),
  };
}

const living = (side) => side.units.filter((u) => !u.down);
const intact = (u, p) => u.parts[p].hp > 0;

export function usable(u, p) {
  const part = u.parts[p];
  if (!part || part.hp <= 0 || p === "legs") return false;
  if (p === "head") return part.usesLeft > 0;
  return true;
}

export function actionsFor(state, side, idx) {
  const u = state.sides[side].units[idx];
  if (u.down) return [];
  const foes = living(state.sides[1 - side]).map((x) => x.idx);
  const allies = living(state.sides[side]).map((x) => x.idx);
  const out = [];
  for (const p of ["head", "rarm", "larm"]) {
    if (!usable(u, p)) continue;
    const k = u.parts[p].kind;
    if (k === "repair" || k === "shield") out.push({ part: p, kind: k, targets: allies, ally: true });
    else if (k === "guard") out.push({ part: p, kind: k, targets: allies.filter((a) => a !== idx), ally: true });
    else if (k === "scan" || k === "missile") out.push({ part: p, kind: k, targets: [null] });
    else out.push({ part: p, kind: k, targets: foes });
  }
  if (u.meter >= 100) for (const sp of u.specials) out.push({ part: "core", kind: sp, special: sp, targets: SPECIALS[sp]?.foe ? foes : [null] });
  const ok = out.filter((a) => a.targets.length > 0);
  if (!ok.length) ok.push({ part: "wait", kind: "wait", targets: [null] });
  return ok;
}

// robots waiting on the command line for an order
export function pending(state) {
  const out = [];
  if (state.winner !== null) return out;
  state.sides.forEach((s, si) => s.units.forEach((u) => { if (!u.down && u.phase === "cmd" && !u.cmd) out.push([si, u.idx]); }));
  return out;
}

export function kindOf(u, action) {
  if (!action || action.part === "wait") return "wait";
  if (action.part === "core") return "core";
  return u.parts[action.part]?.kind || "wait";
}

export function giveCommand(state, side, idx, action) {
  const u = state.sides[side].units[idx];
  if (!u || u.down || u.phase !== "cmd" || u.cmd) return false;
  const legal = actionsFor(state, side, idx);
  const a = action && (legal.find((x) => x.part === action.part && (x.part !== "core" || x.special === action.special)) || legal.find((x) => x.part === action.part));
  const pick = a || legal[0];
  u.cmd = { part: pick.part, target: pick.targets.includes(action?.target) ? action.target : pick.targets[0] };
  if (pick.special) u.cmd.special = pick.special;
  u.phase = "charge";
  if (u.st.guarding !== null) {
    const g = state.sides[side].units[u.st.guarding];
    if (g && g.st.guardedBy === u.idx) g.st.guardedBy = null;
    u.st.guarding = null;
  }
  return true;
}

export function speedOf(state, u) {
  const legs = u.parts.legs;
  let s = legs.speed * (legs.hp > 0 ? 1 : 0.5);
  if (state.sides[u.side].haste > 0) s *= 1.4;
  return s;
}

function evasionOf(state, u) {
  const legs = u.parts.legs;
  let e = legs.hp > 0 ? legs.evasion : 0;
  if (state.sides[u.side].haste > 0) e += 10;
  if (u.phase === "charge" && kindOf(u, u.cmd) === "strike") e -= 10;
  return e;
}

const velocity = (state, u) => (u.st.stop > 0 ? 0 : (0.45 + speedOf(state, u) / 110) / 110);

// advance one tick; returns the events that happened during it
export function step(state) {
  const ev = [];
  if (state.winner !== null) return ev;
  if (state.hold > 0) { state.hold--; return ev; }
  if (pending(state).length) return ev;
  state.tick++;
  for (const s of state.sides) {
    if (s.scan > 0) s.scan--;
    if (s.shield > 0) s.shield--;
    if (s.haste > 0) s.haste--;
    for (const u of s.units) { if (u.st.shield > 0) u.st.shield--; if (u.st.stop > 0) u.st.stop--; }
  }
  const arrived = [];
  for (const s of state.sides) for (const u of s.units) {
    if (u.down) continue;
    if (u.phase === "charge") {
      u.pos = Math.min(1, u.pos + velocity(state, u) * (CHARGE_MULT[kindOf(u, u.cmd)] || 1));
      if (u.pos >= 1) arrived.push(u);
    } else if (u.phase === "cool") {
      u.pos = Math.max(0, u.pos - velocity(state, u) * 1.25 * (COOL_MULT[u.lastKind] || 1));
      if (u.pos <= 0) { u.phase = "cmd"; u.cmd = null; }
    }
  }
  if (arrived.length) {
    arrived.sort((a, b) => speedOf(state, b) - speedOf(state, a) || a.side - b.side || a.idx - b.idx);
    const u = arrived[0]; // one action at a time keeps animations readable; others wait at the line
    const kind = kindOf(u, u.cmd);
    perform(state, u, u.cmd, ev);
    u.lastKind = kind;
    u.phase = "cool";
    u.cmd = null;
    for (const x of ev) x.tick = state.tick;
    state.hold = HOLD[kind] || 46;
    checkWinner(state, ev);
  }
  if (state.winner === null && state.tick >= TIME_LIMIT) {
    state.winner = judge(state);
    ev.push({ t: "timeup", winner: state.winner, tick: state.tick });
  }
  return ev;
}

function judge(state) {
  const score = (s) => s.units.reduce((a, u) => a + (u.down ? 0 : PARTS.reduce((b, p) => b + u.parts[p].hp, 0)), 0);
  const a = score(state.sides[0]), b = score(state.sides[1]);
  return a === b ? "draw" : a > b ? 0 : 1;
}

function checkWinner(state, log) {
  if (state.winner !== null) return;
  for (let s = 0; s < 2; s++) {
    const side = state.sides[s];
    if ((state.rule !== "all" && side.units[0].down) || living(side).length === 0) {
      state.winner = 1 - s;
      log.push({ t: "win", winner: 1 - s });
      return;
    }
  }
}

function pickTarget(state, side, want) {
  const opts = living(state.sides[side]);
  if (!opts.length) return null;
  const t = state.sides[side].units[want];
  if (t && !t.down) return t;
  return opts[Math.floor(rand(state) * opts.length)];
}

function perform(state, u, a, log) {
  const mySide = state.sides[u.side];
  if (!a || a.part === "wait") { log.push({ t: "skip", src: [u.side, u.idx], why: "no usable parts" }); return; }
  if (a.part === "core") return doCore(state, u, a, log);
  const part = u.parts[a.part];
  if (!usable(u, a.part)) { log.push({ t: "skip", src: [u.side, u.idx], part: a.part, why: "part broken" }); return; }
  const k = part.kind;
  const ref = { src: [u.side, u.idx], part: a.part, pname: part.name, kind: k };
  if (a.part === "head") part.usesLeft--;
  if (k === "repair") {
    const t = pickTarget(state, u.side, a.target);
    log.push({ t: "repair", ...ref, dst: [t.side, t.idx], amount: heal(t, Math.round((28 + part.max * 0.2) * (affine(u, "repair") ? 1.3 : 1)), false) });
  } else if (k === "shield") {
    const t = pickTarget(state, u.side, a.target);
    t.st.shield = 360;
    log.push({ t: "shield", ...ref, dst: [t.side, t.idx] });
  } else if (k === "scan") {
    mySide.scan = 420;
    log.push({ t: "scan", ...ref });
  } else if (k === "guard") {
    const t = pickTarget(state, u.side, a.target);
    if (t && t !== u) {
      u.st.guarding = t.idx;
      t.st.guardedBy = u.idx;
      log.push({ t: "guard", ...ref, dst: [t.side, t.idx] });
    }
  } else if (k === "missile") {
    for (const t of living(state.sides[1 - u.side])) {
      attack(state, u, part, k, t, log, ref, 0.6);
      checkWinner(state, log);
      if (state.winner !== null) break;
    }
  } else {
    const t = pickTarget(state, 1 - u.side, a.target);
    if (t) attack(state, u, part, k, t, log, ref, 1);
  }
  if (u.st.overclock > 0) u.st.overclock--;
  if (u.st.focus > 0) u.st.focus--;
}

export function hitChance(state, u, part, k, t) {
  if (u.st.focus > 0) return 100;
  const scan = state.sides[u.side].scan > 0 ? 15 : 0;
  let c;
  if (k === "strike") c = 50 + speedOf(state, u) * 0.5 - evasionOf(state, t) * 0.8;
  else c = (k === "laser" ? 85 : k === "missile" ? 75 : part.accuracy) + scan - evasionOf(state, t);
  return clamp(c, 10, 97);
}

function attack(state, u, part, k, target, log, ref, mult) {
  let t = target, guarded = false;
  if (k !== "beam" && t.st.guardedBy !== null) {
    const g = state.sides[t.side].units[t.st.guardedBy];
    if (g && !g.down && intact(g, "larm") && g.st.guarding === t.idx) { t = g; guarded = true; }
  }
  const chance = hitChance(state, u, part, k, t);
  const ev = { t: "attack", ...ref, dst: [t.side, t.idx], guarded, chance: Math.round(chance) };
  if (rand(state) * 100 >= chance) { ev.hit = false; log.push(ev); return; }
  const scan = state.sides[u.side].scan > 0 ? 0.1 : 0;
  const crit = rand(state) < 0.05 + scan || u.st.focus > 0;
  let hitPart = guarded ? "larm" : crit ? "head" : weightedPart(state, t);
  if (!intact(t, hitPart)) hitPart = "head";
  let dmg = part.power * DMG_SCALE * mult * (0.85 + rand(state) * 0.3);
  if (k === "strike") dmg *= 1.25 * (0.6 + speedOf(state, u) / 150);
  if (u.st.overclock > 0) dmg *= 1.5;
  if (affine(u, k)) dmg *= 1.15;
  if (crit) dmg *= 1.5;
  if (guarded) dmg *= 0.6;
  if (k !== "beam") {
    if (t.st.shield > 0) { dmg *= 0.5; t.st.shield = 0; ev.shielded = true; }
    if (state.sides[t.side].shield > 0) dmg *= 0.5;
  }
  dmg = Math.max(1, Math.round(dmg));
  const p = t.parts[hitPart];
  const before = p.hp;
  p.hp = Math.max(0, p.hp - dmg);
  const dealt = before - p.hp;
  u.meter = Math.min(100, u.meter + Math.round(dealt * 0.6) + 4);
  t.meter = Math.min(100, t.meter + Math.round(dealt * 0.8) + (p.hp === 0 ? 20 : 0));
  Object.assign(ev, { hit: true, crit, hitPart, dmg: dealt, broke: p.hp === 0 && before > 0 });
  log.push(ev);
  if (hitPart === "head" && p.hp === 0) {
    t.down = true;
    if (t.st.guarding !== null) { const g = state.sides[t.side].units[t.st.guarding]; if (g) g.st.guardedBy = null; }
    log.push({ t: "down", dst: [t.side, t.idx], leader: t.idx === 0 });
  }
}

function weightedPart(state, t) {
  const opts = PARTS.filter((p) => intact(t, p));
  const total = opts.reduce((a, p) => a + HIT_WEIGHTS[p], 0);
  let x = rand(state) * total;
  for (const p of opts) { x -= HIT_WEIGHTS[p]; if (x < 0) return p; }
  return opts[opts.length - 1];
}

function heal(t, amount, all) {
  const opts = PARTS.filter((p) => p !== "head" || t.parts.head.hp > 0).filter((p) => t.parts[p].hp < t.parts[p].max);
  if (!opts.length) return 0;
  if (all) {
    let tot = 0;
    for (const p of opts) { const q = t.parts[p]; const b = q.hp; q.hp = Math.min(q.max, q.hp + Math.round(q.max * amount)); tot += q.hp - b; }
    return tot;
  }
  opts.sort((a, b) => t.parts[a].hp / t.parts[a].max - t.parts[b].hp / t.parts[b].max);
  const q = t.parts[opts[0]], b = q.hp;
  q.hp = Math.min(q.max, q.hp + amount);
  return q.hp - b;
}

function bestArm(u) {
  return ["rarm", "larm", "head"].filter((p) => intact(u, p) && u.parts[p].power > 0).sort((x, y) => u.parts[y].power - u.parts[x].power)[0];
}

function doCore(state, u, a, log) {
  if (u.meter < 100) { log.push({ t: "skip", src: [u.side, u.idx], why: "core not charged" }); return; }
  const sp = u.specials.includes(a.special) ? a.special : u.specials[0];
  u.meter = 0;
  const side = state.sides[u.side], foeSide = state.sides[1 - u.side];
  const ref = { src: [u.side, u.idx], part: "core", pname: SPECIALS[sp].name, kind: sp };
  log.push({ t: "core", ...ref });
  const sure = (fn) => { const saved = u.st.focus; u.st.focus = 1; fn(); u.st.focus = saved; };
  if (sp === "burst") {
    const arm = bestArm(u), t = pickTarget(state, 1 - u.side, a.target);
    if (arm && t) sure(() => attack(state, u, u.parts[arm], "beam", t, log, { ...ref, kind: "burst" }, 2));
  } else if (sp === "salvo") {
    const t = pickTarget(state, 1 - u.side, a.target);
    for (const p of ["head", "rarm", "larm"]) {
      if (!t || t.down || state.winner !== null) break;
      if (!intact(u, p) || !u.parts[p].power) continue;
      sure(() => attack(state, u, u.parts[p], "beam", t, log, { ...ref, kind: "burst" }, 0.9));
      checkWinner(state, log);
    }
  } else if (sp === "drain") {
    const arm = bestArm(u), t = pickTarget(state, 1 - u.side, a.target);
    if (arm && t) {
      const n = log.length;
      sure(() => attack(state, u, u.parts[arm], "beam", t, log, { ...ref, kind: "burst" }, 1.2));
      const dealt = log.slice(n).reduce((x, e) => x + (e.t === "attack" && e.hit ? e.dmg : 0), 0);
      if (dealt) log.push({ t: "repair", ...ref, dst: [u.side, u.idx], amount: heal(u, dealt, false) });
    }
  } else if (sp === "legcrash") {
    for (const t of living(foeSide)) {
      const q = t.parts.legs;
      if (q.hp <= 0) continue;
      const before = q.hp;
      q.hp = Math.max(0, q.hp - Math.max(1, Math.round(q.max * 0.5)));
      log.push({ t: "attack", ...ref, kind: "legcrash", dst: [t.side, t.idx], hit: true, crit: false, hitPart: "legs", dmg: before - q.hp, broke: q.hp === 0, guarded: false });
    }
  } else if (sp === "stop") {
    for (const t of living(foeSide)) { t.st.stop = 240; log.push({ t: "status", ...ref, dst: [t.side, t.idx], what: "FROZEN" }); }
  } else if (sp === "shield") side.shield = 420;
  else if (sp === "repair") { for (const x of living(side)) log.push({ t: "repair", ...ref, dst: [x.side, x.idx], amount: heal(x, 0.35, true) }); }
  else if (sp === "overclock") u.st.overclock = 3;
  else if (sp === "focus") u.st.focus = 2;
  else if (sp === "haste") side.haste = 480;
}

// ------------------------------------------------------------------ AI
export function aiCommand(state, side, idx, level = 3) {
  const me = state.sides[side], foe = state.sides[1 - side];
  const u = me.units[idx];
  const foes = living(foe);
  const roll = () => rand(state);
  const acts = actionsFor(state, side, idx);
  const hurt = living(me).filter((x) => PARTS.some((p) => x.parts[p].hp > 0 && x.parts[p].hp < x.parts[p].max * 0.5));
  const cores = acts.filter((a) => a.part === "core");
  if (cores.length) {
    const want = hurt.length >= 2 ? cores.find((c) => c.special === "repair") : null;
    const offense = cores.filter((c) => c.special !== "repair");
    const strong = offense[Math.floor(roll() * offense.length)];
    const pick = want || strong || (hurt.length ? cores[0] : null);
    if (pick) return { part: "core", special: pick.special, target: SPECIALS[pick.special].foe ? leaderOr(foe, foes, roll, level) : null };
  }
  const rep = acts.find((a) => a.kind === "repair");
  if (rep && hurt.length) return { part: rep.part, target: hurt[0].idx };
  const shd = acts.find((a) => a.kind === "shield");
  if (shd && roll() < 0.3) return { part: shd.part, target: 0 };
  const scn = acts.find((a) => a.kind === "scan");
  if (scn && me.scan === 0 && roll() < 0.35) return { part: scn.part, target: null };
  const grd = acts.find((a) => a.kind === "guard");
  if (grd && idx !== 0 && !me.units[0].down && me.units[0].st.guardedBy === null && roll() < 0.3) return { part: grd.part, target: 0 };
  const atk = acts.filter((a) => ["shoot", "strike", "beam", "laser", "missile"].includes(a.kind));
  if (!atk.length) return { part: acts[0].part, target: acts[0].targets[0] };
  const target = leaderOr(foe, foes, roll, level);
  const tUnit = foe.units[target];
  let best = null, bestV = -1;
  for (const a of atk) {
    const p = u.parts[a.part];
    const pw = a.kind === "missile" ? p.power * 0.6 * foes.length : p.power;
    const v = pw * hitChance(state, u, p, a.kind, tUnit) * (a.part === "head" ? 0.9 : 1) * (CHARGE_MULT[a.kind] || 1) + roll() * 5;
    if (v > bestV) { bestV = v; best = a; }
  }
  return { part: best.part, target: best.kind === "missile" ? null : target };
}

function leaderOr(foe, foes, roll, level) {
  if (!foe.units[0].down && roll() < 0.25 + 0.12 * level) return 0;
  const weakest = [...foes].sort((a, b) => a.parts.head.hp - b.parts.head.hp)[0];
  return weakest ? weakest.idx : 0;
}

// give AI orders to every waiting robot on the listed sides
export function autoCommands(state, aiSides, levels = {}) {
  for (const [s, i] of pending(state)) if (aiSides.includes(s)) giveCommand(state, s, i, aiCommand(state, s, i, levels[s] ?? 3));
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

export function hashState(s) {
  let h = 2166136261;
  const str = `${s.tick}|${s.r}|` + s.sides.map((x) => x.units.map((u) => `${u.pos.toFixed(6)},${u.phase},${PARTS.map((p) => u.parts[p].hp).join(",")}`).join(";")).join("/");
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
