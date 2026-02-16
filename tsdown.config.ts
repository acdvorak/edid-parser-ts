import { defineConfig } from 'tsdown';

export default defineConfig({
  exports: true,
  format: ['cjs', 'es'],
  dts: true,
  sourcemap: true,
  tsconfig: 'tsconfig.src.json',
});
