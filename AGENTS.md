# Agents guide

<!-- Always loaded. Every line must change what an agent does; push the rest behind a pointer in
"Before you…". When a change makes a line wrong, rewrite or remove it. -->

Flypack is an agent-first planner for live production crews: patching across video, network,
signal and audio layers, racks, and cable runs measured on the venue's floor plan, with an MCP
server. No application code exists yet. [docs/PRODUCT.md](docs/PRODUCT.md) holds the brief and
the open decisions.

## Public repository

Every commit, PR, issue, comment, log and screenshot here is public and permanent: treat each
one as published.

- Secrets live only in runtime environment variables, read through one config module that names
  a missing variable without printing its value. `.env.example`, with names and placeholder
  values, is the only env file in git.
- Client-visible variables (`VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`) carry public identifiers only.
- Redact values from everything you post or commit: logs, errors, snapshots, PR text,
  screenshots. When a secret is needed, ask the developer to set it in the environment.
- Scan each diff for secrets before committing. A leaked secret is burned: rotate it first,
  then remove it.
- Keep docs machine-agnostic: refer to env variables and scripts in place of hostnames, ports,
  home paths and internal URLs.

## Before you…

- **add a dependency or reuse outside code**: check its license against
  [ADR 0001](docs/adr/0001-agpl-license.md). Flypack is AGPL-3.0.
- **build UI**: read [brand/tokens/README.md](brand/tokens/README.md). `brand/tokens/flypack.css`
  is the only source of colors, fonts and type sizes.
- **touch a brand asset or the tagline**: read [brand/README.md](brand/README.md).
- **decide** anything about the product or architecture: read [docs/PRODUCT.md](docs/PRODUCT.md)
  and `docs/adr/`, then record the decision as the next numbered ADR.
- **open, push to or land a PR, or push docs to `main`**: read
  [docs/agents/pull-requests.md](docs/agents/pull-requests.md).
- **deliver `ready-for-agent` work unattended, or review a diff with subagents**: follow
  [docs/agents/afk-slice-workflow.md](docs/agents/afk-slice-workflow.md).

## Agent skills

### Issue tracker

GitHub Issues in `brandonnly/flypack`, through `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
`wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` at the root and `docs/adr/`. See `docs/agents/domain.md`.
