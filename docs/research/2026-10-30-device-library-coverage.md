# Device library coverage: NetBox devicetype-library vs EasySchematic

Researched 2026-10-30 for issue #8. Primary sources only, unless a line says otherwise.
**Unverified** marks a claim I couldn't trace to a primary source. This doc covers only the
public gear categories named in the issue, never the reference show.

**Snapshots used:**
- **EasySchematic:** `GET https://api.easyschematic.live/templates`, fetched 2026-10-30
  (ETag `"lib-671-full"`), and the repo at commit `e2f178c` (master, 2026-10-05).
- **NetBox:** `netbox-community/devicetype-library` at commit `16628f5` (master, pushed
  2026-10-30).

**Method:**
- **EasySchematic:** I counted entries by matching manufacturer, label, model number and search
  terms in the full JSON, then read the matches by hand. Those numbers are reproducible but
  approximate; borderline entries such as panels and accessories are noted.
- **NetBox:** I counted YAML files in the git tree and grepped a local copy for AV terms.

---

## TL;DR

| # | Finding | Source |
|---|---|---|
| 1 | EasySchematic covers every category in the issue, often in depth: 35 ATEM, 10 Videohub routers, ~44 Blackmagic converters, 11 Decimator, 34 AJA, 59 PTZ cameras, 16 PTZ controllers, 59 Ubiquiti, 108 monitors/displays/TVs, 114 mixers. | [API](https://api.easyschematic.live/templates) |
| 2 | NetBox covers almost none of the AV gear. It has 7 Blackmagic files (ATEM Constellation only), 0 Videohub, 0 converters, 0 PTZOptics/BirdDog/Panasonic/Sony, 0 PTZ controllers, 0 pro monitors and 0 mixers. Its strength is UniFi: 54 UniFi switch files with per-port PoE. | [repo tree](https://github.com/netbox-community/devicetype-library/tree/master/device-types) |
| 3 | **Correction to the 2026-10-29 doc:** NetBox's `YAMAHA` folder is 27 **SWX network switches**, not mixers. | [device-types/YAMAHA](https://github.com/netbox-community/devicetype-library/tree/master/device-types/YAMAHA) |
| 4 | **Correction to the 2026-10-29 doc:** EasySchematic's API page says more than "help yourself". It says "**This data is free to use.**" It still names no license and no attribution terms, and the submission flow shows contributors no terms at all. | [`Api.tsx`](https://github.com/duremovich/EasySchematic/blob/master/docs/src/pages/Api.tsx) |
| 5 | EasySchematic's CONTRIBUTING lists "Submit Device Templates" as a way to contribute, and says contributions are licensed AGPL-3.0. About 540 templates also live in the AGPL repo as source; the other ~4,000 exist only in the hosted database. | [CONTRIBUTING.md](https://github.com/duremovich/EasySchematic/blob/master/CONTRIBUTING.md), [`src/devices/`](https://github.com/duremovich/EasySchematic/tree/master/src/devices) |
| 6 | The live template count is **4,546** today (4,515 yesterday), with 50,904 ports and 487 manufacturer strings. | [API](https://api.easyschematic.live/templates) |
| 7 | Per port, EasySchematic models signal type (73 values), connector (84 values in use), direction and optional PoE. In practice PoE is mostly set per device, not per port. NetBox models connector, network speed and per-port PoE, but has **no signal type, no direction and no AV connectors** (HDMI, XLR, TRS, speakON). | [§3](#3-what-each-source-models-per-port) |
| 8 | The maintainer is reachable at `support@easyschematic.live` (published in the docs, app and devices site), through GitHub Discussions, and through a Discord linked from the README. | [§4.3](#43-how-to-ask-the-maintainer) |
| 9 | Audinate's Dante catalog is the largest manufacturer dataset found (pagination runs to page 129 at roughly 27 products a page). It has no ports or connectors, no export and no API, and its site terms forbid reproduction and commercial use. | [catalog](https://www.getdante.com/products/dante-enabled/), [terms](https://www.getdante.com/legal/terms-conditions/) |

---

## 1. Coverage by category

Counts are templates (EasySchematic) or YAML files (NetBox). "Borderline" means control panels,
accessories or adjacent products that match the search but aren't the category itself.

| Category | EasySchematic | NetBox devicetype-library |
|---|---|---|
| **Blackmagic ATEM switchers** | 35 ATEM-named: 24 switchers (Mini, Mini Pro/ISO, Mini Extreme/ISO/G2, SDI family, Television Studio HD/HD8/HD8 ISO/4K8/Pro 4K, Constellation HD 1/2/4 M/E, 2 M/E 4K, 4 M/E 4K Plus, 4 M/E IP/IP Plus, Production Studio 4K), 9 control panels, plus the Microphone Converter and Streaming Bridge. **Not found:** Constellation 8K and 1 M/E Constellation 4K. | 7 files, all Constellation: 1/2/4 M/E in HD and 4K, plus 8K. No Mini, SDI or Television Studio models. |
| **Blackmagic Videohub routers** | 10 routers (Mini 4x2/6x2/8x4 12G, Smart 10x10/20x20/40x40 12G, 80x80, 120x120, Universal 72, CleanSwitch 12x12) and 1 Smart Control Pro. | 0. |
| **Blackmagic Micro/Mini converters** | ~44 Blackmagic converter-type templates: 6 Micro Converters (SDI↔HDMI 3G/12G, BiDirectional 3G/12G), ~12 Mini Converters (HDMI↔SDI 6G, analog, audio, optical fiber, sync, UpDownCross, DA), 7 Teranex, 11 2110 IP converters, Studio/Camera Fiber converters. | 0. |
| **Decimator** | 11, of which 1 is a duplicate pair (12G-CROSS listed twice): 12G-CROSS, MD-CROSS, MD-DUCC, MD-HX, MD-LX, and 5 DMON multiviewers. | 0. |
| **AJA** | 34: Hi5/HA5 mini converters, FiDO fiber, FS-series frame syncs, KUMO routers and panels, Ki Pro recorders, DAs, Gen10. | 0. |
| **PTZ cameras** | 59 typed `ptz-camera`, plus some PTZ models typed `camera`. PTZOptics 9; BirdDog 5 cameras (P200 listed twice) plus 4 NDI converters; Panasonic 12 AW-HE/UE; Sony 8 (BRC, SRG, FR7); also Canon CR-N, AVer, Fomako, Zowietek and others. | 0 PTZOptics, BirdDog, Panasonic or Sony. 36 **Bolin** PTZ files (network and power only, see §3.2). The many other "PTZ" hits are surveillance cameras (Dahua 154, HiLook 27, …). |
| **PTZ joystick controllers** | 16: 15 typed `ptz-controller` (Panasonic AW-RP50/RP150, Sony RM-IP10/RM-IP500, Canon RC-IP100/300/1000, Skaarhoj RC-SK5, RGBlink, Zowietek, AIDA, Atomos) plus PTZOptics SuperJoy (typed `controller`). | 0. `grep -i joystick` over the whole library finds nothing. |
| **Ubiquiti UniFi** | 59 Ubiquiti templates: 16 switches (Lite 8 PoE, USW-16/24-PoE, Pro 24 PoE, Pro HD 24 PoE, Pro Max 16/24/48 PoE, Pro XG 48 PoE, Flex 2.5G PoE, Aggregation, Enterprise AV XG 24 PoE / AV Fiber, …), plus gateways, APs, cameras, access control and PoE adapters. **Not found:** USW-Flex-Mini, USW-Lite-16-PoE, USW-Enterprise-8-PoE, USW-Ultra. | 210 Ubiquiti files: 40 `USW-*`, 12 `US-*`, 2 `ECS-*` (UniFi switches), 12 EdgeSwitch, 32 APs, 15 gateways, 19 cameras/NVRs, plus PDUs and UPS. All four models missing from EasySchematic are present. |
| **Pro monitors / TVs** | 108 typed `monitor` (51), `display` (36) or `tv` (21). Broadcast monitors: Blackmagic SmartView/SmartScope 5, SmallHD 4, Canon DP-V 7, Marshall 3, Lilliput 3, Feelworld, Leader. Pro displays/TVs: Sony BRAVIA Professional, Samsung QM/QB, LG UH5, Sharp PN, … | 0 found. No folders for LG, Samsung, Sony, Sharp, SmallHD or Marshall. `NEC` holds routers. |
| **Audio mixers** | 114 typed `audio-mixer`: Yamaha (CL, QL, TF, DM3, DM7, MG), Allen & Heath (SQ, Qu, dLive, Avantis, CQ), Behringer (X32, WING, X Air), DiGiCo, Soundcraft Ui, PreSonus, Lawo, Zoom. | 0. `grep -i mixer` finds nothing. |

Sources: EasySchematic counts are from the [templates endpoint](https://api.easyschematic.live/templates).
NetBox counts are from the [repository tree](https://github.com/netbox-community/devicetype-library/tree/master/device-types).
Today the tree holds 12,752 device-type files across 388 manufacturer folders, and 2,053
module-type files.

---

## 2. Source facts

| | EasySchematic community database | NetBox devicetype-library |
|---|---|---|
| Size | 4,546 templates, 50,904 ports, 487 manufacturer strings, 145 device types | 12,752 device types, 388 manufacturers, 2,053 module types |
| Access | `GET https://api.easyschematic.live/templates` (one ~9 MB JSON). No auth; `Cache-Control: no-cache`; the docs say "cached for 5 minutes". `GET /templates/:id` adds `submittedBy` / `lastEditedBy` ([API docs](https://github.com/duremovich/EasySchematic/blob/master/docs/src/pages/Api.tsx)). | Git repo of YAML files, validated by JSON Schema ([schema/](https://github.com/netbox-community/devicetype-library/tree/master/schema)) |
| Where the data lives | Cloudflare D1. About 540 templates also live as TypeScript in the AGPL repo ([`src/devices/`](https://github.com/duremovich/EasySchematic/tree/master/src/devices)). [`generate-fallback.ts`](https://github.com/duremovich/EasySchematic/blob/master/api/seed/generate-fallback.ts) builds an offline fallback from those, and the generated file is gitignored. 488 live IDs share the seed-style `c0a80101-` prefix. | The repo itself |
| Who writes it | Mostly the community, through moderated submissions at devices.easyschematic.live. 35 of 48 sampled `/templates/:id` responses carried `submittedBy`. The top 50 contributors have 2,270 approved new templates ([`/contributors`](https://api.easyschematic.live/contributors)). | Pull requests |
| License | **None named for the data** (see §4) | **CC0-1.0** ([LICENSE.txt](https://github.com/netbox-community/devicetype-library/blob/master/LICENSE.txt)) |
| Fit | AV-native: signal types, AV connectors, direction | IT-native: interfaces, PoE, rack units, power plugs |

---

## 3. What each source models per port

### 3.1 EasySchematic

**Port fields actually present in the live data** (count of ports carrying each, of 50,904):

| Field | Ports | What it carries |
|---|---|---|
| `signalType` | 50,904 | 73 values in use. Top: `analog-audio` 13,412, `ethernet` 6,278, `hdmi` 4,236, `sdi` 4,000, `power` 3,921, `dante` 1,428. |
| `direction` | 50,904 | `input` 20,035, `output` 17,197, `bidirectional` 13,027, `passthrough` 645. |
| `connectorType` | 48,494 (2,410 missing, 384 explicit `none`) | 84 values in use: `phoenix`, `rj45`, `xlr-3`, `bnc`, `hdmi`, `iec`, `speakon`, `ethercon`, `sfp`, `lc`, `opticalcon`, `socapex`, … |
| `frontConnectorType` / `rearConnectorType` | 645 | Passthrough (patch panel) faces |
| `gender` (and front/rear gender) | 421 | Override, used only where gender varies |
| `poeDrawW` | 253 | Powered-device draw on that port |
| `poeBudgetW` | 39 | PSE budget on that port (e.g. Extron PI 115 "LAN OUT + PoE", 15.4 W) |
| `linkSpeed` | 152 | Network link speed |
| `section` | 22,677 | Port group label |
| `capabilities`, `networkConfig`, `isMulticable`/`channelCount`, `multiConnect` | 13 / 10 / 26 / 400 | Video caps, IP/VLAN, snakes, many-to-one ports |

**Device-level power:** `powerDrawW` on 2,791 templates, `voltage` on 2,289, `poeBudgetW` on
117, `poeDrawW` on 241, `thermalBtuh` on 211. 2,821 of 4,546 templates have a port whose signal
type starts with `power`.

The documented schema also lists `powerCapacityW`, `rackForm` and `unitCost`
([DeviceTemplateSchema.tsx](https://github.com/duremovich/EasySchematic/blob/master/docs/src/pages/DeviceTemplateSchema.tsx)).
The public API page's `signalType` list names only ~41 values and three directions, so it lags
the data, which uses 73 signal types and a fourth direction, `passthrough`
([Api.tsx](https://github.com/duremovich/EasySchematic/blob/master/docs/src/pages/Api.tsx)).

**Samples** (from the live API):

| Template | Ports as modelled | Observations |
|---|---|---|
| ATEM Mini Pro | 4× `hdmi` in on `hdmi`, 1× `hdmi` out, `usb` out on `usb-c`, 2× `analog-audio` in on `trs-eighth`, `ethernet` bidirectional on `rj45` | No power port; `powerDrawW: 30` at device level. |
| Micro Converter BiDirectional SDI/HDMI 3G | `sdi` in/out on `bnc`, `hdmi` in/out on `hdmi` | No power port; `powerDrawW: 3`. |
| Decimator MD-HX | `sdi` in, 2× `sdi` out on `bnc`, `hdmi` in/out | Clean. |
| Videohub Mini 8x4 12G | 8 `sdi` in, 4 out, 8 loop out on `bnc`; `genlock` ref in/out; DC `barrel` + AC `iec`; `usb-c`; `rj45` | Two power inputs modelled. |
| PTZOptics Move SE | `sdi` out on `bnc`, `hdmi` out, `usb` on `usb-c`, `serial` on `db9` and `phoenix`, `analog-audio` in/out, `ethernet` on `rj45`, `power` on `iec` | No PoE field anywhere on the template. |
| Panasonic AW-RP150 (controller) | `sdi` in/thru on `bnc`, 5× `rs422` out on `rj45`, `tally`/`gpio` on `db25`, `ethernet`, 12 V `power` on `xlr-4` | Template-level `poeDrawW: 35`. |
| UniFi G6 PTZ | One port: `signalType: power` on `rj45`, labelled "PoE" | The camera's network link is typed as power, so it can't be patched as Ethernet. |
| UniFi Lite 8 PoE | 8× `ethernet` on `rj45`, DC `barrel` | PoE appears only in labels ("Port 1 - PoE+"); `poeBudgetW: 52` at device level. |
| UniFi Pro Max 16 PoE | 16× `ethernet` on `rj45`, 2× `fiber` on `sfp`, `barrel` power | No per-port PoE or speed; `poeBudgetW: 180` at device level. |
| SmartView 4K G3 | 2× `sdi` in + loop on `bnc`, `tally` on `db9`, DC + AC power, `ethernet` on `rj45` **and** `sfp` | Two ports share the label "LAN". |
| Sony FW-55BZ35L (pro TV) | 4× `hdmi` in, `composite` and `serial` on `trs-eighth`, `spdif` on `toslink`, `usb-a`, `rj45`, power on `iec-c7` | Clean. |
| Yamaha QL1 | 16 `analog-audio` in / 8 out on `xlr-3`, `aes` in/out, 2× `dante` on `rj45`, word clock in/out on `bnc`, `iec`, plus 2 `yamaha-my` slots | Word clock typed `genlock`, although `wordclock` exists. |

**PoE across the target categories** (templates with a field set, from the live data):

| deviceType | Templates | Device `poeBudgetW` | Device `poeDrawW` | Any port with PoE field |
|---|---|---|---|---|
| `network-switch` | 116 | 61 | 2 | 5 |
| `ptz-camera` | 59 | 2 | 21 | 1 |
| `ptz-controller` | 15 | 1 | 5 | 0 |
| Ubiquiti `network-switch` only | 16 | 11 (non-zero 10) | 0 | **0** |

**Data quality signals:**
- 20 manufacturer + model pairs appear more than once (40 templates). Examples: Decimator
  12G-CROSS, BirdDog P200, Yamaha QL5, Behringer X32 Compact, A&H dLive S7000.
- 23 manufacturers are spelled more than one way, e.g. `Blackmagic Design` / `BlackMagic Design`,
  `NETGEAR` / `Netgear`, `Q-SYS` / `Q-Sys` / `Qsys`.
- Some labels and model numbers disagree. "BMD SmartView Duo" has the model number "SmartView
  HD", and "BMD SmartScope Duo 4K" has "SmartView 4K".
- 4,179 of 4,546 templates are still at `version: 1`.
- 4,323 have a `referenceUrl` to a manufacturer page.

### 3.2 NetBox devicetype-library

**Schema** ([generated_schema.json](https://github.com/netbox-community/devicetype-library/blob/master/schema/generated_schema.json),
[components.json](https://github.com/netbox-community/devicetype-library/blob/master/schema/components.json)):

| Component | Fields | AV relevance |
|---|---|---|
| `interfaces` | `type` (231 values that encode speed and medium, e.g. `1000base-t`, `10gbase-x-sfpp`), `mgmt_only`, `poe_mode` (`pd` / `pse`), `poe_type` (802.3af/at/bt types 1–4, passive 24/48 V) | Per-port PoE is first-class. No signal type beyond Ethernet. |
| `front-ports` / `rear-ports` | `type` (63 values), `positions`, `color`, plus `port-mappings` | Connector only. The 63 values include `bnc`, `f`, `n`, `lc`/`sc`/`st`/`mpo`, `usb-*`, `8p8c` and `other`, but **no HDMI, XLR, TRS, speakON, DIN or D-sub**. No signal type, no direction. |
| `power-ports` | `type` (106 plug/inlet values), `maximum_draw`, `allocated_draw` | Good, in watts. |
| `console-ports`, `module-bays`, `device-bays` | — | Module bays could model SFP cages or cards. |

**Samples:**

| File | What's modelled |
|---|---|
| [ATEM Constellation 1 M/E HD](https://github.com/netbox-community/devicetype-library/blob/master/device-types/Blackmagicdesign/atem-constellation-1-m-e-hd.yaml) | 12 `SDI-INPUT-n` and 6 `SDI-OUTPUT-n` as `rear-ports` of type `bnc`. Direction appears only in the name. Analog audio is type `other`. Power: `iec-60320-c14`, `allocated_draw: 36`. Ethernet: 2× `1000base-t`. |
| ATEM Constellation 8K | 88 `bnc` rear ports, 4 `other`, 2 IEC C14, 1 `rj-12`, 1 `usb-b`, 1 `1000base-t`. |
| [Bolin R9-418N](https://github.com/netbox-community/devicetype-library/blob/master/device-types/Bolin%20Technology/r9-418n.yaml) (PTZ) | Only `eth0` (`100base-tx`, `poe_mode: pd`, `poe_type: type3-ieee802.3bt`, "max 46 W") and a DC power port. **No video outputs.** That holds for all 36 Bolin files; the 6 that mention SDI do so only in comments or URLs. |
| [USW-Lite-8-PoE](https://github.com/netbox-community/devicetype-library/blob/master/device-types/Ubiquiti/USW-Lite-8-PoE.yaml) | Ports 1–4: `1000base-t`, `poe_mode: pse`, `poe_type: type2-ieee802.3at`; ports 5–8: plain. Power: `dc-terminal`, `maximum_draw: 52`. |
| [USW-Pro-Max-16-PoE](https://github.com/netbox-community/devicetype-library/blob/master/device-types/Ubiquiti/USW-Pro-Max-16-PoE.yaml) | Per-port `poe_type`; `10gbase-x-sfpp` uplinks; the 180 W budget appears only in `comments` (the schema has no device PoE budget field). |

Gaps: 31 of the 54 UniFi switch files declare `poe_mode: pse` somewhere. `USW-16-PoE.yaml`
declares no PoE on any port, despite its name.

---

## 4. EasySchematic data terms

### 4.1 What is published

| Where | Text | Link |
|---|---|---|
| API docs page | "The device database at `api.easyschematic.live` exposes public read-only endpoints. No authentication required." / "**This data is free to use.** If you're building AV tooling and need a structured database of professional audiovisual equipment with port definitions, signal types, and connector types, help yourself." | [docs/src/pages/Api.tsx](https://github.com/duremovich/EasySchematic/blob/master/docs/src/pages/Api.tsx), rendered at [docs.easyschematic.live/api](https://docs.easyschematic.live/api) |
| README, "Public API" | "…help yourself" (without the "free to use" sentence). "Approved submissions credit the contributor." | [README.md](https://github.com/duremovich/EasySchematic/blob/master/README.md) |
| CONTRIBUTING | Lists "Submit Device Templates" (through devices.easyschematic.live) as a way to contribute. Its License section says: "By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license." | [CONTRIBUTING.md](https://github.com/duremovich/EasySchematic/blob/master/CONTRIBUTING.md) |
| Repo license | AGPL-3.0 (GitHub license API) | [LICENSE](https://github.com/duremovich/EasySchematic/blob/master/LICENSE) |
| Rate limits | "Read endpoints are not rate-limited beyond standard Cloudflare protections… please respect [Cache-Control]." | Api.tsx |

### 4.2 What is not published

- **No named data license.** A search of the whole repo for "terms of service/use", "privacy
  policy", "creative commons", CC-BY, ODbL and CC0 matched nothing outside the AGPL text.
- **No terms are shown to contributors at submission.** The devices-site source
  ([`devices/src/`](https://github.com/duremovich/EasySchematic/tree/master/devices/src)) has no
  "agree", "license" or "terms" text on the submit or login pages.
- **No attribution requirement** is stated for API consumers, although `/templates/:id` exposes
  contributor names.
- **Whether CONTRIBUTING's AGPL clause covers templates submitted through the website**
  (rather than through pull requests) is **Unverified**. The file lists website submission under
  "Ways to Contribute", but a website submitter is never shown it.
- A ToS or privacy page on the live sites that isn't in the repo: **Unverified**. None exists in
  the source of the docs, app or devices site.

Judgement, not legal advice: "free to use… help yourself" from the operator is a clear signal
of intent. But it names no license, says nothing about attribution or redistribution, and comes
from the operator rather than the ~50+ contributors who wrote most of the rows. Whether bare
facts (port counts, connector types) are protectable at all depends on jurisdiction; the EU has
a sui generis database right that the US does not. An explicit grant from the maintainer
removes the ambiguity either way.

### 4.3 How to ask the maintainer

| Channel | Where it's published |
|---|---|
| Email `support@easyschematic.live` | Docs-site footer ([Layout.tsx](https://github.com/duremovich/EasySchematic/blob/master/docs/src/components/Layout.tsx)), app About dialog, devices-site footer. Inbound mail feeds a moderated support inbox in the API (`support_emails` table, [migration 0008](https://github.com/duremovich/EasySchematic/blob/master/api/migrations/0008_add_support_emails.sql)). |
| GitHub Discussions | Enabled, with categories Announcements, General, Ideas, Polls, Q&A and Show and tell; 3 discussions so far ([discussions](https://github.com/duremovich/EasySchematic/discussions)). A public ask also leaves a public record of the answer. |
| GitHub issues | [issues](https://github.com/duremovich/EasySchematic/issues). The only "license" hit is #212, which is about procurement and unrelated. |
| Discord | Invite linked in the README header. |

The maintainer's GitHub profile (`duremovich`) lists no name, email or website.

**What a request could ask for** (options, not a decision):
1. A named license for the API data, e.g. CC0, CC-BY-4.0 or ODbL, stated on the API page.
2. Confirmation that website submissions are covered by that license (or by AGPL), and a
   submission-time notice so future rows are covered.
3. The attribution format they want: per template (`submittedBy`) or one project-level credit.
4. Whether bulk mirroring (one `/templates` pull plus `version` diffs) is welcome, and at what
   frequency.

---

## 5. Manufacturer and other datasets

| Dataset | What it has | Terms | Fit |
|---|---|---|---|
| **Audinate Dante-enabled product catalog** ([getdante.com/products/dante-enabled](https://www.getdante.com/products/dante-enabled/)) | Per product: manufacturer, name, category, Dante channel count (e.g. "8x8"), bit depth, sample rate, AES67 and Dante AV flags. Pagination runs to page 129 at ~27 a page, so a few thousand products (my estimate). Category counts include I/O Interfaces 841, Amplifiers 611 and Speakers 527. **No ports or connectors** except in prose. **No export or API.** | Site [Terms & Conditions](https://www.getdante.com/legal/terms-conditions/) (Audinate Pty Ltd): "You should assume that all content on this site is subject to copyright". Use "Except as expressly authorised… is strictly prohibited", including "reproduction… republication"; "you will not use the information on this site for any purposes that are commercial". For use of content, "contact the Marketing team". | Useful as a lookup for Dante channel counts, but not reusable as-is. Needs permission. |
| **Ubiquiti tech specs** ([techspecs.ui.com](https://techspecs.ui.com/unifi/switching/usw-lite-8-poe)) | Per model: port counts and speeds, PoE class, per-port max W, total PoE budget, power draw and input. **No per-port table** (it doesn't say *which* ports are PoE), no JSON or CSV export. | Footer: "© 2026 Ubiquiti, Inc. All rights reserved." and a link to [Terms of Service](https://www.ui.com/legal/termsofservice/). The ToS text wasn't read: **Unverified**. | Source of truth for checking NetBox and EasySchematic UniFi rows, not for bulk import. |
| **Blackmagic, AJA, Decimator, PTZOptics, Panasonic, Sony** | Tech-spec web pages only. EasySchematic's `referenceUrl` points at them. | No open dataset found; site terms not checked: **Unverified**. | Verification only. |
| **GDTF / GDTF Share** (lighting) | DIN SPEC 15800 device descriptions, mostly from manufacturers. | The spec repo has no license file ([mvrdevelopment/spec](https://github.com/mvrdevelopment/spec)). GDTF Share's terms weren't found: **Unverified**. | Outside the issue's categories; relevant only if lighting fixtures come into scope. |
| **Open Fixture Library** (lighting) | Community fixture definitions. | MIT ([repo](https://github.com/OpenLightingProject/open-fixture-library)). | Same as GDTF. |
| AVIXA, other open AV device datasets | GitHub repo searches ("av device library ports sdi hdmi", "av equipment database json", …) returned nothing. | — | None found. |

---

## What this means for Flypack

Facts and options, not decisions.

**Facts**
- Only EasySchematic covers the issue's AV categories (switchers, routers, converters, PTZ,
  controllers, monitors, mixers) with signal types and directions. NetBox adds nothing there
  except 7 ATEM Constellations, as BNC lists without signal type or direction.
- NetBox is better than EasySchematic on UniFi: more models (54 vs 16 switches) and per-port
  `poe_mode`/`poe_type`, where EasySchematic sets PoE only per device or in labels. It is CC0,
  which leaves no licensing question.
- The two sources' port shapes differ. EasySchematic is close to what a patching planner needs
  (signal, connector, direction, gender, passthrough faces). NetBox would need a signal type and
  direction inferred from interface type or port names.
- EasySchematic's data has quality debt that a seeded library would inherit: duplicates,
  manufacturer spelling variants, no PoE on cameras, power-only network ports, and missing power
  ports.
- Flypack is AGPL-3.0 ([ADR 0001](../adr/0001-agpl-license.md)). If EasySchematic data were
  confirmed to be AGPL, as its CONTRIBUTING implies for contributions, Flypack's license could
  carry it. The ~540 templates in EasySchematic's `src/devices/*.ts` are already AGPL source.
  The other ~4,000 hosted-only rows have no license beyond "free to use".
- The Dante catalog and vendor spec pages are reference material only under their current terms.

**Options**
1. **NetBox only (CC0) for seeding.** No licensing risk. Covers UniFi and other network gear
   well, AV almost not at all; AV devices would be user-built or agent-built from spec pages.
2. **EasySchematic's AGPL repo subset (~540 templates).** Licensed today under the same license
   as Flypack, with attribution. Covers the common AV devices sampled here (ATEM Mini Pro, Micro
   Converters, Decimator MD-HX, PTZOptics Move SE, Yamaha QL1, AJA Hi5-12G), but not the hosted
   community additions (e.g. the UniFi switches, AW-RP150, SmartView 4K G3).
3. **Ask the maintainer for an explicit data license** (see §4.3) before seeding from the full
   API. This could run in parallel with options 1 and 2.
4. **Live lookup instead of a seeded copy:** query the EasySchematic API at run time, with
   attribution, and store only the devices a project uses. This keeps reliance on the "free to
   use" statement small, but adds a runtime dependency on a third-party service.
5. **Merge:** NetBox for network gear and EasySchematic for AV, reconciled into one Flypack
   port shape. Needs a mapping layer (NetBox interface type → signal type and direction) and
   de-duplication.
6. **Contribute upstream** (to either library) the fixes Flypack makes, such as per-port PoE on
   UniFi rows or missing models. This works only if the licenses line up in both directions.
