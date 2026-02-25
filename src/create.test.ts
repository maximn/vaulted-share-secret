import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSecret } from './create.js'

const mockSetOutput = vi.fn()
const mockSetFailed = vi.fn()
vi.mock('@actions/core', () => ({
  setOutput: (...args: unknown[]) => mockSetOutput(...args),
  setFailed: (...args: unknown[]) => mockSetFailed(...args),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('createSecret', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('encrypts secret and posts to API, sets url and id outputs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'test-id-123' }),
    })

    await createSecret({
      secret: 'my-api-key',
      views: 1,
      expires: '24h',
    })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [fetchUrl, fetchOpts] = mockFetch.mock.calls[0]
    expect(fetchUrl).toBe('https://vaulted.fyi/api/secrets')
    expect(fetchOpts.method).toBe('POST')

    const body = JSON.parse(fetchOpts.body)
    expect(body.ciphertext).toBeTruthy()
    expect(body.iv).toBeTruthy()
    expect(body.maxViews).toBe(1)
    expect(body.ttl).toBe(86400)
    expect(body.hasPassphrase).toBe(false)

    expect(mockSetOutput).toHaveBeenCalledWith('id', 'test-id-123')
    expect(mockSetOutput).toHaveBeenCalledWith(
      'url',
      expect.stringMatching(/^https:\/\/vaulted\.fyi\/s\/test-id-123#.+/)
    )
  })

  it('handles passphrase-protected secrets', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'pp-id' }),
    })

    await createSecret({
      secret: 'protected-secret',
      views: 3,
      expires: '1h',
      passphrase: 'hunter2',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.hasPassphrase).toBe(true)

    const urlCall = mockSetOutput.mock.calls.find((c: unknown[]) => c[0] === 'url')
    const fragment = (urlCall![1] as string).split('#')[1]
    expect(fragment).toContain('.')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limited' }),
    })

    await expect(
      createSecret({ secret: 'test', views: 1, expires: '24h' })
    ).rejects.toThrow('API error (429): Rate limited')
  })
})
