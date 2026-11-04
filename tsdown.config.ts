import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  outDir: 'dist',
  clean: true,
  target: 'node20',
  platform: 'node',
  outExtensions(context) {
    // package.json has "type": "module": ESM keeps plain .js, CJS gets .cjs.
    // tsdown reports ESM builds as "es" internally, so branch on non-CJS.
    if (context.format !== 'cjs') {
      return { js: '.js', dts: '.d.ts' }
    }
    return { js: '.cjs', dts: '.d.cts' }
  },
})
