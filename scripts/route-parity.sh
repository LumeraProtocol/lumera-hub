#!/usr/bin/env bash
set -euo pipefail
#
# route-parity.sh — assert no Next.js app route disappeared relative to a baseline ref.
#
# usage: scripts/route-parity.sh [baseline-ref]   (default: origin/develop)
#
# The deployed hub revision lives on `develop`. A merge or a wrong HUB_VERSION
# re-pin that drops a route would otherwise ship green: every health probe hits
# `/`, which exists on every branch.

baseline="${1:-origin/develop}"

# A bad or mistyped ref must fail loudly, not report green: `set -e` does not
# propagate a failed `git ls-tree` out of a process substitution below, so
# without this guard an invalid baseline silently compares as "zero routes"
# and the gate reports OK. Exit code 3 distinguishes this from a genuine
# parity failure (1), so callers can tell "bad ref" from "routes missing".
if ! git rev-parse --verify --quiet "${baseline}^{tree}" >/dev/null; then
  echo "ROUTE PARITY ERROR — '${baseline}' is not a valid ref in this repository." >&2
  exit 3
fi

# Dynamic segment names are normalised ([height] -> [*]) because the URL space is
# what matters, not the param identifier: /account/[validator] and
# /account/[address] match exactly the same requests. Optional catch-all
# segments ([[...slug]]) collapse to the same [*] first, so they don't leave a
# dangling bracket behind when the plain [x] rule runs next.
normalise() {
  sed -e 's|^apps/web/src/app||' \
      -e 's|/page\.tsx\?$||' \
      -e 's|\[\[\.\.\.[^]]*\]\]|[*]|g' \
      -e 's|\[[^]]*\]|[*]|g' \
    | sort -u
}

routes_from_ref() {
  git ls-tree -r --name-only "$1" -- apps/web/src/app \
    | grep -E '/page\.tsx?$' \
    | normalise
}

routes_from_worktree() {
  find apps/web/src/app \( -name 'page.tsx' -o -name 'page.ts' \) \
    | normalise
}

missing="$(comm -23 <(routes_from_ref "$baseline") <(routes_from_worktree) || true)"

if [[ -n "${missing}" ]]; then
  echo "ROUTE PARITY FAILURE — present in ${baseline}, missing in worktree:" >&2
  echo "${missing}" | sed 's/^/  /' >&2
  echo "" >&2
  echo "$(echo "${missing}" | wc -l) route shape(s) would disappear. Refusing." >&2
  exit 1
fi

echo "route parity OK vs ${baseline} ($(routes_from_worktree | wc -l | tr -d ' ') route shapes present)"
