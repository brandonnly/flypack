# Flypack tokens

How to use `flypack.css`, the token set for shadcn/ui (Base UI) on Tailwind v4, and the color
and type rules behind it.

## Setup

```sh
pnpm add shadcn @fontsource-variable/archivo @fontsource-variable/jetbrains-mono
```

`shadcn/tailwind.css` comes from the `shadcn` package. The last import is relative to
`globals.css`; from `src/app/globals.css` with `brand/` at the repository root it is
`../../brand/tokens/flypack.css`.

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/archivo";
@import "@fontsource-variable/jetbrains-mono";
@import "../../brand/tokens/flypack.css";
```

Preload `@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2`, the one font file
the first screen needs. The `Archivo Fallback` and `JetBrains Mono Fallback` faces in
`flypack.css` are Arial and Courier New scaled to the web fonts' metrics, so Fontsource's
`font-display: swap` doesn't shift layout.

After adding shadcn's Button, make its `destructive` variant fill with `destructive-solid`:

```ts
destructive:
  "bg-destructive-solid text-white hover:bg-destructive-solid/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
```

## Color rules

**Yellow** (`brand`, `#F5C400`) means brand, live or selected, in both themes.

| Rule | Why |
| --- | --- |
| On light surfaces, yellow is a fill behind ink. Text, links and focus rings there are ink | Yellow on white is 1.64:1 (APCA Lc 28) |
| Text on yellow is ink | Ink on yellow is 11.5:1; white on yellow is 1.64:1 |
| A yellow CTA in either theme is `bg-brand text-brand-foreground` | The ink label carries the button; the fill is decoration |
| On dark surfaces, show selection with a yellow bar or yellow text on `muted` | Yellow blended into near-black turns olive-brown |
| Warnings are orange (`warning`) | A yellow warning would read as "live" |

**Everything else:**

| Rule | Why |
| --- | --- |
| `primary` is ink in light mode and white in dark mode | A yellow checkbox, switch or slider on white fails the 3:1 control-boundary rule, and a yellow dark-mode primary would make every button look live |
| Dark mode is stage black `#0A0A0A` with ink `#111111` cards and pure neutral grays | Highest contrast, and nothing tints the yellow |
| Filled destructive buttons use `destructive-solid`; error text uses `destructive` | Dark `destructive` is a light red for text, and looks muddy as a fill |
| `border` is for decoration; `input` is the edge of a control | `case-200` is 1.3:1 on white, `case-500` 3.6:1 |
| Muted text is `muted-foreground` | It is `case-600` on light (5.5:1) and `case-400` on dark (Lc 63) |

## Type

- Archivo for display and UI text; JetBrains Mono for cable IDs, ports, IPs and lengths.
- Size new text with the role utilities in `flypack.css` (`text-caption` through
  `text-display-lg`); display sizes carry their own tracking and leading.
- Mono labels are `font-mono text-caption uppercase tracking-label`, 12px minimum.
- Inputs are `text-base md:text-sm`, so iOS keeps its zoom level.
- Columns of lengths or counts set in Archivo use `tabular-nums`.
- `font-synthesis: none` is on: a missing weight shows as a visible regression instead of a faked
  one.

## Changing a token

Re-measure every pair below with WCAG 2 and APCA. The change is done when each pair still meets
its target, and this table shows the new numbers.

| Pair | Target | WCAG | APCA Lc |
| --- | --- | --- | --- |
| Ink on white | body text | 18.9 | 105 |
| Ink on yellow / yellow on ink | body text | 11.5 | 75 / −74 |
| `muted-foreground` on white (`case-600`) | 4.5:1, Lc 60 | 5.5 | 77 |
| `muted-foreground` on ink (`case-400`) | 4.5:1, Lc 60 | 9.4 | −63 |
| `input` border on white (`case-500`) | 3:1 | 3.6 | non-text |
| Focus ring: ink/50 on white, yellow/50 on ink | 3:1 | 3.5, 3.6 | non-text |
| Light status colors with white text | 4.5:1 | 5.0–5.8 | 74–78 |
| Dark `destructive` as text on ink | 4.5:1, Lc 60 | 9.0 | −61 |
| White on `destructive-solid` (both themes) | 4.5:1 | 5.8 | −83 |
| Ink on dark `primary` (white button) | body text | 18.1 | 104 |

The brand yellow sits on the sRGB gamut edge (chroma 0.172 at L 0.84), so it renders the same on
every screen. Keep it in sRGB, so the logo matches everywhere.
