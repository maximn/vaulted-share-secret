import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateKey,
  exportKey,
  encrypt,
  wrapKeyWithPassphrase,
} from '@vaulted/crypto'
import { getSecret } from './get.js'

const mockSetOutput = vi.fn()
const mockSetSecret = vi.fn()
vi.mock('@actions/core', () => ({
  setOutput: (...args: unknown[]) => mockSetOutput(...args),
  setSecret: (...args: unknown[]) => mockSetSecret(...args),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('getSecret', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches, decrypts, masks, and outputs the secret', async () => {
    const key = await generateKey()
    const keyStr = await exportKey(key)
    const { ciphertext, iv } = await encrypt('my-secret-value', key)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ciphertext,
        iv,
        hasPassphrase: false,
        viewsRemaining: 2,
      }),
    })

    await getSecret({
      url: `https://vaulted.fyi/s/abc123#${keyStr}`,
    })

    expect(mockFetch).toHaveBeenCalledWith('https://vaulted.fyi/api/secrets/abc123')

    const secretCallOrder = mockSetSecret.mock.invocationCallOrder[0]
    const outputCallOrder = mockSetOutput.mock.invocationCallOrder[0]
    expect(secretCallOrder).toBeLessThan(outputCallOrder)

    expect(mockSetSecret).toHaveBeenCalledWith('my-secret-value')
    expect(mockSetOutput).toHaveBeenCalledWith('secret', 'my-secret-value')
  })

  it('masks each line of multi-line secrets individually', async () => {
    const multiLine = 'line-one\nline-two\nline-three'
    const key = await generateKey()
    const keyStr = await exportKey(key)
    const { ciphertext, iv } = await encrypt(multiLine, key)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ciphertext,
        iv,
        hasPassphrase: false,
        viewsRemaining: 1,
      }),
    })

    await getSecret({
      url: `https://vaulted.fyi/s/multi#${keyStr}`,
    })

    expect(mockSetSecret).toHaveBeenCalledWith(multiLine)
    expect(mockSetSecret).toHaveBeenCalledWith('line-one')
    expect(mockSetSecret).toHaveBeenCalledWith('line-two')
    expect(mockSetSecret).toHaveBeenCalledWith('line-three')
  })

  it('decrypts passphrase-protected secrets', async () => {
    const key = await generateKey()
    const { ciphertext, iv } = await encrypt('protected-secret', key)
    const { wrappedKey, salt } = await wrapKeyWithPassphrase(key, 'pass123')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ciphertext,
        iv,
        hasPassphrase: true,
        viewsRemaining: 0,
      }),
    })

    await getSecret({
      url: `https://vaulted.fyi/s/xyz789#${wrappedKey}.${salt}`,
      passphrase: 'pass123',
    })

    expect(mockSetSecret).toHaveBeenCalledWith('protected-secret')
    expect(mockSetOutput).toHaveBeenCalledWith('secret', 'protected-secret')
  })

  it('throws when passphrase required but not provided', async () => {
    const key = await generateKey()
    const { ciphertext, iv } = await encrypt('secret', key)
    const { wrappedKey, salt } = await wrapKeyWithPassphrase(key, 'pass')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ciphertext,
        iv,
        hasPassphrase: true,
        viewsRemaining: 1,
      }),
    })

    await expect(
      getSecret({
        url: `https://vaulted.fyi/s/test#${wrappedKey}.${salt}`,
      })
    ).rejects.toThrow('passphrase')
  })

  it('throws on 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    })

    await expect(
      getSecret({ url: 'https://vaulted.fyi/s/gone#key' })
    ).rejects.toThrow('Secret not found or already expired')
  })

  it('throws on invalid URL format', async () => {
    await expect(
      getSecret({ url: 'https://example.com/not-valid' })
    ).rejects.toThrow('Invalid Vaulted URL')
  })
})
