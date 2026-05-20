import { Exception } from '@poppinss/utils/exception'

/**
 * Thrown when a soft-delete-only operation (e.g. the bulk `restore()` query-
 * builder macro) is invoked against a model that was not composed with the
 * `SoftDeletes` mixin.
 */
export class ModelNotSoftDeletableException extends Exception {
  static status = 500
  static code = 'E_MODEL_NOT_SOFT_DELETABLE'

  /**
   * @param modelName - Name of the Lucid model the operation was attempted on
   */
  constructor(modelName: string) {
    super(
      `Cannot run soft-delete operation on "${modelName}": the model is not composed with the SoftDeletes mixin.`
    )
  }
}
