# Integrating the EVM work into the deployed `develop` line

- **Date:** 2026-08-17
- **Status:** Approved design, pending implementation
- **Source branch:** `evm-support` (44 commits)
- **Target branch:** cut from `origin/develop`, merged back via PR
- **First delivery target:** one branch that carries both the deployed feature surface
  and the EVM wallet layer, suitable for pinning as `HUB_VERSION` in lumera-deploy

## Problem

The hub has two divergent development lines, and the one everybody treats as the
trunk is not the one that is deployed.

| Branch | Last commit | Commits since fork | Tests | Deployed? |
| --- | --- | --- | --- | --- |
| `origin/main` | 2025-12-09 | — | 0 | no |
| `origin/develop` | 2026-07-06 (`39aedbc`) | 264 | 0 | **yes, both hubs** |
| `evm-support` | 2026-08-17 | 44 | 21 files | no |

`main` has not moved in eight months. `develop` is the real trunk: it carries 264
commits and it is what serves `hub.testnet.lumera.io` and `hub.lumera.io` today.
`evm-support` was branched from the stale `main`, so it is missing that entire
feature surface.

Measured, not assumed:

```console
$ git merge-base --is-ancestor 39aedbc origin/main   # -> not an ancestor
$ git rev-list --left-right --count origin/main...origin/develop
1   264
$ git merge-base origin/main origin/develop
430a7cd
```

The divergence is complementary rather than competing:

- `develop` holds the feature surface `evm-support` lacks — `/blocks`, `/supernodes`,
  `/admin`, `/loyalty/*`, `/referral`, `/wasm`, plus a much richer account page.
- `evm-support` holds the EVM/wallet layer `develop` lacks. A grep for
  `EVM_RPC` / `eip1193` / `evmRpc` across `develop` returns nothing.

Confirmed against production by probing routes that exist only on `develop`:
`/supernodes`, `/admin`, `/referral`, `/wasm`, `/loyalty/wallet/connect` all return
200, while `/transactions` returns 404 — so the deployed build does real
server-side routing and those 200s are genuine pages.

### The consequence that forces this work

lumera-deploy pins `HUB_VERSION=39aedbc` and its records describe the situation
backwards, as *"upstream main 3b1b871 (> deployed 39aedbc)"*. If a re-pin points at
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
git rm -r --cached apps/web/.tamagui/     # hygiene, see below
git commit -m "untrack generated tamagui artifacts"
git merge evm-support                      # ONE resolution pass
```

`develop` is the first parent, so the branch reads as "develop, plus the EVM work",
which is what the deploy pin needs. Both histories stay intact.

**Not** a cherry-pick replay of the 44 commits. Those include seven separate
"Update `useStaking.ts`" fixups and repeatedly touch the same files, so a replay
means resolving the same conflicts over and over. One merge commit, one resolution.

### Hygiene first: untrack the generated Tamagui artifacts

`apps/web/.tamagui/lumerahubui-components.config.cjs` is an 8.9 MB generated build
artifact. It is **already gitignored** at `apps/web/.gitignore:44`, and tracked only
because it predates that rule. It accounts for 999,257 of `develop`'s 1,050,272
insertions.

Untracking it first drops the reconciliation from ~1,050,000 lines to ~51,000 and
makes the real conflict surface visible. Regenerate locally via the build.

### Reconciliation plan

40 files are touched by both sides, but `develop`'s deltas on the wallet layer are
mostly trivial. Measured against the merge-base:

| File | `develop` delta | `evm-support` | Resolution |
| --- | --- | --- | --- |
| `contants/network.ts` | +2/-0 | 96 lines (profiles) | take ours, re-apply 2 lines |
| `providers/wallet-provider.tsx` | +5/-1 | 151 lines | take ours, re-apply |
| `hooks/useWalletConnect.ts` | +1/-1 | 99 lines | take ours, re-apply |
| `components/SendModal.tsx` | +13/-7 | 290 lines | take ours, re-apply |
| `hooks/useSend.ts` | **+146/-138** | 233 lines | real reconciliation |
| `components/ConnectWallet.tsx` | 91 -> 165 | 404 lines + CSS module | real reconciliation |
| `hooks/useStaking.ts` | 285 -> 304 | 429 lines | real reconciliation |
| `hooks/useAccount.ts` | 0 -> **382** | 55 lines | see below |
| `screens/AccountScreen.tsx` | +1136/-9 | +235/-11 | see below |

Resolve cheapest first: `network.ts` -> `wallet-provider` -> `useWalletConnect` ->
`SendModal` -> `useSend` -> `ConnectWallet` -> `useStaking` -> `useAccount` /
`AccountScreen` last.

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
coverage. This is the largest single work item in the merge and should be budgeted
separately from the other seven files.

### Wallet consolidation: Keplr + MetaMask only

Three adapters come out.

- **Leap** — discontinued.
- **Cosmostation** — the entire wallet service shuts down starting **2026-09-01**
  (iOS, Android and Chrome extension; only seed-phrase and private-key export
  survive). It is registered on both production hubs today.
- **WalletConnect** — not a wallet but a transport (now Reown). Dropped as a product
  decision. Cost: Keplr's *mobile* app connects via WalletConnect, so the hub becomes
  desktop-extension-only. Reversible later by re-adding it deliberately, with a real
  WalletConnect mode in the selection logic.

This makes the adapter array agree with `wallet-selection.ts` for the first time.
That module already encodes a two-wallet world — `METAMASK_WALLET_NAME`,
`KEPLR_WALLET_NAME`, `ActiveWalletMode = 'none' | 'evm' | 'cosmos'` — and
`getActiveWalletMode`, `getPreferredWalletSelection` and `getAlternativeWalletName`
reason about only those two. The other three were registered but unmodeled.

Removal footprint:

| File | Change |
| --- | --- |
| `apps/web/package.json` | drop `@interchain-kit/leap-extension`, `@interchain-kit/cosmostation-extension` |
| `providers/wallet-provider.tsx` | drop both imports; drop the `walletConnect` adapter and its `WALLET_CONNECT_*` imports; array becomes `[keplrWallet]` |
| `types/window.d.ts` | drop `interface Leap` and `window.leap?` |
| `contants/network.ts` | drop the six `WALLET_CONNECT_*` constants (L90-95) |
| `apps/web/.env.example` | drop the six `NEXT_PUBLIC_WALLET_CONNECT_*` vars |
| `components/GetStarted.tsx` *(develop side)* | remove the Leap card (L125-132) and the Cosmostation card (L140-146); keep Keplr (L110-117); **add a MetaMask card** — see below |
| `app/styles.css` *(develop side)* | remove `.get-started .leap-wallet::after` / `.cosmostation-wallet::after` rules at L494-495, L508, L511-512, L724-725 |
| `public/leap.svg`, `public/img/leap.jpg`, `public/cosmostation.svg`, `public/img/cosmostation.jpg` | delete |
| `utils/wallet-selection.test.ts` | the `'leap-extension'` fixture is a stand-in for "some other wallet", proving that disconnecting Keplr leaves other entries intact. Rename the fixture to a neutral `'other-extension'` rather than deleting the cases — the assertion keeps its value |

WalletConnect needs no `package.json` change; the adapter comes from
`@interchain-kit/core`, which stays.

#### The onboarding gap the removal exposes

`GetStarted.tsx` is the "install a wallet" onboarding UI, and it currently ships
three cards — Keplr, Leap, Cosmostation — and **no MetaMask card**, because it
predates the EVM work. Removing the two dead wallets would leave the hub advertising
only Keplr while actually supporting Keplr *and* MetaMask.

Add a MetaMask card alongside Keplr, following the existing card shape (link with the
`?referrer=` param, heading, description, icon plus URL line) and a
`.get-started .metamask-wallet::after` rule mirroring the ones being deleted. The
icon asset already exists — `evm-support` added `apps/web/public/metamask.png` in
commit `50f9df8` — so no new asset is required.

Incidental bug worth fixing while in the file: all three existing cards hardcode
`alt='Keplr Wallet'` on their icons (L116, L131, L146). Moot for the two being
removed; fix the Keplr one and set the new MetaMask card's `alt` correctly.

After this, interchain-kit carries exactly one adapter (Keplr); MetaMask lives
entirely outside it in `evm-wallet-provider.tsx` via EIP-1193 with EIP-6963
discovery. Whether interchain-kit still earns its weight for a single wallet is a
real question, deliberately out of scope here.

## Verification

`develop` has **zero test files**; `evm-support` has 21. So after the merge, 264
commits' worth of features have no automated coverage, and those 21 files are the
only net. Verification therefore leans on structure:

1. `pnpm --filter web test` — all 21 must pass. They cover the layer being
   reconciled, which is exactly where the risk concentrates.
2. `pnpm --filter web exec tsc --noEmit`
3. `make testnet-build`
4. **Route-parity gate.** Enumerate `page.tsx` under `apps/web/src/app` on
   `origin/develop` and on the merged branch. **No route may disappear.** Mechanical,
   and it catches the whole class of "the merge silently dropped a feature".
5. Manual smoke on the `develop`-only surface: `/admin`, `/loyalty/wallet/connect`,
   `/referral`, `/supernodes`, `/blocks`, `/wasm` — plus Keplr and MetaMask connect
   against an EVM-enabled profile.

## Consequences for lumera-deploy

- `HUB_VERSION` re-pins to the merge commit — the first pin that is both current and
  feature-complete.
- The route-parity check belongs in runbook 04's P4.4/P4.5 gates, so a future wrong
  pin fails loudly instead of shipping green.
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
  **2026-09-01**. Until this merge lands and is deployed, both production hubs
  continue to offer a wallet that is being switched off — so the merge, the
  `HUB_VERSION` re-pin, and the deploy all have to complete inside that window, or
  the fallback is to ship the wallet removal on its own after all. Fifteen days from
  this design's date.

## Open questions

1. **Keplr as a dual-mode wallet.** Keplr exposes an EIP-1193 provider at
   `window.keplr.ethereum` (EIP-1193 + EIP-2255, EIP-6963 discovery) and supports
   EVM-compatible Cosmos chains. If that works against Lumera's `cosmos/evm` v0.6.0
   chain, Keplr sidesteps the entire Phase 1 limitation in
   `2026-07-31-evm-metamask-cosmos-signing.md` — it would sign Cosmos messages
   natively *and* speak EVM, with no dependency on chain-side EIP-712 verification.
   Keplr's EVM support covers chains it has registered, so whether a custom chain
   works via `suggestChain` with EVM info needs hands-on verification. Worth a spike
   **after** the merge; the merge keeps the current two-mode mapping.

## Out of scope

- Writing tests for `develop`'s 264 commits. It is the real coverage gap and deserves
  its own slice.
- Retiring or replacing interchain-kit now that it carries one adapter.
- Reconciling `main`. It is eight months stale; whether it is fast-forwarded to the
  merge result or retired outright is a separate decision.
- Widening Keplr to dual Cosmos/EVM mode (open question 1).
