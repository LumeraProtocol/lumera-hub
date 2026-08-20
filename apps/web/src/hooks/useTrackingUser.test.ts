// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as instance from '@/utils/api'
import useTrackingUser from './useTrackingUser'

vi.mock('@/utils/api', () => ({
  postExternal: vi.fn(),
}))

describe('useTrackingUser', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(instance.postExternal).mockReset()
  })

  it('reports successful wallet tracking to its caller', async () => {
    sessionStorage.setItem('acquisitionSource', 'campaign')
    vi.mocked(instance.postExternal).mockResolvedValue({})
    const { result } = renderHook(() => useTrackingUser())

    let didTrack = false
    await act(async () => {
      didTrack = await result.current.trackingUser({ address: '0x1234' })
    })

    expect(didTrack).toBe(true)
    expect(instance.postExternal).toHaveBeenCalledWith(
      '/api/admin/trackings/save-wallet-connect',
      {
        address: '0x1234',
        acquisitionSource: 'campaign',
        referralCode: null,
      },
    )
    expect(result.current.isLoading).toBe(false)
  })

  it('returns false and warns without emitting a console error when tracking fails', async () => {
    const failure = { statusCode: 500, message: 'Internal server error' }
    vi.mocked(instance.postExternal).mockRejectedValue(failure)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { result } = renderHook(() => useTrackingUser())

    let didTrack = true
    await act(async () => {
      didTrack = await result.current.trackingUser({ address: '0x1234' })
    })

    expect(didTrack).toBe(false)
    expect(warn).toHaveBeenCalledWith(
      'Wallet connection tracking failed:',
      failure,
    )
    expect(error).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)

    warn.mockRestore()
    error.mockRestore()
  })
})
