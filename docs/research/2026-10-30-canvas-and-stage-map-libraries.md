# Canvas and stage map libraries: research for issue #7

Researched 2026-10-30. Primary sources only, unless a line says otherwise. **Unverified** marks a
claim I couldn't trace to a primary source. "Secondary" marks a source that isn't the owner of the
claim but is linked from one. Versions and dates come from the npm registry and GitHub API on
2026-10-30.

Question ([#7](https://github.com/brandonnly/flypack/issues/7)): which libraries fit Flypack's
signal-flow canvas and its stage map, and do they pass
[ADR 0001](../adr/0001-agpl-license.md) (AGPL-3.0)? Background is §5 and §6 of
[the 2026-10-29 research](2026-10-29-agent-first-patching-tool.md); this file doesn't repeat it.

Working scale assumption: a show has hundreds of devices and thousands of connections, with
many devices carrying dozens of ports. Nothing below has been benchmarked against that; numbers
are the sources' own.

---

## TL;DR

| # | Read | Why |
|---|------|-----|
| 1 | [elkjs 0.12.0 release](https://github.com/kieler/elkjs/releases/tag/0.12.0) + [`LICENSE.md` Exhibit A](https://github.com/kieler/elkjs/blob/master/LICENSE.md) | elkjs added **GPL-3.0-or-later as an EPL-2.0 Secondary License** on 2026-07-17. Before 0.12.0 it was EPL-2.0 only, which the FSF and Eclipse both call GPL-incompatible. |
| 2 | [elkjs `build.gradle`](https://github.com/kieler/elkjs/blob/master/build.gradle) | The shipped bundle also compiles in EMF-for-GWT (**EPL-1.0**) and Xtext `xbase.lib` (**EPL-2.0, no secondary license**). The relicensing covered ELK's own code only. |
| 3 | [xyflow RFC #4239](https://github.com/xyflow/xyflow/issues/4239) | A React Flow maintainer: "React Flow wasn't built for huge graphs". Viewport culling is a naive bounding-box check. |
| 4 | [xyflow #6080](https://github.com/xyflow/xyflow/issues/6080) (open) | With `onlyRenderVisibleElements`, an edge whose path leaves its two nodes' bounding box (routed cables, waypoints) is culled while still on screen. |
| 5 | [ISO 32000-1 §12.9](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf) (pp. 479–482, free Adobe copy) | The exact structure of a PDF's embedded scale: page `/VP` → viewport `/BBox` + `/Measure` → `/X` number-format array whose first `/C` converts PDF points to real units. |
| 6 | [pdf.js `api.js` v6.4.299](https://github.com/mozilla/pdf.js/blob/v6.4.299/src/display/api.js) | `getViewport`, `render({canvas})`, `convertToPdfPoint`, `userUnit`. pdf.js doesn't parse `/VP` at all. |
| 7 | [EasySchematic `DeviceNode.tsx`](https://github.com/duremovich/EasySchematic/blob/master/src/components/DeviceNode.tsx) | One React Flow `<Handle>` per port (two for bidirectional and passthrough ports), with port filtering to cut handle count. |
| 8 | [Konva performance tips](https://konvajs.org/docs/performance/All_Performance_Tips.html) | Each layer is about 41 MB on a 1080p retina stage, and mobile Safari blanks the canvas past 256–384 MB. |

**Five findings that change the framing**

- **ELK's license is better than ADR 0001 assumed, but not clean.** ELK's own code now carries
  `EPL-2.0 OR GPL-3.0-or-later`, and AGPL-3.0 §13 permits combining with GPLv3 code. The npm
  bundle, though, also contains compiled EMF (EPL-1.0) and Xtext (EPL-2.0 only) classes, which
  have no GPL secondary license. Neither elkjs issue on the subject mentions them. **This needs a
  licensing answer before Flypack depends on elkjs in the browser bundle.**
- **React Flow scales by keeping React work small, not by virtualising.** Its maintainers give no
  node or edge ceiling. Their guidance is memoisation and narrow store subscriptions. Culling is a
  per-element bounding-box test that still renders every node once, unless the node declares its
  `handles` up front (since 12.8.5).
- **A device with many ports costs a DOM element and a `getBoundingClientRect` per port** whenever
  React Flow re-measures that node
  ([`getHandleBounds` in `packages/system/src/utils/dom.ts`](https://github.com/xyflow/xyflow/blob/main/packages/system/src/utils/dom.ts),
  as shipped in `@xyflow/system` 0.0.83). Declaring node sizes and handle positions skips that measurement.
- **Both open prior-art tools draw their floor plan in React Flow**, not Konva. LZ Cable Planner
  puts the plan image in the bottom-most React Flow node with an SVG overlay
  ([`GrundrissNode.tsx`](https://github.com/larszu/cable-planner/blob/main/src/renderer/components/Canvas/GrundrissNode.tsx);
  proprietary, behaviour reference only).
- **The "editable edge" (drag waypoints) and "edge routing with libavoid" React Flow examples are
  Pro examples** under an "xyflow Pro License". Its terms aren't public, so whether that code can
  go into an AGPL repository is **Unverified**. The library itself is MIT.

---

## 1. Candidates at a glance

| Library | License | ADR 0001 | Latest stable (date) | Maintenance signal |
|---|---|---|---|---|
| React Flow (`@xyflow/react`) | MIT ([npm](https://www.npmjs.com/package/@xyflow/react)) | OK | 12.12.0 (2026-09-24); `13.0.0-next.0` on the `next` tag (2026-10-11) | 38.8k★, pushed 2026-10-29, ~monthly releases. No v13 changelog published (**Unverified** what changes). |
| `@xyflow/system` | MIT | OK | 0.0.83 (2026-09-24) | Framework-agnostic core. Exports `XYPanZoom`, `XYDrag`, `XYHandle`, built on d3-zoom/d3-drag (ISC). |
| Konva | MIT ([LICENSE](https://github.com/konvajs/konva/blob/master/LICENSE)) | OK | 10.9.0 (2026-10-15) | 14.9k★, 2 open issues, a 10.x minor almost every two weeks since September. |
| react-konva | MIT | OK | 19.3.2 (2026-10-15) | Peer dep `react ^19.3.0`. Each react-konva minor tracks one React minor ([README](https://github.com/konvajs/react-konva/blob/master/README.md)). |
| Plain SVG (+ d3-zoom or `XYPanZoom`) | n/a; d3-zoom ISC | OK | d3-zoom 3.0.0 (2021-06-10) | d3-zoom is stable but has had no release in five years. |
| pdf.js (`pdfjs-dist`) | Apache-2.0 | OK (FSF: compatible with GPLv3) | 6.4.299 (2026-10-03) | 54k★, Mozilla, pushed daily. |
| pdf-lib | MIT | OK | 1.17.1 (2021-11-06) | Unmaintained upstream. The fork `@cantoo/pdf-lib` (MIT) is at 2.11.1 (2026-09-15). |
| ELK.js (`elkjs`) | `EPL-2.0 OR GPL-3.0-or-later` from 0.12.0; EPL-2.0 only up to 0.11.1 | **Needs confirmation** (see §4.1) | 0.12.1 (2026-10-28) | Kiel University. 0.12.0 → 0.12.1 in three months. A `0.13.0` was published 10 minutes *before* 0.12.1 but isn't tagged `latest` and has no GitHub release (**Unverified** whether it's a mis-publish). |
| dagre (`@dagrejs/dagre`) | MIT | OK | 3.1.3 (2026-10-24) | Revived: 2.0.0 (2025-11) → 3.1.3. The unscoped `dagre` package (0.8.5, 2019) is dead ([README](https://github.com/dagrejs/dagre)). |
| libavoid (adaptagrams) | LGPL-2.1-or-later; commercial licence "for a fee" ([README](https://github.com/mjwybrow/adaptagrams)) | OK via LGPL (see §4.4) | No releases. Last commit 2025-10-29 | "No official releases exist … the code is stable" ([libavoid page](https://www.adaptagrams.org/documentation/libavoid.html)). |
| libavoid-js | LGPL-2.1-or-later | OK via LGPL | 0.5.0-beta.5 (2026-02-23) | 46★, one main author, beta, Emscripten/WASM. |
| JointJS core (`@joint/core`) | MPL-2.0, no "Incompatible With Secondary Licenses" notice | OK (MPL-2.0 §3.3 names AGPL-3.0 as a Secondary License) | 4.3.4 (2026-10-27) | Not in the ticket. Listed because ports are first-class. Not evaluated further. |
| PixiJS | MIT | OK | 8.22.0 (2026-10-01) | WebGL/WebGPU. `@pixi/react` 8.0.5 (2025-12-01). Not needed at the scale in this ticket. |
| tldraw | tldraw license (paid key in production) | **Fails** (ADR 0001) | n/a | Excluded. |

---

## 2. Signal-flow canvas

Requirements from the ticket: devices with many ports across several signal domains, live updates
from Convex, several people editing at once, at show scale.

### 2.1 React Flow: how ports map

- **Ports are handles.** Each port is a `<Handle>` with a unique `id` inside a custom node. Edges
  name their ends with `sourceHandle` / `targetHandle`
  ([Handles](https://reactflow.dev/learn/customization/handles)).
- **Handles change after mount?** Call `useUpdateNodeInternals` "when programmatically changing
  the position or number of handles" (same page). To hide a handle, use `visibility: hidden` or
  `opacity: 0`, because `display: none` reports a size of 0.
- **Direction rules:**
  - `connectionMode` defaults to `'strict'` (source → target only). `'loose'` allows
    source-to-source but "does not support target-to-target connections".
  - A single `isValidConnection` on `<ReactFlow>` is recommended over per-handle validators "for
    performance" ([ReactFlow props](https://reactflow.dev/api-reference/react-flow)).
- **Controlled vs uncontrolled.** Passing `nodes`/`edges` makes the flow controlled.
  `onNodesChange` "is called on node drag, select, and move" (same page). This is where Convex
  data would enter. Writing back on every drag frame versus on drag stop is a design choice; Convex
  optimistic updates are "temporary, local changes to your query results" that are "rolled back
  when a mutation completes"
  ([Convex docs](https://docs.convex.dev/client/react/optimistic-updates)).
- **Skipping measurement.** React Flow needs a width, height and handle positions for every node.
  - Without them it renders the node and measures it. On each node update the core runs
    `querySelectorAll('.source' | '.target')` and `getBoundingClientRect()` on every handle
    (`getHandleBounds` in
    [`packages/system/src/utils/dom.ts`](https://github.com/xyflow/xyflow/blob/main/packages/system/src/utils/dom.ts);
    checked in the `@xyflow/system` 0.0.83 dist).
  - Nodes can declare `width`/`height` and a `handles` array (`type`, `position`, `x`, `y`) in
    advance. The docs present this for SSR
    ([SSR guide](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration)).
  - Since 12.8.5, nodes with `handles` defined are no longer force-rendered when
    `onlyRenderVisibleElements` is on
    ([PR #5497](https://github.com/xyflow/xyflow/pull/5497), merged 2025-09-16;
    [maintainer comment on #3883](https://github.com/xyflow/xyflow/issues/3883)).

### 2.2 React Flow: limits at show scale

**What the maintainers say:**
- No node or edge ceiling is published. The performance page refers only to "a large number of
  nodes" and "larger diagrams"
  ([Performance](https://reactflow.dev/learn/advanced-use/performance)).
- "Even if React Flow wasn't built for huge graphs, I really like the idea of having a better
  support" (moklick, 2024-05-10,
  [#4239](https://github.com/xyflow/xyflow/issues/4239)). That RFC for spatial-index culling is
  still open.
- The repo's own stress example renders a 25 × 25 grid: **625 nodes and 624 edges**, with a frame
  recorder for drags
  ([`examples/react/src/examples/Stress`](https://github.com/xyflow/xyflow/tree/main/examples/react/src/examples/Stress)).
  That's a test fixture, not a stated limit.

**The official performance guidance**
([Performance](https://reactflow.dev/learn/advanced-use/performance)):
1. Custom nodes and edges must be `React.memo`'d or declared outside the parent.
2. Callback props go in `useCallback`; object props go in `useMemo`.
3. "One of the main reasons for performance issues in React Flow is unnecessary re-renders."
   Don't read the whole `nodes`/`edges` arrays in components. Keep derived state (selection)
   in its own field.
4. Collapse large trees with `hidden`.
5. Simplify styles: animations, shadows and gradients cost frames.

**Secondary numbers.** The docs link a
[Synergy Codes guide](https://www.synergycodes.com/webbook/guide-to-optimize-react-flow-project-performance).
On unstated hardware, with 100 nodes of two handles each:
- An inline `onNodeClick` dropped drag to 10 FPS (2 FPS for "heavy" nodes).
- Memoising restored 60 FPS for default nodes and 35–40 FPS for heavy ones.

The point is that one non-memoised prop can cost 6× at only 100 nodes. Port-heavy device nodes
are closer to "heavy" than to "default".

**`onlyRenderVisibleElements`** (default `false`):
- The prop "might improve performance when you have a large number of nodes and edges but also
  adds an overhead" ([props](https://reactflow.dev/api-reference/react-flow)).
- Known issues:
  - All nodes still render once to be measured unless `handles` are declared
    ([#3883](https://github.com/xyflow/xyflow/issues/3883), open).
  - Users report laggier panning with it on, from components mounting and unmounting (same thread).
  - The edge test uses the bounding box of the edge's two nodes. **An orthogonally routed edge or
    one with user waypoints that leaves that box is culled while visible.** There's no per-edge
    override yet ([#6080](https://github.com/xyflow/xyflow/issues/6080), opened 2026-10-21).

**Show-scale DOM estimate (inference, not measured):**
- 300 devices × 30 visible ports is about 9,000 handle elements, plus port labels.
- 3,000 edges is 3,000 SVG `<path>` elements (plus interaction paths, if they're kept).
- The levers are:
  - Fewer handles: filter by layer or signal domain, or hide unconnected ports (EasySchematic
    does both).
  - Declared node sizes and handles, to skip measurement.
  - Narrow store selectors.
  - Possibly culling, given the #6080 caveat.

### 2.3 EasySchematic as a reference (AGPL-3.0; ideas, not code)

Sources: [`package.json`](https://github.com/duremovich/EasySchematic/blob/master/package.json)
(`@xyflow/react` 12.10.1, Zustand 5),
[`DeviceNode.tsx`](https://github.com/duremovich/EasySchematic/blob/master/src/components/DeviceNode.tsx),
[`App.tsx`](https://github.com/duremovich/EasySchematic/blob/master/src/App.tsx),
[`src/routing/`](https://github.com/duremovich/EasySchematic/tree/master/src/routing).

**Ports and handles:**
- **One handle per port.**
  - Inputs are `target`; outputs are `source`.
  - A **bidirectional** port gets two handles, `${id}-in` and `${id}-out`. A **passthrough**
    (patch-panel) port gets `${id}-rear` and `${id}-front`.
- **Every bidirectional handle is typed `source`.** The code comment says React Flow's
  `getEdgePosition` "only searches source bounds for sourceHandle, even in ConnectionMode.Loose".
  The app runs `ConnectionMode.Loose` and enforces real direction in its own `isValidConnection`.
- **Fewer handles on screen.** Ports are filtered:
  - by hidden signal types, globally and per template;
  - per device;
  - by "hide unconnected ports", globally or per device.

  Bidirectional ports can collapse to one side.
- **Hidden adapters** still render invisible handles in a 1 × 1 px box, so edge references stay
  valid.

**Rendering and store:**
- `DeviceNode` is `memo`'d.
- Each node subscribes to the store with a selector that **loops over all edges**. It returns a
  sorted, joined string, so equality checks stay cheap. The cost is O(nodes × edges) per store
  change, which is the pattern the React Flow docs warn about, mitigated by string equality.
- It doesn't use `onlyRenderVisibleElements`.
- It computes a dynamic `minZoom` (floor 0.05) so the whole schematic fits.
- Rooms are React Flow nodes.

**Routing:**
- Its own orthogonal router runs in a **Web Worker pool**. It tries a portfolio of candidate
  strategies, scores them and streams better results as they arrive
  ([`routingClient.ts`](https://github.com/duremovich/EasySchematic/blob/master/src/routing/routingClient.ts)).
  A headless harness gates router changes on crossing and bend metrics
  ([`routingHarness/README.md`](https://github.com/duremovich/EasySchematic/blob/master/src/routingHarness/README.md)).
- Users reported 10-second routing on large schematics. The fix was an auto-route toggle and a
  header warning that auto-routing "can cause performance issues on large schematics"
  ([#56](https://github.com/duremovich/EasySchematic/issues/56),
  [#57](https://github.com/duremovich/EasySchematic/issues/57)).

### 2.4 Fit for the signal-flow canvas

| Requirement | React Flow | Konva | Plain SVG |
|---|---|---|---|
| Many ports per device | First-class handles with ids, connection line, validation, reconnect | No port concept: build hit areas, connection drag and validation yourself | Build everything yourself |
| Several signal domains | Filter handles or edges per layer; style edges per type | Own code | Own code |
| Live Convex updates | Controlled `nodes`/`edges`; stable object identity matters for memo (inference) | react-konva reconciles; `useSyncExternalStore` is covered by its tests ([compat matrix](https://github.com/konvajs/react-konva/blob/master/docs/react-compatibility.md)) | React reconciles directly |
| Device nodes with shadcn/ui inside | Yes: nodes are HTML | No: canvas only, needs DOM overlays | Only via `<foreignObject>` |
| Scale | No stated ceiling; DOM and measurement bound (§2.2) | Canvas: no per-shape DOM, but per-layer memory limits (§3.4) | DOM-bound like React Flow, minus handle measurement |
| Auto-layout hookup | Documented recipes for dagre and ELK ([Layouting](https://reactflow.dev/learn/layouting/layouting)) | Own code | Own code |
| Prior art | EasySchematic, LZ | None found | None found |

---

## 3. Stage map

Requirements from the ticket:
- centimetre coordinates on a metric grid;
- a PDF or image underlay through pdf.js;
- two-point calibration, and reading a PDF's embedded scale;
- zones as polygons;
- cable routes as polylines through anchor points, with lengths measured from them.

### 3.1 pdf.js: what it gives the stage map

From [`src/display/api.js`](https://github.com/mozilla/pdf.js/blob/v6.4.299/src/display/api.js) and
[`page_viewport.js`](https://github.com/mozilla/pdf.js/blob/v6.4.299/src/display/page_viewport.js)
at v6.4.299:

- **Page geometry:**
  - `page.view` is "the visible portion of the PDF page in user space units `[x1, y1, x2, y2]`".
  - `page.userUnit` is "the default size of units in 1/72nds of an inch". Large-format pages can
    set it above 1.
  - `page.rotate` gives the page rotation.
- **Viewport:** `page.getViewport({ scale, rotation, offsetX, offsetY, dontFlip })` returns a
  `PageViewport` with a transform. `convertToViewportPoint` and `convertToPdfPoint` map between
  canvas pixels and PDF user space. This is the bridge from a click on the raster back to
  PDF points.
- **Render:** `page.render({ canvas, viewport, transform, background, … })`. `canvas` is now the
  recommended parameter; `canvasContext` is kept "for backwards compatibility".
- **Text and drawing ops:** `getTextContent()` returns text items with `str` and a
  `transform`, for finding "1:100" or dimension strings. `getOperatorList()` returns the
  drawing ops (covered in the 10-29 research).
- **No `/VP` support.** `src/core/document.js` and `src/core/annotation.js` at v6.4.299 contain
  no `VP`, `Viewport` or `Measure` lookups (checked by grep). pdf.js has no public API for raw
  page-dictionary entries.
- **Canvas size limits.** These are the pdf.js *viewer's* defaults, not the library's
  ([`web/app_options.js`](https://github.com/mozilla/pdf.js/blob/v6.4.299/web/app_options.js)):
  - `maxCanvasPixels` = 2²⁵ (about 33.5 MP) on desktop and 5,242,880 (5 MP) on iOS/Android,
    with the comment "Limit canvas size to 5 mega-pixels on mobile";
  - `maxCanvasDim` = 32767;
  - `enableDetailCanvas` = true, which re-renders the visible region at high zoom.

  A floor plan zoomed to centimetre detail outgrows one raster. The viewer's answer is a capped
  base raster plus a detail render of the visible part.
- **Bundle weight:** `pdf.min.mjs` is 459 KB and `pdf.worker.min.mjs` 1.26 MB (6.4.299 tarball).
  LZ Cable Planner makes pdf.js optional for the same reason: "pdf.js wiegt mit Worker über ein
  Megabyte" (pdf.js with its worker weighs over a megabyte)
  ([`planDatei.ts`](https://github.com/larszu/cable-planner/blob/main/src/renderer/avplan/floorplan/planDatei.ts),
  behaviour reference). LZ caps stored plans at 3,000 px on the long edge.

### 3.2 Reading a PDF's embedded scale

[ISO 32000-1:2008 §12.9](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf)
(PDF 1.7; Adobe's free copy, pp. 479–482) defines it. The 10-29 research cited only secondary
javadocs for this.

- **The page `/VP` entry.** It's an array of viewport dictionaries "in drawing order".
  - To pick the viewport for a point, iterate "starting with the last one and iterating in
    reverse", and take the first whose `BBox` contains the point.
  - A distance between two points "shall use the information specified in the viewport of the
    first point".
- **Viewport dictionary (Table 260):**
  - `BBox` (required) is in default user space. Its corner order also sets the measuring axes'
    orientation.
  - `Name` (optional) is a title for the UI.
  - `Measure` (optional) holds the scale.
- **Measure dictionary (Tables 261–262):** `Subtype` defaults to `RL` (rectilinear).
  - `R` (required) is only a display string, e.g. "1/4 in = 1 ft".
  - `X` (required) is a number-format array. Its "first element … shall contain the scale factor
    for converting from default user space units to the largest units". `Y` appears only when
    the axes differ, with `CYX` relating them.
  - `D` (distance) and `A` (area) are required. `O` sets the origin.
- **Number format dictionary (Table 263):** `U` is the unit label (e.g. "m"); `C` is the
  conversion factor.
- **The conversion** (inference from the tables): real distance between PDF-space points p and q
  in viewport v = `|p − q| × X[0].C × D[0].C`, in `D[0].U` units. Multiply by `userUnit` first
  if it isn't 1.

**How to read it in JS.**
- pdf.js doesn't expose it (§3.1).
- pdf-lib exposes the raw page dictionary: `PDFPage.node` is a `PDFPageLeaf`, which `extends
  PDFDict` with `get`/`lookup`
  ([`PDFPageLeaf.ts`](https://github.com/Hopding/pdf-lib/blob/master/src/core/structures/PDFPageLeaf.ts),
  [`PDFDict.ts`](https://github.com/Hopding/pdf-lib/blob/master/src/core/objects/PDFDict.ts)). Upstream
  is unmaintained (last release 2021-11); the MIT fork `@cantoo/pdf-lib` is active (2026-09).
- A minimal PDF-object parser of our own is the other option (inference).
- `mupdf` (npm 1.28.1) is AGPL-3.0, so it's license-compatible, but it's a WASM build of a full
  PDF engine. Its API for `/VP` is **Unverified**.

**Which exporters write `/VP`: Unverified.** Search snippets of an Autodesk support article and
Autodesk forum threads say:
- AutoCAD's PDF plotters embed scale for **rectangular** viewports only;
- Revit's PDF export doesn't embed it.

I couldn't open the Autodesk article (403), so treat both as unverified. Acrobat ("Use scale and
units from document") and Bluebeam ("Use Embedded Scale") read the data when it's present.

### 3.3 Two-point calibration (inference; no library needed)

- **Inputs:** two clicked points in PDF user space (from `convertToPdfPoint`) or in image pixels,
  plus a user-entered distance in cm.
- **Scale:** `cm per unit = distance_cm / |p − q|`.
- **Plan placement on the stage grid:** a similarity transform (scale, rotation, translation).
  Two point pairs fix it exactly.
- **Photos and perspective:** LZ's four-point mode solves a homography. Its source explains why
  ("parallel edges converge, one axis is compressed")
  ([`massstab.ts`](https://github.com/larszu/cable-planner/blob/main/src/renderer/avplan/floorplan/massstab.ts),
  proprietary; read for behaviour only).
- **Precision:** the geometry is renderer-independent, so it can live in a pure module shared
  with the MCP tools. Metric coordinates stored as floats in cm are precise far beyond venue size:
  a 500 m venue is 5 × 10⁴ cm, well inside the 2⁵³ exact-integer range of a JS number.

### 3.4 React Flow vs Konva vs plain SVG for the stage map

**React Flow as a stage map**
- **Units:** flow coordinates are unitless, so 1 unit = 1 cm works.
  - Zoom defaults are `minZoom` 0.5 and `maxZoom` 2. Both are configurable, and a venue in cm
    needs a much wider range.
  - `translateExtent` and `nodeExtent` can bound the plan.
  - `snapToGrid` with `snapGrid` snaps placements ([props](https://reactflow.dev/api-reference/react-flow)).
- **Metric grid:** `<Background variant="lines">`.
  - `gap` can be a number or `[x, y]`.
  - Stacked backgrounds with unique `id`s make minor and major lines; the docs' example stacks
    `gap` 10 and 100 ([Background](https://reactflow.dev/api-reference/components/background)).
  - With 1 unit = 1 cm, `gap={10}` and `gap={100}` give 10 cm and 1 m lines (inference).
- **Underlay:** prior art makes the plan a node.
  - LZ: an `<img>` in the bottom-most node with an SVG overlay for calibration marks, and
    `pointer-events: none` when locked. It's a node rather than a CSS background "because the
    exports … determine their area from the `.react-flow__node`s"
    ([`GrundrissNode.tsx`](https://github.com/larszu/cable-planner/blob/main/src/renderer/components/Canvas/GrundrissNode.tsx)).
  - `<ViewportPortal>` also renders arbitrary children in flow coordinates
    ([ViewportPortal](https://reactflow.dev/api-reference/components/viewport-portal)).
- **Zones (polygons):** there's no polygon primitive. Options are a custom node whose box is the
  polygon's bounds with an SVG `<polygon>` inside, or SVG in a `ViewportPortal` (inference).
- **Cable routes:** a custom edge can draw any SVG path through stored anchor points. Dragging
  anchor points is the Pro "Editable Edge" example, under the "xyflow Pro License"
  ([example page](https://reactflow.dev/examples/edges/editable-edge)). Writing it from scratch
  avoids the license question.
  - Culling caveat: #6080 culls routed edges by their endpoints' box.
- **Racks and devices on the map:** ordinary nodes with drag, select and resize. Rich HTML and
  shadcn/ui work inside them.

**Konva**
- **Primitives:** `Konva.Line` takes a flat `points` array.
  - `closed: true` makes "a polygon or blob", so zones and cable polylines are one shape type.
  - `strokeScaleEnabled: false` keeps stroke width constant under zoom.
  - `hitStrokeWidth` widens the click target
    ([Konva.Line](https://konvajs.org/api/Konva.Line.html)).
  - `Konva.Image` can draw a canvas, e.g. a pdf.js render.
- **Performance and memory**
  ([tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)):
  - Every layer is a canvas plus a hit canvas: "about 41 MB per layer" on a 1920×1080 retina
    stage. Konva "warns above five layers".
  - Mobile Safari's 256–384 MB budget is a hard wall: "the canvas goes blank rather than
    degrading".
  - For very large scenes, cull with `visible(false)` after pan or zoom, set `listening(false)` on
    static layers, and cache complex groups.
  - There's no stated shape ceiling. The demos include "10000 Shapes with Tooltip".
- **React integration:**
  - react-konva puts a separate React root inside `<Stage>`. Context crosses it, but DOM error
    boundaries don't catch canvas errors
    ([compat matrix](https://github.com/konvajs/react-konva/blob/master/docs/react-compatibility.md)).
  - shadcn/ui components can't render inside the canvas, so menus and inspectors sit in DOM
    overlays.
  - The peer dep pins React to `^19.3.0`, so React upgrades wait on react-konva.
  - It needs client-only rendering. In TanStack Start that's `<ClientOnly>` from
    `@tanstack/react-router` ([docs](https://tanstack.com/router/latest/docs/framework/react/api/router/clientOnlyComponent)).
    react-konva's README documents the Next.js equivalent.
- **Accessibility:** canvas shapes aren't in the accessibility tree. Keyboard and screen-reader
  access needs a parallel DOM (inference).

**Plain SVG**
- **Coordinates:** an `<svg viewBox>` in cm. Zones are `<polygon>`, routes `<polyline>` or
  `<path>`, the plan an `<image>`.
- **Strokes:** `vector-effect="non-scaling-stroke"` keeps line widths constant under zoom.
  It's "Baseline … since July 2020" and applies to `<polygon>`, `<polyline>`, `<image>` and
  more. `non-scaling-size` is unimplemented and "at-risk"
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/vector-effect)),
  so constant-size markers or labels need a counter-scale per element.
- **Pan and zoom:** d3-zoom (ISC), or `XYPanZoom` from `@xyflow/system` (MIT), which is React
  Flow's own pan/zoom.
- **What you build yourself:** selection, drag, snapping, anchor editing, hit-testing and
  culling.
- **Strengths:** everything is DOM, so ARIA, CSS tokens from `flypack.css` and SVG export come
  for free (inference).

| Requirement | React Flow | Konva | Plain SVG |
|---|---|---|---|
| cm coordinates, metric grid | Unitless flow coords; stacked `<Background>` lines; `snapGrid` | Own grid layer; stage scale | `viewBox` in cm; SVG `<pattern>` grid |
| PDF/image underlay | Node or `ViewportPortal` with `<img>`/canvas (LZ does this) | `Konva.Image` from a pdf.js canvas | `<image>` or `<foreignObject>` canvas |
| Deep zoom on the plan | Re-render the visible region yourself (pdf.js detail-canvas idea) | Same | Same |
| Two-point calibration | Pure math + `screenToFlowPosition` | Pure math + stage transform | Pure math + `getScreenCTM` |
| Zones as polygons | Custom node or portal SVG | `Line closed` | `<polygon>` |
| Cable polylines with anchor points | Custom edge; waypoint editing is DIY (Pro example's license Unverified); culling caveat #6080 | `Line points`, plus draggable anchor circles | `<polyline>` plus anchor handles |
| Devices and racks with rich UI | HTML nodes, shadcn inside | Canvas shapes; DOM overlays for UI | `<foreignObject>` or overlays |
| Hit-testing thin lines | Edge `interactionWidth`: a hidden, wider path ([Edge type](https://reactflow.dev/api-reference/types/edge)) | `hitStrokeWidth` | Wide transparent stroke (inference) |
| Accessibility | Nodes and edges are "keyboard-focusable and operable"; arrow keys move nodes; `aria-live` announces moves ([Accessibility](https://reactflow.dev/learn/advanced-use/accessibility)) | Canvas: none built in | DOM, but keyboard handling is ours to build |
| Shared code with the signal-flow canvas | Same library, store patterns and selection model | Second rendering stack | Can reuse `XYPanZoom` |
| Scale ceiling | DOM-bound | Memory per layer; mobile Safari wall | DOM-bound |
| License and maintenance | MIT, active | MIT, very active | n/a; d3-zoom ISC, static |

---

## 4. Auto-layout and routing

### 4.1 ELK.js licence against AGPL-3.0

**What changed.**

| Version | npm `license` | Date |
|---|---|---|
| 0.11.0, 0.11.1 | `EPL-2.0` | 2025-09-15, 2026-03-03 |
| 0.12.0 | `EPL-2.0 OR GPL-3.0-or-later` | 2026-07-17 |
| 0.12.1 (latest) | `EPL-2.0 OR GPL-3.0-or-later` | 2026-10-28 |

- The [0.12.0 release notes](https://github.com/kieler/elkjs/releases/tag/0.12.0) say: "Most
  notably elkjs 0.12.0 adds GPL-3.0 as a secondary license, allowing elkjs to be used in GPL-3.0
  or later projects."
- Commit `277085e` (2026-07-07) "update license and headers to secondary license gpl3".
- elkjs [#373](https://github.com/kieler/elkjs/issues/373) and ELK
  [#1185](https://github.com/eclipse-elk/elk/issues/1185) gathered contributor consent. #373 was
  closed as completed on 2026-07-13 with **four of 19 listed contributors not ticked**. How the
  maintainers handled them is **Unverified**.
- The older question [#312](https://github.com/kieler/elkjs/issues/312) is still open.
- A maintainer there says the team is "rather trying to move to an MIT license". There's no date.

**The licence text, as shipped**
([`LICENSE.md`](https://github.com/kieler/elkjs/blob/master/LICENSE.md)):
- **Exhibit A is filled in:** "…the following Secondary Licenses … GNU General Public License
  v3.0 or later".
- **EPL-2.0 §1:** "Secondary License" means GPL-2.0 "or any later versions of that license".
  The AGPL is not in that definition.
- **EPL-2.0 §3.2(a):** source may be made available under the Secondary License if it "is
  combined with other material in a separate file or files made available under a Secondary
  License" and the initial Contributor attached the Exhibit A notice.
- **Source file headers** in elkjs (`ElkJs.java`, `elk-api.js`) and ELK
  (`LayeredLayoutProvider.java`) carry the notice and `SPDX-License-Identifier: EPL-2.0 OR
  GPL-3.0-or-later`. ELK's [`NOTICE.md`](https://github.com/eclipse-elk/elk/blob/master/NOTICE.md)
  declares the same.

**Eclipse and FSF guidance**:
- *Eclipse EPL-2.0 FAQ* ([eclipse.org/legal/epl-2.0/faq](https://www.eclipse.org/legal/epl-2.0/faq/)):
  - 4.1/4.15: an EPL-2.0 project is **not** GPL-compatible by default. Adding a secondary
    license "is considered a relicensing exercise and all copyright holders must agree".
  - 2.3: "The EPL-2.0 is the only license, until such time as it is combined and distributed
    with a work under the Secondary License. After such time, any recipient of the combined work
    can consider the content licensed under the Secondary License." Also: "The EPL-2.0 file
    headers should remain on the source code."
  - 4.27: without a Secondary License, "you may not combine EPL and GPL code in any scenario
    where linking exists".
  - 3.2: moving EPL-1.0 content to EPL-2.0 *with* a Secondary License needs "permission from all
    copyright holders". Moving to plain EPL-2.0 needs only updated notices (3.1, 4.19).
- *FSF license list*
  ([EPL2](https://www.gnu.org/licenses/license-list.en.html#EPL2)): EPL-2.0 "without this
  designation remains incompatible with the GPL". With an initial contributor's designation it
  is "roughly equivalent, for users, to releasing that piece of code under a dual license, EPL |
  GPL". EPL-1.0 is incompatible, for the same reasons as the CPL: "its weak copyleft and choice of
  law clause".
- *AGPL-3.0 §13* ([text](https://www.gnu.org/licenses/agpl-3.0.html)): "you have permission to
  link or combine any covered work with a work licensed under version 3 of the GNU General
  Public License into a single combined work". The GPLv3 part stays GPLv3. The Corresponding
  Source offered to network users "shall include the Corresponding Source for any work covered
  by version 3 of the GNU General Public License that is incorporated".

**The path that works for ELK's own code:** take elkjs ≥ 0.12.0 under GPL-3.0-or-later, the
secondary license, then combine it with AGPL-3.0 Flypack under AGPL §13. Flypack's source offer
must then cover elkjs's source too. Keep the EPL headers (FAQ 2.3).

**The gap: what else is compiled into the bundle.** elkjs is GWT-compiled Java.
[`build.gradle`](https://github.com/kieler/elkjs/blob/master/build.gradle) adds these as
`implementation` dependencies:

| Compiled into `elk-worker.js` | License | GPL secondary? | Evidence |
|---|---|---|---|
| ELK (`org.eclipse.elk.*`, ~2,470 class refs) | EPL-2.0 OR GPL-3.0-or-later | Yes | headers above |
| EMF for GWT 2.12.4 (`org.eclipse.emf.ecore.*`, `…common.*`, ~380 refs) | **EPL-1.0** | **No** | `com.genmymodel.emf.gwt:emf-parent:2.12.4` POM declares "The Eclipse Public License v1.0", and its source headers say so ([Maven Central](https://repo1.maven.org/maven2/com/genmymodel/emf/gwt/emf-parent/2.12.4/emf-parent-2.12.4.pom)). Upstream [EMF](https://github.com/eclipse-emf/org.eclipse.emf) is EPL-2.0 without a secondary license. |
| Xtext `xbase.lib` (`org.eclipse.xtext.xbase.lib`, 3 refs) | **EPL-2.0** | **No** | header `SPDX-License-Identifier: EPL-2.0` ([xtext repo](https://github.com/eclipse-xtext/xtext)), Exhibit A left blank |
| Guava (`com.google.common.*`) | Apache-2.0 | n/a (FSF: compatible with GPLv3) | ELK [`DEPENDENCIES`](https://github.com/eclipse-elk/elk/blob/master/DEPENDENCIES) |
| GWT runtime (`com.google.gwt.*`) | Apache-2.0 | n/a | GWT project |

Reference counts are class-name string occurrences in the 0.12.1 `lib/elk-worker.js`. They show
the classes are present, not how much code each contributes.

- **Neither #312 nor #373 mentions EMF or Xtext.** The elkjs issue search for "EMF" returns only
  #6 and #186, unrelated.
- **Whether the EPL-only parts make "elkjs under GPL-3.0" incomplete for an AGPL combination:
  Unverified. It's a legal question.** By FAQ 4.27 and the FSF entry, EPL code without a
  designated secondary license can't be combined with GPL code "where linking exists".

**Ways around it, if counsel says the bundle is a problem** (facts, not recommendations):
1. **Run ELK as a separate program**, e.g. a server-side process called over a pipe or HTTP.
   - The GPL FAQ says "pipes, sockets and command-line arguments are communication mechanisms
     normally used between two separate programs". It adds that "if the semantics of the
     communication are intimate enough, exchanging complex internal data structures, that too
     could be a basis" to treat them as one program
     ([#MereAggregation](https://www.gnu.org/licenses/gpl-faq.en.html#MereAggregation)).
   - An ELK JSON graph in and out is borderline by that wording (inference).
   - capellambse-context-diagrams takes this route for Apache-2.0 code
     ([#373 comment](https://github.com/kieler/elkjs/issues/373)).
2. **Ask upstream** to confirm the status of the EMF and Xtext classes, or to drop them.
3. **Avoid ELK:** use dagre and libavoid, or a custom router (EasySchematic's approach).

### 4.2 ELK features for port-accurate signal flow

From the [ELK Layered reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html):
- **What it suits:** "if orthogonal routing is selected, arbitrary port constraints are
  respected", which fits "block diagrams such as circuit schematics" (page's wording).
- **Supported features:** ports, multi-edges, self-loops, edge labels, compound graphs with
  cross-hierarchy edges (enabled at the top level), and clusters.
- **Port options:**
  - `portConstraints`: `UNDEFINED` (default), `FREE`, `FIXED_SIDE`, `FIXED_ORDER`, `FIXED_RATIO`,
    `FIXED_POS` ([option](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html));
  - also `portSide`, `portIndex`, `port.borderOffset` and port spacing.
- **Keeping a human's arrangement:**
  - "Interactive" layout (`false`) and semi-interactive crossing minimisation;
  - layer and position IDs and choice constraints;
  - `considerModelOrder` (`NONE`).
- **Runtime:**
  - Async. Web Workers are "supported out of the box" via `workerUrl`
    ([README](https://github.com/kieler/elkjs/blob/master/README.md)).
  - `elk-worker.min.js` is 1.63 MB (0.12.1 tarball).
- **Size limits:** the reference page states none. Related knobs: `thoroughness` 7, high-degree
  node treatment, separate connected components on by default.
- **React Flow's view** ([Layouting](https://reactflow.dev/learn/layouting/layouting)): ELK is
  "the most configurable option available, but it's also the most complicated". They "don't often
  recommend elkjs because it's complexity makes it difficult for us to support folks". The docs
  also list an "Elkjs Multiple Handles" example.

### 4.3 dagre

- **License and state:** MIT. Revived under `@dagrejs/dagre` (3.1.3, 2026-10-24); "only the one in
  the DagreJs org is receiving updates" ([README](https://github.com/dagrejs/dagre)).
- **No port model.** The 3.1.3 dist has no port option. Layout options are `rankdir`, `ranker`,
  `nodesep`, `edgesep`, `ranksep`, `align` and `acyclicer`.
- **Edge routing:** none. Edges get waypoints from rank layout but don't avoid nodes
  ([React Flow table](https://reactflow.dev/learn/layouting/layouting): "Edge routing: No").
- **React Flow's view:** "a simple library … largely a drop-in solution … a focus on speed over
  choosing the most optimal layout". It needs node dimensions. An open issue breaks sub-flow layout
  "if any nodes in the sub-flow are connected to nodes outside the sub-flow".

### 4.4 libavoid and libavoid-js

- **What it is:** "fast, object-avoiding orthogonal and polyline connector routing" for
  "interactive diagram editors" ([libavoid](https://www.adaptagrams.org/documentation/libavoid.html)).
  The design is described in the papers it cites: "Incremental connector routing" (GD '05) and
  "Orthogonal connector routing" (GD '09). It's a router, not a layout engine: node positions
  come from users, ELK or dagre.
- **License path to AGPL:** "LGPL 2.1 or later"
  ([README](https://github.com/mjwybrow/adaptagrams)).
  - LGPL-2.1 §3 lets you "apply the terms of the ordinary GNU General Public License … (If a
    newer version than version 2 … has appeared, then you can specify that version instead)"
    ([LGPL-2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.txt)).
  - So GPLv3, then AGPL §13. Alternatively, LGPL §6 allows combining with terms of your choice
    that permit modification.
  - The FSF lists LGPLv2.1 as compatible with GPLv2 and GPLv3.
  - Contributions upstream require copyright assignment to Monash University, which keeps the
    commercial dual licence possible.
- **libavoid-js:**
  - Emscripten WebIDL bindings; "works in both webbrowser and node.js"
    ([README](https://github.com/Aksem/libavoid-js)).
  - Started as a TU Wien research project.
  - 0.5.0-beta.5, 46★, 5 open issues.
  - For AGPL Corresponding Source, the WASM's source is adaptagrams plus the repo's
    `tools/generate.py` build (inference).
- **In React Flow's docs:** the Pro edge-routing example "uses libavoid to compute paths around
  nodes as the diagram changes"
  ([Layouting](https://reactflow.dev/learn/layouting/layouting)). It's Pro, with licence terms
  **Unverified**.

### 4.5 Comparison

| | ELK.js | dagre | libavoid-js | Custom A\* (EasySchematic-style) |
|---|---|---|---|---|
| License | EPL-2.0 OR GPL-3.0+ (ELK code), but the bundle includes EPL-only EMF/Xtext (§4.1) | MIT | LGPL-2.1+ | Ours (AGPL) |
| Node layout | Yes (layered, stress, mrtree, radial, force, disco) | Yes (layered) | No | No |
| Port-aware | Yes: sides, order, fixed positions | No | Connection pins on shapes (**Unverified**: I didn't check libavoid's API docs) | Yes, by construction |
| Orthogonal edge routing | Yes (with layout) | No | Yes, incremental, around obstacles | Yes |
| Keeps a manual layout | Semi-interactive options | No | Routes only; never moves nodes | Yes |
| Runtime | Worker, 1.63 MB | Small, sync | WASM | Worker pool (EasySchematic) |
| Maintenance | Active (2026-10) | Active (2026-10) | Beta; upstream has no releases | Ours to maintain |
| Known scale issues | None stated | None stated | None stated | EasySchematic: ~10 s on large schematics before the toggle (#56) |

---

## 5. ADR 0001 check

| Dependency | License | Compatible with AGPL-3.0? | Basis |
|---|---|---|---|
| `@xyflow/react`, `@xyflow/system` | MIT | Yes | FSF: Expat is "compatible with the GNU GPL" |
| React Flow **Pro examples** | xyflow Pro License | **Unverified** | Terms not public on [reactflow.dev/pro](https://reactflow.dev/pro) |
| d3-zoom, d3-drag, d3-selection | ISC | Yes | FSF: ISC "compatible with the GNU GPL" |
| Konva, react-konva | MIT | Yes | as above |
| pdfjs-dist | Apache-2.0 | Yes | FSF: "compatible with version 3 of the GNU GPL" |
| pdf-lib, `@cantoo/pdf-lib` | MIT | Yes | |
| mupdf (npm) | AGPL-3.0-or-later | Yes | Same license |
| elkjs ≥ 0.12.0 | EPL-2.0 OR GPL-3.0-or-later (+ bundled EPL-only EMF/Xtext) | **ELK code: yes, via GPLv3 + AGPL §13. Bundle as a whole: needs confirmation** | §4.1 |
| elkjs ≤ 0.11.x | EPL-2.0 | No | Eclipse FAQ 4.27; FSF |
| `@dagrejs/dagre` | MIT | Yes | |
| libavoid / libavoid-js | LGPL-2.1-or-later | Yes | LGPL-2.1 §3 → GPLv3 → AGPL §13 |
| `@joint/core` | MPL-2.0 (no Exhibit B) | Yes | MPL-2.0 §1.12 lists AGPL-3.0 as a Secondary License; §3.3 |
| tldraw SDK | tldraw license | No | ADR 0001 |

ADR 0001 says ELK "is compatible through EPL's secondary-license clause". That holds for ELK's
own code from 0.12.0 on, but not for the EPL-only classes compiled into the same file.

---

## What this means for Flypack

Facts and options, not decisions.

**Facts**
- React Flow is MIT, active, and is what both open prior-art tools use for signal flow *and* for
  the floor plan. Its scaling story is memoisation, narrow selectors, declared node sizes and
  handles, and optional bounding-box culling. It publishes no node or edge ceiling.
- A port-heavy device is costly in React Flow: one DOM handle per port, each re-measured on node
  updates unless handles are declared. EasySchematic keeps it workable by hiding ports by signal
  type, per device and when unconnected. That maps onto Flypack's layers and signal domains.
- Culling and routed edges conflict today (#6080, open). Any stage-map route or signal-flow wire
  that bends outside its endpoints' box disappears when culling is on.
- pdf.js renders and maps coordinates, but it can't read `/VP` `/Measure`. Reading embedded
  scale means parsing the page dictionary separately: pdf-lib (stale), `@cantoo/pdf-lib`
  (active), or our own parser. Whether common CAD exports write `/VP` is still unverified.
- Konva is the most active and gives polygon and polyline primitives with hit-testing. It costs a
  second rendering stack, no shadcn/ui inside the canvas, a React-minor peer pin, and hard
  memory limits on mobile Safari.
- ELK is the only candidate with port-constrained layout plus orthogonal routing. Its own code is
  now GPL-3.0-compatible, but its browser bundle carries EPL-only EMF and Xtext classes.
- The two React Flow examples closest to Flypack's needs, waypoint editing and libavoid routing,
  are Pro examples under an unpublished licence.

**Options for the signal-flow canvas**
1. React Flow with one handle per *visible* port. Filter by layer or signal domain, declare node
   sizes and handle positions from the device template, and keep Convex data in narrow
   selectors.
2. As option 1, plus `onlyRenderVisibleElements`, accepting #6080 or contributing the
   `isEdgeVisible` hook it proposes.
3. JointJS core (MPL-2.0, first-class ports). Not evaluated here; no prior art in this domain.

**Options for the stage map**
1. React Flow again: plan as the bottom node (LZ's pattern), zones as polygon nodes, routes as
   custom edges with our own anchor editing. One library, store and selection model across both
   views.
2. Konva (react-konva) for the stage map only, with React Flow for signal flow. Better
   primitives, but two rendering stacks.
3. Plain SVG in cm with `XYPanZoom` or d3-zoom. The most control and best accessibility, but the
   most code to write (selection, drag, snapping).

Any of the three can share one pure geometry module (calibration, transforms, polyline lengths)
with the MCP tools.

**Options for layout and routing**
1. ELK in the browser after a licensing answer on the bundled EMF and Xtext classes. Upstream
   says it is working toward MIT, with no date.
2. ELK as a separate server-side program, with the GPL FAQ's "arm's length" caveat.
3. dagre for coarse placement plus libavoid-js for port-to-port orthogonal routing. Both are
   compatible; libavoid-js is beta.
4. No auto-layout in the first slice: manual placement plus a custom router, as EasySchematic
   does, with its known cost on large schematics.

**Open items to verify**
- The licence status of elkjs's compiled EMF and Xtext classes: ask upstream or counsel.
- The xyflow Pro License terms, if any Pro example code is wanted.
- Whether the reference venue's plans (AutoCAD, Revit or other) carry `/VP` `/Measure`. Test
  with the files themselves, via `FLYPACK_REFERENCE_SHOW_DIR`, never in public.
- A real benchmark: a synthetic demo show at the target scale (devices × ports × edges) in React
  Flow, with and without declared handles and culling.
