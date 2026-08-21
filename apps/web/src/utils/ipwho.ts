/**
 * Shared mapping from an ipwho.is response to the marker location shape used
 * by the Cascade map. Both the server route (which resolves DNS first) and the
 * browser fallback in useCascade consume this, so the field mapping cannot
 * drift between them. The server resolves DNS names before calling ipwho.is.
 */
export interface IpWhoResponse {
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

export const mapIpWhoLocation = (data: IpWhoResponse): IpLocation => ({
  latitude: data.latitude ?? null,
  longitude: data.longitude ?? null,
  subdivision: data.capital ?? null,
  city: data.city ?? null,
  country: data.country ?? null,
  continent: data.continent ?? null,
  country_code: data.country_code ?? null,
})
