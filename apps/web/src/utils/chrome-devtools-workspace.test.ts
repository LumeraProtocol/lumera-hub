import { describe, expect, it } from 'vitest'

import { isWslEnvironment } from './chrome-devtools-workspace'

describe('isWslEnvironment', () => {
  it('detects the WSL distribution environment variable', () => {
    expect(isWslEnvironment({ WSL_DISTRO_NAME: 'Ubuntu' })).toBe(true)
  })

  it('detects the WSL interop environment variable', () => {
    expect(isWslEnvironment({ WSL_INTEROP: '/run/WSL/123_interop' })).toBe(
      true,
    )
  })

  it('does not disable DevTools workspaces on native hosts', () => {
    expect(isWslEnvironment({})).toBe(false)
  })
})
