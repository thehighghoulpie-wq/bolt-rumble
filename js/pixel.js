// 8-bit sprite kit: hand-drawn part templates, palettes, composited 32x32 robots.
// Keys: . clear  o outline  m main  M main dark  l main light  a accent  A accent dark
//       e eye/glow  w white  g metal  G dark metal
import { DATA } from "./data.js?v=9";

const HEADS = {
  dome: [
    ".....oooo.....",
    "...oolllmoo...",
    "..olllmmmmmo..",
    ".olmmmmmmmmMo.",
    ".olmmmmmmmmMo.",
    ".ommmooooooMo.",
    ".ommoeeeeweoo.",
    ".ommooooooomo.",
    ".oMmmmmmmmMMo.",
    "..oMMmmmmMMo..",
    "...oooooooo...",
  ],
  horn: [
    "...........oo.",
    "..........oaao",
    ".........oaAo.",
    "........oaAo..",
    "...ooooooaoo..",
    "..ollmmmmmmo..",
    ".olmmmmmmmmMo.",
    ".ommmmoooooMo.",
    ".ommmoeeeweoo.",
    ".ommmooooooMo.",
    ".oMmmmmmmmMMo.",
    "..oMMMMMMMMo..",
    "...oooooooo...",
  ],
  pincer: [
    ".oo........oo.",
    "oaAo......oaAo",
    ".oaAo....oaAo.",
    "..oaAooooaAo..",
    "..ooommmmooo..",
    ".olmmmmmmmmmo.",
    ".olmmmmmmmmMo.",
    ".ommmmooooooo.",
    ".ommmoeeeweeo.",
    ".ommmooooooMo.",
    ".oMmmmmmmmMMo.",
    "..oMMMMMMMMo..",
    "...oooooooo...",
  ],
  ears: [
    "..oo.....oo...",
    ".oao.....oao..",
    ".oaAo...oaAo..",
    ".oaAAoooaAAo..",
    ".olmmmmmmmmmo.",
    ".olmmmmmmmmMo.",
    ".olmmmmmooooo.",
    ".ommmmmoeweoo.",
    ".ommmmmoooooo.",
    ".ommmaammmmMo.",
    "..oMmmmmmmMo..",
    "...oMMMMMMo...",
    "....oooooo....",
  ],
  crest: [
    ".....oooooo...",
    "....oaaaaaAo..",
    ".....oaaaAo...",
    "...ooooaAooo..",
    "..ollmmmmmmmo.",
    ".olmmmmmmmmmMo",
    ".ommmmmmmmmmMo",
    ".oggggggggggGo",
    ".ogGoeeeweeeoo",
    ".oggggggggggGo",
    ".oMmmmmmmmmMMo",
    "..oMMMMMMMMMo.",
    "...ooooooooo..",
  ],
  antenna: [
    ".oe.......oe..",
    "..oo.....oo...",
    "...oo...oo....",
    "....oooooo....",
    "...olllmmmoo..",
    "..olmmmmmmmMo.",
    ".olmmmmmmmmMo.",
    ".ommmmmoooooo.",
    ".ommmmoeeweeo.",
    ".ommmmooooooo.",
    ".oMmmmmmmmmMo.",
    "..oMMMMMMMMo..",
    "...ooooooooo..",
  ],
};

const TORSO = [
  ".oooooooooo.",
  "olmmmmmmmmMo",
  "olmaaaaaamMo",
  "omaAeeeeAamo",
  "omaAeweeAamo",
  "omMaaaaaaMMo",
  "oMMmmmmmmMMo",
  ".oGggggggGo.",
  ".oGGGGGGGGo.",
  "..oooooooo..",
];

const ARMS = {
  shoot: [
    ".ooooo......",
    "olmmmMo.....",
    "ommmmMoooooo",
    "omaaaagggggo",
    "omAAAaGGGGGo",
    "ommmmMoooooo",
    ".oaaAo......",
    ".omMMo......",
    ".omMMo......",
    ".oaaAo......",
    ".ooooo......",
  ],
  beam: [
    ".ooooo..ooo.",
    "olmmmMooaaao",
    "ommmmMoaeeeo",
    "omaaaagaeweo",
    "omAAAaGaeeeo",
    "ommmmMoaAAAo",
    ".oaaAo..ooo.",
    ".omMMo......",
    ".omMMo......",
    ".oaaAo......",
    ".ooooo......",
  ],
  strike: [
    ".ooooo......",
    "olmmmMo.....",
    "ommmmMo.....",
    "omaaaao.....",
    "omAAAAoooo..",
    ".oaaAoggggo.",
    ".omMMogwggGo",
    ".omMMoggggGo",
    ".oaaAoGGGGo.",
    ".ooooooooo..",
  ],
  guard: [
    "......oooo..",
    ".ooooooaaao.",
    "olmmmoaawAo.",
    "ommmmoaaaAo.",
    "omaaaoaaaAo.",
    "omAAAoaaaAo.",
    ".oaaAoaaaAo.",
    ".omMMoaaAAo.",
    ".omMMooaAo..",
    ".oaaAo.oo...",
    ".ooooo......",
  ],
};

const LEGS = {
  biped: [[
    ".....oooooooooo.....",
    ".....oMGGGGGGMo.....",
    "....ommo....ommo....",
    "....ommo....omMo....",
    "...ommo......omMo...",
    "...omMo......omMo...",
    "..oaaAo......oaaAo..",
    ".oaaaAAo....oaaaAAo.",
    ".ooooooo....ooooooo.",
  ], [
    ".....oooooooooo.....",
    ".....oMGGGGGGMo.....",
    "......ommoommo......",
    "......ommoomMo......",
    "......ommoomMo......",
    "......omMoomMo......",
    ".....oaaAooaaAo.....",
    "....oaaaAAoaaaAAo...",
    "....oooooooooooo....",
  ]],
  flyer: [[
    "....oooooooooooo....",
    "..ooaaamMMMMmaaaoo..",
    ".oaaaAAomMMmoAAaaao.",
    "oaaAAo..omMo..oAAaao",
    ".ooo....oGGo....ooo.",
    "........oeeo........",
    ".........ee.........",
    ".........e..........",
  ], [
    "...oooooooooooooo...",
    ".ooaaaamMMMMmaaaaoo.",
    "oaaAAAAomMMmoAAAAaao",
    ".oooo...omMo...oooo.",
    "........oGGo........",
    "........oeeo........",
    ".........e..........",
  ]],
  tank: [[
    "....oooooooooooo....",
    "...oMmmmmmmmmmmMo...",
    "..oooooooooooooooo..",
    ".oGgGgGgGgGgGgGgGgo.",
    "ogGoaoGgoaoGgoaoGgGo",
    "oGgoAoGgoAoGgoAoGgGo",
    ".oGgGgGgGgGgGgGgGgo.",
    "..oooooooooooooooo..",
  ], [
    "....oooooooooooo....",
    "...oMmmmmmmmmmmMo...",
    "..oooooooooooooooo..",
    ".ogGgGgGgGgGgGgGgGo.",
    "oGgaoGgoaoGgoaoGgoGo",
    "oGgAoGgoAoGgoAoGgoGo",
    ".ogGgGgGgGgGgGgGgGo.",
    "..oooooooooooooooo..",
  ]],
  crawler: [[
    "...oooooooooooooo...",
    "..ommmmmmmmmmmmmMo..",
    "..oMMaaMMaaMMaaMMo..",
    "..oooooooooooooooo..",
    ".oMo.oMo..oMo.oMo...",
    "oMo..oMo..oMo..oMo..",
    "oo...oo...oo....oo..",
  ], [
    "...oooooooooooooo...",
    "..ommmmmmmmmmmmmMo..",
    "..oMMaaMMaaMMaaMMo..",
    "..oooooooooooooooo..",
    "...oMo.oMo..oMo.oMo.",
    "...oMo..oMo..oMo.oMo",
    "....oo...oo...oo..oo",
  ]],
  wheels: [[
    ".....oooooooooo.....",
    "....oMmmmmmmmmmMo...",
    "...oooooooooooooo...",
    "..oGGGo......oGGGo..",
    ".oGgggGo....oGgggGo.",
    ".oGgoggo....oGgoggo.",
    ".oGgggGo....oGgggGo.",
    "..oGGGo......oGGGo..",
    "...ooo........ooo...",
  ], [
    ".....oooooooooo.....",
    "....oMmmmmmmmmmMo...",
    "...oooooooooooooo...",
    "..oGGGo......oGGGo..",
    ".oGgogGo....oGgogGo.",
    ".oGgggGo....oGgggGo.",
    ".oGggogo....oGggogo.",
    "..oGGGo......oGGGo..",
    "...ooo........ooo...",
  ]],
  swimmer: [[
    ".......oooooo.......",
    "......oMmmmmMo......",
    ".....oommmmmmoo.....",
    ".....omMMMMMMMo.....",
    "......oaaaaaao......",
    ".......oaAAao.......",
    "......oaAooAao......",
    ".....oaAo..oAao.....",
    ".....ooo....ooo.....",
  ], [
    ".......oooooo.......",
    "......oMmmmmMo......",
    ".....oommmmmmoo.....",
    ".....omMMMMMMMo.....",
    "......oaaaaaao......",
    ".......oaAAao.......",
    ".......oaAAao.......",
    "......oaAooAao......",
    "......ooo..ooo......",
  ]],
};

export const HEAD_STYLES = Object.keys(HEADS);
const BODY_HEADS = {
  biped: ["horn", "crest", "ears", "pincer", "dome"],
  flyer: ["antenna", "crest", "horn", "dome", "ears"],
  tank: ["dome", "crest", "horn", "pincer", "ears"],
  crawler: ["pincer", "antenna", "horn", "dome", "crest"],
  wheels: ["dome", "ears", "crest", "antenna", "horn"],
  swimmer: ["crest", "dome", "pincer", "antenna", "ears"],
};
const byId = (id) => DATA.robots.find((r) => r.id === id);

export function headStyleOf(id) {
  const r = byId(id);
  const n = parseInt(id.slice(1), 10) || 0;
  const list = BODY_HEADS[r.body] || HEAD_STYLES;
  return list[n % list.length];
}

// ---------------------------------------------------------------- colour
const q5 = (v) => Math.round(Math.max(0, Math.min(255, v)) / 8) * 8; // GBA 15-bit feel
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb(c) { return `rgb(${q5(c[0])},${q5(c[1])},${q5(c[2])})`; }
const mul = (c, f) => c.map((v) => v * f);
const mix = (c, d, f) => c.map((v, i) => v + (d[i] - v) * f);

function palette(colors, broken, dim = 1) {
  if (broken) {
    const g = [[60, 64, 76], [40, 42, 52], [90, 94, 106], [70, 72, 84], [48, 50, 60]];
    return { o: rgb([16, 16, 24]), m: rgb(g[0]), M: rgb(g[1]), l: rgb(g[2]), a: rgb(g[3]), A: rgb(g[4]), e: rgb([30, 30, 36]), w: rgb([110, 110, 120]), g: rgb([80, 84, 96]), G: rgb([46, 48, 58]) };
  }
  const m = mul(hex(colors.main), dim), a = mul(hex(colors.accent), dim), e = hex(colors.eye);
  return {
    o: rgb(mix(mul(m, 0.22), [10, 10, 26], 0.5)), m: rgb(m), M: rgb(mul(m, 0.62)), l: rgb(mix(m, [255, 255, 255], 0.38)),
    a: rgb(a), A: rgb(mul(a, 0.62)), e: rgb(e), w: rgb([248, 248, 248]),
    g: rgb(mul([176, 184, 200], dim)), G: rgb(mul([92, 100, 120], dim)),
  };
}

function blit(ctx, rows, x0, y0, pal, flash) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const k = row[x];
      if (k === ".") continue;
      ctx.fillStyle = flash ? (k === "o" ? "#ffffff" : "#ffffff") : pal[k];
      ctx.fillRect(x0 + x, y0 + y, 1, 1);
    }
  }
}

// ---------------------------------------------------------------- sprites
const cache = new Map();

// build: {head,rarm,larm,legs}; broken: {head,rarm,larm,legs} booleans
export function sprite(build, opts = {}) {
  const { frame = 0, broken = {}, flash = false } = opts;
  const key = [build.head, build.rarm, build.larm, build.legs, +!!broken.head, +!!broken.rarm, +!!broken.larm, +!!broken.legs, frame, +flash].join("|");
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const ctx = c.getContext("2d");
  const H = byId(build.head), RA = byId(build.rarm), LA = byId(build.larm), L = byId(build.legs);
  const legsT = LEGS[L.body] || LEGS.biped;
  const legRows = legsT[frame % legsT.length];
  blit(ctx, ARMS[LA.larm.kind] || ARMS.shoot, 5, 13, palette(LA.colors, broken.larm, 0.72), flash);
  blit(ctx, legRows, 6, 31 - legRows.length + 1, palette(L.colors, broken.legs), flash);
  blit(ctx, TORSO, 10, 12, palette(H.colors, broken.head), flash);
  const head = HEADS[headStyleOf(build.head)];
  blit(ctx, head, 9, 14 - head.length, palette(H.colors, broken.head), flash);
  blit(ctx, ARMS[RA.rarm.kind] || ARMS.shoot, 19, 13, palette(RA.colors, broken.rarm), flash);
  cache.set(key, c);
  return c;
}

// Scale2x (EPX): doubles a pixel sprite and rounds off its diagonal edges.
export function scale2x(src) {
  const w = src.width, h = src.height;
  const sd = src.getContext("2d").getImageData(0, 0, w, h).data;
  const out = document.createElement("canvas");
  out.width = w * 2; out.height = h * 2;
  const og = out.getContext("2d");
  const od = og.createImageData(w * 2, h * 2);
  const px = (x, y) => {
    x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y));
    const i = (y * w + x) * 4;
    return (sd[i] << 24 | sd[i + 1] << 16 | sd[i + 2] << 8 | sd[i + 3]) >>> 0;
  };
  const put = (x, y, v) => {
    const i = (y * w * 2 + x) * 4;
    od.data[i] = v >>> 24; od.data[i + 1] = (v >>> 16) & 255; od.data[i + 2] = (v >>> 8) & 255; od.data[i + 3] = v & 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = px(x, y), A = px(x, y - 1), B = px(x + 1, y), C = px(x - 1, y), D = px(x, y + 1);
    put(2 * x, 2 * y, C === A && C !== D && A !== B ? A : P);
    put(2 * x + 1, 2 * y, A === B && A !== C && B !== D ? B : P);
    put(2 * x, 2 * y + 1, D === C && D !== B && C !== A ? C : P);
    put(2 * x + 1, 2 * y + 1, B === D && B !== A && D !== C ? D : P);
  }
  og.putImageData(od, 0, 0);
  return out;
}

const urlCache = new Map();
export function spriteURL(build, scale = 4, opts = {}) {
  const key = JSON.stringify([build.head, build.rarm, build.larm, build.legs, scale, !!opts.flip, !!opts.smooth, opts.frame || 0]);
  if (urlCache.has(key)) return urlCache.get(key);
  let s = sprite(build, opts);
  let k = scale;
  if (opts.smooth && scale >= 2) { s = scale2x(s); k = scale / 2; }
  const c = document.createElement("canvas");
  c.width = 32 * scale; c.height = 32 * scale;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (opts.flip) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(s, 0, 0, s.width * k, s.height * k);
  const url = c.toDataURL();
  urlCache.set(key, url);
  return url;
}

export function spriteImg(build, scale = 4, opts = {}) {
  return `<img class="px" width="${32 * scale}" height="${32 * scale}" alt="" src="${spriteURL(build, scale, opts)}">`;
}

// ---------------------------------------------------------------- 3x5 pixel font
const FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
  K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
  P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
  Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
  4: "101101111001001", 5: "111100110001110", 6: "011100110101010", 7: "111001010010010", 8: "010101010101010",
  9: "010101011001110", "!": "010010010000010", "+": "000010111010000", "-": "000000111000000", ".": "000000000000010",
  " ": "000000000000000", "?": "110001010000010",
};

export function drawText(ctx, text, x, y, color = "#fff", shadow = "#000", scale = 1) {
  const s = String(text).toUpperCase();
  for (let pass = 0; pass < 2; pass++) {
    ctx.fillStyle = pass === 0 ? shadow : color;
    const off = pass === 0 ? scale : 0;
    let cx = x;
    for (const ch of s) {
      const g = FONT[ch] || FONT["?"];
      for (let i = 0; i < 15; i++) if (g[i] === "1") ctx.fillRect(cx + (i % 3) * scale + off, y + Math.floor(i / 3) * scale + off, scale, scale);
      cx += 4 * scale;
    }
  }
}

export const textWidth = (text, scale = 1) => String(text).length * 4 * scale - scale;

// validation helper for tests
export const TEMPLATES = { HEADS, TORSO, ARMS, LEGS };
