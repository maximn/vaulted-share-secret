import * as core from '@actions/core'
import {
  generateKey,
  exportKey,
  encrypt,
  wrapKeyWithPassphrase,
} from '@vaulted/crypto'

const API_HOST = 'https://vaulted.fyi'

const EXPIRES_MAP: Record<string, number> = {
  '1h': 3600,
  '24h': 86400,
  '7d': 604800,
  '30d': 2592000,
}

interface CreateOptions {
  secret: string
  views: number
  expires: string
  passphrase?: string
}

export async function createSecret(opts: CreateOptions): Promise<void> {
  const key = await generateKey()
  const { ciphertext, iv } = await encrypt(opts.secret, key)

  let fragment: string
  const hasPassphrase = Boolean(opts.passphrase)

  if (opts.passphrase) {
    const { wrappedKey, salt } = await wrapKeyWithPassphrase(key, opts.passphrase)
    fragment = `${wrappedKey}.${salt}`
  } else {
    fragment = await exportKey(key)
  }

  const ttl = EXPIRES_MAP[opts.expires]

  const response = await fetch(`${API_HOST}/api/secrets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ciphertext,
      iv,
      maxViews: opts.views,
      ttl,
      hasPassphrase,
    }),
  })

  if (!response.ok) {
    const data = (await response.json()) as { error: string }
    throw new Error(`API error (${response.status}): ${data.error}`)
  }

  const { id } = (await response.json()) as { id: string }
  const url = `${API_HOST}/s/${id}#${fragment}`

  core.setOutput('id', id)
  core.setOutput('url', url)
}
