import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetInput = vi.fn()
const mockSetFailed = vi.fn()
const mockSetOutput = vi.fn()
vi.mock('@actions/core', () => ({
  getInput: (...args: unknown[]) => mockGetInput(...args),
  setFailed: (...args: unknown[]) => mockSetFailed(...args),
  setOutput: (...args: unknown[]) => mockSetOutput(...args),
}))

const mockCreateSecret = vi.fn()
vi.mock('./create.js', () => ({
  createSecret: (...args: unknown[]) => mockCreateSecret(...args),
}))

import { run } from './index.js'

describe('create action entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads inputs and calls createSecret', async () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        secret: 'my-secret',
        views: '3',
        expires: '7d',
        passphrase: '',
      }
      return inputs[name] ?? ''
    })

    await run()

    expect(mockCreateSecret).toHaveBeenCalledWith({
      secret: 'my-secret',
      views: 3,
      expires: '7d',
    })
    expect(mockSetFailed).not.toHaveBeenCalled()
  })

  it('includes passphrase when provided', async () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        secret: 'my-secret',
        views: '1',
        expires: '24h',
        passphrase: 'hunter2',
      }
      return inputs[name] ?? ''
    })

    await run()

    expect(mockCreateSecret).toHaveBeenCalledWith({
      secret: 'my-secret',
      views: 1,
      expires: '24h',
      passphrase: 'hunter2',
    })
  })

  it('calls setFailed on error', async () => {
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        secret: 'test',
        views: '1',
        expires: '24h',
        passphrase: '',
      }
      return inputs[name] ?? ''
    })
    mockCreateSecret.mockRejectedValueOnce(new Error('Network failure'))

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith('Network failure')
  })
})
