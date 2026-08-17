# Changelog

All notable changes to Lumera Hub are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-14

First public release of Lumera Hub — a web portal for the Lumera network covering
wallet management, staking, governance, and chain exploration.

### Added

**Dashboard**
- Network overview with recent activity, claimable staking rewards, and active
  governance proposals with voting countdowns.
- Versions footer showing the connected network's chain ID and node version,
  the EVM chain ID (on EVM-enabled networks), and the Hub build version taken
  from the git tag or commit.

**Wallet**
- Keplr and MetaMask wallet support with a selectable wallet picker.
- Send, receive (QR code), and stake flows with advanced fee/gas/memo options.
- Balance overview: available, staking, rewards, and unstaking totals.
- Both address formats (Bech32 and ETH hex) with click-to-copy.
- Paginated transaction history with block and transaction links.

**EVM support**
- Selectable network profiles (mainnet, testnet, devnet) with EVM-enabled
  profiles served via MetaMask: EVM balance queries, `eth_sendTransaction`
  transfers, and Bech32 ↔ ETH hex address conversion throughout the app.

**Staking**
- Validator list with sorting, filtering, and delegation totals.
- Delegate, undelegate, redelegate, and claim-rewards flows.
- "My Staking" view with sortable positions and unbonding entries.
- Validator details page: statistics, uptime over the last 100 blocks,
  commission, and delegator list.
- Staking rewards calculator.

**Governance**
- Proposal list with status, results, and voting countdowns.
- Vote flow with current-vote display, queried by Bech32 address.
- Proposal creation (text proposals) with deposit validation.

**Explorers**
- Global search in the header accepting a block height, transaction hash, or
  account address (Bech32 or ETH hex, case-insensitive) and routing to the
  matching inspector.
- Block details page with proposer and transaction list.
- Transaction details page with decoded messages and events.
- Account inspector: balances, delegations, both address formats, and
  sent/received transaction history for any address.
- Validator inspector linked from delegator lists.

**Services**
- Cascade page with storage metrics, charts, and file browsing.
- Sense, Inference, and NFTs sections.

### Fixed

- Wallet "Unstaking" total always showing zero due to a misread unbonding
  response.
- MetaMask account data not refreshing correctly on wallet changes.
- WalletConnect initialization running more than once per session.
- Governance votes not recorded when queried with an EVM address format.
- Countdown unit plurals (for example "1 days" → "1 day").

[1.0.0]: https://github.com/LumeraProtocol/lumera-hub/releases/tag/v1.0.0
