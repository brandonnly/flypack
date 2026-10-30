# ADR 0001: License Flypack under AGPL-3.0

## Status

Accepted, October 29, 2026.

## Context

Flypack is meant to stay fully open source, and may later be offered as a hosted service.
Under a permissive license, anyone could host a closed fork of it. EasySchematic, the closest
open-source prior art, is also AGPL-3.0.

## Decision

The repository is licensed AGPL-3.0. Everything a hosted Flypack runs lives in this repository.

## Consequences

- AGPL section 13: anyone who runs a modified Flypack for users over a network must offer those
  users its source. A hosted Flypack links to its source, ideally the exact deployed commit,
  and runs only code that is in this repository.
- Secrets, environment files and infrastructure configuration stay out of the repository; the
  license covers the program, not them.
- Every dependency must be compatible. MIT, Apache-2.0 and BSD are fine. ELK.js (EPL-2.0) is
  compatible through EPL's secondary-license clause; confirm before depending on it. tldraw's
  commercial license is not compatible.
- EasySchematic code can be reused with attribution. LZ Cable Planner (proprietary) and
  unlicensed repositories such as SigPath are behaviour references only.
- Anyone can host Flypack as long as they publish their changes, so the name is protected by a
  trademark and a trademark policy, not by the license.
- Before accepting outside contributions, choose between a DCO sign-off (simple; every line stays
  AGPL) and a CLA (keeps the option of a commercial license later). Not decided yet.
- New source files should carry `SPDX-License-Identifier: AGPL-3.0-or-later`.
