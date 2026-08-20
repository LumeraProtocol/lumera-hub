import { describe, expect, it } from 'vitest'

import { supernodeListSchema } from './validators'

const supernode = {
  supernode_account: 'lumera190wt6k6n4xvww034pttxqzjxnmeedfykn4ywuk',
  validator_address: 'lumeravaloper17rxl2anj94mppyqunkch08p3h8a32zcj3mfdh9',
  validator_moniker: 'Aurora Staking',
  p2p_port: 4451,
  ip_address: '159.69.68.253:4450',
}

describe('supernodeListSchema', () => {
  it('accepts valid active nodes whose assigned P2P port is not 4445', () => {
    expect(supernodeListSchema.parse([supernode])).toEqual([supernode])
  })

  it.each([0, 65536])('rejects an out-of-range P2P port: %s', (p2pPort) => {
    expect(() =>
      supernodeListSchema.parse([
        {
          ...supernode,
          p2p_port: p2pPort,
        },
      ]),
    ).toThrow()
  })
})
