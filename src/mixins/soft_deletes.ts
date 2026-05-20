import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import {
  type BaseModel,
  beforeFetch,
  beforeFind,
  beforePaginate,
  column,
} from '@adonisjs/lucid/orm'
import type { LucidModel, LucidRow, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import { debug } from '../debug.ts'
import { FORCE_DELETE, INCLUDE_TRASHED, ONLY_TRASHED, SOFT_DELETES } from '../symbols.ts'

/**
 * Internal augmentation of `ModelQueryBuilderContract` that exposes the
 * symbol-keyed scope flags as typed properties. Scoped to this file so the
 * mixin can read/write them without `any` casts while keeping the rest of
 * the codebase free of these implementation details.
 */
type ScopedQuery<Model extends LucidModel> = ModelQueryBuilderContract<
  Model,
  InstanceType<Model>
> & {
  [INCLUDE_TRASHED]?: boolean
  [ONLY_TRASHED]?: boolean
}

/**
 * Resolve the actual database column name for the `deletedAt` property on a
 * model class. Reads `$columnsDefinitions` so the lookup respects any
 * `@column.dateTime({ columnName: '...' })` override the consumer declared
 * on their own model.
 *
 * @param model - The Lucid model class to inspect
 * @returns The database column name backing `deletedAt`
 * @throws When the model has no `deletedAt` column registered
 */
function deletedAtColumn(model: LucidModel): string {
  const def = model.$columnsDefinitions.get('deletedAt')
  if (!def) {
    throw new Error(
      `Model "${model.name}" is composed with SoftDeletes but has no "deletedAt" column definition`
    )
  }
  return def.columnName
}

/**
 * Composable mixin that adds Laravel-style soft-delete behavior to a Lucid
 * model. Adds a `deletedAt` column, a global `WHERE deleted_at IS NULL` scope,
 * a `trashed` getter, `restore()` and `forceDelete()` instance methods, and
 * static `withTrashed()` / `onlyTrashed()` query starters.
 *
 * Query-builder chaining (`User.query().withTrashed()`, etc.) is wired up by
 * the package provider via `extendModelQueryBuilder`.
 *
 * @param superclass - The base model (or a schema class extending BaseModel)
 *   to extend.
 *
 * @example
 *   import { compose } from '@adonisjs/core/helpers'
 *   import { BaseModel } from '@adonisjs/lucid/orm'
 *   import { SoftDeletes } from '@glazk0/lucid-soft-deletes'
 *
 *   export default class User extends compose(BaseModel, SoftDeletes) {}
 *
 * @example
 *   // Override the column name on a per-model basis
 *   export default class User extends compose(BaseModel, SoftDeletes) {
 *     @column.dateTime({ columnName: 'removed_at' })
 *     declare deletedAt: DateTime | null
 *   }
 */
export function SoftDeletes<Superclass extends NormalizeConstructor<typeof BaseModel>>(
  superclass: Superclass
) {
  class ModelWithSoftDeletes extends superclass {
    static readonly [SOFT_DELETES] = true as const

    /**
     * Re-declare the inherited members the mixin needs to reach through
     * `this`. `declare` emits no runtime code; it just teaches TypeScript
     * that these `LucidRow` members are reachable, which `NormalizeConstructor`
     * would otherwise hide from the static view of the superclass.
     */
    declare save: () => Promise<this>
    declare $primaryKeyValue: LucidRow['$primaryKeyValue']

    @column.dateTime({ columnName: 'deleted_at', serializeAs: 'deletedAt' })
    declare deletedAt: DateTime | null;

    declare [FORCE_DELETE]?: boolean

    /**
     * `true` when the row is currently soft-deleted (i.e. has a non-null
     * `deletedAt` timestamp).
     */
    get trashed(): boolean {
      return this.deletedAt !== null
    }

    /**
     * Default global scope: filters out soft-deleted rows. Skipped when the
     * query builder is marked via `withTrashed()`. Inverted to
     * `WHERE deleted_at IS NOT NULL` when marked via `onlyTrashed()`.
     *
     * Generic over `Model extends typeof ModelWithSoftDeletes` so the hook
     * stays typed even though the surrounding mixin uses a `NormalizeConstructor`
     * superclass.
     */
    @beforeFind()
    @beforeFetch()
    static ignoreTrashedScope<Model extends typeof ModelWithSoftDeletes>(
      query: ScopedQuery<Model>
    ): void {
      if (query[INCLUDE_TRASHED]) return
      const col = deletedAtColumn(query.model)
      const qualified = `${query.model.table}.${col}`
      if (query[ONLY_TRASHED]) {
        query.whereNotNull(qualified)
        return
      }
      query.whereNull(qualified)
    }

    /**
     * Propagate scope flags from the row query to the count query when
     * `paginate()` is used. Without this, `withTrashed().paginate(...)`
     * would count only non-trashed rows.
     */
    @beforePaginate()
    static propagateScopeToCount<Model extends typeof ModelWithSoftDeletes>(
      queries: [ScopedQuery<Model>, ScopedQuery<Model>]
    ): void {
      const [countQuery, rowQuery] = queries
      if (rowQuery[INCLUDE_TRASHED]) countQuery[INCLUDE_TRASHED] = true
      if (rowQuery[ONLY_TRASHED]) countQuery[ONLY_TRASHED] = true
    }

    /**
     * Soft-delete the row by default. When the `FORCE_DELETE` flag is set on
     * the instance (via `forceDelete()`), fall through to the inherited
     * `delete()` so the row is permanently removed.
     */
    async delete(): Promise<void> {
      if (this[FORCE_DELETE]) {
        debug('forceDelete on %s id=%s', this.constructor.name, this.$primaryKeyValue)
        return super.delete()
      }
      debug('soft-delete on %s id=%s', this.constructor.name, this.$primaryKeyValue)
      this.deletedAt = DateTime.now()
      await this.save()
    }

    /**
     * Permanently delete the row, bypassing the soft-delete behavior. The
     * instance becomes detached after the call and cannot be restored.
     */
    async forceDelete(): Promise<void> {
      this[FORCE_DELETE] = true
      try {
        await this.delete()
      } finally {
        this[FORCE_DELETE] = false
      }
    }

    /**
     * Clear the `deletedAt` timestamp and persist the change.
     *
     * @returns The restored instance (for chaining).
     */
    async restore(): Promise<this> {
      if (!this.trashed) return this
      this.deletedAt = null
      await this.save()
      debug('restored %s id=%s', this.constructor.name, this.$primaryKeyValue)
      return this
    }
  }

  return ModelWithSoftDeletes
}
