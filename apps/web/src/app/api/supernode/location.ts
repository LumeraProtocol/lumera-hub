import dns from 'node:dns'
import util from 'node:util'

import { isValidIPv4 } from '@/utils/helpers'
import { getSupernodeHost } from '@/utils/supernode-address'

type ResolveIPv4 = (hostname: string) => Promise<string[]>

type Fetch = typeof fetch

interface IpWhoResponse {
  success?: boolean
  message?: string
  latitude?: number | null
  longitude?: number | null
  capital?: string | null
  city?: string | null
  country?: string | null
  continent?: string | null
  country_code?: string | null
}

export interface IpLocation {
  latitude: number | null
  longitude: number | null
  subdivision: string | null
  city: string | null
  country: string | null
  continent: string | null
  country_code: string | null
}

const resolveDns = util.promisify(dns.resolve4)

export const resolveSupernodeIPv4 = async (
  endpoint: string,
  resolveIPv4: ResolveIPv4 = resolveDns,
): Promise<string | null> => {
  const host = getSupernodeHost(endpoint)
  if (isValidIPv4(host)) {
    return host
  }

  const addresses = await resolveIPv4(host)
  return addresses[0] ?? null
}

export const fetchLocationFromIpWho = async (
  ip: string,
  fetchImpl: Fetch = fetch,
): Promise<IpLocation> => {
  const response = await fetchImpl(
    new URL(encodeURIComponent(ip), 'https://ipwho.is/'),
    {
      headers: { Accept: 'application/json' },
    },
  )

  if (!response.ok) {
    throw new Error(`IpWho request failed with status ${response.status}`)
  }

  const data = (await response.json()) as IpWhoResponse
  if (data.success === false) {
    throw new Error(data.message || 'IpWho request failed')
  }

  return {
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    subdivision: data.capital ?? null,
    city: data.city ?? null,
    country: data.country ?? null,
    continent: data.continent ?? null,
    country_code: data.country_code ?? null,
  }
}
