import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { SoftDeletes } from '../src/mixins/soft_deletes.ts'
import {
  FORCE_DELETE,
  INCLUDE_TRASHED,
  ONLY_TRASHED,
  SCOPE_APPLIED,
  SOFT_DELETES,
} from '../src/symbols.ts'

test.group('SoftDeletes mixin — class shape', () => {
  test('brands the model class with the SOFT_DELETES symbol', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    assert.equal(User[SOFT_DELETES], true)
  })

  test('registers a deletedAt column on the model', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    const def = User.$columnsDefinitions.get('deletedAt')
    assert.exists(def)
    assert.equal(def?.columnName, 'deleted_at')
    assert.equal(def?.serializeAs, 'deletedAt')
  })

  test('honors a column-name override declared on the consumer model', ({ assert }) => {
    class Article extends compose(BaseModel, SoftDeletes) {
      @column.dateTime({ columnName: 'removed_at' })
      declare deletedAt: DateTime | null
    }
    Article.boot()
    const def = Article.$columnsDefinitions.get('deletedAt')
    assert.equal(def?.columnName, 'removed_at')
  })
})

test.group('SoftDeletes mixin — instance behavior', () => {
  test('trashed getter is false on a fresh instance', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    const u = new User()
    u.deletedAt = null
    assert.isFalse(u.trashed)
  })

  test('trashed getter is true once deletedAt is set', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    const u = new User()
    u.deletedAt = DateTime.now()
    assert.isTrue(u.trashed)
  })

  test('restore() is a no-op when the instance is not trashed', async ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    const u = new User()
    u.deletedAt = null
    let saveCalled = 0
    u.save = async () => {
      saveCalled += 1
      return u
    }
    const result = await u.restore()
    assert.strictEqual(result, u)
    assert.equal(saveCalled, 0)
  })

  test('restore() clears deletedAt and persists when trashed', async ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    const u = new User()
    u.deletedAt = DateTime.now()
    let saveCalled = 0
    u.save = async () => {
      saveCalled += 1
      return u
    }
    await u.restore()
    assert.isNull(u.deletedAt)
    assert.equal(saveCalled, 1)
  })

  test('delete() soft-deletes by default', async ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    const u = new User()
    u.deletedAt = null
    let saveCalled = 0
    u.save = async () => {
      saveCalled += 1
      return u
    }
    await u.delete()
    assert.isTrue(DateTime.isDateTime(u.deletedAt))
    assert.equal(saveCalled, 1)
  })

  test('forceDelete() sets the FORCE_DELETE flag and calls through to super.delete()', async ({
    assert,
  }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    const u = new User()
    let observedFlag: boolean | undefined
    let superCalled = 0
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(u)) as { delete: () => Promise<void> }
    proto.delete = async function () {
      observedFlag = (this as unknown as { [FORCE_DELETE]?: boolean })[FORCE_DELETE]
      superCalled += 1
    }
    await u.forceDelete()
    assert.equal(superCalled, 1)
    assert.isTrue(observedFlag)
    assert.isFalse(u[FORCE_DELETE])
  })
})

/**
 * Build a stub standing in for a `ModelQueryBuilder`, exposing the members the
 * scope hooks touch and recording every predicate they append.
 *
 * @param model - The model class the stub query targets
 * @returns A recording stub whose `__calls` array holds the applied predicates
 */
function makeStubQuery<M>(model: M) {
  return {
    model,
    __calls: [] as Array<{ method: string; arg: string }>,
    whereNull(col: string) {
      this.__calls.push({ method: 'whereNull', arg: col })
      return this
    },
    whereNotNull(col: string) {
      this.__calls.push({ method: 'whereNotNull', arg: col })
      return this
    },
  } as {
    model: M
    __calls: Array<{ method: string; arg: string }>
    whereNull(col: string): unknown
    whereNotNull(col: string): unknown
    [INCLUDE_TRASHED]?: boolean
    [ONLY_TRASHED]?: boolean
    [SCOPE_APPLIED]?: boolean
  }
}

test.group('SoftDeletes mixin — global scope hook', () => {
  test('adds whereNull on the qualified deletedAt column by default', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const query = makeStubQuery(User)
    User.ignoreTrashedScope(query as unknown as Parameters<typeof User.ignoreTrashedScope>[0])
    assert.deepEqual(query.__calls, [{ method: 'whereNull', arg: 'users.deleted_at' }])
  })

  test('skips the filter when INCLUDE_TRASHED is set', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const query = makeStubQuery(User)
    query[INCLUDE_TRASHED] = true
    User.ignoreTrashedScope(query as unknown as Parameters<typeof User.ignoreTrashedScope>[0])
    assert.deepEqual(query.__calls, [])
  })

  test('uses whereNotNull when ONLY_TRASHED is set', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const query = makeStubQuery(User)
    query[ONLY_TRASHED] = true
    User.ignoreTrashedScope(query as unknown as Parameters<typeof User.ignoreTrashedScope>[0])
    assert.deepEqual(query.__calls, [{ method: 'whereNotNull', arg: 'users.deleted_at' }])
  })

  test('ignoreTrashedScope is idempotent across repeated calls', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const query = makeStubQuery(User)
    User.ignoreTrashedScope(query as unknown as Parameters<typeof User.ignoreTrashedScope>[0])
    User.ignoreTrashedScope(query as unknown as Parameters<typeof User.ignoreTrashedScope>[0])
    assert.deepEqual(query.__calls, [{ method: 'whereNull', arg: 'users.deleted_at' }])
  })
})

test.group('SoftDeletes mixin — paginate count query', () => {
  test('propagateScopeToCount copies flags from row query to count query', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const rowQuery = { [INCLUDE_TRASHED]: true }
    const countQuery = makeStubQuery(User)
    User.propagateScopeToCount([countQuery, rowQuery] as unknown as Parameters<
      typeof User.propagateScopeToCount
    >[0])
    assert.isTrue(countQuery[INCLUDE_TRASHED])
    assert.isUndefined(countQuery[ONLY_TRASHED])
  })

  test('scopes the count query to non-trashed rows on an unscoped query', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const countQuery = makeStubQuery(User)
    User.propagateScopeToCount([countQuery, {}] as unknown as Parameters<
      typeof User.propagateScopeToCount
    >[0])
    assert.deepEqual(countQuery.__calls, [{ method: 'whereNull', arg: 'users.deleted_at' }])
  })

  test('counts only trashed rows when the row query is onlyTrashed', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const countQuery = makeStubQuery(User)
    User.propagateScopeToCount([countQuery, { [ONLY_TRASHED]: true }] as unknown as Parameters<
      typeof User.propagateScopeToCount
    >[0])
    assert.isTrue(countQuery[ONLY_TRASHED])
    assert.deepEqual(countQuery.__calls, [{ method: 'whereNotNull', arg: 'users.deleted_at' }])
  })

  test('leaves the count query unconstrained when the row query is withTrashed', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const countQuery = makeStubQuery(User)
    User.propagateScopeToCount([countQuery, { [INCLUDE_TRASHED]: true }] as unknown as Parameters<
      typeof User.propagateScopeToCount
    >[0])
    assert.deepEqual(countQuery.__calls, [])
  })

  test('honors a column-name override on the count query', ({ assert }) => {
    class Article extends compose(BaseModel, SoftDeletes) {
      static table = 'articles'

      @column.dateTime({ columnName: 'removed_at' })
      declare deletedAt: DateTime | null
    }
    Article.boot()
    const countQuery = makeStubQuery(Article)
    Article.propagateScopeToCount([countQuery, {}] as unknown as Parameters<
      typeof Article.propagateScopeToCount
    >[0])
    assert.deepEqual(countQuery.__calls, [{ method: 'whereNull', arg: 'articles.removed_at' }])
  })

  test('does not re-apply the scope if the count query was already scoped', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const countQuery = makeStubQuery(User)
    countQuery[SCOPE_APPLIED] = true
    User.propagateScopeToCount([countQuery, {}] as unknown as Parameters<
      typeof User.propagateScopeToCount
    >[0])
    assert.deepEqual(countQuery.__calls, [])
  })
})
