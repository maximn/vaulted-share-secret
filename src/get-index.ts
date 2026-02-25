import * as core from '@actions/core'
import { getSecret } from './get.js'

export async function run(): Promise<void> {
  try {
    const url = core.getInput('url', { required: true })
    const passphrase = core.getInput('passphrase')

    const opts: { url: string; passphrase?: string } = { url }
    if (passphrase) {
      opts.passphrase = passphrase
    }

    await getSecret(opts)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    core.setFailed(message)
  }
}

if (!process.env.VITEST) {
  run()
}
