import { ModelQueryBuilder } from '@adonisjs/lucid/orm'
import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { INCLUDE_TRASHED, ONLY_TRASHED } from '../symbols.ts'
import { ModelNotSoftDeletableException } from '../exceptions/model_not_soft_deletable.ts'
import { isSoftDeletable } from '../types.ts'
import { debug } from '../debug.ts'

/**
 * Merge the macro methods (and the symbol-keyed scope flags) onto the
 * runtime `ModelQueryBuilder` class so `Macroable.macro()` accepts the new
 * names and so the rest of this file can index the symbol slots without
 * type errors.
 */
declare module '@adonisjs/lucid/orm' {
  interface ModelQueryBuilder {
    withTrashed(): this
    onlyTrashed(): this
    restore(): Promise<number>
    [INCLUDE_TRASHED]?: boolean
    [ONLY_TRASHED]?: boolean
  }
}

/**
 * Register the `withTrashed`, `onlyTrashed`, and `restore` macros on
 * Lucid's `ModelQueryBuilder`. Idempotent — `Macroable.macro()` overwrites
 * any prior registration with the same name. Called from the package
 * provider at boot time.
 *
 * `withTrashed`/`onlyTrashed` simply toggle the symbol-keyed flags that the
 * mixin's global scope hook checks; `restore` is gated by the `SOFT_DELETES`
 * brand and throws `ModelNotSoftDeletableException` if invoked on a model
 * without the mixin.
 */
export function extendModelQueryBuilder(): void {
  ModelQueryBuilder.macro('withTrashed', function (this: ModelQueryBuilder) {
    this[INCLUDE_TRASHED] = true
    debug('withTrashed on %s', this.model.name)
    return this
  })

  ModelQueryBuilder.macro('onlyTrashed', function (this: ModelQueryBuilder) {
    this[ONLY_TRASHED] = true
    debug('onlyTrashed on %s', this.model.name)
    return this
  })

  ModelQueryBuilder.macro('restore', async function (this: ModelQueryBuilder) {
    if (!isSoftDeletable(this.model)) {
      throw new ModelNotSoftDeletableException(this.model.name)
    }
    const def = this.model.$columnsDefinitions.get('deletedAt')
    if (!def) {
      throw new ModelNotSoftDeletableException(this.model.name)
    }
    this[INCLUDE_TRASHED] = true
    debug('bulk restore on %s', this.model.name)
    const result = (this as ModelQueryBuilderContract<LucidModel>)
      .whereNotNull(def.columnName)
      .update({ [def.columnName]: null })
    return result as unknown as Promise<number>
  })
}
