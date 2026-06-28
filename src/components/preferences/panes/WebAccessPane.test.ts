import { describe, expect, it } from 'vitest'
import {
  getConfiguredBindHost,
  hasUsableBoundUrl,
  isLoopbackBindHost,
  isWildcardBindHost,
} from './WebAccessPane'
import type { AppPreferences } from '@/types/preferences'

describe('WebAccessPane bind host helpers', () => {
  describe('isLoopbackBindHost', () => {
    it('returns true for localhost loopback addresses', () => {
      expect(isLoopbackBindHost('localhost')).toBe(true)
      expect(isLoopbackBindHost('127.0.0.1')).toBe(true)
      expect(isLoopbackBindHost('::1')).toBe(true)
    })

    it('returns false for hostnames and non-loopback IPs', () => {
      expect(isLoopbackBindHost('myhost.tailnet.ts.net')).toBe(false)
      expect(isLoopbackBindHost('100.110.76.47')).toBe(false)
      expect(isLoopbackBindHost('0.0.0.0')).toBe(false)
    })
  })

  describe('isWildcardBindHost', () => {
    it('returns true for wildcard bind addresses', () => {
      expect(isWildcardBindHost('0.0.0.0')).toBe(true)
      expect(isWildcardBindHost('::')).toBe(true)
    })

    it('returns false for hostnames and specific IPs', () => {
      expect(isWildcardBindHost('myhost.tailnet.ts.net')).toBe(false)
      expect(isWildcardBindHost('127.0.0.1')).toBe(false)
      expect(isWildcardBindHost('100.110.76.47')).toBe(false)
    })
  })

  describe('hasUsableBoundUrl', () => {
    it('returns true for hostname-based URLs', () => {
      expect(hasUsableBoundUrl('http://myhost.tailnet.ts.net:3456')).toBe(true)
    })

    it('returns true for specific IP URLs', () => {
      expect(hasUsableBoundUrl('http://100.110.76.47:3456')).toBe(true)
    })

    it('returns false for wildcard-bound URLs', () => {
      expect(hasUsableBoundUrl('http://0.0.0.0:3456')).toBe(false)
      expect(hasUsableBoundUrl('http://[::]:3456')).toBe(false)
    })
  })

  describe('getConfiguredBindHost', () => {
    it('returns the explicit bind host when set', () => {
      const prefs = {
        http_server_bind_host: 'myhost.tailnet.ts.net',
        http_server_localhost_only: true,
      } as unknown as AppPreferences

      expect(getConfiguredBindHost(prefs)).toBe('myhost.tailnet.ts.net')
    })

    it('falls back to loopback when no explicit host is set', () => {
      const prefs = {
        http_server_bind_host: null,
        http_server_localhost_only: true,
      } as unknown as AppPreferences

      expect(getConfiguredBindHost(prefs)).toBe('127.0.0.1')
    })

    it('falls back to wildcard when localhost-only is false', () => {
      const prefs = {
        http_server_bind_host: null,
        http_server_localhost_only: false,
      } as unknown as AppPreferences

      expect(getConfiguredBindHost(prefs)).toBe('0.0.0.0')
    })
  })
})
