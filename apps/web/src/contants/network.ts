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
    siteUrl: 'https://hub.testnet.lumera.io',
  },
  testnet: {
    displayName: 'Lumera Testnet',
    chainName: 'lumera-testnet',
    evmProfileName: 'lumera-testnet-evm',
    chainId: 'lumera-testnet-2',
    denom: 'ulume',
    rpcEndpoint: 'https://lumera-testnet-rpc.polkachu.com',
    restEndpoint: 'https://lumera-testnet-api.polkachu.com',
    evmRpcEndpoint: 'https://evm-testnet.lumeraprotocol.com',
    evmWsEndpoint: 'https://evm-ws-testnet.lumeraprotocol.com',
    evmChainId: 76857769,
    snapiUrl: 'http://localhost:3100',
    sdkPreset: 'testnet',
    snscopeUrl: 'https://snscope.testnet.lumera.io',
    portalUrl: 'https://portal.testnet.lumera.io/',
    siteUrl: 'https://hub.testnet.lumera.io',
  },
  mainnet: {
    displayName: 'Lumera Mainnet',
    chainName: 'lumera',
    evmProfileName: null,
    chainId: 'lumera-mainnet-1',
    denom: 'ulume',
    rpcEndpoint: 'https://lumera-rpc.polkachu.com',
    restEndpoint: 'https://lumera-api.polkachu.com',
    evmRpcEndpoint: null,
    evmWsEndpoint: null,
    evmChainId: null,
    snapiUrl: 'http://localhost:3100',
    sdkPreset: 'mainnet',
    snscopeUrl: 'https://snscope.lumera.io',
    portalUrl: 'https://portal.lumera.io/',
    siteUrl: 'https://hub.lumera.io',
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
/*
 * Whether the quest service is wired up on this deployment.
 *
 * Foundry and every quest verification run through SNAG, which needs server
 * credentials this repo does not carry. Without them each of those routes
 * answers 500, and they fire during ordinary use — a wallet connect, a
 * delegation, a Cascade upload — so an unconfigured deployment shows errors
 * for work that in fact succeeded.
 *
 * Off unless explicitly switched on, and the API client refuses to call the
 * quest routes at all while it is off. Turn it on with the SNAG_* server
 * variables in place.
 */
export const SNAG_ENABLED = process.env.NEXT_PUBLIC_SNAG_ENABLED === 'true';

export const SNAPI_URL = process.env.NEXT_PUBLIC_SNAPI_URL || ACTIVE_NETWORK.snapiUrl;

/**
 * Whether the supernode API can be reached from wherever this is running.
 *
 * Every profile defaults SNAPI to localhost:3100, which is correct on a
 * developer's machine and meaningless anywhere else — a deployment served from
 * a real origin asks the *visitor's* machine for it, gets connection refused
 * once per file on the page, and surfaces a global error toast for each.
 *
 * So a localhost SNAPI counts as configured only when the page itself is on
 * localhost. Callers skip the request entirely otherwise: the file sizes it
 * supplies are supplementary, and the rest of Cascade is chain data.
 */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** The rule on its own, so it can be tested without a browser or an env. */
export const snapiReachableFrom = (snapiUrl: string, pageHost: string | null): boolean => {
  if (!snapiUrl) return false;

  let host = '';
  try {
    host = new URL(snapiUrl).hostname;
  } catch {
    return false;
  }
  if (!host) return false;

  if (!LOOPBACK.has(host)) return true;
  // A loopback SNAPI is only reachable by a page already on the same machine.
  return pageHost != null && LOOPBACK.has(pageHost);
};

export const isSnapiReachable = (): boolean =>
  snapiReachableFrom(SNAPI_URL, typeof window === 'undefined' ? null : window.location.hostname);
export const SDK_PRESET = process.env.NEXT_PUBLIC_SDK_PRESET || ACTIVE_NETWORK.sdkPreset;
// Call sites append paths as `${SNSCOPE_URL}/v1/...`; a trailing slash in an
// override would send `//v1/...`, which path-prefix proxies reject.
export const SNSCOPE_URL = (process.env.NEXT_PUBLIC_SNSCOPE_URL || ACTIVE_NETWORK.snscopeUrl)
  .replace(/\/+$/, '');
// Keyed by network profile (with an env override), not by SDK_PRESET: a
// private deployment overriding the SDK preset must not have its header
// Portal link silently repointed.
export const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || ACTIVE_NETWORK.portalUrl;

// The hub ships as two deployments off one codebase — hub.lumera.io and
// hub.testnet.lumera.io — distinguished only by NEXT_PUBLIC_NETWORK_PROFILE.
// Anything that differs between them reads these rather than hardcoding a
// host, so the mainnet build never advertises testnet URLs and vice versa.
export const IS_MAINNET = NETWORK_PROFILE === 'mainnet';
export const IS_TESTNET = !IS_MAINNET;

/** Canonical origin for this deployment. Used for og/canonical metadata. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || ACTIVE_NETWORK.siteUrl)
  .replace(/\/+$/, '');

/** Short label for the network chip and the browser tab. */
export const NETWORK_LABEL = IS_MAINNET ? 'Mainnet' : ACTIVE_NETWORK.displayName.replace('Lumera ', '');

/**
 * Optional faucet for non-mainnet deployments. Unset means no faucet exists
 * yet, and the nav simply does not offer one — better than a link that 404s.
 */
export const FAUCET_URL = IS_TESTNET ? (process.env.NEXT_PUBLIC_FAUCET_URL || '') : '';

/*
 * The in-app faucet, which needs two things this repo cannot supply.
 *
 * FAUCET_API is a service holding a funded account: the hub posts an address to
 * it and it signs and broadcasts. FAUCET_ADDRESS is that account's address,
 * used only to read its recent sends back off the chain for the drip log — the
 * log works on its own, so a deployment can show real history even before the
 * sending half exists.
 *
 * Both are mainnet-blind on purpose. There is no free mainnet LUME, and a
 * faucet offered there would be a scam-shaped hole.
 */
export const FAUCET_API = IS_TESTNET ? (process.env.NEXT_PUBLIC_FAUCET_API || '') : '';
export const FAUCET_ADDRESS = IS_TESTNET ? (process.env.NEXT_PUBLIC_FAUCET_ADDRESS || '') : '';

/*
 * Community fallback endpoints.
 *
 * The official `lcd.lumera.io` and `rpc.lumera.io` are a single point of
 * failure — both were returning 504 while this list was compiled, which left
 * the mainnet hub with nothing to read. The Lumera community and developer
 * resources page publishes independently operated nodes; these are the ones
 * that answered with a permissive CORS header, which is the binding constraint
 * because the hub calls them straight from the browser.
 *
 * Order is by measured latency at the time of writing. `api.ts` walks the list
 * and remembers whichever host answers, so a dead primary costs one failed
 * request per session rather than breaking the page.
 *
 * Endpoints without `access-control-allow-origin: *` are deliberately absent
 * even when healthy — Encapsulate and Decentrio on mainnet, Decentrio on
 * testnet — because the browser cannot use them.
 */
const REST_FALLBACKS: Record<NetworkProfile, string[]> = {
  mainnet: [
    'https://api.lumera.nodestake.org',
    'https://lumera-api.linknode.org',
    'https://lumera-rest.publicnode.com',
    'https://lumera-rest.stakerhouse.com',
    'https://lumera-mainnet-api.corenodehq.xyz',
    // The official host trails the community pool rather than leading it: it
    // was returning 504 for an afternoon, and everything queued behind it.
    'https://lcd.lumera.io',
  ],
  testnet: [
    'https://api-t.lumera.nodestake.org',
    'https://lumera-testnet-api.linknode.org',
    'https://lumera-testnet-rest.stakerhouse.com',
    'https://lumera-testnet-api.corenodehq.xyz',
    'https://lcd-testnet.lumeraprotocol.com',
  ],
  devnet: [],
};

const RPC_FALLBACKS: Record<NetworkProfile, string[]> = {
  mainnet: [
    'https://lumera-rpc.linknode.org',
    'https://lumera-rpc.publicnode.com',
    'https://lumera-rpc.stakerhouse.com',
    'https://lumera-mainnet-rpc.corenodehq.xyz',
    'https://rpc.lumera.io',
  ],
  testnet: [
    'https://rpc-t.lumera.nodestake.org',
    'https://lumera-testnet-rpc.linknode.org',
    'https://lumera-testnet-rpc.stakerhouse.com',
    'https://rpc-testnet.lumeraprotocol.com',
  ],
  devnet: [],
};

const dedupe = (values: string[]) => {
  const seen = new Set<string>();
  return values
    .map((v) => v.replace(/\/+$/, ''))
    .filter((v) => v && !seen.has(v) && (seen.add(v), true));
};

/**
 * Every REST host the hub may read from, primary first.
 *
 * An explicit NEXT_PUBLIC_REST_AI_URL override always leads: a private
 * deployment pointing at its own node must not silently fall through to a
 * public one. Set NEXT_PUBLIC_REST_FALLBACKS to a comma-separated list to
 * replace the community set entirely.
 */
export const REST_ENDPOINTS = dedupe([
  REST_AI_URL,
  ...(process.env.NEXT_PUBLIC_REST_FALLBACKS
    ? process.env.NEXT_PUBLIC_REST_FALLBACKS.split(',').map((v) => v.trim())
    : REST_FALLBACKS[NETWORK_PROFILE]),
]);

/** Every RPC host, primary first. Same override rules as REST_ENDPOINTS. */
export const RPC_ENDPOINTS = dedupe([
  RPC_ENDPOINT,
  ...(process.env.NEXT_PUBLIC_RPC_FALLBACKS
    ? process.env.NEXT_PUBLIC_RPC_FALLBACKS.split(',').map((v) => v.trim())
    : RPC_FALLBACKS[NETWORK_PROFILE]),
]);

/**
 * The sibling deployment, for the sidebar's network switch.
 *
 * The hub ships as two builds, so switching network means going to the other
 * one rather than swapping an endpoint in place — the chain ID, wallet chain
 * registry and explorer all differ. Set NEXT_PUBLIC_SIBLING_HUB_URL on each
 * deployment to point at the other; unset, the switch is not offered rather
 * than linking somewhere that may not exist.
 */
export const SIBLING_HUB_URL = process.env.NEXT_PUBLIC_SIBLING_HUB_URL || '';
