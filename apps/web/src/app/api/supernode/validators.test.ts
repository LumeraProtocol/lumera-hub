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

  it('describes invalid Bech32 address bodies as characters, not hexadecimal', () => {
    const result = supernodeListSchema.safeParse([
      {
        ...supernode,
        supernode_account: 'not-a-lumera-address',
      },
    ])

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('38-39 characters')
      expect(result.error.issues[0]?.message).not.toContain('hex characters')
    }
  })
})
