import { describe, expect, it, vi } from 'vitest'

import { getCascadeBalanceMicroLume } from './cascade-balance'

const EVM_ADDRESS = '0x1111111111111111111111111111111111111111'

describe('Cascade wallet balance', () => {
  it('uses the EVM RPC for an EVM wallet instead of sending 0x to Cosmos Bank', async () => {
    const getCosmosBalances = vi.fn()
    const getEvmAccountBalance = vi.fn().mockResolvedValue('0xde0b6b3a7640000')

    await expect(
      getCascadeBalanceMicroLume({
        address: EVM_ADDRESS,
        isEvm: true,
        getCosmosBalances,
        getEvmAccountBalance,
      }),
    ).resolves.toBe(1_000_000)

    expect(getEvmAccountBalance).toHaveBeenCalledWith(EVM_ADDRESS)
    expect(getCosmosBalances).not.toHaveBeenCalled()
  })

  it('sums only native-denom balances for a Cosmos wallet', async () => {
    const getCosmosBalances = vi.fn().mockResolvedValue({
      data: {
        balances: [
          { denom: 'ulume', amount: '1200000' },
          { denom: 'ibc/other', amount: '9999999' },
        ],
      },
    })

    await expect(
      getCascadeBalanceMicroLume({
        address: 'lumera1account',
        isEvm: false,
        getCosmosBalances,
      }),
    ).resolves.toBe(1_200_000)
  })
})
