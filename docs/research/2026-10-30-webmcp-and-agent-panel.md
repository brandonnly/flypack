# WebMCP and an in-app agent panel: can they work for Flypack today?

Researched 2026-10-30 for [issue #5](https://github.com/brandonnly/flypack/issues/5). Primary
sources only, unless a line says otherwise. **Unverified** marks a claim I couldn't trace to a
primary source. "Search excerpt" means the page is first-party, but it blocks automated fetching,
so I read it only through a search engine's quote of it.

Background: sections 7 and 8 of
[the 2026-10-29 research](2026-10-29-agent-first-patching-tool.md) and
[PRODUCT.md](../PRODUCT.md).

---

## TL;DR

| # | Question | Answer today |
|---|---|---|
| 1 | What does WebMCP cover next to a remote MCP server? | **Tools only.** It has a name, title, description, a JSON Schema input and four boolean annotations. There are no resources, prompts, `outputSchema` or `structuredContent`, and no confirmation API (`ModelContextClient` was removed on 2026-06-11). Tools run in the page with the user's signed-in session, so WebMCP defines no auth. |
| 2 | How does a hosted origin join the trial? | Register the origin for the Chrome trial (Chrome 149–156; an extension to 162 was requested 2026-09-28) and, separately, the Edge trial (expires 2027-03-30). Then serve the token in a `<meta http-equiv="origin-trial">` tag or an `Origin-Trial` header. Both trials offer third-party matching. |
| 3 | Which agents call it today? | **The ChatGPT desktop app's built-in browser** (first-party docs). **Brave Leo** has experimental support behind a flag. Then come test and developer extensions: Chrome's Model Context Tool Inspector, Edge's WebMCP Explorer, Chrome DevTools MCP and Cloudflare Browser Run. **Not shipped:** Gemini in Chrome ("will soon support", May 2026), Copilot in Edge ("no public way to test", 2026-10-06), and Claude (open feature request). Meta Ray-Ban Display support is "coming soon". |
| 4 | Can one tool definition serve MCP and WebMCP? | **The descriptor can, the runtime can't.** Name rules, `title`, `description` and JSON Schema 2020-12 input line up. The annotations overlap only on `readOnlyHint`, and only MCP has output schemas. Execution differs: an MCP server uses OAuth, while WebMCP runs in the page's JS with the session. Cloudflare's bridge from a remote MCP server to WebMCP exists but is stale. |
| 5 | What does the Claude Agent SDK need at runtime? | Node 18.14+ (or Python 3.10+). The SDK **spawns a `claude` CLI subprocess** that needs a shell, a working directory and local disk. The suggested starting point is 1 GiB RAM, 5 GiB disk and 1 CPU per session. **Neither Workers nor Convex Node actions fit:** Workers allow 128 MB and stub out `child_process`, and Convex Node actions allow 512 MB for at most 10 minutes. It needs a container, or Anthropic's hosted Managed Agents. |
| 6 | What do the terms allow for subscriptions? | **Anthropic: no**, unless Anthropic approves. Third parties may not offer Claude.ai login or route requests through Free/Pro/Max credentials. **OpenAI: yes, in a program.** "Sign in with ChatGPT" plan usage is open to open-source and locally hosted apps. Paid or remotely hosted apps must apply. |
| 7 | What are the practical options? | Our API key (the Client SDK or Messages API runs on Workers), the user's API key, a sign-in flow (OpenAI only, gated), or "bring your own agent". In that last option the user's own Claude or ChatGPT calls Flypack's MCP server or WebMCP tools, and the user's subscription pays. |

**Five findings that change the framing**

- **The `navigator` to `document` move happened in the spec on 2026-05-27, not July.** In July
  Chromium removed the old `navigator.modelContextTesting` API, on 2026-07-08
  ([spec commit c7b5c70](https://github.com/webmachinelearning/webmcp/commit/c7b5c70),
  [Chromium/WPT commit](https://chromium.googlesource.com/external/github.com/web-platform-tests/wpt/+/ed76dd926b0ca18aafb188452f9ccf746be8bff4)).
- **WebMCP has no user-confirmation primitive.** It gives the agent a `consequentialHint`, and the
  agent decides what to do with it. Flypack's preview-then-apply flow would have to live in
  Flypack's own UI or in the agent's policy.
- **ChatGPT's WebMCP support ignores iframes and the declarative API**
  ([OpenAI: Site tools](https://developers.openai.com/codex/webmcp)). Tools must be registered
  with JS in the top-level page.
- **Hosting the Agent SDK in a product brings Claude Code's distribution conditions with it.**
  Anthropic's legal page says a product that runs Claude Code "may not pay for, resell, or
  intermediate Claude usage on their end users' behalf"
  ([Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)). The Agent SDK
  "runs the Claude Code binary". The SDK package is also proprietary ("All rights reserved"),
  which bears on [ADR 0001](../adr/0001-agpl-license.md).
- **The only sanctioned way for a person's subscription to pay for Flypack's agent work is for
  that person's own agent to call Flypack.** That means a custom connector in Claude, a custom
  MCP server or WebMCP site tools in ChatGPT, or OpenAI's gated Sign in with ChatGPT. Flypack
  never holds the subscription credential in any of them.

---

## 1. WebMCP: what the current draft covers

The source of truth is the W3C Web Machine Learning Community Group draft,
[`index.bs`](https://github.com/webmachinelearning/webmcp/blob/main/index.bs)
(`Status: CG-DRAFT`). The latest commit is 2026-10-27. The editors are from Microsoft and Google.

### 1.1 API surface

```webidl
partial interface Document { [SecureContext, SameObject] readonly attribute ModelContext modelContext; };
interface ModelContext : EventTarget {
  Promise<undefined> registerTool(ModelContextTool tool, optional ModelContextRegisterToolOptions options = {});
  Promise<sequence<RegisteredTool>> getTools(optional ModelContextGetToolOptions options = {});
  Promise<DOMString> executeTool(RegisteredTool tool, optional object inputObject, optional ModelContextExecuteToolOptions options = {});
  attribute EventHandler ontoolchange; attribute EventHandler ontoolactivated; attribute EventHandler ontoolcancel;
};
dictionary ModelContextTool { required DOMString name; USVString title; required DOMString description;
  object inputSchema; required ToolExecuteCallback execute; ToolAnnotations annotations; };
dictionary ToolAnnotations { boolean readOnlyHint = false; boolean untrustedContentHint = false;
  boolean consequentialHint = false; boolean debugging = false; };
```

Quoted from [`index.bs`](https://github.com/webmachinelearning/webmcp/blob/main/index.bs).

| Area | What the draft says |
|---|---|
| **Primitives** | **Tools only.** No resources and no prompts. Chrome's comparison says WebMCP "supports tools only (no resources)" ([Chrome blog: WebMCP and MCP](https://developer.chrome.com/blog/webmcp-mcp-usage)). |
| **Tool names** | 1–128 characters from ASCII alphanumerics, `_`, `-` and `.` (a MUST). This was added to "codify MCP tool name requirements" ([#152](https://github.com/webmachinelearning/webmcp/commit/1380910)). |
| **Input schema** | A JSON Schema object, referencing JSON Schema 2020-12. The browser stores it stringified. Native validation of inputs against the schema is still an open question ([#92](https://github.com/webmachinelearning/webmcp/issues/92)), and the README says to "validate strictly in code, loosely in schema". |
| **Output** | The `execute` result is serialized to a JSON string. A result that can't be serialized is an `unserializable result` error. **No `outputSchema`** (open: [#9](https://github.com/webmachinelearning/webmcp/issues/9)). |
| **Annotations** | `readOnlyHint`; `untrustedContentHint` (the output holds untrusted data); `consequentialHint` ("significant, real-world, or non-reversible" actions, added 2026-09-03); `debugging` (added 2026-09-17). The spec says "a malicious site can omit or misrepresent those hints". |
| **User confirmation** | **None in the API.** `ModelContextClient` (which carried `requestUserInteraction`) was removed on 2026-06-11 ([commit 067a1c9](https://github.com/webmachinelearning/webmcp/commit/067a1c9)). The README lists "User prompting and elicitation" as an open question ([#165](https://github.com/webmachinelearning/webmcp/issues/165), [#50](https://github.com/webmachinelearning/webmcp/issues/50)). The spec suggests agents "selectively enforce mandatory user confirmation prompts" on `consequentialHint` tools. |
| **Auth context** | Not defined. The spec assumes "identity inheritance": agents "carry the user's logged-in credentials and session state". Chrome says WebMCP tools "run in the page with the user's session" ([Chrome blog](https://developer.chrome.com/blog/webmcp-mcp-usage)). OpenAI says site tools use "your signed-in session" ([OpenAI: Site tools](https://developers.openai.com/codex/webmcp)). |
| **Lifecycle** | `registerTool` returns a promise. To unregister, abort the `AbortSignal` passed in options. `toolchange` fires on register and unregister. There is no `updateTool()`: to change metadata, unregister and re-register. `toolactivated` and `toolcancel` fire when execution starts or is cancelled. Execution receives an `AbortSignal`. |
| **Frames and origins** | Permissions-Policy feature `tools`, default allowlist `'self'`. Cross-origin iframes need `allow="tools"`. A tool is exposed to its own document, same-origin documents and built-in browser agents by default. `exposedTo` / `fromOrigins` is a two-sided opt-in for cross-origin frames. |
| **In-page agents** | `getTools()` and `executeTool()` let an agent running on the page, or in a permitted frame, discover and call tools. The README says WebMCP "supports author-provided agents". |
| **Not in the spec** | The declarative `<form>` API was removed from the spec on 2026-10-08 ([commit 14ae813](https://github.com/webmachinelearning/webmcp/commit/14ae813)) and lives on as a separate explainer. Continuations (a tool started on one page and finished after navigation) are in an [explainer](https://github.com/webmachinelearning/webmcp/blob/main/continuations-explainer.md). Service-worker tools are a [future idea](https://github.com/webmachinelearning/webmcp/blob/main/docs/service-workers.md). |
| **Non-goals** | "Fully autonomous workflows" without a browser UI, and "Replacement of backend integrations" ([README](https://github.com/webmachinelearning/webmcp/blob/main/README.md)). |

### 1.2 API history (to correct the brief)

| Date | Change | Source |
|---|---|---|
| 2026-02 | First WebIDL, on `Navigator` | [commits](https://github.com/webmachinelearning/webmcp/commits/main/index.bs) |
| 2026-03-05 | `provideContext()` / `clearContext()` removed | [fe84c67](https://github.com/webmachinelearning/webmcp/commit/fe84c67) |
| 2026-03-27 | `unregisterTool()` removed in favour of `AbortSignal` | [90daeee](https://github.com/webmachinelearning/webmcp/commit/90daeee) |
| **2026-05-27** | **`modelContext` getter moved to `Document`** | [c7b5c70](https://github.com/webmachinelearning/webmcp/commit/c7b5c70) |
| 2026-06-11 | `ModelContextClient` removed | [067a1c9](https://github.com/webmachinelearning/webmcp/commit/067a1c9) |
| 2026-07-08 | Chromium removes `navigator.modelContextTesting` | [Chromium/WPT](https://chromium.googlesource.com/external/github.com/web-platform-tests/wpt/+/ed76dd926b0ca18aafb188452f9ccf746be8bff4) |
| 2026-07 | Chrome Canary 152 no longer exposes `navigator.modelContext` at all. **Unverified**: from a third-party polyfill's bug report ([WebMCP-org/npm-packages#270](https://github.com/WebMCP-org/npm-packages/issues/270)); I found no Chromium release note. | |
| 2026-07-21 to 2026-08-17 | `getTools()` and `executeTool()` specified | [5801678](https://github.com/webmachinelearning/webmcp/commit/5801678), [f303c45](https://github.com/webmachinelearning/webmcp/commit/f303c45) |
| 2026-09-28 | Cloudflare Browser Run "moves to `document.modelContext`" | [Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2026-09-28-webmcp-api/) |

Chrome Status files the feature under the web-feature ID `document-modelcontext`
([Chrome Status API](https://chromestatus.com/api/v0/features/5117755740913664)).

### 1.3 Standards positions

| Engine | Position | Source |
|---|---|---|
| WebKit | **Oppose** (2026-06-03). Among the concerns: "An agent acting on a user's behalf is, in effect, assistive technology", and a parallel tool layer makes "an agent is driving" observable. The issue is labelled for duplication, privacy, security, consent and API design. | [WebKit/standards-positions#670](https://github.com/WebKit/standards-positions/issues/670) |
| Mozilla | **Neutral** (label). Later comments favour the imperative API, with design changes in [webmcp#236](https://github.com/webmachinelearning/webmcp/issues/236). | [mozilla/standards-positions#1412](https://github.com/mozilla/standards-positions/issues/1412) |
| Chromium | "Proposed", spec "being incubated in a Community Group". TAG, security and privacy reviews pending. The Chrome Status entry still shows "No signal" for Safari and Firefox (stale). | [Chrome Status](https://chromestatus.com/feature/5117755740913664) |

---

## 2. WebMCP: joining the origin trials

| | Chrome | Edge |
|---|---|---|
| Trial | "WebMCP", trial ID `4163014905550602241` | "WebMCP", trial `0b76fe60-…` |
| Window | Chrome **149–156** on desktop, Android and WebView. An **extension to 162** was requested on 2026-09-28: one API-owner LGTM was visible, final approval not confirmed ([Intent to Extend](https://groups.google.com/a/chromium.org/d/msgid/blink-dev/6abaf48e.47c66538.78312.00c4.GAE%40google.com), [Chrome Status](https://chromestatus.com/api/v0/features/5117755740913664)) | Edge 150 onward ([implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md)). The trial page says it **expires March 30, 2027** ([Edge trial](https://developer.microsoft.com/en-us/microsoft-edge/origin-trials/trials/0b76fe60-b266-458e-a285-04e375c0c31a)) |
| Register | [Chrome origin trials console](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241), one token per origin | Sign in with GitHub, accept the terms, enter a domain. Optional subdomain coverage and optional third-party matching |
| Deliver | `<meta http-equiv="origin-trial" content="…">`, an `Origin-Trial:` response header, or a meta tag injected by JS. Third-party tokens must come from an external script ([Chrome: origin trials](https://developer.chrome.com/docs/web-platform/origin-trials)) | Meta tag or `Origin-Trial` header |
| Third-party matching | Yes (`ot_has_third_party_support: true`) | Yes |
| Renewal | Tokens expire. When a trial is extended, you renew each origin and redeploy the new token | Not stated |
| Usage cap | Trials are "limited in duration and usage". On 2026-10-28 the WebMCP team asked for an exception raising the cap from 0.5% to 2.0% of page loads (thread above) | Not stated |
| Local development | `chrome://flags/#enable-webmcp-testing` ([Chrome docs](https://developer.chrome.com/docs/ai/webmcp)) | `about://flags/#enable-webmcp-testing` ([MicrosoftEdge/webmcp-labs](https://github.com/MicrosoftEdge/webmcp-labs)) |

**ChatGPT desktop** does not mention origin-trial tokens. Its example only feature-detects
`document.modelContext?.registerTool`
([OpenAI: Site tools](https://developers.openai.com/codex/webmcp)).

---

## 3. WebMCP: who calls it today

| Agent | Status (2026-10-30) | Notes | Source |
|---|---|---|---|
| **ChatGPT desktop app, built-in browser** ("site tools") | **Shipped.** ChatGPT Work and Codex on macOS and Windows | Requires GPT-5.6 Sol or GPT-6 Sol ("GPT-5.6 Luna currently has WebMCP disabled"). Enterprise admins must allow it. Not available in Edu, not in Chrome. **No declarative tools and no tools in iframes.** Each call gets "a safety review", and "normal … confirmation policies still apply". Users can turn it off under Settings > Browser > Permissions. | [OpenAI: Site tools](https://developers.openai.com/codex/webmcp); launched 2026-08-31 per the [ChatGPT release notes](https://help.openai.com/en/articles/6825453-chatgpt-release-notes) (search excerpt) |
| **Brave Leo** | Experimental, behind `brave://flags/#enable-webmcp-testing` | A tools pill lists the site's tools. Each run asks "Allow" (with an "Allow for session" option). The issue is still open. | [brave/brave-browser#55232](https://github.com/brave/brave-browser/issues/55232), [implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md) |
| **Gemini in Chrome** | **Announced, not shipped** | "Gemini in Chrome will soon support WebMCP APIs" (2026-05-19). Chrome's WebMCP docs say its test extensions "are separate from Gemini in Chrome". I found no primary source saying it has shipped. | [Chrome at I/O 2026](https://developer.chrome.com/blog/chrome-at-io26), [Chrome docs](https://developer.chrome.com/docs/ai/webmcp) |
| **Copilot in Edge** | **Not available** | A Microsoft collaborator wrote on 2026-10-06: "There's currently no public way to test WebMCP with Copilot in Edge". The Edge team uses its WebMCP Explorer extension instead. | [MicrosoftEdge/webmcp-labs#17](https://github.com/MicrosoftEdge/webmcp-labs/issues/17) |
| **Claude (Claude in Chrome, Desktop)** | **Not supported** | An open feature request; no Anthropic statement. | [anthropics/claude-code#76809](https://github.com/anthropics/claude-code/issues/76809) |
| Meta Ray-Ban Display | "Coming soon", off by default | Meta AI would call `document.modelContext.registerTool()` tools | [implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md) |
| Chrome test extensions | Available | "Model Context Tool Inspector" (needs a Gemini API key) and an example agentic extension (Gemini, OpenAI, Anthropic, or the on-device Prompt API) | [Chrome docs](https://developer.chrome.com/docs/ai/webmcp), [GoogleChromeLabs/webmcp-tools](https://github.com/GoogleChromeLabs/webmcp-tools) (Apache-2.0) |
| Other extensions | Several in the Chrome Web Store | Chrome Status: "several Chrome extensions already available that allow cloud-LLM-based agents to discover and call WebMCP tools" | [Chrome Status](https://chromestatus.com/feature/5117755740913664) |
| Chrome DevTools MCP / CDP | Experimental | A `WebMCP` CDP domain. DevTools MCP with `--category-experimental-webmcp` adds `list_webmcp_tools` and `execute_webmcp_tool` | [Cloudflare changelog](https://developers.cloudflare.com/changelog/post/2026-09-28-webmcp-api/), [Chrome Status](https://chromestatus.com/feature/5117755740913664) |
| Cloudflare Browser Run | Available (Lab and Kitesurf backends) | Headless browsers for server-side agents; uses `document.modelContext` | [Browser Run: WebMCP](https://developers.cloudflare.com/browser-run/features/webmcp/) |
| Polyfills | Available | `@mcp-b/global` 6.0.3 (MIT) installs `document.modelContext` in browsers without it. Types: `webmcp-types` (MIT). A polyfill provides a registry, but something still has to call it. | [npm](https://www.npmjs.com/package/@mcp-b/global), [WebMCP-org/npm-packages](https://github.com/WebMCP-org/npm-packages) |

---

## 4. Can one tool definition serve both the remote MCP server and WebMCP?

Field by field, comparing MCP 2026-07-28
([tools.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx),
[schema.ts](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts))
with the WebMCP draft:

| Field | MCP 2026-07-28 | WebMCP draft | Shareable? |
|---|---|---|---|
| `name` | SHOULD be 1–128 chars, `[A-Za-z0-9_.-]` | MUST be 1–128 chars, same set | Yes (WebMCP is stricter) |
| `title` | Optional | Optional (`USVString`) | Yes |
| `description` | Required | Required | Yes |
| `icons` | Optional | — | MCP only |
| `inputSchema` | JSON Schema, 2020-12 default, MUST be an object | JSON Schema 2020-12, optional | Yes |
| `x-mcp-header` on properties | Optional | — | MCP only |
| `outputSchema` / `structuredContent` | Yes | No (result is any JSON value, serialized) | MCP only |
| Annotations | `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` | `readOnlyHint`, `untrustedContentHint`, `consequentialHint`, `debugging` | **Only `readOnlyHint` overlaps.** A shared descriptor needs a superset, mapped per surface. |
| Result | `content[]` and/or `structuredContent`, `isError` | Whatever `execute` returns, as JSON | Adapter needed |
| Listing | `tools/list` with `ttlMs` and `cacheScope` | `registerTool` / `AbortSignal` / `toolchange` | Different lifecycles |
| Where it runs | Server, with an OAuth access token | Page JS, with the user's session | **Different** |
| UI | MCP Apps: `_meta.ui.resourceUri` | The page itself is the UI | Different |

**Existing bridges**

- **Cloudflare `agents/experimental/webmcp`** (MIT). `registerWebMcp({ url, prefix, getHeaders })`
  discovers a remote MCP server's tools and registers each with WebMCP, proxying execution to the
  server ([example README](https://github.com/cloudflare/agents/blob/main/examples/webmcp/README.md),
  [source](https://github.com/cloudflare/agents/blob/main/packages/agents/src/experimental/webmcp.ts),
  [Cloudflare MCP tools docs](https://developers.cloudflare.com/agents/model-context-protocol/protocol/tools/)).
  - **Stale as of today:** it targets `navigator.modelContext`, copies only `readOnlyHint`, and
    opens an SSE GET for list changes, which MCP 2026-07-28 replaced with
    `subscriptions/listen`.
  - The last change to the source was 2026-04-18 (`feat(experimental): Add WebMCP Adapter`). It
    "will break between releases".
- `@mcp-b/webmcp-ts-sdk` (MIT) describes itself as a "WebMCP browser adapter extending the
  upstream API with MCP capabilities" ([npm](https://www.npmjs.com/package/@mcp-b/webmcp-ts-sdk)).
  I did not evaluate it.
- Chrome's guidance recommends running both protocols side by side, not sharing definitions:
  "MCP handles core logic and data, and WebMCP adds the contextual, in-browser layer"
  ([Chrome blog](https://developer.chrome.com/blog/webmcp-mcp-usage)). OpenAI: "A website can
  support both" ([OpenAI: Site tools](https://developers.openai.com/codex/webmcp)).

**Two ways to share, both seen above**

1. **Proxy:** WebMCP `execute` forwards to the MCP server (Cloudflare's pattern). One
   implementation, but the in-page call takes a network hop, and the page has to learn about the
   change through its own sync.
2. **Shared descriptor, two handlers:** one neutral definition (name, title, description, JSON
   Schema, an annotation superset). The MCP handler and the WebMCP handler both call the same
   domain operation. For Flypack that could be the same Convex mutation, called from the server
   in one case and through the Convex client in the page in the other. The page sees the result
   through its live query.

---

## 5. In-app panel: what the Claude Agent SDK needs at runtime

From [Hosting the Agent SDK](https://code.claude.com/docs/en/agent-sdk/hosting),
[Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) and the
[TypeScript reference](https://code.claude.com/docs/en/agent-sdk/typescript):

- "The Agent SDK spawns and supervises a `claude` CLI subprocess that owns a shell, a working
  directory, and session files on disk." Each session is one long-lived subprocess, which talks
  to the SDK over stdio.
- Runtime: Node.js 18.14+ (`engines: >=18.14.0` in `@anthropic-ai/claude-agent-sdk` 0.3.314) or
  Python 3.10+. A native Claude Code binary is bundled and pinned to the SDK version.
- Resources: "1 GiB RAM, 5 GiB disk, and 1 CPU per agent is a reasonable starting point".
- State: transcripts go to local disk. A `SessionStore` adapter mirrors them for hybrid or
  serverless-style resumption.
- Hosting patterns: ephemeral, long-running, hybrid or multi-agent containers. The cookbook covers
  Docker, Modal and Kubernetes.
- A `spawnClaudeCodeProcess` option lets the host "run Claude Code in VMs, containers, or remote
  environments". Whether the SDK library itself loads in workerd with a custom spawner is
  **Unverified**.
- Auth: `ANTHROPIC_API_KEY`, Bedrock, Claude Platform on AWS, Vertex, or Foundry
  ([quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart)).
- **License:** the npm package's `LICENSE.md` reads "© Anthropic PBC. All rights reserved. Use is
  subject to the Legal Agreements…" (checked in the published 0.3.314 tarball).

| Requirement | Agent SDK | Cloudflare Workers | Convex Node action |
|---|---|---|---|
| Runtime | Node 18.14+ | workerd with `nodejs_compat`, not Node | Node 22 or 24 ([runtimes](https://docs.convex.dev/functions/runtimes)) |
| Spawn a subprocess | Required | `node:child_process` is a **"non-functional stub"** ([Node.js APIs](https://developers.cloudflare.com/workers/runtime-apis/nodejs/), [compat flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/)) | Not documented: **Unverified** |
| Memory | ≥1 GiB per session | 128 MB per isolate ([limits](https://developers.cloudflare.com/workers/platform/limits/)) | 512 MB ([actions](https://docs.convex.dev/functions/actions)) |
| Duration | Long-lived process | CPU up to 5 min per request; wall time not capped | **10 minutes** max per action ([limits](https://docs.convex.dev/production/state/limits)) |
| Local disk | ~5 GiB, holds transcripts and cwd | No persistent disk | Not documented |

**What does fit each runtime (primary sources)**

- **Cloudflare Containers / Sandbox SDK:** Cloudflare documents running Claude Code in a sandbox
  container driven by a Worker and a Durable Object. The model key stays in the Worker, through
  AI Gateway ([coding agent runner](https://developers.cloudflare.com/sandbox/get-started/build-a-coding-agent-runner/),
  [Claude Code in a sandbox](https://developers.cloudflare.com/sandbox/coding-agents/claude-code/)).
- **Claude Managed Agents** (beta, `managed-agents-2026-04-01`): Anthropic hosts the agent loop.
  Agents declare MCP servers, with per-session credentials from a vault. Not ZDR-eligible
  ([overview](https://platform.claude.com/docs/en/managed-agents/overview),
  [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)).
  Cloudflare publishes an alpha template that runs its sandboxes on Containers or Dynamic Workers
  ([Cloudflare](https://developers.cloudflare.com/sandbox/coding-agents/claude-managed-agents/)).
- **No subprocess at all:**
  - The Anthropic TypeScript Client SDK (Apache-2.0) lists "Cloudflare Workers" as a supported
    runtime ([README](https://github.com/anthropics/anthropic-sdk-typescript)).
  - The Messages API **MCP connector** (beta, `mcp-client-2026-09-15`) calls a public
    remote MCP server directly from the API. It supports only tool calls, with OAuth bearer
    tokens ([MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)).
  - On Convex: `@convex-dev/agent` 0.7.9 (Apache-2.0) and the Vercel AI SDK (Apache-2.0) run tool
    loops in actions. I did not test them.

---

## 6. Terms: a person's Claude or ChatGPT subscription vs API keys

### 6.1 Anthropic

| Path | What Anthropic says | Source |
|---|---|---|
| **The user's Claude subscription inside a third-party app** | "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK." | [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview), [quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart) |
| | "Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens." OAuth is "intended exclusively for purchasers of Claude … subscription plans … to support ordinary use of Claude Code and other native Anthropic applications." | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) |
| | Consumer Terms (effective 2025-10-08) prohibit accessing the Services "through automated or non-human means, whether through a bot, script, or otherwise", except with an API key or explicit permission. They also forbid sharing account credentials. | [Consumer Terms](https://www.anthropic.com/legal/consumer-terms) |
| | The one carve-out: nothing prevents "an end user from signing in to the unmodified Claude Code binary with their own Claude subscription, including where a platform hosts Claude Code". | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) |
| **Our API key, powering our product** | Commercial Terms A.1 allow using the Services "to power products and services Customer makes available to its own customers and end users". The customer is "responsible for all activity under its account". D.4 bars reselling the Services without approval. | [Commercial Terms](https://www.anthropic.com/legal/commercial-terms) (effective 2025-06-17) |
| | The Agent SDK is governed by the Commercial Terms, "including when you use it to power products and services that you make available to your own customers and end users". | [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) |
| | **Tension:** for "preinstalling or running Claude Code in your products or services (e.g. in hosted sandboxes or other agent infrastructure)", Anthropic says "Customers may not pay for, resell, or intermediate Claude usage on their end users' behalf. Each end user must authenticate with their own Anthropic API key, Claude subscription plan credentials, or 3P inference provider credential". The Agent SDK "runs the Claude Code binary". Whether a hosted Agent SDK panel paid for with Flypack's key falls under this condition is **not stated: ask Anthropic**. The Client SDK and Messages API carry no such condition. | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance), [overview](https://code.claude.com/docs/en/agent-sdk/overview) |
| **The user's own API key** | The rule does not restrict how customers "provision and manage their own API keys … provided the resulting usage is billed to the key owner … and is not resold or intermediated". For hosted Claude Code, BYOK is one of the named end-user options. The Commercial Terms have no explicit BYOK clause. | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance), [Commercial Terms](https://www.anthropic.com/legal/commercial-terms) |
| Branding | You may say "Claude Agent" or "{Name} Powered by Claude". You may not say "Claude Code" or "Claude Code Agent". | [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) |

### 6.2 OpenAI

| Path | What OpenAI says | Source |
|---|---|---|
| **The user's ChatGPT plan through Sign in with ChatGPT** | "ChatGPT plan usage is an optional capability within Sign in with ChatGPT … permission to use the user's ChatGPT plan for eligible Responses API requests." | [SIWC overview](https://developers.openai.com/siwc/token-sharing-open-source) |
| | Availability: "Sign in with ChatGPT is currently available to selected commercial partners through a limited trial. ChatGPT plan usage is available to all open-source partners and selected private clients." For "a paid or remotely hosted app, complete the interest form." | [SIWC quickstart](https://developers.openai.com/siwc/quickstart), [overview](https://developers.openai.com/siwc/token-sharing-open-source) |
| | Eligible users: Plus and Pro ([quickstart](https://developers.openai.com/siwc/quickstart)). The help center says Go, Plus and Pro (search excerpt, [help article](https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites)). | |
| | Preview limits: requires `store: false` and `stream: true`. Function and custom tools are supported. Hosted MCP/connectors, file search, Code Interpreter and image generation are **not**. | [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) |
| | For self-hosted VMs, the user completes OAuth locally and transfers credentials. "Host-specific usage attribution and revocation … are not yet available." | [Self-hosted VMs](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms) |
| | The [SIWC Terms](https://openai.com/policies/sign-in-with-chatgpt-terms/) reportedly require tokens to stay under the user's control, with requests coming from the user's local runtime or a remote runtime only that user controls. **Unverified**: the page blocks automated fetching and I saw only secondary summaries. | |
| **The user's ChatGPT calling Flypack's tools** | Custom MCP servers are added under ChatGPT Plugins. "Account and workspace policies apply." | [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt) |
| | Plan scope: full MCP for Business and Enterprise/Edu; Pro gets read/fetch in developer mode; Plus unclear. Search excerpt of the [help article](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt); treat as **Unverified** until read directly. | |
| | WebMCP site tools in the desktop browser use the user's ChatGPT account and session ([OpenAI: Site tools](https://developers.openai.com/codex/webmcp)). | |
| **Our or the user's OpenAI API key** | Not researched in depth; the OpenAI Terms of Use page blocks automated fetching. | — |

### 6.3 The user's Claude calling Flypack's tools

Claude custom connectors (remote MCP) are "available … for users on Free, Pro, Max, Team, and
Enterprise plans". "Free users are limited to one custom connector". On Team and Enterprise only
admins add them. The connection is OAuth, and some connectors render interactive UI inline
([Claude help: custom connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)).
The model cost falls on the user's own plan under Anthropic's own terms, and Flypack never sees
a Claude credential.

---

## 7. The practical options for the panel's model

| Option | Who pays | Terms status | Runtime fit | Notes |
|---|---|---|---|---|
| **A. Our key, Client SDK / Messages API** (optionally the MCP connector pointed at Flypack's MCP server) | Flypack | Allowed under Commercial Terms A.1 | Runs on Workers ([SDK README](https://github.com/anthropics/anthropic-sdk-typescript)) or in a Convex action | Flypack writes or borrows the agent loop. MCP connector: tools only, server must be public, beta. |
| **B. Our key, Agent SDK in a container** (Cloudflare Containers/Sandbox, Modal, …) | Flypack | **Open question:** the "Claude Code in your product" condition says end users must bring their own credentials (§6.1) | Not on Workers or Convex. Needs a container of ~1 GiB per session | Proprietary package vs ADR 0001's "every dependency must be compatible". |
| **C. Our key, Claude Managed Agents** | Flypack | Claude API product (beta) | HTTP/REST from Workers or Convex. Anthropic hosts the loop | Not ZDR-eligible. Declares Flypack's MCP server with vault credentials. |
| **D. The user's Anthropic API key** (BYOK) | The user | Allowed when billed to the key owner and not intermediated (§6.1) | Any of A–C | Flypack stores a user secret. Most crew members won't have an API key. **Unverified** how many do. |
| **E. Sign in with ChatGPT plan usage** | The user's ChatGPT plan | Open to open-source apps. A **remotely hosted** app must apply (interest form) | Responses API from the server, with the SIWC limits (§6.2) | OpenAI models only. The terms' runtime-control clause is **Unverified**. |
| **F. Claude.ai login in Flypack** | — | **Not allowed** without Anthropic's approval | — | — |
| **G. Bring your own agent** (the user's Claude connector, ChatGPT plugin, or WebMCP site tools in ChatGPT desktop) | The user's subscription | Allowed: the user uses their own product | The remote MCP server on Workers/Convex. WebMCP in the page | No in-app panel for these users. UX lives in their agent. WebMCP reach today is ChatGPT desktop plus flags. |

---

## What this means for Flypack

Facts and options only; decisions come later, with the human.

**WebMCP**

- WebMCP today means **tools in the top-level page, with the user's session**. The draft has no
  confirmation API, no output schema and no resources. Agent changes still need a
  preview-then-apply step (PRODUCT.md). In WebMCP that step would be either a Flypack UI step
  that a tool triggers (`preview_*` returns a handle and the page shows the diff), or the agent's
  own policy reacting to `consequentialHint`.
- **Reach:** one shipped consumer, the ChatGPT desktop browser on Sol models. Then Brave Leo
  behind a flag, and developer extensions. Gemini in Chrome is announced, Copilot in Edge isn't
  publicly testable, and Claude doesn't support it. WebKit opposes the API, and the draft is
  still changing week to week.
- **To join the trials:**
  - Register the production origin for Chrome (149–156, extension to 162 pending) and Edge
    (expires 2027-03-30).
  - Serve the token as a meta tag or an `Origin-Trial` header. TanStack Start on Workers can set
    either.
  - Watch the renewal emails.
  - ChatGPT desktop needs no token, only `document.modelContext`.
- **Tool layer:**
  - A shared descriptor works for name, title, description and input schema.
  - Annotations need a superset mapping. MCP has `destructiveHint`, `idempotentHint` and
    `openWorldHint`; WebMCP has `consequentialHint` and `untrustedContentHint`.
  - Output schemas exist only in MCP.
  - There are two ways to share a definition. One proxies WebMCP calls to the MCP server
    (Cloudflare's adapter does this but is stale). The other gives each surface its own handler
    over the same domain operation, such as a Convex mutation.
- **The in-app panel could use WebMCP's `getTools()`/`executeTool()`** as an author-provided
  agent on the same page, in browsers that have it. Elsewhere it would need a polyfill such as
  `@mcp-b/global` (MIT) or a direct call into the shared tool layer.

**The panel's runtime**

- The Claude Agent SDK runs neither on Workers (128 MB, `child_process` stub) nor in Convex Node
  actions (512 MB, 10 min, subprocess support undocumented).
- Options that fit the stack are:
  - the Client SDK or Messages API from a Worker or Convex action, with Flypack's tools passed
    directly or through the MCP connector;
  - Claude Managed Agents over REST;
  - the Agent SDK in Cloudflare Containers/Sandbox or another container host.
- The Agent SDK's license is proprietary. ADR 0001 says every dependency must be compatible and
  names tldraw's commercial license as incompatible. The Client SDK is Apache-2.0.

**Paying for the model**

- **Anthropic subscriptions can't pay for an in-app panel** unless Anthropic approves it. A
  user's Claude plan can pay only when the user's own Claude calls Flypack's MCP server (custom
  connectors, on all plans).
- **OpenAI is the one vendor with a sanctioned sign-in-and-use-my-plan flow.** For a remotely
  hosted app it's gated behind an interest form, and the Responses API carries preview limits.
- **Our key** is clearly allowed with the Client SDK or Messages API. With a hosted Agent SDK it
  runs into Anthropic's "may not pay for … end users' behalf" condition for products that run
  Claude Code. That needs a direct answer from Anthropic before anyone relies on it.
- **The user's key** is allowed when usage is billed to the key owner. Flypack would then hold a
  user secret, which the public-repo rules in AGENTS.md treat strictly.

**Open questions to take back**

1. Does Anthropic treat a hosted Agent SDK panel, paid for by the operator, as "running Claude
   Code in your product"? Would it approve an exception?
2. Would OpenAI approve Sign in with ChatGPT plan usage for an AGPL app that is also hosted?
3. Was Chrome's extension to 162 approved, and does Gemini in Chrome have a date?
4. Which ChatGPT plans can add a custom MCP server with write tools? This needs a direct read of
   the help article.
