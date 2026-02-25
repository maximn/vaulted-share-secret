import * as core from '@actions/core'
import { createSecret } from './create.js'

export async function run(): Promise<void> {
  try {
    const secret = core.getInput('secret', { required: true })
    const views = parseInt(core.getInput('views') || '1', 10)
    const expires = core.getInput('expires') || '24h'
    const passphrase = core.getInput('passphrase')

    const opts: { secret: string; views: number; expires: string; passphrase?: string } = {
      secret,
      views,
      expires,
    }
    if (passphrase) {
      opts.passphrase = passphrase
    }

    await createSecret(opts)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    core.setFailed(message)
  }
}

if (!process.env.VITEST) {
  run()
}
