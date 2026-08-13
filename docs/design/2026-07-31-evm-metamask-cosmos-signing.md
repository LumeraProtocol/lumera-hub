# EVM profiles: staged governance support with MetaMask (EIP-712)

- **Date:** 2026-07-31
- **Status:** Approved staged design, pending implementation
- **Branch:** `evm-support`
- **First delivery target:** safe read-only governance on EVM profiles, followed by vote,
  deposit, and proposal creation after Lumera enables Cosmos EIP-712 verification

## Problem

On EVM-enabled network profiles (currently devnet and testnet), the hub connects an injected
EIP-1193 wallet (MetaMask) instead of a Cosmos wallet. Native LUME balance and transfers work
via EVM JSON-RPC, but every flow that signs a Cosmos SDK message is currently a dead-end:
`useWalletConnect.getClient()` / `getOfflineSigner()` throw
"Cosmos signing is unavailable while using an EVM network profile."

Affected flows include governance voting, deposits, and proposal creation; staking
(delegate/undelegate/redelegate/claims); and Cascade uploads (custom Lumera messages).
Today the user only discovers the failure after starting an action.

The planned MetaMask signer depends on Lumera's cosmos/evm EIP-712 signature-verification
fallback. Lumera v1.20.1 includes that fallback in its dependency, but does not yet initialize
the EIP-712 codecs in the production app. The hub must therefore support both network states:

1. EVM is enabled, but Cosmos EIP-712 signing is not enabled on the chain.
2. EVM and Cosmos EIP-712 signing are both enabled.

## Decision

Use a two-phase rollout that fails closed.

### Phase 1: chain does not support Cosmos EIP-712 signing

- Keep governance pages readable on EVM profiles.
- Disable vote, deposit, and create-proposal controls for MetaMask users. Show a specific
  explanation: "Governance transactions are temporarily unavailable with MetaMask on this
  network."
- Add the same guard in the governance hooks so a stale UI or direct invocation cannot reach
  a signing dead-end.
- Leave `useWalletConnect.getClient()` throwing on EVM profiles while the capability is off.

The gate is controlled by an explicit deployment capability flag,
`NEXT_PUBLIC_COSMOS_EIP712_ENABLED`, which defaults to `false`. Do not infer support from the
presence of an EVM RPC endpoint, the EVM chain ID, or a Lumera version string. There is no
reliable read-only chain query for this verifier state.

Expose one derived capability from the wallet layer:

```ts
canSignCosmosTransactions = !IS_EVM_NETWORK || COSMOS_EIP712_ENABLED
```

Cosmos profiles therefore retain their current behavior. An EVM deployment may set the flag
to `true` only after the matching chain has passed the Phase 2 readiness checks below.

### Phase 2: chain supports Cosmos EIP-712 signing

Adopt the approach used by `lumera-portal` / `portal-widgets`: make MetaMask act as a Cosmos
transaction signer via EIP-712 typed-data signing and route the existing hooks' Cosmos
messages through it. Do not use EVM precompiles for module actions.

Once this phase is enabled, the governance mutation controls use the signer instead of the
Phase 1 gate.

## Chain readiness requirement

Lumera pins `github.com/cosmos/evm v0.6.0`. Its `eth_secp256k1` public key accepts either a
normal ECDSA signature or an EIP-712 representation of the Cosmos sign doc:

```go
func (pubKey PubKey) VerifySignature(msg, sig []byte) bool {
    return pubKey.verifySignatureECDSA(msg, sig) || pubKey.verifySignatureAsEIP712(msg, sig)
}
```

The EIP-712 fallback requires the chain to initialize its global codecs and EVM chain ID with
`eip712.SetEncodingConfig(...)`. Merely using the cosmos/evm ante handler is insufficient.
Before the hub flag can be enabled, the Lumera production app must:

1. Call `eip712.SetEncodingConfig(app.legacyAmino, app.interfaceRegistry, 76857769)` after all
   module Amino types and interfaces have been registered.
2. Include a chain integration test that signs and delivers at least one Cosmos message with
   an `eth_secp256k1` key through the same standard ante path used in production.
3. Confirm the deployed EVM chain ID is 76857769 and the deployment's Cosmos chain ID matches
   the hub profile.

The fallback reconstructs typed data from the Cosmos sign doc and verifies the ECDSA signature
against its hash. A Cosmos `TxRaw` containing a MetaMask `eth_signTypedData_v4` signature can
then verify inside the SDK `SigVerificationDecorator`; no extension option is required.

## Alternatives considered

1. **Gov precompile (0x…0805).** It covers vote/deposit/submitProposal but only for that
   module. Lumera custom modules still need another signing mechanism, and proposal creation
   would require a second encoding path. Rejected in favor of one EIP-712 foundation.
2. **Permanently gate governance UI on EVM profiles.** Rejected because Lumera intends to
   support Cosmos transactions from Ethereum wallets. A temporary, capability-controlled gate
   is accepted for Phase 1 so unsupported transactions cannot be attempted before the chain is
   ready.

## Phase 1 architecture: governance capability gate

- `apps/web/src/contants/network.ts` — parse
  `NEXT_PUBLIC_COSMOS_EIP712_ENABLED`; default to `false` and expose
  `COSMOS_EIP712_ENABLED`.
- `apps/web/src/hooks/useWalletConnect.ts` — expose `canSignCosmosTransactions`. On EVM
  profiles, `getClient()` continues to throw a clear capability error until the flag is on.
- Governance screens/modals — keep proposal lists and details visible, but disable vote,
  deposit, and create-proposal controls when an EVM wallet is in use and the capability is off.
  Keep the reason visible next to or inside the disabled action area; do not rely only on a
  tooltip.
- Governance hooks (`useProposals`, `useDeposit`, `useGovernances`) — check
  `canSignCosmosTransactions` before simulation or broadcast and return the same clear error.

The UI gate and hook guard intentionally duplicate enforcement: the UI explains availability,
while the hook guard preserves correctness during stale renders or future reuse.

## Phase 2 architecture: MetaMask Cosmos signer

### Signer and signing-client adapter

`apps/web/src/utils/metamask-cosmos-signer.ts` is adapted from portal-widgets
`MetamaskWallet`:

- **Account hydration and key discovery.** After `eth_requestAccounts`, request one
  `personal_sign("Verify Public Key")` and recover the compressed secp256k1 public key. Cache
  it in localStorage, keyed by the normalized 0x address. A cached key is accepted only after
  deriving its Ethereum address and comparing it with the active account.
- The same hydration path must run for initial `eth_accounts` restoration and every
  `accountsChanged` event, not only explicit connect. Account and chain changes clear the
  complete previous identity atomically before loading the new one.
- Derive the bech32 address from the same 20 account bytes as the 0x address:
  `toBech32('lumera', fromHex(ethAddress))`.
- **`MetamaskSigningClient`** exposes the call surface used by existing hooks:
  - `simulate(signerAddress, messages, memo)` posts a tx with pubkey, sequence, and one empty
    signature to `POST /cosmos/tx/v1beta1/simulate`, returning numeric `gas_used`.
  - `signAndBroadcast(signerAddress, messages, fee, memo)` performs the full flow below.
  - `getBlock()` fetches the LCD latest block but normalizes `header.height` from its JSON
    string representation to a validated safe integer, matching CosmJS' caller contract.
- Every adapter method validates that `signerAddress` is the hydrated bech32 address for the
  active MetaMask account. It never silently ignores or normalizes an unrelated signer.

Sign-and-broadcast flow:

1. Fetch `account_number` / `sequence` from
   `/cosmos/auth/v1beta1/accounts/{bech32}`, handling the EVM account wrapper explicitly.
2. Convert each message to its exact Amino JSON representation using the converters described
   below.
3. Build the EIP-712 typed-data payload with `@tharsis/eip712` helpers. Domain `chainId` is
   `EVM_CHAIN_ID` (76857769) from the network profile, while the message's `chain_id` is the
   full Cosmos chain ID from the same profile.
4. Re-check the active account and network, then call `eth_signTypedData_v4` with the connected
   0x address.
5. Assemble `TxRaw`: proto-encoded `TxBody`; `authInfo` via `makeAuthInfoBytes` with the pubkey
   wrapped as `/cosmos.evm.crypto.v1.ethsecp256k1.PubKey`; and the recovered 65-byte signature.
   Declare `SIGN_MODE_DIRECT`; cosmos/evm reconstructs the EIP-712 representation from the
   protobuf sign doc.
6. Broadcast in sync mode. Throw with `rawLog` immediately for a nonzero CheckTx code. For a
   successful CheckTx, poll the tx query with a bounded timeout; throw with `rawLog` for a
   nonzero DeliverTx code. Only return `{ transactionHash, code: 0, rawLog }` after successful
   inclusion, because existing hooks treat any returned hash as success.

### Governance message encodings

The current hooks use governance v1 for vote and deposit. CosmJS 0.36.1's default Amino
converters do not cover these v1 type URLs, and `@tharsis/eip712`'s built-in vote adapter uses
the legacy v1beta1 Amino type. Do not reuse either blindly.

Add explicit converters and EIP-712 message builders for:

- `/cosmos.gov.v1.MsgVote` → Amino type `cosmos-sdk/v1/MsgVote`
  (`proposal_id`, `voter`, `option`).
- `/cosmos.gov.v1.MsgDeposit` → Amino type `cosmos-sdk/v1/MsgDeposit`
  (`proposal_id`, `depositor`, `amount`).

Proposal creation currently remains on `/cosmos.gov.v1beta1.MsgSubmitProposal` because the
existing flow wraps legacy proposal content. Its adapter must cover every proposal type that
the UI enables:

- `/cosmos.gov.v1beta1.TextProposal`
- `/cosmos.params.v1beta1.ParameterChangeProposal`
- `/cosmos.distribution.v1beta1.CommunityPoolSpendProposal`
- `/cosmos.upgrade.v1beta1.SoftwareUpgradeProposal`

Each content type gets an exact Amino converter and matching EIP-712 nested type definition.
An unsupported proposal type is disabled before submission; it is not offered and allowed to
fail after the wallet prompt.

### Wallet plumbing

- `apps/web/src/app/providers/evm-wallet-provider.tsx` — expose the atomically hydrated
  `{ ethAddress, cosmosAddress, pubkey }` identity.
- `apps/web/src/hooks/useWalletConnect.ts` — when both `IS_EVM_NETWORK` and
  `COSMOS_EIP712_ENABLED` are true, `getClient()` returns `MetamaskSigningClient`. Expose
  `cosmosAddress`; on Cosmos profiles it equals `address`. `getOfflineSigner()` remains out of
  scope for Cascade.
- Governance hooks — use `cosmosAddress` consistently for message fields and for every
  `simulate` / `signAndBroadcast` signer argument. Do not pass the 0x display address into a
  Cosmos client method.

## Unchanged

- Native LUME transfer stays on `eth_sendTransaction`.
- Cosmos-profile behavior with Keplr/Leap is untouched.
- Governance queries and pages remain available in both phases.
- Staking and Cascade remain gated on EVM profiles until their own Phase 2 adapters are added.

## Scope

### This iteration (Phase 1)

- Capability flag and derived `canSignCosmosTransactions` state.
- Read-only governance with disabled vote, deposit, and create-proposal actions on EVM
  deployments where the flag is false.
- Hook-level guards and clear user-facing messaging.
- Cosmos-profile regression coverage.

### After Lumera chain readiness (Phase 2)

- MetaMask signer/client adapter and account hydration.
- Governance v1 vote and deposit converters.
- v1beta1 submit-proposal converter covering all four enabled legacy content types.
- `cosmosAddress` plumbing and removal of the Phase 1 governance action gate when the flag is
  true.

### Follow-ups

- Staking page: delegate/undelegate/redelegate/claims.
- Wallet page: staking sections, rewards claim, and Cosmos REST transaction history using
  `cosmosAddress`.
- Cascade uploads: `getOfflineSigner` consumers plus Lumera custom-message converters/types.
- Send-modal receipt polling and EVM explorer links.

## Error handling

### Phase 1

- Disabled actions show the explicit temporary-unavailability message.
- Hook guards return the same message if invoked despite the UI gate.
- No `personal_sign` or `eth_signTypedData_v4` prompt is triggered.

### Phase 2

- MetaMask rejection (code 4001) becomes "Request rejected in wallet."
- Nonzero CheckTx or DeliverTx code throws with `rawLog`; callers never receive a success hash.
- Polling has a bounded timeout and a retryable timeout message.
- LCD/simulation failures are surfaced through existing modal error states.
- Account not found tells the user to fund the address first.
- Account/network changes during signing cancel the operation and require a retry.

## Dependencies

Phase 1 adds no runtime dependencies.

Phase 2 adds pinned compatible versions of `@tharsis/eip712`, `@tharsis/transactions`,
`@ethersproject/hash`, and `@ethersproject/signing-key`. The old Tharsis governance helper is
v1beta1-specific, so the hub supplies and tests its own gov v1 definitions rather than treating
the dependency as the source of truth.

The cosmos/evm fallback is deprecated upstream. Lumera controls its chain upgrade cadence, but
the capability flag must be turned off before deploying any future chain release that removes
or changes the verifier. The signer implementation remains localized so it can later be
replaced by the chain-supported successor.

## Verification

### Phase 1

1. `pnpm build:web` and typecheck pass with the flag absent/false.
2. On devnet/testnet EVM profiles:
   - Proposal lists and details remain readable.
   - Vote, deposit, and create-proposal actions are disabled with the explicit explanation.
   - Directly invoking each governance hook returns the same capability error without a wallet
     signing prompt or broadcast request.
3. Cosmos profile regression: governance vote, deposit, and proposal creation still work with
   Keplr/Leap.

### Phase 2 readiness and activation

1. Lumera production-style chain test proves an EIP-712-signed Cosmos tx passes the normal
   ante handler after `SetEncodingConfig` initialization.
2. Golden-vector tests compare the browser-produced typed-data hash with cosmos/evm's
   reconstructed hash for:
   - gov v1 vote;
   - gov v1 deposit;
   - v1beta1 submit proposal with Text, Parameter Change, Community Pool Spend, and Software
     Upgrade content.
3. Adapter tests cover restored sessions, `accountsChanged`, invalid/stale cached pubkeys,
   signer-address mismatch, nonzero CheckTx/DeliverTx codes, polling timeout, and numeric block
   height normalization.
4. Enable `NEXT_PUBLIC_COSMOS_EIP712_ENABLED=true` only on a chain that passed steps 1–3, then
   verify live vote, deposit, and all enabled proposal types before rollout.
5. Re-run the Phase 1 flag-off checks as a rollback test.
