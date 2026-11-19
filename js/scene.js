// Canvas battle scene at GBA resolution (240x160), drawn with pixel sprites and effects.
import { sprite, drawText, textWidth } from "./pixel.js?v=17";
import { PARTS } from "./engine.js?v=17";
import { sfx } from "./sfx.js?v=17";

export const W = 240, H = 160;
const LANE_Y = [113, 80, 147];          // feet y for unit idx 0 (leader, middle), 1 (back), 2 (front)
const HOME = [24, 216], ACTIVE = [100, 140];
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
  const rx = 12, ry = 4;
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
  unitXY(u) {
    const v = this.v(u);
    const base = this.homeX(u.side) + (this.activeX(u.side) - this.homeX(u.side)) * u.pos;
    return [base + v.lunge * (this.col(u.side) === 0 ? 1 : -1) + (v.shake ? rnd(-1.5, 1.5) : 0), this.laneY(u)];
  }
  muzzle(u, part) {
    const [x, y] = this.unitXY(u);
    const dir = this.col(u.side) === 0 ? 1 : -1;
    if (part === "head") return [x + dir * 4, y - 26];
    return [x + dir * 13, y - 14];
  }
  center(u) { const [x, y] = this.unitXY(u); return [x, y - 15]; }
  unitAtPoint(px, py) {
    if (!this.state) return null;
    for (const s of this.state.sides) for (const u of s.units) {
      if (u.down) continue;
      const [x, y] = this.unitXY(u);
      if (px >= x - 14 && px <= x + 14 && py >= y - 32 && py <= y + 2) return [u.side, u.idx];
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
        const impact = () => this.impact(dst, e);
        if (e.aimed || e.part && e.kind === "laser" && e.aimed) this.fx.push({ kind: "scope", u: dst, t: 0, dur: 16 });
        if (delay === 0) ({ strike: () => sfx.strike(), beam: () => sfx.beam(), burst: () => sfx.beam(), laser: () => sfx.laser(), missile: () => sfx.missile() }[e.kind] || (() => sfx.shoot()))();
        if (e.kind === "legcrash") { this.shakeT = Math.max(this.shakeT, 14); setTimeout(impact, 120 + delay * 10); }
        else if (e.kind === "strike") this.lunge(src, dst, impact);
        else if (e.kind === "beam" || e.kind === "burst") this.beam(src, dst, e.part, e.kind === "burst" ? 22 : 14, impact);
        else if (e.kind === "laser") this.beam(src, dst, "head", 10, impact, true);
        else if (e.kind === "missile") this.missile(src, dst, delay, impact);
        else this.bullets(src, dst, e.part, impact);
        delay += 6;
      } else if (e.t === "repair") {
        const d = U(e.dst);
        for (let i = 0; i < 10; i++) this.fx.push({ kind: "plus", x: this.center(d)[0] + rnd(-10, 10), y: this.center(d)[1] + rnd(-6, 10), vy: -rnd(0.3, 0.8), t: -i * 2, dur: 34 });
        this.text(d, "+" + e.amount, "#5cff9a", 6);
        sfx.chime();
      } else if (e.t === "shield") {
        this.fx.push({ kind: "ring", u: U(e.dst), col: "#7fd0ff", t: 0, dur: 30 });
        sfx.shield();
      } else if (e.t === "scan") {
        this.fx.push({ kind: "scan", u: U(e.src), t: 0, dur: 40 });
        sfx.scan();
      } else if (e.t === "guard") {
        this.fx.push({ kind: "ring", u: U(e.dst), col: "#ffd23f", t: 0, dur: 24 });
        sfx.land();
      } else if (e.t === "core") {
        this.flashT = 10;
        sfx.riser();
        const s = U(e.src);
        for (let i = 0; i < 24; i++) this.fx.push({ kind: "spark", x: this.center(s)[0], y: this.center(s)[1], vx: rnd(-1.6, 1.6), vy: rnd(-1.8, 0.4), col: s.core.color || "#ffd23f", t: 0, dur: 28 });
      } else if (e.t === "down") {
        const d = U(e.dst);
        this.slowmo = e.leader ? 90 : 50;
        setTimeout(() => { this.explode(d); sfx.explode(); }, 260);
      } else if (e.t === "transform") {
        const u = U(e.src);
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
    this.fx.push({ kind: "text", x, y: y - 12, str, col, t: -delay, dur: 46, big });
  }
  impact(dst, e) {
    const v = this.v(dst);
    const [cx, cy] = this.center(dst);
    if (!e.hit) { this.text(dst, "MISS", "#c8c8d8", 0, true); v.lunge = 0; sfx.miss(); return; }
    if (e.crit) sfx.crit(); else sfx.hit(e.dmg >= 20 || e.kind === "strike");
    if (e.broke) setTimeout(() => sfx.break(), 90);
    v.flash = 6; v.shake = 10;
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
  lunge(src, dst, onHit) {
    const v = this.v(src);
    const dist = Math.max(0, Math.abs(this.unitXY(dst)[0] - this.unitXY(src)[0]) - 18);
    this.fx.push({ kind: "lunge", v, dist, t: 0, dur: 30, cb: onHit, cbAt: 12 });
  }
  ripple(x, y, col) { this.fx.push({ kind: "ripple", x, y, col, t: 0, dur: 22 }); }
  punch() {
    const c = this.cv;
    c.classList.remove("punch"); void c.offsetWidth; c.classList.add("punch");
    setTimeout(() => c.classList.remove("punch"), 220);
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
    const units = S.sides.flatMap((s) => s.units).sort((a, b) => this.laneY(a) - this.laneY(b));
    // shadows
    for (const u of units) { const [x, y] = this.unitXY(u); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(Math.round(x) - 9, y, 18, 2); g.fillRect(Math.round(x) - 7, y + 2, 14, 1); }
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

  drawUnit(g, u) {
    const v = this.v(u);
    const [x0, y] = this.unitXY(u);
    const x = Math.round(x0);
    const moving = Math.abs(x0 - v.x) > 0.05;
    v.x = x0;
    if (moving) v.walk++;
    const legsBody = u.body;
    const hover = legsBody === "flyer" || legsBody === "swimmer";
    const frame = hover ? (Math.floor(this.t / 10) % 2) : moving ? Math.floor(v.walk / 7) % 2 : 0;
    const bob = hover ? Math.round(Math.sin(this.t / 9 + u.idx) * 1.5) - 2 : moving && frame ? -1 : 0;
    const broken = { head: u.parts.head.hp <= 0, rarm: u.parts.rarm.hp <= 0, larm: u.parts.larm.hp <= 0, legs: u.parts.legs.hp <= 0 };
    if (u.down) { broken.head = broken.rarm = broken.larm = broken.legs = true; v.deadT++; }
    const sp = sprite(u.build, { frame, broken, flash: v.flash > 0 && v.flash % 2 === 0 });
    if (v.flash > 0) v.flash--;
    if (v.shake > 0) v.shake--;
    const left = this.col(u.side) === 0;
    const facingRight = left ? u.phase !== "cool" || u.down : u.phase === "cool" && !u.down;
    g.save();
    if (u.down) g.globalAlpha = 0.75;
    const dy = y - 31 + bob + (u.down ? 3 : 0) + this.dropOffset(u, x, y);
    if (facingRight) g.drawImage(sp, x - 16, dy);
    else { g.translate(x + 16, dy); g.scale(-1, 1); g.drawImage(sp, 0, 0); }
    g.restore();
    // status: shields, guard, haste trail
    const side = this.state.sides[u.side];
    if (!u.down && u.st.transform > 0) {
      const a = this.t % 6 < 3;
      g.strokeStyle = a ? "#f8d838" : "#ffffff"; g.strokeRect(x - 15.5, y - 34.5, 31, 36);
      if (this.t % 5 === 0) this.fx.push({ kind: "spark", x: x + rnd(-12, 12), y: y - rnd(2, 32), vx: 0, vy: -0.7, col: "#f8d838", t: 0, dur: 16 });
    }
    if (!u.down && u.st.stop > 0) { g.strokeStyle = "#9ff0ff"; g.strokeRect(x - 13.5, y - 32.5, 27, 32); g.fillStyle = "rgba(159,240,255,.25)"; g.fillRect(x - 13, y - 32, 26, 31); }
    if (!u.down && (u.st.shield > 0 || side.shield > 0) && this.t % 4 < 2) { g.strokeStyle = "#7fd0ff"; g.strokeRect(x - 14.5, y - 33.5, 29, 34); }
    if (!u.down && u.st.guardedBy !== null) { g.fillStyle = "#ffd23f"; g.fillRect(x + (left ? 12 : -14), y - 22, 2, 10); }
    if (!u.down && side.haste > 0 && moving) { g.fillStyle = "rgba(255,255,255,.5)"; for (let i = 0; i < 3; i++) g.fillRect(x + (left ? -16 - i * 4 : 14 + i * 4), y - 20 + i * 6, 3, 1); }
    if (!u.down && u.st.overclock > 0 && this.t % 6 === 0) this.fx.push({ kind: "spark", x: x + rnd(-8, 8), y: y - rnd(4, 28), vx: 0, vy: -0.6, col: "#ff5c3c", t: 0, dur: 14 });
    // smoke from broken parts
    if (!u.down && (broken.rarm || broken.larm || broken.legs) && this.t % 14 === u.idx) this.fx.push({ kind: "puff", x: x + rnd(-6, 6), y: y - rnd(10, 24), r: 2, t: 0, dur: 30, rise: true });
    if (u.down && this.t % 20 === 0) this.fx.push({ kind: "puff", x: x + rnd(-4, 4), y: y - 12, r: 2, t: 0, dur: 36, rise: true });
    // head hp bar + charge pip
    if (!u.down) {
      const hp = u.parts.head.hp / u.parts.head.max;
      g.fillStyle = "#0b0d12"; g.fillRect(x - 9, y - 38, 18, 4);
      g.fillStyle = hp > 0.5 ? "#3ddc97" : hp > 0.25 ? "#ffd23f" : "#ff5c7a";
      g.fillRect(x - 8, y - 37, Math.max(1, Math.round(16 * hp)), 2);
      if (u.meter >= 100 && this.t % 20 < 10) { g.fillStyle = u.core.color || "#ffd23f"; g.fillRect(x + 10, y - 38, 3, 4); }
      if (u.idx === 0) drawText(g, "L", x - 14, y - 39, "#ffd23f", "#000");
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
    const ax = Math.round(x), ay = y - 46 + b;
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
          const out = f.t < 12 ? f.t / 12 : f.t < 18 ? 1 : Math.max(0, 1 - (f.t - 18) / 12);
          f.v.lunge = f.dist * out;
          if (f.t >= f.dur) f.v.lunge = 0;
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
