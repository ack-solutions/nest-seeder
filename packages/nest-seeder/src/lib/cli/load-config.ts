import * as fs from 'fs';
import * as path from 'path';

import { SeederModuleOptions } from '../seeder/seeder.module';

/** Config file names tried, in order, when `--config` is not provided. */
export const DEFAULT_CONFIG_NAMES = [
    'seeder.config.ts',
    'seeder.config.js',
    'seeder.config.cjs',
    'seeder.config.mjs',
];

/**
 * Finds a seeder config file. When `configPath` is given it is resolved
 * relative to the cwd; otherwise the well-known file names are tried.
 *
 * @returns the absolute path, or `null` when nothing is found
 */
export function resolveConfigPath(configPath?: string): string | null {
    if (configPath) {
        const resolved = path.resolve(process.cwd(), configPath);
        return fs.existsSync(resolved) ? resolved : null;
    }

    for (const name of DEFAULT_CONFIG_NAMES) {
        const candidate = path.resolve(process.cwd(), name);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

let tsNodeRegistered = false;

export interface LoadConfigOptions {
    /**
     * Path to a tsconfig.json to register ts-node with. Takes precedence over
     * the `TS_NODE_PROJECT` environment variable. When set, the project's
     * compiler options are honored (the decorator/interop essentials are still
     * forced on).
     */
    project?: string;
}

/**
 * Registers ts-node so `.ts` config files can be required. Throws a friendly
 * error when ts-node is not installed.
 *
 * The defaults use `strict: true` on purpose: with `strictNullChecks` disabled
 * TypeScript emits `design:type = Object` for string-literal-union columns
 * (e.g. `'a' | 'b'`), which makes TypeORM throw `DataTypeNotSupportedError`.
 * `strict: true` matches how application code is normally compiled, so
 * reflect-metadata produces the same types the app sees. Point `--project`
 * (or `TS_NODE_PROJECT`) at your own tsconfig to fully control the settings.
 */
function setupTsNode(project?: string): void {
    if (tsNodeRegistered || require.extensions['.ts']) {
        tsNodeRegistered = true;
        return;
    }

    let tsNodePath: string;
    try {
        tsNodePath = require.resolve('ts-node', {
            paths: [process.cwd(), __dirname],
        });
    } catch {
        throw new Error(
            'TypeScript config files require "ts-node" and "typescript" to be installed.\n' +
                '  Install them with:  npm install -D ts-node typescript\n' +
                '  Or use a JavaScript config file (seeder.config.js).',
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tsNode = require(tsNodePath);

    const tsProject = project || process.env.TS_NODE_PROJECT;

    if (tsProject) {
        // Honor the user's tsconfig, but force the essentials so decorators and
        // default imports always work regardless of the project's settings.
        tsNode.register({
            transpileOnly: true,
            project: path.resolve(process.cwd(), tsProject),
            compilerOptions: {
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
            },
        });
    } else {
        tsNode.register({
            transpileOnly: true,
            skipProject: true,
            compilerOptions: {
                module: 'commonjs',
                moduleResolution: 'node',
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                esModuleInterop: true,
                allowSyntheticDefaultImports: true,
                skipLibCheck: true,
                target: 'ES2021',
                resolveJsonModule: true,
                strict: true,
            },
        });
    }

    tsNodeRegistered = true;
}

/**
 * Loads and returns the seeder configuration object from a config file.
 * Supports `.ts` (via ts-node), `.js`, `.cjs` and `.mjs` files.
 */
export async function loadSeederConfig(
    absolutePath: string,
    options: LoadConfigOptions = {},
): Promise<SeederModuleOptions> {
    const ext = path.extname(absolutePath);

    if (ext === '.ts') {
        setupTsNode(options.project);
    }

    let configModule: any;
    try {
        if (ext === '.mjs') {
            configModule = await import(absolutePath);
        } else {
            delete require.cache[absolutePath];
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            configModule = require(absolutePath);
        }
    } catch (error: any) {
        // ESM-only TS project: fall back to dynamic import.
        if (
            ext === '.ts' &&
            (error?.code === 'ERR_REQUIRE_ESM' ||
                error?.code === 'ERR_UNKNOWN_FILE_EXTENSION')
        ) {
            configModule = await import(absolutePath);
        } else {
            throw error;
        }
    }

    const config = configModule?.default ?? configModule;

    if (!config || typeof config !== 'object') {
        throw new Error(
            'The config file must export a configuration object as its default export.',
        );
    }

    return config as SeederModuleOptions;
}
