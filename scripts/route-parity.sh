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

# Dynamic segment names are normalised ([height] -> [*]) because the URL space is
# what matters, not the param identifier: /account/[validator] and
# /account/[address] match exactly the same requests.
normalise() {
  sed -e 's|^apps/web/src/app||' -e 's|/page\.tsx\?$||' -e 's|\[[^]]*\]|[*]|g' | sort -u
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
