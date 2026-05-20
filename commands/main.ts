import type { CommandMetaData } from '@adonisjs/core/types/ace'

/**
 * Static index of commands shipped by @glazk0/lucid-soft-deletes.
 *
 * AdonisJS resolves commands published by a package by importing the
 * package's "commands" entry and calling getMetaData() / getCommand().
 * Mirrors how @adonisjs/lucid (and @filipebraida/adonis-auditing) expose
 * their commands without relying on the generated commands.json file.
 */
const commands: Array<{
  commandName: string
  importer: () => Promise<{ default: { serialize(): CommandMetaData } }>
}> = [
  {
    commandName: 'make:soft-delete-migration',
    importer: () => import('./make_soft_delete_migration.js'),
  },
]

let metaDataCache: CommandMetaData[] | null = null

/**
 * Returns the metadata for every command in this package. Ace reads this
 * to build its help output and to know which command names the package
 * claims.
 */
export async function getMetaData(): Promise<CommandMetaData[]> {
  if (metaDataCache) return metaDataCache
  const items = await Promise.all(
    commands.map(async ({ importer }) => {
      const mod = await importer()
      return mod.default.serialize()
    })
  )
  metaDataCache = items
  return items
}

/**
 * Resolves the actual command class once the user invokes it. Returns
 * null if Ace asks for a command name we don't own.
 */
export async function getCommand(metaData: CommandMetaData) {
  const match = commands.find(({ commandName }) => commandName === metaData.commandName)
  if (!match) return null
  const mod = await match.importer()
  return mod.default
}
