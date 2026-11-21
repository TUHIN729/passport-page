// The Lighthouse Keeper of Caldara
// An invented passport spread for a country that isn't there.
//
// The Republic of Caldara: a small North Atlantic island republic with no
// airport — every arrival and departure is by ferry. Its holder is Mara
// Ellin Voss, a lighthouse keeper from Port Vey. Every date on the spread
// agrees: passport issued 12 JUN 2024, a Meridia visitor visa issued
// 28 JUN 2024, and a summer 2024 ferry circuit (Caldara -> Meridia ->
// Isle of Tarn -> Caldara) that never predates the passport.
//
// Node 22, standard library only, no network, no randomness:
// two runs write byte-identical PNG files.
// Draws everything by hand: a 5x7 pixel font, shapes, a from-scratch
// PNG encoder (zlib from node:zlib, CRC32 by hand).

import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 4);

type RGB = [number, number, number];

const INK: RGB = [31, 42, 68];        // passport navy
const NAVY: RGB = [38, 58, 96];
const GOLD: RGB = [176, 141, 62];
const CREAM: RGB = [243, 234, 211];
const CREAM2: RGB = [240, 230, 204];
const BURGUNDY: RGB = [138, 47, 53];
const STAMP_BLUE: RGB = [42, 77, 127];
const STAMP_GREEN: RGB = [46, 107, 79];
const GREY: RGB = [96, 104, 112];
const LIGHT_GREY: RGB = [150, 158, 166];
const SKIN: RGB = [216, 165, 131];
const SKIN_DARK: RGB = [196, 143, 108];
const HAIR: RGB = [58, 42, 32];
const JACKET: RGB = [44, 62, 90];
const PAPER_WHITE: RGB = [250, 247, 238];

// ---------------------------------------------------------------- pixels

function put(x: number, y: number, c: RGB, a = 255): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 4;
  if (a >= 255) {
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
  } else {
    const inv = 255 - a;
    buf[i] = Math.round((c[0] * a + buf[i] * inv) / 255);
    buf[i + 1] = Math.round((c[1] * a + buf[i + 1] * inv) / 255);
    buf[i + 2] = Math.round((c[2] * a + buf[i + 2] * inv) / 255);
    buf[i + 3] = 255;
  }
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB, a = 255): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) put(xx, yy, c, a);
  }
}

function rectOutline(x: number, y: number, w: number, h: number, c: RGB, t = 1, a = 255): void {
  fillRect(x, y, w, t, c, a);
  fillRect(x, y + h - t, w, t, c, a);
  fillRect(x, y, t, h, c, a);
  fillRect(x + w - t, y, t, h, c, a);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 255): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    put(x0 + (dx * i) / steps, y0 + (dy * i) / steps, c, a);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB, a = 255): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    const dy = y - cy;
    const hw = Math.sqrt(Math.max(0, r * r - dy * dy));
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) put(x, y, c, a);
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 255): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y - cy) / ry;
    const hw = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) put(x, y, c, a);
  }
}

function ellipseOutline(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 255): void {
  let px = cx + rx;
  let py = cy;
  for (let deg = 1; deg <= 360; deg++) {
    const t = (deg * Math.PI) / 180;
    const x = cx + rx * Math.cos(t);
    const y = cy + ry * Math.sin(t);
    line(px, py, x, y, c, a);
    px = x; py = y;
  }
}

function fillPolygon(pts: [number, number][], c: RGB, a = 255): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) put(x, y, c, a);
    }
  }
}

function polyOutline(pts: [number, number][], c: RGB, a = 255): void {
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    line(x0, y0, x1, y1, c, a);
  }
}

function starPoints(cx: number, cy: number, rO: number, rI: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rO : rI;
    const t = (Math.PI * i) / 5 - Math.PI / 2;
    pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return pts;
}

function rot(x: number, y: number, cx: number, cy: number, ang: number): [number, number] {
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

// ---------------------------------------------------------------- 5x7 font

const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  ":": ["00000", "01100", "00000", "00000", "00000", "01100", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  ";": ["00000", "01100", "00000", "00000", "01100", "00100", "01000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
};

const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

function glyph(ch: string): string[] {
  return FONT[ch] ?? BLANK;
}

interface TextOpts {
  align?: "left" | "center" | "right";
  sx?: number;
  sy?: number;
  shear?: number; // px shift per row (handwriting slant)
  alpha?: number;
}

function textWidth(s: string, sx: number): number {
  return s.length * 6 * sx - sx;
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB, o: TextOpts = {}): void {
  const sx = o.sx ?? scale;
  const sy = o.sy ?? scale;
  const a = o.alpha ?? 255;
  const shear = o.shear ?? 0;
  let x0 = x;
  const w = textWidth(s, sx);
  if (o.align === "center") x0 = x - w / 2;
  if (o.align === "right") x0 = x - w;
  for (let i = 0; i < s.length; i++) {
    const g = glyph(s[i]);
    const gx = x0 + i * 6 * sx;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") {
          const px = gx + col * sx + Math.round((r - 3) * shear);
          for (let dy = 0; dy < sy; dy++) {
            for (let dx = 0; dx < sx; dx++) put(px + dx, y + r * sy + dy, c, a);
          }
        }
      }
    }
  }
}

// Rotated text, centred on (cx, cy).
function drawTextAngle(cx: number, cy: number, s: string, scale: number, c: RGB, deg: number, a = 255): void {
  const ang = (deg * Math.PI) / 180;
  const w = textWidth(s, scale);
  const h = 7 * scale;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  for (let i = 0; i < s.length; i++) {
    const g = glyph(s[i]);
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] !== "1") continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = i * 6 * scale + col * scale + dx - w / 2;
            const py = r * scale + dy - h / 2;
            put(cx + px * cos - py * sin, cy + px * sin + py * cos, c, a);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- MRZ

function mrzValue(ch: string): number {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") return ch.charCodeAt(0) - 55;
  return 0;
}

function mrzCheck(s: string): string {
  const w = [7, 3, 1];
  let t = 0;
  for (let i = 0; i < s.length; i++) t += mrzValue(s[i]) * w[i % 3];
  return String(t % 10);
}

function buildMrz(): [string, string] {
  const line1 = "P<CD" + "VOSS<<MARA<ELLIN" + "<".repeat(24);
  const doc = "CD4471902";
  const dob = "880314";
  const exp = "340612";
  const pers = "<".repeat(14);
  const core =
    doc + mrzCheck(doc) + "CD" + dob + mrzCheck(dob) + "F" + exp + mrzCheck(exp) + pers;
  const composite = mrzCheck(doc + mrzCheck(doc) + dob + mrzCheck(dob) + exp + mrzCheck(exp) + pers + mrzCheck(pers));
  const line2 = core + mrzCheck(pers) + composite;
  return [line1, line2];
}

// ---------------------------------------------------------------- motifs

// Caldara's arms: a gold-rimmed shield, a white lighthouse over three
// waves, a gold star above. Drawn from scratch, at any size.
function drawArms(cx: number, cy: number, s: number): void {
  const w = 58 * s;
  const h = 70 * s;
  const top = cy - h / 2;
  const pts: [number, number][] = [
    [cx - w / 2, top],
    [cx + w / 2, top],
    [cx + w / 2, top + h * 0.55],
    [cx + w * 0.28, top + h * 0.82],
    [cx, top + h],
    [cx - w * 0.28, top + h * 0.82],
    [cx - w / 2, top + h * 0.55],
  ];
  fillPolygon(pts, GOLD);
  const inner = pts.map(([x, y]): [number, number] => [
    cx + (x - cx) * 0.9,
    cy + (y - cy) * 0.9,
  ]);
  fillPolygon(inner, NAVY);
  // lighthouse tower
  const tw = 10 * s;
  const th = 30 * s;
  const tx = cx - tw / 2;
  const ty = top + h * 0.18;
  fillPolygon(
    [[tx, ty + th], [tx + tw, ty + th], [tx + tw * 0.78, ty], [tx + tw * 0.22, ty]],
    PAPER_WHITE,
  );
  fillRect(tx - 1 * s, ty + th * 0.45, tw + 2 * s, 3 * s, BURGUNDY);
  fillRect(cx - 6 * s, ty - 7 * s, 12 * s, 7 * s, PAPER_WHITE); // lamp room
  fillRect(cx - 7 * s, ty - 8 * s, 14 * s, 2 * s, GOLD); // lamp roof
  // light beams
  fillPolygon([[cx - 6 * s, ty - 4 * s], [cx - 26 * s, ty - 12 * s], [cx - 26 * s, ty + 2 * s]], [232, 214, 150], 150);
  fillPolygon([[cx + 6 * s, ty - 4 * s], [cx + 26 * s, ty - 12 * s], [cx + 26 * s, ty + 2 * s]], [232, 214, 150], 150);
  // star above the lamp
  fillPolygon(starPoints(cx, top + 2 * s, 5 * s, 2 * s), GOLD);
  // three waves at the foot
  for (let k = 0; k < 3; k++) {
    const wy = top + h * (0.66 + k * 0.09);
    let px = cx - w * 0.36;
    let py = wy;
    for (let x = cx - w * 0.36; x <= cx + w * 0.36; x += 3) {
      const yy = wy + Math.sin((x / (w * 0.36)) * Math.PI * 2 + k) * 2 * s;
      line(px, py, x, yy, PAPER_WHITE, 220);
      px = x; py = yy;
    }
  }
}

// A small lighthouse mark used inside the visa sticker.
function drawLighthouseMark(cx: number, cy: number, s: number, c: RGB): void {
  fillPolygon(
    [[cx - 5 * s, cy + 12 * s], [cx + 5 * s, cy + 12 * s], [cx + 3 * s, cy - 8 * s], [cx - 3 * s, cy - 8 * s]],
    c,
  );
  fillRect(cx - 4 * s, cy - 13 * s, 8 * s, 5 * s, c);
  fillPolygon([[cx - 4 * s, cy - 11 * s], [cx - 14 * s, cy - 15 * s], [cx - 14 * s, cy - 8 * s]], c, 140);
  fillPolygon([[cx + 4 * s, cy - 11 * s], [cx + 14 * s, cy - 15 * s], [cx + 14 * s, cy - 8 * s]], c, 140);
  line(cx - 14 * s, cy + 12 * s, cx + 14 * s, cy + 12 * s, c);
  line(cx - 12 * s, cy + 16 * s, cx + 12 * s, cy + 16 * s, c);
}

// Portrait of Mara Ellin Voss, drawn from shapes: dark hair in a bun,
// lighthouse-keeper's navy jacket, plain studio backdrop.
function drawPortrait(x: number, y: number, w: number, h: number): void {
  // backdrop
  for (let yy = y; yy < y + h; yy++) {
    const t = (yy - y) / h;
    const c: RGB = [
      Math.round(178 - 22 * t),
      Math.round(192 - 20 * t),
      Math.round(200 - 18 * t),
    ];
    fillRect(x, yy, w, 1, c);
  }
  const cx = x + w / 2;
  // shoulders / jacket
  fillPolygon(
    [[x + 8, y + h], [x + w - 8, y + h], [x + w - 18, y + h * 0.72], [cx + 22, y + h * 0.66], [cx - 22, y + h * 0.66], [x + 18, y + h * 0.72]],
    JACKET,
  );
  // shirt collar
  fillPolygon([[cx - 16, y + h * 0.68], [cx, y + h * 0.82], [cx + 16, y + h * 0.68], [cx + 10, y + h * 0.66], [cx, y + h * 0.72], [cx - 10, y + h * 0.66]], PAPER_WHITE);
  // neck
  fillRect(cx - 11, y + h * 0.52, 22, h * 0.18, SKIN_DARK);
  // ears
  fillEllipse(cx - 33, y + h * 0.36, 6, 9, SKIN);
  fillEllipse(cx + 33, y + h * 0.36, 6, 9, SKIN);
  // hair mass behind head + bun
  fillCircle(cx + 30, y + h * 0.08, 12, HAIR);
  fillEllipse(cx, y + h * 0.3, 38, 40, HAIR);
  // face
  fillEllipse(cx, y + h * 0.36, 33, 39, SKIN);
  // hairline fringe
  fillPolygon(
    [[cx - 33, y + h * 0.3], [cx + 33, y + h * 0.3], [cx + 30, y + h * 0.14], [cx + 12, y + h * 0.06], [cx - 10, y + h * 0.1], [cx - 28, y + h * 0.16]],
    HAIR,
  );
  // brows
  line(cx - 20, y + h * 0.31, cx - 8, y + h * 0.305, HAIR);
  line(cx + 8, y + h * 0.305, cx + 20, y + h * 0.31, HAIR);
  // eyes
  fillEllipse(cx - 14, y + h * 0.34, 4, 2.5, [40, 32, 28]);
  fillEllipse(cx + 14, y + h * 0.34, 4, 2.5, [40, 32, 28]);
  // nose
  line(cx, y + h * 0.35, cx - 1, y + h * 0.44, SKIN_DARK);
  line(cx - 2, y + h * 0.44, cx + 3, y + h * 0.44, SKIN_DARK);
  // mouth
  line(cx - 8, y + h * 0.52, cx - 2, y + h * 0.535, [138, 74, 58]);
  line(cx - 2, y + h * 0.535, cx + 3, y + h * 0.535, [138, 74, 58]);
  line(cx + 3, y + h * 0.535, cx + 8, y + h * 0.52, [138, 74, 58]);
  // soft cheek shading
  fillEllipse(cx - 20, y + h * 0.45, 7, 4, SKIN_DARK, 60);
  fillEllipse(cx + 20, y + h * 0.45, 7, 4, SKIN_DARK, 60);
}

// ---------------------------------------------------------------- stamps

function stampRect(
  cx: number, cy: number, w: number, h: number, deg: number,
  c: RGB, lines: string[], scale = 1,
): void {
  const ang = (deg * Math.PI) / 180;
  const corners: [number, number][] = [
    rot(cx - w / 2, cy - h / 2, cx, cy, ang),
    rot(cx + w / 2, cy - h / 2, cx, cy, ang),
    rot(cx + w / 2, cy + h / 2, cx, cy, ang),
    rot(cx - w / 2, cy + h / 2, cx, cy, ang),
  ];
  polyOutline(corners, c, 200);
  const inset = 5;
  const inner: [number, number][] = [
    rot(cx - w / 2 + inset, cy - h / 2 + inset, cx, cy, ang),
    rot(cx + w / 2 - inset, cy - h / 2 + inset, cx, cy, ang),
    rot(cx + w / 2 - inset, cy + h / 2 - inset, cx, cy, ang),
    rot(cx - w / 2 + inset, cy + h / 2 - inset, cx, cy, ang),
  ];
  polyOutline(inner, c, 160);
  const lh = 9 * scale + 3;
  const total = lines.length * lh;
  lines.forEach((s, i) => {
    drawTextAngle(cx, cy - total / 2 + lh * i + lh / 2 - 4 * scale, s, scale, c, deg, 210);
  });
}

function stampOval(
  cx: number, cy: number, rx: number, ry: number, deg: number,
  c: RGB, lines: string[], scale = 1,
): void {
  const ang = (deg * Math.PI) / 180;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  let px = cx + rx * cos;
  let py = cy + rx * sin;
  for (let d = 1; d <= 180; d++) {
    const t = (d * 2 * Math.PI) / 180;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    const x = cx + ex * cos - ey * sin;
    const y = cy + ex * sin + ey * cos;
    line(px, py, x, y, c, 200);
    px = x; py = y;
  }
  const lh = 9 * scale + 3;
  const total = lines.length * lh;
  lines.forEach((s, i) => {
    drawTextAngle(cx, cy - total / 2 + lh * i + lh / 2 - 4 * scale, s, scale, c, deg, 210);
  });
}

// ---------------------------------------------------------------- guilloche

function waveLine(x0: number, x1: number, y: number, amp: number, period: number, c: RGB, a: number): void {
  let px = x0;
  let py = y;
  for (let x = x0; x <= x1; x += 4) {
    const yy = y + Math.sin(((x - x0) / period) * Math.PI * 2) * amp;
    line(px, py, x, yy, c, a);
    px = x; py = yy;
  }
}

// ---------------------------------------------------------------- build

function build(): void {
  // desk background: quiet slate gradient
  for (let y = 0; y < H; y++) {
    const t = y / H;
    fillRect(0, y, W, 1, [
      Math.round(54 - 18 * t),
      Math.round(68 - 20 * t),
      Math.round(79 - 22 * t),
    ]);
  }

  const SX = 60;   // spread left
  const SY = 110;  // spread top
  const SW = 904;  // spread width
  const SH = 790;  // spread height
  const MID = SX + SW / 2;

  // drop shadow under the open passport
  fillRect(SX + 10, SY + 14, SW, SH, [10, 14, 18], 120);
  // cover edge peeking out
  fillRect(SX - 6, SY - 6, SW + 12, SH + 12, [28, 40, 58]);
  // pages
  fillRect(SX, SY, SW / 2, SH, CREAM);
  fillRect(MID, SY, SW / 2, SH, CREAM2);
  // gutter shadow
  for (let i = 0; i < 14; i++) {
    fillRect(MID - 14 + i, SY, 1, SH, [60, 50, 30], Math.round(70 - i * 5));
    fillRect(MID + i, SY, 1, SH, [60, 50, 30], Math.round(70 - i * 5));
  }
  line(MID, SY, MID, SY + SH, [120, 100, 60], 160);
  // gold inner rules
  rectOutline(SX + 14, SY + 14, SW / 2 - 28, SH - 28, GOLD, 2, 200);
  rectOutline(MID + 14, SY + 14, SW / 2 - 28, SH - 28, GOLD, 2, 200);

  // faint guilloche across both pages
  for (let k = 0; k < 5; k++) {
    waveLine(SX + 24, MID - 24, SY + 300 + k * 120, 3, 46, [150, 130, 80], 26);
    waveLine(MID + 24, SX + SW - 24, SY + 300 + k * 120, 3, 46, [150, 130, 80], 26);
  }

  // ================= LEFT PAGE: DATA PAGE =================
  const L = SX + 24;            // left content edge
  const R = MID - 24;           // right content edge
  const CX = (L + R) / 2;

  drawArms(CX, SY + 62, 0.95);
  drawText(CX, SY + 108, "REPUBLIC OF CALDARA", 3, INK, { align: "center" });
  drawText(CX, SY + 136, "P A S S P O R T", 2, NAVY, { align: "center" });
  fillRect(L + 40, SY + 168, R - L - 80, 2, GOLD);
  fillRect(L + 40, SY + 173, R - L - 80, 1, GOLD);

  drawText(L, SY + 188, "TYPE  P", 2, INK);
  drawText(L + 110, SY + 188, "CODE  CD", 2, INK);
  drawText(R, SY + 188, "NO. CD 4471 902", 2, INK, { align: "right" });

  // portrait box
  const PX = L + 8;
  const PY = SY + 222;
  const PW = 140;
  const PH = 168;
  rectOutline(PX - 3, PY - 3, PW + 6, PH + 6, NAVY, 2);
  drawPortrait(PX, PY, PW, PH);
  // photo corner marks
  drawText(PX + PW / 2, PY + PH + 10, "PHOTO", 1, GREY, { align: "center" });

  // fields beside the portrait
  const FX = PX + PW + 22;
  const fields: [string, string][] = [
    ["SURNAME", "VOSS"],
    ["GIVEN NAMES", "MARA ELLIN"],
    ["NATIONALITY", "CALDARAN"],
    ["DATE OF BIRTH", "14 MAR 1988"],
    ["PLACE OF BIRTH", "PORT VEY"],
    ["SEX", "F"],
  ];
  let fy = PY + 2;
  for (const [label, value] of fields) {
    drawText(FX, fy, label, 1, GREY);
    drawText(FX, fy + 10, value, 2, INK);
    fy += 29;
  }

  // lower fields
  const LY = PY + PH + 34;
  drawText(L, LY, "DATE OF ISSUE", 1, GREY);
  drawText(L, LY + 10, "12 JUN 2024", 2, INK);
  drawText(L + 190, LY, "DATE OF EXPIRY", 1, GREY);
  drawText(L + 190, LY + 10, "12 JUN 2034", 2, INK);
  drawText(L, LY + 34, "AUTHORITY", 1, GREY);
  drawText(L, LY + 44, "PORT VEY PASSPORT OFFICE", 2, INK);
  drawText(L, LY + 68, "OCCUPATION", 1, GREY);
  drawText(L, LY + 78, "LIGHTHOUSE KEEPER", 2, INK);

  // signature
  const SIGY = LY + 118;
  line(L + 6, SIGY + 8, L + 60, SIGY + 2, INK);
  line(L + 60, SIGY + 2, L + 96, SIGY + 10, INK);
  line(L + 96, SIGY + 10, L + 130, SIGY + 4, INK);
  line(L + 130, SIGY + 4, L + 168, SIGY + 9, INK);
  line(L + 168, SIGY + 9, L + 196, SIGY + 5, INK);
  drawText(L, SIGY + 16, "HOLDER'S SIGNATURE", 1, GREY);

  // observation — the telling detail, on the data page too
  const OBY = SIGY + 44;
  rectOutline(L, OBY, R - L, 40, BURGUNDY, 1, 200);
  drawText(L + 8, OBY + 6, "OBSERVATION:", 1, BURGUNDY);
  drawText(L + 8, OBY + 18, "HOLDER EXEMPT FROM TIDE TAX ON", 1, INK);
  drawText(L + 8, OBY + 28, "RETURN TO CALDARA.", 1, INK);

  // machine-readable zone
  const [mrz1, mrz2] = buildMrz();
  const MZY = SY + SH - 84;
  fillRect(L, MZY - 8, R - L, 66, PAPER_WHITE);
  rectOutline(L, MZY - 8, R - L, 66, LIGHT_GREY, 1);
  drawText(CX, MZY, mrz1, 2, INK, { align: "center", sx: 1, sy: 2 });
  drawText(CX, MZY + 22, mrz2, 2, INK, { align: "center", sx: 1, sy: 2 });
  drawText(L, SY + SH - 30, "CD 4471 902", 1, GREY);
  drawText(R, SY + SH - 30, "04", 1, GREY, { align: "right" });

  // ================= RIGHT PAGE: VISAS =================
  const VL = MID + 24;
  const VR = SX + SW - 24;
  const VCX = (VL + VR) / 2;

  // watermark arms, faint, behind the stamps
  drawArms(VCX, SY + 480, 2.6);
  // (re-ink the watermark faintly: redraw in cream over it is complex,
  //  so instead it was drawn in full colour — soften by overlaying cream)
  fillRect(MID + 14, SY + 14, SW / 2 - 28, SH - 28, CREAM2, 178);

  drawText(VCX, SY + 34, "VISAS", 3, INK, { align: "center" });
  drawText(VR, SY + 40, "PAGE 07", 1, GREY, { align: "right" });
  fillRect(VL + 60, SY + 66, VR - VL - 120, 2, GOLD);

  // Meridia visitor visa sticker
  const VX = VL + 30;
  const VY = SY + 86;
  const VW = 260;
  const VH = 128;
  fillRect(VX, VY, VW, VH, [238, 244, 232]);
  rectOutline(VX, VY, VW, VH, STAMP_GREEN, 3);
  rectOutline(VX + 6, VY + 6, VW - 12, VH - 12, STAMP_GREEN, 1, 180);
  drawLighthouseMark(VX + 30, VY + 30, 1.4, STAMP_GREEN);
  drawText(VX + 56, VY + 12, "MERIDIA", 3, STAMP_GREEN);
  drawText(VX + 56, VY + 38, "VISITOR VISA", 2, STAMP_GREEN);
  drawText(VX + 14, VY + 62, "VALID 30 DAYS - SINGLE ENTRY", 1, INK);
  drawText(VX + 14, VY + 76, "FERRY ONLY - NO AIR ARRIVAL", 1, INK);
  drawText(VX + 14, VY + 90, "ISSUED 28 JUN 2024 - PORT LUME", 1, INK);
  drawText(VX + 14, VY + 104, "NO. MV-2024-1187", 1, GREY);

  // travel history, in order, none predating the passport (12 JUN 2024)
  stampRect(VCX - 105, SY + 268, 190, 62, -8, NAVY,
    ["EXIT - CALDARA", "PORT VEY", "03 JUL 2024"], 1);
  stampOval(VCX + 105, SY + 268, 92, 40, 6, STAMP_BLUE,
    ["ENTRY - MERIDIA", "PORT LUME", "04 JUL 2024"], 1);
  stampRect(VCX - 105, SY + 352, 190, 62, 5, NAVY,
    ["EXIT - MERIDIA", "PORT LUME", "21 JUL 2024"], 1);
  stampOval(VCX + 105, SY + 352, 92, 40, -6, STAMP_GREEN,
    ["ENTRY - ISLE OF TARN", "TARN QUAY", "22 JUL 2024"], 1);
  stampRect(VCX - 105, SY + 436, 190, 62, -4, STAMP_GREEN,
    ["EXIT - ISLE OF TARN", "TARN QUAY", "09 AUG 2024"], 1);
  stampOval(VCX + 105, SY + 436, 92, 40, 8, NAVY,
    ["ENTRY - CALDARA", "PORT VEY", "10 AUG 2024"], 1);

  // tide-tax fee stamp
  stampRect(VCX, SY + 528, 210, 44, -2, BURGUNDY,
    ["TIDE TAX PAID - 12 CRL"], 1);

  // the telling paperwork detail: Caldara has no airport
  const CBY = SY + 586;
  rectOutline(VL, CBY, VR - VL, 96, INK, 2);
  fillRect(VL, CBY, VR - VL, 20, INK);
  drawText(VL + 10, CBY + 6, "CONDITION OF ENTRY - ART. 9, HARBOURS ACT", 1, PAPER_WHITE);
  drawText(VL + 10, CBY + 30, "NO AIRPORT ON CALDARA. ALL ARRIVALS BY", 1, INK);
  drawText(VL + 10, CBY + 44, "FERRY FROM PORT LUME OR TARN QUAY.", 1, INK);
  drawText(VL + 10, CBY + 58, "FERRY M.V. SELKIE SAILS 07:40 DAILY.", 1, INK);
  drawText(VL + 10, CBY + 72, "OVERSTAY FEE: 4 CRL PER TIDE.", 1, BURGUNDY);

  // handwritten note from the quay, in slanted ink
  drawText(VL + 8, CBY + 108, "SELKIE 07:40 - SEE YOU AT THE QUAY", 2, STAMP_BLUE, { shear: 0.6 });

  drawText(VL, SY + SH - 30, "VISAS - CONTINUED OVERLEAF", 1, GREY);
  drawText(VR, SY + SH - 30, "07", 1, GREY, { align: "right" });
}

// ---------------------------------------------------------------- PNG out

const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0;
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 4;
      const di = y * (1 + W * 4) + 1 + x * 4;
      raw[di] = buf[si];
      raw[di + 1] = buf[si + 1];
      raw[di + 2] = buf[si + 2];
      raw[di + 3] = buf[si + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function main(): void {
  build();
  const png = encodePng();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, "entry.png");
  writeFileSync(out, png);
  console.log(`wrote ${out} ${png.length} bytes sha256=${createHash("sha256").update(png).digest("hex")}`);
}

main();
