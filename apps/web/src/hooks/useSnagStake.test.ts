// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as instance from '@/utils/api'
import useSnagStake from './useSnagStake'

const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  params: { loyaltyRuleID: 'rule-1' },
}))

vi.mock('next/navigation', () => ({
  useParams: () => mocks.params,
}))
vi.mock('react-toastify', () => ({
  toast: {
    success: mocks.success,
  },
}))
vi.mock('@/utils/api', () => ({
  postExternal: vi.fn(),
}))

describe('useSnagStake', () => {
  beforeEach(() => {
    vi.mocked(instance.postExternal).mockReset()
    mocks.success.mockReset()
  })

  it('does not leave loading enabled when the transaction link is empty', async () => {
    const { result } = renderHook(() => useSnagStake())

    await act(async () => {
      await result.current.verifyStaked()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.message).toEqual({
      type: 'error',
      content: 'The transaction link is required.',
    })
    expect(instance.postExternal).not.toHaveBeenCalled()
  })

  it('clears loading when verification fails', async () => {
    vi.mocked(instance.postExternal).mockRejectedValue(
      new Error('Verification failed'),
    )
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const { result } = renderHook(() => useSnagStake())

    act(() => result.current.setTxhash('https://explorer.example/tx/ABC123'))
    await act(async () => {
      await result.current.verifyStaked()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.message).toEqual({
      type: 'error',
      content: 'Verification failed',
    })
    consoleError.mockRestore()
  })
})
