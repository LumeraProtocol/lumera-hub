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
import { MsgDelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx';

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
  if (process.env.NEXT_PUBLIC_NODE_ENV === 'devnet') {
    const lumeraChain = {
      chainName: 'lumera-testnet',
      status: 'live',
      networkType: 'testnet',
      chainId: 'lumera-devnet-1',
      chainType: "cosmos",
      prettyName: 'Lumera Devnet',
      chainSymbol: 'lumera-testnet',
      bech32Prefix: 'lumera',
      daemonName: 'lumerad',
      nodeHome: '$HOME/.lumera',
      keyAlgos: ['secp256k1'],
      slip44: 118,
      fees: {
        feeTokens: [
          {
            denom: 'ulume',
            fixedMinGasPrice: '0.025',
            lowGasPrice: '0.025',
            averageGasPrice: '0.025',
            highGasPrice: '0.025',
          },
        ],
      },
      codebase: {
        github: 'https://github.com/LumeraProtocol/',
      },
      apis: {
        rpc: [
          {
            address: 'https://rpc.pastel.network',
            provider: 'lumera',
          },
        ],
        rest: [
          {
            address: 'https://lcd.pastel.network',
            provider: 'lumera',
          },
        ],
        grpc: [],
      },
      explorers: [],
      images: [
        {
          png: 'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/lumera-testnet/chain.png',
        },
      ],
      features: ['cosmwasm'],
    };
    const lumeraAssets = {
      chainName: 'lumera-testnet',
      assets: [
        {
          description: 'Lumera native token on Lumera Devnet',
          denomUnits: [
            {
              denom: 'ulume',
              exponent: 0,
              aliases: ['microlume'],
            },
            {
              denom: 'lume',
              exponent: 6,
              aliases: [],
            },
          ],
          base: 'ulume',
          name: 'Lumera',
          display: 'lume',
          symbol: 'LUME',
          logoURIs: {
            png: 'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/lumera-testnet/chain.png',
            svg: 'https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/lumera-testnet/chain.svg',
          },
          coingeckoId: '',
          keywords: ['lumera', 'testnet'],
        },
      ],
    };
    return {
      assetLists: [lumeraAssets],
      chains: [lumeraChain],
    }
  }
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

export const isNumber = (value: number) => {
  return typeof value === 'number' && Number.isFinite(value);
}

export function hashTx(raw: Uint8Array) {
  return toHex(sha256(raw)).toUpperCase();
}

export const convertUint8ArrayToJson = (encodedBytes: Uint8Array) => {
  try {
    const decodedMessage = MsgDelegate.decode(encodedBytes);

    return MsgDelegate.toJSON(decodedMessage);
  } catch {
    return null;
  }
}

export const getSimplifiedType = (type: string) => {
  if (type.startsWith('image')) return 'Image';
  if (type.startsWith('video')) return 'Video';
  if (type === 'document') return 'Document';
  if (type === 'program') return 'Program';
  if (['archive'].includes(type)) return 'Archive';
  return 'Other';
}

export const extractValidNumber = (value: string) => {
  let cleaned = value.replace(/[^0-9.]/g, '');

  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  return cleaned;
}

export const isValidIPv4 = (ip: string) => {
  try {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip) && ip !== '0.0.0.0';
  } catch {
    return false;
  }
}

export const delay = (time: number) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

export const generateUrlCheck = (domain: string, loyaltyRuleId: string, actionType: string) => {
  let path = `${domain}loyalty/${loyaltyRuleId}`;
  if (actionType === 'referralLink' || actionType === 'inviteUsersUploadToCascade') {
    path = `${domain}referral/${loyaltyRuleId}`;
  }
  let prefix = '';
  switch (actionType) {
    case 'staked':
      prefix = '/stake';
      break;
    case 'delegate':
      prefix = '/delegate';
      break;
    case 'redelegated':
      prefix = '/redelegate';
      break;
    case 'balance':
      prefix = '/balance';
      break;
    case 'claim':
      prefix = '/claim';
      break;
    case 'supernode':
      prefix = '/supernode';
      break;
    case 'send':
      prefix = '/send';
      break;
    case 'sendTransactions':
      prefix = '/send-transactions';
      break;
    case 'interactModules':
      prefix = '/interact-modules';
      break;
    case 'firstTimeDelegation':
      prefix = '/first-time-delegation';
      break;
    case 'stakeLUME':
      prefix = '/stake-lume';
      break;
    case 'decentralizationStake':
      prefix = '/decentralization-stake';
      break;
    case 'claimRewards':
      prefix = '/claim-rewards';
      break;
    case 'compoundRewards':
      prefix = '/compound-rewards';
      break;
    case 'firstUploadCascade':
      prefix = '/first-upload-cascade';
      break;
    case 'uploadedToCascade':
      prefix = '/uploaded-to-cascade';
      break;
    case 'uptime':
      prefix = '/uptime';
      break;
    case 'storageRequests':
      prefix = '/storage-requests';
      break;
    case 'referralLink':
      prefix = '/referral-link';
      break;
    case 'inviteUsersUploadToCascade':
      prefix = '/invite-users-upload-to-cascade';
      break;
    case 'stakeForFullSeason':
      prefix = '/stake-for-full-season';
      break;
    case 'textInput':
      prefix = '/text-input';
      break;
  }
  if (actionType === 'connect') {
    return domain;
  }
  return `${path}${prefix}`;
}

export const isValidEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(email.trim());
}
