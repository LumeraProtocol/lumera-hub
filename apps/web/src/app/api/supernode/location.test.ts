import { describe, expect, it, vi } from 'vitest'

import { fetchLocationFromIpWho, resolveSupernodeIPv4 } from './location'

describe('resolveSupernodeIPv4', () => {
  it('resolves a hostname without passing its port to DNS', async () => {
    const resolveIPv4 = vi.fn().mockResolvedValue(['38.242.154.120'])

    await expect(
      resolveSupernodeIPv4('supernode-lumera.onenov.xyz:4445', resolveIPv4),
    ).resolves.toBe('38.242.154.120')
    expect(resolveIPv4).toHaveBeenCalledWith('supernode-lumera.onenov.xyz')
  })

  it('does not resolve an endpoint that already contains an IPv4 address', async () => {
    const resolveIPv4 = vi.fn()

    await expect(
      resolveSupernodeIPv4('159.69.68.253:4450', resolveIPv4),
    ).resolves.toBe('159.69.68.253')
    expect(resolveIPv4).not.toHaveBeenCalled()
  })
})

describe('fetchLocationFromIpWho', () => {
  it('uses the native URL/fetch path and preserves zero coordinates', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        latitude: 0,
        longitude: 0,
        capital: 'Capital',
        city: 'City',
        country: 'Country',
        continent: 'Continent',
        country_code: 'CC',
      }),
    }) as unknown as typeof fetch

    await expect(fetchLocationFromIpWho('8.8.8.8', fetchImpl)).resolves.toEqual(
      {
        latitude: 0,
        longitude: 0,
        subdivision: 'Capital',
        city: 'City',
        country: 'Country',
        continent: 'Continent',
        country_code: 'CC',
      },
    )
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('https://ipwho.is/8.8.8.8'),
      { headers: { Accept: 'application/json' } },
    )
  })

  it('rejects unsuccessful HTTP responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }) as unknown as typeof fetch

    await expect(fetchLocationFromIpWho('8.8.8.8', fetchImpl)).rejects.toThrow(
      'IpWho request failed with status 429',
    )
  })
})
