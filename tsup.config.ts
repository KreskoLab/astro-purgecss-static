import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm',],
  outDir: 'dist',
  clean: true,
  dts: true,
  minify: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  platform: 'node'
});
