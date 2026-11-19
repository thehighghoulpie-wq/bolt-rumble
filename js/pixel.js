// 8-bit sprite kit: menu pictures of the jointed robots (see rig.js), Scale2x and the 3x5 pixel font.
import { drawRobot, RW, OX, OY } from "./rig.js?v=20";
export { headStyleOf } from "./rig.js?v=20";

// ---------------------------------------------------------------- robots standing still
const cache = new Map();
// build: {head,rarm,larm,legs}; returns the 80x72 robot canvas and where its head top is
export function sprite(build, opts = {}) {
  const key = [build.head, build.rarm, build.larm, build.legs, opts.core || ""].join("|");
  let r = cache.get(key);
  if (r) return r;
  const { canvas, anchors } = drawRobot(build, { t: 0 }, { core: opts.core });
  r = { c: canvas, top: anchors.top[1] };
  cache.set(key, r);
  return r;
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

// Small pictures (scale < 2) zoom in on one part: the head by default, or the part named in opts.focus.
const FOCUS = { legs: [0, -15], rarm: [6, -26], larm: [-2, -26] };
function crop(src, sx, sy, sw, sh) {
  const c = document.createElement("canvas");
  c.width = sw; c.height = sh;
  c.getContext("2d").drawImage(src, -sx, -sy);
  return c;
}
const urlCache = new Map();
export function spriteURL(build, scale = 4, opts = {}) {
  const key = JSON.stringify([build.head, build.rarm, build.larm, build.legs, scale, !!opts.flip, !!opts.smooth, opts.focus || ""]);
  if (urlCache.has(key)) return urlCache.get(key);
  const R = sprite(build);
  let src;
  if (scale < 2) {
    const f = FOCUS[opts.focus];
    src = f ? crop(R.c, OX + f[0] - 16, OY + f[1] - 16, 32, 32) : crop(R.c, OX - 15, Math.max(0, R.top - 3), 32, 32);
  } else src = crop(R.c, OX - 30, OY + 3 - 60, 60, 60);
  const want = Math.round(32 * scale);
  if (opts.smooth && want >= src.width * 2) src = scale2x(src);
  const k = Math.max(1, Math.round(want / src.width));
  const c = document.createElement("canvas");
  c.width = src.width * k; c.height = src.height * k;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  if (opts.flip) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, 0, 0, c.width, c.height);
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
