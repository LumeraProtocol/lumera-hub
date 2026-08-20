import { describe, expect, it, vi } from 'vitest'

describe('store persistence during server rendering', () => {
  it('does not ask redux-persist to probe browser storage', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.resetModules()

    await import('./index')

    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('redux-persist failed to create sync storage'),
    )
    consoleError.mockRestore()
  })
})
