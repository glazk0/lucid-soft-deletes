import { test } from '@japa/runner'
import { BaseModel } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { SoftDeletes } from '../src/mixins/soft_deletes.ts'
import { isSoftDeletable } from '../src/types.ts'
import SoftDeletesProvider from '../providers/soft_deletes_provider.ts'
import { ModelNotSoftDeletableException } from '../src/exceptions/model_not_soft_deletable.ts'

test.group('isSoftDeletable type guard', () => {
  test('returns true for a model composed with SoftDeletes', ({ assert }) => {
    class User extends compose(BaseModel, SoftDeletes) {}
    User.boot()
    assert.isTrue(isSoftDeletable(User))
  })

  test('returns false for a plain Lucid model', ({ assert }) => {
    class Plain extends BaseModel {}
    Plain.boot()
    assert.isFalse(isSoftDeletable(Plain))
  })
})

test.group('SoftDeletesProvider', () => {
  test('boot() runs without throwing and registers query-builder macros on the prototype', async ({
    assert,
  }) => {
    const app = {} as unknown as ConstructorParameters<typeof SoftDeletesProvider>[0]
    const provider = new SoftDeletesProvider(app)
    await assert.doesNotReject(() => provider.boot())

    const { ModelQueryBuilder } = await import('@adonisjs/lucid/orm')
    const proto = ModelQueryBuilder.prototype as unknown as Record<string, unknown>
    assert.isFunction(proto.withTrashed)
    assert.isFunction(proto.onlyTrashed)
    assert.isFunction(proto.restore)
  })
})

test.group('ModelNotSoftDeletableException', () => {
  test('carries the documented code and status', ({ assert }) => {
    const err = new ModelNotSoftDeletableException('Foo')
    assert.equal(ModelNotSoftDeletableException.code, 'E_MODEL_NOT_SOFT_DELETABLE')
    assert.equal(ModelNotSoftDeletableException.status, 500)
    assert.include(err.message, 'Foo')
  })
})
