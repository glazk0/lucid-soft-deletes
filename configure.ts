import type Configure from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.ts'

/**
 * Configure hook for `@glazk0/lucid-soft-deletes`. Registers the provider
 * and command in the consumer's `adonisrc.ts`, then drops a reference
 * example file showing the `compose()` pattern.
 *
 * Run via `node ace configure @glazk0/lucid-soft-deletes`.
 *
 * @param command - The Adonis configure command instance, used to create
 *   codemods that modify the consumer's project files.
 */
export async function configure(command: Configure): Promise<void> {
  const codemods = await command.createCodemods()

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@glazk0/lucid-soft-deletes/providers/soft_deletes_provider')
    rcFile.addCommand('@glazk0/lucid-soft-deletes/commands')
  })

  await codemods.makeUsingStub(stubsRoot, 'config/soft_deletes.stub', {})
}
