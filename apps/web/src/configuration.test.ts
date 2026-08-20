import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const turbo = JSON.parse(
  readFileSync(new URL('../../../turbo.json', import.meta.url), 'utf8'),
) as { tasks: { build: { env: string[] } } }

describe('build environment forwarding', () => {
  it('forwards every public setting used by the merged app', () => {
    expect(turbo.tasks.build.env).toEqual(
      expect.arrayContaining([
        'NEXT_PUBLIC_GOOGLE_ANALYSICS_KEY',
        'NEXT_PUBLIC_GOOGLE_RECAPTCHA_CLIENT_SITE_KEY',
        'NEXT_PUBLIC_GOOGLE_TAG_MANAGER_KEY',
        'NEXT_PUBLIC_MAX_REQUESTS',
        'NEXT_PUBLIC_SDK_PRESET',
        'NEXT_PUBLIC_SNSCOPE_URL',
        'NEXT_PUBLIC_UPLOAD_MAX_FILES',
      ]),
    )
  })

  it('does not retain the removed WalletConnect transport settings', () => {
    expect(
      turbo.tasks.build.env.filter((key) => key.includes('WALLET_CONNECT')),
    ).toEqual([])
  })
})

describe('CSS processing', () => {
  it('removes stale external source-map references from dependency CSS', () => {
    const require = createRequire(import.meta.url)
    const plugin = require('../postcss-discard-external-source-maps.cjs') as {
      Comment: (comment: { text: string; remove: () => void }) => void
    }
    const remove = vi.fn()

    plugin.Comment({
      text: '# sourceMappingURL=interchain-ui-kit-react.cjs.css.map ',
      remove,
    })

    expect(remove).toHaveBeenCalledOnce()
  })
})
