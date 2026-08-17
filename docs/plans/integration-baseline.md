# Integration baseline: develop + EVM merge

Date: 2026-08-17

## Source SHAs

- `origin/develop`: `39aedbc`
- `evm-support`: `ce7cdbb`

Note: the integration plan's spec was measured against `evm-support` at
`e2ea272`. `evm-support` has since advanced to `ce7cdbb` via two docs-only
commits (`63cde81`, `ce7cdbb`) touching only `docs/design/2026-08-17-develop-evm-integration.md`
and `docs/plans/2026-08-17-develop-evm-integration-plan.md`. Neither commit
touches any of the 40 files involved in the merge, so `ce7cdbb` is recorded
here as the source SHA and the conflict-bucket rules measured at `e2ea272`
still apply unchanged.

## Verification commands and verbatim output

```
$ git fetch origin --prune
(no output)

$ git rev-parse --short origin/develop
39aedbc

$ git rev-parse --short evm-support
ce7cdbb

$ git merge-base --is-ancestor 39aedbc origin/main; echo "ancestor-exit=$?"
ancestor-exit=1

$ git rev-list --left-right --count origin/main...origin/develop
1	264

$ git ls-tree -r --name-only origin/develop | grep -cE '\.test\.tsx?$'
0

$ git ls-tree -r --name-only evm-support | grep -cE '\.test\.tsx?$'
21
```

All five verification numbers match the spec's 2026-08-17 snapshot exactly:
ancestor-exit=1, left-right count `1  264`, 0 test files on `develop`, 21 test
files on `evm-support`.

## Branch cut

```
$ git switch -c evm-on-develop origin/develop
Switched to a new branch 'evm-on-develop'
branch 'evm-on-develop' set up to track 'origin/develop'.
```

`evm-on-develop` HEAD is `39aedbc`, identical to `origin/develop` at cut time.
