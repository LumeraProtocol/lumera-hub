# Integrating the EVM work into the deployed `develop` line

- **Date:** 2026-08-17
- **Status:** Approved design, pending implementation
- **Source branch:** `evm-support` at `e2ea272` (45 commits beyond
  `origin/main`: 44 implementation/history commits plus this design commit)
- **Target branch:** cut from `origin/develop`, merged back via PR
- **First delivery target:** one branch that carries both the deployed feature surface
  and the EVM wallet layer, suitable for pinning as `HUB_VERSION` in lumera-deploy

## Problem

The hub has two divergent development lines, and the one everybody treats as the
trunk is not the one that is deployed.

These counts are a snapshot of the local refs on 2026-08-17. Re-fetch and
re-measure them immediately before cutting the integration branch.

| Branch           | Last commit            | Commits since fork | Tests    | Deployment evidence                                          |
| ---------------- | ---------------------- | ------------------ | -------- | ------------------------------------------------------------ |
| `origin/main`    | 2025-12-09             | —                  | 0        | no                                                           |
| `origin/develop` | 2026-07-06 (`39aedbc`) | 264                | 0        | exact testnet pin; develop-only routes observed on both hubs |
| `evm-support`    | 2026-08-17 (`e2ea272`) | 45                 | 21 files | no                                                           |

`main` has not moved in eight months. `develop` is the real trunk: it carries 264
commits not reachable from `main`. The testnet deployment records pin `39aedbc`
exactly. Live probes on 2026-08-17 show the develop-only route surface on both
`hub.testnet.lumera.io` and `hub.lumera.io`; route probes alone do not prove the
exact mainnet checkout SHA. `evm-support` was branched from the stale `main`, so it
is missing that entire feature surface.

Measured, not assumed:

```console
$ git merge-base --is-ancestor 39aedbc origin/main   # -> not an ancestor
$ git rev-list --left-right --count origin/main...origin/develop
1   264
$ git rev-list --count origin/main..evm-support
45
$ git merge-base origin/main origin/develop
430a7cd
```

The divergence is complementary rather than competing:

- `develop` holds the feature surface `evm-support` lacks — `/blocks`, `/supernodes`,
  `/admin`, `/loyalty/*`, `/referral`, `/wasm`, plus a much richer account page.
- `evm-support` holds the EVM/wallet layer `develop` lacks. A grep for
  `EVM_RPC` / `eip1193` / `evmRpc` across `develop` returns nothing.

Confirmed against the public deployments on 2026-08-17 by probing routes that
exist only on `develop`:
`/supernodes`, `/admin`, `/referral`, `/wasm`, `/loyalty/wallet/connect` all return
200, while `/transactions` returns 404 — so the deployed build does real
server-side routing and those 200s are genuine pages.

### The consequence that forces this work

lumera-deploy pins `HUB_VERSION=39aedbc` and its records describe the situation
backwards, as _"upstream main 3b1b871 (> deployed 39aedbc)"_. If a re-pin points at
`main` or at `evm-support`, runbook 04's cutover would build that image and move
`hub.testnet.lumera.io` onto it, **silently deleting `/admin`, `/loyalty/*`,
`/referral`, `/supernodes`, `/wasm` and `/blocks` from the public hub.** Nothing in
the runbook's gates would catch it: P4.4 and P4.5 both probe `/`, which exists on
every branch. The cutover would look green.

## Decision

### Direction and topology

Move the smaller, tested change onto the live line — not the reverse.

```bash
git switch -c evm-on-develop origin/develop
git rm -r --cached apps/web/.tamagui/     # leaves ignored local copies in place
git commit -m "untrack generated tamagui artifacts"
git merge --no-ff evm-support              # one resolution pass
```

`develop` is the first parent, so the branch reads as "develop, plus the EVM work",
which is what the deploy pin needs. Both histories stay intact. Record the exact
`origin/develop` and `evm-support` SHAs in the PR before starting; if either moves,
restart the measurements below rather than assuming the conflict inventory is
unchanged. Merge the integration PR with a merge commit as well; squashing or
rebasing that PR would defeat the stated goal of retaining both histories.

**Not** a cherry-pick replay of the 44 pre-design commits. Those include seven separate
"Update `useStaking.ts`" fixups and repeatedly touch the same files, so a replay
means resolving the same conflicts over and over. One merge commit, one resolution.

### Hygiene first: untrack the generated Tamagui artifacts

`apps/web/.tamagui/lumerahubui-components.config.cjs` is an 8.9 MB generated build
artifact at the merge base and on `evm-support`, but the copy currently tracked on
`origin/develop` is 52,206,366 bytes (1,139,249 lines). The whole `.tamagui/`
directory is **already gitignored** at `apps/web/.gitignore:44`, and is tracked only
because it predates that rule. Its four files account for 1,004,768 of
`develop`'s 1,050,272 insertions since the merge base, leaving 45,504 non-generated
insertions.

Untracking the directory first makes the generated resolution mechanical, but it
does not make the merge conflict-free. In a rehearsal of the commands above, the
largest file deleted cleanly and the other three generated files became
modify/delete conflicts. Resolve those three with `git rm`, then let the build
regenerate ignored local copies.

### Reconciliation plan

40 files are touched by both sides. With the generated-file cleanup commit applied,
an exact merge rehearsal at `origin/develop=39aedbc` and `evm-support=e2ea272`
produced **31 unresolved paths**; only nine overlapping paths merged automatically.
The conflict surface is therefore broader than the wallet layer:

| Conflict group                                     | Paths | Resolution rule                                                                                                                   |
| -------------------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------- |
| generated `.tamagui` output                        |     3 | `git rm`; never hand-merge generated output                                                                                       |
| configuration, manifests and lockfile              |     6 | preserve develop-only settings, add EVM settings, remove retired-wallet settings; regenerate the lockfile from resolved manifests |
| route and layout structure                         |     3 | preserve the deployed route behavior and integrate EVM-aware shell changes                                                        |
| wallet providers, network selection and data hooks |    13 | semantic reconciliation; exercise Cosmos and EVM paths                                                                            |
| shared UI screens                                  |     6 | preserve develop's richer surface while carrying forward EVM safety and wallet behavior                                           |

The smaller wallet conflicts are still useful anchors. Measured against the merge
base:

| File                            | `develop` delta | `evm-support`          | Resolution                                                                                                    |
| ------------------------------- | --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `contants/network.ts`           | +2/-0           | 96 lines (profiles)    | start from the EVM version, restore `SDK_PRESET` and `SNSCOPE_URL`, then remove WalletConnect constants       |
| `providers/wallet-provider.tsx` | +5/-1           | 151 lines              | start from the EVM provider composition, preserve develop's rendering behavior, then reduce adapters to Keplr |
| `hooks/useWalletConnect.ts`     | +1/-1           | 99 lines               | start from the EVM version; the develop delta is formatting only                                              |
| `components/SendModal.tsx`      | +13/-7          | 290 lines              | combine EVM send behavior with develop's `AppLoading`, `SectionTitle` and `AppButton` components              |
| `hooks/useSend.ts`              | **+146/-138**   | 233 lines              | real reconciliation                                                                                           |
| `components/ConnectWallet.tsx`  | 91 -> 165       | 404 lines + CSS module | real reconciliation                                                                                           |
| `hooks/useStaking.ts`           | 285 -> 304      | 429 lines              | real reconciliation                                                                                           |
| `hooks/useAccount.ts`           | 0 -> **382**    | 55 lines               | see below                                                                                                     |
| `screens/AccountScreen.tsx`     | +1136/-9        | +235/-11               | see below                                                                                                     |

On `evm-on-develop`, Git calls the develop side `ours` and the EVM side `theirs`.
Do not use a blanket `--ours` or `--theirs`: the original draft's “take ours” wording
would discard the EVM implementation in the first four rows.

Resolve in dependency order: generated files -> manifests and environment schema ->
`network.ts` -> provider composition -> wallet selection/connection -> transaction
hooks and modals -> account data -> shared screens and layouts. Resolve
`pnpm-lock.yaml` last by regenerating it from the resolved package manifests rather
than hand-editing conflict markers. In `apps/web/.env.example`, preserve all
develop-only admin, loyalty, Snag and analytics variables while adding the network
profile/EVM variables and removing WalletConnect variables.

#### The `useAccount` crux

`useAccount.ts` is an add/add conflict: both branches created it independently for
the same job, with opposite philosophies.

- `develop`: a 382-line hook calling `@/utils/api` through `@interchain-kit/react`,
  formatting inline. Feeds a much richer account page (`AccountScreen.tsx`, +1136).
- `evm-support`: 55 lines delegating to extracted, **tested** helpers
  (`fetchAccountInfo`, `parseAccountAddress`; covered by `useAccountInfo.test.ts`
  and `account.test.ts`).

**Decision: keep `develop`'s richer page, ported onto the tested data layer.** It is
the only combination that preserves both the UI users currently see and the test
coverage. The existing EVM helpers cover address parsing plus balances, delegations,
rewards and unbonding; they do **not** yet cover the richer page's validators,
sent/received transactions, Cascade history, or connected-wallet staking state.
Extend the extracted data layer and its tests for those features rather than calling
the existing 55-line hook a complete replacement.

Keep a single dynamic account route. Renaming `[validator]` to `[address]` is useful
because the parameter is an account address, and the merged parser accepts both
Lumera Bech32 account addresses and `0x` addresses. The rename does not change the
public URL shape (`/account/:value`). Update the hook parameter and all links
together. This is the largest single work item in the merge and should be budgeted
separately.

### Wallet consolidation: Keplr + MetaMask only

Three adapters come out.

- **Leap** — [the vendor says the wallet and associated products were sunset on
  2026-05-28](https://www.leapwallet.io/).
- **Cosmostation** — [the announced shutdown schedule starts
  2026-09-01](https://cryptobriefing.com/cosmostation-wallet-shutdown-september/)
  (iOS, Android and Chrome extension; only seed-phrase and private-key export
  remain). It is registered in the code serving the current develop feature
  surface.
- **WalletConnect** — not a wallet but a transport (now Reown). Dropped as a product
  decision. This removes the explicit QR/deep-link transport used by ordinary mobile
  browser-to-wallet flows. The supported path becomes injected Keplr/MetaMask
  providers; a wallet's own in-app browser may still inject one, so
  “desktop-extension-only” would be too absolute. Reversible later by re-adding the
  transport deliberately, with a real WalletConnect mode in the selection logic.

This makes the adapter array agree with `wallet-selection.ts` for the first time.
That module already encodes a two-wallet world — `METAMASK_WALLET_NAME`,
`KEPLR_WALLET_NAME`, `ActiveWalletMode = 'none' | 'evm' | 'cosmos'` — and
`getActiveWalletMode`, `getPreferredWalletSelection` and `getAlternativeWalletName`
reason about only those two. The other three were registered but unmodeled.

Removal footprint:

| File                                                                                               | Change                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/package.json`                                                                            | drop `@interchain-kit/leap-extension`, `@interchain-kit/cosmostation-extension`                                                                                                                                                                        |
| `providers/wallet-provider.tsx`                                                                    | drop both imports; drop the `walletConnect` adapter and its `WALLET_CONNECT_*` imports; array becomes `[keplrWallet]`                                                                                                                                  |
| `utils/wallet-connect.ts`, `utils/wallet-connect.test.ts`                                          | delete the now-dead WalletConnect singleton and its tests                                                                                                                                                                                              |
| `types/window.d.ts`                                                                                | drop `interface Leap` and `window.leap?`                                                                                                                                                                                                               |
| `contants/network.ts`                                                                              | drop the six `WALLET_CONNECT_*` constants (L90-95)                                                                                                                                                                                                     |
| `apps/web/.env.example`                                                                            | drop the six `NEXT_PUBLIC_WALLET_CONNECT_*` vars                                                                                                                                                                                                       |
| `pnpm-lock.yaml`                                                                                   | regenerate after removing the two adapter packages                                                                                                                                                                                                     |
| `components/GetStarted.tsx` _(develop side)_                                                       | remove the Leap card (L125-132) and the Cosmostation card (L140-146); keep Keplr (L110-117); **add a MetaMask card** — see below                                                                                                                       |
| `app/styles.css` _(develop side)_                                                                  | remove `.get-started .leap-wallet::after` / `.cosmostation-wallet::after` rules at L494-495, L508, L511-512, L724-725                                                                                                                                  |
| `public/leap.svg`, `public/img/leap.jpg`, `public/cosmostation.svg`, `public/img/cosmostation.jpg` | delete                                                                                                                                                                                                                                                 |
| `utils/wallet-selection.test.ts`                                                                   | the `'leap-extension'` fixture is a stand-in for "some other wallet", proving that disconnecting Keplr leaves other entries intact. Rename the fixture to a neutral `'other-extension'` rather than deleting the cases — the assertion keeps its value |
| `docs/Lumera Hub — Scaffold.md`                                                                    | update the live adapter examples or mark them historical so they do not instruct readers to install Leap/Cosmostation                                                                                                                                  |

WalletConnect needs no `package.json` change; the adapter comes from
`@interchain-kit/core`, which stays.

Name-collision warning: do **not** delete the generic `useWalletConnect` hook, the
`/loyalty/wallet/connect` route, or the admin tracking APIs/screens named
“wallet connect.” They represent ordinary wallet-connection product behavior, not
the WalletConnect/Reown transport. The protocol-specific helper being deleted is
only `utils/wallet-connect.ts` and its test. Preserve historical changelog/design
entries that describe what earlier releases supported.

#### The onboarding gap the removal exposes

`GetStarted.tsx` is the "install a wallet" onboarding UI, and it currently ships
three cards — Keplr, Leap, Cosmostation — and **no MetaMask card**, because it
predates the EVM work. Removing the two dead wallets would leave the hub advertising
only Keplr while actually supporting Keplr _and_ MetaMask.

Add a MetaMask card alongside Keplr **only when `IS_EVM_NETWORK` is true**, following
the existing card shape (link, heading, description, icon plus URL line) and a
`.get-started .metamask-wallet::after` rule mirroring the ones being deleted. The
condition matters because the current mainnet profile has no EVM endpoint or chain
ID and must not advertise an unsupported wallet. The icon asset already exists —
`evm-support` added `apps/web/public/metamask.png` in commit `50f9df8` — so no new
asset is required. Set the new icon's `alt` to `MetaMask Wallet`; the retained Keplr
icon already has the correct alt text. The incorrect Leap/Cosmostation alt text
disappears with those cards.

After this, interchain-kit carries exactly one adapter (Keplr); MetaMask lives
entirely outside it in `evm-wallet-provider.tsx` via EIP-1193 with EIP-6963
discovery. Whether interchain-kit still earns its weight for a single wallet is a
real question, deliberately out of scope here.

## Verification

`develop` has **zero test files**; `evm-support` has 21 before the planned deletion
of the WalletConnect test. So after the merge, 264 commits' worth of features still
have little automated protection, and the EVM tests are only a partial net. Add
focused reconciliation tests for every adapted cross-layer contract, especially the
rich account page and conditional onboarding.

Verification:

1. `pnpm --filter web test` — all remaining and newly added tests must pass; do not
   pin the expectation to 21 after intentionally deleting one test file and adding
   reconciliation coverage.
2. `pnpm --filter web exec tsc --noEmit`
3. Build every supported behavior profile: `make devnet-build`,
   `make testnet-build`, and `make mainnet-build`. The mainnet build specifically
   ensures the non-EVM conditional branch compiles; the manual matrix below verifies
   that MetaMask onboarding and EVM-only behavior are actually absent.
4. **Route-parity gate.** Enumerate `page.tsx` under `apps/web/src/app` on
   `origin/develop` and on the merged branch. Normalize dynamic segment names before
   comparing, so `/account/[validator]` -> `/account/[address]` is treated as the
   same route shape. Every develop route shape must remain. Also assert the intended
   EVM account/search route behavior explicitly.
5. Manual smoke on the develop-only surface: `/admin`, `/loyalty/wallet/connect`,
   `/referral`, `/supernodes`, `/blocks`, `/wasm`, and a representative
   `/account/<bech32-address>`.
6. Manual wallet matrix:
   - mainnet: Keplr is offered; MetaMask is not advertised;
   - EVM-enabled profile + Keplr: connect and Cosmos send/staking/governance paths;
   - EVM-enabled profile + MetaMask: connect, switch/add network, native EVM send,
     account lookup from both `0x` and Bech32 forms, and fail-closed Cosmos
     staking/governance controls;
   - mobile browser: absence of the removed WalletConnect QR/deep-link flow is an
     accepted, visible product consequence.

## Consequences for lumera-deploy

- `HUB_VERSION` re-pins to the merge commit — the first pin that is both current and
  feature-complete.
- The source-tree route-parity comparison belongs in this repository's pre-merge
  checks. Runbook 04's P4.4/P4.5 gates should instead probe a fixed critical-route
  manifest on the built container and edge path, because the deploy checkout does
  not have two source trees to compare at runtime.
- The `update-hub.sh` work (in-place PM2 updater for both AWS hubs) sits on top of a
  correct pin, and is tracked separately.

## Resolved decisions

- **The loyalty / admin / referral / snag surface is kept in full** (operator,
  2026-08-17). All 264 commits' worth of `develop` features carry over. Nothing is
  retired as part of this merge, so the route-parity gate below applies to the
  complete `develop` route set with no exclusions.
- **Cosmostation removal is folded into this merge**, not split out (operator,
  2026-08-17). The standalone-PR alternative was considered and declined.

  **This puts a hard date on the merge.** Cosmostation's service begins shutting down
  **2026-09-01**. The pinned testnet checkout definitely includes the adapter; the
  mainnet hub exposes the same develop-only route surface but its exact checkout SHA
  was not established by this review. Treat both public hubs as affected until the
  mainnet checkout is verified. The merge, the `HUB_VERSION` re-pin, and the deploy
  should complete inside that window, or the fallback is to ship the wallet removal
  on its own after all. Fifteen days from this design's date.

## Open questions

1. **Keplr as a dual-mode wallet.** [Keplr documents an EVM provider at
   `window.keplr.ethereum`](https://docs.keplr.app/api/multi-ecosystem-support/evm),
   EIP-1193/EIP-2255 request support, native Ethereum signing, and
   `wallet_addEthereumChain`. Its [custom Cosmos chain
   registration](https://docs.keplr.app/api/guide/suggest-chain) separately documents
   the `eth-secp256k1-cosmos` feature for `cosmos/evm` chains. The documentation found
   does **not** establish EIP-6963 announcement support or prove that Lumera's custom
   Cosmos registration and EVM registration resolve to one usable account/provider.
   If hands-on testing confirms that combination against Lumera's `cosmos/evm`
   v0.6.0 chain, Keplr may sidestep the Phase 1 limitation in
   `2026-07-31-evm-metamask-cosmos-signing.md` by signing Cosmos messages natively
   while also speaking EVM. Treat that as a post-merge spike, not as an assumption in
   this merge.

## Out of scope

- Writing tests for `develop`'s 264 commits. It is the real coverage gap and deserves
  its own slice.
- Retiring or replacing interchain-kit now that it carries one adapter.
- Reconciling `main`. It is eight months stale; whether it is fast-forwarded to the
  merge result or retired outright is a separate decision.
- Widening Keplr to dual Cosmos/EVM mode (open question 1).
