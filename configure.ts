import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configure hook for `@glazk0/lucid-soft-deletes`. Registers the package
 * provider and Ace command in the consumer's `adonisrc.ts`.
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
}
