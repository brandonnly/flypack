# Flypack tokens

`flypack.css` is the full token set for shadcn/ui (Base UI) on Tailwind v4: every shadcn variable for light and dark, the `@theme inline` mapping, Flypack's yellow and neutral ramps, status colors, fonts and a role-based type scale.

## Setup

```sh
pnpm add @fontsource-variable/archivo @fontsource-variable/jetbrains-mono
```

```css
/* globals.css */
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "@fontsource-variable/archivo";
@import "@fontsource-variable/jetbrains-mono";
@import "../brand/tokens/flypack.css";
```

Preload the one font file the first screen needs, `@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2`. Fontsource uses `font-display: swap`. The `Archivo Fallback` and `JetBrains Mono Fallback` faces in `flypack.css` are Arial and Courier New scaled to Archivo's and JetBrains Mono's metrics, so the swap doesn't shift layout.

After adding shadcn's Button, change its `destructive` variant to fill with `destructive-solid` and drop the `dark:bg-destructive/60` class:

```ts
destructive:
  "bg-destructive-solid text-white hover:bg-destructive-solid/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
```

## Color rules

| Rule | Why |
| --- | --- |
| Yellow is a fill, never text, a link or a focus ring on light surfaces | Yellow on white is 1.64:1 (APCA Lc 28) |
| Text on yellow is ink, never white | Ink on yellow is 11.5:1, white on yellow 1.64:1 |
| `primary` is ink in light mode and white in dark mode | A yellow checkbox, switch or slider on white fails the 3:1 control-boundary rule, and a yellow primary in dark mode would make every button look "live" |
| Use `bg-brand text-brand-foreground` for a yellow CTA button in either theme | The ink label carries the button, so the fill is decoration |
| Dark mode is stage black `#0A0A0A` with ink `#111111` cards; all grays are pure neutral | Highest contrast, and nothing tints the yellow |
| No yellow washes on dark surfaces; mark selection with a yellow bar or yellow text on `muted` | Yellow blended into near-black turns olive-brown |
| Filled destructive buttons use `destructive-solid`; `destructive` is error text | Dark `destructive` is a light red for text; filling a button with it looks muddy |
| Yellow means brand, live or selected; warnings are orange | A yellow warning would read as "live" |
| `border` is decorative; `input` is the edge of a control | `case-200` is 1.3:1 on white, `case-500` 3.6:1 |
| Muted text is `case-600` on light and `case-400` on dark | The old `#8A8A86` was 3.5:1 on white and Lc 39 on ink |

Contrast of the main pairs:

| Pair | WCAG | APCA Lc |
| --- | --- | --- |
| Ink on white | 18.9 | 105 |
| Ink on yellow / yellow on ink | 11.5 | 75 / −74 |
| `muted-foreground` on white (`case-600`) | 5.5 | 77 |
| `muted-foreground` on ink (`case-400`) | 9.4 | −63 |
| `input` border on white (`case-500`) | 3.6 | non-text |
| Focus ring: ink/50 on white, yellow/50 on ink | 3.5, 3.6 | non-text |
| Light status colors with white text | 5.0–5.8 | 74–78 |
| Dark `destructive` as text on ink | 9.0 | −61 |
| White on `destructive-solid` (both themes) | 5.8 | −83 |
| Ink on dark `primary` (white button) | 18.1 | 104 |

The yellow sits exactly on the sRGB gamut edge (chroma 0.172 at L 0.84), so it renders the same on every screen. A P3 boost is possible but left out to keep the logo identical everywhere.

## Type

- Archivo for display and UI text, JetBrains Mono for cable IDs, ports, IPs and lengths.
- Role sizes: `text-caption` 12, `text-label` 13, `text-ui` 14, `text-body` 16, `text-body-lg` 18, `text-title` 20, `text-heading` 24, `text-display-sm` 32, `text-display` 48, `text-display-lg` 72. Display sizes carry their own negative tracking and tight leading.
- Mono labels: `font-mono text-caption uppercase tracking-label`. Never below 12px.
- Inputs: `text-base md:text-sm`, so iOS doesn't zoom.
- Columns of lengths or counts in Archivo: `tabular-nums`.
- `font-synthesis: none` is on, so a missing weight shows up instead of being faked.
