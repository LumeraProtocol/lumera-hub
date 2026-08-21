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

const normalizeEndpoint = (endpoint: string) => endpoint.trim()

const fromCachedMarker = (
  item: SupernodeItem,
  cached: IMarker,
): IMarker => ({
  ...cached,
  // Location belongs to the endpoint, but all identity fields belong to the
  // current SN Scope response. Multiple supernodes can legitimately advertise
  // the same endpoint, so copying a cached marker wholesale can give one node
  // another node's account and validator metadata.
  supernodeAccount: item.supernode_account,
  validatorAddress: item.validator_address,
  validatorMoniker: item.validator_moniker,
  address: normalizeEndpoint(item.ip_address),
  p2pPort: item.p2p_port.toString(),
})

const markerMatchesItem = (marker: IMarker, item: SupernodeItem) =>
  marker.supernodeAccount === item.supernode_account &&
  marker.validatorAddress === item.validator_address &&
  marker.validatorMoniker === item.validator_moniker &&
  normalizeEndpoint(marker.address) === normalizeEndpoint(item.ip_address) &&
  marker.address === normalizeEndpoint(item.ip_address) &&
  marker.p2pPort === item.p2p_port.toString()

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
    address: normalizeEndpoint(item.ip_address),
    p2pPort: item.p2p_port.toString(),
  }
}

/**
 * Merges the cached markers with the incoming supernode list. Cached entries
 * are matched by account and address in O(1); the unknown remainder is geolocated with a
 * bounded worker pool (each lookup is an external DNS + HTTP round trip).
 * Failed lookups are skipped so one throttled response cannot empty the map.
 */
export const mergeSupernodeLocations = async (
  items: SupernodeItem[],
  currentSupernodes: IMarker[],
  locateSupernode: LocateSupernode,
  { concurrency = DEFAULT_CONCURRENCY }: MergeOptions = {},
): Promise<{ results: IMarker[]; isUpdate: boolean }> => {
  const cachedByAccount = new Map(
    currentSupernodes.map((supernode) => [supernode.supernodeAccount, supernode]),
  )
  const cachedByAddress = new Map(
    currentSupernodes.map((supernode) => [normalizeEndpoint(supernode.address), supernode]),
  )
  let cacheChanged = currentSupernodes.length !== items.length
  const results: (IMarker | null)[] = items.map((item) => {
    const endpoint = normalizeEndpoint(item.ip_address)
    const accountMatch = cachedByAccount.get(item.supernode_account)
    // Account identity is only useful when it still advertises the same
    // endpoint. If it moved, its old coordinates must not follow it.
    const cached = accountMatch && normalizeEndpoint(accountMatch.address) === endpoint
      ? accountMatch
      : cachedByAddress.get(endpoint)
    if (!cached) return null
    if (!markerMatchesItem(cached, item)) cacheChanged = true
    return fromCachedMarker(item, cached)
  })
  const missing = items
    .map((item, index) => ({ item, index }))
    .filter((_, index) => results[index] === null)

  let cursor = 0
  const worker = async () => {
    while (cursor < missing.length) {
      const { item, index } = missing[cursor]
      cursor += 1
      try {
        const data = await locateSupernode(normalizeEndpoint(item.ip_address))
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
    isUpdate: missing.length > 0 || cacheChanged,
  }
}
