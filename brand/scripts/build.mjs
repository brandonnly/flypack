// Builds every Flypack brand asset from the mark geometry and the Archivo font.
// The wordmark is converted to outlines, so no output depends on installed fonts.
//
//   cd brand/scripts && pnpm install && pnpm build

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import opentype from "opentype.js";

const here = dirname(fileURLToPath(import.meta.url));
const brand = join(here, "..");
const cache = join(here, ".cache");

const INK = "#111111";
const STAGE = "#0A0A0A";
const YELLOW = "#F5C400";
const WHITE = "#FFFFFF";
const MUTED_DARK = "#B7B7B7";
const MUTED_LIGHT = "#696969";
const TINT_GRAY = "#8A8A8A";

// Static Archivo instances from Google Fonts (SIL Open Font License).
const FONTS = {
  400: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTNDNp8A.ttf",
  800: "https://fonts.gstatic.com/s/archivo/v25/k3k6o8UDI-1M0wlSV9XAw6lQkqWY8Q82sJaRE-NWIDdgffTTtDRp8A.ttf",
};

const WORDMARK_TRACKING = -0.045; // em
const TAGLINE = "Plan every cable, rack and route for the show.";

async function loadFont(weight) {
  const file = join(cache, `archivo-${weight}.ttf`);
  if (!existsSync(file)) {
    await mkdir(cache, { recursive: true });
    const res = await fetch(FONTS[weight]);
    if (!res.ok) throw new Error(`Archivo ${weight} download failed: HTTP ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  const buf = await readFile(file);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

// --- The mark ---------------------------------------------------------------
// A cable route drawn as an F on a 64-unit grid: a pad where the cable starts,
// a dot where it ends, and a pad where the crossbar lands.

const MARK_BOX = { x: 7, y: 7, w: 48, h: 51 }; // the drawn route plus 1 unit of air
const MARK_CENTER = { x: 31.25, y: 32.25 };

function mark({ route, pad, dot, cross, pin }) {
  return (
    `<g fill="none" stroke="${route}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M14 51H24V21Q24 14 31 14H45"/><path d="M24 33H38"/></g>` +
    `<rect x="8" y="45" width="12" height="12" rx="2.5" fill="${pad}"/>` +
    `<circle cx="48" cy="14" r="6.5" fill="${dot}"/>` +
    (pin ? `<circle cx="48" cy="14" r="3" fill="${pin}"/>` : "") +
    `<rect x="37" y="27" width="12" height="12" rx="2.5" fill="${cross}"/>`
  );
}

const MARKS = {
  light: { route: INK, pad: INK, dot: YELLOW, cross: YELLOW },
  dark: { route: YELLOW, pad: YELLOW, dot: WHITE, cross: WHITE },
  onYellow: { route: INK, pad: INK, dot: WHITE, cross: WHITE },
  // At 32px and below, white endpoints wash out on yellow.
  onYellowSmall: { route: INK, pad: INK, dot: INK, pin: YELLOW, cross: INK },
  black: { route: INK, pad: INK, dot: INK, cross: INK },
  white: { route: WHITE, pad: WHITE, dot: WHITE, cross: WHITE },
  tinted: { route: WHITE, pad: WHITE, dot: TINT_GRAY, cross: TINT_GRAY },
};

// --- Type -------------------------------------------------------------------

// opentype.js 2.0's toPathData() emits NaN for some curve points, so serialize the commands directly.
function pathData(path) {
  const f = (v) => +v.toFixed(2);
  return path.commands
    .map((c) => {
      if (c.type === "M" || c.type === "L") return `${c.type}${f(c.x)} ${f(c.y)}`;
      if (c.type === "Q") return `Q${f(c.x1)} ${f(c.y1)} ${f(c.x)} ${f(c.y)}`;
      if (c.type === "C") return `C${f(c.x1)} ${f(c.y1)} ${f(c.x2)} ${f(c.y2)} ${f(c.x)} ${f(c.y)}`;
      return "Z";
    })
    .join("");
}

function textOutline(font, text, size, tracking = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch)); // no shaping needed for these strings
  const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  const parts = [];
  let x = 0;
  glyphs.forEach((glyph, i) => {
    const path = glyph.getPath(x, 0, size);
    const bb = path.getBoundingBox();
    if (bb.x2 > bb.x1) {
      box.x1 = Math.min(box.x1, bb.x1);
      box.y1 = Math.min(box.y1, bb.y1);
      box.x2 = Math.max(box.x2, bb.x2);
      box.y2 = Math.max(box.y2, bb.y2);
    }
    parts.push(pathData(path));
    x += glyph.advanceWidth * scale + tracking * size;
    if (i < glyphs.length - 1) x += font.getKerningValue(glyph, glyphs[i + 1]) * scale;
  });
  return { d: parts.join(""), x: box.x1, y: box.y1, w: box.x2 - box.x1, h: box.y2 - box.y1 };
}

// --- Compositions -----------------------------------------------------------
// Each returns { body, w, h } in its own coordinate space, origin top-left.

const n = (v) => Math.round(v * 100) / 100;

function markArt(theme, height) {
  const s = height / MARK_BOX.h;
  return {
    body: `<g transform="scale(${n(s)}) translate(${-MARK_BOX.x} ${-MARK_BOX.y})">${mark(theme)}</g>`,
    w: MARK_BOX.w * s,
    h: height,
  };
}

function wordmarkArt(word, color) {
  return {
    body: `<path fill="${color}" transform="translate(${n(-word.x)} ${n(-word.y)})" d="${word.d}"/>`,
    w: word.w,
    h: word.h,
  };
}

// Mark beside the wordmark. The mark is 0.935em tall and its pad overshoots the baseline by 0.04em.
function horizontalArt(word, size, theme, textColor) {
  const m = markArt(theme, 0.935 * size);
  const gap = 0.2 * size;
  const markTop = 0.04 * size - m.h;
  const top = Math.min(markTop, word.y);
  const bottom = Math.max(0.04 * size, word.y + word.h);
  const body =
    `<g transform="translate(0 ${n(markTop - top)})">${m.body}</g>` +
    `<path fill="${textColor}" transform="translate(${n(m.w + gap - word.x)} ${n(-top)})" d="${word.d}"/>`;
  return { body, w: m.w + gap + word.w, h: bottom - top };
}

// Mark centered above the wordmark.
function stackedArt(word, size, theme, textColor) {
  const m = markArt(theme, 1.6 * size);
  const gap = 0.3 * size;
  const w = Math.max(m.w, word.w);
  const body =
    `<g transform="translate(${n((w - m.w) / 2)} 0)">${m.body}</g>` +
    `<path fill="${textColor}" transform="translate(${n((w - word.w) / 2 - word.x)} ${n(m.h + gap - word.y)})" d="${word.d}"/>`;
  return { body, w, h: m.h + gap + word.h };
}

// 64-unit app icon tile. `shape`: rounded (web), square (iOS/Android apply their own mask), maskable (PWA safe zone).
function iconArt(tile, theme, shape = "rounded") {
  const bg = shape === "rounded" ? `<rect width="64" height="64" rx="14" fill="${tile}"/>` : `<rect width="64" height="64" fill="${tile}"/>`;
  const glyph =
    shape === "maskable"
      ? `<g transform="translate(32 32) scale(0.7) translate(${-MARK_CENTER.x} ${-MARK_CENTER.y})">${mark(theme)}</g>`
      : mark(theme);
  return { body: bg + glyph, w: 64, h: 64 };
}

const place = (art, x, y, scale = 1) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(scale)})">${art.body}</g>`;

function svgDoc(art, title, { width = art.w, height = art.h, extra = "" } = {}) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(art.w)} ${n(art.h)}" width="${n(width)}" height="${n(height)}" role="img" aria-label="${title}">` +
    `<title>${title}</title>${extra}${art.body}</svg>\n`
  );
}

// --- Output -----------------------------------------------------------------

function png(svg, width) {
  return new Resvg(svg, { fitTo: { mode: "width", value: Math.round(width) } }).render().asPng();
}

function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const written = [];
async function out(path, data) {
  const file = join(brand, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, data);
  written.push(path);
}

async function main() {
  const [bold, regular] = await Promise.all([loadFont(800), loadFont(400)]);
  const SIZE = 100;
  const word = textOutline(bold, "flypack", SIZE, WORDMARK_TRACKING);

  // Logos. "light" means "for light backgrounds".
  const logos = {
    "logo/flypack-horizontal-light": horizontalArt(word, SIZE, MARKS.light, INK),
    "logo/flypack-horizontal-dark": horizontalArt(word, SIZE, MARKS.dark, WHITE),
    "logo/flypack-horizontal-black": horizontalArt(word, SIZE, MARKS.black, INK),
    "logo/flypack-horizontal-white": horizontalArt(word, SIZE, MARKS.white, WHITE),
    "logo/flypack-stacked-light": stackedArt(word, SIZE, MARKS.light, INK),
    "logo/flypack-stacked-dark": stackedArt(word, SIZE, MARKS.dark, WHITE),
    "logo/flypack-wordmark-black": wordmarkArt(word, INK),
    "logo/flypack-wordmark-white": wordmarkArt(word, WHITE),
    "logo/flypack-mark-light": markArt(MARKS.light, 51),
    "logo/flypack-mark-dark": markArt(MARKS.dark, 51),
    "logo/flypack-mark-black": markArt(MARKS.black, 51),
    "logo/flypack-mark-white": markArt(MARKS.white, 51),
  };
  for (const [name, art] of Object.entries(logos)) {
    const svg = svgDoc(art, "Flypack");
    await out(`${name}.svg`, svg);
    await out(`${name}.png`, png(svg, name.includes("mark") ? 512 : 1200));
  }

  // App icons: square for app stores (the OS applies its own corner mask), rounded for web and decks.
  const icons = {
    "app-icon/app-icon-light": iconArt(YELLOW, MARKS.onYellow, "square"),
    "app-icon/app-icon-dark": iconArt(INK, MARKS.dark, "square"),
    "app-icon/app-icon-tinted": iconArt("#000000", MARKS.tinted, "square"),
    "app-icon/app-icon-light-rounded": iconArt(YELLOW, MARKS.onYellow),
    "app-icon/app-icon-dark-rounded": iconArt(INK, MARKS.dark),
  };
  for (const [name, art] of Object.entries(icons)) {
    const svg = svgDoc(art, "Flypack app icon", { width: 1024, height: 1024 });
    await out(`${name}.svg`, svg);
    await out(`${name}-1024.png`, png(svg, 1024));
  }

  // Favicons. The SVG follows the browser's color scheme; the bitmaps are the light version.
  const faviconSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<style>.t{fill:${YELLOW}}.r{stroke:${INK}}.p{fill:${INK}}.d{fill:${INK}}.i{fill:${YELLOW}}` +
    `@media (prefers-color-scheme:dark){.t{fill:${INK}}.r{stroke:${YELLOW}}.p{fill:${YELLOW}}.d,.i{fill:${WHITE}}}</style>` +
    `<rect class="t" width="64" height="64" rx="14"/>` +
    `<g class="r" fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 51H24V21Q24 14 31 14H45"/><path d="M24 33H38"/></g>` +
    `<rect class="p" x="8" y="45" width="12" height="12" rx="2.5"/>` +
    `<circle class="d" cx="48" cy="14" r="6.5"/><circle class="i" cx="48" cy="14" r="3"/>` +
    `<rect class="d" x="37" y="27" width="12" height="12" rx="2.5"/></svg>\n`;
  await out("favicon/favicon.svg", faviconSvg);

  const small = svgDoc(iconArt(YELLOW, MARKS.onYellowSmall), "Flypack");
  const large = svgDoc(iconArt(YELLOW, MARKS.onYellow), "Flypack");
  const smallDark = svgDoc(iconArt(INK, MARKS.dark), "Flypack");
  await out("favicon/favicon-16.png", png(small, 16));
  await out("favicon/favicon-32.png", png(small, 32));
  await out("favicon/favicon-dark-32.png", png(smallDark, 32));
  await out(
    "favicon/favicon.ico",
    ico([
      { size: 16, data: png(small, 16) },
      { size: 32, data: png(small, 32) },
      { size: 48, data: png(large, 48) },
    ]),
  );
  await out("favicon/apple-touch-icon.png", png(svgDoc(iconArt(YELLOW, MARKS.onYellow, "square"), "Flypack"), 180));
  await out("favicon/icon-192.png", png(large, 192));
  await out("favicon/icon-512.png", png(large, 512));
  const maskable = svgDoc(iconArt(YELLOW, MARKS.onYellow, "maskable"), "Flypack");
  await out("favicon/icon-maskable-192.png", png(maskable, 192));
  await out("favicon/icon-maskable-512.png", png(maskable, 512));
  await out(
    "favicon/site.webmanifest",
    JSON.stringify(
      {
        name: "Flypack",
        short_name: "Flypack",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        theme_color: INK,
        background_color: STAGE,
        display: "standalone",
      },
      null,
      2,
    ) + "\n",
  );

  // Social cards, 1200x630.
  const tagline = textOutline(regular, TAGLINE, 34);
  for (const [theme, bg, markTheme, text, sub] of [
    ["dark", STAGE, MARKS.dark, WHITE, MUTED_DARK],
    ["light", WHITE, MARKS.light, INK, MUTED_LIGHT],
  ]) {
    const lockup = horizontalArt(word, SIZE, markTheme, text);
    const scale = 560 / lockup.w;
    const card = {
      w: 1200,
      h: 630,
      body:
        `<rect width="1200" height="630" fill="${bg}"/>` +
        `<rect x="96" y="96" width="56" height="10" rx="5" fill="${YELLOW}"/>` +
        place(lockup, 96, 315 - (lockup.h * scale) / 2 - 20, scale) +
        place(wordmarkArt(tagline, sub), 96, 315 + (lockup.h * scale) / 2 + 36),
    };
    const svg = svgDoc(card, "Flypack");
    await out(`social/og-${theme}.svg`, svg);
    await out(`social/og-${theme}.png`, png(svg, 1200));
  }

  // Contact sheet of the kit, for the README.
  const sheet = { w: 1600, h: 1040, body: "" };
  const panel = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${fill}"/>`;
  const fit = (art, x, y, w, h, maxW, maxH) => {
    const s = Math.min(maxW / art.w, maxH / art.h);
    return place(art, x + (w - art.w * s) / 2, y + (h - art.h * s) / 2, s);
  };
  sheet.body += `<rect width="1600" height="1040" fill="#F4F4F4"/>`;
  sheet.body += panel(40, 40, 744, 300, WHITE) + fit(logos["logo/flypack-horizontal-light"], 40, 40, 744, 300, 520, 140);
  sheet.body += panel(816, 40, 744, 300, STAGE) + fit(logos["logo/flypack-horizontal-dark"], 816, 40, 744, 300, 520, 140);
  sheet.body += panel(40, 372, 360, 300, WHITE) + fit(logos["logo/flypack-stacked-light"], 40, 372, 360, 300, 220, 200);
  sheet.body += panel(424, 372, 360, 300, STAGE) + fit(logos["logo/flypack-stacked-dark"], 424, 372, 360, 300, 220, 200);
  sheet.body += panel(816, 372, 360, 300, YELLOW) + fit(horizontalArt(word, SIZE, MARKS.onYellow, INK), 816, 372, 360, 300, 280, 80);
  sheet.body += panel(1200, 372, 360, 300, WHITE) + fit(logos["logo/flypack-wordmark-black"], 1200, 372, 360, 300, 260, 80);
  sheet.body += panel(40, 704, 1520, 296, WHITE);
  const iconRow = [
    icons["app-icon/app-icon-light-rounded"],
    icons["app-icon/app-icon-dark-rounded"],
    iconArt("#000000", MARKS.tinted),
    iconArt(YELLOW, MARKS.onYellow, "maskable"),
  ];
  iconRow.forEach((art, i) => (sheet.body += place(art, 88 + i * 232, 760, 180 / 64)));
  [64, 32, 16].forEach((size, i) => {
    const art = iconArt(YELLOW, size <= 32 ? MARKS.onYellowSmall : MARKS.onYellow);
    sheet.body += place(art, 1040 + i * 110, 940 - size, size / 64);
  });
  [32, 16].forEach((size, i) => (sheet.body += place(iconArt(INK, MARKS.dark), 1370 + i * 70, 940 - size, size / 64)));
  await out("preview.png", png(svgDoc(sheet, "Flypack brand kit"), 1600));

  console.log(written.map((p) => `brand/${p}`).join("\n"));
}

await main();
