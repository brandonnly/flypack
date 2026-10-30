# Flypack

The planning kit a live production crew carries from show to show: devices, patches, racks and
cable runs for one show, edited together by people and agents.

## Language

### Ownership

**Organization**:
The crew or company that owns shows and whose members edit them.
_Avoid_: Team, workspace, account

**Show**:
One production's complete plan at one venue, and the unit people and agents open and edit
together. A tour is a series of shows, each duplicated from the last.
_Avoid_: Project, gig, document

**Duplicate**:
A new, independent show copied from an existing one. Nothing flows between the two afterwards.
_Avoid_: Fork, clone, branch

**Version**:
A saved state of one show that can be viewed and restored.
_Avoid_: Snapshot, revision, backup

**Archived show**:
A show kept read-only for reference, such as an earlier stop on a tour.

### Fixtures

**Reference show**:
The real show the first prototype is measured against. It is private and never enters the
repository.

**Demo show**:
A public stand-in with the reference show's shape and invented names, used by tests and agent
evals.
_Avoid_: Sample show, test show
