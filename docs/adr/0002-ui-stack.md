# ADR 0002: Build the UI on shadcn/ui with Base UI and Tailwind v4

## Status

Accepted, October 30, 2026.

## Context

Flypack needs a component library its agents and contributors already know, accessible
primitives, and one place to hold the brand's colors and type. The brand kit was designed and
contrast-checked against shadcn's token set in light and dark themes.

## Decision

- Components are shadcn/ui on Base UI primitives, styled with Tailwind v4.
- `brand/tokens/flypack.css` is the only source of colors, fonts, the type scale and radius. The
  app imports it after Tailwind and defines no colors of its own.
- Fonts are self-hosted through Fontsource: Archivo for display and UI, JetBrains Mono for cable
  IDs, ports, IPs and lengths.

## Consequences

- `primary` is ink in light mode and white in dark mode. Gaff yellow is reserved for brand,
  live, selection and focus in both themes, and is never text on a light surface.
- Dark mode is stage black `#0A0A0A` with ink `#111111` cards and pure neutral grays.
- Our copy of shadcn's Button fills its destructive variant with `destructive-solid`, as
  `brand/tokens/README.md` shows.
- Status colors are separate from yellow: warnings are orange, so a warning never reads as "live".
- Changing a token means re-checking contrast; the checked pairs are listed in
  `brand/tokens/README.md`.
