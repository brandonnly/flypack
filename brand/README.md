# Flypack brand kit

![Flypack brand kit](preview.png)

The mark is a cable route drawn as an F: a pad where the cable starts, a dot where it ends, and a
pad where the crossbar lands. The wordmark is Archivo ExtraBold at −0.045em tracking, converted
to outlines, so no file here needs the font installed.

Tagline: **Plan every cable, rack and route before the show.** [TAGLINE.md](TAGLINE.md) records
how it was chosen and every line already turned down.

Design source: the "Brand kit v1" page of the Paper file
[Flypack — Logo exploration](https://app.paper.design/file/01M65S3PQBM4ZSMGEAZ3F78QB6).
Earlier rounds are in `explorations/`.

## Which file to use

In file names, `light` and `dark` name the background the asset sits on; `black` and `white` are
one-color versions for print, embroidery and engraving.

| Where | File |
| --- | --- |
| Site header, docs, light UI | `logo/flypack-horizontal-light.svg` |
| Dark UI, slides on black | `logo/flypack-horizontal-dark.svg` |
| Square spaces, splash screens | `logo/flypack-stacked-light.svg` or `-dark.svg` |
| Avatars, social profiles | `app-icon/app-icon-light-rounded-1024.png` |
| One-color print | `logo/flypack-horizontal-black.svg` or `-white.svg` |
| Under 96px wide | The mark alone: `logo/flypack-mark-light.svg` or `-dark.svg` |
| Link previews | `social/og-dark.png` or `og-light.png` |

## Logo rules

- Use the mark as supplied: original colors and proportions, all three endpoints, on a
  background it contrasts with (the yellow tile takes the ink mark).
- Keep clear space around the logo equal to twice the height of the yellow dot.
- Below 96px wide, use the mark alone.

## Colors

| Name | Hex | Role |
| --- | --- | --- |
| Case Ink | `#111111` | Text, marks, dark-mode cards |
| Gaff Yellow | `#F5C400` | Brand, live, selection |
| White | `#FFFFFF` | Light background |
| Stage Black | `#0A0A0A` | Dark-mode background |

How to use them in UI, with the contrast behind each rule: [tokens/README.md](tokens/README.md).

## Favicons

Copy everything in `favicon/` to the site's public root, then add the tags below. They assume
the site is served from the domain root; under a path prefix such as `/flypack/`, prefix every
`href` here and every `src` in `site.webmanifest`.

```html
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#FFFFFF" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0A0A0A" />
```

- `favicon.svg` follows the browser's color scheme: yellow tile in light, ink tile in dark.
- The 16px and 32px bitmaps use ink endpoints, which stay visible on yellow at that size.
- `icon-maskable-*.png` keeps the mark inside Android's safe zone for circular and squircle
  masks.

## App icons

- **iOS and macOS:** `app-icon-light-1024.png`, `app-icon-dark-1024.png` and
  `app-icon-tinted-1024.png` are the Any, Dark and Tinted appearances in the asset catalog. They
  are full-bleed squares; the system applies the corner mask.
- **Android:** the adaptive icon background is Gaff Yellow. The foreground is the mark as drawn in
  `app-icon-light.svg` (ink route, white endpoints), scaled to the safe zone that
  `favicon/icon-maskable-512.png` shows.

## Changing an asset

Every file in `logo/`, `app-icon/`, `favicon/`, `social/` and `preview.png` is generated. Edit
`scripts/build.mjs`, then:

```sh
cd brand/scripts
pnpm install
pnpm build
```

The change is done when `preview.png` and each affected output show it, and the build lists no
errors. The first run downloads static Archivo instances from Google Fonts into
`scripts/.cache/`; Archivo's SIL Open Font License allows logos made from it.
