import { parseBooleanEnvironmentValue } from '@/utils/env';

export const NETWORK_PROFILES = {
  devnet: {
    displayName: 'Lumera Devnet',
    chainName: 'lumera-devnet',
    evmProfileName: 'lumera-devnet-evm',
    chainId: 'lumera-devnet-1',
    denom: 'ulume',
    rpcEndpoint: 'https://rpc.pastel.network',
    restEndpoint: 'https://lcd.pastel.network',
    evmRpcEndpoint: 'https://evm-rpc.pastel.network',
    evmWsEndpoint: null,
    evmChainId: 76857769,
    snapiUrl: 'http://localhost:3100',
    sdkPreset: 'testnet',
    snscopeUrl: 'https://p1p2p3p4.pastel.network/snscope',
    portalUrl: 'https://portal.testnet.lumera.io/',
  },
  testnet: {
    displayName: 'Lumera Testnet',
    chainName: 'lumera-testnet',
    evmProfileName: 'lumera-testnet-evm',
    chainId: 'lumera-testnet-2',
    denom: 'ulume',
    rpcEndpoint: 'https://rpc-testnet.lumeraprotocol.com',
    restEndpoint: 'https://lcd-testnet.lumeraprotocol.com',
    evmRpcEndpoint: 'https://evm-testnet.lumeraprotocol.com',
    evmWsEndpoint: 'https://evm-ws-testnet.lumeraprotocol.com',
    evmChainId: 76857769,
    snapiUrl: 'http://localhost:3100',
    sdkPreset: 'testnet',
    snscopeUrl: 'https://snscope.testnet.lumera.io',
    portalUrl: 'https://portal.testnet.lumera.io/',
  },
  mainnet: {
    displayName: 'Lumera Mainnet',
    chainName: 'lumera',
    evmProfileName: null,
    chainId: 'lumera-mainnet-1',
    denom: 'ulume',
    rpcEndpoint: 'https://rpc.lumera.io',
    restEndpoint: 'https://lcd.lumera.io',
    evmRpcEndpoint: null,
    evmWsEndpoint: null,
    evmChainId: null,
    snapiUrl: 'http://localhost:3100',
    sdkPreset: 'mainnet',
    snscopeUrl: 'https://snscope.lumera.io',
    portalUrl: 'https://portal.lumera.io/',
  },
} as const;

export type NetworkProfile = keyof typeof NETWORK_PROFILES;

const isNetworkProfile = (value: string): value is NetworkProfile => value in NETWORK_PROFILES;

const getLegacyNetworkProfile = (): NetworkProfile | undefined => {
  if (process.env.NEXT_PUBLIC_NODE_ENV === 'devnet') return 'devnet';
  if (process.env.NEXT_PUBLIC_NODE_ENV === 'dev') return 'testnet';
  return undefined;
};

const requestedProfile = process.env.NEXT_PUBLIC_NETWORK_PROFILE || getLegacyNetworkProfile() || 'mainnet';

if (!isNetworkProfile(requestedProfile)) {
  throw new Error(
    `Unknown network profile "${requestedProfile}". Expected one of: ${Object.keys(NETWORK_PROFILES).join(', ')}`
  );
}

export const NETWORK_PROFILE: NetworkProfile = requestedProfile;

export const ACTIVE_NETWORK = NETWORK_PROFILES[NETWORK_PROFILE];

// Individual overrides are useful for local nodes and private deployments.
export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || ACTIVE_NETWORK.chainName;
export const DENOM = process.env.NEXT_PUBLIC_DENOM || ACTIVE_NETWORK.denom;
export const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || ACTIVE_NETWORK.chainId;
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || ACTIVE_NETWORK.rpcEndpoint;
export const REST_AI_URL = process.env.NEXT_PUBLIC_REST_AI_URL || ACTIVE_NETWORK.restEndpoint;
export const EVM_RPC_ENDPOINT = process.env.NEXT_PUBLIC_EVM_RPC_ENDPOINT || ACTIVE_NETWORK.evmRpcEndpoint;
export const EVM_WS_ENDPOINT = process.env.NEXT_PUBLIC_EVM_WS_ENDPOINT || ACTIVE_NETWORK.evmWsEndpoint;
export const EVM_PROFILE_NAME = process.env.NEXT_PUBLIC_EVM_PROFILE_NAME || ACTIVE_NETWORK.evmProfileName;
export const EVM_CHAIN_ID = process.env.NEXT_PUBLIC_EVM_CHAIN_ID
  ? Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID)
  : ACTIVE_NETWORK.evmChainId;
export const EVM_NATIVE_DECIMALS = 18;
export const COSMOS_EIP712_ENABLED = parseBooleanEnvironmentValue(
  process.env.NEXT_PUBLIC_COSMOS_EIP712_ENABLED,
  'NEXT_PUBLIC_COSMOS_EIP712_ENABLED'
);

if (EVM_CHAIN_ID !== null && (!Number.isSafeInteger(EVM_CHAIN_ID) || EVM_CHAIN_ID <= 0)) {
  throw new Error('NEXT_PUBLIC_EVM_CHAIN_ID must be a positive integer.');
}

export const IS_EVM_NETWORK = EVM_RPC_ENDPOINT !== null
  && EVM_CHAIN_ID !== null
  && EVM_PROFILE_NAME !== null;
export const SNAPI_URL = process.env.NEXT_PUBLIC_SNAPI_URL || ACTIVE_NETWORK.snapiUrl;
export const SDK_PRESET = process.env.NEXT_PUBLIC_SDK_PRESET || ACTIVE_NETWORK.sdkPreset;
// Call sites append paths as `${SNSCOPE_URL}/v1/...`; a trailing slash in an
// override would send `//v1/...`, which path-prefix proxies reject.
export const SNSCOPE_URL = (process.env.NEXT_PUBLIC_SNSCOPE_URL || ACTIVE_NETWORK.snscopeUrl)
  .replace(/\/+$/, '');
// Keyed by network profile (with an env override), not by SDK_PRESET: a
// private deployment overriding the SDK preset must not have its header
// Portal link silently repointed.
export const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || ACTIVE_NETWORK.portalUrl;
