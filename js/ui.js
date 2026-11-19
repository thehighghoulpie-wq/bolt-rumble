import { DATA } from "./data.js?v=20";
import { createBattle, step, pending, giveCommand, actionsFor, aiCommand, autoCommands, hashState, PARTS, PART_LABEL, SPECIALS, CORE_TREE, TIER_LV, AFFINITY, MAX_CORE_LV, FIELDS, FIELD_IDS, CHIPS, CHIP_IDS, subSkills, SUBSKILL_NAME, terrainGrade, canTransform, PERSONALITY } from "./engine.js?v=20";
import { spriteImg, spriteURL } from "./pixel.js?v=20";
import { drawRobot, RW, RH, OX, OY } from "./rig.js?v=20";
import { Scene, W, H, hexField } from "./scene.js?v=20";
import { loadProfile, saveProfile, resetProfile, ladderRound, LADDER_LENGTH, rewardsFor, coreLvOf, withCoreLevels, grantCoreXP, takeSpoils, takeWholeRobot, SLOTS, partPrice, earnBolts, markSeen, buyPart, CHIP_PRICE, buyChip, takeChip, WATCH_STEP, watchTarget, watchSteps, watchRefuel } from "./meta.js?v=20";
import { Link, makeCode } from "./net.js?v=20";
import { sfx } from "./sfx.js?v=20";

const $ = (s) => document.querySelector(s);
const byId = (id) => DATA.robots.find((r) => r.id === id);
const coreById = (id) => DATA.cores.find((c) => c.id === id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = (x) => JSON.parse(JSON.stringify(x));
const KIND_TEXT = {
  shoot: "SHOOT", strike: "STRIKE", beam: "BEAM", guard: "GUARD", laser: "LASER", missile: "MISSILES",
  scan: "SCAN", shield: "SHIELD", repair: "REPAIR", wait: "WAIT",
  burst: "BURST", overclock: "OVERCLOCK", focus: "FOCUS", haste: "HASTE",
};
const KIND_HINT = {
  shoot: "steady shots", strike: "fast charge, big hit", beam: "slow, pierces guards", guard: "protect an ally",
  laser: "accurate head shot", missile: "hits every enemy", scan: "team aims better", shield: "halve next hit", repair: "fix an ally",
  wait: "no parts left",
};

let profile = loadProfile();
const subTags = (part) => subSkills(part).map((x) => `<i class="sub ${x}">${SUBSKILL_NAME[x]}</i>`).join("");
// cores evolve their names as they grow (bronze, silver +, gold MAX)
const coreTitle = (c, lv) => c.name + (lv >= MAX_CORE_LV ? " MAX" : lv >= TIER_LV[2] ? "+" : "");
let backTo = "title";
let B = null, link = null, online = null, scene = null;

// ------------------------------------------------------------------ screens
function show(id, back = "title") {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === "s-" + id));
  backTo = back;
  window.scrollTo(0, 0);
  if (id !== "battle" && id !== "result") sfx.music("title");
}
document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => {
  if (backTo === "title") { leaveOnline(); renderTitle(); }
  show(backTo);
}));
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));

function go(where) {
  if (where === "arcade") return startArcade(0);
  if (where === "workshop") return openWorkshop({ team: profile.team, pool: profile.parts, title: "WORKSHOP", levels: true,
    hint: `Mix the parts you've won. Win fights to take parts from your rivals. Slot 1 is your leader.`, onDone: () => { saveProfile(profile); renderTitle(); show("title"); } });
  if (where === "local") return startLocalSetup();
  if (where === "online") { leaveOnline(); resetLobby(); return show("online"); }
  if (where === "help") return show("help");
  if (where === "collection") { COL = null; renderCollection(); return show("collection"); }
  if (where === "watch") { renderWatch(); return show("watch"); }
}

// title hook: the team walks in, breathes, and hops in turn (drawn with the battle rig)
const touch = matchMedia("(hover: none)").matches;
let titleRun = 0;
function titleShow() {
  const box = $("#title-bots");
  box.innerHTML = `<canvas id="title-cv" width="240" height="78" aria-label="Your team"></canvas>`;
  const cv2 = $("#title-cv"), g = cv2.getContext("2d");
  g.imageSmoothingEnabled = false;
  const run = ++titleRun, team = profile.team.slice(0, 3);
  const spots = [120, 66, 174], from = [120, -40, 280];
  const bots = team.map((b, i) => ({ b, x: i === 0 ? 120 : from[i], dist: 0, y: i === 0 ? -90 : 0, vy: 0, cv: document.createElement("canvas") }));
  bots.forEach((o) => { o.cv.width = RW; o.cv.height = RH; });
  let t = 0;
  const frame = () => {
    if (run !== titleRun || !$("#s-title.active")) return;
    t++;
    g.clearRect(0, 0, 240, 78);
    bots.forEach((o, i) => {
      const dx = Math.max(-1.2, Math.min(1.2, spots[i] - o.x));
      if (t > 10 + i * 12) { o.x += dx; o.dist += Math.abs(dx); }
      if (o.y < 0 || o.vy) { o.vy += 0.5; o.y = Math.min(0, o.y + o.vy); if (o.y === 0) o.vy = 0; }
      const hopT = (t + i * 70) % 210;
      const hop = hopT < 16 ? -7 * Math.sin((Math.PI * hopT) / 16) : 0;
      const arms = hopT < 16 ? { rs: -2.2, ls: -2.0, re: -0.3, le: -0.3 } : {};
      const moving = Math.abs(dx) > 0.05 && t > 10 + i * 12;
      const P = { t: t + i * 40, walk: o.dist / 20, move: moving ? 1 : 0, y: o.y + hop, lean: moving ? 0.07 : 0, drop: moving ? 0 : 0.5 + 0.5 * Math.sin(t * 0.075 + i), ...arms };
      drawRobot(o.b, P, { canvas: o.cv });
      const face = i === 2 ? -1 : 1, X = Math.round(o.x), top = 76 - OY;
      g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(X - 11, 74, 22, 2);
      if (face > 0) g.drawImage(o.cv, X - OX, top);
      else { g.save(); g.translate(X + OX, top); g.scale(-1, 1); g.drawImage(o.cv, 0, 0); g.restore(); }
    });
    next();
  };
  // next frame: requestAnimationFrame, with a timer fallback for when it is paused
  const next = () => { let done = false; const go = () => { if (!done) { done = true; frame(); } }; requestAnimationFrame(go); setTimeout(go, 60); };
  next();
}

function renderTitle() {
  $("#tagline").textContent = DATA.tagline;
  titleShow();
  const fresh = profile.wins === 0 && profile.best === 0;
  const arc = document.querySelector('[data-go="arcade"]');
  arc.textContent = fresh ? "ARCADE LADDER ★ START HERE" : "ARCADE LADDER";
  arc.classList.toggle("special", fresh);
  $("#title-help").textContent = fresh ? "New here? Pick ARCADE LADDER. Your 3 robots are ready to fight!" : touch ? "Tap a mode." : "Pick a mode. Arrow keys move, Z selects.";
  $("#title-stats").textContent = `ROBOTS ${profile.unlocked.length}/${DATA.robots.length} · BEST ROUND ${profile.best}/${LADDER_LENGTH}` + (profile.clears ? ` · CLEARED ${profile.clears}x` : "");
}

// ------------------------------------------------------------------ workshop
let WS = null;
function openWorkshop(opts) {
  WS = { ...opts, slot: 0 };
  $("#ws-title").textContent = opts.title;
  $("#ws-hint").textContent = opts.hint || "";
  renderWorkshop();
  show("workshop", opts.back || "title");
}

function partLine(r, p) {
  const x = r[p];
  if (p === "legs") return `HP ${x.armor} · SPEED ${x.speed} · DODGE ${x.evasion}`;
  const bits = [`HP ${x.armor}`];
  if (x.power) bits.push(`POWER ${x.power}`);
  if (x.accuracy) bits.push(`AIM ${x.accuracy}`);
  if (x.uses) bits.push(`USES ${x.uses}`);
  return bits.join(" · ");
}

function renderWorkshop() {
  const team = WS.team, b = team[WS.slot];
  $("#ws-slots").innerHTML = team.map((t, i) =>
    `<button class="${i === WS.slot ? "on" : ""}" data-slot="${i}">${spriteImg(t, 1.5)}<span>${i === 0 ? "★" : ""}${esc(t.name)}</span></button>`).join("");
  $("#ws-slots").querySelectorAll("button").forEach((x) => x.onclick = () => { WS.slot = +x.dataset.slot; renderWorkshop(); });
  $("#ws-bot").innerHTML = spriteImg(b, 6);
  const nameIn = $("#ws-name");
  nameIn.value = b.name;
  nameIn.oninput = () => { b.name = nameIn.value.toUpperCase().slice(0, 10) || byId(b.head).name; };
  const poolFor = (p) => (Array.isArray(WS.pool) ? WS.pool : WS.pool[p]).map(byId).filter(Boolean);
  const lvOf = (c) => (WS.levels ? coreLvOf(profile, c) : MAX_CORE_LV);
  let html = "";
  for (const p of PARTS) {
    html += `<h4>${PART_LABEL[p]} <small>${poolFor(p).length}</small></h4><div class="chips">` + poolFor(p).map((r) => {
      const x = r[p];
      const pv = { head: r.id, rarm: r.id, larm: r.id, legs: r.id };
      return `<button class="chip ${b[p] === r.id ? "on" : ""}" data-p="${p}" data-id="${r.id}">
        ${spriteImg(pv, 1, { focus: p })}<span><b>${esc(x.name)}</b><small>${esc(r.name)} · ${p === "legs" ? r.body.toUpperCase() : KIND_TEXT[x.kind]}</small><small>${partLine(r, p)}</small>${p === "legs" ? "" : subTags(x)}</span></button>`;
    }).join("") + `</div>`;
  }
  html += `<h4>CORE</h4><div class="chips">` + DATA.cores.map((c) => {
    const lv = lvOf(c.id);
    const tierCls = lv >= 16 ? "gold" : lv >= 8 ? "silver" : "bronze";
    return `<button class="chip core ${b.core === c.id ? "on" : ""}" data-core="${c.id}"><i class="dot ${tierCls}" style="background:${c.color}"></i><span><b>${esc(coreTitle(c, lv))} <em>LV ${lv}</em></b>
      <small>${(CORE_TREE[c.special] || []).map((sp, i) => lv >= TIER_LV[i] ? esc(SPECIALS[sp].name) : `<s>${esc(SPECIALS[sp].name)} LV${TIER_LV[i]}</s>`).join(" · ")}</small>
      <small class="hint">BOOSTS ${(AFFINITY[c.special] || []).map((k) => KIND_TEXT[k]).join(" + ")} · ${(PERSONALITY[c.special] || {}).name || ""}</small></span></button>`;
  }).join("") + `</div>`;
  const chipPool = WS.levels ? profile.chips : CHIP_IDS;
  html += `<h4>CHIP <small>${chipPool.length}/${CHIP_IDS.length}</small></h4><div class="chips">` +
    `<button class="chip ${!b.chip ? "on" : ""}" data-chip=""><span><b>NO CHIP</b><small>win chips from bosses or buy them</small></span></button>` +
    chipPool.map((c) => `<button class="chip gem ${b.chip === c ? "on" : ""}" data-chip="${c}"><i class="gemdot ${c}"></i><span><b>${esc(CHIPS[c].name)}</b><small>${esc(CHIPS[c].desc)}</small></span></button>`).join("") + `</div>`;
  $("#ws-parts").innerHTML = html;
  $("#ws-parts").querySelectorAll("[data-chip]").forEach((x) => x.onclick = () => { if (x.dataset.chip) b.chip = x.dataset.chip; else delete b.chip; renderWorkshop(); });
  $("#ws-parts").querySelectorAll("[data-p]").forEach((x) => x.onclick = () => {
    const wasDefault = b.name === byId(b.head).name;
    b[x.dataset.p] = x.dataset.id;
    if (x.dataset.p === "head" && wasDefault) b.name = byId(b.head).name;
    renderWorkshop();
  });
  $("#ws-parts").querySelectorAll("[data-core]").forEach((x) => x.onclick = () => { b.core = x.dataset.core; renderWorkshop(); });
  const parts = PARTS.map((p) => byId(b[p])[p]);
  const fullSetNote = b.head === b.rarm && b.head === b.larm && b.head === b.legs ? "<br><b>FULL SET: CAN TRANSFORM</b>" : "";
  $("#ws-sum").innerHTML = `ARMOR <b>${parts.reduce((a, x) => a + x.armor, 0)}</b> · SPEED <b>${parts[3].speed}</b> · EVADE <b>${parts[3].evasion}</b><br>
    CORE <b>${esc(coreById(b.core).name)} LV ${lvOf(b.core)}</b> · BOOSTS ${(AFFINITY[coreById(b.core).special] || []).map((k) => KIND_TEXT[k]).join(" + ")}${b.chip ? `<br>CHIP <b>${esc(CHIPS[b.chip].name)}</b>: ${esc(CHIPS[b.chip].desc)}` : ""}${fullSetNote}`;
  $("#ws-done").onclick = () => WS.onDone();
}

// ------------------------------------------------------------------ battle
const cv = $("#cv");
cv.addEventListener("click", (e) => {
  if (!B || !B.target) return;
  const r = cv.getBoundingClientRect();
  const hit = scene.unitAtPoint((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
  if (hit && hit[0] === B.target.side && B.target.list.includes(hit[1])) { if (B.target.snipe) { B.target.aimFor = hit[1]; renderCmd(); } else issue({ part: B.target.part, special: B.target.special, target: hit[1] }); }
});
cv.addEventListener("mousemove", (e) => {
  if (!B || !B.target) return;
  const r = cv.getBoundingClientRect();
  const hit = scene.unitAtPoint((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
  if (hit && hit[0] === B.target.side && B.target.list.includes(hit[1])) scene.cursor = hit;
});

function startBattle({ mode, teams, seed, me = 0, title, level = 3, arcade = null, rule = "leader", field = "normal" }) {
  const state = createBattle({ teams, data: DATA, seed: seed ?? ((Math.random() * 1e9) | 0), rule, field });
  const human = mode === "local" ? [0, 1] : [me];
  const ai = mode === "arcade" ? [1] : [];
  sfx.music(arcade && ladderRound(arcade.k).boss ? "boss" : "battle");
  B = { mode, me, title, level, arcade, state, human, ai, remoteQ: [], cmdFor: null, target: null, speed: 1, ended: false, frame: 0, hashes: {}, teams };
  scene = new Scene(cv, { me });
  scene.setState(state);
  $("#b-title").textContent = title;
  buildHud();
  closeCmd();
  const F = FIELDS[state.field];
  setMsg(`FIELD: <b>${F.name}</b> · ${esc(F.desc).toUpperCase()}<br>${mode === "local" ? "P1 VS P2 · " : ""}READY... RUMBLE!`);
  show("battle");
  scene.draw();
  requestAnimationFrame(loop);
}

function loop() {
  if (!B) return;
  const hidden = document.hidden;
  frameBody(hidden ? 6 : 1, !hidden);
  if (hidden) setTimeout(loop, 100); else requestAnimationFrame(loop);
}

function frameBody(mult = 1, draw = true) {
  if (!B) return;
  const st = B.state;
  if (!B.ended) {
    for (let k = 0; k < B.speed * mult; k++) {
      if (scene.freeze > 0 && mult === 1) break;                       // hit-stop
      if (scene.slowmo > 0 && mult === 1 && B.frame % 3) break;         // slow motion after a knock-out
      applyRemote();
      if (B.ai.length) autoCommands(st, B.ai, { [B.ai[0]]: B.level });
      const pend = pending(st);
      const mine = pend.filter(([s]) => B.human.includes(s));
      if (mine.length) { openCmd(mine[0]); break; }
      if (pend.length) { setWaiting(true); break; }
      setWaiting(false);
      const ev = step(st);
      if (ev.length) onEvents(ev);
      if (B.mode === "online" && st.tick % 600 === 0 && st.tick && !B.hashes[st.tick]) {
        B.hashes[st.tick] = hashState(st);
        link.send({ t: "hash", tick: st.tick, h: B.hashes[st.tick] });
      }
      if (st.winner !== null) { B.ended = true; setTimeout(endBattle, 2200); break; }
    }
  }
  if (draw) scene.draw();
  if (++B.frame % 4 === 0) updateHud();
}

function setWaiting(on) {
  if (on && !B.waitShown && B.mode === "online") { B.waitShown = true; setMsg("WAITING FOR YOUR RIVAL..."); }
  if (!on) B.waitShown = false;
}

function applyRemote() {
  if (!B.remoteQ.length) return;
  const keep = [];
  for (const m of B.remoteQ) {
    const u = B.state.sides[m.s]?.units[m.i];
    if (u && u.phase === "cmd" && !u.cmd && !u.down && B.state.tick === m.tick) giveCommand(B.state, m.s, m.i, m.cmd);
    else if (u && !u.down && B.state.tick <= m.tick) keep.push(m);
  }
  B.remoteQ = keep;
}

function sideTag(side) {
  if (B.mode === "local") return side === 0 ? "P1" : "P2";
  return side === B.me ? "YOU" : "RIVAL";
}

function openCmd([s, i]) {
  if (B.cmdFor && B.cmdFor[0] === s && B.cmdFor[1] === i) return;
  B.cmdFor = [s, i];
  B.target = null;
  scene.actor = [s, i];
  scene.cursor = null;
  renderCmd();
  const tip = B.mode === "arcade" && profile.wins === 0 ? " TIP: A SHOT IS A SAFE FIRST MOVE." : "";
  setMsg(`<b>${esc(B.state.sides[s].units[i].name)}</b> IS READY! PICK A MOVE ▼${tip}`);
  $("#b-cmd").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function closeCmd() {
  if (B) { B.cmdFor = null; B.target = null; }
  if (scene) { scene.actor = null; scene.cursor = null; }
  $("#b-cmd").classList.add("hidden");
}

function renderCmd() {
  const [s, i] = B.cmdFor;
  const u = B.state.sides[s].units[i];
  const box = $("#b-cmd");
  box.classList.remove("hidden");
  const tag = B.mode === "local" ? `<em class="tag p${s + 1}">${sideTag(s)}</em>` : "";
  const bars = (x) => PARTS.map((p) => {
    const q = x.parts[p], pct = Math.round(100 * q.hp / q.max);
    return `<div class="ib"><span>${PART_LABEL[p]}</span><i><b style="width:${pct}%" class="${q.hp <= 0 ? "out" : pct < 40 ? "low" : ""}"></b></i><span>${q.hp}</span></div>`;
  }).join("");
  // GBA-style window: a list with a cursor on the left, details of the highlighted item on the right
  const frame = (title, items, infos, footer) => {
    box.innerHTML = `<div class="cmdhead">${tag}${spriteImg(u.build, 1)}<b>${esc(u.name)}</b>${i === 0 ? " ★" : ""} <span class="crumb">${title}</span></div>
      <div class="cmdbody"><div class="cmdlist">${items}</div><div class="cmdinfo" id="cmd-info"></div></div>
      <div class="row2">${footer}</div>`;
    const info = $("#cmd-info");
    box.querySelectorAll(".mi").forEach((b, n) => {
      const show = () => { info.innerHTML = infos[n] || ""; box.querySelectorAll(".mi.sel").forEach((x) => x.classList.remove("sel")); b.classList.add("sel"); };
      b.addEventListener("focus", show);
      b.addEventListener("mouseenter", () => b.focus({ preventScroll: true }));
    });
    const first = box.querySelector(".mi");
    if (first) { first.focus({ preventScroll: true }); info.innerHTML = infos[0] || ""; first.classList.add("sel"); }
  };

  if (B.target && B.target.aimFor !== undefined) {
    const t = B.target, foe = B.state.sides[t.side].units[t.aimFor];
    const opts = PARTS.filter((x) => foe.parts[x].hp > 0);
    frame(`▶ ${esc(t.label)} ▶ ${esc(foe.name)} · SNIPE WHICH PART?`,
      opts.map((x) => `<button class="mi" data-aim="${x}">${PART_LABEL[x]}</button>`).join("") + `<button class="mi" data-aim="">ANY PART</button>`,
      [...opts.map((x) => `<b>${PART_LABEL[x]}: ${esc(foe.parts[x].name)}</b><br>ARMOR ${foe.parts[x].hp}/${foe.parts[x].max}<br>${x === "head" ? "BREAK IT TO KNOCK THEM OUT. HARDER TO HIT." : x === "legs" ? "BROKEN LEGS: SLOW AND EASY TO HIT." : "BROKEN ARMS CAN'T BE USED."}`), "<b>ANY PART</b><br>A normal shot at a random part."],
      `<button id="c-back">◀ BACK</button>`);
    box.querySelectorAll("[data-aim]").forEach((b) => b.onclick = () => issue({ part: t.part, target: t.aimFor, aim: b.dataset.aim || undefined }));
    $("#c-back").onclick = () => { delete B.target.aimFor; renderCmd(); };
    return;
  }
  if (B.target) {
    const t = B.target;
    const units = B.state.sides[t.side].units;
    frame(`▶ ${esc(t.label)} · CHOOSE TARGET`,
      t.list.map((x) => `<button class="mi" data-t="${x}">${x === 0 ? "★" : ""}${esc(units[x].name)}</button>`).join(""),
      t.list.map((x) => `${spriteImg(units[x].build, 2, { flip: t.side !== B.me, smooth: true })}<b>${esc(units[x].name)}</b>${x === 0 ? " · LEADER" : ""}${bars(units[x])}`),
      `<button id="c-back">◀ BACK</button>`);
    box.querySelectorAll("[data-t]").forEach((b) => {
      b.onclick = () => (t.snipe ? (B.target.aimFor = +b.dataset.t, renderCmd()) : issue({ part: t.part, special: t.special, target: +b.dataset.t }));
      b.addEventListener("focus", () => { scene.cursor = [t.side, +b.dataset.t]; });
    });
    scene.cursor = [t.side, t.list[0]];
    $("#c-back").onclick = () => { B.target = null; scene.cursor = null; renderCmd(); };
    return;
  }
  const acts = actionsFor(B.state, s, i);
  const items = [], infos = [];
  acts.forEach((a, n) => {
    if (a.part === "transform") {
      items.push(`<button class="mi special" data-n="${n}">⚡ TRANSFORM</button>`);
      infos.push(`<b>TRANSFORM</b><br>FULL SET ONLY · COSTS 50 CORE<br>Moves 15% faster for 4 moves, and every hit is shared by the whole body.`);
    } else if (a.part === "core") {
      items.push(`<button class="mi special" data-n="${n}">★ ${esc(SPECIALS[a.special].name)}</button>`);
      infos.push(`<b>${esc(SPECIALS[a.special].name)}</b><br>CORE SPECIAL · USES THE FULL CORE<br>${esc(SPECIALS[a.special].desc)}`);
    } else if (a.part === "wait") {
      items.push(`<button class="mi" data-n="${n}">WAIT</button>`);
      infos.push("No usable parts left.");
    } else {
      const q = u.parts[a.part];
      items.push(`<button class="mi" data-n="${n}">${KIND_TEXT[a.kind]} <small>${PART_LABEL[a.part]} · ${esc(q.name)}</small></button>`);
      const stats = [KIND_TEXT[a.kind]];
      if (q.power) stats.push("POWER " + q.power);
      if (q.accuracy) stats.push("AIM " + q.accuracy);
      if (a.part === "head") stats.push(q.usesLeft + " USES LEFT");
      infos.push(`<b>${esc(q.name)}</b> <small>(${PART_LABEL[a.part]} ${q.hp}/${q.max})</small><br>${stats.join(" · ")}<br>${KIND_HINT[a.kind] || ""}<br>${subTags(q)}`);
    }
  });
  frame("· PICK A MOVE", items.join(""), infos, `<button id="c-auto">AUTO (${esc((PERSONALITY[u.core.special] || {}).name || "AI")})</button>`);
  box.querySelectorAll("[data-n]").forEach((b) => b.onclick = () => {
    const a = acts[+b.dataset.n];
    if (a.targets[0] === null) return issue({ part: a.part, special: a.special, target: null });
    const label = a.part === "core" ? SPECIALS[a.special].name : u.parts[a.part].name;
    const snipe = a.part !== "core" && !a.ally && subSkills(u.parts[a.part]).includes("snipe");
    B.target = { part: a.part, special: a.special, side: a.ally ? s : 1 - s, list: a.targets, label, snipe };
    renderCmd();
  });
  $("#c-auto").onclick = () => issue(aiCommand(clone(B.state), s, i, 3));
}

function issue(cmd) {
  if (!B || !B.cmdFor) return;
  const [s, i] = B.cmdFor;
  const tick = B.state.tick;
  if (!giveCommand(B.state, s, i, cmd)) return;
  if (B.mode === "online") link.send({ t: "cmd", s, i, tick, cmd });
  const u = B.state.sides[s].units[i];
  const what = cmd.part === "core" ? (SPECIALS[cmd.special] || {}).name : cmd.part === "transform" ? "TRANSFORM" : u.parts[cmd.part] ? u.parts[cmd.part].name : "WAIT";
  setMsg(`<b>${esc(u.name)}</b>: ${esc(what || "GO")}! GO!`);
  closeCmd();
}

function nameOf(ref) { return B.state.sides[ref[0]].units[ref[1]].name; }
function describe(e) {
  const src = e.src ? esc(nameOf(e.src)) : "", dst = e.dst ? esc(nameOf(e.dst)) : "";
  switch (e.t) {
    case "attack":
      if (!e.src) return `${esc(e.pname)}! ${dst}'S ${PART_LABEL[e.hitPart]} -${e.dmg}${e.broke ? " · BROKEN!" : ""}`;
      if (!e.hit) return `${src}: ${esc(e.pname)}! ${dst} DODGED!`;
      if (e.spread) return `${src}: ${esc(e.pname)}! ${dst} (TRANSFORMED) SHRUGS OFF -${e.dmg} ACROSS ITS BODY`;
      return `${src}: ${esc(e.pname)}! ${e.aimed ? "SNIPED! " : ""}${e.anti ? e.anti + "! " : ""}${e.splash ? "RECKLESS! " : ""}${e.crit ? "CRITICAL! " : ""}${dst}'S ${PART_LABEL[e.hitPart]} -${e.dmg}${e.broke ? " · BROKEN!" : ""}${e.guarded ? " (GUARDED)" : ""}`;
    case "down": return `${dst} IS OUT OF ACTION!${e.leader ? " LEADER DOWN!" : ""}`;
    case "repair": return `${src} REPAIRS ${dst} +${e.amount}`;
    case "shield": return `${src} SHIELDS ${dst}!`;
    case "scan": return `${src} SCANS THE FIELD!`;
    case "guard": return `${src} GUARDS ${dst}!`;
    case "core": return `${src} UNLEASHES ${esc(e.pname)}!`;
    case "skip": return `${src} CAN'T ACT: ${esc(e.why).toUpperCase()}`;
    case "status": return `${dst} IS ${esc(e.what)}!`;
    case "transform": return `${src} TRANSFORMS!`;
    case "field": return `<b>${esc(e.what)}!</b>`;
    case "win": return B.mode === "local" ? `P${e.winner + 1} WINS!` : e.winner === B.me ? "YOU WIN!" : "YOU LOSE...";
    case "timeup": return "TIME UP! JUDGE'S DECISION...";
    default: return "";
  }
}

function onEvents(ev) {
  scene.handle(ev);
  for (const e of ev) if (e.src && e.src[0] === B.me && (e.t === "attack" || e.t === "repair" || e.t === "shield" || e.t === "scan" || e.t === "guard" || e.t === "core" || e.t === "transform")) B.mySteps = (B.mySteps || 0) + (e.t === "attack" ? 2 : 3);
  const lines = ev.map(describe).filter(Boolean);
  if (lines.length) setMsg(lines.slice(0, 2).join("<br>"));
}

function setMsg(html) { $("#b-msg").innerHTML = html; }

// HUD: built once per battle, then only widths/numbers change
function buildHud() {
  const team = (side) => B.state.sides[side].units.map((u) => `
    <div class="hu" id="h-${u.side}-${u.idx}">
      <div class="hn"><img class="px" width="32" height="32" alt="" src="${spriteURL(u.build, 1, { flip: side !== B.me })}"><b>${esc(u.name)}</b>${u.idx === 0 ? '<em>★</em>' : ""}</div>
      ${PARTS.map((p) => `<div class="hb" data-p="${p}"><span>${PART_LABEL[p]}</span><i><b></b></i><span class="v"></span></div>`).join("")}
      <div class="hb core"><span>CORE</span><i><b></b></i><span class="v"></span></div>
    </div>`).join("");
  $("#hud-me").innerHTML = `<h5>${sideTag(B.me)}</h5>` + team(B.me);
  $("#hud-foe").innerHTML = `<h5>${sideTag(1 - B.me)}</h5>` + team(1 - B.me);
  updateHud();
}

function updateHud() {
  for (const s of B.state.sides) for (const u of s.units) {
    const el = document.getElementById(`h-${u.side}-${u.idx}`);
    if (!el) continue;
    el.classList.toggle("down", u.down);
    el.querySelectorAll(".hb[data-p]").forEach((row) => {
      const q = u.parts[row.dataset.p], pct = Math.round(100 * q.hp / q.max);
      row.querySelector("b").style.width = pct + "%";
      row.className = "hb" + (q.hp <= 0 ? " out" : pct < 40 ? " low" : "");
      row.querySelector(".v").textContent = q.hp;
    });
    const c = el.querySelector(".hb.core");
    c.querySelector("b").style.width = u.meter + "%";
    c.classList.toggle("full", u.meter >= 100);
    c.querySelector(".v").textContent = u.meter >= 100 ? "MAX" : u.meter;
  }
}

$("#b-speed").onclick = () => {
  if (!B) return;
  B.speed = B.speed === 1 ? 2 : 1;
  $("#b-speed").textContent = B.speed === 1 ? "x1" : "x2";
};
$("#b-quit").onclick = () => {
  if (B && B.mode === "online") { if (!confirm("Leave the online match?")) return; leaveOnline(); }
  else if (B && B.mode === "arcade" && !confirm("Quit this arcade run?")) return;
  B = null; renderTitle(); show("title");
};

// ------------------------------------------------------------------ results
function endBattle() {
  if (!B) return;
  sfx.music(null);
  const w = B.state.winner;
  const head = $("#r-head"), text = $("#r-text"), acts = $("#r-actions");
  $("#r-bots").innerHTML = "";
  head.className = "";
  if (B.mode === "arcade") {
    const k = B.arcade.k;
    if (w === 0) {
      profile.best = Math.max(profile.best, k + 1);
      profile.wins++;
      const enemy = ladderRound(k);
      const bolts = earnBolts(profile, true, k);
      const spoil = takeSpoils(profile, enemy.team, Math.random, rewardsFor(k));
      const whole = enemy.boss ? takeWholeRobot(profile, rewardsFor(k)) : null;
      const chip = enemy.boss ? takeChip(profile, k) : null;
      const watchGot = watchSteps(profile, B.mySteps || 0);
      const got = whole ? [whole] : [];
      const xp = grantCoreXP(profile, profile.team, true, k);
      const last = k === LADDER_LENGTH - 1;
      if (last) profile.clears++;
      saveProfile(profile);
      head.textContent = last ? "CHAMPION!" : "VICTORY!"; head.className = "win";
      sfx.victory(); if (spoil || got.length || xp.ups.length) setTimeout(() => sfx.unlock2(), 1200);
      text.innerHTML = (last ? "YOU BEAT ALL 20 ROUNDS!" : `ROUND ${k + 1}/${LADDER_LENGTH} CLEARED`) +
        (spoil ? `<br>SPOILS: <b>${esc(byId(spoil.id)[spoil.slot].name)}</b> (${PART_LABEL[spoil.slot]} OF ${esc(byId(spoil.id).name)})` : "") +
        (got.length ? `<br>BOSS PRIZE: THE WHOLE <b>${got.map((id) => esc(byId(id).name)).join(", ")}</b>!` : "") +
        (chip ? `<br>CHIP: <b>${esc(CHIPS[chip].name)}</b> (${esc(CHIPS[chip].desc)})` : "") +
        watchLine(watchGot) +
        `<br>+${bolts} BOLTS · CORES +${xp.gain} XP` + xp.ups.map((u) => `<br><b>${esc(coreById(u.core).name)} LV ${u.to}!</b>${newSpecials(u)}`).join("");
      $("#r-bots").innerHTML = (got.length ? got.map((id) => spriteImg({ head: id, rarm: id, larm: id, legs: id }, 4, { smooth: true })) : spoil ? [spriteImg({ head: spoil.id, rarm: spoil.id, larm: spoil.id, legs: spoil.id }, 4, { smooth: true })] : []).join("");
      acts.innerHTML = last ? `<button class="big" id="r-menu">MENU</button>` :
        `<button class="big" id="r-next">NEXT ROUND ▶</button><button class="big alt" id="r-ws">WORKSHOP</button><button class="big alt" id="r-menu">QUIT RUN</button>`;
      if (!last) {
        $("#r-next").onclick = () => startArcade(k + 1);
        $("#r-ws").onclick = () => openWorkshop({ team: profile.team, pool: profile.parts, levels: true, title: "WORKSHOP", back: "result",
          hint: "Swap parts before the next round. Your robots are fully repaired.", onDone: () => { saveProfile(profile); show("result"); } });
      }
    } else {
      const xp = grantCoreXP(profile, profile.team, false, k);
      const bolts = earnBolts(profile, false, k);
      const watchGot = watchSteps(profile, B.mySteps || 0);
      saveProfile(profile);
      head.textContent = "DEFEATED"; head.className = "lose";
      sfx.defeat();
      text.innerHTML = watchLine(watchGot).replace(/^<br>/, "") + `<br>YOUR RUN ENDED ON ROUND ${k + 1}<br>BEST: ROUND ${profile.best}<br>+${bolts} BOLTS · CORES +${xp.gain} XP` + xp.ups.map((u) => `<br><b>${esc(coreById(u.core).name)} LV ${u.to}!</b>${newSpecials(u)}`).join("");
      acts.innerHTML = `<button class="big" id="r-retry">TRY AGAIN</button><button class="big alt" id="r-ws2">WORKSHOP</button><button class="big alt" id="r-menu">MENU</button>`;
      $("#r-retry").onclick = () => startArcade(0);
      $("#r-ws2").onclick = () => go("workshop");
    }
  } else if (B.mode === "local") {
    head.textContent = w === "draw" ? "DRAW" : `P${w + 1} WINS!`; head.className = "win";
    sfx.victory();
    text.textContent = "GOOD RUMBLE!";
    acts.innerHTML = `<button class="big" id="r-again">REMATCH</button><button class="big alt" id="r-menu">MENU</button>`;
    $("#r-again").onclick = () => startBattle({ mode: "local", teams: maxed(local.teams), title: "P1 VS P2", field: FIELD_IDS[Math.floor(Math.random() * FIELD_IDS.length)] });
  } else {
    head.textContent = w === "draw" ? "DRAW" : w === B.me ? "YOU WIN!" : "YOU LOSE";
    if (w === B.me) sfx.victory(); else sfx.defeat();
    const ob = earnBolts(profile, w === B.me, 3); markSeen(profile, B.teams[1 - B.me]); saveProfile(profile);
    head.className = w === B.me ? "win" : "lose";
    text.textContent = `+${ob} BOLTS · ` + (link && link.conn ? "REMATCH? BOTH PRESS REMATCH." : "YOUR RIVAL HAS LEFT.");
    acts.innerHTML = `<button class="big" id="r-rematch">REMATCH</button><button class="big alt" id="r-menu">LEAVE</button>`;
    $("#r-rematch").onclick = () => { online.rematch = true; link.send({ t: "rematch" }); $("#r-text").textContent = "WAITING FOR YOUR RIVAL..."; maybeRematch(); };
  }
  $("#r-menu").onclick = () => { leaveOnline(); B = null; renderTitle(); show("title"); };
  show("result");
}

function watchLine(got) {
  const parts = got.map((g) => `${esc(byId(g.id)[g.slot].name)}`).join(", ");
  return `<br>WATCH +${B.mySteps || 0} STEPS` + (parts ? ` · ASSEMBLED: <b>${parts}</b>` : "");
}

function newSpecials(u) {
  const c = coreById(u.core);
  const fresh = (CORE_TREE[c.special] || []).filter((_, i) => TIER_LV[i] > u.from && TIER_LV[i] <= u.to);
  return fresh.length ? ` NEW SPECIAL: <b>${fresh.map((x) => esc(SPECIALS[x].name)).join(", ")}</b>` : "";
}

// ------------------------------------------------------------------ collection & shop
let COL = null;
function renderCollection() {
  const P = profile;
  const owned = (id) => SLOTS.filter((s) => P.parts[s].includes(id)).length;
  const totalParts = DATA.robots.length * 4;
  const have = SLOTS.reduce((a, s) => a + P.parts[s].length, 0);
  $("#col-bolts").textContent = `${P.bolts} BOLTS`;
  $("#col-hint").textContent = `PARTS ${have}/${totalParts} (${Math.round(100 * have / totalParts)}%) · ROBOTS SEEN ${DATA.robots.filter((r) => P.seen.includes(r.id)).length}/${DATA.robots.length}. Win fights for bolts, buy parts of robots you've met.`;
  $("#col-grid").innerHTML = DATA.robots.map((r) => {
    const seen = P.seen.includes(r.id), n = owned(r.id);
    const full = { head: r.id, rarm: r.id, larm: r.id, legs: r.id };
    return `<button class="colcard${seen ? "" : " unseen"}${COL === r.id ? " on" : ""}${n === 4 ? " done" : ""}" data-id="${r.id}" ${seen ? "" : "disabled"}>
      ${spriteImg(full, 2, { smooth: true })}<b>${seen ? esc(r.name) : "???"}</b>
      <span class="pips">${SLOTS.map((s) => `<i class="${P.parts[s].includes(r.id) ? "on" : ""}"></i>`).join("")}</span><small>TIER ${r.tier}</small></button>`;
  }).join("");
  $("#col-grid").querySelectorAll("[data-id]").forEach((b) => b.onclick = () => { COL = COL === b.dataset.id ? null : b.dataset.id; renderCollection(); });
  const det = $("#col-detail");
  const r = COL && byId(COL);
  if (!r) {
    det.innerHTML = `<p class="hint">Pick a robot you've seen to look at its parts and buy the ones you're missing.</p>
      <div class="plate corep">CHIP SHOP · ${CHIP_PRICE} BOLTS EACH</div>` + CHIP_IDS.map((c) => `<div class="buyrow"><span><i class="gemdot ${c}"></i> <b>${esc(CHIPS[c].name)}</b><small>${esc(CHIPS[c].desc)}</small></span>
      ${P.chips.includes(c) ? "<em>OWNED</em>" : `<button data-chipbuy="${c}" ${P.bolts < CHIP_PRICE ? "disabled" : ""}>${P.bolts < CHIP_PRICE ? "NEED" : "BUY"} ${CHIP_PRICE}</button>`}</div>`).join("");
    det.querySelectorAll("[data-chipbuy]").forEach((b) => b.onclick = () => { if (buyChip(profile, b.dataset.chipbuy)) { saveProfile(profile); sfx.unlock2(); renderCollection(); $("#col-hint").textContent = "BOUGHT A CHIP! PUT IT ON A CORE IN THE WORKSHOP."; } });
    return;
  }
  const full = { head: r.id, rarm: r.id, larm: r.id, legs: r.id };
  det.innerHTML = `${spriteImg(full, 5, { smooth: true })}<div class="plate name">${esc(r.name)}</div>
    <p class="flavor">${esc(r.flavor || "")}</p>
    ${SLOTS.map((s) => {
      const has = P.parts[s].includes(r.id), price = partPrice(r.id);
      return `<div class="buyrow"><span><b>${PART_LABEL[s]}</b> ${esc(r[s].name)}<small>${partLine(r, s)}</small></span>
        ${has ? `<em>OWNED</em>` : `<button data-buy="${s}" ${P.bolts < price ? "disabled" : ""}>${P.bolts < price ? "NEED" : "BUY"} ${price}</button>`}</div>`;
    }).join("")}`;
  det.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => {
    if (b.dataset.buy === "chip") return;
    if (buyPart(profile, b.dataset.buy, r.id)) { saveProfile(profile); sfx.unlock2(); renderCollection(); $("#col-hint").textContent = "BOUGHT! FIND IT IN THE WORKSHOP."; }
  });
}

// ------------------------------------------------------------------ Bolt Watch (LCD toy nod)
let WATCH_GAME = null;
function renderWatch() {
  const w = profile.watch, id = watchTarget(profile);
  saveProfile(profile);
  const lcd = $("#watch-lcd");
  if (!id) { lcd.innerHTML = `<div class="lcd-msg">ALL ROBOTS<br>COMPLETE!</div>`; return; }
  const r = byId(id);
  const have = Object.fromEntries(SLOTS.map((s) => [s, profile.parts[s].includes(id)]));
  // owned parts show as solid LCD pixels, missing ones as faint outlines
  lcd.innerHTML = `<div class="lcd-bot">${spriteImg({ head: id, rarm: id, larm: id, legs: id }, 3, { smooth: true })}</div>
    <div class="lcd-row">${SLOTS.map((s) => `<span class="${have[s] ? "on" : ""}">${PART_LABEL[s]}</span>`).join("")}</div>
    <div class="lcd-row"><span>STEPS ${w.steps}/${WATCH_STEP}</span><span>ENERGY ${w.energy}</span></div>
    <div class="lcd-bar"><i style="width:${Math.round(100 * w.steps / WATCH_STEP)}%"></i></div>
    <div class="lcd-msg">${have.head && have.rarm && have.larm && have.legs ? "" : "MYSTERY ROBOT"} · BUILT ${w.done}</div>`;
  $("#watch-oil").onclick = startOilGame;
}

function startOilGame() {
  if (WATCH_GAME) return;
  const bar = $("#oil-bar"), needle = $("#oil-needle");
  bar.classList.remove("hidden");
  let x = 0, dir = 1;
  WATCH_GAME = setInterval(() => { x += dir * 3.2; if (x >= 100 || x <= 0) dir = -dir; needle.style.left = Math.max(0, Math.min(100, x)) + "%"; }, 16);
  $("#watch-oil").textContent = "STOP!";
  $("#watch-oil").onclick = () => {
    clearInterval(WATCH_GAME); WATCH_GAME = null;
    const quality = Math.max(0, 1 - Math.abs(x - 50) / 50);
    watchRefuel(profile, quality);
    saveProfile(profile);
    $("#watch-note").textContent = quality > 0.85 ? "PERFECT OIL CHANGE!" : quality > 0.5 ? "GOOD OIL CHANGE" : "SLOPPY... BUT IT RUNS";
    if (quality > 0.85) sfx.unlock2(); else sfx.pop();
    $("#watch-oil").textContent = "OIL CHANGE";
    setTimeout(() => bar.classList.add("hidden"), 600);
    renderWatch();
  };
}

// ------------------------------------------------------------------ arcade
function startArcade(k) {
  const r = ladderRound(k);
  const title = `${k + 1}/${LADDER_LENGTH} ${r.title.toUpperCase()}`;
  markSeen(profile, r.team); saveProfile(profile);
  showReady({ title, mine: profile.team, foe: r.team, back: "title", field: r.field, leaveWarn: k > 0 ? "Leave this run? Arcade starts again at round 1." : null,
    rule: r.rule,
    onWorkshop: () => openWorkshop({ team: profile.team, pool: profile.parts, levels: true, title: "WORKSHOP", back: "ready",
      hint: "Swap parts, then press DONE to get back to the fight.", onDone: () => { saveProfile(profile); startArcade(k); } }),
    onStart: () => startBattle({ mode: "arcade", teams: [withCoreLevels(profile, clone(profile.team)), r.team], level: r.level, arcade: { k }, title, rule: r.rule, field: r.field }) });
}

// ------------------------------------------------------------------ team ready screen
let RD = null;
function showReady(opts) {
  RD = { ...opts, sel: 0 };
  $("#ready-title").textContent = opts.title + (opts.rule === "all" ? " · BEAT ALL 3" : "") + (opts.field && opts.field !== "normal" ? " · " + FIELDS[opts.field].name : "");
  const stands = (team, flip, mine) => team.map((b, i) => `<button class="stand${i === 0 ? " lead" : ""}" ${mine ? `data-i="${i}"` : "disabled"} aria-label="${esc(b.name)}">
      ${spriteImg(b, 2, { flip, smooth: true })}<i></i><span>${i === 0 ? "★" : ""}${esc(b.name)}</span><em class="grade g${terrainGrade(opts.field || "normal", byId(b.legs).body)}" title="How good these legs are on this ground: A great, D bad">${terrainGrade(opts.field || "normal", byId(b.legs).body)}</em></button>`).join("");
  $("#rd-mine").innerHTML = stands(opts.mine, false, true);
  $("#rd-foe").innerHTML = stands(opts.foe, true, false);
  $("#rd-mine").querySelectorAll("[data-i]").forEach((b) => {
    b.onclick = () => { RD.sel = +b.dataset.i; renderPortrait(); };
    b.onfocus = () => { RD.sel = +b.dataset.i; renderPortrait(); };
  });
  $("#rd-go").onclick = () => opts.onStart();
  $("#rd-ws").onclick = () => opts.onWorkshop();
  $("#rd-ws").classList.toggle("hidden", !opts.onWorkshop);
  $("#ready-back").onclick = () => {
    if (opts.leaveWarn && !confirm(opts.leaveWarn)) return;
    renderTitle(); show(opts.back || "title");
  };
  renderPortrait();
  show("ready", opts.back || "title");
  $("#rd-go").focus({ preventScroll: true });
}

function renderPortrait() {
  const b = RD.mine[RD.sel];
  const c = coreById(b.core);
  const parts = PARTS.map((p) => byId(b[p])[p]);
  $("#rd-big").innerHTML = spriteImg(b, 6, { smooth: true });
  $("#rd-name").textContent = b.name;
  const lv = RD.versus ? MAX_CORE_LV : coreLvOf(profile, b.core);
  $("#rd-core").innerHTML = `<i class="dot" style="background:${c.color}"></i>${esc(coreTitle(c, lv))} LV ${lv}`;
  $("#rd-stats").innerHTML = PARTS.map((p, i) => `<div><span>${PART_LABEL[p]}</span><b>${esc(parts[i].name)}</b></div>`).join("") +
    `<div><span>SPEED</span><b>${parts[3].speed}</b></div>` +
    `<div><span>STYLE</span><b>${(PERSONALITY[c.special] || {}).name || ""}: ${esc((PERSONALITY[c.special] || {}).desc || "")}</b></div>` +
    `<div><span>SPECIALS</span><b>${(CORE_TREE[c.special] || []).filter((_, i) => lv >= TIER_LV[i]).map((x) => esc(SPECIALS[x].name)).join(", ")}</b></div>` +
    `<div><span>TERRAIN</span><b>${terrainGrade(RD.field || "normal", byId(b.legs).body)} (${byId(b.legs).body.toUpperCase()} ON ${FIELDS[RD.field || "normal"].name})</b></div>` +
    (b.chip ? `<div><span>CHIP</span><b>${esc(CHIPS[b.chip].name)}</b></div>` : "") +
    (b.head === b.rarm && b.head === b.larm && b.head === b.legs ? `<div><span>FULL SET</span><b>CAN TRANSFORM</b></div>` : "") +
    (RD.rule === "all" ? `<div><span>RULE</span><b>KNOCK OUT ALL 3</b></div>` : "");
  $("#rd-mine").querySelectorAll(".stand").forEach((x, i) => x.classList.toggle("on", i === RD.sel));
}

// versus: every core at max level so it's fair
const maxed = (teams) => teams.map((t) => t.map((b) => ({ ...b, coreLv: MAX_CORE_LV })));

// ------------------------------------------------------------------ local versus
let local = null;
function startLocalSetup() {
  const all = DATA.robots.map((r) => r.id);
  local = { teams: [clone(profile.team), clone(profile.team).reverse()] };
  openWorkshop({ team: local.teams[0], pool: all, title: "P1 TEAM", hint: "Every part is unlocked in versus. Player 1, build your team.",
    onDone: () => openWorkshop({ team: local.teams[1], pool: all, title: "P2 TEAM", hint: "Player 2, build your team. P2 fights from the right.",
      onDone: () => { local.field = FIELD_IDS[Math.floor(Math.random() * FIELD_IDS.length)];
        showReady({ title: "P1 VS P2", mine: local.teams[0], foe: local.teams[1], back: "title", versus: true, field: local.field,
        onStart: () => startBattle({ mode: "local", teams: maxed(local.teams), title: "P1 VS P2", field: local.field }) }); } }) });
}

// ------------------------------------------------------------------ online versus (lockstep)
function resetLobby() {
  online = { team: clone(profile.team), peerTeam: null, ready: false, rematch: false, peerRematch: false };
  $("#on-code").textContent = "";
  $("#on-status").textContent = "";
  $("#on-ready").classList.add("hidden");
  $("#on-host").disabled = false; $("#on-join").disabled = false;
  $("#on-cancel").classList.add("hidden"); $("#on-copy").classList.add("hidden");
}

function leaveOnline() { if (link) { link.close(); link = null; } }

function onStatus(kind, info) {
  const st = $("#on-status");
  if (kind === "waiting") st.textContent = "ROOM READY. SEND THE CODE TO YOUR FRIEND AND KEEP THIS PAGE OPEN.";
  if (kind === "joining") st.textContent = `JOINING ROOM ${info}...`;
  if (kind === "connected") { st.textContent = "CONNECTED TO YOUR FRIEND!"; $("#on-ready").classList.remove("hidden"); }
  if (kind === "closed") {
    st.textContent = "YOUR FRIEND DISCONNECTED.";
    if (B && B.mode === "online" && !B.ended) { B.ended = true; setMsg("YOUR RIVAL DISCONNECTED."); setTimeout(() => { B = null; renderTitle(); show("title"); }, 2500); }
  }
  if (kind === "error") { st.textContent = "CONNECTION PROBLEM: " + info; $("#on-host").disabled = false; $("#on-join").disabled = false; }
}

function validTeam(t) {
  return Array.isArray(t) && t.length === 3 && t.every((b) => b && PARTS.every((p) => byId(b[p])) && coreById(b.core))
    ? t.map((b) => ({ head: b.head, rarm: b.rarm, larm: b.larm, legs: b.legs, core: b.core, name: String(b.name || byId(b.head).name).toUpperCase().slice(0, 10), ...(CHIPS[b.chip] && Object.hasOwn(CHIPS, b.chip) ? { chip: b.chip } : {}) }))
    : null;
}

function onMessage(m) {
  if (!m || typeof m !== "object") return;
  if (m.t === "team") { online.peerTeam = validTeam(m.team); if (link.isHost) maybeStartOnline(); }
  else if (m.t === "start" && !link.isHost) {
    const teams = Array.isArray(m.teams) ? m.teams.map(validTeam) : [];
    if (teams.length === 2 && teams[0] && teams[1] && Number.isInteger(m.seed)) startBattle({ mode: "online", me: 1, teams: maxed(teams), seed: m.seed, field: FIELDS[m.field] ? m.field : "normal", title: "ONLINE RUMBLE" });
  } else if (m.t === "cmd" && B && B.mode === "online") {
    const s = m.s === 0 || m.s === 1 ? m.s : -1;
    if (s !== 1 - B.me || ![0, 1, 2].includes(m.i) || !Number.isInteger(m.tick)) return;
    const c = m.cmd && ["head", "rarm", "larm", "core", "wait", "transform"].includes(m.cmd.part) ? { part: m.cmd.part, target: [0, 1, 2].includes(m.cmd.target) ? m.cmd.target : null } : null;
    if (c && c.part === "core" && Object.hasOwn(SPECIALS, m.cmd.special)) c.special = m.cmd.special;
    if (c && m.cmd.part === "transform") c.part = "transform";
    if (c && PARTS.includes(m.cmd.aim)) c.aim = m.cmd.aim;
    B.remoteQ.push({ s, i: m.i, tick: m.tick, cmd: c });
  } else if (m.t === "hash" && B && B.mode === "online") {
    const mine = B.hashes[m.tick];
    if (mine !== undefined && mine !== m.h) console.warn("desync at tick", m.tick);
  } else if (m.t === "rematch") { online.peerRematch = true; maybeRematch(); }
}

function maybeStartOnline() {
  if (!online.ready || !online.peerTeam) return;
  const seed = (Math.random() * 1e9) | 0;
  const teams = [online.team, online.peerTeam];
  const field = FIELD_IDS[Math.floor(Math.random() * FIELD_IDS.length)];
  link.send({ t: "start", seed, teams, field });
  startBattle({ mode: "online", me: 0, teams: maxed(teams.map(validTeam)), seed, field, title: "ONLINE RUMBLE" });
}

function maybeRematch() {
  if (!online.rematch || !online.peerRematch) return;
  online.rematch = online.peerRematch = false;
  if (link.isHost) maybeStartOnline();
}

$("#on-host").onclick = () => {
  leaveOnline();
  if (!window.Peer) { $("#on-status").textContent = "ONLINE PLAY COULDN'T LOAD. CHECK YOUR INTERNET."; return; }
  const code = makeCode();
  link = new Link(onMessage, onStatus);
  link.host(code);
  $("#on-code").textContent = code;
  $("#on-host").disabled = true; $("#on-join").disabled = true;
  $("#on-cancel").classList.remove("hidden"); $("#on-copy").classList.remove("hidden");
};
$("#on-cancel").onclick = () => { leaveOnline(); resetLobby(); $("#on-status").textContent = "CANCELLED."; };
$("#on-copy").onclick = () => { navigator.clipboard?.writeText($("#on-code").textContent).then(() => { $("#on-status").textContent = "CODE COPIED! SEND IT TO YOUR FRIEND."; }); };
$("#on-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#on-join").click(); });
$("#on-join").onclick = () => {
  const code = $("#on-input").value.toUpperCase().trim();
  if (code.length !== 5) { $("#on-status").textContent = "CODES ARE 5 LETTERS."; return; }
  leaveOnline();
  if (!window.Peer) { $("#on-status").textContent = "ONLINE PLAY COULDN'T LOAD. CHECK YOUR INTERNET."; return; }
  link = new Link(onMessage, onStatus);
  link.join(code);
  $("#on-host").disabled = true; $("#on-join").disabled = true;
  $("#on-cancel").classList.remove("hidden");
};
$("#on-team").onclick = () => openWorkshop({ team: online.team, pool: DATA.robots.map((r) => r.id), title: "ONLINE TEAM", back: "online",
  hint: "Every part is unlocked in versus.", onDone: () => show("online") });
$("#on-go").onclick = () => {
  online.ready = true;
  link.send({ t: "team", team: online.team });
  $("#on-status").textContent = "READY! WAITING FOR YOUR FRIEND...";
  if (link.isHost) maybeStartOnline();
};

// ------------------------------------------------------------------ keyboard (Z = A, X = B, arrows)
const k0 = (k) => ["z", "Z", "Enter", " "].includes(k);
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.ctrlKey || e.metaKey || e.altKey) return;
  const cmd = $("#b-cmd");
  if ($("#s-battle.active") && cmd.classList.contains("hidden") && k0(e.key)) return; // no menu open: don't press ✕ by accident
  const scope = $("#s-battle.active") && !cmd.classList.contains("hidden") ? cmd : document.querySelector(".screen.active");
  if (!scope) return;
  const btns = [...scope.querySelectorAll("button:not(:disabled)")].filter((b) => b.offsetParent);
  const k = e.key;
  if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(k)) {
    e.preventDefault();
    sfx.tick();
    let i = btns.indexOf(document.activeElement);
    i = i < 0 ? 0 : (i + (k === "ArrowDown" || k === "ArrowRight" ? 1 : -1) + btns.length) % btns.length;
    btns[i]?.focus();
  } else if (k === "z" || k === "Z") {
    (btns.includes(document.activeElement) ? document.activeElement : btns[0])?.click();
  } else if (k === "x" || k === "X" || k === "Escape") {
    scope.querySelector("#c-back, [data-back], #ready-back, #r-menu")?.click();
  }
});

// ------------------------------------------------------------------ GBA-style menus: cursor follows mouse and keys, help box explains
document.addEventListener("focusin", (e) => {
  const b = e.target.closest(".mi");
  if (!b) return;
  b.parentElement.querySelectorAll(".mi.sel").forEach((x) => x.classList.remove("sel"));
  b.classList.add("sel");
  const help = b.closest(".screen")?.querySelector(".gbahelp");
  if (help && b.dataset.desc) help.textContent = b.dataset.desc;
});
document.addEventListener("mouseover", (e) => {
  const b = e.target.closest(".menu .mi, .gbalist .mi");
  if (b && document.activeElement !== b) b.focus({ preventScroll: true });
});

// ------------------------------------------------------------------ sound: blips on buttons + a mute toggle
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.id === "mute") return;
  sfx.unlock();
  if (b.matches("[data-back], #c-back, #ready-back, #b-quit")) sfx.back(); else sfx.pop();
}, true);
const muteBtn = document.createElement("button");
muteBtn.id = "mute";
const paintMute = () => { muteBtn.textContent = sfx.muted ? "♪ OFF" : "♪ ON"; muteBtn.setAttribute("aria-label", sfx.muted ? "Sound off" : "Sound on"); };
muteBtn.onclick = () => { sfx.toggle(); paintMute(); };
paintMute();
document.body.appendChild(muteBtn);

// ------------------------------------------------------------------ boot
document.body.style.backgroundImage = `url(${(() => { const c = hexField(216, 168, { palette: [[30, 84, 56], [34, 92, 60], [28, 78, 52], [32, 88, 58]] }); return c.toDataURL(); })()})`;
if (new URLSearchParams(location.search).has("reset")) profile = resetProfile();
renderTitle();
window.__bolt = { get B() { return B; }, get profile() { return profile; }, get scene() { return scene; }, DATA,
  pump(n = 60) { for (let i = 0; i < n; i++) { frameBody(1, false); if (scene) scene.draw(); } } };
