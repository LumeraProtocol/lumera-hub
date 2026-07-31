# EVM profiles: sign Cosmos transactions with MetaMask (EIP-712)

- **Date:** 2026-07-31
- **Status:** Approved design, pending implementation
- **Branch:** `evm-support`
- **First delivery target:** governance (vote, deposit, create proposal) on EVM network profiles

## Problem

On EVM-enabled network profiles (currently devnet and testnet), the hub connects an injected
EIP-1193 wallet (MetaMask) instead of a Cosmos wallet. Native LUME balance and transfers work
via EVM JSON-RPC, but every flow that signs a Cosmos SDK message is a dead-end:
`useWalletConnect.getClient()` / `getOfflineSigner()` throw
"Cosmos signing is unavailable while using an EVM network profile."

Affected flows: governance voting, deposits, and proposal creation; staking
(delegate/undelegate/redelegate/claims); Cascade uploads (custom Lumera messages).
The user only discovers the failure after clicking the action button.

## Decision

Adopt the approach proven in `lumera-portal` / `portal-widgets`: **make MetaMask act as a
Cosmos transaction signer via EIP-712 typed-data signing**, and route the existing hooks'
Cosmos messages through it (the only hook change is using the bech32 address in signer fields). Do **not** use the EVM precompiles for module actions,
and do **not** gate governance UI.

### Why this works (chain evidence)

Lumera (`lumera` repo, app version 1.20.1) pins `github.com/cosmos/evm v0.6.0` and uses its
standard dual-routing ante handler. In cosmos/evm v0.6.0, signature verification for
`eth_secp256k1` accounts is:

```go
// crypto/ethsecp256k1/ethsecp256k1.go:213
func (pubKey PubKey) VerifySignature(msg, sig []byte) bool {
    return pubKey.verifySignatureECDSA(msg, sig) || pubKey.verifySignatureAsEIP712(msg, sig)
}
```

The fallback reconstructs the Cosmos sign-doc as EIP-712 typed data (current and legacy
encodings) and verifies the ECDSA signature against its hash. This runs inside the standard
SDK `SigVerificationDecorator` — no extension options and no special ante path required.
A Cosmos tx assembled with a signature obtained from MetaMask's `eth_signTypedData_v4`
therefore verifies on-chain. `lumera-portal` uses exactly this mechanism in production
(`portal-widgets/lib/wallet/wallets/MetamaskWallet.ts`).

### Alternatives considered

1. **Gov precompile (0x…0805).** Active on devnet/testnet and covers vote/deposit/submitProposal,
   but: per-module coverage only (Lumera's custom modules — Cascade, claims — can never work
   this way), `submitProposal` requires reworking the create-proposal flow from legacy v1beta1
   content types to gov v1 JSON, and it adds an ABI-encoding dependency. Each future flow needs
   its own precompile integration. Rejected: EIP-712 signing covers all of these at once.
2. **Gate governance UI on EVM profiles.** Smallest change, but leaves governance read-only on
   the default (testnet) profile. Rejected by product direction: Lumera EVM supports both
   Ethereum and Cosmos transactions, so the hub should too.

## Architecture

### New: MetaMask Cosmos signer + signing-client adapter

`apps/web/src/utils/metamask-cosmos-signer.ts` (adapted from portal-widgets `MetamaskWallet`):

- **Connect-time key discovery.** After `eth_requestAccounts`, request one
  `personal_sign("Verify Public Key")` and recover the compressed secp256k1 public key from
  the signature. Cache it (localStorage, keyed by 0x address) so the prompt happens once per
  account. The bech32 address is derived from the same 20 account bytes as the 0x address
  (`toBech32('lumera', fromHex(ethAddress))` — no pubkey needed for the address itself).
- **`MetamaskSigningClient`** — a small class exposing exactly the call surface the hooks
  already use on the Cosmos path:
  - `simulate(signerAddress, messages, memo)` → LCD `POST /cosmos/tx/v1beta1/simulate`
    (unsigned tx bytes with pubkey + sequence) → returns `gas_used`.
  - `signAndBroadcast(signerAddress, messages, fee, memo)` → full flow below.
  - `getBlock()` → LCD latest block (used by `useGovernances.getBlock`).

  Sign-and-broadcast flow:
  1. Fetch `account_number` / `sequence` from LCD `/cosmos/auth/v1beta1/accounts/{bech32}`.
  2. Convert messages to amino JSON via cosmjs `AminoTypes` (gov v1beta1 vote/deposit/
     submitProposal are covered by `createDefaultAminoConverters`).
  3. Build the EIP-712 typed-data payload with the message-type definitions
     (`@tharsis/eip712` `createEIP712` / `generateTypes` / `generateFee` /
     `generateMessageWithMultipleTransactions`, as in the portal).
     **Domain `chainId` is `EVM_CHAIN_ID` (76857769) taken from the network profile** — not
     parsed from the Cosmos chain-id string. (The portal's `extractChainId` expects
     evmos-style `name_1234-5` ids and yields 0 for `lumera-*` ids; we deviate deliberately.)
  4. `eth_signTypedData_v4` with the connected 0x address.
  5. Assemble `TxRaw`: proto-encoded `TxBody`; `authInfo` via `makeAuthInfoBytes` with the
     pubkey wrapped as **`/cosmos.evm.crypto.v1.ethsecp256k1.PubKey`** (the type cosmos/evm
     registers; not the ethermint or plain-cosmos type URL); the recovered signature bytes.
     Declared sign mode mirrors the portal (`SIGN_MODE_DIRECT` default). If devnet
     verification rejects it, switch the declared mode to `SIGN_MODE_LEGACY_AMINO_JSON` —
     a one-line change; the chain's EIP-712 fallback parses both encodings.
  6. Broadcast via LCD `POST /cosmos/tx/v1beta1/txs` (sync mode), then poll
     `/cosmos/tx/v1beta1/txs/{hash}` until inclusion and return
     `{ transactionHash, code, rawLog }` — matching what the hooks read from cosmjs'
     `DeliverTxResponse`.

### Message-type definitions (EIP-712 types)

The typed-data `types` come per message type, portal-style
(`EthermintMessageAdapter`). The portal already defines vote, send, delegate, undelegate,
redelegate, and reward/commission claims. We add the two governance gaps:

- `/cosmos.gov.v1beta1.MsgDeposit` — trivial (proposal_id, depositor, amount coins).
- `/cosmos.gov.v1beta1.MsgSubmitProposal` — the `content` field is an amino-encoded object
  per proposal type (Text / ParameterChange / SoftwareUpgrade). Each gets its own type
  definition. This is the riskiest encoding in scope; it is validated live on devnet. If the
  chain's encoder rejects a specific proposal type, that proposal type alone reports a clear
  error and is fixed in a follow-up — vote and deposit do not depend on it.

### Changed: wallet plumbing

- `apps/web/src/app/providers/evm-wallet-provider.tsx` — on connect, run pubkey recovery and
  expose `{ ethAddress, cosmosAddress, pubkey }` in context. Skip the `personal_sign` prompt
  when the pubkey is already cached for that address.
- `apps/web/src/hooks/useWalletConnect.ts` — on EVM profiles `getClient()` returns a
  `MetamaskSigningClient` instead of throwing. Additionally expose `cosmosAddress` (bech32;
  on Cosmos profiles it equals `address`). `getOfflineSigner()` keeps throwing for now —
  its only consumer is Cascade, which is a follow-up.
- Governance hooks (`useProposals`, `useDeposit`, `useGovernances`) — use `cosmosAddress`
  for message signer fields (voter / depositor / proposer). No other hook changes: they keep
  calling `client.simulate` / `client.signAndBroadcast` exactly as today.

### Unchanged

- Native LUME transfer stays on `eth_sendTransaction` (already shipped on this branch).
- Cosmos-profile behavior (interchain-kit wallets) is untouched.
- Governance UI: no gating; existing modal error states surface failures.

## Scope

**This iteration:** the signer/client adapter, governance message types, `cosmosAddress`
plumbing, and removal of the governance dead-ends. Verified live on devnet.

**Explicit follow-ups (same foundation, small diffs each):**
- Staking page (delegate/undelegate/redelegate/claims already have adapters in the portal to copy).
- Wallet page: re-enable staking sections, rewards claim, and Cosmos REST transaction history
  on EVM profiles using `cosmosAddress` (removes most `IS_EVM_NETWORK` branches added earlier).
- Cascade uploads (`getOfflineSigner` consumers) — Lumera custom-message amino converters and
  proto types exist in portal-widgets (`lib/amino/lumera-amino.ts`, `lib/protobuf/lumera`).
- Send-modal receipt polling and EVM explorer links (pre-existing polish items).

## Error handling

- MetaMask rejection (code 4001) → the existing modal error states show a friendly
  "Request rejected in wallet." message instead of the raw provider string.
- Broadcast returns `code !== 0` → surface `rawLog` in the modal error state.
- LCD/simulate failures → surfaced through the same try/catch paths the hooks already have.
- Account not found on LCD (never-funded account) → clear error telling the user to fund the
  address first.

## Dependencies

Added to `apps/web`: `@tharsis/eip712`, `@tharsis/transactions` (typed-data construction —
same packages the portal ships), `@ethersproject/hash`, `@ethersproject/signing-key`
(pubkey recovery). All are already vetted in production via lumera-portal.

**Risk noted:** the chain-side EIP-712 verification fallback is marked deprecated upstream in
cosmos/evm. It is active in v0.6.0, lumera-portal depends on it in production, and Lumera
controls its chain upgrade cadence. If a future chain upgrade removes the fallback, both the
portal and the hub must migrate together (precompiles or whatever replacement cosmos/evm
ships); this design keeps that migration localized to `metamask-cosmos-signer.ts`.

## Verification

1. `pnpm build:web` and typecheck pass.
2. Live on devnet (`https://lcd.pastel.network`, `https://evm-rpc.pastel.network`, EVM chain
   id 76857769) with a funded test account in MetaMask:
   - Connect → one `personal_sign` prompt → bech32 address derived and shown where relevant.
   - Vote on an active proposal → `eth_signTypedData_v4` prompt → tx included →
     LCD `/cosmos/gov/v1/proposals/{id}/votes/{voter}` shows the vote.
   - Deposit on a deposit-period proposal → LCD deposits query reflects it.
   - Create a Text proposal → proposal appears; if the legacy-content encoding fails, the
     error is surfaced and logged as the known follow-up (vote/deposit unaffected).
3. Regression: Cosmos profile (mainnet config) governance still works with Keplr/Leap.
