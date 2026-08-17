# develop + EVM Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one branch that carries both the deployed `develop` feature surface and the `evm-support` wallet layer, with wallets reduced to Keplr + MetaMask, suitable for pinning as `HUB_VERSION`.

**Architecture:** Cut `evm-on-develop` from `origin/develop`, untrack the generated Tamagui artifacts, then take `evm-support` in with a single `--no-ff` merge. Conflicts resolve in dependency order (generated → manifests → network → providers → connection → transaction hooks → account data → screens). The merge commit lands as soon as the tree compiles, tests pass and route parity holds; the genuinely additive work (extending the tested account data layer, porting the rich account page onto it, the conditional MetaMask onboarding card) follows as separate reviewable commits on the same branch.

**Tech Stack:** pnpm 9 workspaces, Turbo, Next.js (app router), React, Tamagui, TypeScript 5.8, Vitest, interchain-kit (Cosmos), EIP-1193/EIP-6963 (EVM).

**Spec:** [`docs/design/2026-08-17-develop-evm-integration.md`](../design/2026-08-17-develop-evm-integration.md)

## Global Constraints

- Node `>=24 <27`; pnpm `9.15.9` (`packageManager` field). Do not upgrade either.
- Supported wallets after this work: **Keplr and MetaMask only**. Leap, Cosmostation and the WalletConnect/Reown transport are removed.
- `apps/web/.tamagui/` is generated and gitignored (`apps/web/.gitignore:44`). Never hand-merge it; never re-add it to the index.
- On `evm-on-develop`, git calls the **develop side `ours`** and the **EVM side `theirs`**. Never use a blanket `--ours`/`--theirs`.
- Every `develop` route shape must survive. Dynamic segment names may change (`[validator]` → `[address]`); route shapes may not disappear.
- The MetaMask onboarding card renders **only when `IS_EVM_NETWORK` is true** — the mainnet profile has no EVM endpoint or chain ID and must not advertise an unsupported wallet.
- Do **not** delete the generic `useWalletConnect` hook, the `/loyalty/wallet/connect` route, or the admin "wallet connect" tracking APIs/screens. Only `apps/web/src/utils/wallet-connect.ts` and its test are protocol-specific.
- Cosmostation shuts down **2026-09-01**. If the branch is not green and deployable by ~2026-08-27, stop and ship the wallet removal as a standalone PR against `develop` instead.
- Never deploy or pin an intermediate state. The branch is pinnable only after Task 14 passes.

---

### Task 1: Cut the integration branch and record the exact SHAs

**Files:**

- Create: `docs/plans/integration-baseline.md` (working record, committed)

**Interfaces:**

- Produces: the branch `evm-on-develop`; the recorded baseline SHAs every later task's conflict expectations depend on.

- [ ] **Step 1: Re-fetch and re-measure**

The spec's counts are a 2026-08-17 snapshot. Confirm they still hold.

```bash
git fetch origin --prune
git rev-parse --short origin/develop evm-support
git merge-base --is-ancestor 39aedbc origin/main; echo "ancestor-exit=$?"   # expect 1
git rev-list --left-right --count origin/main...origin/develop              # expect 1  264
git ls-tree -r --name-only origin/develop | grep -cE '\.test\.tsx?$'        # expect 0
git ls-tree -r --name-only evm-support   | grep -cE '\.test\.tsx?$'         # expect 21
```

If `origin/develop` is no longer `39aedbc` or `evm-support` is no longer `e2ea272`, **stop** and re-run the spec's conflict rehearsal before continuing — the bucket rules below were measured at those SHAs.

- [ ] **Step 2: Cut the branch**

```bash
git switch -c evm-on-develop origin/develop
git status --short          # expect clean
bash -c '[ -z "$(git status --porcelain)" ] && echo CLEAN'
```

- [ ] **Step 3: Record the baseline**

Write `docs/plans/integration-baseline.md` containing the two SHAs from Step 1, the date, and the ancestor/count outputs verbatim. This is the artifact a reviewer uses to confirm the merge was performed against the measured inventory.

- [ ] **Step 4: Commit**

```bash
git add docs/plans/integration-baseline.md
git commit -m "record integration baseline SHAs for the develop+EVM merge"
```

---

### Task 2: Untrack the generated Tamagui artifacts

**Files:**

- Delete from index (keep on disk): `apps/web/.tamagui/lumerahubui-components.config.cjs`, `apps/web/.tamagui/tamagui-components.config.cjs`, `apps/web/.tamagui/tamagui.config.cjs`, `apps/web/.tamagui/tamagui.config.json`

**Interfaces:**

- Produces: an index with no `.tamagui` entries, so the merge in Task 4 yields modify/delete conflicts on three of them instead of hand-mergeable text.

- [ ] **Step 1: Confirm the scale you are removing**

```bash
for f in $(git ls-tree -r --name-only HEAD -- apps/web/.tamagui); do
  printf "%12s bytes  %s\n" "$(git cat-file -s "$(git rev-parse "HEAD:$f")")" "$f"
done
```

Expected: four files, the largest `lumerahubui-components.config.cjs` at 52,206,366 bytes.

- [ ] **Step 2: Untrack, keeping the working copies**

```bash
git rm -r --cached apps/web/.tamagui/
git status --short apps/web/.tamagui/     # expect D entries staged, files still on disk
ls apps/web/.tamagui/                     # expect the four files still present
```

- [ ] **Step 3: Verify the ignore rule now covers them**

```bash
git check-ignore -v apps/web/.tamagui/tamagui.config.json
```

Expected: a match against `apps/web/.gitignore:44`. If nothing matches, stop — the files would be re-added by the next `git add -A`.

- [ ] **Step 4: Commit**

```bash
git commit -m "untrack generated tamagui artifacts"
```

- [ ] **Step 5: Confirm the tree still builds from generated-on-disk artifacts**

```bash
pnpm install --frozen-lockfile
pnpm --filter web exec tsc --noEmit
```

Expected: PASS. This proves untracking did not break the build before a merge is layered on top.

---

### Task 3: Add the route-parity gate

This gate exists because every deploy health probe hits `/`, which exists on every branch — so a merge that drops routes ships green. It is written and proven **before** the merge so it can police the merge.

**Files:**

- Create: `scripts/route-parity.sh`
- Test: proven by execution against two refs (below), not by a unit test

**Interfaces:**

- Produces: `scripts/route-parity.sh [baseline-ref]`, exit 0 when no route shape is missing, exit 1 listing missing shapes. Consumed by Task 14 and by lumera-deploy's pre-pin checks.

- [ ] **Step 1: Write the script**

```bash
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
```

- [ ] **Step 2: Prove it PASSES on the current branch**

```bash
chmod +x scripts/route-parity.sh
./scripts/route-parity.sh origin/develop
```

Expected: `route parity OK vs origin/develop (49 route shapes present)`. We are on develop, so parity is trivially satisfied — this proves no false negatives.

- [ ] **Step 3: Prove it FAILS when routes are genuinely missing**

A gate that cannot fail is not a gate. Point it at a tree that is missing develop's routes.

```bash
T=$(mktemp -d)
git worktree add -q --detach "$T" evm-support
( cd "$T" && cp "$OLDPWD/scripts/route-parity.sh" . && bash route-parity.sh origin/develop ) ; echo "exit=$?"
git worktree remove --force "$T"
```

Expected: exit 1, listing 37 missing route shapes including `/admin`, `/supernodes`, `/wasm`, `/referral`, `/blocks` and the `/loyalty/*` family. If it exits 0, the gate is broken — fix it before proceeding.

- [ ] **Step 4: Commit**

```bash
git add scripts/route-parity.sh
git commit -m "add route-parity gate to prevent silent route loss on merge"
```

---

### Task 4: Start the merge and resolve the generated + manifest layer

The merge stays uncommitted from here until Task 13. Git remembers each `git add`, so progress accumulates; there is no partial merge commit.

**Files:**

- Modify: `apps/web/package.json`, `packages/ui/package.json`, `apps/web/.env.example`, `.gitignore`, `README.md`, `apps/web/babel.config.js`, `apps/web/next.config.js`
- Delete: the three conflicting `.tamagui` paths
- Regenerate: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: the branch and untracked-artifact state from Tasks 1-2.
- Produces: a resolved dependency/config layer; `apps/web/package.json` no longer lists `@interchain-kit/leap-extension` or `@interchain-kit/cosmostation-extension`.

- [ ] **Step 1: Begin the merge**

```bash
git merge --no-ff evm-support
```

Expected: conflict report. Record the inventory:

```bash
git diff --name-only --diff-filter=U | tee /tmp/conflicts.txt | wc -l
```

Expected: ~31 unresolved paths. If the count differs materially from 31, the SHAs moved — return to Task 1 Step 1.

- [ ] **Step 2: Resolve the generated artifacts by deletion**

```bash
git rm -f apps/web/.tamagui/tamagui-components.config.cjs \
          apps/web/.tamagui/tamagui.config.cjs \
          apps/web/.tamagui/tamagui.config.json
git diff --name-only --diff-filter=U | grep -c tamagui || echo "0 tamagui conflicts remain"
```

Never open these in an editor. They regenerate on build.

- [ ] **Step 3: Resolve `apps/web/package.json`**

Union the dependency sets — keep every develop-only dependency (admin, loyalty, Snag, analytics) **and** every EVM dependency — then remove the two retired adapters:

```bash
git show :2:apps/web/package.json > /tmp/pkg-develop.json   # ours = develop
git show :3:apps/web/package.json > /tmp/pkg-evm.json       # theirs = evm-support
diff /tmp/pkg-develop.json /tmp/pkg-evm.json
```

Hand-edit `apps/web/package.json` to the union, then delete the `@interchain-kit/leap-extension` and `@interchain-kit/cosmostation-extension` lines. Keep `@interchain-kit/core` (WalletConnect's `WCWallet` came from it, but so does `WalletState`, which stays).

```bash
grep -E "leap-extension|cosmostation-extension" apps/web/package.json && echo "STILL PRESENT — remove" || echo "adapters removed"
node -e "JSON.parse(require('fs').readFileSync('apps/web/package.json','utf8'));console.log('valid json')"
git add apps/web/package.json
```

- [ ] **Step 4: Resolve `packages/ui/package.json`, `.gitignore`, `README.md`, `babel.config.js`, `next.config.js`**

Union semantics for each: preserve develop's settings, add the EVM settings.

```bash
for f in packages/ui/package.json .gitignore README.md apps/web/babel.config.js apps/web/next.config.js; do
  git diff --diff-filter=U --name-only | grep -qx "$f" && echo "RESOLVE: $f"
done
```

Resolve each by hand, then:

```bash
git add packages/ui/package.json .gitignore README.md apps/web/babel.config.js apps/web/next.config.js
grep -rn "<<<<<<<\|>>>>>>>" packages/ui/package.json .gitignore README.md apps/web/babel.config.js apps/web/next.config.js && echo "MARKERS LEFT" || echo "no markers"
```

- [ ] **Step 5: Resolve `apps/web/.env.example`**

Preserve **all** develop-only admin/loyalty/Snag/analytics variables, add the network-profile and EVM variables, and remove the six `NEXT_PUBLIC_WALLET_CONNECT_*` variables.

```bash
grep -c "NEXT_PUBLIC_WALLET_CONNECT" apps/web/.env.example   # expect 0
grep -c "NEXT_PUBLIC_EVM" apps/web/.env.example              # expect >0
grep -c "NEXT_PUBLIC_NETWORK_PROFILE" apps/web/.env.example  # expect 1
git add apps/web/.env.example
```

- [ ] **Step 6: Regenerate the lockfile instead of merging it**

```bash
git checkout --ours pnpm-lock.yaml     # discard the conflicted text wholesale
pnpm install --no-frozen-lockfile
git add pnpm-lock.yaml
grep -c "leap-extension\|cosmostation-extension" pnpm-lock.yaml || echo "retired adapters absent from lockfile"
```

Expected: the two adapter packages no longer appear.

---

### Task 5: Resolve network configuration and remove the WalletConnect transport

**Files:**

- Modify: `apps/web/src/contants/network.ts`
- Delete: `apps/web/src/utils/wallet-connect.ts`, `apps/web/src/utils/wallet-connect.test.ts`
- Modify: `apps/web/src/types/window.d.ts`

**Interfaces:**

- Consumes: resolved manifests from Task 4.
- Produces: `network.ts` exporting the EVM profile surface (`IS_EVM_NETWORK`, `EVM_CHAIN_ID`, `EVM_RPC_ENDPOINT`, network-profile selection) plus develop's `SDK_PRESET` and `SNSCOPE_URL`, and **no** `WALLET_CONNECT_*` constants. Consumed by Tasks 6-12.

- [ ] **Step 1: Resolve `network.ts` starting from the EVM version**

```bash
git show :3:apps/web/src/contants/network.ts > apps/web/src/contants/network.ts   # theirs = EVM
```

Then restore develop's two additions (`SDK_PRESET`, `SNSCOPE_URL`) by reading them out of the develop side:

```bash
git show :2:apps/web/src/contants/network.ts | grep -nE "SDK_PRESET|SNSCOPE_URL"
```

Add those exports to the file, then delete the six WalletConnect constants.

- [ ] **Step 2: Verify network.ts**

```bash
grep -c "WALLET_CONNECT" apps/web/src/contants/network.ts   # expect 0
grep -c "SDK_PRESET\|SNSCOPE_URL" apps/web/src/contants/network.ts  # expect 2
grep -c "IS_EVM_NETWORK" apps/web/src/contants/network.ts   # expect >=1
git add apps/web/src/contants/network.ts
```

- [ ] **Step 3: Delete the protocol singleton and its test**

`apps/web/src/utils/wallet-connect.ts` extends `WCWallet` from `@interchain-kit/core` — it is the WalletConnect transport, not the generic connection hook.

```bash
git rm -f apps/web/src/utils/wallet-connect.ts apps/web/src/utils/wallet-connect.test.ts
```

- [ ] **Step 4: Confirm you deleted the right thing**

```bash
test -f apps/web/src/hooks/useWalletConnect.ts && echo "generic hook PRESERVED (correct)"
test -f apps/web/src/app/loyalty/wallet/connect/page.tsx && echo "loyalty route PRESERVED (correct)"
test ! -f apps/web/src/utils/wallet-connect.ts && echo "transport singleton removed (correct)"
```

All three must print. If the generic hook or loyalty route is gone, restore it — those are product behavior, not the transport.

- [ ] **Step 5: Drop the Leap window typing**

Remove `interface Leap` and the `leap?: Leap;` member from `apps/web/src/types/window.d.ts`, keeping `keplr` and `ethereum`.

```bash
grep -ci "leap" apps/web/src/types/window.d.ts    # expect 0
grep -c "ethereum?" apps/web/src/types/window.d.ts # expect 1
git add apps/web/src/types/window.d.ts
```

---

### Task 6: Resolve the provider composition

**Files:**

- Modify: `apps/web/src/app/providers/wallet-provider.tsx`
- Modify: `apps/web/src/utils/wallet-selection.test.ts`

**Interfaces:**

- Consumes: `network.ts` from Task 5.
- Produces: a provider tree whose interchain-kit `wallets` prop is exactly `[keplrWallet]`, with the EVM provider composed alongside. Consumed by Tasks 7-12.

- [ ] **Step 1: Resolve starting from the EVM composition**

```bash
git show :3:apps/web/src/app/providers/wallet-provider.tsx > apps/web/src/app/providers/wallet-provider.tsx
git show :2:apps/web/src/app/providers/wallet-provider.tsx | diff - apps/web/src/app/providers/wallet-provider.tsx | head -40
```

Re-apply develop's rendering additions from that diff (its delta is 5 added / 1 removed lines), then reduce the adapter array.

- [ ] **Step 2: Reduce to a single Cosmos adapter**

Remove the `leapWallet` and `cosmostationWallet` imports, the `WALLET_CONNECT_*` imports, and the constructed `walletConnect` adapter. The array becomes:

```tsx
const walletAdapters: any = React.useMemo(() => [keplrWallet], []);
```

- [ ] **Step 3: Verify the provider**

```bash
grep -ciE "leapWallet|cosmostationWallet|WALLET_CONNECT|walletConnect" apps/web/src/app/providers/wallet-provider.tsx
```

Expected: `0`.

```bash
grep -c "keplrWallet" apps/web/src/app/providers/wallet-provider.tsx   # expect >=2 (import + array)
git add apps/web/src/app/providers/wallet-provider.tsx
```

- [ ] **Step 4: Rename the dead-wallet test fixture**

`wallet-selection.test.ts` uses `'leap-extension'` as a stand-in for "some other wallet", proving that disconnecting Keplr leaves other entries intact. The assertion keeps its value; only the name is stale.

```bash
sed -i "s/'leap-extension'/'other-extension'/g" apps/web/src/utils/wallet-selection.test.ts
grep -c "leap-extension" apps/web/src/utils/wallet-selection.test.ts   # expect 0
grep -c "other-extension" apps/web/src/utils/wallet-selection.test.ts  # expect 2
git add apps/web/src/utils/wallet-selection.test.ts
```

- [ ] **Step 5: Run the wallet-selection tests**

```bash
pnpm --filter web test -- wallet-selection
```

Expected: PASS. These are pure-function tests with no dependency on the still-conflicted files.

---

### Task 7: Resolve wallet connection UI

**Files:**

- Modify: `apps/web/src/components/ConnectWallet.tsx`
- Keep: `apps/web/src/components/ConnectWallet.module.css` (EVM side, no conflict)

**Interfaces:**

- Consumes: the provider from Task 6, `wallet-selection.ts` helpers (`getActiveWalletMode`, `getPreferredWalletSelection`, `getAlternativeWalletName`).
- Produces: a connect surface offering Keplr and MetaMask, with no Leap/Cosmostation/WalletConnect entries.

- [ ] **Step 1: Resolve starting from the EVM version**

The EVM side is the substantial rewrite (359 added / 46 removed vs develop's 98/24) and owns the wallet-picker UI plus its CSS module.

```bash
git show :3:apps/web/src/components/ConnectWallet.tsx > apps/web/src/components/ConnectWallet.tsx
git show :2:apps/web/src/components/ConnectWallet.tsx | diff - apps/web/src/components/ConnectWallet.tsx | head -60
```

- [ ] **Step 2: Re-apply develop's additions**

From that diff, carry over develop's component usages (its shared `AppButton`/layout primitives) so the picker matches the surrounding develop UI.

- [ ] **Step 3: Verify no retired wallet is offered**

```bash
grep -ciE "leap|cosmostation|walletconnect" apps/web/src/components/ConnectWallet.tsx   # expect 0
grep -c "METAMASK_WALLET_NAME\|KEPLR_WALLET_NAME" apps/web/src/components/ConnectWallet.tsx  # expect >=2
git add apps/web/src/components/ConnectWallet.tsx
```

---

### Task 8: Resolve the transaction hooks and modals

**Files:**

- Modify: `apps/web/src/hooks/useSend.ts`, `apps/web/src/components/SendModal.tsx`, `apps/web/src/hooks/useDeposit.ts`, `apps/web/src/hooks/useDelegate.ts`, `apps/web/src/hooks/useWalletConnect.ts`, `apps/web/src/hooks/useGovernances.ts`, `apps/web/src/hooks/useProposals.ts`, `apps/web/src/hooks/useGovernanceDetails.ts`, `apps/web/src/hooks/useCascade.ts`

**Interfaces:**

- Consumes: `network.ts` (`IS_EVM_NETWORK`), the provider from Task 6.
- Produces: transaction hooks that work on Cosmos profiles and fail closed on EVM profiles where Cosmos signing is unavailable, per `docs/design/2026-07-31-evm-metamask-cosmos-signing.md`.

- [ ] **Step 1: Take the EVM side for the EVM-dominant hooks**

`useWalletConnect.ts` (develop delta is formatting only), `useProposals.ts`, `useGovernances.ts`, `useDelegate.ts`, `useGovernanceDetails.ts`:

```bash
for f in apps/web/src/hooks/useWalletConnect.ts apps/web/src/hooks/useProposals.ts \
         apps/web/src/hooks/useGovernances.ts apps/web/src/hooks/useDelegate.ts \
         apps/web/src/hooks/useGovernanceDetails.ts; do
  git show ":3:$f" > "$f"
done
```

Then re-apply each develop delta (all under 20 lines) by diffing against `:2:`.

- [ ] **Step 2: Take the develop side for the develop-dominant hooks**

`useCascade.ts` (develop 1013/260 vs EVM 17/1) and `useDeposit.ts` (145/137 vs 21/5):

```bash
for f in apps/web/src/hooks/useCascade.ts apps/web/src/hooks/useDeposit.ts; do
  git show ":2:$f" > "$f"
  git show ":3:$f" | diff - "$f" | head -30
done
```

Re-apply the small EVM deltas from those diffs — specifically the `IS_EVM_NETWORK` guards that keep Cosmos signing fail-closed.

- [ ] **Step 3: Reconcile `useSend.ts` genuinely**

Both sides rewrote it (develop 146/138, EVM 68/9). Read both, then write a version that keeps develop's Cosmos send behavior and adds the EVM native-transfer path selected by `IS_EVM_NETWORK`.

```bash
git show :2:apps/web/src/hooks/useSend.ts > /tmp/useSend-develop.ts
git show :3:apps/web/src/hooks/useSend.ts > /tmp/useSend-evm.ts
diff /tmp/useSend-develop.ts /tmp/useSend-evm.ts
```

- [ ] **Step 4: Reconcile `SendModal.tsx`**

Combine the EVM send behavior with develop's `AppLoading`, `SectionTitle` and `AppButton` components.

- [ ] **Step 5: Stage and typecheck the hook layer**

```bash
git add apps/web/src/hooks/ apps/web/src/components/SendModal.tsx
grep -rn "<<<<<<<\|>>>>>>>" apps/web/src/hooks/ apps/web/src/components/SendModal.tsx && echo "MARKERS LEFT" || echo "no markers"
```

---

### Task 9: Resolve the staking layer

**Files:**

- Modify: `apps/web/src/hooks/useStaking.ts`, `packages/ui/src/screens/StakingScreen/index.tsx`, `packages/ui/src/screens/StakingScreen/components/AllValidators.tsx`, `packages/ui/src/screens/StakingScreen/components/RewardsCalculator.tsx`, `apps/web/src/app/staking/page.tsx`

**Interfaces:**

- Consumes: `network.ts`, `apps/web/src/utils/staking-overview-cache.ts` (EVM side, no conflict).
- Produces: staking screens that render develop's surface and keep the EVM staking cache and auto-refresh behavior, with validators visible under MetaMask.

- [ ] **Step 1: Take the EVM side where it dominates**

`useStaking.ts` (EVM 235/91 vs develop 24/5), `AllValidators.tsx` (76/3 vs 27/27), `staking/page.tsx` (19/2 vs 2/0):

```bash
for f in apps/web/src/hooks/useStaking.ts \
         packages/ui/src/screens/StakingScreen/components/AllValidators.tsx \
         apps/web/src/app/staking/page.tsx; do
  git show ":3:$f" > "$f"
  git show ":2:$f" | diff - "$f" | head -30
done
```

Re-apply develop's deltas from each diff.

- [ ] **Step 2: Take develop for `RewardsCalculator.tsx`** (develop 33/16 vs EVM 5/3), re-applying the small EVM delta.

- [ ] **Step 3: Reconcile `StakingScreen/index.tsx`** genuinely (58/42 vs 31/10) — develop's layout, EVM's wallet-mode gating.

- [ ] **Step 4: Run the staking tests**

```bash
git add apps/web/src/hooks/useStaking.ts packages/ui/src/screens/StakingScreen apps/web/src/app/staking/page.tsx
pnpm --filter web test -- useStaking staking-overview-cache staking-validators
```

Expected: PASS. These cover the auto-refresh repair and cache behavior from `78584ef`/`0661d19`.

---

### Task 10: Resolve the governance and home screens

**Files:**

- Modify: `packages/ui/src/screens/GovernanceScreen.tsx`, `packages/ui/src/screens/GovernanceDetailsScreen.tsx`, `packages/ui/src/screens/HomeScreen.tsx`, `apps/web/src/app/page.tsx`

**Interfaces:**

- Consumes: governance hooks from Task 8, `apps/web/src/utils/governance-votes.ts` and `countdown.ts` (EVM side, no conflict).
- Produces: develop's richer governance/home surface carrying the EVM vote display, bech32 vote lookup, and proposal countdown.

- [ ] **Step 1: Start from develop for all three screens** — it dominates each (195/158, 220/181, 377/150 vs 51/6, 34/5, 71/37).

```bash
for f in packages/ui/src/screens/GovernanceScreen.tsx \
         packages/ui/src/screens/GovernanceDetailsScreen.tsx \
         packages/ui/src/screens/HomeScreen.tsx; do
  git show ":2:$f" > "$f"
  git show ":3:$f" | diff - "$f" > "/tmp/$(basename "$f").diff"
done
```

- [ ] **Step 2: Re-apply each EVM delta**

From each saved diff, carry forward: current-vote display (`ce2c1a6`), bech32-address vote queries (`67b1ff8`), the active-proposal countdown with correct unit plurals (`c50b650`, `bd7b77e`), the dashboard versions block and global search (`d005f62`), and the fail-closed governance gating for MetaMask.

- [ ] **Step 3: Take the EVM side for `app/page.tsx`** (1/1 vs develop 9/0), re-applying develop's delta.

- [ ] **Step 4: Stage and run the governance tests**

```bash
git add packages/ui/src/screens/GovernanceScreen.tsx packages/ui/src/screens/GovernanceDetailsScreen.tsx \
        packages/ui/src/screens/HomeScreen.tsx apps/web/src/app/page.tsx
pnpm --filter web test -- governance-votes countdown search
```

Expected: PASS.

---

### Task 11: Resolve the account layer to develop's page

The decision is to keep develop's richer account page. In this task it is resolved to a **working** state on develop's own data hook; Task 15 then ports it onto the extended, tested data layer.

**Files:**

- Modify: `apps/web/src/hooks/useAccount.ts`, `apps/web/src/hooks/useAccountInfo.ts`, `packages/ui/src/screens/AccountScreen.tsx`, `packages/ui/src/screens/WalletScreen.tsx`, `apps/web/src/utils/helpers.ts`, `apps/web/src/app/layout.tsx`
- Resolve to one directory: `apps/web/src/app/account/[validator]/page.tsx` vs `apps/web/src/app/account/[address]/page.tsx`

**Interfaces:**

- Consumes: `apps/web/src/utils/account.ts` (`parseAccountAddress`) and `useAccountInfo.ts` (`fetchAccountInfo`), both EVM-side.
- Produces: a rendering account page at a single dynamic route, and `useAccountInfo` exporting both develop's additions and the EVM `fetchAccountInfo`/`AccountInfoData` contract that Task 15 extends.

- [ ] **Step 1: Take develop's `useAccount.ts` and `AccountScreen.tsx`**

This is an add/add conflict on `useAccount.ts` (develop 382 lines, EVM 55).

```bash
git show :2:apps/web/src/hooks/useAccount.ts > apps/web/src/hooks/useAccount.ts
git show :2:packages/ui/src/screens/AccountScreen.tsx > packages/ui/src/screens/AccountScreen.tsx
```

- [ ] **Step 2: Take the EVM side for `useAccountInfo.ts`** (98/17 vs develop 8/0), re-applying develop's 8-line delta. This preserves `fetchAccountInfo` and `AccountInfoData`, which Task 15 needs.

```bash
git show :3:apps/web/src/hooks/useAccountInfo.ts > apps/web/src/hooks/useAccountInfo.ts
git show :2:apps/web/src/hooks/useAccountInfo.ts | diff - apps/web/src/hooks/useAccountInfo.ts
grep -c "fetchAccountInfo\|AccountInfoData" apps/web/src/hooks/useAccountInfo.ts   # expect >=2
```

- [ ] **Step 3: Keep exactly one dynamic account route**

Both branches have a dynamic account route under different param names. Keep one directory; the URL shape `/account/:value` is unchanged either way.

```bash
ls apps/web/src/app/account/
```

Resolve to a single directory (`[address]` is the accurate name — the param is an account address, and the merged parser accepts Bech32 and `0x`). Update the hook's `useParams` key and every link that builds an account URL.

```bash
grep -rn "account/" apps/web/src packages/ui --include=*.tsx --include=*.ts | grep -v "\.test\." | head -20
```

- [ ] **Step 4: Reconcile `helpers.ts` and `WalletScreen.tsx`**

`WalletScreen.tsx` is the heaviest true two-way conflict (develop 234/228 vs EVM 124/284). Keep develop's layout and carry the EVM wallet-mode behavior: both address formats (`8778b1b`), complete addresses (`9f68cf1`), the address card fit (`f15af52`), the transaction history component and its direction classification (`d963d8e`, `359b483`).

`helpers.ts` (165/11 vs 36/18): union the helper sets; neither side's helpers are redundant.

- [ ] **Step 5: Take develop for `layout.tsx`** (39/2 vs 1/1), re-applying the EVM delta.

- [ ] **Step 6: Stage and run the account tests**

```bash
git add apps/web/src/hooks/useAccount.ts apps/web/src/hooks/useAccountInfo.ts \
        packages/ui/src/screens/AccountScreen.tsx packages/ui/src/screens/WalletScreen.tsx \
        apps/web/src/utils/helpers.ts apps/web/src/app/layout.tsx apps/web/src/app/account
pnpm --filter web test -- account useAccountInfo helpers transaction-history portfolio
```

Expected: PASS.

---

### Task 12: Resolve the app shell

**Files:**

- Modify: `apps/web/src/components/layout/AppShell.tsx`

**Interfaces:**

- Consumes: `ConnectWallet.tsx` from Task 7.
- Produces: navigation that exposes develop's full route surface and hosts the EVM-aware connected-wallet menu.

- [ ] **Step 1: Start from develop** (187/70 vs EVM 26/18) — it owns the navigation that reaches `/blocks`, `/supernodes`, `/admin`, `/referral`, `/wasm`.

```bash
git show :2:apps/web/src/components/layout/AppShell.tsx > apps/web/src/components/layout/AppShell.tsx
git show :3:apps/web/src/components/layout/AppShell.tsx | diff - apps/web/src/components/layout/AppShell.tsx
```

- [ ] **Step 2: Re-apply the EVM delta** — the connected-wallet account menu (`88f1363`) and the hydration-mismatch suppression (`24a030b`).

- [ ] **Step 3: Verify navigation still reaches develop's routes**

```bash
grep -oE "'/(blocks|supernodes|admin|referral|wasm|cascade|sense|inference|nfts)" apps/web/src/components/layout/AppShell.tsx | sort -u
git add apps/web/src/components/layout/AppShell.tsx
```

---

### Task 13: Complete the merge commit

**Files:** none new — this closes the merge started in Task 4.

**Interfaces:**

- Produces: the merge commit; first parent `develop`, second parent `evm-support`.

- [ ] **Step 1: Confirm zero unresolved paths and zero markers**

```bash
git diff --name-only --diff-filter=U | wc -l          # expect 0
grep -rn "<<<<<<<\|=======\|>>>>>>>" apps/web/src packages/ui --include=*.ts --include=*.tsx | grep -v "\.test\." | head
```

Expected: no conflict markers. (`=======` may legitimately appear in markdown; restrict the grep to source as shown.)

- [ ] **Step 2: Typecheck and test the whole tree**

```bash
pnpm install --no-frozen-lockfile
pnpm --filter web exec tsc --noEmit
pnpm --filter web test
```

Both must PASS. Do not commit the merge until they do.

- [ ] **Step 3: Route parity must hold**

```bash
./scripts/route-parity.sh origin/develop
```

Expected: `route parity OK`. A failure here means the merge dropped a route — fix before committing.

- [ ] **Step 4: Commit the merge**

```bash
git commit --no-edit
git log --oneline --graph -3
git rev-parse HEAD^1 HEAD^2   # first parent = develop tip, second = evm-support
```

- [ ] **Step 5: Confirm parentage**

```bash
test "$(git rev-parse HEAD^2)" = "$(git rev-parse evm-support)" && echo "second parent correct"
```

---

### Task 14: Full verification of the merged branch

**Files:** none — verification only.

- [ ] **Step 1: Build all three network profiles**

The mainnet build specifically proves the non-EVM conditional branch compiles.

```bash
make devnet-build
make testnet-build
make mainnet-build
```

All three must succeed.

- [ ] **Step 2: Re-run the full automated suite**

```bash
pnpm --filter web test
pnpm --filter web exec tsc --noEmit
pnpm lint
./scripts/route-parity.sh origin/develop
```

- [ ] **Step 3: Confirm the retired wallets are gone repo-wide**

```bash
grep -rniE "leap-extension|cosmostation-extension" apps packages --include=*.ts --include=*.tsx --include=*.json | grep -v "\.tamagui/" || echo "no retired adapter references"
grep -rn "WALLET_CONNECT" apps/web/src --include=*.ts --include=*.tsx || echo "no WalletConnect constants"
test ! -f apps/web/src/utils/wallet-connect.ts && echo "transport removed"
test -f apps/web/src/hooks/useWalletConnect.ts && echo "generic hook preserved"
```

- [ ] **Step 4: Manual smoke on the develop-only surface**

```bash
make testnet PORT=3001
```

Visit and confirm each renders: `/admin`, `/loyalty/wallet/connect`, `/referral`, `/supernodes`, `/blocks`, `/wasm`, `/cascade`, and `/account/<a-real-bech32-address>`.

- [ ] **Step 5: Manual wallet matrix**

- mainnet profile (`make mainnet PORT=3002`): Keplr offered; **MetaMask not advertised** anywhere including `GetStarted`.
- testnet (EVM) + Keplr: connect, then Cosmos send / staking / governance paths.
- testnet (EVM) + MetaMask: connect, add/switch network, native LUME transfer, account lookup from both `0x` and Bech32 forms, and governance/staking controls **fail closed** with the specific explanation.
- mobile browser: the WalletConnect QR/deep-link flow is absent. This is the accepted, visible product consequence of the removal.

- [ ] **Step 6: Record the evidence**

Append the actual command outputs to `docs/plans/integration-baseline.md` under a "Verification evidence" heading, then commit.

```bash
git add docs/plans/integration-baseline.md
git commit -m "record verification evidence for the develop+EVM merge"
```

---

### Task 15: Extend the tested account data layer and port the rich page onto it

The spec's `useAccount` decision is only half-delivered by Task 11: the EVM helpers cover address parsing, balances, delegations, rewards and unbonding, but **not** the rich page's validators, sent/received transactions, Cascade history, or connected-wallet staking state. This task closes that gap so the richer page runs on tested code instead of develop's untested 382-line hook.

**Files:**

- Modify: `apps/web/src/hooks/useAccountInfo.ts`
- Create: `apps/web/src/utils/account-activity.ts`
- Create: `apps/web/src/utils/account-activity.test.ts`
- Modify: `apps/web/src/hooks/useAccount.ts`
- Modify: `packages/ui/src/screens/AccountScreen.tsx`

**Interfaces:**

- Consumes: `fetchAccountInfo(address: string): Promise<AccountInfoData>` and `parseAccountAddress` from Task 11.
- Produces: `fetchAccountActivity(address: string): Promise<AccountActivity>` where `AccountActivity` carries `validators`, `sentTransactions`, `receivedTransactions`, `cascadeHistory` and `connectedStaking`; and a `useAccount` hook that composes `fetchAccountInfo` + `fetchAccountActivity` and returns the same shape `AccountScreen` already consumes.

- [ ] **Step 1: Write the failing test for the extracted activity layer**

```ts
// apps/web/src/utils/account-activity.test.ts
import { describe, expect, it, vi } from 'vitest';
import { fetchAccountActivity } from './account-activity';

describe('fetchAccountActivity', () => {
  it('classifies sent and received transfers for the queried address', async () => {
    const api = {
      transactions: vi.fn().mockResolvedValue([
        { hash: 'A', from: 'lumera1self', to: 'lumera1other', amount: '10' },
        { hash: 'B', from: 'lumera1other', to: 'lumera1self', amount: '5' },
      ]),
      validators: vi.fn().mockResolvedValue([]),
      cascade: vi.fn().mockResolvedValue([]),
    };

    const activity = await fetchAccountActivity('lumera1self', { api });

    expect(activity.sentTransactions.map((t) => t.hash)).toEqual(['A']);
    expect(activity.receivedTransactions.map((t) => t.hash)).toEqual(['B']);
  });

  it('returns empty collections rather than throwing when a source fails', async () => {
    const api = {
      transactions: vi.fn().mockRejectedValue(new Error('upstream down')),
      validators: vi.fn().mockResolvedValue([]),
      cascade: vi.fn().mockResolvedValue([]),
    };

    const activity = await fetchAccountActivity('lumera1self', { api });

    expect(activity.sentTransactions).toEqual([]);
    expect(activity.receivedTransactions).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
pnpm --filter web test -- account-activity
```

Expected: FAIL — `Cannot find module './account-activity'`.

- [ ] **Step 3: Implement `fetchAccountActivity`**

Extract the data-fetching and classification logic out of develop's `useAccount.ts` into `apps/web/src/utils/account-activity.ts`, taking the API client as an injected dependency so it is testable. Reuse the existing `transaction-history.ts` direction classification rather than reimplementing it.

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
pnpm --filter web test -- account-activity transaction-history
```

Expected: PASS.

- [ ] **Step 5: Recompose `useAccount` onto the tested layer**

Rewrite `useAccount.ts` to call `parseAccountAddress`, `fetchAccountInfo` and `fetchAccountActivity`, returning the identical shape `AccountScreen.tsx` consumes so the screen needs no behavioral change. Keep the render-facing property names exactly as develop's screen expects.

- [ ] **Step 6: Verify the page is unchanged in behavior**

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web test
make testnet PORT=3001   # visit /account/<bech32> and compare against Task 14 Step 4
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/utils/account-activity.ts apps/web/src/utils/account-activity.test.ts \
        apps/web/src/hooks/useAccount.ts apps/web/src/hooks/useAccountInfo.ts \
        packages/ui/src/screens/AccountScreen.tsx
git commit -m "port the rich account page onto the tested account data layer"
```

---

### Task 16: Add the conditional MetaMask onboarding card

**Files:**

- Modify: `apps/web/src/components/GetStarted.tsx`
- Modify: `apps/web/src/app/styles.css`
- Delete: `apps/web/public/leap.svg`, `apps/web/public/img/leap.jpg`, `apps/web/public/cosmostation.svg`, `apps/web/public/img/cosmostation.jpg`

**Interfaces:**

- Consumes: `IS_EVM_NETWORK` from `network.ts`.
- Produces: onboarding that offers Keplr always and MetaMask only on EVM-enabled profiles.

- [ ] **Step 1: Remove the two dead wallet cards**

Delete the Leap card and the Cosmostation card from `GetStarted.tsx`, keeping the Keplr card.

```bash
grep -ciE "leap|cosmostation" apps/web/src/components/GetStarted.tsx   # expect 0
```

- [ ] **Step 2: Remove their CSS and assets**

```bash
grep -nE "leap-wallet|cosmostation-wallet" apps/web/src/app/styles.css
```

Delete those rules, then:

```bash
git rm -f apps/web/public/leap.svg apps/web/public/img/leap.jpg \
          apps/web/public/cosmostation.svg apps/web/public/img/cosmostation.jpg
grep -cE "leap|cosmostation" apps/web/src/app/styles.css   # expect 0
```

- [ ] **Step 3: Add the MetaMask card, gated on `IS_EVM_NETWORK`**

Follow the existing Keplr card shape — link, heading, description, icon plus URL line — using the existing asset `apps/web/public/metamask.png`, `alt='MetaMask Wallet'`, and class `metamask-wallet`. Wrap it so it renders only when `IS_EVM_NETWORK` is true. Add a `.get-started .metamask-wallet::after` rule mirroring the deleted ones.

- [ ] **Step 4: Fix the incorrect Keplr alt text**

The retained Keplr card's icon alt is correct; confirm no card carries a mismatched alt.

```bash
grep -n "alt=" apps/web/src/components/GetStarted.tsx
```

Expected: Keplr's says Keplr, MetaMask's says MetaMask.

- [ ] **Step 5: Verify both profiles**

```bash
pnpm --filter web exec tsc --noEmit
make mainnet-build && make testnet-build
make mainnet PORT=3002   # GetStarted must NOT show MetaMask
make testnet PORT=3001   # GetStarted MUST show MetaMask
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/GetStarted.tsx apps/web/src/app/styles.css apps/web/public
git commit -m "offer MetaMask onboarding on EVM profiles and drop retired wallet cards"
```

---

### Task 17: Update the stale docs and open the PR

**Files:**

- Modify: `docs/Lumera Hub — Scaffold.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Produces: the integration PR against `develop`.

- [ ] **Step 1: Correct the adapter examples**

`docs/Lumera Hub — Scaffold.md` instructs readers to install Leap/Cosmostation. Update the live examples to Keplr + MetaMask, or mark the section historical. Preserve historical changelog and design entries that describe what earlier releases supported — do not rewrite history, only stop instructing.

```bash
grep -rniE "leap|cosmostation" docs/ README.md | grep -v "2026-08-17-develop-evm-integration"
```

- [ ] **Step 2: Note the wallet change in `CHANGELOG.md`**

Record that Leap, Cosmostation and the WalletConnect transport were removed, and that mobile browser-to-wallet QR/deep-link connection is no longer supported.

- [ ] **Step 3: Final full gate**

```bash
pnpm --filter web test && pnpm --filter web exec tsc --noEmit && pnpm lint
make devnet-build && make testnet-build && make mainnet-build
./scripts/route-parity.sh origin/develop
```

All must pass.

- [ ] **Step 4: Commit and push**

```bash
git add docs README.md CHANGELOG.md
git commit -m "update wallet documentation for the Keplr + MetaMask set"
git push -u origin evm-on-develop
```

- [ ] **Step 5: Open the PR with a merge commit, not a squash**

```bash
gh pr create --base develop --head evm-on-develop \
  --title "Integrate the EVM wallet layer into the deployed develop line" \
  --body "$(cat <<'EOF'
Implements docs/design/2026-08-17-develop-evm-integration.md.

Brings the `evm-support` wallet layer onto `develop`, which is the line actually
deployed to both hubs (`main` has not moved since 2025-12-09). Wallets are reduced to
Keplr + MetaMask: Leap is sunset, Cosmostation shuts down 2026-09-01, and the
WalletConnect/Reown transport is dropped as a product decision.

Verification: full test suite, `tsc --noEmit`, lint, all three profile builds, and the
new `scripts/route-parity.sh` gate confirming no develop route shape disappeared.

**Merge this PR with a merge commit.** Squashing or rebasing would defeat the goal of
retaining both histories, which is why the branch was built with `--no-ff`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Hand off the deploy consequence**

The merge commit SHA becomes the new `HUB_VERSION` in lumera-deploy. Report the SHA and note that runbook 04's P4.4/P4.5 gates should probe a fixed critical-route manifest on the built container — the source-tree comparison in `route-parity.sh` cannot run in the deploy checkout, which has only one source tree.

---

## Self-Review

**Spec coverage:** Direction/topology → Task 1, 4, 13. Tamagui hygiene → Task 2. Conflict groups: generated → Task 4 Step 2; config/manifests/lockfile → Task 4 Steps 3-6; route and layout → Tasks 11 Step 3, 12; wallet providers/network/data hooks → Tasks 5-9; shared UI screens → Tasks 10-12. `useAccount` crux → Tasks 11 and 15. Wallet consolidation → Tasks 5, 6, 16, 17. Verification (all five spec items plus the wallet matrix) → Task 14. lumera-deploy consequences → Task 17 Step 6. Open question 1 (Keplr dual-mode) is explicitly post-merge and correctly absent.

**Known deviation from the skill's template:** a git merge cannot be committed partially, so Tasks 4-12 accumulate resolutions via `git add` and land as the single merge commit in Task 13. Each of those tasks still ends in a runnable check (targeted tests or a grep assertion), and the genuinely additive work in Tasks 15-16 follows the normal test-first cycle with its own commits.

**Type consistency:** `fetchAccountInfo`/`AccountInfoData` (Task 11 Step 2) are the names Task 15 consumes. `fetchAccountActivity`/`AccountActivity` are defined in Task 15 Step 1's test and implemented in Step 3. `IS_EVM_NETWORK` is established in Task 5 and consumed in Tasks 8, 9, 16. `METAMASK_WALLET_NAME`/`KEPLR_WALLET_NAME` come from the untouched `wallet-selection.ts` and are asserted in Task 7.
