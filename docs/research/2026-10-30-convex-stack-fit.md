# Do Convex, Better Auth, `convex/mcp` and TanStack Start on Workers fit together?

Researched 2026-10-30 for [issue #6](https://github.com/brandonnly/flypack/issues/6). Primary
sources only: repositories, their source, docs, changelogs, issues and LICENSE files. Unless a
line says otherwise, versions are as of today. **Unverified** marks a claim I couldn't trace to a
primary source. "Inference" marks my own reasoning from the cited facts.

Versions checked: `@convex-dev/better-auth` 0.12.6 (2026-10-26), `better-auth` 1.7.14 (latest) and
1.6.33 (last 1.6), `@convex-dev/mcp` 0.1.0-alpha.7, `convex` 1.48.0, `@tanstack/react-start`
1.169.4, `@modelcontextprotocol/server` 2.4.0 (npm registry, read 2026-10-30).

---

## TL;DR

| # | Finding | Source |
|---|---------|--------|
| 1 | **`@convex-dev/better-auth` only works with Better Auth 1.6.** Its peer range is `>=1.6.11 <1.7.0`, and its `convex()` plugin imports `better-auth/plugins/oidc-provider`, which Better Auth 1.7.0 removed. The 1.7 migration PR is open and not merged. | [package.json](https://github.com/get-convex/better-auth/blob/main/package.json), [#433](https://github.com/get-convex/better-auth/issues/433), [PR #430](https://github.com/get-convex/better-auth/pull/430) |
| 2 | **That pin has a security cost today.** Two advisories published 2026-10-27 (one critical, one high) affect `better-auth` `<1.7.7`, and the only patched version is 1.7.7. Better Auth supports "only the latest version", and the security release announced for 2026-11-03 covers 1.7.x and 1.8 beta only. | [GHSA-965c-763c-88jm](https://github.com/advisories/GHSA-965c-763c-88jm), [GHSA-r4xp-prcw-77qf](https://github.com/advisories/GHSA-r4xp-prcw-77qf), [SECURITY.md](https://github.com/better-auth/better-auth/blob/main/SECURITY.md), [blog](https://github.com/better-auth/better-auth/blob/main/docs/content/blogs/security-release-2026-11-03.mdx) |
| 3 | **The organization plugin works, but only through "Local Install"** (you own the component schema), and it has open bugs: `invite-member` returns 500 unless you set `generateId: false`. | [supported plugins](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/supported-plugins.mdx), [#407](https://github.com/get-convex/better-auth/issues/407) |
| 4 | **`convex/mcp` runs its own OAuth server, separate from Better Auth's.** It shares *who the user is* through Convex's `ctx.auth`: your consent page is signed in with Better Auth, and `getUserId(ctx)` reads the Better Auth identity. Tokens are opaque and live in the MCP component. It speaks MCP 2026-07-28 plus 2025-11-25, 2025-06-18 and 2025-03-26. | [README](https://github.com/convex/mcp/blob/main/README.md), [`src/client/index.ts`](https://github.com/convex/mcp/blob/main/src/client/index.ts) |
| 5 | **Better Auth's own MCP path isn't usable on Convex today.** `@better-auth/mcp` needs `better-auth ^1.7.14` (see 1). On 1.6, `@better-auth/oauth-provider` breaks `convex()`'s token route at runtime, and refresh-token rotation fails with `invalid_grant`. | [npm peers](https://www.npmjs.com/package/@better-auth/mcp), [#395](https://github.com/get-convex/better-auth/issues/395), [#399](https://github.com/get-convex/better-auth/issues/399) |
| 6 | **TanStack Start on Workers plus `@convex-dev/better-auth/react-start` has an open build bug**: a dynamic import pulls server SSR code (`node:stream`) into the client bundle under `@cloudflare/vite-plugin`. There is a documented workaround. | [#220](https://github.com/get-convex/better-auth/issues/220), [#409](https://github.com/get-convex/better-auth/issues/409) |
| 7 | **Previews need per-host config.** Since 0.12.6, forwarded hosts are trusted only when listed *exactly* in `trustedOrigins` (wildcards are skipped). Every Convex preview deployment also needs its own `SITE_URL` and secrets. | [`create-client.ts`](https://github.com/get-convex/better-auth/blob/main/src/client/create-client.ts), [CHANGELOG 0.12.6](https://github.com/get-convex/better-auth/blob/main/CHANGELOG.md) |
| 8 | **Licenses are fine.** Everything in the path is MIT or Apache-2.0 (the MCP SDK is mid-transition from MIT to Apache-2.0). The FSL-licensed Convex backend is only involved if you self-host it. | [License table](#4-licenses-against-adr-0001) |

---

## 1. `@convex-dev/better-auth` with TanStack Start SSR and the organization plugin

### 1.1 TanStack Start support

- TanStack Start is a documented, first-party framework guide with an example app
  ([guide](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/framework-guides/tanstack-start.mdx),
  [example](https://github.com/get-convex/better-auth/tree/main/examples/tanstack)). The docs are
  published at [labs.convex.dev/better-auth](https://labs.convex.dev/better-auth).
- **How it fits together**
  ([guide](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/framework-guides/tanstack-start.mdx)):
  - Better Auth runs **inside Convex** as a component, with routes mounted on Convex HTTP
    actions (`authComponent.registerRoutes(http, createAuth)`).
  - The Start app proxies `/api/auth/*` to the Convex site URL through a server route
    (`handler` from `convexBetterAuthReactStart`), so cookies stay first-party on the app's origin.
  - For SSR, a `createServerFn` calls `getToken()`, which reads the request cookies and fetches a
    Convex JWT. `beforeLoad` sets it on `convexQueryClient.serverHttpClient`.
  - On the client, `ConvexBetterAuthProvider` takes `initialToken` from the route context.
- **Caveats the guide itself states:**
  - It pins `npm install better-auth@~1.6.15`.
  - It needs `ssr: { noExternal: ['@convex-dev/better-auth'] }` in `vite.config.ts`. Without it
    you get `No StartEvent found in AsyncLocalStorage`
    ([#198](https://github.com/get-convex/better-auth/issues/198), open, fixed by that setting).
  - "A seamless initial render currently requires `expectAuth: true`", which "does not allow
    Convex functions to run in the client before authentication."
  - After sign-out with `expectAuth: true`, "the current recommendation is to reload the page."
  - `auth.api.*` calls must run inside Convex functions, not in Start server code.
- **`expectAuth: true` vs public pages:** with it set, an unauthenticated visitor's client never
  opens the WebSocket. A maintainer says `expectAuth` "won't work for you if you need
  unauthenticated queries… a 'better than nothing' bandaid"
  ([#301](https://github.com/get-convex/better-auth/issues/301), open).
- **Auth state in the UI:** use Convex's `useConvexAuth()` / `<Authenticated>`, not Better Auth's
  `useSession()`. Better Auth reports a signed-in user before Convex has validated the token
  ([authorization doc](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/basic-usage/authorization.mdx)).
- **JWT:** the `convex()` plugin issues a Convex JWT that expires after 15 minutes by default
  (`jwt.expirationSeconds`). It also sets a `convex_jwt` cookie at sign-in for SSR
  ([`src/plugins/convex/index.ts`](https://github.com/get-convex/better-auth/blob/main/src/plugins/convex/index.ts),
  [convex-plugin API](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/api/convex-plugin.mdx)).
  `identity.subject` is the Better Auth user ID
  ([0.8 migration](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/migrations/migrate-to-0-8.mdx)).
- **Query context is read-only:** in queries the plugin no-ops writes and disables session
  refresh. Writes by Better Auth plugins (it names "org state correction") are skipped with a
  warning (`convex()` before-hook in the same file).

### 1.2 The Better Auth version pin (the main risk)

- **The peer range is `better-auth >=1.6.11 <1.7.0`**
  ([package.json](https://github.com/get-convex/better-auth/blob/main/package.json)).
- **Why it can't just be widened:** `convex()` constructs `oidcProvider` from
  `better-auth/plugins/oidc-provider`, and the default schema options do too
  ([`src/plugins/convex/index.ts`](https://github.com/get-convex/better-auth/blob/main/src/plugins/convex/index.ts),
  [`src/auth-options.ts`](https://github.com/get-convex/better-auth/blob/main/src/auth-options.ts)).
  Better Auth 1.7 removed that plugin: "Remove the deprecated `oidcProvider` plugin… Migrate…
  to `@better-auth/oauth-provider`"
  ([CHANGELOG](https://github.com/better-auth/better-auth/blob/main/packages/better-auth/CHANGELOG.md)).
  With 1.7, `npx convex dev` fails to bundle: `Could not resolve "better-auth/plugins/oidc-provider"`
  ([#433](https://github.com/get-convex/better-auth/issues/433), open since 2026-08-28).
- **Fixes in flight, none merged:**
  - [PR #430](https://github.com/get-convex/better-auth/pull/430) "Migrate Convex adapter to
    Better Auth 1.7" targets `>=1.7.7 <1.8.0`. It also fixes `eq null` matching and OAuth
    provider discovery. Open, last updated 2026-10-27, with no review decision.
  - [PR #444](https://github.com/get-convex/better-auth/pull/444) (draft) and
    [PR #456](https://github.com/get-convex/better-auth/pull/456) (bot, security bump) are
    alternatives.
  - The last release that changed adapter behaviour was 0.12.5 on 2026-06-27. 0.12.6 (2026-10-26)
    was a security fix for this package's own cross-domain and forwarded-host handling
    ([CHANGELOG](https://github.com/get-convex/better-auth/blob/main/CHANGELOG.md)).
- **1.7 is itself breaking for adapters.** For example, `Account.accountId` was renamed in a 1.7
  prerelease, and the generic OAuth plugin was rewritten. Upgrading needs a component release,
  not just a version bump
  ([CHANGELOG 1.7.0 / rc notes](https://github.com/better-auth/better-auth/blob/main/packages/better-auth/CHANGELOG.md);
  PR #430 says 1.7.7 "uses `(providerId, accountId)` for account identity").
- **Security exposure on 1.6:**
  - [GHSA-965c-763c-88jm](https://github.com/advisories/GHSA-965c-763c-88jm), critical, published
    2026-10-27: "OAuth state can be used as a Magic Link to sign in as another user". Affects
    `>= 1.4.0-beta.18, < 1.7.7`; patched in 1.7.7.
  - [GHSA-r4xp-prcw-77qf](https://github.com/advisories/GHSA-r4xp-prcw-77qf), high, published
    2026-10-27: "OAuth Proxy lets an attacker sign in as another user". Affects
    `>= 1.5.0-beta.12, < 1.7.7`; patched in 1.7.7.
  - The newest 1.6 on npm is 1.6.33, published 2026-09-14, before both advisories (npm `time`).
  - "We only support the latest version of Better Auth"
    ([SECURITY.md](https://github.com/better-auth/better-auth/blob/main/SECURITY.md)).
  - The security release scheduled for 2026-11-03 "covers 2 release lines: v1.7.x, v1.8.0-beta.x"
    ([blog post](https://github.com/better-auth/better-auth/blob/main/docs/content/blogs/security-release-2026-11-03.mdx)).
  - **Preconditions:** the first advisory needs Magic Link plus a social or Generic OAuth provider.
    The second needs the OAuth Proxy plugin. These preconditions come from the
    [PR #456](https://github.com/get-convex/better-auth/pull/456) description and the advisory
    titles. I didn't read the advisory bodies in full, so the exact preconditions are
    **Unverified**.

### 1.3 Organization plugin

- **It isn't on the "supported" list.** That list is Anonymous, Email OTP, Generic OAuth, JWT,
  Magic Link, One Tap, Phone Number, Two Factor and Username.
  "Any Better Auth plugin may be used… For plugins that require schema changes and aren't in the
  list, check out Local Install"
  ([supported-plugins](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/supported-plugins.mdx)).
  SSO is listed as incompatible even with Local Install ("direct dependencies on Node.js").
- **The org plugin needs schema changes:** `organization`, `member` and `invitation` tables, plus
  `session.activeOrganizationId` / `activeTeamId`
  ([organization docs, Schema](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/organization.mdx)).
  The default component schema has none of these (`src/component/schema.ts`), so you need
  **Local Install**: a `convex/betterAuth/` component, a generated schema (`npx auth generate`) and
  a `createAuthOptions` split
  ([local-install](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/features/local-install.mdx)).
  A user in [#222](https://github.com/get-convex/better-auth/issues/222) confirms this.
- **Bonus of Local Install:** it "makes it possible… to write Convex functions that directly
  access Better Auth component tables". That's how an MCP tool or mutation could check membership
  inside the same transaction (same doc).
- **Multiple organizations per user is native to the plugin.** You can list a user's
  organizations, and the active organization is stored per session (`setActive`). The docs note
  you can instead keep the active org client-side so "multiple tabs can have different active
  organizations". `organizationLimit` is unlimited by default, and `membershipLimit` defaults to
  100
  ([organization docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/organization.mdx)).
  Teams and dynamic access control are optional add-ons.
- **Open org issues on the Convex adapter:**
  - [#407](https://github.com/get-convex/better-auth/issues/407): `invite-member` returns 500
    because the adapter rejects a pre-generated `_id`. Workaround from the thread:
    `advanced: { database: { generateId: false } }`. A later comment says the same root cause hits
    `oauthClientAssertion` with Better Auth 1.7 and the OAuth provider.
  - [#222](https://github.com/get-convex/better-auth/issues/222): `additionalFields` on
    organization models aren't inferred into types, and some `auth.api.*` org endpoints are typed
    `any`.
  - [#157](https://github.com/get-convex/better-auth/issues/157) (2025-11): an
    `organizationId_userId` index on `member` was dropped by the CLI, producing "Querying without
    an index" warnings. Whether it still applies is **Unverified**.
  - The adapter source warns that large `in` queries "are only currently possible with the
    organization plugin listing all members with a high limit" and can crash
    ([`adapter-utils.ts`](https://github.com/get-convex/better-auth/blob/main/src/client/adapter-utils.ts)).
  - The repo has an organization-joins test profile
    (`src/component/testProfiles/adapterOrganizationJoins.ts`), so the org schema is exercised in
    tests.
- **The Convex JWT doesn't carry the active org.** The default `definePayload` is user fields
  minus `id` and `image`, plus `sessionId`. You can override it with `jwt.definePayload`
  ([convex-plugin API](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/api/convex-plugin.mdx)).
  Putting `activeOrganizationId` in the JWT is possible in principle, but the token lasts 15
  minutes and switching orgs would need a token refresh (inference). Passing `orgId` / `projectId`
  as an argument and checking membership in the function avoids that.

---

## 2. MCP: `convex/mcp`'s OAuth server vs Better Auth's MCP / OAuth provider plugins

### 2.1 `convex/mcp` (`@convex-dev/mcp`)

- **Status:** alpha. `npm install @convex-dev/mcp@alpha`; the `alpha` tag is 0.1.0-alpha.7. Oddly,
  `latest` still points at 0.1.0-alpha.0 (npm dist-tags). Peer `convex ^1.43.0`. It depends on
  `@convex-dev/rate-limiter` ([package.json](https://github.com/convex/mcp/blob/main/package.json)).
  The repo has no open bug issues ([issues](https://github.com/convex/mcp/issues)).
- **Protocol versions:** `MODERN_PROTOCOL_VERSIONS = ["2026-07-28"]` and
  `LEGACY_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"]`, all on one endpoint
  over Streamable HTTP
  ([`src/client/index.ts`](https://github.com/convex/mcp/blob/main/src/client/index.ts),
  [README](https://github.com/convex/mcp/blob/main/README.md)).
- **Its own OAuth 2.1 authorization server** (README, [DESIGN.md](https://github.com/convex/mcp/blob/main/DESIGN.md)):
  - RFC 9728 / RFC 8414 discovery, DCR (`/mcp/oauth/register`), PKCE, rotating refresh tokens
    with replay detection, audience-bound tokens and RFC 7009 revoke.
  - The device flow (RFC 8628) is on by default.
  - Client ID Metadata Documents are opt-in, "only for hosts you list in
    `clientMetadataDocumentHosts`".
  - Tokens are opaque and stored as SHA-256. All auth state lives in the component's tables
    (`clients`, `authRequests`, `grants`, `tokens`).
- **How it shares identity with Better Auth:**
  - The component authenticates the *agent*. Your app authenticates the *user* on a consent page
    at `consentUrl`.
  - `mcp.api({ getUserId })` takes `getUserId: (ctx: { auth: Auth }) => Promise<UserId | null>`;
    the source's own example is `(await ctx.auth.getUserIdentity())?.tokenIdentifier`
    ([`src/client/index.ts`](https://github.com/convex/mcp/blob/main/src/client/index.ts)).
  - With Better Auth, `ctx.auth` carries the Better Auth–issued Convex JWT, whose `subject` is
    the Better Auth user ID (§1.1). So **one user identity, two separate token systems**:
    Better Auth sessions and Convex JWTs for the UI, `convex/mcp` opaque tokens for agents.
  - The README says users "sign in with whatever your app already uses (Convex Auth, Clerk,
    WorkOS, …)". The example and tests use Convex Auth. **Unverified:** no Better Auth example or
    test exists in the repo. The integration is by design (any provider that feeds `ctx.auth`),
    not demonstrated.
- **Tool handlers run in an HTTP action with no `ctx.auth`.** "The verified user comes in as
  `user.userId`. Pass it to internal functions, and check ownership there." Writes are
  `ctx.runMutation(internal.…)`, so **MCP writes are ordinary Convex mutations**. The README's
  authorization section says to use "one access helper for the UI and for MCP" and to pass the
  whole MCP user (`vMcpUser`) so scopes can narrow access.
- **No route collisions with Better Auth.** Inference from source:
  - `convex/mcp` registers `/mcp`, `/mcp/oauth/*`, `/.well-known/oauth-authorization-server` and
    `/.well-known/oauth-protected-resource[...]`.
  - The Better Auth component registers `/api/auth/*` and a redirect at
    `/.well-known/openid-configuration`.
  - Sources: [`convex/mcp` `src/client/index.ts`](https://github.com/convex/mcp/blob/main/src/client/index.ts),
    [`better-auth` `create-client.ts`](https://github.com/get-convex/better-auth/blob/main/src/client/create-client.ts).
  - Both use `CONVEX_SITE_URL` as their issuer string. Since `convex/mcp` tokens are opaque, not
    JWTs, Convex's JWT validation never sees them (inference).
- **URL and domain:** the MCP URL is `https://<deployment>.convex.site/mcp`. `siteUrl` defaults to
  `CONVEX_SITE_URL`; pass it "if you use a custom domain for HTTP actions" (README). Custom
  domains "require a Convex Pro plan"
  ([custom domains](https://docs.convex.dev/production/custom-domains)).
  Changing the domain later changes the OAuth issuer, and MCP clients key credentials by issuer
  (MCP 2026-07-28 changelog, summarized in `docs/research/2026-10-29-agent-first-patching-tool.md` §7.1),
  so connected agents would have to re-authorize (inference).
- **Limits from the README:**
  - Each tool call is one HTTP action.
  - "Not yet supported: server-to-client streaming (SSE progress, sampling, elicitation),
    resources and prompts, and confidential clients."
  - "The MCP endpoint itself isn't rate limited yet."
  - **Unverified:** whether multi-round-trip `input_required` (the 2026-07-28 replacement for
    elicitation) is implemented. I found no handling for it in the client source.

### 2.2 Better Auth's MCP / OAuth provider plugins

- **1.7 line (current):** `@better-auth/mcp`, built on `@better-auth/oauth-provider`, with the
  recommended `@better-auth/cimd`. All MIT and all at 1.7.14
  ([MCP plugin docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/mcp.mdx)):
  - It's an authorization server plus protected-resource metadata. "For the MCP 2026-07-28
    profile, compose it with Client ID Metadata Documents… MCP deprecates Dynamic Client
    Registration (DCR), so Better Auth never enables DCR implicitly."
  - The MCP protocol itself is *not* Better Auth's job: "The official MCP TypeScript SDK v2 owns
    the stateless MCP protocol and transport. Configure servers with `legacy: "reject"`…".
    `requireMcpAuth` wraps the SDK's `createMcpHandler` and verifies JWT access tokens against
    JWKS (issuer, audience, expiry, DPoP).
  - Access tokens are JWTs from the `jwt()` plugin. Since 1.7.12 `requireMcpAuth` "accepts only
    OAuth access tokens and rejects session JWTs"
    ([CHANGELOG](https://github.com/better-auth/better-auth/blob/main/packages/mcp/CHANGELOG.md)).
  - **Peers:** `better-auth ^1.7.14`, `@better-auth/core ^1.7.14` (npm). **Not installable
    alongside the published `@convex-dev/better-auth` (§1.2).**
  - **CIMD on non-Node runtimes:** the bundled transport is Node-only (`@better-auth/cimd/node`).
    "Bun, Deno, Workers, and other runtimes must provide the equivalent secure transport". It
    must resolve DNS once, reject special-use addresses and pin the connection
    ([CIMD docs](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/cimd.mdx)).
    Better Auth on Convex runs in Convex HTTP actions. **Unverified:** whether such a transport
    can be built there, or in a Worker, with plain `fetch`. My inference is that it can't pin
    addresses, so CIMD would be off and DCR would have to be enabled explicitly.
- **1.6 line (what `@convex-dev/better-auth` allows):**
  - `better-auth/plugins` `mcp` is "based on OIDC Provider plugin" and "will soon be deprecated
    in favor of the OAuth Provider Plugin"
    ([1.6.33 docs](https://github.com/better-auth/better-auth/blob/v1.6.33/docs/content/docs/plugins/mcp.mdx)).
    In the 1.6.33 build it advertises a DCR `registration_endpoint` (`/mcp/register`) and has no
    CIMD (read from the npm tarball). It's auth only; it predates 2026-07-28.
  - `@better-auth/oauth-provider` 1.6.x exists, but on Convex it **collides with `convex()`**.
    After sign-in, `/api/auth/convex/token` returns 404 and login bounces. A commenter calls it
    "structural, not a config issue"
    ([#395](https://github.com/get-convex/better-auth/issues/395), open).
  - Refresh-token rotation fails on every refresh (`400 invalid_grant`), because the adapter's
    `eq null` doesn't match absent fields
    ([#399](https://github.com/get-convex/better-auth/issues/399), open). One reporter saw a
    claude.ai connector fall back to full re-authorization "roughly daily". The `eq` code is
    unchanged on `main` today
    ([`adapter-utils.ts`](https://github.com/get-convex/better-auth/blob/main/src/client/adapter-utils.ts));
    PR #430 says it fixes this.
  - The Convex maintainers have an open issue to migrate off `oidc-provider`
    ([#344](https://github.com/get-convex/better-auth/issues/344)).
- **Where the MCP endpoint would run on this path** (inference, all **Unverified**):
  - **In a Convex HTTP action:** this needs `@modelcontextprotocol/server` to run in the Convex
    runtime. I found no source that confirms it does.
  - **In a TanStack Start server route on Workers:** the Worker then has to call Convex *as the
    user*. Better Auth's OAuth access token has `aud` set to the MCP resource, not `convex`.
    Convex would need a second `customJwt` provider whose `applicationID` is the resource.
    Convex supports `customJwt` with RS256/ES256 and checks `aud` against `applicationID`
    ([custom JWT](https://docs.convex.dev/auth/advanced/custom-jwt)).
- **Protocol versions on this path:** the MCP TS SDK v2 README says it implements the 2026-07-28
  spec ([npm README](https://www.npmjs.com/package/@modelcontextprotocol/server)). Its core
  package also lists the legacy versions `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05` and
  `2024-10-07` (`SUPPORTED_PROTOCOL_VERSIONS` in `@modelcontextprotocol/core` 2.4.0).
  `legacy: "reject"` restricts it to 2026-07-28.

### 2.3 What the 2026-07-28 spec asks of the authorization server

- "MCP clients and authorization servers **SHOULD** support OAuth Client ID Metadata Documents."
- "Dynamic Client Registration is deprecated. New implementations should use Client ID Metadata
  Documents instead."
- Clients try pre-registration, then CIMD, then DCR.
- Source:
  [client-registration.mdx](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/authorization/client-registration.mdx).
- `convex/mcp` meets this with DCR by default plus CIMD for allowlisted hosts (§2.1). That is
  SHOULD-level, not MUST-level, so it isn't a conformance failure.

### 2.4 Side by side

| | `convex/mcp` | Better Auth `@better-auth/mcp` (1.7) | Better Auth `mcp` / `oauth-provider` (1.6) |
|---|---|---|---|
| Installable with `@convex-dev/better-auth` 0.12.6 | Yes (no Better Auth dependency) | **No** (peer `^1.7.14`) | Yes, but `oauth-provider` breaks `convex()` (#395) |
| MCP protocol | Built in: 2026-07-28 + 3 legacy versions | MCP TS SDK v2: 2026-07-28 (+ legacy unless rejected) | Not included; bring your own |
| Token type | Opaque, hashed, in the MCP component | JWT (JWKS-verified) | OIDC-provider tokens |
| Client registration | DCR, device flow, CIMD for allowlisted hosts | CIMD (needs a secure transport off Node), DCR opt-in | DCR |
| Identity link | `getUserId(ctx)` reads Better Auth identity via `ctx.auth` | Same Better Auth user table | Same Better Auth user table |
| Known breakage on Convex | None filed | Blocked on PR #430 | #395, #399 |
| Maturity | Alpha (0.1.0-alpha.7) | Stable line, but needs the 1.7 component | "Soon deprecated" (1.6 docs) |

---

## 3. TanStack Start on Workers talking to Convex

### 3.1 How the pieces connect

- **Workers hosting:** official via `@cloudflare/vite-plugin`:
  `cloudflare({ viteEnvironment: { name: 'ssr' } })`, `wrangler.jsonc` with
  `compatibility_flags: ["nodejs_compat"]` and `main: "@tanstack/react-start/server-entry"`
  ([TanStack hosting guide](https://github.com/TanStack/router/blob/main/docs/start/framework/react/guide/hosting.md)).
  "TanStack Start is stable"
  ([overview](https://github.com/TanStack/router/blob/main/docs/start/framework/react/overview.md)).
  Convex's TanStack Start page still says "in Release Candidate"
  ([Convex docs](https://docs.convex.dev/client/tanstack/tanstack-start)), so the Convex docs lag.
- **Convex + Start data flow** ([Convex docs](https://docs.convex.dev/client/tanstack/tanstack-start)):
  - Use React Query with `@convex-dev/react-query`. `useSuspenseQuery` server-renders, then "the
    Convex client in the browser resumes live subscriptions from where SSR left off".
  - SSR queries share one logical timestamp.
- **Three origins are involved** (inference from the guides):
  - **The app (Worker):** pages, `/api/auth/*` proxy, SSR.
  - **`*.convex.cloud`:** the browser's live client, and SSR's `ConvexHttpClient`
    (`VITE_CONVEX_URL`).
  - **`*.convex.site`:** HTTP actions, which serve Better Auth and `/mcp`.
  - The Worker isn't in the realtime path.
- **Convex's own auth docs** link TanStack Start setup guides for Clerk and WorkOS AuthKit. They
  don't mention Better Auth ([Convex docs](https://docs.convex.dev/client/tanstack/tanstack-start)).
  Convex + Better Auth is documented only on the component's own site.

### 3.2 Known issues

| Issue | Status | What happens | Workaround |
|---|---|---|---|
| [#220](https://github.com/get-convex/better-auth/issues/220) / [#409](https://github.com/get-convex/better-auth/issues/409) | Open (since 2026-01-02 / 2026-07-09) | `@convex-dev/better-auth/react-start` does `await import("@tanstack/react-start/server")`. Rollup bundles it into the client, pulling in `node:stream`. Under `@cloudflare/vite-plugin` the build fails: `"Readable" is not exported by "__vite-browser-external"`. The import is still there on `main` ([`src/react-start/index.ts`](https://github.com/get-convex/better-auth/blob/main/src/react-start/index.ts)). | Widen Start's `importProtection.include` to the package with build `mock` (works from `@tanstack/react-start` 1.168.31, per #409), or externalize `node:*`. Import protection skips `node_modules` by default ([import-protection](https://github.com/TanStack/router/blob/main/docs/start/framework/react/guide/import-protection.md)). |
| [#198](https://github.com/get-convex/better-auth/issues/198) | Open, documented fix | `No StartEvent found in AsyncLocalStorage` | `ssr.noExternal: ['@convex-dev/better-auth']` (now in the guide) |
| [#414](https://github.com/get-convex/better-auth/issues/414) | Open, PR [#415](https://github.com/get-convex/better-auth/pull/415) | The auth proxy streams the upstream `Response`. Under inbound `Connection: close`, about every other request returns an empty 400. Reported on Node/Nitro with undici. | Buffer the response body. **Unverified** whether it affects Workers. |
| [#434](https://github.com/get-convex/better-auth/issues/434) | Open | With `session.cookieCache` enabled, the token endpoint mints valid JWTs for deleted sessions | Don't enable `cookieCache` (inference) |
| [#62](https://github.com/get-convex/better-auth/issues/62), [#73](https://github.com/get-convex/better-auth/issues/73) | Open (2025) | Secure-cookie behaviour in local dev; session cookie caching | Not investigated |
| TanStack [#7481](https://github.com/TanStack/router/issues/7481), [#6330](https://github.com/TanStack/router/issues/6330), [#7527](https://github.com/TanStack/router/issues/7527) | Open | Static prerendering / ISR with the Cloudflare plugin | Only matters if Flypack prerenders |

- **Unverified:** the component's TanStack example runs on Vite/Nitro, not Workers
  ([example `vite.config.ts`](https://github.com/get-convex/better-auth/blob/main/examples/tanstack/vite.config.ts)),
  and I found no CI against Workers. The proxy uses `fetch(..., { duplex: "half", redirect:
  "manual" })` and `getToken` uses `React.cache` and `getRequestHeaders()` (AsyncLocalStorage).
  `nodejs_compat` should cover these, but none of it is tested on Workers in the repo.

### 3.3 Preview deployments

- **Workers side** ([Previews](https://developers.cloudflare.com/workers/previews/),
  [Version URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)):
  - Each Preview has a stable Preview URL, `<preview-name>-<worker>.<subdomain>.workers.dev`, or
    `<preview-name>.<custom domain>`. Each deploy also gets a Deployment URL.
  - Custom-domain previews let "authentication providers, cookies… and OAuth redirects work as
    they will in production"
    ([changelog](https://developers.cloudflare.com/changelog/)).
  - Version URLs are opt-in (`preview_urls`). Cloudflare Access can gate previews.
- **Convex side:**
  - Preview deployments are **beta**. They are cleaned up after 5 days (14 on Professional and
    above). `npx convex deploy` with a preview deploy key creates one, and `--preview-run` can
    seed data ([multiple deployments](https://docs.convex.dev/production/multiple-deployments)).
  - The preview name is inferred on "Vercel, Netlify, Cloudflare Pages and GitHub CI"
    ([deploy CLI](https://docs.convex.dev/cli/reference/deploy)). Workers Builds isn't named, so
    pass `--preview-name` (inference).
  - Project default env vars apply only when a deployment is created
    ([env vars](https://docs.convex.dev/production/environment-variables)).
- **What Better Auth needs per preview** (facts plus inference):
  - Each Convex preview deployment needs `BETTER_AUTH_SECRET`, and a `SITE_URL` matching that
    preview's frontend
    ([guide](https://github.com/get-convex/better-auth/blob/main/docs/content/docs/framework-guides/tanstack-start.mdx)).
    Defaults can cover the secret but not a per-branch URL. Setting it is a CI step
    (`npx convex env set`).
  - Since 0.12.6, the component restores the proxied `x-better-auth-forwarded-host` only when
    that host appears **exactly** in `trustedOrigins`. Entries containing `*` are skipped
    ([`create-client.ts`](https://github.com/get-convex/better-auth/blob/main/src/client/create-client.ts)).
    A function-form `trustedOrigins(request)` is honoured. So `*.workers.dev`-style wildcards
    won't work for that check, even though Better Auth's own `baseURL.allowedHosts` accepts
    wildcards ([dynamic base URL](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/dynamic-base-url.mdx)).
  - **`expectAuth` vs access-gated previews:** on Vercel, deployment protection intercepted
    `/api/auth/get-session` and left the client hanging
    ([#301](https://github.com/get-convex/better-auth/issues/301)). Cloudflare Access in front of
    a preview could do the same (inference).
  - For `convex/mcp`, each preview has its own `convex.site` MCP URL and needs its own
    `consentUrl` pointing at the matching preview frontend (inference from the README options).

---

## 4. Licenses against ADR 0001

ADR 0001 accepts MIT, Apache-2.0 and BSD. The FSF lists Apache-2.0 as "compatible with version 3
of the GNU GPL" and Expat (MIT) as a lax permissive license
([FSF license list](https://www.gnu.org/licenses/license-list.html#apache2)). AGPL-3.0 shares
GPLv3's compatibility terms (inference, consistent with ADR 0001).

| Package | License | Source |
|---|---|---|
| `convex` (client) | Apache-2.0 | [convex-js LICENSE](https://github.com/get-convex/convex-js/blob/main/LICENSE) |
| `@convex-dev/better-auth` | Apache-2.0 | [LICENSE](https://github.com/get-convex/better-auth/blob/main/LICENSE) |
| `@convex-dev/mcp` | Apache-2.0 | [LICENSE](https://github.com/convex/mcp/blob/main/LICENSE) |
| `@convex-dev/rate-limiter` (dependency of `convex/mcp`) | Apache-2.0 | [LICENSE](https://github.com/get-convex/rate-limiter/blob/main/LICENSE) |
| `@convex-dev/react-query`, `convex-helpers` | Apache-2.0 | [react-query](https://github.com/get-convex/convex-react-query/blob/main/LICENSE), [helpers](https://github.com/get-convex/convex-helpers/blob/main/LICENSE) |
| `better-auth`, `@better-auth/*` (`oauth-provider`, `mcp`, `cimd`, `core`), `better-call`, `@better-fetch/fetch` | MIT | [LICENSE.md](https://github.com/better-auth/better-auth/blob/main/LICENSE.md); npm `license` fields |
| `@tanstack/react-start`, `react-router`, `react-query`, `react-router-ssr-query` | MIT | [router LICENSE](https://github.com/TanStack/router/blob/main/LICENSE), [query LICENSE](https://github.com/TanStack/query/blob/main/LICENSE) |
| `@cloudflare/vite-plugin` (MIT), `wrangler` (MIT OR Apache-2.0) | MIT / Apache-2.0 | [workers-sdk](https://github.com/cloudflare/workers-sdk) (`LICENSE-APACHE`, `LICENSE-MIT`) |
| `@modelcontextprotocol/server` (only on the Better Auth MCP path) | Apache-2.0, with older contributions still MIT | [LICENSE](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/LICENSE) |
| Convex backend (only when self-hosting) | FSL-1.1-Apache-2.0 | [LICENSE.md](https://github.com/get-convex/convex-backend/blob/main/LICENSE.md) |

- **No blockers.** Apache-2.0 §4 still asks you to keep notices when redistributing. None of the
  three Convex repos above has a `NOTICE` file at its root.
- **ADR wording to note:** ADR 0001 says "Everything a hosted Flypack runs lives in this
  repository". On Convex Cloud the backend itself is a hosted service, not code in the repo. The
  components ship as npm packages that get deployed into it. AGPL §13 covers Flypack's own
  source, which this setup doesn't change. Someone self-hosting Flypack would need either a
  Convex Cloud account or the FSL backend, whose terms bar only competing hosted-Convex offerings
  (see §4.1 of the 2026-10-29 research).

---

## What this means for Flypack

Facts and options only, not decisions.

### Facts

1. **The settled stack works today only on Better Auth 1.6**, and 1.6 has two open advisories with
   no announced 1.6 fix (§1.2). Until `@convex-dev/better-auth` ships 1.7 support (PR #430 or a
   sibling), Flypack either stays on a vulnerable, unsupported line or doesn't use this component.
   The advisories' preconditions (Magic Link plus social sign-in; OAuth Proxy) can be avoided by
   plugin choice, but whether those are the only affected paths is **Unverified**.
2. **Multi-organization works through the Better Auth org plugin with Local Install**, with known
   bugs that have workarounds (#407 `generateId: false`) and type gaps (#222).
3. **`convex/mcp` is the only MCP path that works with the published component right now.** It's
   alpha. It keeps its own OAuth server and gets the user from Better Auth through `ctx.auth`. A
   Better Auth + `convex/mcp` integration isn't demonstrated anywhere (**Unverified**), though the
   API is provider-agnostic.
4. **The Workers build needs a workaround** for #220/#409, and nothing in the component's repo is
   tested on Workers.
5. **Previews need CI plumbing:** a per-preview Convex env (`SITE_URL`, secrets), exact
   `trustedOrigins` entries (or a function), and per-preview `consentUrl` for MCP. Convex previews
   are beta.
6. **Licenses:** all clear.

### Options

**A. Settled stack + `convex/mcp`, pinned to Better Auth 1.6, until the 1.7 component lands.**
- Avoid Magic Link + social together and avoid OAuth Proxy, apply the `generateId` workaround, and
  watch PR #430.
- MCP auth is `convex/mcp`'s own server: DCR and device flow work today; CIMD only for allowlisted
  hosts.
- Risk: a security pin on an unsupported line, plus a 1.6 → 1.7 migration later (breaking
  account-identity and schema changes, §1.2).

**B. Same as A, but run the 1.7 component from PR #430's branch (or a fork) now.**
- You get patched Better Auth and the `eq null` fix.
- You carry an unreleased adapter. It's Apache-2.0, so vendoring it is license-clean.

**C. Use Better Auth's own `@better-auth/mcp` once the 1.7 component ships.**
- The token model is unified (JWT access tokens, CIMD/DPoP support), and Better Auth owns the
  consent flow.
- Still open: where the MCP handler runs (Convex runtime vs Worker), how Convex accepts the
  resource-audience token (a second `customJwt` provider), and CIMD's secure-transport requirement
  off Node. All three are **Unverified** (§2.2).
- Collision bugs #395 and #407 need retesting on 1.7.

**D. Keep Better Auth outside Convex.**
- Better Auth would run in the Worker with its own database, and Convex would trust it through
  `customJwt`.
- This drops the `@convex-dev/better-auth` pin entirely, but it changes a settled decision
  ("Better Auth running inside Convex") and needs a separate database. Not researched here.

**E. Another Convex auth provider** (Convex Auth, Clerk, WorkOS AuthKit, which Convex documents
for Start, §3.1) with `convex/mcp`.
- Also changes a settled decision.
- Clerk and WorkOS are hosted services, which matters for AGPL self-hosting (ADR 0001). Not
  researched here.

### Risk to the settled stack

- **"Better Auth inside Convex" is the weak link.** It depends on one community-maintained
  component whose last behavioural release was 2026-06-27 and whose Better Auth 1.7 migration has
  been open since August.
- Convex Cloud, TanStack Start on Workers, and `convex/mcp` each fit, with the caveats above.

### Worth deciding

- The MCP URL and issuer before any agent connects: `convex.site` vs a custom domain, which needs
  Convex Pro. Changing it later forces agents to re-authorize (§2.1).
- Whether org context travels as a tool argument (`orgId` / `projectId`, checked in the mutation)
  or in the token. MCP 2026-07-28's guidance on server-minted handles as ordinary arguments fits
  the former (2026-10-29 research §7.1).
