import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../stubs/main.ts'

/**
 * Generate a migration that adds a nullable, indexed `deleted_at` column to
 * an existing table. The migration file is created under
 * `database/migrations/` with a unix-timestamp prefix.
 *
 * @example
 *   node ace make:soft-delete-migration users
 */
export default class MakeSoftDeleteMigration extends BaseCommand {
  static commandName = 'make:soft-delete-migration'
  static description = 'Make a migration that adds a deleted_at column to a table'
  static options: CommandOptions = { startApp: true, allowUnknownFlags: false }

  /**
   * Name of the target table (e.g. `users`). The string is normalized to
   * a snake_case, pluralized table name via `app.generators.tableName()`
   * before being interpolated into the stub.
   */
  @args.string({ description: 'Name of the table (e.g. users)' })
  declare table: string

  /**
   * Resolve the stub against the package's stubs root and write the
   * generated migration file. The stub receives `migration.tableName` and
   * `migration.fileName` rather than computing them from a string chain,
   * so it stays compatible across @poppinss/string API changes.
   */
  async run(): Promise<void> {
    const entity = this.app.generators.createEntity(this.table)
    const tableName = this.app.generators.tableName(entity.name)
    const fileName = `${new Date().getTime()}_add_deleted_at_to_${tableName}_table.ts`

    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/migration/add_deleted_at.stub', {
      entity,
      migration: { tableName, fileName },
    })
  }
}
