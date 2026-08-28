// @vitest-environment jsdom
import { fireEvent, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as instance from '@/utils/api'
import useSnag from './useSnag'

const mocks = vi.hoisted(() => ({
  chain: {
    address: '',
    status: 'Disconnected',
  },
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@interchain-kit/react', () => ({
  useChain: () => mocks.chain,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))
vi.mock('react-toastify', () => ({
  toast: {
    success: mocks.success,
    error: mocks.error,
  },
}))
vi.mock('@/utils/api', () => ({
  postExternal: vi.fn(),
}))
vi.mock('@/contants/network', () => ({
  CHAIN_NAME: 'lumera-testnet',
}))

describe('useSnag', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="connectWallet">Connect</button>'
    window.history.replaceState(
      {},
      '',
      '/snag/wallet/connect?walletAddress=snag-user',
    )
    sessionStorage.clear()
    mocks.chain.address = ''
    mocks.chain.status = 'Disconnected'
    mocks.push.mockReset()
    mocks.success.mockReset()
    mocks.error.mockReset()
    vi.mocked(instance.postExternal).mockReset()
    vi.mocked(instance.postExternal).mockResolvedValue({})
  })

  it('registers one click listener, submits once after connection, and removes the listener', async () => {
    const button = document.querySelector('#connectWallet') as HTMLButtonElement
    const addListener = vi.spyOn(button, 'addEventListener')
    const removeListener = vi.spyOn(button, 'removeEventListener')
    const { result, rerender, unmount } = renderHook(() => useSnag())

    fireEvent.click(button)
    mocks.chain.address = 'lumera1connected'
    mocks.chain.status = 'Connected'
    rerender()

    await waitFor(() => expect(instance.postExternal).toHaveBeenCalledTimes(1))
    expect(instance.postExternal).toHaveBeenCalledWith('/api/snag/save-user', {
      lumeraAddress: 'lumera1connected',
      snagAddress: 'snag-user',
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mocks.push).toHaveBeenCalledWith('/')

    rerender()
    expect(instance.postExternal).toHaveBeenCalledTimes(1)
    expect(addListener).toHaveBeenCalledTimes(1)

    unmount()
    expect(removeListener).toHaveBeenCalledWith('click', expect.any(Function))
  })
})
