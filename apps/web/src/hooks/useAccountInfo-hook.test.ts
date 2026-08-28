// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  wallet: {
    address: 'lumera1accounta',
    bech32Address: 'lumera1accounta',
    isEvm: false,
  },
}))

vi.mock('@/utils/api', () => ({ get: mocks.get }))
vi.mock('@/hooks/useWalletConnect', () => ({
  default: () => ({
    ...mocks.wallet,
    getClient: vi.fn(),
  }),
}))
vi.mock('@/hooks/useTrackingHubTransaction', () => ({
  default: () => ({ trackingHubTransaction: vi.fn() }),
}))

const { default: useAccountInfo } = await import('./useAccountInfo')

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const responseFor = (path: string, amount: string) => {
  if (path.includes('/balances/'))
    return { data: { balances: [{ denom: 'ulume', amount }] } }
  if (path.includes('/delegations/'))
    return { data: { delegation_responses: [] } }
  if (path.includes('/rewards')) return { data: { rewards: [], total: [] } }
  return { data: { unbonding_responses: [] } }
}

const flush = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useAccountInfo wallet changes', () => {
  beforeEach(() => {
    mocks.wallet.address = 'lumera1accounta'
    mocks.wallet.bech32Address = 'lumera1accounta'
    mocks.wallet.isEvm = false
    mocks.get.mockReset()
  })

  it('does not let a slower previous wallet overwrite the active wallet', async () => {
    const accountA = deferred()
    const accountB = deferred()
    mocks.get.mockImplementation(async (path: string) => {
      if (path.includes('lumera1accounta')) {
        await accountA.promise
        return responseFor(path, '1000000')
      }
      await accountB.promise
      return responseFor(path, '2000000')
    })

    const { result, rerender } = renderHook(() => useAccountInfo())
    await flush()

    mocks.wallet.address = 'lumera1accountb'
    mocks.wallet.bech32Address = 'lumera1accountb'
    rerender()
    await flush()

    accountB.resolve()
    await flush()
    expect(result.current.accountInfo?.balances).toEqual([
      { denom: 'ulume', amount: '2000000' },
    ])
    expect(result.current.claimInfo.senderAddress).toBe('lumera1accountb')

    accountA.resolve()
    await flush()
    expect(result.current.accountInfo?.balances).toEqual([
      { denom: 'ulume', amount: '2000000' },
    ])
    expect(result.current.claimInfo.senderAddress).toBe('lumera1accountb')
  })
})
