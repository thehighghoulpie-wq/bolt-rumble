import { DATA } from "./data.js?v=14";
import { createBattle, step, pending, giveCommand, actionsFor, aiCommand, autoCommands, hashState, PARTS, PART_LABEL, SPECIALS, CORE_TREE, TIER_LV, AFFINITY, MAX_CORE_LV, FIELDS, FIELD_IDS } from "./engine.js?v=14";
import { spriteImg, spriteURL } from "./pixel.js?v=14";
import { Scene, W, H, hexField } from "./scene.js?v=14";
import { loadProfile, saveProfile, resetProfile, ladderRound, LADDER_LENGTH, rewardsFor, coreLvOf, withCoreLevels, grantCoreXP, takeSpoils, takeWholeRobot, SLOTS, partPrice, earnBolts, markSeen, buyPart } from "./meta.js?v=14";
import { Link, makeCode } from "./net.js?v=14";
import { sfx } from "./sfx.js?v=14";

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
let backTo = "title";
let B = null, link = null, online = null, scene = null;

// ------------------------------------------------------------------ screens
function show(id, back = "title") {
  document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === "s-" + id));
  backTo = back;
  window.scrollTo(0, 0);
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
}

function renderTitle() {
  $("#tagline").textContent = DATA.tagline;
  $("#title-bots").innerHTML = profile.team.map((b, i) => spriteImg(b, 4, { flip: i === 2 })).join("");
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
  if (p === "legs") return `ARM ${x.armor} · SPD ${x.speed} · EVA ${x.evasion}`;
  const bits = [`ARM ${x.armor}`];
  if (x.power) bits.push(`PWR ${x.power}`);
  if (x.accuracy) bits.push(`ACC ${x.accuracy}`);
  if (x.uses) bits.push(`USE ${x.uses}`);
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
        ${spriteImg(pv, 1)}<span><b>${esc(x.name)}</b><small>${esc(r.name)} · ${p === "legs" ? r.body.toUpperCase() : KIND_TEXT[x.kind]}</small><small>${partLine(r, p)}</small></span></button>`;
    }).join("") + `</div>`;
  }
  html += `<h4>CORE</h4><div class="chips">` + DATA.cores.map((c) => {
    const lv = lvOf(c.id);
    const tierCls = lv >= 16 ? "gold" : lv >= 8 ? "silver" : "bronze";
    return `<button class="chip core ${b.core === c.id ? "on" : ""}" data-core="${c.id}"><i class="dot ${tierCls}" style="background:${c.color}"></i><span><b>${esc(c.name)} <em>LV ${lv}</em></b>
      <small>${(CORE_TREE[c.special] || []).map((sp, i) => lv >= TIER_LV[i] ? esc(SPECIALS[sp].name) : `<s>${esc(SPECIALS[sp].name)} LV${TIER_LV[i]}</s>`).join(" · ")}</small>
      <small class="hint">BOOSTS ${(AFFINITY[c.special] || []).map((k) => KIND_TEXT[k]).join(" + ")}</small></span></button>`;
  }).join("") + `</div>`;
  $("#ws-parts").innerHTML = html;
  $("#ws-parts").querySelectorAll("[data-p]").forEach((x) => x.onclick = () => {
    const wasDefault = b.name === byId(b.head).name;
    b[x.dataset.p] = x.dataset.id;
    if (x.dataset.p === "head" && wasDefault) b.name = byId(b.head).name;
    renderWorkshop();
  });
  $("#ws-parts").querySelectorAll("[data-core]").forEach((x) => x.onclick = () => { b.core = x.dataset.core; renderWorkshop(); });
  const parts = PARTS.map((p) => byId(b[p])[p]);
  $("#ws-sum").innerHTML = `ARMOR <b>${parts.reduce((a, x) => a + x.armor, 0)}</b> · SPEED <b>${parts[3].speed}</b> · EVADE <b>${parts[3].evasion}</b><br>
    CORE <b>${esc(coreById(b.core).name)} LV ${lvOf(b.core)}</b> · BOOSTS ${(AFFINITY[coreById(b.core).special] || []).map((k) => KIND_TEXT[k]).join(" + ")}`;
  $("#ws-done").onclick = () => WS.onDone();
}

// ------------------------------------------------------------------ battle
const cv = $("#cv");
cv.addEventListener("click", (e) => {
  if (!B || !B.target) return;
  const r = cv.getBoundingClientRect();
  const hit = scene.unitAtPoint((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height);
  if (hit && hit[0] === B.target.side && B.target.list.includes(hit[1])) issue({ part: B.target.part, special: B.target.special, target: hit[1] });
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
  if (B.target) {
    const t = B.target;
    const units = B.state.sides[t.side].units;
    box.innerHTML = `<div class="cmdhead">${tag}${spriteImg(u.build, 1)}<b>${esc(u.name)}</b> ▶ ${esc(t.label)} · CHOOSE TARGET</div>
      <div class="opts">${t.list.map((x) => `<button class="opt" data-t="${x}">${spriteImg(units[x].build, 1, { flip: t.side !== B.me })}<span><b>${esc(units[x].name)}</b><small>HEAD ${units[x].parts.head.hp}/${units[x].parts.head.max}${x === 0 ? " · LEADER" : ""}</small></span></button>`).join("")}</div>
      <div class="row2"><button id="c-back">◀ BACK</button></div>`;
    box.querySelectorAll("[data-t]").forEach((b) => {
      b.onclick = () => issue({ part: t.part, special: t.special, target: +b.dataset.t });
      b.onmouseenter = b.onfocus = () => { scene.cursor = [t.side, +b.dataset.t]; };
    });
    scene.cursor = [t.side, t.list[0]];
    box.querySelector("[data-t]")?.focus({ preventScroll: true });
    $("#c-back").onclick = () => { B.target = null; scene.cursor = null; renderCmd(); };
    return;
  }
  const acts = actionsFor(B.state, s, i);
  box.innerHTML = `<div class="cmdhead">${tag}${spriteImg(u.build, 1)}<b>${esc(u.name)}</b>${i === 0 ? " ★" : ""} · WHAT'S THE MOVE?</div>
    <div class="opts">${acts.map((a, n) => {
      if (a.part === "core") return `<button class="opt core" data-n="${n}"><span><b>★ ${esc(SPECIALS[a.special].name)}</b><small>${esc(SPECIALS[a.special].desc)}</small></span></button>`;
      if (a.part === "wait") return `<button class="opt" data-n="${n}"><span><b>WAIT</b><small>no usable parts</small></span></button>`;
      const q = u.parts[a.part];
      const meta = [PART_LABEL[a.part], KIND_TEXT[a.kind]];
      if (q.power) meta.push("PWR " + q.power);
      if (a.part === "head") meta.push(q.usesLeft + " LEFT");
      return `<button class="opt" data-n="${n}"><span><b>${esc(q.name)}</b><small>${meta.join(" · ")}</small><small class="hint">${KIND_HINT[a.kind] || ""}</small></span></button>`;
    }).join("")}</div>
    <div class="row2"><button id="c-auto">AUTO</button></div>`;
  box.querySelectorAll("[data-n]").forEach((b) => b.onclick = () => {
    const a = acts[+b.dataset.n];
    if (a.targets[0] === null) return issue({ part: a.part, special: a.special, target: null });
    const label = a.part === "core" ? SPECIALS[a.special].name : u.parts[a.part].name;
    B.target = { part: a.part, special: a.special, side: a.ally ? s : 1 - s, list: a.targets, label };
    renderCmd();
  });
  $("#c-auto").onclick = () => issue(aiCommand(clone(B.state), s, i, 3));
  box.querySelector("[data-n]")?.focus({ preventScroll: true });
}

function issue(cmd) {
  const [s, i] = B.cmdFor;
  const tick = B.state.tick;
  if (!giveCommand(B.state, s, i, cmd)) return;
  if (B.mode === "online") link.send({ t: "cmd", s, i, tick, cmd });
  closeCmd();
}

function nameOf(ref) { return B.state.sides[ref[0]].units[ref[1]].name; }
function describe(e) {
  const src = e.src ? esc(nameOf(e.src)) : "", dst = e.dst ? esc(nameOf(e.dst)) : "";
  switch (e.t) {
    case "attack":
      if (!e.src) return `${esc(e.pname)}! ${dst}'S ${PART_LABEL[e.hitPart]} -${e.dmg}${e.broke ? " · BROKEN!" : ""}`;
      if (!e.hit) return `${src}: ${esc(e.pname)}! ${dst} DODGED!`;
      return `${src}: ${esc(e.pname)}! ${e.crit ? "CRITICAL! " : ""}${dst}'S ${PART_LABEL[e.hitPart]} -${e.dmg}${e.broke ? " · BROKEN!" : ""}${e.guarded ? " (GUARDED)" : ""}`;
    case "down": return `${dst} IS OUT OF ACTION!${e.leader ? " LEADER DOWN!" : ""}`;
    case "repair": return `${src} REPAIRS ${dst} +${e.amount}`;
    case "shield": return `${src} SHIELDS ${dst}!`;
    case "scan": return `${src} SCANS THE FIELD!`;
    case "guard": return `${src} GUARDS ${dst}!`;
    case "core": return `${src} UNLEASHES ${esc(e.pname)}!`;
    case "skip": return `${src} CAN'T ACT: ${esc(e.why).toUpperCase()}`;
    case "status": return `${dst} IS ${esc(e.what)}!`;
    case "field": return `<b>${esc(e.what)}!</b>`;
    case "win": return B.mode === "local" ? `P${e.winner + 1} WINS!` : e.winner === B.me ? "YOU WIN!" : "YOU LOSE...";
    case "timeup": return "TIME UP! JUDGE'S DECISION...";
    default: return "";
  }
}

function onEvents(ev) {
  scene.handle(ev);
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
      saveProfile(profile);
      head.textContent = "DEFEATED"; head.className = "lose";
      sfx.defeat();
      text.innerHTML = `YOUR RUN ENDED ON ROUND ${k + 1}<br>BEST: ROUND ${profile.best}<br>+${bolts} BOLTS · CORES +${xp.gain} XP` + xp.ups.map((u) => `<br><b>${esc(coreById(u.core).name)} LV ${u.to}!</b>${newSpecials(u)}`).join("");
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
  $("#col-grid").querySelectorAll("[data-id]").forEach((b) => b.onclick = () => { COL = b.dataset.id; renderCollection(); });
  const det = $("#col-detail");
  const r = COL && byId(COL);
  if (!r) { det.innerHTML = `<p class="hint">Pick a robot you've seen to look at its parts and buy the ones you're missing.</p>`; return; }
  const full = { head: r.id, rarm: r.id, larm: r.id, legs: r.id };
  det.innerHTML = `${spriteImg(full, 5, { smooth: true })}<div class="plate name">${esc(r.name)}</div>
    <p class="flavor">${esc(r.flavor || "")}</p>
    ${SLOTS.map((s) => {
      const has = P.parts[s].includes(r.id), price = partPrice(r.id);
      return `<div class="buyrow"><span><b>${PART_LABEL[s]}</b> ${esc(r[s].name)}<small>${partLine(r, s)}</small></span>
        ${has ? `<em>OWNED</em>` : `<button data-buy="${s}" ${P.bolts < price ? "disabled" : ""}>BUY ${price}</button>`}</div>`;
    }).join("")}`;
  det.querySelectorAll("[data-buy]").forEach((b) => b.onclick = () => {
    if (buyPart(profile, b.dataset.buy, r.id)) { saveProfile(profile); sfx.unlock2(); renderCollection(); }
  });
}

// ------------------------------------------------------------------ arcade
function startArcade(k) {
  const r = ladderRound(k);
  const title = `${k + 1}/${LADDER_LENGTH} ${r.title.toUpperCase()}`;
  markSeen(profile, r.team); saveProfile(profile);
  showReady({ title, mine: profile.team, foe: r.team, back: "title", field: r.field,
    rule: r.rule,
    onWorkshop: () => openWorkshop({ team: profile.team, pool: profile.parts, levels: true, title: "WORKSHOP", back: "ready",
      hint: "Swap parts, then press DONE to get back to the fight.", onDone: () => { saveProfile(profile); startArcade(k); } }),
    onStart: () => startBattle({ mode: "arcade", teams: [withCoreLevels(profile, clone(profile.team)), r.team], level: r.level, arcade: { k }, title, rule: r.rule, field: r.field }) });
}

// ------------------------------------------------------------------ team ready screen
let RD = null;
function showReady(opts) {
  RD = { ...opts, sel: 0 };
  $("#ready-title").textContent = opts.title + (opts.rule === "all" ? " · KO ALL" : "") + (opts.field && opts.field !== "normal" ? " · " + FIELDS[opts.field].name : "");
  const stands = (team, flip, mine) => team.map((b, i) => `<button class="stand${i === 0 ? " lead" : ""}" ${mine ? `data-i="${i}"` : "disabled"} aria-label="${esc(b.name)}">
      ${spriteImg(b, 2, { flip, smooth: true })}<i></i><span>${i === 0 ? "★" : ""}${esc(b.name)}</span></button>`).join("");
  $("#rd-mine").innerHTML = stands(opts.mine, false, true);
  $("#rd-foe").innerHTML = stands(opts.foe, true, false);
  $("#rd-mine").querySelectorAll("[data-i]").forEach((b) => {
    b.onclick = () => { RD.sel = +b.dataset.i; renderPortrait(); };
    b.onfocus = () => { RD.sel = +b.dataset.i; renderPortrait(); };
  });
  $("#rd-go").onclick = () => opts.onStart();
  $("#rd-ws").onclick = () => opts.onWorkshop();
  $("#rd-ws").classList.toggle("hidden", !opts.onWorkshop);
  $("#ready-back").onclick = () => { renderTitle(); show(opts.back || "title"); };
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
  $("#rd-core").innerHTML = `<i class="dot" style="background:${c.color}"></i>${esc(c.name)} LV ${lv}`;
  $("#rd-stats").innerHTML = PARTS.map((p, i) => `<div><span>${PART_LABEL[p]}</span><b>${esc(parts[i].name)}</b></div>`).join("") +
    `<div><span>SPEED</span><b>${parts[3].speed}</b></div>` +
    `<div><span>SPECIALS</span><b>${(CORE_TREE[c.special] || []).filter((_, i) => lv >= TIER_LV[i]).map((x) => esc(SPECIALS[x].name)).join(", ")}</b></div>` +
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
    ? t.map((b) => ({ head: b.head, rarm: b.rarm, larm: b.larm, legs: b.legs, core: b.core, name: String(b.name || byId(b.head).name).toUpperCase().slice(0, 10) }))
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
    const c = m.cmd && ["head", "rarm", "larm", "core", "wait"].includes(m.cmd.part) ? { part: m.cmd.part, target: [0, 1, 2].includes(m.cmd.target) ? m.cmd.target : null } : null;
    if (c && c.part === "core" && Object.hasOwn(SPECIALS, m.cmd.special)) c.special = m.cmd.special;
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
};
$("#on-join").onclick = () => {
  const code = $("#on-input").value.toUpperCase().trim();
  if (code.length !== 5) { $("#on-status").textContent = "CODES ARE 5 LETTERS."; return; }
  leaveOnline();
  if (!window.Peer) { $("#on-status").textContent = "ONLINE PLAY COULDN'T LOAD. CHECK YOUR INTERNET."; return; }
  link = new Link(onMessage, onStatus);
  link.join(code);
  $("#on-host").disabled = true; $("#on-join").disabled = true;
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
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.ctrlKey || e.metaKey || e.altKey) return;
  const cmd = $("#b-cmd");
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
    scope.querySelector("#c-back, [data-back], #ready-back")?.click();
  }
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
