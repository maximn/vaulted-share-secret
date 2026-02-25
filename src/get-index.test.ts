import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetInput = vi.fn()
const mockSetFailed = vi.fn()
const mockSetOutput = vi.fn()
const mockSetSecret = vi.fn()
vi.mock('@actions/core', () => ({
  getInput: (...args: unknown[]) => mockGetInput(...args),
  setFailed: (...args: unknown[]) => mockSetFailed(...args),
  setOutput: (...args: unknown[]) => mockSetOutput(...args),
  setSecret: (...args: unknown[]) => mockSetSecret(...args),
}))

const mockGetSecret = vi.fn()
vi.mock('./get.js', () => ({
  getSecret: (...args: unknown[]) => mockGetSecret(...args),
}))

import { run } from './get-index.js'

describe('get action entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads inputs and calls getSecret', async () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        url: 'https://vaulted.fyi/s/abc#key',
        passphrase: '',
      }
      return inputs[name] ?? ''
    })

    await run()

    expect(mockGetSecret).toHaveBeenCalledWith({
      url: 'https://vaulted.fyi/s/abc#key',
    })
    expect(mockSetFailed).not.toHaveBeenCalled()
  })

  it('includes passphrase when provided', async () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        url: 'https://vaulted.fyi/s/abc#key',
        passphrase: 'secret-pass',
      }
      return inputs[name] ?? ''
    })

    await run()

    expect(mockGetSecret).toHaveBeenCalledWith({
      url: 'https://vaulted.fyi/s/abc#key',
      passphrase: 'secret-pass',
    })
  })

  it('calls setFailed on error', async () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        url: 'https://vaulted.fyi/s/abc#key',
        passphrase: '',
      }
      return inputs[name] ?? ''
    })
    mockGetSecret.mockRejectedValueOnce(new Error('Secret not found'))

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith('Secret not found')
  })
})
