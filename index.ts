export { configure } from './configure.ts'
export { stubsRoot } from './stubs/main.ts'
export { SoftDeletes } from './src/mixins/soft_deletes.ts'
export { ModelNotSoftDeletableException } from './src/exceptions/model_not_soft_deletable.ts'
export { isSoftDeletable } from './src/types.ts'
export type { SoftDeletableModel, SoftDeletableInstance } from './src/types.ts'
export { SOFT_DELETES, INCLUDE_TRASHED, ONLY_TRASHED, FORCE_DELETE } from './src/symbols.ts'

import './src/types.ts'
