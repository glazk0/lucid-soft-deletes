import type { ApplicationService } from '@adonisjs/core/types'
import { extendModelQueryBuilder } from '../src/query_builder/extend_model_query_builder.ts'

/**
 * Boot-time provider for `@glazk0/lucid-soft-deletes`. Attaches the
 * `withTrashed`, `onlyTrashed`, and `restore` macros to Lucid's
 * `ModelQueryBuilder`. The provider holds no per-request state and does
 * nothing in `register`, `start`, `ready`, or `shutdown`.
 */
export default class SoftDeletesProvider {
  /**
   * @param app - The Adonis application service (unused; accepted to match
   *   the provider signature contract).
   */
  constructor(protected app: ApplicationService) {}

  /**
   * Register the query-builder macros. Idempotent — `Macroable.macro()`
   * overwrites any existing macro with the same name.
   */
  async boot(): Promise<void> {
    extendModelQueryBuilder()
  }
}
