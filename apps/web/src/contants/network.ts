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
    // Official Lumera testnet endpoints (CTO-recommended). CORS-open and healthy;
    // the community nodes below stay as fallbacks.
    rpcEndpoint: 'https://rpc-testnet.lumeraprotocol.com',
    restEndpoint: 'https://lcd-testnet.lumeraprotocol.com',
    evmRpcEndpoint: 'https://evm-testnet.lumeraprotocol.com',
    evmWsEndpoint: 'wss://evm-ws-testnet.lumeraprotocol.com',
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
type ProfileConfig = (typeof NETWORK_PROFILES)[NetworkProfile];

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

/**
 * The profile a deployment was built for. It is the default the runtime starts
 * on, and — when the build is locked to one network (see below) — the only one.
 */
export const DEFAULT_NETWORK_PROFILE: NetworkProfile = requestedProfile;

/*
 * The hub used to ship as two builds — hub.lumera.io and hub.testnet.lumera.io —
 * each frozen to one network at build time, with the sidebar toggle linking
 * across to the other. It now serves both from one deployment: the network is a
 * runtime value the toggle flips in place, and everything that differs between
 * the two reads the live bindings below.
 *
 * A private or local deployment can still pin a single network by setting any
 * network-specific override (a custom node, chain id, endpoints…). Those
 * overrides cannot describe two networks at once, so their presence LOCKS the
 * build to DEFAULT_NETWORK_PROFILE and hides the switch. The public combined
 * site sets none of them, so switching is on.
 */
const ENV = {
  chainName: process.env.NEXT_PUBLIC_CHAIN_NAME,
  denom: process.env.NEXT_PUBLIC_DENOM,
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
  rpcEndpoint: process.env.NEXT_PUBLIC_RPC_ENDPOINT,
  restEndpoint: process.env.NEXT_PUBLIC_REST_AI_URL,
  evmRpcEndpoint: process.env.NEXT_PUBLIC_EVM_RPC_ENDPOINT,
  evmWsEndpoint: process.env.NEXT_PUBLIC_EVM_WS_ENDPOINT,
  evmProfileName: process.env.NEXT_PUBLIC_EVM_PROFILE_NAME,
  evmChainId: process.env.NEXT_PUBLIC_EVM_CHAIN_ID,
  snscopeUrl: process.env.NEXT_PUBLIC_SNSCOPE_URL,
  portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  sdkPreset: process.env.NEXT_PUBLIC_SDK_PRESET,
  restFallbacks: process.env.NEXT_PUBLIC_REST_FALLBACKS,
  rpcFallbacks: process.env.NEXT_PUBLIC_RPC_FALLBACKS,
} as const;

/*
 * True when no network-*identity* override pins this build to one network.
 *
 * Only the hard overrides count — the chain, its endpoints, the EVM profile,
 * the canonical/portal host. `sdkPreset` and `snscopeUrl` are deliberately not
 * in this set: a dev commonly points them at a testnet node for convenience,
 * and that should not disable the switch. When switching is on, both follow the
 * active profile (their env values are read only in a locked build).
 */
const LOCK_OVERRIDES = [
  ENV.chainName,
  ENV.denom,
  ENV.chainId,
  ENV.rpcEndpoint,
  ENV.restEndpoint,
  ENV.evmRpcEndpoint,
  ENV.evmWsEndpoint,
  ENV.evmProfileName,
  ENV.evmChainId,
  ENV.portalUrl,
  ENV.siteUrl,
  ENV.restFallbacks,
  ENV.rpcFallbacks,
];
export const NETWORK_SWITCH_ENABLED = !LOCK_OVERRIDES.some(Boolean);

/** The networks the in-app switch offers. Devnet stays env-only. */
export const AVAILABLE_NETWORKS: NetworkProfile[] = ['mainnet', 'testnet'];

const STORAGE_KEY = 'lumera-hub:network';

const readStoredProfile = (): NetworkProfile | null => {
  if (!NETWORK_SWITCH_ENABLED || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw && isNetworkProfile(raw) ? raw : null;
  } catch {
    return null;
  }
};

const dedupe = (values: string[]) => {
  const seen = new Set<string>();
  return values
    .map((v) => v.replace(/\/+$/, ''))
    .filter((v) => v && !seen.has(v) && (seen.add(v), true));
};

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
    'https://lcd.lumera.io',
  ],
  testnet: [
    'https://lumera-testnet-api.polkachu.com',
    'https://api-t.lumera.nodestake.org',
    'https://lumera-testnet-api.linknode.org',
    'https://lumera-testnet-rest.stakerhouse.com',
    // corenodehq omitted: it answers without `access-control-allow-origin`, so
    // the browser blocks every response (CORS) — unusable as a fallback.
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
    'https://lumera-testnet-rpc.polkachu.com',
    'https://rpc-t.lumera.nodestake.org',
    'https://lumera-testnet-rpc.linknode.org',
    'https://lumera-testnet-rpc.stakerhouse.com',
  ],
  devnet: [],
};

/**
 * The RPC hosts for one specific profile, primary first. Server code that must
 * target a fixed network regardless of the runtime's active profile uses this —
 * the faucet, for instance, always sends on testnet.
 */
export const rpcEndpointsFor = (profile: NetworkProfile): string[] =>
  dedupe([NETWORK_PROFILES[profile].rpcEndpoint, ...RPC_FALLBACKS[profile]]);

/*
 * Network-varying values, exported as live bindings.
 *
 * Every consumer imports these by name and reads them at call time, so
 * reassigning them in `applyProfile` propagates to the whole app (ES module
 * live bindings). Anything that snapshots one at module load — `api.ts`'s host
 * cursor, the chain-params cache — resets on switch via `subscribeNetworkChange`
 * instead. Nothing here is `const`, on purpose.
 */
export let NETWORK_PROFILE: NetworkProfile = DEFAULT_NETWORK_PROFILE;
export let ACTIVE_NETWORK: ProfileConfig = NETWORK_PROFILES[DEFAULT_NETWORK_PROFILE];
export let CHAIN_NAME: string = ACTIVE_NETWORK.chainName;
export let DENOM: string = ACTIVE_NETWORK.denom;
export let CHAIN_ID: string = ACTIVE_NETWORK.chainId;
export let RPC_ENDPOINT: string = ACTIVE_NETWORK.rpcEndpoint;
export let REST_AI_URL: string = ACTIVE_NETWORK.restEndpoint;
export let EVM_RPC_ENDPOINT: string | null = ACTIVE_NETWORK.evmRpcEndpoint;
export let EVM_WS_ENDPOINT: string | null = ACTIVE_NETWORK.evmWsEndpoint;
export let EVM_PROFILE_NAME: string | null = ACTIVE_NETWORK.evmProfileName;
export let EVM_CHAIN_ID: number | null = ACTIVE_NETWORK.evmChainId;
export let IS_EVM_NETWORK = false;
export let SNSCOPE_URL: string = ACTIVE_NETWORK.snscopeUrl;
export let PORTAL_URL: string = ACTIVE_NETWORK.portalUrl;
export let SDK_PRESET: string = ACTIVE_NETWORK.sdkPreset;
export let SITE_URL: string = ACTIVE_NETWORK.siteUrl;
export let IS_MAINNET = DEFAULT_NETWORK_PROFILE === 'mainnet';
export let IS_TESTNET = !IS_MAINNET;
export let NETWORK_LABEL = 'Mainnet';
export let FAUCET_URL = '';
export let FAUCET_API = '';
export let FAUCET_ADDRESS = '';
export let REST_ENDPOINTS: string[] = [];
export let RPC_ENDPOINTS: string[] = [];

const clampEvmChainId = (value: number | null): number | null => {
  if (value == null) return null;
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};

/** Recompute every network-varying binding for `profile`. */
const applyProfile = (profile: NetworkProfile) => {
  const locked = !NETWORK_SWITCH_ENABLED;
  const p = NETWORK_PROFILES[profile];

  NETWORK_PROFILE = profile;
  ACTIVE_NETWORK = p;
  CHAIN_NAME = (locked && ENV.chainName) || p.chainName;
  DENOM = (locked && ENV.denom) || p.denom;
  CHAIN_ID = (locked && ENV.chainId) || p.chainId;
  RPC_ENDPOINT = (locked && ENV.rpcEndpoint) || p.rpcEndpoint;
  REST_AI_URL = (locked && ENV.restEndpoint) || p.restEndpoint;
  EVM_RPC_ENDPOINT = (locked && ENV.evmRpcEndpoint) || p.evmRpcEndpoint;
  EVM_WS_ENDPOINT = (locked && ENV.evmWsEndpoint) || p.evmWsEndpoint;
  EVM_PROFILE_NAME = (locked && ENV.evmProfileName) || p.evmProfileName;
  EVM_CHAIN_ID = clampEvmChainId(
    locked && ENV.evmChainId ? Number(ENV.evmChainId) : p.evmChainId,
  );
  IS_EVM_NETWORK =
    EVM_RPC_ENDPOINT !== null && EVM_CHAIN_ID !== null && EVM_PROFILE_NAME !== null;
  SNSCOPE_URL = ((locked && ENV.snscopeUrl) || p.snscopeUrl).replace(/\/+$/, '');
  PORTAL_URL = (locked && ENV.portalUrl) || p.portalUrl;
  SDK_PRESET = (locked && ENV.sdkPreset) || p.sdkPreset;
  SITE_URL = ((locked && ENV.siteUrl) || p.siteUrl).replace(/\/+$/, '');

  IS_MAINNET = profile === 'mainnet';
  IS_TESTNET = !IS_MAINNET;
  NETWORK_LABEL = IS_MAINNET ? 'Mainnet' : p.displayName.replace('Lumera ', '');

  // Mainnet-blind: there is no free mainnet LUME, so a faucet there would be a
  // scam-shaped hole.
  FAUCET_URL = IS_TESTNET ? (process.env.NEXT_PUBLIC_FAUCET_URL || '') : '';
  FAUCET_API = IS_TESTNET ? (process.env.NEXT_PUBLIC_FAUCET_API || '/api/faucet') : '';
  FAUCET_ADDRESS = IS_TESTNET ? (process.env.NEXT_PUBLIC_FAUCET_ADDRESS || '') : '';

  const restFallbacks =
    locked && ENV.restFallbacks
      ? ENV.restFallbacks.split(',').map((v) => v.trim())
      : REST_FALLBACKS[profile];
  const rpcFallbacks =
    locked && ENV.rpcFallbacks
      ? ENV.rpcFallbacks.split(',').map((v) => v.trim())
      : RPC_FALLBACKS[profile];
  REST_ENDPOINTS = dedupe([REST_AI_URL, ...restFallbacks]);
  RPC_ENDPOINTS = dedupe([RPC_ENDPOINT, ...rpcFallbacks]);
};

// Start on the stored choice when switching is on, else the built profile.
applyProfile(readStoredProfile() ?? DEFAULT_NETWORK_PROFILE);

/* ---------------------------------------------------------- runtime switch */

type NetworkListener = () => void;
const listeners = new Set<NetworkListener>();

/**
 * Register a callback for every network switch. Modules that snapshot a
 * network-varying value at load (host failover cursor, param caches) use this
 * to clear that state so the next read reflects the new network. Returns an
 * unsubscribe.
 */
export const subscribeNetworkChange = (cb: NetworkListener): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export const getNetworkProfile = (): NetworkProfile => NETWORK_PROFILE;

/**
 * Switch the active network in place. Persists the choice, recomputes every
 * live binding, and notifies subscribers. Returns false (a no-op) when the
 * build is locked to one network, the profile is unknown, or it is already
 * active — the caller can skip the wallet teardown and remount in that case.
 */
export const setNetworkProfile = (profile: string): boolean => {
  if (!NETWORK_SWITCH_ENABLED) return false;
  if (!isNetworkProfile(profile) || profile === NETWORK_PROFILE) return false;

  applyProfile(profile);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, profile);
    } catch {
      // A viewer with storage blocked still switches for this session; the
      // choice just will not survive a reload.
    }
  }
  listeners.forEach((cb) => cb());
  return true;
};

/* ------------------------------------------------------- global (invariant) */

/*
 * The Cascade upload/download gateway (api.lumera.help).
 *
 * Public reads — a file's bytes and its on-chain receipt — are fetched straight
 * from here by the browser (the gateway sends `access-control-allow-origin: *`
 * and needs no key for them). Uploads carry an operator key and so go through
 * /api/cascade/upload instead, which holds the key server-side. The gateway
 * inscribes on testnet whatever network the hub itself is switched to.
 */
export const CASCADE_API_URL = (
  process.env.NEXT_PUBLIC_CASCADE_API_URL || 'https://api.lumera.help'
).replace(/\/+$/, '');

/*
 * Cascade objects are per-chain, and an action_id is unique only within a chain
 * (testnet 20000 and mainnet 20000 are unrelated files). The gateway serves
 * mainnet objects under /mainnet and testnet objects at the root, so a read must
 * target the object's OWN network — not whatever the hub happens to be switched
 * to — and a share link carries `?net=` to say which chain it belongs to.
 */
export type CascadeNetwork = 'mainnet' | 'testnet';

/** Collapse any profile (incl. devnet) to the two networks Cascade serves. */
export const cascadeNetworkOf = (profile: string = NETWORK_PROFILE): CascadeNetwork =>
  profile === 'mainnet' ? 'mainnet' : 'testnet';

/** Gateway base for a network's Cascade reads — receipt, download, list. */
export const cascadeApiBaseFor = (profile: string = NETWORK_PROFILE): string =>
  cascadeNetworkOf(profile) === 'mainnet' ? `${CASCADE_API_URL}/mainnet` : CASCADE_API_URL;

/** Gateway base for the hub's currently active network. */
export const cascadeReadBase = (): string => cascadeApiBaseFor(NETWORK_PROFILE);

/*
 * The chain explorer (portal), per network. A Cascade share/result link opens
 * the block the action was anchored in: `${base}/block/<height>` (singular).
 */
const CASCADE_EXPLORER_BASE: Record<CascadeNetwork, string> = {
  mainnet: 'https://portal.lumera.io/lumera-mainnet-1',
  testnet: 'https://portal.testnet.lumera.io/lumera-testnet-2',
};

export const cascadeExplorerBaseFor = (profile: string = NETWORK_PROFILE): string =>
  CASCADE_EXPLORER_BASE[cascadeNetworkOf(profile)];

/** Link to a block on the network's explorer by its height. */
export const cascadeExplorerBlockUrl = (block: number, profile: string = NETWORK_PROFILE): string =>
  `${cascadeExplorerBaseFor(profile)}/block/${block}`;

export const EVM_NATIVE_DECIMALS = 18;
export const COSMOS_EIP712_ENABLED = parseBooleanEnvironmentValue(
  process.env.NEXT_PUBLIC_COSMOS_EIP712_ENABLED,
  'NEXT_PUBLIC_COSMOS_EIP712_ENABLED'
);

/*
 * Whether the quest service is wired up on this deployment.
 *
 * Foundry and every quest verification run through SNAG, which needs server
 * credentials this repo does not carry. Off unless explicitly switched on, and
 * the API client refuses to call the quest routes while it is off.
 */
export const SNAG_ENABLED = process.env.NEXT_PUBLIC_SNAG_ENABLED === 'true';

export const SNAPI_URL = process.env.NEXT_PUBLIC_SNAPI_URL || 'http://localhost:3100';

/**
 * Whether the supernode API can be reached from wherever this is running.
 *
 * SNAPI defaults to localhost:3100, which is correct on a developer's machine
 * and meaningless anywhere else — a deployment served from a real origin asks
 * the *visitor's* machine for it, gets connection refused once per file, and
 * surfaces a global error toast for each. So a localhost SNAPI counts as
 * configured only when the page itself is on localhost.
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
  return pageHost != null && LOOPBACK.has(pageHost);
};

export const isSnapiReachable = (): boolean =>
  snapiReachableFrom(SNAPI_URL, typeof window === 'undefined' ? null : window.location.hostname);
