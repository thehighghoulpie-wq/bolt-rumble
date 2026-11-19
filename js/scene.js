// Canvas battle scene at GBA resolution (240x160), drawn with pixel sprites and effects.
import { drawText, textWidth } from "./pixel.js?v=19";
import { drawRobot, pieceOf, weaponOf, THRUST, RW, RH, OX, OY } from "./rig.js?v=19";
import { PARTS } from "./engine.js?v=19";
import { sfx } from "./sfx.js?v=19";

export const W = 240, H = 160;
const LANE_Y = [113, 80, 147];          // feet y for unit idx 0 (leader, middle), 1 (back), 2 (front)
const HOME = [24, 216], ACTIVE = [94, 146];
const STRIDE = { biped: 20, wheels: 26, tank: 14, crawler: 15, flyer: 22, swimmer: 22 };
const SWING = { biped: 1, wheels: 0.8, crawler: 0.5, tank: 0.3, flyer: 0.35, swimmer: 0.4 };
const ease = (q) => (q <= 0 ? 0 : q >= 1 ? 1 : q * q * (3 - 2 * q));
const rnd = (a, b) => a + Math.random() * (b - a);

// Pixel hex-tile arena: computed per pixel so every edge is crisp.
export function hexField(w, h, opts = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const HW = 18, HH = 16; // cell spacing
  const centers = [];
  for (let row = -1; row * HH * 0.75 < h + HH; row++) for (let col = -1; col * HW < w + HW; col++) centers.push([col * HW + (row & 1 ? HW / 2 : 0), row * HH * 0.75, (row * 7 + col * 3) & 3]);
  const base = opts.palette || [[88, 168, 72], [96, 176, 80], [80, 156, 66], [92, 172, 76]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let d1 = 1e9, d2 = 1e9, best = null;
    for (const cc of centers) {
      const dx = x - cc[0], dy = (y - cc[1]) * 1.12;
      if (Math.abs(dx) > 24 || Math.abs(dy) > 24) continue;
      const d = Math.max(Math.abs(dx) * 0.866 + Math.abs(dy) * 0.5, Math.abs(dy));
      if (d < d1) { d2 = d1; d1 = d; best = cc; } else if (d < d2) d2 = d;
    }
    let col = base[best ? best[2] : 0].slice();
    const edge = d2 - d1;
    const shade = 0.82 + 0.28 * (y / h); // darker toward the top
    if (edge < 1.2) col = [40, 92, 44];
    else if (edge < 2.4 && best && y < best[1]) col = col.map((v) => v + 26); // top-left bevel highlight
    else if (edge < 2.4) col = col.map((v) => v - 18);
    const i = (y * w + x) * 4;
    img.data[i] = Math.round((col[0] * shade) / 8) * 8;
    img.data[i + 1] = Math.round((col[1] * shade) / 8) * 8;
    img.data[i + 2] = Math.round((col[2] * shade) / 8) * 8;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// round pixel stand that robots wait on
function drawStand(g, cx, cy) {
  const rx = 15, ry = 4;
  for (let y = -ry; y <= ry + 6; y++) for (let x = -rx; x <= rx; x++) {
    const inTop = (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;
    const inSide = y > 0 && Math.abs(x) <= rx - 1 && y <= ry + 6 && (x * x) / (rx * rx) + ((y - 6) * (y - 6)) / (ry * ry) <= 1;
    if (!inTop && !inSide) continue;
    let col;
    if (inTop) {
      const rim = (x * x) / ((rx - 1.5) ** 2) + (y * y) / ((ry - 1) ** 2) > 1;
      col = rim ? "#2c6f7a" : y < 0 ? "#a8e0e0" : "#80c8cc";
    } else col = Math.abs(x) > rx - 3 ? "#1c4a54" : "#3c8c96";
    g.fillStyle = col;
    g.fillRect(cx + x, cy + y, 1, 1);
  }
}

const FIELD_PALETTE = {
  storm: [[64, 82, 108], [70, 90, 116], [58, 76, 100], [66, 86, 112]],
  ice: [[150, 200, 228], [160, 210, 236], [140, 190, 220], [156, 206, 232]],
  swamp: [[72, 98, 50], [62, 86, 42], [80, 106, 54], [68, 92, 46]],
  fog: [[118, 138, 126], [126, 146, 134], [112, 130, 120], [122, 142, 130]],
  junkyard: [[124, 104, 82], [132, 112, 88], [116, 96, 76], [128, 108, 86]],
  lab: [[82, 74, 142], [90, 82, 152], [74, 66, 130], [86, 78, 148]],
};

function makeBackground(field = "normal") {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.drawImage(hexField(W, H, { palette: FIELD_PALETTE[field] }), 0, 0);
  // active zone in the middle: lighter band and a dashed yellow line
  g.fillStyle = "rgba(255,240,140,.16)"; g.fillRect(100, 0, 40, H);
  g.fillStyle = "#f8d838";
  for (let y = 2; y < H; y += 6) g.fillRect(119, y, 2, 3);
  // stands on both command lines
  for (const lane of LANE_Y) { drawStand(g, HOME[0], lane + 1); drawStand(g, HOME[1], lane + 1); }
  // top banner strip
  g.fillStyle = "rgba(16,40,20,.55)"; g.fillRect(0, 0, W, 9);
  drawText(g, "COMMAND", 4, 2, "#a8e0e0", "#0c2010");
  drawText(g, "ACTION", 108, 2, "#f8d838", "#0c2010");
  drawText(g, "COMMAND", W - 4 - textWidth("COMMAND"), 2, "#a8e0e0", "#0c2010");
  return c;
}

export class Scene {
  constructor(canvas, view) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    this.ctx.imageSmoothingEnabled = false;
    this.bg = makeBackground();
    this.view = view;          // { me: side drawn on the left }
    this.fx = [];
    this.vis = {};
    this.t = 0;
    this.shakeT = 0;
    this.flashT = 0;
    this.freeze = 0;   // hit-stop frames
    this.slowmo = 0;   // slow-motion frames (read by the game loop too)
    this.cursor = null;
    this.actor = null;
    this.state = null;
    this.introT = 0;   // robots drop onto their stands, then RUMBLE! lands
  }

  setState(s) { this.state = s; if (s && s.field !== this.field) { this.field = s.field; this.bg = makeBackground(s.field); } }
  col(side) { return side === this.view.me ? 0 : 1; }
  homeX(side) { return HOME[this.col(side)]; }
  activeX(side) { return ACTIVE[this.col(side)]; }
  laneY(u) { return LANE_Y[u.idx]; }
  v(u) {
    const k = u.side + "-" + u.idx;
    if (!this.vis[k]) this.vis[k] = { x: this.homeX(u.side), lunge: 0, flash: 0, shake: 0, walk: 0, smoke: 0, deadT: 0 };
    return this.vis[k];
  }
  baseX(u) { return this.homeX(u.side) + (this.activeX(u.side) - this.homeX(u.side)) * u.pos; }
  unitXY(u) {
    const v = this.v(u);
    return [this.baseX(u) + v.lunge * (this.col(u.side) === 0 ? 1 : -1) + (v.shake ? rnd(-1, 1) : 0), this.laneY(u) + (v.dashY || 0)];
  }
  // where a weapon fires from: the tip of the posed arm (or the head's eye) from the last drawn frame
  muzzle(u, part) {
    const [x, y] = this.unitXY(u);
    const v = this.v(u), a = v.anc && v.anc[part === "head" ? "head" : part === "larm" ? "larm" : "rarm"];
    const dir = v.fr === false ? -1 : this.col(u.side) === 0 || v.fr ? 1 : -1;
    if (a) return [x + dir * (a[0] - OX), y + (a[1] - OY)];
    return part === "head" ? [x + dir * 6, y - 44] : [x + dir * 16, y - 26];
  }
  center(u) { const [x, y] = this.unitXY(u); return [x, y - 24]; }
  // angle from a robot's shoulder to a target, in the robot's own facing frame (+ is downward)
  aimAt(u, t) {
    if (!t) return 0;
    const [x, y] = this.unitXY(u), [tx, ty] = this.center(t);
    return Math.max(-0.75, Math.min(0.75, Math.atan2(ty - (y - 30), Math.max(12, Math.abs(tx - x)))));
  }
  unitAtPoint(px, py) {
    if (!this.state) return null;
    for (const s of this.state.sides) for (const u of s.units) {
      if (u.down) continue;
      const [x, y] = this.unitXY(u);
      if (px >= x - 15 && px <= x + 15 && py >= y - 52 && py <= y + 2) return [u.side, u.idx];
    }
    return null;
  }

  // ------------------------------------------------------------ events -> effects
  handle(events) {
    const S = this.state;
    const U = (ref) => S.sides[ref[0]].units[ref[1]];
    let delay = 0;
    for (const e of events) {
      if (e.t === "attack" && !e.src) { this.impact(U(e.dst), e); continue; }
      if (e.t === "field") {
        this.flashT = 6; this.shakeT = Math.max(this.shakeT, 8);
        this.fx.push({ kind: "banner", str: e.what, t: 0, dur: 60 });
        if (this.field === "lab") sfx.riser(); else sfx.explode();
        continue;
      }
      if (e.t === "attack") {
        const src = U(e.src), dst = U(e.dst);
        this.v(src).act = { kind: e.kind, part: e.part, t: 0, aim: this.aimAt(src, dst) };
        this.v(src).faceT = 34;
        const impact = () => this.impact(dst, e);
        if (e.aimed || e.part && e.kind === "laser" && e.aimed) this.fx.push({ kind: "scope", u: dst, t: 0, dur: 16 });
        if (delay === 0) ({ strike: () => sfx.strike(), beam: () => sfx.beam(), burst: () => sfx.beam(), laser: () => sfx.laser(), missile: () => sfx.missile() }[e.kind] || (() => sfx.shoot()))();
        if (e.kind === "legcrash") { this.shakeT = Math.max(this.shakeT, 14); setTimeout(impact, 120 + delay * 10); }
        else if (e.kind === "strike") this.lunge(src, dst, impact, e);
        else if (e.kind === "beam" || e.kind === "burst") this.beam(src, dst, e.part, e.kind === "burst" ? 22 : 14, impact);
        else if (e.kind === "laser") this.beam(src, dst, "head", 10, impact, true);
        else if (e.kind === "missile") this.missile(src, dst, delay, impact);
        else this.bullets(src, dst, e.part, impact);
        delay += 6;
      } else if (e.t === "repair") {
        const d = U(e.dst);
        if (e.src) { this.v(U(e.src)).act = { kind: "support", part: e.part, t: 0 }; this.v(U(e.src)).faceT = 28; }
        for (let i = 0; i < 10; i++) this.fx.push({ kind: "plus", x: this.center(d)[0] + rnd(-10, 10), y: this.center(d)[1] + rnd(-6, 10), vy: -rnd(0.3, 0.8), t: -i * 2, dur: 34 });
        this.text(d, "+" + e.amount, "#5cff9a", 6);
        sfx.chime();
      } else if (e.t === "shield") {
        this.fx.push({ kind: "ring", u: U(e.dst), col: "#7fd0ff", t: 0, dur: 30 });
        sfx.shield();
      } else if (e.t === "scan") {
        this.v(U(e.src)).act = { kind: "support", part: "head", t: 0 }; this.v(U(e.src)).faceT = 28;
        this.fx.push({ kind: "scan", u: U(e.src), t: 0, dur: 40 });
        sfx.scan();
      } else if (e.t === "guard") {
        this.v(U(e.src)).act = { kind: "guard", part: "larm", t: 0 }; this.v(U(e.src)).faceT = 28;
        this.fx.push({ kind: "ring", u: U(e.dst), col: "#ffd23f", t: 0, dur: 24 });
        sfx.land();
      } else if (e.t === "core") {
        this.v(U(e.src)).act = { kind: "core", part: "core", t: 0 }; this.v(U(e.src)).faceT = 34;
        this.flashT = 10;
        sfx.riser();
        const s = U(e.src);
        for (let i = 0; i < 24; i++) this.fx.push({ kind: "spark", x: this.center(s)[0], y: this.center(s)[1], vx: rnd(-1.6, 1.6), vy: rnd(-1.8, 0.4), col: s.core.color || "#ffd23f", t: 0, dur: 28 });
      } else if (e.t === "down") {
        const d = U(e.dst);
        this.slowmo = e.leader ? 90 : 50;
        setTimeout(() => { this.explode(d); this.fallApart(d); sfx.explode(); }, 260);
      } else if (e.t === "transform") {
        const u = U(e.src);
        this.v(u).act = { kind: "core", part: "core", t: 0 };
        this.flashT = 8; this.shakeT = Math.max(this.shakeT, 8);
        this.fx.push({ kind: "ring", u, col: "#f8d838", t: 0, dur: 30 });
        this.fx.push({ kind: "ring", u, col: "#ffffff", t: -6, dur: 30 });
        for (let i = 0; i < 30; i++) this.fx.push({ kind: "spark", x: this.center(u)[0], y: this.center(u)[1], vx: rnd(-2, 2), vy: rnd(-2.4, 0.2), col: i % 2 ? "#f8d838" : "#ffffff", t: 0, dur: 30 });
        this.text(u, "TRANSFORM!", "#f8d838", 0, true);
        sfx.riser();
      } else if (e.t === "status") {
        const d = U(e.dst);
        this.fx.push({ kind: "ring", u: d, col: "#9ff0ff", t: 0, dur: 28 });
        this.text(d, e.what, "#9ff0ff", 4, true);
        sfx.shield();
      } else if (e.t === "skip") {
        const s = U(e.src);
        this.text(s, "...", "#aab", 0);
      }
    }
  }

  text(u, str, col, delay = 0, big = false) {
    const [x, y] = this.center(u);
    this.fx.push({ kind: "text", x, y: y - 20, str, col, t: -delay, dur: 46, big });
  }
  impact(dst, e) {
    const v = this.v(dst);
    const [cx, cy] = this.center(dst);
    if (e.hit) v.hit = { part: e.hitPart || "torso", t: 0 };
    if (e.hit && e.broke && (e.hitPart === "rarm" || e.hitPart === "larm")) this.dropPart(dst, e.hitPart);
    if (!e.hit) { this.text(dst, "MISS", "#c8c8d8", 0, true); v.dodge = { t: 0 }; sfx.miss(); return; }
    if (e.crit) sfx.crit(); else sfx.hit(e.dmg >= 20 || e.kind === "strike");
    if (e.broke) setTimeout(() => sfx.break(), 90);
    v.flash = 6; v.shake = 6;
    this.freeze = Math.max(this.freeze, e.crit ? 8 : e.kind === "strike" || e.kind === "burst" ? 5 : 3);
    if (e.crit || e.kind === "burst" || e.dmg >= 20) { this.ripple(cx, cy, e.crit ? "#ff3c3c" : "#ffffff"); this.punch(); }
    if (e.anti) this.text(dst, e.anti, "#9ff0ff", 10);
    if (e.splash) { this.text(dst, "RECKLESS", "#ffb03c", 12); for (let i = 0; i < 12; i++) this.fx.push({ kind: "spark", x: cx + rnd(-10, 10), y: cy + rnd(-12, 12), vx: rnd(-1, 1), vy: rnd(-1, 1), col: "#ffb03c", t: -4, dur: 18 }); }
    if (e.aimed) this.text(dst, "SNIPE", "#ff8a7a", 14);
    if (e.crit) { this.shakeT = 12; this.text(dst, "CRIT " + e.dmg, "#ffd23f", 0, true); }
    else this.text(dst, String(e.dmg), "#ff6b6b", 0, true);
    if (e.guarded) this.fx.push({ kind: "ring", u: dst, col: "#ffd23f", t: 0, dur: 16 });
    for (let i = 0; i < 10; i++) this.fx.push({ kind: "spark", x: cx + rnd(-4, 4), y: cy + rnd(-6, 6), vx: rnd(-1.4, 1.4), vy: rnd(-1.6, 0.6), col: i % 2 ? "#fff3a0" : "#ff9a3c", t: 0, dur: 16 });
    if (e.broke) {
      v.smoke = 1;
      this.text(dst, "BREAK!", "#ff9a3c", 10);
      for (let i = 0; i < 6; i++) this.fx.push({ kind: "debris", x: cx, y: cy, vx: rnd(-1.5, 1.5), vy: rnd(-2.2, -0.8), t: 0, dur: 40 });
    }
  }
  bullets(src, dst, part, onHit) {
    const [mx, my] = this.muzzle(src, part);
    for (let i = 0; i < 3; i++) {
      this.fx.push({ kind: "flash", x: mx, y: my, t: -i * 4, dur: 3 });
      this.fx.push({ kind: "bullet", x0: mx, y0: my, dst, t: -i * 4, dur: 12, cb: i === 2 ? onHit : null });
      if (i < 2) this.fx.push({ kind: "spark", x: this.center(dst)[0], y: this.center(dst)[1], vx: 0, vy: 0, col: "#fff3a0", t: -(i * 4 + 12), dur: 3 });
    }
  }
  beam(src, dst, part, dur, onHit, thin = false) {
    const [mx, my] = this.muzzle(src, part);
    this.fx.push({ kind: "beam", x0: mx, y0: my, dst, col: src.colors.eye, t: 0, dur, thin, cb: onHit, cbAt: 6 });
  }
  missile(src, dst, delay, onHit) {
    const [mx, my] = this.muzzle(src, "head");
    this.fx.push({ kind: "missile", x0: mx, y0: my, dst, t: -delay, dur: 24, cb: onHit });
  }
  // melee: wind up, dash over to the target (even into another lane), swing, hop back
  lunge(src, dst, onHit, e) {
    const v = this.v(src);
    const part = e && e.part === "larm" ? "larm" : "rarm";
    const dist = Math.max(0, Math.abs(this.baseX(dst) - this.baseX(src)) - 26);
    v.dash = { t: 0, dist, dy: this.laneY(dst) - this.laneY(src), style: weaponOf(src.build[part], part), arm: part === "larm" ? "l" : "r", aim: 0.15 };
    v.faceT = 36;
    this.fx.push({ kind: "lunge", v, t: 0, dur: 31, cb: onHit, cbAt: 13 });
    this.fx.push({ kind: "slash", u: dst, dir: this.col(src.side) === 0 ? 1 : -1, t: -13, dur: 6 });
  }
  ripple(x, y, col) { this.fx.push({ kind: "ripple", x, y, col, t: 0, dur: 22 }); }
  punch() {
    const c = this.cv;
    c.classList.remove("punch"); void c.offsetWidth; c.classList.add("punch");
    setTimeout(() => c.classList.remove("punch"), 220);
  }
  // a broken arm or legs drops off and clatters on the floor
  piece(u, part, vx, vy, dur) {
    const v = this.v(u);
    const pc = pieceOf(u.build, part, v.lastP || {}, { broken: { head: true, rarm: true, larm: true, legs: true } });
    if (!pc) return;
    const [x, y] = this.unitXY(u);
    const fr = v.fr !== false;
    const px = fr ? x + pc.x : x - pc.x - pc.c.width;
    this.fx.push({ kind: "piece", c: pc.c, x: px, y: y + pc.y, vx, vy, floor: y + 2 - pc.c.height, flip: !fr, t: 0, dur });
  }
  dropPart(u, part) {
    const v = this.v(u);
    if (v.lost && v.lost[part]) return;
    this.piece(u, part, (this.col(u.side) === 0 ? -1 : 1) * rnd(0.6, 1.4), rnd(-2.4, -1.4), 160);
    (v.lost || (v.lost = {}))[part] = true;
  }
  // knocked out: head and arms fly off, the rest slumps
  fallApart(u) {
    const v = this.v(u);
    if (v.apart) return;
    const back = this.col(u.side) === 0 ? -1 : 1;
    this.piece(u, "head", back * rnd(0.3, 0.9), rnd(-3.8, -3), 600);
    for (const part of ["rarm", "larm"]) if (!(v.lost && v.lost[part])) this.piece(u, part, (part === "rarm" ? -back : back) * rnd(0.8, 1.8), rnd(-2.8, -1.8), 600);
    v.apart = true;
  }

  explode(u) {
    const [cx, cy] = this.center(u);
    this.shakeT = 16; this.flashT = 4; this.freeze = 10;
    this.ripple(cx, cy, "#ff3c3c"); this.ripple(cx, cy, "#ffffff"); this.punch();
    for (let i = 0; i < 40; i++) this.fx.push({ kind: "spark", x: cx + rnd(-6, 6), y: cy + rnd(-8, 8), vx: rnd(-2.5, 2.5), vy: rnd(-3, 1), col: ["#fff3a0", "#ffb03c", "#ff5c3c", "#ffffff"][i % 4], t: 0, dur: rnd(24, 44) });
    for (let i = 0; i < 8; i++) this.fx.push({ kind: "puff", x: cx + rnd(-8, 8), y: cy + rnd(-8, 4), r: rnd(3, 6), t: -i * 2, dur: 40 });
    this.text(u, "K.O.", "#ffffff", 8, true);
  }

  // ------------------------------------------------------------ drawing
  draw() {
    const g = this.ctx, S = this.state;
    this.t++;
    g.save();
    if (this.shakeT > 0) { this.shakeT--; g.translate(Math.round(rnd(-2, 2)), Math.round(rnd(-2, 2))); }
    g.drawImage(this.bg, 0, 0);
    if (!S) { g.restore(); return; }
    this.adv = !(this.freeze > 0) && !(this.slowmo > 0 && this.t % 2);
    const yOf = (u) => this.laneY(u) + (this.v(u).dashY || 0);
    const units = S.sides.flatMap((s) => s.units).sort((a, b) => yOf(a) - yOf(b));
    // shadows (smaller while hopping or hovering)
    for (const u of units) {
      const [x, y] = this.unitXY(u), lp = this.v(u).lastP;
      const air = Math.min(4, Math.max(0, -((lp && lp.y) || 0) / 2) + (u.body === "flyer" ? 2 : u.body === "swimmer" ? 1 : 0));
      g.fillStyle = "rgba(0,0,0,.35)";
      g.fillRect(Math.round(x - 11 + air), Math.round(y), Math.round(22 - air * 2), 2);
      g.fillRect(Math.round(x - 8 + air), Math.round(y) + 2, Math.round(16 - air * 2), 1);
    }
    for (const u of units) this.drawUnit(g, u);
    this.drawWeather(g);
    this.drawFx(g);
    this.drawIntro(g);
    if (this.cursor) this.drawArrow(g, this.cursor, "#ffd23f");
    if (this.actor) this.drawArrow(g, this.actor, "#ffffff");
    g.restore();
    if (this.flashT > 0) { g.fillStyle = `rgba(255,255,255,${this.flashT / 14})`; g.fillRect(0, 0, W, H); this.flashT--; }
  }

  // minecraft-kit style build-in: each robot drops onto its stand with a bounce and a dust puff
  dropOffset(u, x, y) {
    const order = this.col(u.side) * 3 + [1, 0, 2][u.idx];
    const start = 6 + order * 7, dur = 16, t = this.introT - start;
    const v = this.v(u);
    if (t >= dur) {
      if (!v.landed) {
        v.landed = true;
        sfx.land();
        this.shakeT = Math.max(this.shakeT, 3);
        v.landT = 8;
        for (let i = 0; i < 8; i++) this.fx.push({ kind: "puff", x: x + rnd(-10, 10), y: y - rnd(0, 3), r: rnd(1, 3), t: 0, dur: 24, rise: true });
      }
      return 0;
    }
    if (t < 0) return -200;
    let p = t / dur; // ease-out bounce
    const b = p < 1 / 2.75 ? 7.5625 * p * p : p < 2 / 2.75 ? 7.5625 * (p -= 1.5 / 2.75) * p + 0.75 : p < 2.5 / 2.75 ? 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375 : 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
    return Math.round(-70 * (1 - b));
  }

  drawIntro(g) {
    this.introT++;
    const at = 6 + 6 * 7 + 18, t = this.introT - at;
    if (t === 0) { sfx.go(); this.shakeT = Math.max(this.shakeT, 6); }
    if (t < 0 || t > 50) return;
    const sc = t < 6 ? 6 - t * 0.5 : 3; // slams in with overshoot, then holds
    const word = "RUMBLE!";
    const w = textWidth(word, Math.round(sc));
    if (t > 40 && t % 4 < 2) return; // blink out
    drawText(g, word, Math.round(120 - w / 2), Math.round(70 - sc * 2.5), "#f8d838", "#6a2a00", Math.round(sc));
  }

  // ------------------------------------------------------------ animation
  // Builds this frame's pose for the jointed robot (rig.js), in two layers like cut-out animation:
  // T = where the limbs want to be (eased toward, so moves flow into each other),
  // O = instant offsets on top (recoil kicks, hit jolts, hops, squash).
  pose(u, v, fr, broken) {
    const S = this.state;
    const run = this.adv !== false && !(u.st && u.st.stop > 0);
    if (run) v.clock = (v.clock || 0) + 1;
    const t = v.clock || 0;
    const m = u.down ? 0 : Math.min(1, (v.mv || 0) / 0.2);
    const ph = (v.dist || 0) / (STRIDE[u.body] || 20);
    const T = { lean: 0.06 * m, headA: 0, drop: 0, rs: 1.75, re: -0.6, ls: 1.95, le: -0.5, kneel: 0, claw: 0 };
    const O = { x: 0, y: 0, sx: 1, sy: 1, lean: 0, headA: 0, drop: 0, rs: 0, re: 0, ls: 0, le: 0, rx: 0, ry: 0, lx: 0, ly: 0, spin: 0 };
    const glow = {}, snap = {};
    const back = (this.col(u.side) === 0 ? -1 : 1) * (fr ? 1 : -1); // "toward my own side", in my facing frame

    // idle: breathing, arms sway, head follows a beat later
    O.drop += (0.5 + 0.5 * Math.sin(t * 0.075)) * (1 - m);
    O.rs += 0.07 * Math.sin(t * 0.075 + 1);
    O.ls += 0.07 * Math.sin(t * 0.075 + 2);
    O.headA += 0.05 * Math.sin(t * 0.075 - 0.9) + 0.04 * Math.sin(ph * 4 * Math.PI) * m;
    // walking: arms swing against the legs
    const sw = Math.sin(ph * 2 * Math.PI) * m * (SWING[u.body] ?? 1);
    O.rs += 0.5 * sw; O.ls -= 0.5 * sw; T.re -= 0.3 * m; T.le -= 0.3 * m;

    // charging toward the action line: ready the chosen weapon
    if (u.phase === "charge" && u.cmd && !u.down) {
      const part = u.cmd.part;
      const tgt = typeof u.cmd.target === "number" ? S.sides[1 - u.side].units[u.cmd.target] : null;
      if (part === "rarm" || part === "larm") {
        const A = part === "rarm" ? "r" : "l", kind = u.parts[part].kind;
        if (kind === "shoot" || kind === "beam") { // carried low, raised to aim near the line
          const up = u.pos > 0.78;
          T[A + "s"] = up ? this.aimAt(u, tgt) : 1.0; T[A + "e"] = up ? 0 : -0.75;
        }
        else if (kind === "strike") { T[A + "s"] = -0.9; T[A + "e"] = -1.5; }
        else { T[A + "s"] = 0.25; T[A + "e"] = -1.75; }
        O[A + "s"] = 0;
        T.lean += 0.06;
      } else if (part === "head") { T.headA = this.aimAt(u, tgt) * 0.5; T.lean += 0.04; }
      else { T.rs = 1.0; T.re = -2.1; T.ls = 1.1; T.le = -2.1; }
    }

    // acting
    const a = v.act;
    if (a) {
      if (run) a.t++;
      const k = a.t, A = a.part === "larm" ? "l" : "r";
      if (a.kind === "shoot") {
        if (k < 18) { T[A + "s"] = a.aim; T[A + "e"] = 0; O[A + "s"] = 0; if (k < 12 && k % 4 < 2) { O[A + "x"] -= 2; O[A + "s"] -= 0.2; O.lean -= 0.04; } }
      } else if (a.kind === "beam" || a.kind === "burst") {
        const d = a.kind === "burst" ? 22 : 14;
        if (k < d + 6) { T[A + "s"] = a.aim; T[A + "e"] = 0; O[A + "s"] = 0; if (k < d) { O.x += back * (1 + (k % 2)); O.lean -= 0.08; glow[a.part === "larm" ? "larm" : "rarm"] = 1; } }
      } else if (a.kind === "laser") {
        if (k < 16) { T.headA = a.aim * 0.6 - 0.05; O.lean -= 0.05; glow.head = 1; }
      } else if (a.kind === "missile") {
        if (k < 6) O.drop += 2; else if (k < 14) { O.y -= 2; T.headA = -0.3; }
      } else if (a.kind === "support") {
        if (k < 26) { T.rs = -1.25; T.re = -0.4; T.ls = -1.1; T.le = -0.4; O.y -= Math.min(2, k / 3); glow.head = 1; }
      } else if (a.kind === "guard") {
        if (k < 26) { T.ls = 0.2; T.le = -1.8; O.drop += 1.5; }
      } else if (a.kind === "core") {
        if (k < 6) { O.drop += 3; T.rs = T.ls = 2.4; T.re = T.le = -0.3; }
        else if (k < 28) { T.rs = -2.2; T.ls = -2.5; T.re = T.le = -0.2; O.y -= 5 * Math.sin(Math.PI * Math.min(1, (k - 6) / 14)); }
        else if (k < 32) { O.sy = 0.88; O.sx = 1.1; }
      } else if (a.kind === "legcrash") {
        if (k < 10) { O.y -= 7 * Math.sin((Math.PI * k) / 10); T.rs = T.ls = -1.5; } else if (k < 15) { O.sy = 0.82; O.sx = 1.14; }
      }
      if (k > 40) v.act = null;
    }

    // melee dash: wind up, rush over, swing (snapped, no easing), hop back
    const d = v.dash;
    v.lunge = 0; v.dashY = 0;
    if (d) {
      const k = d.t, A = d.arm, th = THRUST[d.style];
      let out = 0;
      if (k < 4) { T[A + "s"] = -2.3; T[A + "e"] = -0.7; T.lean = -0.15; O.drop += 1.5; }
      else if (k < 13) { out = ease((k - 4) / 9); T[A + "s"] = th ? -0.2 : -2.3; T[A + "e"] = th ? -1.7 : -0.6; T.lean = 0.3; }
      else if (k < 20) {
        out = 1; snap[A + "s"] = snap[A + "e"] = true;
        if (th) { T[A + "s"] = d.aim; T[A + "e"] = 0; O[A + "x"] += k < 16 ? 3 : 1; T.claw = k < 15 ? 1 : 0; }
        else { T[A + "s"] = k < 14 ? -0.8 : 0.75; T[A + "e"] = 0; }
        T.lean = 0.35;
      } else { const q = Math.min(1, (k - 20) / 11); out = 1 - ease(q); O.y -= 5 * Math.sin(Math.PI * q); }
      O[A + "s"] = 0;
      v.lunge = d.dist * out; v.dashY = d.dy * out;
      O.spin = k;
    }

    // getting hit: knocked back, the hit part jolts, wobble settles
    if (v.hit) {
      if (run) v.hit.t++;
      const k = v.hit.t, f = k < 3 ? 1 : Math.max(0, 1 - (k - 3) / 11), w = f * (1 + 0.3 * Math.sin(k * 1.3));
      O.x += back * 3 * w; O.lean += back * 0.3 * w; O.headA += back * (v.hit.part === "head" ? 0.55 : 0.25) * w;
      O.rs -= 0.5 * w; O.ls -= 0.4 * w;
      if (v.hit.part === "rarm") O.rs -= 0.7 * w;
      if (v.hit.part === "larm") O.ls -= 0.7 * w;
      if (v.hit.part === "legs") O.drop += 2 * w;
      if (k > 16) v.hit = null;
    }
    // dodged: a quick hop back
    if (v.dodge) {
      if (run) v.dodge.t++;
      const q = v.dodge.t / 14;
      if (q >= 1) v.dodge = null;
      else { const s = Math.sin(Math.PI * q); O.x += back * 6 * s; O.y -= 4 * s; O.lean += back * 0.15 * s; }
    }
    // victory: hop, squash on landing, arms up
    if (S.winner === u.side && !u.down) {
      const q = (t % 40) / 40;
      if (q < 0.45) O.y -= 6 * Math.sin((Math.PI * q) / 0.45);
      else if (q < 0.55) { O.sy = 0.9; O.sx = 1.08; }
      T.rs = -2.3 + 0.3 * Math.sin(t * 0.3); T.re = -0.3; T.ls = -2.0; T.le = -0.4; T.headA = -0.25;
    }
    // knocked out: stagger, then sink to the knees
    if (u.down) {
      const k = v.deadT || 0;
      if (k < 16) { O.lean += back * 0.3; O.headA -= 0.4; O.rs -= 1; O.ls -= 1; O.x += back * Math.sin(k * 0.8); T.kneel = 0.3; }
      else { T.kneel = 1; T.lean = 0.55; T.headA = 0.5; }
    }
    // broken parts hang limp; broken legs drop to one knee
    if (broken.rarm) { T.rs = 1.55; T.re = 0.1; O.rs = 0.04 * Math.sin(t * 0.1); }
    if (broken.larm) { T.ls = 1.6; T.le = 0.1; O.ls = 0.04 * Math.sin(t * 0.1 + 1); }
    if (broken.legs && !u.down) T.kneel = 0.5;
    if (v.lost) for (const p of ["rarm", "larm"]) if (v.lost[p] && u.parts[p].hp > 0) v.lost[p] = false; // repaired
    // landing from the intro drop
    if (v.landT > 0) { const q = v.landT / 8; O.sy *= 1 - 0.16 * q; O.sx *= 1 + 0.12 * q; if (this.adv) v.landT--; }

    const cur = v.cur || (v.cur = { ...T });
    for (const key in T) cur[key] = snap[key] ? T[key] : cur[key] + (T[key] - cur[key]) * (run ? 0.28 : 0);
    const hide = { head: !!v.apart, rarm: !!(v.apart || (v.lost && v.lost.rarm)), larm: !!(v.apart || (v.lost && v.lost.larm)) };
    return {
      t, walk: ph, move: m, x: O.x, y: O.y, sx: O.sx, sy: O.sy,
      drop: cur.drop + O.drop, lean: cur.lean + O.lean, headA: cur.headA + O.headA,
      rs: cur.rs + O.rs, re: cur.re + O.re, ls: cur.ls + O.ls, le: cur.le + O.le,
      rx: O.rx, ry: O.ry, lx: O.lx, ly: O.ly, kneel: cur.kneel, claw: cur.claw, spin: O.spin, glow, hide,
    };
  }

  drawUnit(g, u) {
    const v = this.v(u);
    const left = this.col(u.side) === 0;
    if (v.faceT > 0 && this.adv !== false) v.faceT--;
    // face the enemy while charging or finishing a move, face home while walking back
    const fr = left ? u.phase !== "cool" || u.down || v.faceT > 0 : u.phase === "cool" && !u.down && !(v.faceT > 0);
    const base = this.baseX(u);
    if (v.bx === undefined) v.bx = base;
    const dxw = base - v.bx;
    v.bx = base;
    v.dist = (v.dist || 0) + dxw * (fr ? 1 : -1); // backing off runs the walk cycle in reverse
    v.mv = (v.mv || 0) * 0.8 + Math.abs(dxw) * 0.2;
    const [x0, y0] = this.unitXY(u);
    const x = Math.round(x0), y = Math.round(y0);
    const broken = { head: u.parts.head.hp <= 0, rarm: u.parts.rarm.hp <= 0, larm: u.parts.larm.hp <= 0, legs: u.parts.legs.hp <= 0 };
    if (u.down) { broken.head = broken.rarm = broken.larm = broken.legs = true; if (this.adv !== false) v.deadT++; }
    const hitFlash = v.hit && v.hit.t < 8 && v.hit.t % 2 === 0 ? v.hit.part : null;
    const flashPart = hitFlash || (v.flash > 0 && v.flash % 2 === 0 ? "all" : null);
    if (v.flash > 0) v.flash--;
    if (v.shake > 0) v.shake--;
    const P = this.pose(u, v, fr, broken);
    if (!v.cv) { v.cv = document.createElement("canvas"); v.cv.width = RW; v.cv.height = RH; }
    const res = drawRobot(u.build, P, { broken, flashPart, core: u.core && u.core.color, canvas: v.cv });
    v.anc = res.anchors; v.fr = fr; v.lastP = P;
    if (v.top0 === undefined) v.top0 = res.anchors.top[1] - OY;
    const top = y - OY + this.dropOffset(u, x, y);
    g.save();
    if (u.down) g.globalAlpha = 0.85;
    if (fr) g.drawImage(v.cv, x - OX, top);
    else { g.translate(x + OX, top); g.scale(-1, 1); g.drawImage(v.cv, 0, 0); }
    g.restore();
    // status: shields, guard, haste trail
    const side = this.state.sides[u.side];
    if (!u.down && u.st.transform > 0) {
      const a = this.t % 6 < 3;
      g.strokeStyle = a ? "#f8d838" : "#ffffff"; g.strokeRect(x - 16.5, y - 54.5, 33, 56);
      if (this.t % 5 === 0) this.fx.push({ kind: "spark", x: x + rnd(-14, 14), y: y - rnd(2, 50), vx: 0, vy: -0.7, col: "#f8d838", t: 0, dur: 16 });
    }
    if (!u.down && u.st.stop > 0) { g.strokeStyle = "#9ff0ff"; g.strokeRect(x - 15.5, y - 52.5, 31, 53); g.fillStyle = "rgba(159,240,255,.25)"; g.fillRect(x - 15, y - 52, 30, 52); }
    if (!u.down && (u.st.shield > 0 || side.shield > 0) && this.t % 4 < 2) { g.strokeStyle = "#7fd0ff"; g.strokeRect(x - 17.5, y - 55.5, 35, 57); }
    if (!u.down && u.st.guardedBy !== null) { g.fillStyle = "#ffd23f"; g.fillRect(x + (left ? 16 : -18), y - 34, 2, 14); }
    if (!u.down && side.haste > 0 && P.move > 0.3) { g.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 3; i++) g.fillRect(x + (left ? -18 - i * 4 : 16 + i * 4), y - 34 + i * 9, 3, 1); }
    if (!u.down && u.st.overclock > 0 && this.t % 6 === 0) this.fx.push({ kind: "spark", x: x + rnd(-10, 10), y: y - rnd(6, 44), vx: 0, vy: -0.6, col: "#ff5c3c", t: 0, dur: 14 });
    // smoke from broken parts
    if (!u.down && (broken.rarm || broken.larm || broken.legs) && this.t % 14 === u.idx) this.fx.push({ kind: "puff", x: x + rnd(-8, 8), y: y - rnd(12, 34), r: 2, t: 0, dur: 30, rise: true });
    if (u.down && this.t % 20 === 0) this.fx.push({ kind: "puff", x: x + rnd(-5, 5), y: y - 16, r: 2, t: 0, dur: 36, rise: true });
    // head armor bar + core-ready pip
    if (!u.down) {
      const hp = u.parts.head.hp / u.parts.head.max, by = Math.round(y + v.top0 - 7);
      g.fillStyle = "#0b0d12"; g.fillRect(x - 10, by, 20, 4);
      g.fillStyle = hp > 0.5 ? "#3ddc97" : hp > 0.25 ? "#ffd23f" : "#ff5c7a";
      g.fillRect(x - 9, by + 1, Math.max(1, Math.round(18 * hp)), 2);
      if (u.meter >= 100 && this.t % 20 < 10) { g.fillStyle = u.core.color || "#ffd23f"; g.fillRect(x + 11, by, 3, 4); }
      if (u.idx === 0) drawText(g, "L", x - 15, by - 1, "#ffd23f", "#000");
    }
  }

  // per-field weather, drawn every frame (presentation only)
  drawWeather(g) {
    const f = this.field, t = this.t;
    if (f === "storm") {
      g.fillStyle = "rgba(190,210,255,.55)";
      for (let i = 0; i < 40; i++) { const x = (i * 37 + t * 5) % (W + 40) - 20, y = (i * 53 + t * 9) % H; g.fillRect(x, y, 1, 4); g.fillRect(x - 1, y + 4, 1, 2); }
      if (t % 240 === 0) this.flashT = 5;
    } else if (f === "fog") {
      for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(230,240,235,${0.10 + 0.04 * i})`; g.fillRect(((t * (0.3 + i * 0.15)) % (W + 120)) - 120, 30 + i * 30, 120, 18); }
    } else if (f === "ice") {
      g.fillStyle = "#ffffff";
      for (let i = 0; i < 10; i++) if ((t + i * 13) % 50 < 6) g.fillRect((i * 71) % W, 20 + (i * 37) % (H - 20), 1, 1);
    } else if (f === "swamp") {
      g.fillStyle = "rgba(160,200,120,.7)";
      for (let i = 0; i < 6; i++) { const ph = (t + i * 40) % 90; if (ph < 30) g.fillRect((i * 43 + 20) % W, 150 - ph / 3, ph < 24 ? 2 : 3, ph < 24 ? 2 : 1); }
    } else if (f === "junkyard") {
      g.fillStyle = "rgba(200,180,150,.6)";
      for (let i = 0; i < 14; i++) g.fillRect(((i * 59 + t) % W), (i * 23 + Math.floor(t / 3)) % H, 1, 1);
    } else if (f === "lab") {
      const a = 0.08 + 0.06 * Math.sin(t / 20);
      g.fillStyle = `rgba(150,240,255,${a})`;
      for (let x = 0; x < W; x += 24) g.fillRect(x, 10, 1, H - 10);
    }
  }

  drawArrow(g, ref, col) {
    const u = this.state.sides[ref[0]].units[ref[1]];
    if (!u || u.down) return;
    const [x, y] = this.unitXY(u);
    const b = Math.floor(this.t / 8) % 2;
    g.fillStyle = col;
    const ax = Math.round(x), ay = Math.round(y + (this.v(u).top0 ?? -54) - 14 + b);
    g.fillRect(ax - 3, ay, 7, 1); g.fillRect(ax - 2, ay + 1, 5, 1); g.fillRect(ax - 1, ay + 2, 3, 1); g.fillRect(ax, ay + 3, 1, 1);
  }

  drawFx(g) {
    const keep = [];
    const adv = !(this.freeze > 0) && !(this.slowmo > 0 && this.t % 2);
    if (this.freeze > 0) this.freeze--;
    if (this.slowmo > 0) this.slowmo--;
    for (const f of this.fx) {
      if (adv) f.t++;
      if (f.t < 0) { keep.push(f); continue; }
      const p = f.t / f.dur;
      switch (f.kind) {
        case "bullet": {
          const [tx, ty] = this.center(f.dst);
          const x = f.x0 + (tx - f.x0) * p, y = f.y0 + (ty - f.y0) * p;
          g.fillStyle = "#fff3a0"; g.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 2);
          g.fillStyle = "#ffb03c"; g.fillRect(Math.round(x) - 2 * Math.sign(tx - f.x0 || 1), Math.round(y), 1, 1);
          break;
        }
        case "flash": g.fillStyle = "#fff3a0"; g.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 1, 4, 3); break;
        case "beam": {
          const [tx, ty] = this.center(f.dst);
          const w = f.thin ? 1 : 3 - (f.t % 3 === 0 ? 1 : 0);
          g.strokeStyle = f.col; g.lineWidth = w;
          g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(tx, ty); g.stroke();
          g.strokeStyle = "#ffffff"; g.lineWidth = 1;
          g.beginPath(); g.moveTo(f.x0, f.y0); g.lineTo(tx, ty); g.stroke();
          g.fillStyle = f.col; g.fillRect(Math.round(f.x0) - 2, Math.round(f.y0) - 2, 5, 5);
          break;
        }
        case "missile": {
          const [tx, ty] = this.center(f.dst);
          const x = f.x0 + (tx - f.x0) * p, y = f.y0 + (ty - f.y0) * p - Math.sin(p * Math.PI) * 30;
          g.fillStyle = "#e0e4f0"; g.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 2);
          g.fillStyle = "#ff5c3c"; g.fillRect(Math.round(x) - 3 * Math.sign(tx - f.x0 || 1), Math.round(y), 1, 1);
          if (adv && f.t % 2 === 0) keep.push({ kind: "puff", x, y, r: 1, t: 0, dur: 14 });
          break;
        }
        case "lunge": {
          if (f.v.dash) f.v.dash.t = f.t;
          if (f.t >= f.dur) { f.v.dash = null; f.v.lunge = 0; f.v.dashY = 0; }
          break;
        }
        case "text": {
          const y = Math.round(f.y - Math.min(10, f.t * 0.6));
          const sc = f.big ? 2 : 1;
          drawText(g, f.str, Math.round(f.x - textWidth(f.str, sc) / 2), y, f.col, "#000", sc);
          break;
        }
        case "spark": {
          if (adv) { f.x += f.vx; f.y += f.vy; f.vy += 0.12; }
          const sz = p < 0.5 ? 2 : 1;
          g.fillStyle = f.col; g.fillRect(Math.round(f.x), Math.round(f.y), sz, sz);
          break;
        }
        case "debris": {
          if (adv) { f.x += f.vx; f.y += f.vy; f.vy += 0.15; }
          g.fillStyle = "#8a90a0"; g.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
          break;
        }
        case "puff": {
          if (f.rise && adv) f.y -= 0.35;
          const r = Math.round(f.r + p * 3);
          g.fillStyle = `rgba(150,150,165,${0.55 * (1 - p)})`;
          g.fillRect(Math.round(f.x) - r, Math.round(f.y) - r, r * 2, r * 2);
          break;
        }
        case "plus": {
          if (adv) f.y += f.vy;
          g.fillStyle = "#5cff9a"; g.fillRect(Math.round(f.x), Math.round(f.y) - 1, 1, 3); g.fillRect(Math.round(f.x) - 1, Math.round(f.y), 3, 1);
          break;
        }
        case "ring": {
          const [cx, cy] = this.center(f.u);
          const r = 6 + p * 14;
          g.strokeStyle = f.col; g.lineWidth = 1; g.globalAlpha = 1 - p;
          g.strokeRect(Math.round(cx - r) + 0.5, Math.round(cy - r) + 0.5, Math.round(r * 2), Math.round(r * 2));
          g.globalAlpha = 1;
          break;
        }
        case "piece": {
          if (f.y < f.floor || f.vy < 0) { f.vy += 0.18; f.x += f.vx; f.y += f.vy; }
          if (f.y >= f.floor && f.vy >= 0) { f.y = f.floor; if (Math.abs(f.vy) > 0.6) { f.vy *= -0.35; f.vx *= 0.6; } else { f.vy = 0; f.vx = 0; } }
          if (f.dur - f.t < 40 && f.t % 4 < 2) break; // blink out
          g.save();
          if (f.flip) { g.translate(Math.round(f.x) + f.c.width, Math.round(f.y)); g.scale(-1, 1); g.drawImage(f.c, 0, 0); }
          else g.drawImage(f.c, Math.round(f.x), Math.round(f.y));
          g.restore();
          break;
        }
        case "slash": { // swoosh arc where the melee weapon lands
          const [cx, cy] = this.center(f.u);
          g.fillStyle = f.t < 2 ? "#ffffff" : "#fff3a0";
          for (let i = 0; i <= 16; i++) {
            const a = -1.3 + (2.4 * i) / 16, w = i > 2 && i < 14 && p < 0.5 ? 2 : 1;
            g.fillRect(Math.round(cx - f.dir * 4 + f.dir * Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 12), w, w);
          }
          break;
        }
        case "scope": {
          const [cx, cy] = this.center(f.u);
          const r = Math.round(14 - p * 8);
          g.strokeStyle = "#ff5c5c"; g.lineWidth = 1;
          g.strokeRect(Math.round(cx - r) + 0.5, Math.round(cy - r) + 0.5, r * 2, r * 2);
          g.fillStyle = "#ff5c5c";
          g.fillRect(Math.round(cx) - r - 3, Math.round(cy), 6, 1); g.fillRect(Math.round(cx) + r - 3, Math.round(cy), 6, 1);
          g.fillRect(Math.round(cx), Math.round(cy) - r - 3, 1, 6); g.fillRect(Math.round(cx), Math.round(cy) + r - 3, 1, 6);
          break;
        }
        case "banner": {
          const sc = f.t < 5 ? 3 : 2;
          const w = textWidth(f.str, sc);
          g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, 58, W, 22);
          drawText(g, f.str, Math.round(120 - w / 2), 62, "#f8d838", "#6a2a00", sc);
          break;
        }
        case "ripple": {
          const r = 4 + p * 30, ry = r * 0.55;
          g.fillStyle = f.col; g.globalAlpha = 1 - p;
          const n = Math.max(12, Math.round(r * 2.2));
          for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * ry), 2, 2); }
          g.globalAlpha = 1;
          break;
        }
        case "scan": {
          const [cx, cy] = this.center(f.u);
          const x = cx + (this.col(f.u.side) === 0 ? 1 : -1) * p * 200;
          g.fillStyle = "rgba(92,255,154,.45)"; g.fillRect(Math.round(x), 48, 2, H - 48);
          g.fillStyle = "rgba(92,255,154,.15)"; g.fillRect(Math.round(x) - 6, 48, 6, H - 48);
          break;
        }
      }
      if (adv && f.cb && f.t === (f.cbAt ?? f.dur)) f.cb();
      if (f.t < f.dur) keep.push(f);
    }
    this.fx = keep;
  }
}
