# @glazk0/lucid-soft-deletes

Laravel-style soft-delete mixin for [AdonisJS Lucid](https://lucid.adonisjs.com/) v22 on AdonisJS v7.

Adds a `deletedAt` column, a global `WHERE deleted_at IS NULL` scope, a `trashed` getter, `restore()` and `forceDelete()` instance methods, and `withTrashed()` / `onlyTrashed()` / bulk `restore()` query-builder macros.

## Install

```sh
npm i @glazk0/lucid-soft-deletes
node ace configure @glazk0/lucid-soft-deletes
```

`configure` registers the package provider in `adonisrc.ts` and adds the `make:soft-delete-migration` Ace command.

## Usage

### Apply the mixin

```ts
import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { SoftDeletes } from '@glazk0/lucid-soft-deletes'

export default class User extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
```

### Add the `deleted_at` column

```sh
node ace make:soft-delete-migration users
node ace migration:run
```

The generated migration adds a nullable, **indexed** `deleted_at` column. The index is important — the global scope appends `WHERE deleted_at IS NULL` to every query against the table.

### Soft-delete, restore, force-delete

```ts
await user.delete()       // soft delete (sets deletedAt)
user.trashed              // true
await user.restore()      // un-delete
await user.forceDelete()  // permanent delete (bypasses soft-delete)
```

### Query helpers

```ts
await User.query().withTrashed()                 // includes soft-deleted rows
await User.query().onlyTrashed()                 // returns only soft-deleted rows
await User.query().onlyTrashed().restore()       // bulk restore matching rows
```

### Override the column name

Re-declare `deletedAt` on your model:

```ts
export default class User extends compose(BaseModel, SoftDeletes) {
  @column.dateTime({ columnName: 'removed_at' })
  declare deletedAt: DateTime | null
}
```

## Gotchas

- **Raw queries bypass the scope.** `db.from('users')` is not filtered — same behavior as Laravel.
- **`firstOrCreate` / `updateOrCreate`** skip soft-deleted rows by default and can create duplicates. Use `.withTrashed()` lookups for match-or-restore flows.
- **`compose()` order matters.** Put `SoftDeletes` first after `BaseModel` so its hooks register before any other mixin's hooks.
- **`.clone()` drops the scope flag.** Explicit `query.clone()` after `withTrashed()` loses the opt-out — parity with Laravel.
- **Serialization.** `deletedAt` is serialized by default. To hide it, override with `@column.dateTime({ columnName: 'deleted_at', serializeAs: null })`.
- **Bulk `restore()` is gated.** Calling `restore()` on a query builder for a model that lacks the mixin throws `ModelNotSoftDeletableException`.

## License

MIT
