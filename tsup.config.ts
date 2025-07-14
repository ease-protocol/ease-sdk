// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/enclave/index.ts',
    'src/login/index.ts',
    'src/join/index.ts',
    'src/logout/index.ts',
    'src/phone/index.ts',
    'src/transaction/index.ts',
    'src/wallet/index.ts',
    'src/utils/type.ts',
    'src/utils/crypto.ts',
    'src/refresh/index.ts',
  ], // ← point to your file(s)
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: false,
  sourcemap: true,
  minify: true,
});
