import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { stubsRoot } from '../stubs/main.ts'

/**
 * Generate a migration that adds a nullable, indexed `deleted_at` column to
 * an existing table. The migration file is created under the application's
 * configured migrations path.
 *
 * @example
 *   node ace make:soft-delete-migration users
 */
export default class MakeSoftDeleteMigration extends BaseCommand {
  static commandName = 'make:soft-delete-migration'
  static description = 'Make a migration that adds a deleted_at column to a table'
  static options: CommandOptions = { startApp: true, allowUnknownFlags: false }

  /**
   * Name of the target table (e.g. `users`). Used by the stub to derive both
   * the file name and the `tableName` property on the schema class.
   */
  @args.string({ description: 'Name of the table (e.g. users)' })
  declare table: string

  /**
   * Resolve the stub against the package's stubs root and write the generated
   * migration file.
   */
  async run(): Promise<void> {
    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/migration/add_deleted_at.stub', {
      entity: this.app.generators.createEntity(this.table),
    })
  }
}
