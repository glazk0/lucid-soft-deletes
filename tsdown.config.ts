import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './index.ts',
    './configure.ts',
    './providers/soft_deletes_provider.ts',
    './commands/main.ts',
    './commands/make_soft_delete_migration.ts',
    './src/mixins/soft_deletes.ts',
    './src/query_builder/extend_model_query_builder.ts',
    './src/exceptions/model_not_soft_deletable.ts',
    './src/symbols.ts',
    './src/types.ts',
    './src/debug.ts',
    './stubs/main.ts',
  ],
  outDir: './build',
  unbundle: true,
  clean: true,
  format: 'esm',
  minify: 'dce-only',
  fixedExtension: false,
  dts: false,
  treeshake: false,
  target: 'esnext',
})
