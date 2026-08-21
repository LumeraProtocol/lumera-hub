import { describe, expect, it } from 'vitest'

import {
  canUseBrowserIpGeolocation,
  getAbstractIpLocationUrl,
  getSupernodeHost,
} from './supernode-address'

describe('getSupernodeHost', () => {
  it.each([
    ['supernode-lumera.onenov.xyz:4445', 'supernode-lumera.onenov.xyz'],
    ['159.69.68.253:4450', '159.69.68.253'],
    ['159.69.68.253', '159.69.68.253'],
    ['[2001:db8::1]:4445', '2001:db8::1'],
  ])('extracts the host from %s', (endpoint, expected) => {
    expect(getSupernodeHost(endpoint)).toBe(expected)
  })

  it('does not construct an Abstract API request without a configured key', () => {
    expect(getAbstractIpLocationUrl('38.242.154.120')).toBeNull()
    expect(getAbstractIpLocationUrl('38.242.154.120', '')).toBeNull()
  })

  it('only sends IPv4 literals to browser geolocation providers', () => {
    expect(canUseBrowserIpGeolocation('38.242.154.120')).toBe(true)
    expect(canUseBrowserIpGeolocation('supernode-lumera.onenov.xyz')).toBe(false)
    expect(canUseBrowserIpGeolocation('2001:db8::1')).toBe(false)
  })
})
