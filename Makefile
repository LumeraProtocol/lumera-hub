SHELL := /bin/bash

PNPM ?= pnpm
PORT ?= 3000
WEB_ENV_FILE := apps/web/.env.local
WEB_ENV_EXAMPLE := apps/web/.env.example

# Set complete profiles explicitly so stale local overrides cannot route a run
# to another network. Cosmos EIP-712 writes remain fail-closed.
COMMON_NETWORK_ENV := \
	NEXT_PUBLIC_DENOM=ulume \
	NEXT_PUBLIC_COSMOS_EIP712_ENABLED=false \
	NEXT_PUBLIC_SNAPI_URL=http://localhost:3100

DEVNET_ENV := \
	$(COMMON_NETWORK_ENV) \
	NEXT_PUBLIC_NETWORK_PROFILE=devnet \
	NEXT_PUBLIC_CHAIN_NAME=lumera-devnet \
	NEXT_PUBLIC_CHAIN_ID=lumera-devnet-1 \
	NEXT_PUBLIC_REST_AI_URL=https://lcd.pastel.network \
	NEXT_PUBLIC_RPC_ENDPOINT=https://rpc.pastel.network \
	NEXT_PUBLIC_EVM_PROFILE_NAME=lumera-devnet-evm \
	NEXT_PUBLIC_EVM_RPC_ENDPOINT=https://evm-rpc.pastel.network \
	NEXT_PUBLIC_EVM_WS_ENDPOINT= \
	NEXT_PUBLIC_EVM_CHAIN_ID=76857769 \
	NEXT_PUBLIC_SDK_PRESET=testnet \
	NEXT_PUBLIC_SNSCOPE_URL=https://p1p2p3p4.pastel.network/snscope/

TESTNET_ENV := \
	$(COMMON_NETWORK_ENV) \
	NEXT_PUBLIC_NETWORK_PROFILE=testnet \
	NEXT_PUBLIC_CHAIN_NAME=lumera-testnet \
	NEXT_PUBLIC_CHAIN_ID=lumera-testnet-2 \
	NEXT_PUBLIC_REST_AI_URL=https://lcd-testnet.lumeraprotocol.com \
	NEXT_PUBLIC_RPC_ENDPOINT=https://rpc-testnet.lumeraprotocol.com \
	NEXT_PUBLIC_EVM_PROFILE_NAME=lumera-testnet-evm \
	NEXT_PUBLIC_EVM_RPC_ENDPOINT=https://evm-testnet.lumeraprotocol.com \
	NEXT_PUBLIC_EVM_WS_ENDPOINT=https://evm-ws-testnet.lumeraprotocol.com \
	NEXT_PUBLIC_EVM_CHAIN_ID=76857769 \
	NEXT_PUBLIC_SDK_PRESET=testnet \
	NEXT_PUBLIC_SNSCOPE_URL=https://snscope.testnet.lumera.io/

MAINNET_ENV := \
	$(COMMON_NETWORK_ENV) \
	NEXT_PUBLIC_NETWORK_PROFILE=mainnet \
	NEXT_PUBLIC_CHAIN_NAME=lumera \
	NEXT_PUBLIC_CHAIN_ID=lumera-mainnet-1 \
	NEXT_PUBLIC_REST_AI_URL=https://lcd.lumera.io \
	NEXT_PUBLIC_RPC_ENDPOINT=https://rpc.lumera.io \
	NEXT_PUBLIC_EVM_PROFILE_NAME= \
	NEXT_PUBLIC_EVM_RPC_ENDPOINT= \
	NEXT_PUBLIC_EVM_WS_ENDPOINT= \
	NEXT_PUBLIC_EVM_CHAIN_ID= \
	NEXT_PUBLIC_SDK_PRESET=mainnet \
	NEXT_PUBLIC_SNSCOPE_URL=https://snscope.lumera.io/

.DEFAULT_GOAL := help

.PHONY: help deps local-env setup \
	devnet devnet-build devnet-check devnet-preview \
	testnet testnet-build testnet-check testnet-preview \
	mainnet mainnet-build mainnet-check mainnet-preview \
	test typecheck

help: ## Show available commands.
	@printf '%s\n' \
		'make devnet          Install, configure, and run the devnet development server' \
		'make testnet          Install, configure, and run the testnet development server' \
		'make mainnet          Install, configure, and run the mainnet development server' \
		'make <net>-check      Run tests, type checking, and a production build' \
		'make <net>-preview    Build and serve a production bundle' \
		'make <net>-build      Build the web app for devnet, testnet, or mainnet' \
		'make setup            Install dependencies and create .env.local when missing' \
		'make test             Run web unit tests' \
		'make typecheck        Run web TypeScript checks'

deps:
	$(PNPM) install --frozen-lockfile

local-env:
	@if [[ -f "$(WEB_ENV_FILE)" ]]; then \
		printf 'Keeping existing %s\n' "$(WEB_ENV_FILE)"; \
	else \
		cp "$(WEB_ENV_EXAMPLE)" "$(WEB_ENV_FILE)"; \
		printf 'Created %s from %s\n' "$(WEB_ENV_FILE)" "$(WEB_ENV_EXAMPLE)"; \
	fi

setup: deps local-env

devnet: setup ## Run the development server against Lumera devnet.
	@printf 'Starting devnet at http://localhost:%s (the first request can take about a minute to compile)\n' "$(PORT)"
	$(DEVNET_ENV) $(PNPM) --filter web dev --port $(PORT)

testnet: setup ## Run the development server against Lumera testnet.
	@printf 'Starting testnet at http://localhost:%s (the first request can take about a minute to compile)\n' "$(PORT)"
	$(TESTNET_ENV) $(PNPM) --filter web dev --port $(PORT)

mainnet: setup ## Run the development server against Lumera mainnet.
	@printf 'Starting mainnet at http://localhost:%s (the first request can take about a minute to compile)\n' "$(PORT)"
	$(MAINNET_ENV) $(PNPM) --filter web dev --port $(PORT)

test: deps ## Run web unit tests.
	$(PNPM) --filter web test

typecheck: deps ## Run web TypeScript checks.
	$(PNPM) --filter web exec tsc --noEmit

devnet-build: setup ## Create a production build configured for devnet.
	$(DEVNET_ENV) $(PNPM) build:web

testnet-build: setup ## Create a production build configured for testnet.
	$(TESTNET_ENV) $(PNPM) build:web

mainnet-build: setup ## Create a production build configured for mainnet.
	$(MAINNET_ENV) $(PNPM) build:web

devnet-check: test typecheck devnet-build ## Run all automated devnet checks.

testnet-check: test typecheck testnet-build ## Run all automated testnet checks.

mainnet-check: test typecheck mainnet-build ## Run all automated mainnet checks.

devnet-preview: devnet-build ## Build and serve the devnet production bundle.
	$(DEVNET_ENV) $(PNPM) --filter web start --port $(PORT)

testnet-preview: testnet-build ## Build and serve the testnet production bundle.
	$(TESTNET_ENV) $(PNPM) --filter web start --port $(PORT)

mainnet-preview: mainnet-build ## Build and serve the mainnet production bundle.
	$(MAINNET_ENV) $(PNPM) --filter web start --port $(PORT)
