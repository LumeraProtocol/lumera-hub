// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as instance from '@/utils/api'
import useTrackingUser, { type TrackingOutcome } from './useTrackingUser'

vi.mock('@/utils/api', () => ({
  postExternal: vi.fn(),
}))

const track = async (
  result: { current: ReturnType<typeof useTrackingUser> },
): Promise<TrackingOutcome> => {
  let outcome: TrackingOutcome = 'transient-failure'
  await act(async () => {
    outcome = await result.current.trackingUser({ address: '0x1234' })
  })
  return outcome
}

describe('useTrackingUser', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(instance.postExternal).mockReset()
  })

  it('reports successful wallet tracking to its caller', async () => {
    sessionStorage.setItem('acquisitionSource', 'campaign')
    vi.mocked(instance.postExternal).mockResolvedValue({})
    const { result } = renderHook(() => useTrackingUser())

    expect(await track(result)).toBe('tracked')
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

  it('reports a server error as transient and warns without emitting a console error', async () => {
    const failure = { statusCode: 500, message: 'Internal server error' }
    vi.mocked(instance.postExternal).mockRejectedValue(failure)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { result } = renderHook(() => useTrackingUser())

    expect(await track(result)).toBe('transient-failure')
    expect(warn).toHaveBeenCalledWith(
      'Wallet connection tracking failed:',
      failure,
    )
    expect(error).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)

    warn.mockRestore()
    error.mockRestore()
  })

  it('reports a validation rejection as permanent so callers stop retrying the same payload', async () => {
    vi.mocked(instance.postExternal).mockRejectedValue({
      statusCode: 400,
      message: 'Validation failed',
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { result } = renderHook(() => useTrackingUser())

    expect(await track(result)).toBe('permanent-failure')

    warn.mockRestore()
  })

  it('reports rate limiting as transient so a later attempt can still record the connect', async () => {
    vi.mocked(instance.postExternal).mockRejectedValue({
      statusCode: 429,
      message: 'Rate limit exceeded',
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { result } = renderHook(() => useTrackingUser())

    expect(await track(result)).toBe('transient-failure')

    warn.mockRestore()
  })
})
