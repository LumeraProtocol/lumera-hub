import { describe, expect, it } from 'vitest'

import { buildReferralLink } from './referral-link'

describe('buildReferralLink', () => {
  it('always puts the referral code in the expected query parameter', () => {
    expect(buildReferralLink('https://hub.example/', 'lumera1abc')).toBe(
      'https://hub.example/?referral_code=lumera1abc',
    )
  })

  it('escapes referral codes before placing them in a URL', () => {
    expect(buildReferralLink('https://hub.example', 'code/with spaces')).toBe(
      'https://hub.example/?referral_code=code%2Fwith%20spaces',
    )
  })
})
