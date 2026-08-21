import type { IMarker } from '@/hooks/useCascade'
import type { IpLocation } from '@/utils/ipwho'
import type { SupernodeItem } from '@/app/api/supernode/validators'

type LocateSupernode = (endpoint: string) => Promise<IpLocation | null>

interface MergeOptions {
  concurrency?: number
}

// Keeps a burst of unknown supernodes from turning into one ipwho.is call per
// item in sequence, while staying polite to its rate limit.
const DEFAULT_CONCURRENCY = 5

const toMarker = (item: SupernodeItem, data: IpLocation): IMarker | null => {
  if (data.latitude == null || data.longitude == null) return null
  return {
    latLng: [data.latitude, data.longitude],
    name: data.city || '',
    continent: data.continent || '',
    country: data.country || '',
    country_code: data.country_code || '',
    subdivision: data.subdivision || '',
    city: data.city || '',
    supernodeAccount: item.supernode_account,
    validatorAddress: item.validator_address,
    validatorMoniker: item.validator_moniker,
    address: item.ip_address,
    p2pPort: item.p2p_port.toString(),
  }
}

/**
 * Merges the cached markers with the incoming supernode list. Cached entries
 * are matched by address in O(1); the unknown remainder is geolocated with a
 * bounded worker pool (each lookup is an external DNS + HTTP round trip).
 * Failed lookups are skipped so one throttled response cannot empty the map.
 */
export const mergeSupernodeLocations = async (
  items: SupernodeItem[],
  currentSupernodes: IMarker[],
  locateSupernode: LocateSupernode,
  { concurrency = DEFAULT_CONCURRENCY }: MergeOptions = {},
): Promise<{ results: IMarker[]; isUpdate: boolean }> => {
  const cachedByAddress = new Map(
    currentSupernodes.map((supernode) => [supernode.address, supernode]),
  )
  const results: (IMarker | null)[] = items.map(
    (item) => cachedByAddress.get(item.ip_address) ?? null,
  )
  const missing = items
    .map((item, index) => ({ item, index }))
    .filter((_, index) => results[index] === null)

  let cursor = 0
  const worker = async () => {
    while (cursor < missing.length) {
      const { item, index } = missing[cursor]
      cursor += 1
      try {
        const data = await locateSupernode(item.ip_address)
        if (data) {
          results[index] = toMarker(item, data)
        }
      } catch (error) {
        console.error(error)
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.max(1, Math.min(concurrency, missing.length)) },
      worker,
    ),
  )

  return {
    results: results.filter((marker): marker is IMarker => marker !== null),
    isUpdate: missing.length > 0,
  }
}
