import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from './apiClient'

describe('apiRequest timeout handling', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('converts an internal timeout into a readable API error', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })))

    const request = apiRequest('/api/slow-resource')
    const assertion = expect(request).rejects.toMatchObject({
      status: 408,
      code: 'REQUEST_TIMEOUT',
      message: '服务响应超时，请稍后重试',
    })
    await vi.advanceTimersByTimeAsync(16_000)
    await assertion
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not convert an external cancellation into a timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })))
    const controller = new AbortController()
    const request = apiRequest('/api/cancelled-resource', { signal: controller.signal })
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
