# AFK workflow

How agents deliver `ready-for-agent` work unattended, from one ticket to a whole spec, and how they
review a diff. The `/implement-spec` skill supplies the orchestration (the frontier of unblocked
tickets, implementers in the background, a merger subagent); where the skill and this doc differ,
this doc wins. Work with the developer in the loop follows
[pull-requests.md](pull-requests.md).

## 1. Orient

- Read each ticket and its parent spec (`gh issue view <n> --comments`), then the ADRs and
  `docs/PRODUCT.md` sections they name, from `origin/main` (`git show origin/main:<path>`), since
  they may have landed after your branch was cut.
- Read `GLOSSARY.md` once it exists, and the docs `AGENTS.md` points to for the paths you will
  touch.

Orienting is done when you can name every requirement in the ticket and the issue, ADR or doc
that decides each one.

## 2. Build

- **One ticket:** build it on a branch named `<issue-number>-<short-slug>`, cut from a fresh
  `origin/main`.
- **A spec:** each ticket becomes one PR. When tickets depend on each other, stack the PRs with the
  `gh-stack` skill, and start a ticket only once all its blockers are in the stack.
- Run each implementer as a background subagent in its own worktree. Its brief is context
  pointers: the ticket number, the spec number, the branch to start from, and this section. It
  builds test-first with the `tdd` skill, commits locally, and reports its branch, its commits,
  and anything the next ticket needs. The orchestrator does all pushing.
- Deliver each ticket as written. When a dependency it names has not merged, build against that
  dependency's documented contract and say so in the PR body.
- Take before and after screenshots of UI changes ("Evidence" in
  [pull-requests.md](pull-requests.md)).

The build is done when every requirement in every ticket is implemented, the tests the tickets list
exist and pass, and the repository's checks pass locally.

## 3. Review rounds

A **round** is one pass: every reviewer reads the diff, the author fixes or declines each finding,
and the fixes are validated together. Run rounds on local branches before anything is pushed.

Launch one reviewer per lens as a separate agent with read-only access: in T3, a `delegate_task`
to Codex `gpt-6-astra` at `reasoningEffort: xhigh`. Each round is a new reviewer carrying the
original brief, the earlier findings and the responses to them. Each reviewer returns findings
with file, line, severity and a concrete failure scenario, and ends with one line:
`SAFE TO MERGE` or `HOLD: <reason>`.

1. **Security and exposure**: authorization on every query, mutation and MCP tool; identity taken
   from the session, never from arguments; project and organization scoping; agent writes limited
   to what the caller may change; input validation; and the "Public repository" rules in
   `AGENTS.md` across code, fixtures, logs, client bundles and PR text.
2. **Licensing**: every new dependency and every copied line checked against
   [ADR 0001](../adr/0001-agpl-license.md).
3. **Performance and sync**: realtime fan-out, unbounded reads, query and index shape, and
   behaviour on a large show (hundreds of devices, thousands of connections), canvas rendering and
   layout shift.
4. **Maintainability**: duplicated logic, module boundaries, naming against the glossary, dead
   code, and tests that cover the rules the ticket lists.
5. **Regressions**: every path the diff touches behaves as on `main` unless the spec changes it.
   Compare old and new code side by side, and probe paths no test covers.
6. **Spec and docs adherence**: the diff against the ticket, the spec, `docs/PRODUCT.md`, the
   ADRs, the glossary, and `brand/tokens/README.md` for UI. Flag every deviation.

Fix every confirmed finding, or decline it with a one-line reason kept for the PR body. Repeat
rounds until every lens returns `SAFE TO MERGE`.

## 4. Push

Open one PR per ticket with `gh pr create`, titled and evidenced as
[pull-requests.md](pull-requests.md) says. The body carries `Closes #<ticket>`, `Part of #<spec>`,
what the PR delivers, any unmerged contract it targets, declined findings with reasons, and the
validation run with its results.

## 5. Bot rounds

CodeRabbit, cubic and Codex review each push on GitHub. Once checks are green, fix every Codex P1
finding, and any other finding whose fix is a few lines in code the PR already changes. File the
rest as GitHub issues labelled `needs-triage`. Answer every bot comment with a fix or a one-line
reason. Keep a round's fixes as local commits and push them together, since every push starts
another bot review.

## 6. Land and report

Land as [pull-requests.md](pull-requests.md) says when the developer asked for landing; otherwise
the PRs stay open for them. End with a report: PR links, verdicts, what was fixed, what was
declined and why, what is held and why, and what the next wave needs to know.

The run is done when every ticket has landed, is open for the developer, or is reported as held
with its reason.
