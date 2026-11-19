// Jointed pixel robots. Every limb is built from simple shapes placed at its joint angles
// (cut-out puppet animation, like the Flash RPGs), then re-rasterised as crisp pixel art each
// frame: outlined per body part and shaded with a light from the top left.
// Facing right: +x is forward, y grows downward, the origin is the point between the feet.
import { DATA } from "./data.js?v=20";

export const RW = 80, RH = 72, OX = 40, OY = 66;
const N = RW * RH;
const TAU = Math.PI * 2;

const byId = (id) => DATA.robots.find((r) => r.id === id);
const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (q) => q * q * (3 - 2 * q);

// ---------------------------------------------------------------- looks per part
const BODY_HEADS = {
  biped: ["horn", "crest", "ears", "pincer", "dome"],
  flyer: ["antenna", "crest", "horn", "dome", "ears"],
  tank: ["dome", "crest", "horn", "pincer", "ears"],
  crawler: ["pincer", "antenna", "horn", "dome", "crest"],
  wheels: ["dome", "ears", "crest", "antenna", "horn"],
  swimmer: ["crest", "dome", "pincer", "antenna", "ears"],
};
export function headStyleOf(id) {
  const r = byId(id);
  const n = parseInt(id.slice(1), 10) || 0;
  const list = BODY_HEADS[r.body] || BODY_HEADS.biped;
  return list[n % list.length];
}
const STRIKE = { biped: ["fist", "blade"], flyer: ["blade"], swimmer: ["blade", "claw"], crawler: ["claw"], wheels: ["drill"], tank: ["hammer", "fist"] };
// which weapon an arm part carries
export function weaponOf(id, side) {
  const r = byId(id), p = r[side];
  if (p.kind === "beam") return "emitter";
  if (p.kind === "guard") return "shield";
  if (p.kind === "strike") { const l = STRIKE[r.body] || STRIKE.biped; return l[(hash(id + side) >> 3) % l.length]; }
  if ((p.accuracy || 0) >= 85) return "rifle";
  if ((p.power || 0) >= 24 && (p.accuracy || 0) < 75) return "cannon";
  return (hash(id + side) >> 2) % 2 ? "twin" : "blaster";
}
export const THRUST = { fist: true, drill: true, claw: true };
const HIP = { biped: 18.5, wheels: 16.5, tank: 14, crawler: 13, flyer: 16, swimmer: 15 };
const thick = (armor) => clamp((armor - 50) / 70, -0.35, 0.7);

const specCache = new Map();
function specOf(build) {
  const key = [build.head, build.rarm, build.larm, build.legs].join("|");
  let s = specCache.get(key);
  if (s) return s;
  const H = byId(build.head), RA = byId(build.rarm), LA = byId(build.larm), L = byId(build.legs);
  s = {
    body: L.body,
    head: { style: headStyleOf(H.id), eye: ["visor", "mono", "twin"][hash(H.id) % 3], kind: H.head.kind, colors: H.colors },
    chest: H.body === "tank" ? 15 : H.body === "flyer" || H.body === "swimmer" ? 11 : 13,
    rarm: { weapon: weaponOf(RA.id, "rarm"), colors: RA.colors, th: thick(RA.rarm.armor) },
    larm: { weapon: weaponOf(LA.id, "larm"), colors: LA.colors, th: thick(LA.larm.armor) },
    legs: { colors: L.colors, th: thick(L.legs.armor) },
  };
  specCache.set(key, s);
  return s;
}

// ---------------------------------------------------------------- colour (GBA 15-bit feel)
const q5 = (v) => Math.min(248, Math.round(clamp(v, 0, 255) / 8) * 8);
const hex = (h) => { const n = parseInt(String(h || "#8890a0").slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mul = (c, f) => c.map((v) => v * f);
const mix = (c, d, f) => c.map((v, i) => v + (d[i] - v) * f);
const u32 = (c) => ((255 << 24) | (q5(c[2]) << 16) | (q5(c[1]) << 8) | q5(c[0])) >>> 0;
const tri = (c, lift = 0.38) => [u32(mix(c, [255, 255, 255], lift)), u32(c), u32(mul(c, 0.6))];
const WHITE = u32([255, 255, 255]);
const palCache = new Map();
function palette(colors, core, broken, dim, flash) {
  const key = [colors.main, colors.accent, colors.eye, core, +!!broken, dim, +!!flash].join("|");
  let p = palCache.get(key);
  if (p) return p;
  if (flash) {
    const w = [WHITE, WHITE, WHITE];
    p = { o: WHITE, m: w, a: w, g: w, d: w, e: w, w, k: w, f: w };
  } else if (broken) {
    const gm = [70, 74, 86];
    p = { o: u32([16, 16, 24]), m: tri(gm, 0.25), a: tri([58, 60, 72], 0.25), g: tri([92, 96, 108], 0.2), d: tri([44, 46, 56], 0.2), e: tri([34, 34, 40], 0.1), w: tri([100, 104, 116], 0.2), k: tri([40, 40, 48], 0.1), f: tri([60, 60, 60], 0.1) };
  } else {
    const m = mul(hex(colors.main), dim), a = mul(hex(colors.accent), dim), e = hex(colors.eye), k = hex(core || colors.accent);
    p = {
      o: u32(mix(mul(m, 0.22), [10, 10, 26], 0.5)),
      m: tri(m), a: tri(a, 0.35),
      g: [u32(mul([212, 218, 230], dim)), u32(mul([166, 174, 192], dim)), u32(mul([96, 104, 124], dim))],
      d: [u32(mul([104, 112, 132], dim)), u32(mul([66, 72, 90], dim)), u32(mul([38, 42, 56], dim))],
      e: [WHITE, u32(mix(e, [255, 255, 255], 0.15)), u32(mul(e, 0.72))],
      w: [u32(mul([252, 252, 252], dim)), u32(mul([210, 218, 232], dim)), u32(mul([146, 154, 174], dim))],
      k: [u32(mix(k, [255, 255, 255], 0.6)), u32(k), u32(mul(k, 0.6))],
      f: [WHITE, u32([255, 232, 120]), u32([255, 130, 40])],
    };
  }
  palCache.set(key, p);
  return p;
}

// ---------------------------------------------------------------- raster core
const out = new Uint32Array(N);
const gc = new Uint32Array(N);
const gm = new Uint8Array(N);
let bx0, by0, bx1, by1, PAL, ROOT;
const LX = -0.6, LY = -0.8; // light from the top left

function plot(x, y, mat, s, tone) {
  if (x < 0 || y < 0 || x >= RW || y >= RH) return;
  const i = y * RW + x;
  gc[i] = PAL[mat][tone !== undefined ? tone : s > 0.42 ? 0 : s < -0.36 ? 2 : 1];
  gm[i] = 1;
  if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
}
const CX = (x) => OX + ROOT.x + x * ROOT.sx;
const CY = (y) => OY + ROOT.y + y * ROOT.sy;
// a frame: origin + rotation, so limbs can be described in their own coordinates
const frame = (x, y, a = 0, k = 1) => ({ x, y, a, k, c: Math.cos(a), s: Math.sin(a) });
const at = (F, px, py) => [F.x + (px * F.c - py * F.s) * F.k, F.y + (px * F.s + py * F.c) * F.k];
const F0 = frame(0, 0, 0);

function capsule(F, ax, ay, bx, by, r0, r1, mat, tone) {
  const A = at(F, ax, ay), B = at(F, bx, by);
  const x0 = CX(A[0]), y0 = CY(A[1]), x1 = CX(B[0]), y1 = CY(B[1]);
  r0 *= F.k; r1 *= F.k;
  const r = Math.max(r0, r1), dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6;
  for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++) {
    for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = ((px - x0) * dx + (py - y0) * dy) / L2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - (x0 + dx * t), ey = py - (y0 + dy * t), rr = Math.max(0.6, r0 + (r1 - r0) * t);
      if (ex * ex + ey * ey > rr * rr) continue;
      plot(x, y, mat, rr > 1 ? (ex * LX + ey * LY) / rr : 0, tone);
    }
  }
}
function ellipse(F, x, y, rx, ry, ang, mat, tone) {
  const P = at(F, x, y), X = CX(P[0]), Y = CY(P[1]);
  rx *= F.k; ry *= F.k;
  const a = F.a + ang, c = Math.cos(a), s = Math.sin(a), R = Math.max(rx, ry) + 1;
  for (let yy = Math.floor(Y - R); yy <= Math.ceil(Y + R); yy++) {
    for (let xx = Math.floor(X - R); xx <= Math.ceil(X + R); xx++) {
      const dx = xx + 0.5 - X, dy = yy + 0.5 - Y;
      const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
      if (u * u + v * v > 1) continue;
      plot(xx, yy, mat, (u * c - v * s) * LX + (u * s + v * c) * LY, tone);
    }
  }
}
function box(F, x, y, w, h, ang, mat, o = {}) {
  const P = at(F, x, y), X = CX(P[0]), Y = CY(P[1]);
  w *= F.k; h *= F.k;
  const a = F.a + ang, c = Math.cos(a), s = Math.sin(a), R = Math.hypot(w, h) / 2 + 1;
  const hw = w / 2, hh = h / 2;
  for (let yy = Math.floor(Y - R); yy <= Math.ceil(Y + R); yy++) {
    for (let xx = Math.floor(X - R); xx <= Math.ceil(X + R); xx++) {
      const dx = xx + 0.5 - X, dy = yy + 0.5 - Y;
      const u = dx * c + dy * s, v = -dx * s + dy * c;
      const du = hw - Math.abs(u), dv = hh - Math.abs(v);
      if (du < 0 || dv < 0) continue;
      if (o.round && du < 1 && dv < 1) continue;
      let sh = 0;
      if (Math.min(du, dv) < 1) {
        const nu = du < dv ? Math.sign(u) : 0, nv = du < dv ? 0 : Math.sign(v);
        sh = (nu * c - nv * s) * LX + (nu * s + nv * c) * LY;
      }
      plot(xx, yy, mat, sh, o.tone);
    }
  }
}
function poly(F, pts, mat, tone) {
  const P = pts.map(([x, y]) => { const q = at(F, x, y); return [CX(q[0]), CY(q[1])]; });
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, hw = Math.max(1, (x1 - x0) / 2), hh = Math.max(1, (y1 - y0) / 2);
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) plot(x, y, mat, (((px - mx) / hw) * LX + ((py - my) / hh) * LY) * 0.9, tone);
    }
  }
}
// one body part: fill its shapes, then a 1px outline around its silhouette
function group(pal, fn) {
  PAL = pal; bx0 = by0 = 1e9; bx1 = by1 = -1;
  fn();
  if (bx1 < 0) return;
  const x0 = Math.max(0, bx0 - 1), x1 = Math.min(RW - 1, bx1 + 1), y0 = Math.max(0, by0 - 1), y1 = Math.min(RH - 1, by1 + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * RW + x;
    if (!gm[i] && ((x > 0 && gm[i - 1]) || (x < RW - 1 && gm[i + 1]) || (y > 0 && gm[i - RW]) || (y < RH - 1 && gm[i + RW]))) out[i] = pal.o;
  }
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const i = y * RW + x;
    if (gm[i]) { out[i] = gc[i]; gm[i] = 0; }
  }
}

// ---------------------------------------------------------------- limbs
function ik(hx, hy, fx, fy, L1, L2, bend) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy) || 0.01;
  const max = L1 + L2 - 0.05;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  const a = Math.atan2(dy, dx);
  const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const k = a - bend * A;
  return [[hx + L1 * Math.cos(k), hy + L1 * Math.sin(k)], [hx + dx, hy + dy]];
}

// walking legs: stance foot slides back on the ground, swing foot lifts in an arc
function stride(ph, len, lift) {
  const p = ((ph % 1) + 1) % 1;
  if (p < 0.5) return [len / 2 - len * (p / 0.5), 0];
  const q = (p - 0.5) / 0.5;
  return [-len / 2 + len * smooth(q), -lift * Math.sin(Math.PI * q)];
}

function bipedLeg(S, P, hip, which, wheels) {
  const th = S.legs.th, m = P.move || 0, k = P.kneel || 0;
  const L1 = wheels ? 7.5 : 9.5, L2 = wheels ? 7.5 : 9.5, footY = wheels ? -3.5 : -2;
  const restX = which ? 2.5 : -2.5;
  let fx, fy, toe = 0;
  if (wheels) {
    fx = restX * (1 - 0.4 * m) + 4 * m * Math.sin((P.walk + which * 0.5) * TAU);
    fy = footY;
  } else {
    const [sx, sy] = stride(P.walk + which * 0.5, 10 * m, 3.5 * m);
    fx = restX * (1 - m) + (which ? 1 : -0.5) * m + sx;
    fy = footY + sy;
    toe = sy < -0.5 ? 0.3 : 0;
  }
  if (k) { fx = fx * (1 - k) + (which ? 5 : -8) * k; toe = toe * (1 - k) + (which ? 0 : 0.9) * k; }
  const hx = hip[0] + (which ? 1.5 : -1.5), hy = hip[1] + 1.5;
  const [knee, ank] = ik(hx, hy, fx, fy, L1, L2, 1);
  if (knee[1] > -1.5) knee[1] = -1.5;
  capsule(F0, hx, hy, knee[0], knee[1], 2.2 + th, 2 + th, "g");
  capsule(F0, knee[0], knee[1], ank[0], ank[1], 2.3 + th, 2.9 + th, "m");
  ellipse(F0, knee[0] + 0.5, knee[1], 2.4 + th * 0.5, 2.2 + th * 0.5, 0, "a");
  if (wheels) {
    const W = frame(ank[0], ank[1], (P.walk || 0) * 6.5);
    ellipse(W, 0, 0, 3.7, 3.7, 0, "d");
    ellipse(W, 0, 0, 1.5, 1.5, 0, "g");
    box(W, 2.2, 0, 2.2, 0.9, 0, "g", { tone: 0 });
    box(F0, ank[0] + 0.5, ank[1] - 2.6, 6, 1.6, 0, "a", { round: true });
  } else {
    box(frame(ank[0], ank[1], toe), 1.6, 1.0, 7.6 + th, 3.2, 0, "a", { round: true });
    box(frame(ank[0], ank[1], toe), 4.6, 1.9, 1.6, 1.2, 0, "m", { tone: 2 });
  }
}

function crawlerLegs(S, P, hip, pair) {
  const th = S.legs.th, m = P.move || 0, k = P.kneel || 0;
  const legs = pair === 0 ? [[-3, -13, 0], [3, 10, 0.5]] : [[-4, -9, 0.5], [4, 14, 0]];
  for (const [ax, rest, off] of legs) {
    const [sx, sy] = stride(P.walk + off, 7 * m, 3 * m);
    const fx = rest + sx, fy = -0.8 + sy;
    const hx = hip[0] + ax, hy = hip[1] + 2;
    const dir = fx >= hx ? 1 : -1;
    const [knee, foot] = ik(hx, hy + k * 4, fx, fy, 8, 9.5, dir);
    capsule(F0, hx, hy, knee[0], knee[1], 1.9 + th, 1.7 + th, "m");
    ellipse(F0, knee[0], knee[1], 1.8, 1.8, 0, "a");
    capsule(F0, knee[0], knee[1], foot[0], foot[1], 1.7 + th * 0.6, 0.7, "a");
  }
}

function wing(S, P, root, far) {
  const flap = -0.15 + Math.sin((P.t || 0) * (0.16 + 0.2 * (P.move || 0))) * 0.32 + (far ? 0.28 : 0);
  const W = frame(root[0], root[1], flap - (P.kneel || 0) * 0.6);
  poly(W, [[0, 1], [-5, -5], [-15, -12], [-20, -11], [-15, -5], [-9, 1], [-3, 3]], "a");
  poly(W, [[-4, -1], [-11, -7], [-16, -9], [-13, -4], [-7, 0]], "m");
}

function tailFin(S, P, hip) {
  const t = P.t || 0, m = P.move || 0, k = P.kneel || 0;
  let x = hip[0] - 0.5, y = hip[1] + 2.5, a = Math.PI / 2 + 0.55 + k * 0.6;
  const seg = [[5, 3.4, 2.6], [5, 2.6, 1.8], [4, 1.8, 1.2]];
  for (let i = 0; i < seg.length; i++) {
    a += Math.sin(t * (0.11 + 0.17 * m) - i * 0.9) * 0.3 * (1 - k * 0.7);
    const nx = x + Math.cos(a) * seg[i][0], ny = y + Math.sin(a) * seg[i][0];
    capsule(F0, x, y, nx, ny, seg[i][1] + S.legs.th * 0.5, seg[i][2], i === 1 ? "a" : "m");
    x = nx; y = ny;
  }
  const T = frame(x, y, a);
  poly(T, [[-1, 0], [5, -5], [6, -2], [4, 0], [6, 2], [5, 5]], "a");
}

function tread(S, P, hip) {
  const th = S.legs.th, run = (P.walk || 0) * 14;
  box(F0, hip[0], hip[1] + 4, 7, 6 + 0, 0, "g");
  box(F0, 0, -5.5, 27 + th * 2, 10.5, 0, "d", { round: true });
  for (let i = 0; i < 9; i++) {
    const x = -12 + ((i * 3 + run) % 27 + 27) % 27;
    box(F0, x, -10.2, 1, 1, 0, "d", { tone: 0 });
    box(F0, 12 - (x + 12), -1, 1, 1, 0, "d", { tone: 0 });
  }
  for (const wx of [-9, -3, 3, 9]) {
    const Wf = frame(wx, -5.5, run / 2.6);
    ellipse(Wf, 0, 0, 2.7, 2.7, 0, "g");
    box(Wf, 0, 0, 3.4, 1, 0, "d", { tone: 1 });
  }
  box(F0, 0, -11.2, 25 + th * 2, 3.6, 0, "m", { round: true });
  box(F0, 0, -11.4, 23, 1, 0, "a", { tone: 1 });
}

function thruster(S, P, hip) {
  const t = P.t || 0, m = P.move || 0, k = P.kneel || 0;
  ellipse(F0, hip[0], hip[1] + 4, 5, 3.6, 0, "m");
  box(F0, hip[0] - 0.5, hip[1] + 8, 5, 2.6, 0, "g");
  if (k < 0.5) {
    const len = 3 + (t % 4 < 2 ? 1.5 : 0) + 2.5 * m;
    poly(F0, [[hip[0] - 2.6, hip[1] + 9.4], [hip[0] + 1.6, hip[1] + 9.4], [hip[0] - 0.5 - m * 1.5, hip[1] + 9.4 + len]], "f", 1);
    poly(F0, [[hip[0] - 1.4, hip[1] + 9.4], [hip[0] + 0.4, hip[1] + 9.4], [hip[0] - 0.5 - m, hip[1] + 9.4 + len * 0.55]], "f", 0);
  }
}

// ---------------------------------------------------------------- heads
function head(S, P, HF) {
  const st = S.head.style, kind = S.head.kind;
  // ornaments behind the helmet first
  if (st === "pincer") {
    poly(HF, [[-1, -4], [-3, -4.5], [-6, -10], [-9, -12.5], [-7, -13.5], [-4, -11], [-1, -8]], "a", 2);
    poly(HF, [[1, -4], [3, -4.5], [6, -10], [9.5, -12.5], [7.5, -14], [4, -11.5], [1, -8]], "a");
  } else if (st === "ears") {
    poly(HF, [[-5, -4], [-1.5, -4], [-3, -12.5], [-5.5, -11]], "a", 2);
    poly(HF, [[0, -4], [4, -4], [3, -13], [0.5, -11.5]], "a");
    poly(HF, [[1, -5], [3, -5], [2.5, -10.5], [1.2, -9.5]], "m", 1);
  } else if (st === "antenna") {
    capsule(HF, -2, -4, -5, -12, 0.7, 0.7, "g");
    capsule(HF, 2, -4, 4, -13, 0.7, 0.7, "g");
    ellipse(HF, -5, -12.5, 1.5, 1.5, 0, "e");
    ellipse(HF, 4, -13.5, 1.5, 1.5, 0, "e");
  }
  if (kind === "missile") {
    box(HF, -5.5, -5.5, 6, 6, -0.2, "a", { round: true });
    box(HF, -3, -7.4, 2.6, 1.6, -0.2, "w");
    box(HF, -3, -4.6, 2.6, 1.6, -0.2, "w");
  } else if (kind === "scan") {
    capsule(HF, -5, -1, -8, -2, 0.8, 0.8, "g");
    ellipse(HF, -8.5, -2.5, 1.6, 4.6, -0.35, "g");
    ellipse(HF, -9, -2.5, 0.8, 0.8, 0, "e");
  }
  // helmet
  if (st === "dome" || st === "crest") ellipse(HF, 0, 0, 7.6, 6.6, 0, "m");
  else box(HF, 0, 0.4, 14.5, 11.5, 0, "m", { round: true });
  if (st === "dome") box(HF, -1.5, -6.6, 4.5, 2, 0, "a", { round: true });
  if (st === "crest") for (const [x, h] of [[-4, 9], [-1, 11.5], [2, 9.5]]) poly(HF, [[x - 2, -4], [x + 2, -4], [x + 0.5, -h]], "a");
  if (st === "horn") {
    poly(HF, [[0.5, -4.5], [4.5, -5], [8, -12], [9.5, -16], [7, -15], [2.5, -9]], "a");
    poly(HF, [[3, -6], [5, -6.2], [7.5, -11.5], [6, -11]], "a", 0);
  }
  // face: visor plate, eyes, jaw
  box(HF, 3.6, 0.6, 7.4, 6.4, 0, "d", { round: true });
  const glow = P.glow && P.glow.head ? 1 : 0;
  if (S.head.eye === "mono") ellipse(HF, 5, 0.3, 1.9 + glow * 0.6, 1.9 + glow * 0.6, 0, "e");
  else if (S.head.eye === "twin") { ellipse(HF, 3, 0.2, 1.1, 1.4 + glow * 0.4, 0, "e"); ellipse(HF, 6, 0.2, 1.1, 1.4 + glow * 0.4, 0, "e"); }
  else box(HF, 4.5, 0.2, 5.6, 2.1 + glow, 0, "e");
  box(HF, 4, 3.4, 4.5, 1, 0, "g", { tone: 2 });
  box(HF, 1, 5.4, 9, 2, 0, "a", { round: true });
  // gadget for the head's move
  if (kind === "laser") { capsule(HF, -1, -6.2, 6.5, -6.2, 1.3, 1.1, "g"); ellipse(HF, 7.2, -6.2, 1.1, 1.1, 0, "e"); }
  else if (kind === "shield") { box(HF, 1, -4.8, 13, 3, 0, "a", { round: true }); ellipse(HF, 1, -4.8, 1, 1, 0, "e"); }
  else if (kind === "repair") { box(HF, -1, -4, 5, 1.6, 0, "w", { tone: 0 }); box(HF, -1, -4, 1.6, 5, 0, "w", { tone: 0 }); ellipse(HF, -1, -8, 1.3, 1.3, 0, "e"); capsule(HF, -1, -6.8, -1, -5.2, 0.6, 0.6, "g"); }
  else if (kind === "missile") { /* pod already drawn */ }
}

// ---------------------------------------------------------------- arms and weapons
function arm(S, side, sh, a1, a2) {
  const A = S[side], th = A.th;
  const el = [sh[0] + 7 * Math.cos(a1), sh[1] + 7 * Math.sin(a1)];
  const wr = [el[0] + 7 * Math.cos(a2), el[1] + 7 * Math.sin(a2)];
  capsule(F0, sh[0], sh[1], el[0], el[1], 1.8 + th * 0.5, 1.6, "g");
  ellipse(F0, el[0], el[1], 1.9, 1.9, 0, "d");
  capsule(F0, el[0], el[1], wr[0], wr[1], 2.2 + th * 0.7, 2.5 + th * 0.7, "m");
  ellipse(F0, sh[0] - 0.3, sh[1] - 0.4, 3.6 + th * 1.4, 3.2 + th, a1 - Math.PI / 2, "m");
  box(frame(sh[0] - 0.3, sh[1] - 0.4, a1 - Math.PI / 2), 0, 1.4 + th, 6 + th * 2, 1.2, 0, "a", { tone: 1 });
  return { el, wr };
}
function weapon(S, side, el, wr, a2, P, anchors) {
  const kind = S[side].weapon, WF = frame(wr[0], wr[1], a2);
  let tip = 6;
  switch (kind) {
    case "blaster": box(WF, 2.6, 0, 6, 4.6, 0, "a", { round: true }); box(WF, 7.4, -0.4, 5, 2, 0, "g"); tip = 10; break;
    case "twin": box(WF, 2.6, 0, 6, 5.2, 0, "a", { round: true }); box(WF, 7.2, -1.5, 5, 1.6, 0, "g"); box(WF, 7.2, 1.5, 5, 1.6, 0, "g"); tip = 9.8; break;
    case "rifle": box(WF, 2.6, 0, 6, 4.4, 0, "a", { round: true }); box(WF, 9.6, -0.4, 10, 1.8, 0, "g"); box(WF, 3.2, -3, 4.4, 1.6, 0, "d"); tip = 14.6; break;
    case "cannon": box(WF, 3, 0, 7, 6.2, 0, "a", { round: true }); box(WF, 8, 0, 4, 4.4, 0, "g"); box(WF, 10.3, 0, 1.4, 5.4, 0, "d"); tip = 11.2; break;
    case "emitter": {
      box(WF, 3, 0, 7, 6.6, 0, "m", { round: true }); box(WF, 7.2, 0, 2.2, 7.6, 0, "a");
      const g = P.glow && P.glow[side] ? 0.8 : 0;
      ellipse(WF, 8.6, 0, 1.3 + g, 2.5 + g, 0, "e"); tip = 9.6; break;
    }
    case "fist": box(WF, 2.6, 0, 5.8, 6.2, 0, "a", { round: true }); box(WF, 4.9, 0, 1, 5, 0, "a", { tone: 2 }); tip = 5.6; break;
    case "blade": box(WF, 1.4, 0, 2.8, 5.4, 0, "a"); poly(WF, [[2.8, -1.7], [13, -1], [16.5, 0.2], [13, 1.4], [2.8, 1.7]], "w"); capsule(WF, 3.5, -0.6, 13, -0.4, 0.5, 0.5, "w", 0); tip = 16; break;
    case "claw": {
      const j = 0.22 + 0.5 * (P.claw || 0);
      box(WF, 1.6, 0, 4, 5.4, 0, "m", { round: true });
      poly(frame(wr[0], wr[1], a2 - j), [[2, -1.2], [8, -2.6], [10.5, -0.6], [7.5, -0.6], [2, 1]], "a");
      poly(frame(wr[0], wr[1], a2 + j), [[2, 1.2], [8, 2.6], [10.5, 0.6], [7.5, 0.6], [2, -1]], "a");
      tip = 9; break;
    }
    case "drill": {
      box(WF, 1.6, 0, 3.2, 6.4, 0, "a");
      poly(WF, [[3.2, -3], [13.5, 0], [3.2, 3]], "g");
      for (let i = 0; i < 3; i++) { const x = 4 + (((P.spin || 0) * 0.8 + i * 3) % 9); const w = 3 * (1 - (x - 3.2) / 10.3); capsule(WF, x, -w, x + 1.2, w, 0.55, 0.55, "d", 1); }
      tip = 13; break;
    }
    case "hammer": capsule(WF, 0, 0, 6.5, 0, 1.1, 1.1, "g"); box(WF, 8.2, 0, 4.6, 9.6, 0, "a", { round: true }); box(WF, 8.2, 0, 4.6, 2, 0, "m", { tone: 1 }); tip = 9; break;
    case "shield": {
      box(WF, 1.4, 0, 3, 3.6, 0, "m", { round: true });
      const PF = frame(el[0], el[1], a2);
      box(PF, 4, 2.8, 13, 3.6, 0, "a", { round: true });
      box(PF, 4, 2.8, 9, 1, 0, "a", { tone: 0 });
      ellipse(PF, 4, 2.8, 1.1, 1.1, 0, "e");
      tip = 4; break;
    }
  }
  const T = at(WF, tip, 0);
  anchors[side] = [CX(T[0]), CY(T[1])];
}

// ---------------------------------------------------------------- the robot
export const REST = { rs: 1.75, re: -0.6, ls: 1.95, le: -0.5 };
let IMG = null;

// pose: { t, walk, move, x, y, sx, sy, drop, lean, headA, headX, headY, rs, re, ls, le,
//         rx, ry, lx, ly, kneel, claw, spin, glow:{head,rarm,larm}, hide:{head,rarm,larm} }
// opts: { broken:{head,rarm,larm,legs}, flashPart, core (colour), canvas, only (one part) }
export function drawRobot(build, P = {}, opts = {}) {
  const S = specOf(build);
  P = { walk: 0, move: 0, t: 0, ...P };
  const broken = opts.broken || {}, fl = opts.flashPart, hide = P.hide || {}, only = opts.only;
  out.fill(0);
  ROOT = { x: Math.round(P.x || 0), y: Math.round(P.y || 0), sx: P.sx || 1, sy: P.sy || 1 };
  const pal = (colors, part, dim = 1, flashAs = part) => palette(colors, opts.core, broken[part], dim, fl === "all" || fl === flashAs || (flashAs === "torso" && fl === "head"));
  const show = (part) => !only || only === part;
  const body = S.body, k = P.kneel || 0, t = P.t || 0;
  const hover = body === "flyer" ? (4 + Math.sin(t * 0.11) * 1.5 + (P.move || 0)) * (1 - k)
    : body === "swimmer" ? (3 + Math.sin(t * 0.09) * 1.2) * (1 - k) : 0;
  const bob = body === "biped" || body === "wheels" ? (P.move || 0) * 1.2 * (0.5 + 0.5 * Math.cos(P.walk * 2 * TAU)) : 0;
  const kneelDrop = body === "biped" ? 7 * k : body === "wheels" ? 5 * k : body === "crawler" ? 4 * k : body === "tank" ? 1 * k : 0;
  const hip = [0, -(HIP[body] + hover) + (P.drop || 0) + bob + kneelDrop];
  const lean = (P.lean || 0) + (body === "flyer" ? 0.12 * (P.move || 0) : 0);
  const TF = frame(hip[0], hip[1], lean);
  const neck = at(TF, 1, -15);
  const HF0 = frame(neck[0] + (P.headX || 0), neck[1] + (P.headY || 0), lean + (P.headA || 0));
  const hc = at(HF0, 1.5, -8.3);
  const HF = frame(hc[0], hc[1], HF0.a, 1.2); // chibi: big heads
  const shR = at(TF, 4.5, -12.5), shL = at(TF, -4.5, -12.5);
  shR[0] += P.rx || 0; shR[1] += P.ry || 0; shL[0] += P.lx || 0; shL[1] += P.ly || 0;
  const rs = (P.rs ?? REST.rs) + lean, re = rs + (P.re ?? REST.re);
  const ls = (P.ls ?? REST.ls) + lean, le = ls + (P.le ?? REST.le);
  const anchors = {};
  const legsCol = S.legs.colors;

  // far side first
  if (show("legs")) {
    if (body === "flyer") { group(pal(legsCol, "legs", 0.7), () => wing(S, P, at(TF, -5, -11), true)); group(pal(legsCol, "legs"), () => wing(S, P, at(TF, -4, -10), false)); }
    else if (body === "biped" || body === "wheels") group(pal(legsCol, "legs", 0.72), () => bipedLeg(S, P, hip, 0, body === "wheels"));
    else if (body === "crawler") group(pal(legsCol, "legs", 0.72), () => crawlerLegs(S, P, hip, 0));
    else if (body === "swimmer") group(pal(legsCol, "legs", 0.72), () => poly(frame(hip[0] - 3, hip[1] + 1, -0.4 + Math.sin(t * 0.12) * 0.2), [[0, 0], [-7, -3], [-6, 1], [-1, 3]], "a"));
  }
  if (show("larm") && !hide.larm) {
    let j;
    group(pal(S.larm.colors, "larm", 0.72), () => { j = arm(S, "larm", shL, ls, le); });
    group(pal(S.larm.colors, "larm", 0.72), () => weapon(S, "larm", j.el, j.wr, le, P, anchors));
  }
  if (show("legs")) {
    const pl = pal(legsCol, "legs");
    if (body === "biped" || body === "wheels") group(pl, () => bipedLeg(S, P, hip, 1, body === "wheels"));
    else if (body === "crawler") { group(pl, () => box(F0, hip[0], hip[1] + 1.5, 16 + S.legs.th * 2, 6.5, 0, "m", { round: true })); group(pl, () => crawlerLegs(S, P, hip, 1)); }
    else if (body === "tank") group(pl, () => tread(S, P, hip));
    else if (body === "flyer") group(pl, () => thruster(S, P, hip));
    else if (body === "swimmer") group(pl, () => tailFin(S, P, hip));
  }
  if (show("torso")) {
    group(pal(S.head.colors, "head", 1, "torso"), () => {
      box(frame(hip[0], hip[1] + 1, lean * 0.4), 0, 0, 10, 4.4, 0, "d", { round: true });
      box(TF, 0, -3.6, 7, 3.2, 0, "g");
      box(TF, 0, -9.6, S.chest, 10.4, 0, "m", { round: true });
      box(TF, 1.6, -10, S.chest - 5, 5.2, 0, "a", { round: true });
      ellipse(TF, 2.4, -10, 1.7, 1.7, 0, "k");
      box(TF, 0.5, -14.6, 8, 2, 0, "g");
      if (hide.larm) ellipse(TF, -4.5, -12.5, 2, 2, 0, "d");
      if (hide.rarm) ellipse(TF, 4.5, -12.5, 2, 2, 0, "d");
    });
  }
  if (show("head") && !hide.head) group(pal(S.head.colors, "head"), () => head(S, P, HF));
  if (show("rarm") && !hide.rarm) {
    let j;
    group(pal(S.rarm.colors, "rarm"), () => { j = arm(S, "rarm", shR, rs, re); });
    group(pal(S.rarm.colors, "rarm"), () => weapon(S, "rarm", j.el, j.wr, re, P, anchors));
  }
  const eye = at(HF, 5, 0), top = at(HF, 0, -9), ctr = at(TF, 0, -9);
  anchors.head = [CX(eye[0]), CY(eye[1])];
  anchors.top = [CX(top[0]), CY(top[1])];
  anchors.center = [CX(ctr[0]), CY(ctr[1])];
  if (!anchors.rarm) anchors.rarm = [CX(shR[0] + 6), CY(shR[1] + 4)];
  if (!anchors.larm) anchors.larm = [CX(shL[0] + 6), CY(shL[1] + 4)];

  let c = opts.canvas;
  if (!c) { c = document.createElement("canvas"); c.width = RW; c.height = RH; }
  if (!IMG) IMG = new ImageData(new Uint8ClampedArray(out.buffer), RW, RH);
  c.getContext("2d").putImageData(IMG, 0, 0);
  return { canvas: c, anchors };
}

// one part on its own (for parts that break off and fly), cropped to its pixels
export function pieceOf(build, part, P, opts = {}) {
  const { canvas } = drawRobot(build, P, { ...opts, only: part });
  let x0 = RW, y0 = RH, x1 = -1, y1 = -1;
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (out[y * RW + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const c = document.createElement("canvas");
  c.width = x1 - x0 + 1; c.height = y1 - y0 + 1;
  c.getContext("2d").drawImage(canvas, -x0, -y0);
  return { c, x: x0 - OX, y: y0 - OY };
}
