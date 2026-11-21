// THE 20 NOVEMBER PROOF PAGE — a one-day world news front page.
// Drawn entirely in code: a hand-written bitmap font, vector scenes,
// and a hand-rolled PNG encoder. No image files, no font files, no network.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// Palette: warm newsprint, black ink, one accent per region desk.
const PAPER = [246, 241, 227];
const INK = [20, 18, 16];
const SOFT = [96, 88, 72];
const RULE = [178, 170, 150];
const BLUE = [46, 74, 122];
const BLUE_TINT = [220, 228, 240];
const OCHRE = [168, 116, 26];
const OCHRE_TINT = [240, 230, 204];
const RED = [168, 50, 38];
const RED_TINT = [243, 222, 218];
const TEAL = [31, 110, 107];
const TEAL_TINT = [210, 232, 228];
const GREEN = [74, 122, 46];
const GREEN_TINT = [222, 234, 210];
const BROWN = [138, 90, 43];
const BROWN_TINT = [238, 226, 208];
const INDIGO = [74, 74, 138];
const INDIGO_TINT = [222, 222, 238];
const SLATE = [85, 82, 74];
const SLATE_TINT = [232, 230, 222];
const ORANGE = [224, 123, 0];
const SEA = [38, 84, 130];
const SKY = [214, 226, 238];

// ---- CRC32 (PNG chunk checksums) ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE.push(c >>> 0);
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(rgb: Uint8Array, width: number, height: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    const src = y * width * 3;
    const dst = y * (1 + width * 3) + 1;
    for (let i = 0; i < width * 3; i++) raw[dst + i] = rgb[src + i];
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Framebuffer: a plain RGB canvas with tiny vector helpers ----
class Page {
  buf: Uint8Array;
  constructor() {
    this.buf = new Uint8Array(W * H * 3);
    this.fill(PAPER);
  }
  fill(c: number[]) {
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = c[0];
      this.buf[i * 3 + 1] = c[1];
      this.buf[i * 3 + 2] = c[2];
    }
  }
  px(x: number, y: number, c: number[]) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }
  rect(x: number, y: number, w: number, h: number, c: number[]) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) this.px(i, j, c);
    }
  }
  frame(x: number, y: number, w: number, h: number, c: number[]) {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }
  hline(x: number, y: number, w: number, c: number[]) {
    this.rect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: number[]) {
    this.rect(x, y, 1, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number[]) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.px(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
  disc(cx: number, cy: number, r: number, c: number[]) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) this.px(cx + x, cy + y, c);
      }
    }
  }
  ring(cx: number, cy: number, r: number, c: number[]) {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }
  polyline(pts: number[][], c: number[]) {
    for (let i = 0; i + 1 < pts.length; i++) {
      this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c);
    }
  }
}

// ---- Bitmap font: 5 wide, 7 tall, drawn by hand as text rows ----
// Each glyph is 7 rows of 5 marks; "#" is ink, "." is empty.
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "..##.", ".#...", "#....", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#..", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
};

// Punctuation and symbols, same 5-by-7 grid.
const PUNCT: Record<string, string[]> = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "—": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "(": ["...#.", "..#..", "..#..", "..#..", "..#..", "..#..", "...#."],
  ")": [".#...", "..#..", "..#..", "..#..", "..#..", "..#..", ".#..."],
  "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.###", "#..##"],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "&": [".##..", "#..#.", "#..#.", ".#...", "#.#.#", "#..#.", ".##.#"],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "*": [".....", ".#.#.", "..#..", "#####", "..#..", ".#.#.", "....."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "|": ["..#..", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.###", "#....", ".###."],
  "·": [".....", ".....", "..#..", ".....", ".....", ".....", "....."],
  "°": [".##..", "#..#.", ".##..", ".....", ".....", ".....", "....."],
};
const GLYPHS: Record<string, string[]> = { ...FONT, ...PUNCT };

// ---- Text rendering ----
function glyphWidth(scale: number): number {
  return 5 * scale + 1;
}
function textWidth(s: string, scale: number): number {
  return s.length * glyphWidth(scale) - 1;
}
function drawText(p: Page, s: string, x: number, y: number, scale: number, c: number[], bold = false) {
  let cx = x;
  const adv = glyphWidth(scale);
  for (const ch of s) {
    const g = GLYPHS[ch] || GLYPHS[" "];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "#") {
          p.rect(cx + col * scale, y + r * scale, scale, scale, c);
          if (bold) p.rect(cx + col * scale + 1, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += adv;
  }
}
function drawCentered(p: Page, s: string, y: number, scale: number, c: number[], bold = false) {
  drawText(p, s, Math.round((W - textWidth(s, scale)) / 2), y, scale, c, bold);
}
function wrapLine(s: string, maxChars: number): string[] {
  // Greedy word wrap for a fixed character budget per line.
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---- The day's stories (36 dispatches, 9 lead + 27 supporting) ----
// Every line is kept to 28 characters so it fits a card at scale 2.
interface LeadCard {
  art: string;
  accent: number[];
  tint: number[];
  lines: string[];
  stamp: string;
}
const LEAD: LeadCard[] = [
  {
    art: "kyiv",
    accent: BLUE,
    tint: BLUE_TINT,
    lines: ["400+ DRONES, 110 MISSILES", "STRIKE KYIV, 3 BRIDGES HIT", "8 KILLED, 28 HURT [01][02]"],
    stamp: "EV 19-20 NOV · SRC 20 NOV",
  },
  {
    art: "akvan",
    accent: TEAL,
    tint: TEAL_TINT,
    lines: ["AKVAN HITS GOPALPUR, GUSTS 90", "300,000 EVACUATED [26]", "9,341 SHELTERS OPEN"],
    stamp: "EV 08:30 IST · SRC 20 NOV",
  },
  {
    art: "markets",
    accent: RED,
    tint: RED_TINT,
    lines: ["S&P -3.70% · DOW -1.93% [15]", "NASDAQ -5.28% · NVIDIA -14%", "REPORTS OF SEC PROBE [16]"],
    stamp: "EV 20 NOV · SRC 20 NOV",
  },
  {
    art: "icj",
    accent: OCHRE,
    tint: OCHRE_TINT,
    lines: ["ICJ AT THE HAGUE RULES [10]", "MYANMAR GUILTY: ROHINGYA", "FIRST STATE GENOCIDE VERDICT"],
    stamp: "EV 19 NOV · SRC 20 NOV",
  },
  {
    art: "hormuz",
    accent: OCHRE,
    tint: OCHRE_TINT,
    lines: ["HORMUZ TANKER ABLAZE [12]", "OIL TANKER FIRE, SUPPLY FEAR", "IEA: BIGGEST SHOCK ON RECORD"],
    stamp: "EV 20 NOV · SRC 20 NOV",
  },
  {
    art: "shenzhen",
    accent: TEAL,
    tint: TEAL_TINT,
    lines: ["3-WAY SUMMIT IN SHENZHEN [19]", "TRUMP, XI, PUTIN MEET", "US-CHINA AI PACT [20]"],
    stamp: "EV 20 NOV · SRC 20 NOV",
  },
];

interface DeskStory {
  lines: string[];
  ref: string;
}
interface Desk {
  name: string;
  accent: number[];
  tint: number[];
  stories: DeskStory[];
}
const STAMP = "EV 20 NOV · SRC 20 NOV";
const DESKS: Desk[] = [
  {
    name: "EUROPE",
    accent: BLUE,
    tint: BLUE_TINT,
    stories: [
      { lines: ["POLAND: 2 RUSSIAN MISSILES", "FALL IN LUBLIN; NO DEAD"], ref: "[03]" },
      { lines: ["UKRAINE RETAKES 14 VILLAGES", "IN KHARKIV, 200 SQ KM"], ref: "[04]" },
      { lines: ["KERCH BRIDGE HIT BY NEPTUNE", "3 RAIL BREAKS; 1 TRACK BACK"], ref: "[05]" },
      { lines: ["ALLIES AGREE SECURITY PLEDGE", "FOR POST-CEASEFIRE UKRAINE"], ref: "[06]" },
      { lines: ["HUNGARY LIFTS EU VETO ON", "UKRAINE ACCESSION TALKS"], ref: "[07]" },
      { lines: ["ESTONIA TO SHUT RUSSIA BORDER", "FOR 6 MONTHS FROM 1 DEC"], ref: "[08]" },
      { lines: ["NUCLEAR PLANTS CUT OUTPUT", "OUTAGES IN 11 REGIONS"], ref: "[09]" },
    ],
  },
  {
    name: "MIDDLE EAST",
    accent: OCHRE,
    tint: OCHRE_TINT,
    stories: [
      { lines: ["HOUTHI MISSILE HITS RIYADH", "PIF TOWER DAMAGED"], ref: "[11]" },
      { lines: ["US SENATE BLOCKS IRAN WAR", "POWERS VOTE, 51-48"], ref: "[13]" },
      { lines: ["TRUMP: NO RUSH ON IRAN STEP", "WAITS PAST 1 JANUARY"], ref: "[14]" },
    ],
  },
  {
    name: "NORTH AMERICA",
    accent: RED,
    tint: RED_TINT,
    stories: [
      { lines: ["ANTHROPIC SHARES -9% ON DAY 2", "AFTER RECORD $81.3B IPO"], ref: "[17]" },
      { lines: ["BITCOIN NEAR $61,700, LOWEST", "SINCE JULY, 3RD DAY DOWN"], ref: "[18]" },
      { lines: ["US WARNS CHINA COULD CONTROL", "AMERICAN DRUG SUPPLY"], ref: "[22]" },
      { lines: ["GUPTA GETS 19+ YEARS FOR", "NEW YORK MURDER PLOT"], ref: "[23]" },
      { lines: ["CANADA BUDGET PASSES 162-151", "BC'S FIRST TORY GOVT"], ref: "[25]" },
    ],
  },
  {
    name: "ASIA",
    accent: TEAL,
    tint: TEAL_TINT,
    stories: [
      { lines: ["CHINA BARS BLOOMBERG REPORTER", "FROM SHENZHEN SUMMIT"], ref: "[27]" },
      { lines: ["TSMC, SAMSUNG HALT CHIPS", "BOUND FOR CHINA"], ref: "[28]" },
      { lines: ["GOOGLE LAUNCHES GEMINI 4 NEON", "NEW AI MODEL DEBUTS"], ref: "[30]" },
      { lines: ["NVIDIA, MICROSOFT DEEPEN TIE", "VERA RUBIN ON AZURE"], ref: "[31]" },
    ],
  },
  {
    name: "LATIN AMERICA",
    accent: GREEN,
    tint: GREEN_TINT,
    stories: [{ lines: ["PERU QUAKE MAGNITUDE 6.7-6.9", "SHAKES CENTRAL JUNIN"], ref: "[32]" }],
  },
  {
    name: "AFRICA",
    accent: BROWN,
    tint: BROWN_TINT,
    stories: [
      { lines: ["KENYA STARTS 42-DAY COUNTDOWN", "TO EBOLA-FREE STATUS"], ref: "[33]" },
      { lines: ["COP31 DRAFT OMITS FOSSIL FUELS", "TALKS PAST DEADLINE"], ref: "[34]" },
    ],
  },
  {
    name: "OCEANIA",
    accent: INDIGO,
    tint: INDIGO_TINT,
    stories: [
      { lines: ["AU, CANADA, NZ URGE RUSSIA", "CEASEFIRE IN APEC PACT"], ref: "[35]" },
      { lines: ["XI: CHINA-AUSTRALIA RESET", "AFTER ALBANESE MEETING"], ref: "[37]" },
    ],
  },
  {
    name: "GLOBAL DESK",
    accent: SLATE,
    tint: SLATE_TINT,
    stories: [
      { lines: ["CANCER PILL SHRINKS TUMOURS", "IN 60.7% OF PATIENTS"], ref: "[38]" },
      { lines: ["SEC CHARGES 8 IN FAKE CRYPTO", "SCAM, $37M LOST"], ref: "[39]" },
      { lines: ["BINANCE HACKER MOVES $600M", "IN ETHER IN TWO DAYS"], ref: "[40]" },
    ],
  },
];

// ---- Card illustrations: small vector scenes drawn from code ----
// Each scene fills a band (x, y, w, h) inside its lead card.
function drawArt(p: Page, art: string, x: number, y: number, w: number, h: number, accent: number[], tint: number[]) {
  p.rect(x, y, w, h, tint);
  const bottom = y + h;
  if (art === "kyiv") {
    // Night skyline, three bridge spans, one bright burst.
    p.rect(x, y, w, 14, [38, 46, 72]);
    const towers = [0, 18, 44, 66, 92, 118, 150, 176, 202, 234, 262, 288];
    const heights = [16, 26, 12, 30, 20, 34, 14, 28, 18, 32, 22, 26];
    for (let i = 0; i < towers.length; i++) {
      p.rect(x + towers[i], bottom - heights[i], 14, heights[i], INK);
    }
    // Bridge arcs across the lower band.
    p.polyline(
      [
        [x + 8, bottom - 6],
        [x + 60, bottom - 16],
        [x + 120, bottom - 6],
        [x + 180, bottom - 16],
        [x + 240, bottom - 6],
        [x + w - 8, bottom - 16],
      ],
      INK,
    );
    // Burst over the middle bridge.
    const bx = x + 150;
    const by = y + 12;
    p.disc(bx, by, 5, ORANGE);
    p.disc(bx, by, 2, [255, 220, 120]);
    for (let a = 0; a < 8; a++) {
      const rad = (a * Math.PI) / 4;
      p.line(bx, by, Math.round(bx + 11 * Math.cos(rad)), Math.round(by + 11 * Math.sin(rad)), ORANGE);
    }
  } else if (art === "akvan") {
    // Cyclone spiral over a grey sea, rain slanting in.
    const cx = x + 90;
    const cy = y + 18;
    for (let t = 0; t < 250; t++) {
      const ang = t / 22;
      const r = 2 + t / 14;
      p.px(Math.round(cx + r * Math.cos(ang)), Math.round(cy + r * Math.sin(ang) * 0.8), TEAL);
      p.px(Math.round(cx + r * Math.cos(ang)) + 1, Math.round(cy + r * Math.sin(ang) * 0.8), TEAL);
    }
    p.disc(cx, cy, 3, TEAL);
    for (let i = 0; i < 10; i++) {
      const rx = x + 190 + i * 11;
      p.line(rx, y + 4 + (i % 3) * 4, rx - 3, y + 12 + (i % 3) * 4, SEA);
    }
    // Waves along the bottom.
    p.polyline(
      [
        [x + 4, bottom - 8],
        [x + 40, bottom - 12],
        [x + 80, bottom - 8],
        [x + 120, bottom - 12],
        [x + 160, bottom - 8],
        [x + 200, bottom - 12],
        [x + 240, bottom - 8],
        [x + w - 4, bottom - 12],
      ],
      SEA,
    );
    p.rect(x, bottom - 3, w, 3, SEA);
  } else if (art === "markets") {
    // A falling market line and three red candles.
    p.rect(x, y, w, h, [250, 238, 232]);
    p.line(x + 10, y + 6, x + 10, bottom - 8, SOFT);
    p.line(x + 10, bottom - 8, x + w - 8, bottom - 8, SOFT);
    const pts = [
      [x + 16, y + 8],
      [x + 60, y + 10],
      [x + 100, y + 18],
      [x + 140, y + 16],
      [x + 180, y + 26],
      [x + 220, y + 24],
      [x + 260, y + 32],
      [x + w - 12, y + 36],
    ];
    p.polyline(pts, RED);
    const candles: number[][] = [
      [52, 10, 12, 14],
      [132, 16, 12, 12],
      [212, 24, 12, 10],
    ];
    for (const c of candles) {
      p.rect(x + c[0], y + c[1], c[2], c[3], RED);
      p.vline(x + c[0] + 6, y + c[1] - 4, c[3] + 8, RED);
    }
  } else if (art === "icj") {
    // A courthouse front: pediment, four columns, steps.
    p.rect(x, y, w, h, OCHRE_TINT);
    p.polyline(
      [
        [x + 60, y + 6],
        [x + 150, y + 6],
        [x + 150, y + 12],
        [x + 60, y + 12],
      ],
      INK,
    );
    p.line(x + 60, y + 12, x + 105, y + 2, INK);
    p.line(x + 150, y + 12, x + 105, y + 2, INK);
    for (let i = 0; i < 4; i++) {
      p.rect(x + 70 + i * 22, y + 14, 8, 18, INK);
    }
    p.rect(x + 58, y + 32, 96, 3, INK);
    p.rect(x + 54, y + 35, 104, 3, INK);
    // Scales of justice at the right.
    const sx = x + 240;
    p.vline(sx, y + 8, 26, INK);
    p.hline(sx - 18, y + 10, 36, INK);
    p.line(sx - 18, y + 10, sx - 12, y + 20, INK);
    p.line(sx - 6, y + 10, sx - 12, y + 20, INK);
    p.line(sx + 18, y + 10, sx + 12, y + 20, INK);
    p.line(sx + 6, y + 10, sx + 12, y + 20, INK);
    p.rect(sx - 16, y + 20, 9, 2, INK);
    p.rect(sx + 8, y + 20, 9, 2, INK);
    p.disc(sx, y + 6, 2, INK);
  } else if (art === "hormuz") {
    // A tanker on a dark strait, flames above the deck, smoke rising.
    p.rect(x, y, w, h, SKY);
    p.rect(x, y + 26, w, h - 26, [52, 96, 138]);
    p.polyline(
      [
        [x + 4, y + 28],
        [x + 40, y + 26],
        [x + 80, y + 28],
        [x + 120, y + 26],
        [x + 160, y + 28],
        [x + 200, y + 26],
        [x + 240, y + 28],
        [x + w - 4, y + 26],
      ],
      [220, 232, 242],
    );
    // Hull and containers.
    p.rect(x + 60, y + 18, 180, 8, INK);
    p.line(x + 60, y + 26, x + 52, y + 18, INK);
    p.line(x + 240, y + 26, x + 248, y + 18, INK);
    p.rect(x + 80, y + 10, 22, 8, RED);
    p.rect(x + 108, y + 10, 22, 8, OCHRE);
    p.rect(x + 136, y + 10, 22, 8, TEAL);
    p.rect(x + 196, y + 8, 12, 10, INK);
    // Flames above the mid deck.
    const fx = x + 170;
    p.polyline(
      [
        [fx - 8, y + 10],
        [fx - 4, y + 2],
        [fx, y + 8],
        [fx + 4, y + 0],
        [fx + 8, y + 10],
      ],
      ORANGE,
    );
    p.disc(fx, y + 6, 3, ORANGE);
    p.disc(fx + 16, y + 2, 3, SOFT);
    p.disc(fx + 24, y + 1, 2, SOFT);
  } else if (art === "shenzhen") {
    // A tower skyline with three flag stripes and three envoys.
    p.rect(x, y, w, h, TEAL_TINT);
    const towers = [0, 26, 54, 84, 112, 142, 172, 200, 228, 256, 282];
    const heights = [14, 24, 18, 30, 20, 26, 16, 28, 22, 30, 18];
    for (let i = 0; i < towers.length; i++) {
      p.rect(x + towers[i], bottom - heights[i] - 8, 18, heights[i], INK);
    }
    p.rect(x, bottom - 8, w, 8, INK);
    // Three flags on poles.
    const flagCols = [RED, [240, 240, 240], BLUE];
    for (let i = 0; i < 3; i++) {
      const fx = x + 44 + i * 26;
      p.vline(fx, y + 4, 16, INK);
      p.rect(fx + 1, y + 4, 14, 8, flagCols[i]);
    }
    // Three figures standing in front.
    for (let i = 0; i < 3; i++) {
      const px = x + 180 + i * 34;
      p.disc(px + 6, bottom - 26, 4, INK);
      p.rect(px + 2, bottom - 21, 8, 13, INK);
    }
  }
}

// ---- Page layout ----
const MX = 14; // side margin
const COLW = 326;
const COLX = [MX, MX + COLW + 8, MX + 2 * (COLW + 8)];

function drawLead(p: Page, card: LeadCard, x: number, y: number) {
  p.frame(x, y, COLW, 114, INK);
  drawArt(p, card.art, x + 4, y + 4, COLW - 8, 36, card.accent, card.tint);
  p.rect(x + 4, y + 40, COLW - 8, 2, card.accent);
  drawText(p, card.lines[0], x + 8, y + 46, 2, INK, true);
  drawText(p, card.lines[1], x + 8, y + 62, 2, INK);
  drawText(p, card.lines[2], x + 8, y + 78, 2, INK);
  p.hline(x + 8, y + 94, COLW - 16, RULE);
  drawText(p, card.stamp, x + 8, y + 98, 2, card.accent, true);
}

function drawDeskColumn(p: Page, desks: Desk[], x: number, y0: number): number {
  let y = y0;
  for (let d = 0; d < desks.length; d++) {
    const desk = desks[d];
    p.rect(x, y, COLW, 18, desk.accent);
    drawText(p, desk.name, x + 5, y + 2, 2, PAPER, true);
    y += 21;
    for (const s of desk.stories) {
      drawText(p, s.lines[0], x + 4, y, 2, INK);
      drawText(p, s.lines[1], x + 4, y + 16, 2, INK);
      drawText(p, STAMP + " " + s.ref, x + 4, y + 32, 2, desk.accent, true);
      y += 48;
    }
    if (d + 1 < desks.length) y += 6;
  }
  return y;
}

function buildPage(): Page {
  const p = new Page();
  // Masthead.
  drawCentered(p, "THE 20 NOVEMBER PROOF PAGE", 14, 5, INK, true);
  p.hline(MX, 54, W - 2 * MX, INK);
  drawCentered(p, "FRIDAY 20 NOVEMBER 2026 · 36 DISPATCHES · 7 REGIONS", 60, 2, INK, true);
  // Banner headline and deck.
  drawCentered(p, "A DAY OF STRIKES, STORMS & VERDICTS", 80, 4, INK, true);
  drawCentered(p, "KYIV BARRAGE · AKVAN LANDFALL · ICJ ROHINGYA RULING", 112, 2, SOFT);
  drawCentered(p, "HORMUZ TANKER FIRE · GLOBAL SELLOFF", 128, 2, SOFT);
  // Lead zone: six illustrated cards, two rows of three.
  for (let i = 0; i < 3; i++) drawLead(p, LEAD[i], COLX[i], 146);
  for (let i = 0; i < 3; i++) drawLead(p, LEAD[i + 3], COLX[i], 266);
  // Supporting zone: three columns of region desks.
  drawDeskColumn(p, [DESKS[0], DESKS[1]], COLX[0], 386);
  drawDeskColumn(p, [DESKS[2], DESKS[3]], COLX[1], 386);
  drawDeskColumn(p, [DESKS[4], DESKS[5], DESKS[6], DESKS[7]], COLX[2], 386);
  // Timeline rail: only sourced times appear on it.
  p.hline(MX, 918, W - 2 * MX, INK);
  drawText(p, "20 NOV · TIMELINE — ONLY SOURCED TIMES SHOWN", MX, 924, 2, INK, true);
  drawText(p, "08:30 IST — AKVAN LANDFALL NEAR GOPALPUR [26]", MX, 940, 2, TEAL, true);
  drawText(p, "ALL OTHER DISPATCHES ARE DATED 20 NOV 2026 ONLY — NO TIMES GUESSED", MX, 956, 2, SOFT);
  // Footer: source key and repository.
  p.hline(MX, 976, W - 2 * MX, INK);
  drawCentered(p, "SOURCES [01]-[36]: FULL NUMBERED INDEX IN README", 982, 2, INK, true);
  drawCentered(p, "GITHUB.COM/FERDIZI/NEWS-IMAGE-20261120-ENTRY", 998, 2, SOFT);
  return p;
}

function main() {
  const page = buildPage();
  const png = encodePng(page.buf, W, H);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, png);
  console.log("wrote " + outPath + " (" + png.length + " bytes, " + W + "x" + H + ")");
}

main();
