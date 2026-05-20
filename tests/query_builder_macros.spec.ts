import { test } from '@japa/runner'
import { BaseModel, ModelQueryBuilder } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { SoftDeletes } from '../src/mixins/soft_deletes.ts'
import { extendModelQueryBuilder } from '../src/query_builder/extend_model_query_builder.ts'
import { ModelNotSoftDeletableException } from '../src/exceptions/model_not_soft_deletable.ts'
import { INCLUDE_TRASHED, ONLY_TRASHED, SOFT_DELETES } from '../src/symbols.ts'

/**
 * Build a minimal stub that satisfies the bits of `ModelQueryBuilder` the
 * macros touch. We avoid `Model.query()` because that needs a real database
 * adapter; instead we call the macros via their prototype reference.
 */
function makeStubBuilder<M>(model: M) {
  const stub = Object.create(ModelQueryBuilder.prototype) as {
    model: M
    [INCLUDE_TRASHED]?: boolean
    [ONLY_TRASHED]?: boolean
    whereNotNull: (col: string) => unknown
    update: (payload: Record<string, unknown>) => Promise<number>
    __wheres: string[]
    __updates: Array<Record<string, unknown>>
  }
  stub.model = model
  stub.__wheres = []
  stub.__updates = []
  stub.whereNotNull = function (col: string) {
    this.__wheres.push(col)
    return this
  }
  stub.update = async function (payload: Record<string, unknown>) {
    this.__updates.push(payload)
    return 1
  }
  return stub
}

test.group('ModelQueryBuilder macros', (group) => {
  group.setup(() => {
    extendModelQueryBuilder()
  })

  test('extendModelQueryBuilder attaches the three macros to the prototype', ({ assert }) => {
    const proto = ModelQueryBuilder.prototype as unknown as Record<string, unknown>
    assert.isFunction(proto.withTrashed)
    assert.isFunction(proto.onlyTrashed)
    assert.isFunction(proto.restore)
  })

  test('withTrashed sets INCLUDE_TRASHED and returns the same builder', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const stub = makeStubBuilder(User)
    const ret = (stub as unknown as { withTrashed(): unknown }).withTrashed()
    assert.strictEqual(ret, stub)
    assert.isTrue(stub[INCLUDE_TRASHED])
  })

  test('onlyTrashed sets ONLY_TRASHED and returns the same builder', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const stub = makeStubBuilder(User)
    const ret = (stub as unknown as { onlyTrashed(): unknown }).onlyTrashed()
    assert.strictEqual(ret, stub)
    assert.isTrue(stub[ONLY_TRASHED])
  })

  test('restore issues an UPDATE setting the deletedAt column to null', async ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {
      static table = 'users'
    }
    User.boot()
    const stub = makeStubBuilder(User)
    const rows = await (stub as unknown as { restore(): Promise<number> }).restore()
    assert.equal(rows, 1)
    assert.deepEqual(stub.__wheres, ['deleted_at'])
    assert.deepEqual(stub.__updates, [{ deleted_at: null }])
    assert.isTrue(stub[INCLUDE_TRASHED])
  })

  test('restore throws on a model that was not composed with SoftDeletes', async ({ assert }) => {
    class Plain extends BaseModel {
      static table = 'plains'
    }
    Plain.boot()
    const stub = makeStubBuilder(Plain)
    await assert.rejects(
      () => (stub as unknown as { restore(): Promise<number> }).restore(),
      ModelNotSoftDeletableException
    )
  })

  test('restore throws when the brand is present but the deletedAt column is missing', async ({
    assert,
  }) => {
    class Broken extends BaseModel {
      static table = 'brokens'
    }
    ;(Broken as unknown as { [k: symbol]: true })[SOFT_DELETES] = true
    Broken.boot()
    const stub = makeStubBuilder(Broken)
    await assert.rejects(
      () => (stub as unknown as { restore(): Promise<number> }).restore(),
      ModelNotSoftDeletableException
    )
  })
})
