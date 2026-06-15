import { defineConfig } from 'tsup';

export default defineConfig([
    {
        // Library entry — dual ESM + CJS with type declarations.
        entry: { index: 'src/index.ts' },
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        target: 'node18',
        outDir: 'dist',
    },
    {
        // CLI binary — CJS only (needs dynamic require for ts-node).
        entry: { cli: 'src/cli.ts' },
        format: ['cjs'],
        dts: false,
        sourcemap: true,
        clean: false,
        target: 'node18',
        outDir: 'dist',
        // The shebang is preserved from src/cli.ts by esbuild.
    },
]);
