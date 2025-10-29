import numeral from 'numeral';
import {
  fromBase64,
  fromBech32,
  toBase64,
  toHex,
} from '@cosmjs/encoding';
import { Ripemd160, sha256 } from '@cosmjs/crypto';
import chainMainnet from 'chain-registry/mainnet'
import chainTestnet from 'chain-registry/testnet';
export { parseCoins } from '@cosmjs/stargate';

import { IValidator } from '@/types/validator';

export const getMessages = (msgs: { '@type'?: string; typeUrl?: string }[]) => {
  if (msgs) {
    const sum: Record<string, number> = msgs
      .map((msg) => {
        const msgType = msg['@type'] || msg.typeUrl || 'unknown';
        return msgType
          .substring(msgType.lastIndexOf('.') + 1)
          .replace('Msg', '');
      })
      .reduce((s, c) => {
        const sh: Record<string, number> = s;
        if (sh[c]) {
          sh[c] += 1;
        } else {
          sh[c] = 1;
        }
        return sh;
      }, {});
    const output: string[] = [];
    Object.keys(sum).forEach((k) => {
      output.push(sum[k] > 1 ? `${k}×${sum[k]}` : k);
    });
    return output.join(', ');
  }
  return '';
}

export const calculateTotalPower = (validators: IValidator[]) => {
  const sum = (s: number, e: IValidator) => {
    return s + parseInt(e.delegator_shares);
  };
  return validators ? validators.reduce(sum, 0) : 0;
}

export const calculatePercent = (input?: string | number, total?: string | number) => {
  if (!input || !total) return '0';
  const percent = Number(input) / Number(total);
  return numeral(percent > 0.0001 ? percent : 0).format('0.[00]%');
}

export function valconsToBase64(address: string) {
  if (address) return toBase64(fromBech32(address).data);
  return '';
}

export function consensusPubkeyToHexAddress(consensusPubkey?: {
  '@type': string;
  key: string;
}) {
  if (!consensusPubkey) return '';
  if (consensusPubkey['@type'] === '/cosmos.crypto.ed25519.PubKey') {
    const pubkey = fromBase64(consensusPubkey.key);
    if (pubkey) return toHex(sha256(pubkey)).slice(0, 40).toUpperCase();
  }

  if (consensusPubkey['@type'] === '/cosmos.crypto.secp256k1.PubKey') {
    const pubkey = fromBase64(consensusPubkey.key);
    if (pubkey) return toHex(new Ripemd160().update(sha256(pubkey)).digest());
  }
  return '';
}

export const mapAmount = (events:{type: string, attributes: {key: string, value: string}[]}[]) => {
  if(!events) return []
  return events.find(x => x.type==='coin_received')?.attributes
    .filter(x => x.key === 'YW1vdW50'|| x.key === `amount`)
    .map(x => x.key==='amount'? x.value : String.fromCharCode(...fromBase64(x.value)))
}

export const getChains = () => {
  if (process.env.NEXT_PUBLIC_NODE_ENV === 'dev') {
    return {
      assetLists: chainTestnet.assetLists,
      chains: chainTestnet.chains,
    }
  }
  return {
    assetLists: chainMainnet.assetLists,
    chains: chainMainnet.chains,
  }
}

export function stringToUint8Array(str: string) {
  const arr = [];
  for (let i = 0, j = str.length; i < j; ++i) {
    arr.push(str.charCodeAt(i));
  }
  return new Uint8Array(arr);
}

export function uint8ArrayToString(arr: Uint8Array) {
  let str = '';
  for (let i = 0, j = arr.length; i < j; ++i) {
    str += String.fromCharCode(arr[i]);
  }
  return str;
}

