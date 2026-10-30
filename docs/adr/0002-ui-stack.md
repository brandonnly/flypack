# ADR 0002: Build the UI on shadcn/ui with Base UI and Tailwind v4

## Status

Accepted, October 30, 2026.

## Context

Flypack needs a component library its agents and contributors already know, accessible
primitives, and one place to hold the brand's colors and type. The brand kit was designed and
contrast-checked against shadcn's token set in light and dark themes.

## Decision

- Components are shadcn/ui on Base UI primitives, styled with Tailwind v4.
- `brand/tokens/flypack.css` is the single source of colors, fonts, type sizes and radius. The
  app imports it after Tailwind.
- Fonts are self-hosted through Fontsource: Archivo for display and UI, JetBrains Mono for data.

## Consequences

- The color and type rules, each with the contrast measurement behind it, live in
  `brand/tokens/README.md`. That file changes whenever a token does.
- shadcn's dark theme is replaced: yellow is reserved for brand and live states, so `primary` is
  ink in light mode and white in dark mode.
- Our copy of shadcn's Button differs from upstream in its destructive variant.
