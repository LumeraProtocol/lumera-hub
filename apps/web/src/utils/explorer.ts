import { CHAIN_ID, PORTAL_URL } from '@/contants/network';

/*
 * Links into the block explorer.
 *
 * The portal namespaces every route under the chain it belongs to —
 * /lumera-testnet-2/tx/<hash> rather than /tx/<hash> — because one deployment
 * serves several chains. Links were built without it and landed on a page the
 * explorer could not resolve to a network.
 *
 * Built here rather than concatenated at each call site so the shape is stated
 * once, and so the trailing slash on the configured base cannot double up.
 */

const base = () => `${PORTAL_URL.replace(/\/+$/, '')}/${CHAIN_ID}`;

/** The chain's own page, rather than the portal's chain picker. */
export const explorerHomeUrl = () => base();

export const explorerTxUrl = (hash: string) => `${base()}/tx/${hash}`;
export const explorerValidatorUrl = (operatorAddress: string) =>
  `${base()}/validator/${operatorAddress}`;
export const explorerAccountUrl = (address: string) => `${base()}/account/${address}`;
export const explorerBlockUrl = (height: string | number) => `${base()}/block/${height}`;
