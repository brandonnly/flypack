# Agent-first patching & documentation tool: research for the wayfinder session

Researched 2026-10-29. Primary sources only, unless a line says otherwise. **Unverified** marks a
claim I couldn't trace to a primary source. "Marketing page" means the vendor's own site, but with
no docs behind it.

---

## TL;DR: read these before the session

| # | Read | Why |
|---|------|-----|
| 1 | [EasySchematic `src/types.ts`](https://github.com/duremovich/EasySchematic/blob/master/src/types.ts) | The most complete open data model for AV signal flow: `Port`, `ConnectionData`, patch-panel hops, bundles, room distances. It's AGPL, so read it for ideas, not code. |
| 2 | [LZ Cable Planner README](https://github.com/larszu/cable-planner/blob/main/README.md) + [`mcpServer.ts`](https://github.com/larszu/cable-planner/blob/main/src/main/mcp/mcpServer.ts) | The closest prior art to the vision: 26 MCP tools, voice → preview → one undo step, and calibrated PDF floor plans. The license is proprietary, so use it as a spec reference only. |
| 3 | [WireFlow: Connect to Claude](https://wireflow.live/docs/connect-wireflow-to-claude) | A remote MCP server on a commercial AV tool. A stale full rewrite fails with `CONFLICT`, and the last 10 versions are kept. |
| 4 | [MCP 2026-07-28 changelog](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx) | MCP is now **stateless**: no `initialize`, no sessions. That changes the "one Durable Object per MCP session" argument. |
| 5 | [Cloudflare `McpAgent` (now deprecated)](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/) + [Agents API](https://developers.cloudflare.com/agents/api-reference/agents-api/) | `McpAgent` is feature-frozen; the replacement is stateless `createMcpHandler`. A named Agent (a Durable Object) per project is the multiplayer half. |
| 6 | [Convex OCC](https://docs.convex.dev/database/advanced/occ) + [limits](https://docs.convex.dev/production/state/limits) + [`convex/mcp`](https://github.com/convex/mcp) | Serializable transactions that retry automatically. The official component serves a remote MCP endpoint with OAuth from HTTP actions. |
| 7 | [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md) + [tldraw sync](https://tldraw.dev/docs/sync) | Production use needs a paid license key. Sync is server-authoritative with one Durable Object per room, which is a working reference design. |
| 8 | [Claude: coordinates and bounding boxes](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates) | Coordinates returned for a PDF can't be mapped back onto the page. Rasterize floor plans yourself, pre-resize them, then ask for pixel coordinates. |
| 9 | [Anthropic: Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | Merge chained steps into one tool, return readable identifiers, write actionable errors, and test tools with evals. |
| 10 | [NetBox devicetype-library schema](https://github.com/netbox-community/devicetype-library/tree/master/schema) (CC0) + [EasySchematic public API](https://docs.easyschematic.live/api) | The two biggest open device/port datasets. NetBox data is free to reuse, but it has no signal-type concept. EasySchematic has 4,515 AV templates but no stated data license. |
| 11 | [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview) | Tools can return interactive UI (for example a patch preview with Apply/Reject) inside Claude and Claude Desktop. |

**Five findings that change the framing**

- **Prior art for "speak a patch" already exists.** LZ Cable Planner's *Cable by voice* matches a
  sentence offline against plan names, shows a preview, offers a converter when no cable fits, and
  applies everything as one undo step
  ([README](https://github.com/larszu/cable-planner/blob/main/README.md)).
- **Two corrections to the brief:**
  - The AVIXA cable labeling standard is **F501.01**. F502.01 covers rack building
    ([AVIXA catalog](https://www.avixa.org/resources/standards/published-standards),
    [2018 press release](https://www.avixa.org/about-us/press-room/2018/09/19/avixa-releases-rack-building-standard-for-audiovisual-systems)).
  - The EasySchematic device API returns **4,515** templates as of today, not the 3,800+ the
    README claims (`GET https://api.easyschematic.live/templates`, counted 2026-10-29).
- **MCP went stateless on 2026-07-28, and Cloudflare deprecated `McpAgent`** in favour of
  stateless `createMcpHandler`. A Durable Object per project still makes sense, but as the
  document's home, not as the MCP session's home.
- **tldraw is not free in production.** You need a trial, hobby or commercial license key, and
  the license includes technical enforcement and a watermark
  ([LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md)).
- **None of the competitors exposes a remote MCP that writes to a multiplayer document.**
  - WireFlow refuses API edits to "Team, live-collaboration and site-map diagrams"
    ([doc](https://wireflow.live/docs/connect-wireflow-to-claude)).
  - EasySchematic's and LZ's MCP servers are localhost-only. LZ's cloud connector is read-only.

---

## 1. Prior art: features and data models

### 1.1 EasySchematic (AGPL-3.0)

Sources: [repo](https://github.com/duremovich/EasySchematic) (license AGPL-3.0, 140★, last push
2026-10-05), [README](https://github.com/duremovich/EasySchematic/blob/master/README.md),
[`src/types.ts`](https://github.com/duremovich/EasySchematic/blob/master/src/types.ts).

**Stack:** React 19, `@xyflow/react` v12, Zustand v5, Tailwind 4, Vite. Its API and device
database run on Cloudflare Workers + D1
([README "Tech Stack"](https://github.com/duremovich/EasySchematic/blob/master/README.md)).

**Features worth matching** (all from the README unless linked):
- Click- or drag-to-connect with live compatibility colouring.
- A\* routing with waypoints and line jumps
  ([`src/routing/`](https://github.com/duremovich/EasySchematic/tree/master/src/routing)).
- 73 signal types (I counted the `SignalType` union in `types.ts`; it matches).
- Adapters inserted automatically between incompatible ports.
- **Bundles** (snakes/multicores): each member stays its own cable in the schedule.
- **Rooms** with room-to-room distances that feed cable lengths.
- **Device swap** with a port-mapping dialog, applied as one undo step.
- Expansion slots, including nested SFP slots.
- Rack builder with front, rear and side views, and a face-plate editor.
- Virtual patch panels with per-segment cable IDs (`E001-A/-B`).
- Print sheets with vector PDF output.
- Reports: pack list vs owned gear, cable schedule, patch panel schedule, network report (IP, VLAN,
  DHCP, PoE), and power/thermal report.
- Exports: DXF ([`src/dxfExport/`](https://github.com/duremovich/EasySchematic/tree/master/src/dxfExport)),
  PDF, PNG, SVG and JSON with schema migrations. CSV cable schedule import.
- Offline PWA.

**Data model** ([`types.ts`](https://github.com/duremovich/EasySchematic/blob/master/src/types.ts)):

| Concept | How it's modelled |
|---|---|
| Device | A React Flow node (`DeviceData`) holding `ports: Port[]`, `templateId`/`templateVersion`, `manufacturer`, `modelNumber`, `slots`, power/PoE/thermal fields, `hostname`, `unitCost`, `serialNumber`, `isSpare`, `procurementSource`, mm dimensions, `rackForm` and `offCanvas` (used by patch panels). |
| Port | `id`, `label`, `signalType`, `direction` (`input\|output\|bidirectional\|passthrough`), `connectorType` (~90 values from BNC to opticalCON), `gender`, front/rear connector for passthrough, `normalledTo` + `normalling` (`full\|half\|none`), `networkConfig` (IP, mask, gateway, VLAN, DHCP), `poeDrawW`, `linkSpeed`, `isMulticable` + `channelCount`, `multiConnect` (for example an SRT receiver), `templatePortId` (for template-sync reconciliation). |
| Connection | A React Flow edge with `ConnectionData`: `signalType`, `cableId`, `cableLength` (a string), `bundleId`, `patchHops[]` (patch panel and passthrough port, in order), `patchSegments[]` overrides, `cableUse` (`patch\|field`), `gaugeAwg`, `tested`/`testedDate` and `allowIncompatible`. |
| Signal types | A closed union of 73 string literals, `custom` among them. Colours and line styles can be overridden per file. |
| Cable length | `SchematicFile.roomDistances` (pairwise between top-level rooms) plus `DistanceSettings { unit, slackPercent (default 15), slackFixed }`. The default unit is ft. |
| File | One `SchematicFile` JSON: nodes, edges, pages (rack / print sheet / patch panel), bundles and a `version` used by migrations. |

Notes:
- **Direction plus a "face"** (in/out for bidirectional ports, rear/front for passthrough) is how
  EasySchematic's MCP tool tells the two sides of one port apart
  ([`mcp-server/src/tools.ts`](https://github.com/duremovich/EasySchematic/blob/master/mcp-server/src/tools.ts)).
  Copy the idea for patch bays, but not the code.
- `cableLength` is a free string, not a number with a unit. Avoid that.

**MCP (beta).** [README](https://github.com/duremovich/EasySchematic/blob/master/mcp-server/README.md),
[docs](https://docs.easyschematic.live/ai-assistant).
- **Transport:** stdio MCP to Claude, then a `ws://127.0.0.1` bridge (default port 8765) to the
  open browser tab.
- **Access:** needs a pairing token and an Origin allow-list. One tab is bound at a time.
- **Write limits:** structural fields (ports, slots) can't be edited over MCP.
- **The 26 tools** ([`tools.ts`](https://github.com/duremovich/EasySchematic/blob/master/mcp-server/src/tools.ts)):
  - Read: `get_schematic`, `list_devices`, `get_device`, `search_templates`.
  - Devices: `add_device`, `add_devices` (batch), `set_device_property`, `move_device`,
    `delete_device`.
  - Connections: `connect_devices`, `connect_devices_batch`, `delete_connection`.
  - Rooms: `create_room`, `place_device_in_room`.
  - Notes: `add_note`, `update_note`, `delete_note`.
  - Cards: `list_slot_cards`, `install_card`, `install_card_batch`, `remove_card`.
  - Racks: `list_racks`, `create_rack`, `place_device_in_rack`, `place_device_in_rack_batch`,
    `remove_device_from_rack`.
- **Batch semantics:** "Best-effort: each connection is attempted independently and the result
  lists per-connection success or failure". Batches are applied in array order, up to 100 items.
- It also ships MCP **prompts** (`build-schematic`, `rack-elevation`, `modular-chassis`) and server
  instructions.

### 1.2 LZ Cable Planner (proprietary; spec reference only)

**License:** [LICENSE](https://github.com/larszu/cable-planner/blob/main/LICENSE) (German and
English).
- It forbids "Bearbeitung … oder Erstellung abgeleiteter Werke, einschliesslich der Verwendung des
  Quellcodes" (editing or creating derivative works, including using the source code) and
  offering its functions as a service.
- Source is published "zur Einsicht" (for inspection) only.
- **Don't copy code, schemas or tool descriptions verbatim.**

**Stack:** Electron + React 19, React Flow, three.js, Zustand
([README](https://github.com/larszu/cable-planner/blob/main/README.md)).

**Behaviour worth matching or beating** (README and
[English manual](https://github.com/larszu/cable-planner/blob/main/docs/manual/manual.en.md)):

- **Floor plan.** An image or PDF (one page chosen) goes under the canvas, can be cropped, and
  each floor gets its own plan.
  - Scale is set in one of two ways ([manual §Floor plan](https://github.com/larszu/cable-planner/blob/main/docs/manual/manual.en.md)):
    - **Two points:** a known distance in metres, then two clicks.
    - **Four corners:** a W × D rectangle for perspective photos or isometric drawings.
  - Then "*Recalculate cable lengths* determines the lengths along the drawn routes".
- **Length estimate without a plan:** "straight line × scale plus slack". Slack runs 0–200 %, with
  optional rounding up to whole metres.
- **Stock lengths:**
  - The BOM splits each run into stock lengths, "fewest couplers first, least excess second", and
    reports any shortfall.
  - An empty "In stock" means "not counted", not zero.
  - The BOM adds a reserve markup, 10 % by default.
- **Risers:** a frame marked *Riser / vertical cable route* carries cables between floors.
- **Crossings list:** a fire-protection export of every room boundary or slab a cable passes.
- **Cable ends** read *floor · room · device · port*. A signal path can be traced through plates
  and house runs.
- **Patch panel labels** print at 1:1 and export for Brother P-touch or Dymo. Panels are checked
  against the rack builder.
- **Voice** (prior art for Brandon's idea):
  - It parses sentences such as "SDI 1 from the ATEM to the NEC in the foyer", in German and
    English, with several cables separated by full stops.
  - Matching is fuzzy and offline against plan names.
  - It always shows a **preview**: ambiguous devices or ports are picked from a list, and an
    occupied input is replaced only when ticked.
  - It proposes a converter when no cable fits, and offers a library device if the plan doesn't
    have one yet.
  - Everything lands as **one undo step**.
  - Audio comes from OS dictation, or the browser where speech recognition works.
- **AI plan generation:**
  - It reads block diagrams, IP lists, BOMs and floor plans, and proposes only what's missing.
  - Where a value differs from the plan, it lists a warning and keeps the plan's value.
  - Proposals show as a preview and apply as one undo step.
  - Each new item "names the document it came from" (provenance).
- **Collaboration:** live co-editing over WebRTC and an optional cloud copy with revisions. Phones
  join by QR to tick off work and send photos.
- **Offline first.** One JSON file per project.

**MCP** ([`src/main/mcp/mcpServer.ts`](https://github.com/larszu/cable-planner/blob/main/src/main/mcp/mcpServer.ts)):
- **Transport:** Streamable HTTP via `@modelcontextprotocol/sdk` (`StreamableHTTPServerTransport`)
  on `http://127.0.0.1:4187/mcp`, with a bearer pairing token.
- **Read-only cloud connector:** claude.ai can reach a separate one at
  `https://devices.zumpelars.de/mcp` ([manual §MCP](https://github.com/larszu/cable-planner/blob/main/docs/manual/manual.en.md)).
- **Write tools are only registered when the user turns writing on** (`if (state.schreibenErlaubt)`).
  Each tool sets `readOnlyHint`/`destructiveHint`/`idempotentHint` annotations.
- **The 26 tools:**
  - Read: `list_devices`, `device_ports`, `trace_signal`, `list_cables`, `plan_findings`,
    `search_library`, `verify_cabling`, `list_locations`, `list_floors`.
  - Write: `connect_ports`, `connect_many`, `add_device`, `create_device`, `set_rack_units`,
    `arrange_rack`, `disconnect_cable`, `set_cable`, `rename_device`, `set_device`, `set_devices`,
    `create_location`, `set_location`, `delete_location`, `place_in_location`, `create_floor`,
    `set_floor`.
- **Notable rules** (paraphrased from tool descriptions):
  - `connect_many` takes up to 200 cables in "one undo step", with a result or error per cable.
    Two cables onto the same input in one call are refused.
  - `connect_ports` flips reversed pairs, refuses in→in and out→out, refuses an occupied input
    unless `replace` is set, and "says what would fit if the two connectors do not mate".
  - Lookups accept a name **or** an id, and forgive case only when the match is unique.
  - `verify_cabling` diffs an expected cable list against the plan: missing, extra, wrong port,
    wrong direction.
  - A length nobody entered is returned as `null`, not 0.

### 1.3 WireFlow (commercial; remote MCP)

Source: [Connect WireFlow to Claude](https://wireflow.live/docs/connect-wireflow-to-claude). The
[home page](https://wireflow.live) is marketing.

- **Endpoint:** remote Streamable HTTP MCP at `https://wireflow.live/api/mcp`, plus REST.
- **Auth:** a personal API key as a bearer token. Claude Desktop's connector dialog has no header
  field, so there "the key goes in the URL".
- **Plans:** included with paid plans (Pro is $14.99/mo or $149.99/yr). "A Team seat on its own
  does not include API access."
- **Versioning:**
  - "Each API save keeps a snapshot of the version it replaces … the latest 10 are kept."
  - A full rewrite (`replace_diagram_state`) or restore "must name the saved version it is based
    on" and "fails with CONFLICT if someone saved since". REST has an optional
    `expectedStateSavedAt`.
  - "Smaller patches apply to the newest saved version."
- **Limits:** 120 requests/min per key. Team, live-collaboration and site-map diagrams **can't be
  edited through the API**.
- **Full tool list: not published.** Only `replace_diagram_state` and `duplicate_diagram` are
  named.
- **Data model: unverified.** `GET /api/v1/wfi/schema` returns 401 without a key (checked
  2026-10-29).
- **Features** (marketing page only): blocks HDMI→SDI and keeps Dante on network ports; cable
  schedules and BOM as CSV; rack elevations; LED wall pixel maps; PDF tech packs.

### 1.4 Patchify (commercial; no API)

Sources: [home page](https://patchify.app) (marketing),
[2.12 release notes](https://patchify.app/releases/2-12), [changelog](https://patchify.app/changelog).
There are no developer docs.

**Features:**
- "5,000+ pieces of pro AV gear", "50,000+" ports, custom gear.
- Auto cable numbering and patch lists. Racks from 1U to 42U with power/thermal.
- 2D/3D patch panel designer with front and back labels.
- Floor plans "to scale" (walls, doors, sight lines) and job sheets with signature capture.
- PDF, PNG, CSV and JPG exports. Share links (view or edit, password).
- Windows desktop app with offline sync.
- **Pricing:** Starter $15, Pro $30, Team $100, Business $250 per month.
- **Recent releases (changelog titles):**
  - Revisions (2.7.0)
  - Pull sheets and tie lines (2.8.0)
  - Floor plan drafting (2.9.0)
  - 3D floor plan (2.10.0)
  - Rack DXF, QR door labels and equipment schedule CSV (2.12, 28 Oct 2026)
  - "AI Kit List Matching" (v1.24)

**API/MCP:** no mention anywhere in the changelog titles or on the home page, and none found by
web search. Absence is confirmed only as "not found".

**PDF floor plan import with calibration:** not found. Only background images (v1.38, v1.53) and
drafted floor plans are mentioned.

### 1.5 Others (short)

| Tool | License | What's relevant | Source |
|---|---|---|---|
| PatchFlow (patchflow.ch) | Commercial beta, "on request" | Five layers (audio, video, network, lighting, power); "Zones and background plans"; PoE/DMX/VLAN/IP checks; 11,949 models from 253 makers. **PDF calibration isn't stated on the page (unverified).** No AI or MCP mentioned. | [patchflow.ch](https://patchflow.ch) (marketing) |
| Kumihimo | MIT | Text DSL with port ranges and signal types, e.g. `device sw "ATEM Mini" { in 1..8 : sdi }` and `cam.SDI -> sw.1 : sdi 30m "V-01"`. Its validator explains *why* a link is wrong (HDBaseT into a switch, reference into a video input). A good grammar seed for spoken or typed patching. | [repo README](https://github.com/Love-Rox/kumihimo) |
| SoundDocs | AGPL-3.0 (LICENSE file; GitHub shows "Other") | Patch sheets and stage plots. | [LICENSE](https://github.com/SoundDocs/sounddocs/blob/main/LICENSE) |
| NetBox MCP server | Apache-2.0 | Official but **read-only**. | [netboxlabs/netbox-mcp-server](https://github.com/netboxlabs/netbox-mcp-server) |
| Bluebeam Revu MCP, showcad-mcp (ConnectCAD) | — | From the prior survey. **Unverified this pass.** | — |

### 1.6 Feature parity checklist vs Patchify

✓ = has it, ~ = partial, ✗ = not found. Each cell follows the sources above.

| Feature | Patchify | EasySchematic | LZ Cable Planner | WireFlow | Target for us |
|---|---|---|---|---|---|
| Port-accurate device library | ✓ 5,000+ | ✓ 4,515 (live API) | ✓ 2,000+ | ✓ (size not stated) | Must |
| Custom devices | ✓ | ✓ guided builder | ✓ `create_device` | ✓ | Must |
| Signal/connector compatibility checks | ~ (implied) | ✓ 73 types, adapters | ✓ refuses mismatch, suggests converter | ✓ | Must, server-enforced |
| Auto cable numbering | ✓ | ✓ sequential / type-prefix | ✓ schemes + renumber | ✗ not stated | Must |
| Cable schedule / patch list export | ✓ CSV/PDF | ✓ PDF/CSV | ✓ CSV/PDF/XLSX | ✓ CSV | Must |
| Cable lengths | ✓ (v1.31, v1.70) | ✓ room-distance × slack | ✓ along drawn routes on calibrated plan | ✗ | Must, from floor plan |
| Rack elevations | ✓ 2D/3D, DXF | ✓ front/rear/side, PDF | ✓ incl. 3D | ✓ | Must |
| Patch panels | ✓ 2D/3D designer | ✓ virtual, per-segment IDs | ✓ 1:1 label strips | ✗ not stated | Must |
| Floor plan | ✓ drafted, to scale, 3D | ~ rooms only, no plan image | ✓ image/PDF, calibrated, per floor | ✗ | Must, PDF + calibration |
| Zones on plan | ~ ("patchlists and zones" on Pro) | ~ rooms | ✓ rooms/frames, floors, risers | ✗ | Must |
| Notes per rack | ✗ not found | ~ device notes, canvas notes | ~ notes on frames/devices | ✗ | Must (Brandon's ask) |
| Job sheets / checklists | ✓ with signatures | ✗ | ✓ phone tick-off + photos | ✗ | Should |
| Network report (IP/VLAN/PoE) | ✓ (v1.70 "Network & Power") | ✓ | ✓ | ✗ | Should |
| Power/thermal | ✓ | ✓ | ✓ | ✗ | Should |
| PDF export | ✓ true vector | ✓ vector | ✓ | ✓ | Must |
| DXF export | ✓ racks | ✓ schematic | ✗ not stated | ✗ | Should |
| Labels / QR | ✓ door labels | ✓ designation strips | ✓ P-touch/Dymo/QR | ✗ | Should |
| Realtime multiplayer | ~ teams, "live share" | ✗ | ✓ WebRTC co-edit | ✗ (live collab not API-editable) | Must |
| Version history | ✓ revisions | ✗ (file-based) | ✓ cloud revisions | ✓ last 10 per API save | Must, per agent action |
| Public API | ✗ | ✓ device DB only | ✗ | ✓ REST | Must |
| MCP | ✗ | ~ local beta | ~ local (+ read-only cloud) | ✓ remote | Must, remote + writable |
| Voice patching | ✗ | ✗ | ✓ preview + one undo | ✗ | Differentiator |
| Separate connection layers (video/network/audio/…) | ~ colour-coded | ~ hide by signal type | ✓ layer chips | ✗ | Must (Brandon's ask) |

---

## 2. Device and port data sources

| Source | Size | Format | License / reuse | Fit |
|---|---|---|---|---|
| EasySchematic community DB | 4,515 templates (live count 2026-10-29) | JSON from `GET https://api.easyschematic.live/templates`. Each item has `id`, `version`, `label`, `manufacturer`, `deviceType`, `category`, `searchTerms` and `ports[]` in the `Port` shape above ([API docs](https://docs.easyschematic.live/api)). | **No data license stated.** The docs say "help yourself", and `/templates/:id` returns contributor attribution. The repo is AGPL-3.0, and the bundled fallback set in `src/devices/*.ts` is AGPL code. Hosted data is in Cloudflare D1, not in the repo. **Treat bulk reuse as needing the maintainer's permission.** | Best AV fit: real signal types and connectors. |
| NetBox devicetype-library | 386 manufacturer folders; mostly IT, some AV (e.g. Blackmagic ATEM, Yamaha) | YAML validated by JSON Schema ([schema/](https://github.com/netbox-community/devicetype-library/tree/master/schema)) | **CC0-1.0** ([LICENSE.txt](https://github.com/netbox-community/devicetype-library/blob/master/LICENSE.txt)): reuse freely. | Good for switches, PDUs, rack sizes and PoE. Poor for AV (see below). |
| LZ Cable Planner catalogue | 2,000+ with datasheet links | — | Proprietary. **Don't use.** | — |
| Manufacturer data (e.g. Audinate Dante device library, AVIXA) | — | — | **Not researched this pass.** No AVIXA open device dataset found. | — |

**NetBox schema** ([devicetype.json](https://github.com/netbox-community/devicetype-library/blob/master/schema/devicetype.json),
[components.json](https://github.com/netbox-community/devicetype-library/blob/master/schema/components.json)):
- **Device fields:** `manufacturer`, `model`, `slug`, `u_height`, `is_full_depth` (required), plus
  `part_number`, `airflow`, `weight`/`weight_unit` and `subdevice_role`.
- **Component lists:**
  - `interfaces`: `type`, `mgmt_only`, `poe_mode`, and `poe_type` (`type1-ieee802.3af` …
    `type4-ieee802.3bt`, plus passive).
  - `console-ports`, `console-server-ports`.
  - `power-ports` (`maximum_draw`, `allocated_draw`) and `power-outlets` (`feed_leg`).
  - `front-ports` and `rear-ports` (`positions`), with `port-mappings` between front and rear
    positions.
  - `module-bays`, `device-bays`, `inventory-items`.
- **The AV gap:** front/rear-port `type` is a connector enum (`8p8c`, `bnc`, `lc`, `sc`, `mpo`,
  `usb-*`, `other` …). It has **no XLR, HDMI or speakON, no signal type and no direction.**
  - Example: the ATEM Constellation 8K models SDI inputs as `rear-ports` of type `bnc`
    ([YAML](https://github.com/netbox-community/devicetype-library/blob/master/device-types/Blackmagicdesign/atem-constellation-8k.yaml)).
- **Front/rear ports with position mappings** are a good, CC0 model for **patch panels and
  multicores** (one rear port with 16 positions maps to 16 front ports).

**What can legally be reused:**
- NetBox data, freely (CC0).
- EasySchematic's *data model ideas*: facts and field names aren't protected the way code is.
  This is a judgement, not legal advice.
- EasySchematic's *data*: only with permission or under AGPL obligations.
- LZ: nothing.

**Open question:** ask the EasySchematic maintainer for an explicit data license (e.g. CC-BY or
ODbL) before shipping a seeded library.

---

## 3. Domain standards worth encoding

### 3.1 Documentation and labeling standards (all paywalled)

| Standard | What it covers | Access |
|---|---|---|
| **AVIXA F501.01:2015** Cable Labeling for AV Systems (CLAS) | "defines requirements for audiovisual system cable labeling … easy identification of all power and signal paths" ([page](https://www.avixa.org/resources/standards/cable-labeling-for-av-systems)). Label content and placement rules are **not public**. | $75; free for AVIXA Premium/Elite members |
| **ANSI/AVIXA D401.01:2023** Documentation Requirements for AV Systems (formerly INFOCOMM 2M-2010) | System documentation, creation responsibility and delivery ([catalog](https://www.avixa.org/resources/standards/published-standards)) | $75 / member-free |
| **AVIXA F502.01:2018** Rack Building and **F502.02:2020** Rack Design | Rack assembly, cable management, separating signal from power, labeling at rack finish ([press](https://www.avixa.org/about-us/press-room/2018/09/19/avixa-releases-rack-building-standard-for-audiovisual-systems), [catalog](https://www.avixa.org/resources/standards/published-standards)) | $75 / member-free |
| **ANSI/AVIXA D402.02** AV Systems Performance Verification | Verification checklists; a possible source for job-sheet templates | $75 / member-free |
| **ANSI/TIA-606-D** (2021) Administration for telecom infrastructure | Identifier formats (a TIA-606-A-compatible one and an ISO/IEC TR 14763-2-1-compatible one), four administration classes, PoE administration ([Accuris store](https://store.accuristech.com/tia/standards/tia-ansi-tia-606-d?product_id=2594255)) | $321 ($240.75 members) |
| **ANSI E1.11** DMX512-A (ESTA) | 32 unit loads per link (§5.10) | **Free** from [ESTA TSP](https://tsp.esta.org/tsp/documents/docs/ANSI%20E1.11%20-%202024.pdf) |

**Unverified:** typical label-placement rules (1–12 in from the connector) appear in university
AV specs that cite F501.01 (e.g. UCCS). They are not from the AVIXA text.

**Takeaway:**
- Make the cable ID scheme configurable: a template with prefixes by signal type, room/rack codes
  and a sequence.
- Don't claim "F501.01 compliant" without buying and reading it.

### 3.2 Typical maximum run lengths per signal type

These are planning defaults for warnings. Real limits depend on the equipment.

| Signal | Typical max | Source / confidence |
|---|---|---|
| HDMI (passive) | No length in the spec; ~10 m seen passing Standard compliance; passive Ultra High Speed ~5 m | HDMI.org FAQ wording as quoted by [ViewSonic](https://www.viewsonic.com/uk/support/article?title=Does+HDMI+accommodate+long+cable+lengths%3F&articleId=33000232237). **hdmi.org itself not fetched (unverified).** |
| HD-SDI 1.5G | 112 m on 1694A, 117 m on 4694R | [Belden SDI coax chart](https://www.belden.com/products/cable/broadcast-cable/sdi-video-coax-cable). Values come from the SMPTE formula, not measured. |
| 3G-SDI | 155 m (1694A), 164 m (4694R) | Belden, as above |
| 6G-SDI | 104 m (1694A), 114 m (4694R) | Belden, as above |
| 12G-SDI | 78 m (4694R); 1694A not rated by Belden | Belden, as above. Blackmagic quotes 50 m on 1694A ([forum, secondary](https://forum.blackmagicdesign.com/viewtopic.php?f=4&t=54287)). |
| Ethernet (BASE-T), Dante, AES67, NDI, ST 2110 over copper | 100 m per hop (switch to device) | TIA-568 / IEEE 802.3 are **paywalled, not read**. Dante 100 m per hop per [Yamaha's Dante network design guide](https://usa.yamaha.com/products/contents/proaudio/docs/dante_network_design_guide/101_cables.html) and [Biamp](https://support.biamp.com/General/Networking/Dante). |
| Fiber | Depends on the optic (e.g. multimode SR in the hundreds of m, single-mode LR ~10 km) | **Unverified here.** Read lengths from the SFP datasheet and model them per transceiver. |
| HDBaseT | 100 m (Class A); Class B 70 m | [HDBaseT Alliance](https://hdbaset.org/hdbaset-technology/) |
| AES3 110 Ω | ~100 m | Secondary only ([Sound On Sound](https://www.soundonsound.com/techniques/digital-interfacing)). The AES3 standard is **paywalled (unverified).** |
| AES-3id 75 Ω | ~1,000 m | Secondary only (NTi/Rane notes). **Unverified.** |
| DMX512 | 32 unit loads per link (normative). Length isn't fixed by E1.11; the ESTA guide gives 1 km EIA-485 absolute max and recommends ≤90 m on Cat5. | [E1.11-2024](https://tsp.esta.org/tsp/documents/docs/ANSI%20E1.11%20-%202024.pdf), [ESTA DMX guide](https://tsp.esta.org/tsp/documents/docs/DMX512-A_Guide_(8x10)_ESTA.PDF) |
| PoE | Per class (PSE / PD): 1: 4 / 3.84 W; 2: 7 / 6.49 W; 3: 15.4 / 13 W; 4: 30 / 25.5 W; 5: 45 / 40 W; 6: 60 / 51 W; 7: 75 / 62 W; 8: 90 / 71.3 W. Types 1–4 map to af / at / bt / bt. | [Ethernet Alliance 802.3bt overview](https://ethernetalliance.org/wp-content/uploads/2018/04/WP_EA_Overview8023bt_FINAL.pdf) |

**Design implications:**
- Store limits as data (signal type × cable type × rate → max length), not code.
- Warn rather than block, because equalizers and active cables change the limits.
- Keep PoE budget per switch vs draw per port. EasySchematic already models `poeBudgetW` and
  `poeDrawW` ([types.ts](https://github.com/duremovich/EasySchematic/blob/master/src/types.ts)).

---

## 4. Realtime and multiplayer architecture

### 4.1 Convex

**Reactivity and transactions:**
- Queries are reactive subscriptions. Mutations are transactions using **optimistic concurrency
  control**: "the writes all commit if every version in the read set is still the latest version".
- Because mutations are deterministic, Convex "can simply re-run the transaction" on conflict, and
  it provides "true serializability"
  ([OCC doc](https://docs.convex.dev/database/advanced/occ)).
- **Consequence:** "one cable per input" can be checked inside the connect mutation by reading the
  input's index range. A concurrent writer to the same input forces a retry, which then sees the
  conflict. No locks needed.

**Limits** ([limits](https://docs.convex.dev/production/state/limits)):

| Limit | Value |
|---|---|
| Document size | 1 MiB |
| Array elements | 8,192 |
| Per transaction | 16 MiB read, 16 MiB written, 32,000 docs scanned, 16,000 docs written, 4,096 index ranges |
| Query/mutation user-code time | 1 s |
| Action time | 30 min (Convex runtime) / 10 min (Node) |
| Concurrent mutations | 16 (S16, Free/Starter) or 256 (S256, Professional) |
| Concurrent sessions | 1,000 (S16) or 10,000 (S256) |

- **Implication:** model **one document per device, port group and connection**, not one big
  project document. A 1 MiB project blob would also turn every edit into a write conflict.

**Presence:** [`@convex-dev/presence`](https://github.com/convex/presence) (Apache-2.0) keeps
rooms of users with heartbeats. A batch-worker loop means "heartbeats don't schedule any work".
Cursor positions would need a separate, cheaper channel (inference).

**HTTP actions** ([doc](https://docs.convex.dev/functions/http-actions)):
- Served at `https://<deployment>.convex.site`.
- Limits: 100 MiB response, 20 MiB multipart, 64 MiB memory.
- They reach data only through `ctx.runQuery`/`runMutation`.

**Remote MCP on Convex:** the official [`convex/mcp`](https://github.com/convex/mcp) component
(Apache-2.0) does this.
- It mounts `/mcp` on HTTP actions and includes "a full OAuth 2.1 authorization server", a
  device flow and a connections UI.
- It speaks **MCP 2026-07-28** (stateless) plus 2025-11-25, 2025-06-18 and 2025-03-26.
- **README limits:** sampling, elicitation, resources and prompts are listed as limits/roadmap;
  the MCP endpoint itself isn't rate-limited yet.
- **Implication:** MCP writes become ordinary Convex mutations, so they get the same validation
  and reactivity as UI writes.

**Self-hosting** ([docs](https://docs.convex.dev/self-hosting),
[README](https://github.com/convex/convex-backend/blob/main/self-hosted/README.md)):
- The backend is FSL Apache 2.0: no competing hosted Convex, and each release converts to Apache-2.0
  after two years.
- Storage is SQLite by default; Postgres or MySQL are options.
- "Self hosting is not for everyone."

**History and undo:** no built-in document history. You'd keep your own op-log or event table
(inference).

### 4.2 Cloudflare Durable Objects (+ Agents SDK)

**Model:** one single-threaded object per ID with private SQLite storage. That fits "one DO per
project".

**Limits** ([limits](https://developers.cloudflare.com/durable-objects/platform/limits/)):
- SQLite storage up to 10 GB per object. The FAQ says 1 GB on Free; the table and FAQ disagree.
- 2 MB maximum row or value, 100 KB SQL statement, 100 columns.
- CPU: 30 s per request by default, configurable to 5 min.
- 32 MiB WebSocket message received.
- **Soft limit of 1,000 requests/s per object.**
- No stated limit on WebSocket connections per object.

**Storage** ([SQLite API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)):
- `ctx.storage.sql.exec`, `transactionSync`, "transactional and strongly consistent".
- Output gates hold outgoing messages until writes are durable.
- **Point-in-time recovery for the last 30 days** through bookmarks: project-level "restore to
  before the agent did that".

**WebSocket Hibernation** ([guide](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)):
- `ctx.acceptWebSocket`, `webSocketMessage`/`webSocketClose`.
- "Billable Duration (GB-s) charges do not accrue during hibernation"; clients stay connected.
- Per-connection `serializeAttachment` is limited to 16,384 bytes.
- "Deploying new code restarts every Durable Object, which drops all WebSocket connections."

**Pricing** ([pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), updated
2026-10-18):

| Item | Free | Paid |
|---|---|---|
| Requests | 100k/day | 1M/mo included, then $0.15/M |
| Duration | 13,000 GB-s/day | 400k GB-s/mo included, then $12.50/M GB-s |
| SQLite rows read | 5M/day | 25B/mo included, then $0.001/M |
| SQLite rows written | 100k/day | 50M/mo included, then $1.00/M |
| SQLite stored | 5 GB total | 5 GB-mo included, then $0.20/GB-mo |

- Incoming WebSocket messages are billed at **20:1**. Outgoing messages are free.

**Agents SDK** ([Agent class](https://developers.cloudflare.com/agents/api-reference/agents-api/),
[repo](https://github.com/cloudflare/agents), MIT):
- An `Agent` is a DO instance addressed by name; "the same name … you will always get the same
  instance". So `project:<id>` works.
- It has `onConnect`/`onMessage`, `broadcast()`, `setState()` synced to clients through the
  `useAgent()` React hook, `@callable()` RPC, `this.sql`, and scheduling.

**MCP on Cloudflare:**
- **`McpAgent` is "deprecated and feature-frozen"**: one DO per *MCP session*, with state reset on
  reconnect ([doc](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/)).
- The new path is **`createMcpHandler`**, which is stateless: "each request gets a fresh
  `McpServer`", and state lives in "KV, D1, or a Durable Object"
  ([guide](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/)).
- Stateless elicitation uses MRTR ([design doc](https://github.com/cloudflare/agents/blob/main/design/mcp.md)).
- Auth: `OAuthAuthorizationServer` + `OAuthResourceServer` (Workers OAuth Provider).
- **The design this implies:** a stateless MCP Worker authenticates, then calls the project's
  Agent/DO over RPC. **That RPC step is not documented as an example; it's an inference from the
  docs.**

### 4.3 CRDT and sync layers

| Option | License | Model | Notes |
|---|---|---|---|
| Yjs | MIT ([LICENSE](https://github.com/yjs/yjs/blob/main/LICENSE)) | CRDT (maps, arrays, text) | `Y.UndoManager` with **`trackedOrigins`** lets each agent or user undo only its own transactions ([docs](https://docs.yjs.dev/api/undo-manager)). |
| y-durableobjects | MIT | Yjs on DOs | [repo](https://github.com/napolab/y-durableobjects) |
| PartyServer / y-partyserver | ISC | DO-backed rooms; `y-partyserver` is a Yjs provider | [cloudflare/partykit `packages/`](https://github.com/cloudflare/partykit/tree/main/packages) (PartyKit now lives under Cloudflare) |
| Automerge | MIT | JSON CRDT with full history | [repo](https://github.com/automerge/automerge) |
| Loro | MIT | CRDT with time travel, version control, movable tree, shallow snapshots | [README](https://github.com/loro-dev/loro) |
| Liveblocks | Apache-2.0, except `@liveblocks/server` and the CLI, which are AGPL-3.0 | Hosted (or self-hosted server) storage, presence and comments | [LICENSE](https://github.com/liveblocks/liveblocks/blob/main/LICENSE) |
| tldraw sync | tldraw license (paid in production) | **Server-authoritative** `TLSocketRoom`, "exactly one instance per room", template on DOs, `SQLiteSyncStorage` recommended, survives hibernation | [docs](https://tldraw.dev/docs/sync) |

### 4.4 Decision factors (tradeoffs, not a decision)

| Factor | Server-authoritative (Convex mutations, or a DO that validates each op) | CRDT (Yjs / Automerge / Loro) |
|---|---|---|
| Integrity rules: one cable per input, signal/connector compatibility, PoE budget | Checked atomically before commit. Convex retries on conflict; a DO is single-threaded. | Merges always succeed, so two users can each patch into input 5. You need post-merge lint, or a server that rejects ops (which is then server-authoritative anyway). |
| Agent writes | Batch = one transaction = one atomic unit. Easy "dry-run then apply". | Batch = one local transaction, but other peers may merge conflicting edits. |
| Undo per agent action | Your own op-log table (Convex), or a row per batch plus 30-day PITR (DO). | `UndoManager(trackedOrigins)` (Yjs), or history and checkout (Automerge/Loro). |
| Offline | Weak. Convex has no offline writes out of the box (inference); a DO needs a connection. | Strong: edit offline and merge later. Field crews matter here. |
| MCP endpoint | Convex: official component, writes are mutations. DO: stateless `createMcpHandler` → project DO. | MCP writes have to become CRDT ops on the server. Doable with a server-side Y.Doc in the DO. |
| Ops burden | Convex: managed and reactive, but vendor-coupled (self-host possible). DO: you build the sync protocol and schema migrations. | You build validation and the server anyway. Libraries are mature. |
| Data shape | Relational and graph-friendly (devices, ports, connections as rows). | Maps and arrays; references between nodes are by id with no referential integrity. |

**A middle path seen in practice** (tldraw sync): a central authoritative room on a DO that
relays changes. That is server-authoritative, without a CRDT, and keeps optimistic client updates.

---

## 5. Canvas, diagram, auto-layout and routing

| Library | License | Notes |
|---|---|---|
| React Flow / xyflow | MIT ([npm](https://www.npmjs.com/package/@xyflow/react) 12.12.0) | Used by both EasySchematic and LZ. Pro is a paid subscription for pro examples and support ($169/mo Starter, $289/mo Professional), not a license gate: "open-source MIT-licensed … forever" ([pro](https://reactflow.dev/pro)). Handles (ports) are first-class. |
| tldraw SDK | **tldraw license**: free in development; production needs a trial (100 days), hobby, or commercial key; technical enforcement and a watermark ([LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md), [pricing](https://tldraw.dev/pricing): "Value-based pricing", "Talk to sales") | **Agent starter kit:** `npm create tldraw@latest -- --template agent`; Anthropic, OpenAI and Google providers ("We recommend Anthropic"). The agent sees "both visual screenshots and structured shape data". Actions are Zod schemas with `applyAction`/`sanitizeAction` ([kit](https://tldraw.dev/starter-kits/agent)). **The kit's license isn't stated (unverified).** Sync is included with the SDK license. |
| Konva | MIT ([LICENSE](https://github.com/konvajs/konva/blob/master/LICENSE)) | Canvas 2D scene graph. Good for floor-plan overlays. |
| PixiJS | MIT | WebGL/WebGPU. Overkill unless plans get huge. |
| ELK.js | EPL-2.0 ([LICENSE.md](https://github.com/kieler/elkjs/blob/master/LICENSE.md); npm says `EPL-2.0 OR GPL-3.0-or-later`) | Layered layout with **port constraints** (`FIXED_SIDE`, `FIXED_ORDER`, `FIXED_POS` …) ([option ref](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html)) and orthogonal edges. The best fit for port-accurate signal flow. EPL-2.0 is weak copyleft at file level, so check it against your distribution model. |
| dagre | MIT | Simple layered DAG layout. No port awareness. |
| libavoid (adaptagrams) | LGPL-2.1+, with a commercial license available "for a fee" ([README](https://github.com/mjwybrow/adaptagrams)) | Orthogonal connector routing around obstacles, with nudging of parallel segments. |
| libavoid-js | LGPL-2.1 ([repo](https://github.com/Aksem/libavoid-js), npm 0.5.0-beta.5) | Emscripten/WASM port; runs in the browser and Node. Beta, with a small user base (46★). |

**What the competitors do:**
- EasySchematic wrote its own A\* router with a worker, trunk/Steiner bundling and scoring
  ([`src/routing/`](https://github.com/duremovich/EasySchematic/tree/master/src/routing)).
- **Implication:** routing for many agent-added edges is a real engineering cost. Options are ELK
  for layout plus routing, or a simple layout plus libavoid routing.

---

## 6. PDF floor plans and spatial estimation

### 6.1 Rendering and extraction

**pdf.js** (Apache-2.0, [repo](https://github.com/mozilla/pdf.js)):
- `page.render()` rasterizes a page.
- `page.getTextContent()` returns text items with transforms. Use it to find a scale note
  ("1:100", "SCALE 1/8" = 1'-0"") and dimension strings.
- `page.getOperatorList()` returns drawing ops (`constructPath`, `moveTo`, `lineTo`,
  `rectangle`) for walls and dimension lines
  ([`src/display/api.js`](https://github.com/mozilla/pdf.js/blob/master/src/display/api.js),
  [`src/shared/util.js`](https://github.com/mozilla/pdf.js/blob/master/src/shared/util.js)).

**Embedded scale in the PDF:**
- ISO 32000 defines page viewports (`/VP`) with a rectilinear `/Measure` dictionary. `/R` is
  just a label string ("1:100"); the conversion factor is in `/X` → `/C`.
- Acrobat and Bluebeam write these. Source: secondary
  ([PDFBox javadoc](https://pdfbox.apache.org/docs/2.0.13/javadocs/org/apache/pdfbox/pdmodel/interactive/measurement/PDRectlinearMeasureDictionary.html),
  [iText](https://api.itextpdf.com/iText5/java/5.5.13/com/itextpdf/text/pdf/spatial/MeasureRectilinear.html)).
  **The ISO text itself is paywalled.**
- I found no reference to `/VP` in pdf.js `src/core/document.js`. You'd parse the page dictionary
  yourself, e.g. with pdf-lib (**unverified which libraries expose it**).
- **Whether AutoCAD or Revit PDF exports include `/VP`: unverified.**

### 6.2 Scale calibration approaches, in order of reliability

1. **The PDF's own `/VP` `/Measure`**, when present: exact.
2. **Two-point known distance**, entered by the user. This is LZ's default
   ([manual](https://github.com/larszu/cable-planner/blob/main/docs/manual/manual.en.md)).
3. **Four corners of a known rectangle**, for photos and perspective (LZ).
4. **Dimension text plus the line it labels:** pdf.js text and operator list, or Claude.
5. **Scale bar or scale note read by Claude:** cheapest for the user, least accurate.
   Always confirm it with a user-visible check, e.g. "this door is 0.9 m".

### 6.3 Using Claude on floor plans

**PDF input** ([PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support)):
- Up to 600 pages (100 when the context window is under 1M) and 128 MB per request.
- Each page is sent as an image plus extracted text, at 1,500–3,000 text tokens per page plus
  image tokens.

**Coordinates** ([vision-coordinates](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates)):
- **Key constraint:** "For PDF support, pages are rasterized to images server-side at dimensions
  you don't control, so the returned coordinates can't be reliably mapped back onto the page. …
  rasterize the pages to images yourself and use the pre-resize approach."
- Ask for **absolute pixel** `[x1,y1,x2,y2]`; "Claude does not work well when you ask for
  normalized coordinates". Use structured outputs for JSON.
- **Resolution tiers** ([vision](https://platform.claude.com/docs/en/build-with-claude/vision)):
  - Standard: 1,568 px long edge / 1,568 visual tokens.
  - High-resolution (Claude 4.7 and later): 2,576 px / 4,784 tokens.
  - Cost is `⌈w/28⌉ × ⌈h/28⌉` tokens.
  - A reference `resizedSize()` function is provided. `transformations.oversized_image: "error"`
    turns silent resizing into a 400.
- **For fine targets**, "crop the region of interest and send the crop (offset returned
  coordinates by the crop origin)". That means tiling large-format plans.
- **Stated limitation:** "Claude's coordinate and localization outputs are approximate … verify
  outputs before relying on them."

**Implied pipeline** (inference):
1. Rasterize with pdf.js at a known DPI.
2. Run a Claude pass that labels the stage, FOH, rooms and doors as polygons in pixel coordinates.
3. Map those to plan coordinates through the calibration.
4. Show the result for the user to correct.
5. Store zones as polygons in metres.

### 6.4 Cable run estimation

| Technique | Prior art |
|---|---|
| Straight line × slack % (+ fixed) | EasySchematic: room distance × (1 + slack%) + fixed, default 15 % ([types.ts](https://github.com/duremovich/EasySchematic/blob/master/src/types.ts)). LZ: device distance × scale + slack 0–200 %, optional round-up. |
| Length along a drawn route | LZ, on a calibrated plan |
| Vertical drops and risers | LZ riser frames. Elevation per floor in metres (`create_floor` `elevationM`). |
| Stock-length splitting and reserve | LZ: fewest couplers, then least excess; 10 % BOM reserve |
| Pathfinding along trays/corridors | Not found in prior art. Approach: a graph of tray/corridor polylines on the plan, A\* between the two zone anchors, plus vertical drop, service loop at each end, slack %, then round up to stock lengths (inference). |
| Per-signal max-length warning | Not found in prior art as a feature. Use the §3.2 table. |

---

## 7. MCP and the agent-first UI

### 7.1 MCP spec status

The current version is **2026-07-28**
([spec](https://modelcontextprotocol.io/specification/latest),
[changelog](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx)).

**Major changes:**
- No protocol sessions and no `Mcp-Session-Id`.
- No `initialize` handshake; version and capabilities go in each request's `_meta`.
- New required `server/discover`.
- `subscriptions/listen` replaces GET and resource subscriptions.
- **Multi Round-Trip Requests** replace server-initiated elicitation and sampling. The server
  returns `resultType: "input_required"`.
- SSE resumability removed.
- Tasks moved to an extension.
- Roots, Sampling and Logging deprecated.
- `tools/list` results need `ttlMs` and `cacheScope`.
- "Servers that need cross-call state use explicit, server-minted handles passed as ordinary tool
  arguments." **This fits a `projectId` argument, or a `preview_id` handle for dry-run → apply.**

**Other parts of the spec:**
- **Transport:** Streamable HTTP for remote servers.
- **Auth:** OAuth. Clients must validate `iss` (RFC 9207), use DCR `application_type`, and key
  credentials by issuer.
- **Features:** resources (data for the user or model), tools (model-invoked) and prompts
  (user-invoked playbooks).

**MCP Apps** ([overview](https://modelcontextprotocol.io/extensions/apps/overview),
[ext-apps repo](https://github.com/modelcontextprotocol/ext-apps)):
- A tool declares `_meta.ui.resourceUri` → a `ui://` HTML resource, rendered in a sandboxed iframe.
- The app talks over postMessage JSON-RPC and **can call the server's tools**.
- Supported by "Claude, Claude Desktop, VS Code GitHub Copilot, Microsoft 365 Copilot, Goose,
  Postman, MCPJam, and Archestra.AI".
- **Fit:** a `preview_patch` tool could return a mini patch-diff UI with Apply/Reject inside
  Claude.

### 7.2 Anthropic guidance on tools

From [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
(2025-09-11):
- **Consolidate.** Don't wrap every endpoint: "tools that merely wrap existing software
  functionality" are a mistake. Prefer `schedule_event` over separate list and create tools. For
  us: `patch_range` over 16 `connect` calls.
- **Namespace** related tools.
- **Return high-signal fields and readable names**, not UUIDs. Converting opaque IDs to names
  "significantly improves Claude's precision". Add a `response_format` concise/detailed option.
- **Paginate and truncate** with guidance. Claude Code caps tool responses at 25,000 tokens by
  default.
- **Errors should be "specific and actionable"**, with examples of correct input.
- **Write descriptions** as for a new hire. Use unambiguous parameter names (`user_id`).
- **Iterate with evals** built from realistic tasks.

**Cloudflare's MCP best practices** ([overview](https://developers.cloudflare.com/agents/model-context-protocol/)):
- Declare `inputSchema`/`outputSchema` and return `structuredContent`.
- Use granular OAuth scopes with step-up (`insufficientScope()`).
- For large APIs, consider "Code Mode" (search plus execute).

### 7.3 Patterns for agent writes (seen in prior art)

| Pattern | Who does it | Source |
|---|---|---|
| Batch with per-item result, best-effort | EasySchematic (≤100), LZ (≤200) | [tools.ts](https://github.com/duremovich/EasySchematic/blob/master/mcp-server/src/tools.ts), [mcpServer.ts](https://github.com/larszu/cable-planner/blob/main/src/main/mcp/mcpServer.ts) |
| Batch = one undo step | LZ (`connect_many`, voice, AI import) | LZ README |
| Preview before apply, with disambiguation lists | LZ voice and AI plan generation | LZ README |
| Refuse occupied inputs unless `replace` is set | LZ | mcpServer.ts |
| Suggest a fix on mismatch ("says what would fit") | LZ; Kumihimo explains why | mcpServer.ts, [Kumihimo](https://github.com/Love-Rox/kumihimo) |
| Optimistic concurrency on full rewrites (`CONFLICT`); snapshot before each API save, keep 10 | WireFlow | [doc](https://wireflow.live/docs/connect-wireflow-to-claude) |
| Write tools hidden unless enabled, plus `readOnlyHint`/`destructiveHint` annotations | LZ | mcpServer.ts |
| Provenance on generated items | LZ AI import | LZ README |
| Verify against an expected list | LZ `verify_cabling` | mcpServer.ts |
| Per-origin undo | Yjs `trackedOrigins` | [Yjs docs](https://docs.yjs.dev/api/undo-manager) |
| Project-level restore | DO PITR, 30 days | [SQLite API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/) |

---

## 8. Voice input

The pipeline is: speech → transcript → Claude tool use (or a grammar parser) → **preview diff** →
apply.

| Option | Latency / transport | Vocabulary biasing | Notes |
|---|---|---|---|
| Web Speech API (`SpeechRecognition`) | In the browser. **In Chrome it's server-based** and "won't work offline". | `phrases` (`SpeechRecognitionPhrase`) for contextual biasing; `processLocally`, `available()`, `install()` for on-device | Not Baseline: "does not work in some of the most widely-used browsers". The `grammars` feature is deprecated ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)). |
| Deepgram Nova-3 / Flux | Streaming | **Keyterm prompting**: 500 tokens per request (~20–50 terms recommended); can be **replaced mid-stream** with a `Configure` message | Per-project device names could be pushed as keyterms when a project opens ([docs](https://developers.deepgram.com/docs/keyterm)). |
| OpenAI realtime transcription | WebSocket (`?intent=transcription`) or WebRTC; `gpt-live-transcribe` streams deltas; `delay` from `minimal` to `xhigh` | `prompt` and `keywords` (hints), updatable mid-session | No server VAD for `gpt-live-transcribe`; you commit turns yourself. No word timestamps ([guide](https://developers.openai.com/api/docs/guides/realtime-transcription)). |
| ElevenLabs Scribe v2 Realtime | WebSocket; "~150ms†" (the footnote is unexplained) | Realtime: 50 keyterms of up to 20 characters (batch: 1,000) | Keyterms cost extra ([docs](https://elevenlabs.io/docs/capabilities/speech-to-text)). |
| OS dictation | Free, offline on some OSes | None | What LZ uses on desktop. |

**The domain vocabulary problem:**
- Device names ("SB-A", "DiGiCo SD12"), ranges ("one through sixteen", "1 to 16", "odd
  channels"), port names ("aux 3 L") and homophones ("Foxer" vs "foyer" in LZ's example).

**Mitigations:**
1. Bias the STT with the current project's device and port names (Deepgram mid-stream keyterms,
   OpenAI `keywords`).
2. Parse with Claude tool use, giving it the project's device/port index as context. Have it emit
   a structured `patch_range`.
3. Add a deterministic range parser for the numerals, e.g. a Kumihimo-style `1..16` grammar
   ([Kumihimo](https://github.com/Love-Rox/kumihimo)).
4. **Always show a preview.** LZ's design (pick from a list on ambiguity, tick to replace) is the
   bar.

---

## 9. Exports

**PDF:**

| Option | License | Fit |
|---|---|---|
| react-pdf (`@react-pdf/renderer`) | MIT ([repo](https://github.com/diegomura/react-pdf)) | React components → PDF. Good for schedules and job sheets. Harder for large vector diagrams. |
| Typst | Apache-2.0 ([repo](https://github.com/typst/typst)); WASM via [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) (Apache-2.0) | Fast, high-quality tables and multi-page reports. Runs on the server or in WASM. |
| Headless Chromium | Puppeteer, Apache-2.0 | HTML/SVG → PDF at full fidelity. Heavy on Workers; Cloudflare Browser Rendering is an option (**not researched**). |

**Labels:**
- **Brother b-PAC:** in-browser printing needs the b-PAC SDK and an extension on a **Windows-only**
  client ([Brother web app guide](https://support.brother.com/g/s/es/htmldoc/dev/bpac_webapplication_eng.pdf)).
- **DYMO Connect Framework** (JS) needs DYMO Connect software installed
  ([repo](https://github.com/dymosoftware/dymo-connect-framework)).
- **Pragmatic path** (LZ's): export CSV for P-touch Editor or DYMO Connect, plus a PDF on standard
  label sheets with QR codes.
- Patchify's QR "door labels" link to the live drawing
  ([2.12](https://patchify.app/releases/2-12)). A QR deep link to the rack or cable page is cheap
  and high-value.

**DXF:**
- `@tarikjabiri/dxf` (dxfjs/writer, MIT, v2.9.0) and `dxf-writer` (MIT, v1.18.4), both per npm.
- EasySchematic has its own DXF writer with layers and a title block (AGPL, so don't copy it).
- Patchify exports rack DXF at 1:1 mm.
- Reading DWG would need LibreDWG (GPL-3.0). Avoid it.

---

## Open questions for the wayfinder session

1. **Convex vs a Durable Object per project.**
   - Convex: serializable mutations with automatic retry, built-in reactivity, and an official
     OAuth MCP component. You write tables, not a sync protocol. It's vendor-coupled and has no
     built-in history.
   - DO: one single-threaded object per project with SQLite, 30-day PITR, hibernating WebSockets
     and cheap idle cost. You build the sync, presence and migration layer, and every deploy drops
     sockets.
2. **Server-authoritative vs CRDT.**
   - Integrity rules (one cable per input, compatibility, PoE budget) favour server-authoritative.
   - Offline field edits favour a CRDT.
   - Hybrid: CRDT for notes and layout, server-validated ops for connections.
3. **Offline required for v1?** Load-in crews in basements may lack signal. If it's required, it
   pushes hard toward a CRDT or a local-first queue with server re-validation.
4. **Undo granularity for agents.** Options: a per-action op-log (every MCP call or voice command
   is one revertible unit), Yjs `trackedOrigins` per agent, or project-level snapshots/PITR.
   Probably both: per-action undo plus project restore.
5. **MCP write model.** Choose among:
   - Fine-grained ops with a `baseVersion` and `CONFLICT` (WireFlow).
   - Best-effort batches with per-item results (EasySchematic/LZ).
   - A two-step `preview_*` → `apply(preview_id)` flow using server-minted handles (fits MCP
     2026-07-28).
   - Ship MCP Apps UI for the preview in Claude?
6. **Build on EasySchematic (AGPL) vs from scratch.**
   - Forking gets the most features day one, but a hosted SaaS must publish its source under AGPL
     §13.
   - From scratch keeps licensing open. Its data model can still be learned from (facts and ideas,
     not code).
7. **Device library strategy.** Options: NetBox CC0 for IT gear plus your own AV schema; negotiate
   a data license with EasySchematic; or community/agent-built templates from manufacturer PDFs.
   The signal-type taxonomy is the core decision (EasySchematic's 73 types are a good checklist).
8. **Canvas library.**
   - React Flow: MIT, port handles built in, used by both competitors.
   - tldraw: freeform floor-plan feel, agent kit and DO sync, but a paid production license and
     weaker port semantics.
   - Konva for the floor-plan layer alongside React Flow for signal flow?
9. **Auto-layout and routing.** ELK (EPL-2.0, port constraints) vs dagre (MIT, no ports) vs
   libavoid (LGPL, or a commercial license) vs a custom A\* router like EasySchematic's. Decide how
   much layout agents control vs humans.
10. **Floor plan pipeline.** Who calibrates: the user (two points) or Claude (scale note), with
    the user confirming? How are zones stored (metre polygons)? Model trays and corridors for
    routing in v1, or use straight line × slack first?
11. **Connection layers.** Is a "layer" a filter over one graph (by signal type), or are layers
    separate graphs (video, network, audio, power) joined through shared devices? It affects
    schedules, numbering and MCP tool scoping.
12. **Voice stack.** Browser Web Speech (free, uneven support, server-based in Chrome) vs a paid
    streaming STT with per-project keyterms (Deepgram, OpenAI). Is a preview always required, or
    can confident commands auto-apply?
13. **Standards purchase.** Buy F501.01, D401.01 and TIA-606-D ($75 + $75 + $321) before designing
    cable ID and label schemes?
