import type { BaseModel } from '@adonisjs/lucid/orm'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import type { DateTime } from 'luxon'
import type { INCLUDE_TRASHED, ONLY_TRASHED } from './symbols.ts'
import { SOFT_DELETES } from './symbols.ts'

/**
 * A model class branded with the SoftDeletes mixin. Use this to narrow a
 * `LucidModel` reference when you need access to the soft-delete contract.
 */
export type SoftDeletableModel = LucidModel & { readonly [SOFT_DELETES]: true }

/**
 * Shape contributed by the SoftDeletes mixin to model instances.
 */
export type SoftDeletableInstance = InstanceType<typeof BaseModel> & {
  deletedAt: DateTime | null
  readonly trashed: boolean
  restore(): Promise<SoftDeletableInstance>
  forceDelete(): Promise<void>
}

/**
 * Runtime type guard for `SoftDeletableModel`. Reads the brand symbol the
 * mixin sets on the static side of the class.
 *
 * @param model - Any Lucid model class
 * @returns True when the model class was composed with the SoftDeletes mixin
 *
 * @example
 * if (isSoftDeletable(User)) {
 *   await User.query().onlyTrashed().restore()
 * }
 */
export function isSoftDeletable(model: LucidModel): model is SoftDeletableModel {
  return (model as Partial<SoftDeletableModel>)[SOFT_DELETES] === true
}

declare module '@adonisjs/lucid/types/model' {
  interface LucidModel {
    readonly [SOFT_DELETES]?: true
  }

  interface ModelQueryBuilderContract<Model extends LucidModel, Result = InstanceType<Model>> {
    /**
     * Include soft-deleted rows in the query result. Opts the query out of
     * the global `WHERE deleted_at IS NULL` scope applied by the mixin.
     */
    withTrashed(): this

    /**
     * Return only soft-deleted rows. Replaces the global `IS NULL` filter
     * with an `IS NOT NULL` filter on the deleted-at column.
     */
    onlyTrashed(): this

    /**
     * Restore every soft-deleted row matched by the current query. Resolves
     * to the number of rows touched. Throws `ModelNotSoftDeletableException`
     * if the underlying model was not composed with the SoftDeletes mixin.
     */
    restore(): Promise<number>

    [INCLUDE_TRASHED]?: boolean
    [ONLY_TRASHED]?: boolean
  }
}
