/**
 * Brand applied to model classes that mix in SoftDeletes. The query-builder
 * `restore()` macro uses this to refuse running against models that do not
 * carry the mixin.
 */
export const SOFT_DELETES = Symbol('lucid-soft-deletes:soft_deletes')

/**
 * Flag set on a `ModelQueryBuilder` by `withTrashed()` to opt out of the
 * default-exclusion scope.
 */
export const INCLUDE_TRASHED = Symbol('lucid-soft-deletes:include_trashed')

/**
 * Flag set on a `ModelQueryBuilder` by `onlyTrashed()` to invert the
 * default-exclusion scope.
 */
export const ONLY_TRASHED = Symbol('lucid-soft-deletes:only_trashed')

/**
 * Flag set on a model instance by `forceDelete()` to make the overridden
 * `delete()` call through to `super.delete()` instead of soft-deleting.
 */
export const FORCE_DELETE = Symbol('lucid-soft-deletes:force_delete')
