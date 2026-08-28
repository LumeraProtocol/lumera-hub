import { accountFromAny } from '@cosmjs/stargate';
import { encodePubkey } from '@cosmjs/proto-signing';
import { describe, expect, it } from 'vitest';
import { BaseAccount } from 'cosmjs-types/cosmos/auth/v1beta1/auth';
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys';
import { Any } from 'cosmjs-types/google/protobuf/any';

const EVM_PUBKEY_TYPE = '/cosmos.evm.crypto.v1.ethsecp256k1.PubKey';
const ADDRESS = 'lumera17rxl2anj94mppyqunkch08p3h8a32zcj7p633x';
const PUBKEY = Uint8Array.from([
  3, 89, 169, 171, 153, 132, 128, 104, 177, 142, 142,
  247, 8, 146, 82, 195, 85, 149, 78, 69, 222, 15, 42,
  3, 102, 203, 69, 227, 80, 211, 114, 170, 37,
]);

describe('CosmJS Lumera EVM account support', () => {
  it('round-trips the Lumera EVM public-key type used by existing accounts', () => {
    const input = Any.fromPartial({
      typeUrl: '/cosmos.auth.v1beta1.BaseAccount',
      value: BaseAccount.encode(BaseAccount.fromPartial({
        address: ADDRESS,
        pubKey: Any.fromPartial({
          typeUrl: EVM_PUBKEY_TYPE,
          value: PubKey.encode(PubKey.fromPartial({ key: PUBKEY })).finish(),
        }),
        accountNumber: BigInt(9143),
        sequence: BigInt(4),
      })).finish(),
    });

    const account = accountFromAny(input);

    expect(account.address).toBe(ADDRESS);
    expect(account.accountNumber).toBe(BigInt(9143));
    expect(account.sequence).toBe(4);
    expect(account.pubkey?.type).toBe('os/PubKeyEthSecp256k1');
    expect(encodePubkey(account.pubkey!)).toEqual(BaseAccount.decode(input.value).pubKey);
  });
});
