/** Extracts the DNS name or IP from the `host:port` shape used by SN Scope. */
export const getSupernodeHost = (endpoint: string): string => {
  const normalized = endpoint.trim()
  if (normalized.startsWith('[')) {
    const closingBracket = normalized.indexOf(']')
    return closingBracket > 1 ? normalized.slice(1, closingBracket) : normalized
  }

  const lastColon = normalized.lastIndexOf(':')
  if (
    lastColon > 0 &&
    normalized.indexOf(':') === lastColon &&
    /^\d+$/.test(normalized.slice(lastColon + 1))
  ) {
    return normalized.slice(0, lastColon)
  }

  return normalized
}

export const getAbstractIpLocationUrl = (
  ip: string,
  apiKey?: string,
): string | null => {
  if (!apiKey) {
    return null
  }
  const params = new URLSearchParams({
    api_key: apiKey,
    ip_address: ip,
  })
  return `https://ip-intelligence.abstractapi.com/v1/?${params.toString()}`
}
