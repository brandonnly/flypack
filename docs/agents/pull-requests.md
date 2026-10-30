# Pull requests and landing

How a change reaches `main`.

## When to open a PR

- **With the developer in the loop**: iterate on a branch and show each change. Open the PR, which
  starts the review bots, once the developer approves the logic and UI.
- **Planned work run unattended** follows [afk-slice-workflow.md](afk-slice-workflow.md).

## Where a change lands

- **Code** goes through a pull request and lands as a squash merge.
- **Docs that later work starts from** go straight to `main`: plans, ADRs, research, the glossary,
  `docs/PRODUCT.md`, and agent instructions that come with no code change. Commit on a fresh
  `origin/main` as `docs(<scope>): ...` and `git push origin HEAD:main`. On a rejected push,
  `git fetch`, rebase the commit onto `origin/main`, and push again.
- **Docs that describe behaviour** (READMEs, runbooks, UI copy, an `AGENTS.md` line about a
  command) land in the PR that changes the behaviour, so `main` describes only code it has.

## Titles and bodies

- Title: `<type>(<scope>): <subject>` with the narrowest accurate scope (`brand`, `tokens`, `docs`,
  `repo`, and app areas once they exist). `docs` is a type, not a scope. The title becomes the
  squash commit subject.
- Body: write it with the `pr` skill. Put `Closes #<n>` before each issue the PR finishes and
  `Part of #<n>` before a parent spec, so landing closes exactly the finished issues.

## Evidence

A UI change shows before and after screenshots, and a video when motion matters. Commit them to an
orphan `<branch>-screenshots` branch and embed them with `?raw=true` blob URLs. Screenshots are
public: crop out secrets, personal data and anything machine-specific.

## Landing

A PR lands when its checks are green, every review bot comment has a fix or a one-line reason,
and the developer has approved it. Squash-merge and delete the branch:
`gh pr merge <n> --squash --delete-branch`.
