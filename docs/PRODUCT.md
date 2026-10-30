# Flypack product brief

**Tagline:** Plan every cable, rack and route before the show.

Flypack is the planning kit a production crew carries from show to show: every patch, rack,
cable run and network plan for a show in one place, built as fast by talking to an agent as by
dragging boxes. A flypack is the road-cased rig you roll into a venue; this is the plan that
goes with it.

## Who it is for

Live event and AV crews who build and document shows: audio, video, lighting and network techs,
system engineers, and the person everyone asks "where does this go?" at load-in. Today they work
from Patchify or EasySchematic diagrams, spreadsheets, Visio, Vectorworks ConnectCAD, and patch
sheets taped to racks.

## What it must do

- **Connection layers.** Video, network, signal and audio flows, plus power, in one project, so
  one device can carry ports on several layers.
- **Patching with real devices.** Devices with their real ports, port-to-port connections,
  signal-type checks, cable IDs, cable schedules and labels. Most of what Patchify does is the
  baseline.
- **Stage maps.** Import a venue's PDF floor plan, calibrate its scale, mark zones, place racks
  and devices, and measure cable runs along real routes. An agent can take the map and project
  rough sizing onto it.
- **Notes per rack.**
- **Realtime multiplayer.** Several people, and agents, editing one show at once.
- **Agent-first.** An MCP server and a UI built around agents: say "patch stage box A 1 to 16 to
  console inputs 1 to 16" instead of dragging sixteen lines. Agent changes are previewed,
  applied as one undoable step, and never silently overwrite newer work.
- **Exports crews use.** Cable schedules, patch sheets, labels and PDFs.

## Why it can exist

From the [research](research/2026-10-29-agent-first-patching-tool.md):

- No existing tool connects the logical patch (port to port) with the physical route (measured
  on the venue's drawing) and network detail (IPs, VLANs, Dante).
- MCP support is thin. WireFlow has a remote MCP server, EasySchematic a local one in beta, and
  LZ Cable Planner a local one in a proprietary app. Patchify has no API.
- Flypack is open source under AGPL-3.0 and may later be offered as a hosted service
  ([ADR 0001](adr/0001-agpl-license.md)).

## Decided

| Decision | Where |
| --- | --- |
| AGPL-3.0, everything public | [ADR 0001](adr/0001-agpl-license.md) |
| shadcn/ui on Base UI, Tailwind v4, Flypack tokens | [ADR 0002](adr/0002-ui-stack.md) |
| Brand: route-F mark, Archivo, ink / gaff yellow / white, stage-black dark mode | [brand/README.md](../brand/README.md) |

## Open for the wayfinder session

The research lists these with their tradeoffs in
[Open questions](research/2026-10-29-agent-first-patching-tool.md#open-questions-for-the-wayfinder-session).
The ones that shape everything else:

1. **Sync:** Convex or one Cloudflare Durable Object per project. We already run Convex in
   production on another project, which counts for it.
2. **Where integrity rules live:** server-validated operations (one cable per input, signal
   compatibility, PoE budgets) or a CRDT, or both: CRDT for notes and layout, validated
   operations for connections.
3. **Offline at load-in:** required for the first version or not.
4. **What a layer is:** a filtered view of one graph, or separate graphs joined at shared
   devices. It decides cable numbering, schedules and how MCP tools are scoped.
5. **How agents write:** small operations that fail on stale data, batches with per-item
   results, or a preview-then-apply flow, which suits voice best.
6. **Device library:** NetBox's CC0 device types, a data license from EasySchematic, or
   community and agent-built devices.
7. **Canvas and routing:** React Flow (MIT) is the default; auto-layout with ELK, dagre or
   libavoid.
8. **Contributions:** a DCO sign-off (simple, everything stays AGPL) or a CLA (keeps the option
   to relicense). See ADR 0001.
