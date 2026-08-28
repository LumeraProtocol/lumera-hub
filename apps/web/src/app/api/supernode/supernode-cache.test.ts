import { describe, expect, it, vi } from 'vitest'

import type { IMarker } from '@/hooks/useCascade'
import type { IpLocation } from '@/utils/ipwho'

import { mergeSupernodeLocations } from './supernode-cache'

const makeItem = (ip: string) => ({
  supernode_account: 'lumera1563uuzljqvpanh79w2tvymqsly73v9nwygda73',
  validator_address: 'lumeravaloper1563uuzljqvpanh79w2tvymqsly73v9nwtj7pcj',
  validator_moniker: 'Yami',
  p2p_port: 4445,
  ip_address: ip,
})

const makeDistinctItem = (ip: string, suffix: string) => ({
  ...makeItem(ip),
  supernode_account: `lumera1${suffix.padEnd(39, 'a')}`,
  validator_address: `lumeravaloper1${suffix.padEnd(39, 'b')}`,
  validator_moniker: `Node ${suffix}`,
})

const makeMarker = (address: string): IMarker => ({
  latLng: [1, 2],
  name: 'Cached',
  continent: 'Europe',
  country: 'Germany',
  country_code: 'DE',
  subdivision: 'Berlin',
  city: 'Cached',
  supernodeAccount: 'lumera1563uuzljqvpanh79w2tvymqsly73v9nwygda73',
  validatorAddress: 'lumeravaloper1563uuzljqvpanh79w2tvymqsly73v9nwtj7pcj',
  validatorMoniker: 'Yami',
  address,
  p2pPort: '4445',
})

const LOCATION: IpLocation = {
  latitude: 49.42,
  longitude: 11.07,
  subdivision: 'Berlin',
  city: 'Nuremberg',
  country: 'Germany',
  continent: 'Europe',
  country_code: 'DE',
}

describe('mergeSupernodeLocations', () => {
  it('reuses cached markers without calling the geolocation service', async () => {
    const locate = vi.fn()
    const cached = makeMarker('1.1.1.1:4444')

    const { results, isUpdate } = await mergeSupernodeLocations(
      [makeItem('1.1.1.1:4444')],
      [cached],
      locate,
    )

    expect(results).toEqual([cached])
    expect(isUpdate).toBe(false)
    expect(locate).not.toHaveBeenCalled()
  })

  it('geolocates unknown supernodes and flags the cache for rewrite', async () => {
    const locate = vi.fn().mockResolvedValue(LOCATION)

    const { results, isUpdate } = await mergeSupernodeLocations(
      [makeItem('2.2.2.2:4444')],
      [],
      locate,
    )

    expect(isUpdate).toBe(true)
    expect(locate).toHaveBeenCalledWith('2.2.2.2:4444')
    expect(results).toEqual([expect.objectContaining({
      latLng: [49.42, 11.07],
      city: 'Nuremberg',
      address: '2.2.2.2:4444',
      p2pPort: '4445',
    })])
  })

  it('skips supernodes whose lookup fails and keeps the rest', async () => {
    const locate = vi.fn()
      .mockRejectedValueOnce(new Error('IpWho request failed with status 429'))
      .mockResolvedValueOnce(LOCATION)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const { results } = await mergeSupernodeLocations(
      [makeItem('3.3.3.3:4444'), makeItem('4.4.4.4:4444')],
      [],
      locate,
    )

    expect(results).toHaveLength(1)
    expect(results[0].address).toBe('4.4.4.4:4444')
    error.mockRestore()
  })

  it('runs lookups concurrently but never more than the cap at once', async () => {
    let active = 0
    let peak = 0
    const locate = vi.fn(async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return LOCATION
    })

    const items = Array.from({ length: 12 }, (_, index) => makeItem(`5.5.5.${index}:4444`))
    const { results } = await mergeSupernodeLocations(items, [], locate, { concurrency: 3 })

    expect(results).toHaveLength(12)
    expect(locate).toHaveBeenCalledTimes(12)
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThanOrEqual(3)
  })

  it('keeps the input order for mixed cached and fresh markers', async () => {
    const locate = vi.fn().mockResolvedValue(LOCATION)
    const cached = makeMarker('7.7.7.7:4444')

    const { results } = await mergeSupernodeLocations(
      [makeItem('6.6.6.6:4444'), makeItem('7.7.7.7:4444')],
      [cached],
      locate,
    )

    expect(results.map((marker) => marker.address)).toEqual([
      '6.6.6.6:4444',
      '7.7.7.7:4444',
    ])
  })

  it('keeps current identities when multiple supernodes share one endpoint', async () => {
    const locate = vi.fn()
    const address = '8.8.8.8:4444'
    const first = makeDistinctItem(address, '1')
    const second = makeDistinctItem(address, '2')
    const cached = [
      { ...makeMarker(address), supernodeAccount: first.supernode_account },
      { ...makeMarker(address), supernodeAccount: second.supernode_account },
    ]

    const { results } = await mergeSupernodeLocations(
      [first, second],
      cached,
      locate,
    )

    expect(results.map((marker) => marker.supernodeAccount)).toEqual([
      first.supernode_account,
      second.supernode_account,
    ])
    expect(results.map((marker) => marker.validatorMoniker)).toEqual([
      first.validator_moniker,
      second.validator_moniker,
    ])
    expect(locate).not.toHaveBeenCalled()
  })

  it('normalizes cached endpoints and refreshes stale metadata', async () => {
    const locate = vi.fn()
    const item = makeItem('9.9.9.9:4444')
    item.validator_moniker = 'Current moniker'
    const cached = {
      ...makeMarker('9.9.9.9:4444 '),
      validatorMoniker: 'Old moniker',
    }

    const { results, isUpdate } = await mergeSupernodeLocations(
      [item],
      [cached],
      locate,
    )

    expect(results[0]).toEqual(expect.objectContaining({
      address: '9.9.9.9:4444',
      validatorMoniker: 'Current moniker',
    }))
    expect(isUpdate).toBe(true)
    expect(locate).not.toHaveBeenCalled()
  })
})
