#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

import { NestFactory } from '@nestjs/core';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { getSeederName } from './lib/decorators/seeder.decorator';
import { loadSeederConfig, resolveConfigPath } from './lib/cli/load-config';
import { OrmType, scaffoldFiles } from './lib/cli/templates';
import { SeederModule } from './lib/seeder/seeder.module';
import { SeederService } from './lib/seeder/seeder.service';
import type { SeederServiceOptions } from './lib/seeder/seeder.interface';

const log = {
    info: (msg: string) => console.log(msg),
    error: (msg: string) => console.error(`\x1b[31m${msg}\x1b[0m`),
    success: (msg: string) => console.log(`\x1b[32m${msg}\x1b[0m`),
    dim: (msg: string) => console.log(`\x1b[2m${msg}\x1b[0m`),
};

function parseContext(raw?: string): Record<string, any> | undefined {
    if (!raw) {
        return undefined;
    }
    try {
        return JSON.parse(raw);
    } catch {
        throw new Error(`--context must be valid JSON. Received: ${raw}`);
    }
}

/** Loads the config and builds the Nest application context. */
async function createContext(configOption?: string) {
    const configPath = resolveConfigPath(configOption);

    if (!configPath) {
        throw new Error(
            configOption
                ? `Config file not found: ${configOption}`
                : 'No seeder config found. Create a seeder.config.ts (try "nest-seed init") ' +
                  'or pass one with --config.',
        );
    }

    log.dim(`Using config: ${path.relative(process.cwd(), configPath)}`);
    const config = await loadSeederConfig(configPath);
    return { config, configPath };
}

async function runCommand(argv: any): Promise<void> {
    const { config } = await createContext(argv.config);

    const options: SeederServiceOptions = {
        refresh: argv.refresh,
        name: argv.name,
        dryRun: argv['dry-run'],
        continueOnError: argv['continue-on-error'],
        dummyData: argv['dummy-data'],
        context: parseContext(argv.context),
    };

    if (options.refresh) log.info('🔄 Refresh mode: dropping data before seeding');
    if (options.dryRun) log.info('🔎 Dry run: no data will be written');
    if (options.name) {
        const names = Array.isArray(options.name) ? options.name : [options.name];
        log.info(`🎯 Seeders: ${names.join(', ')}`);
    }

    const app = await NestFactory.createApplicationContext(
        SeederModule.register({ ...config, ...options }),
        { logger: ['error', 'warn', 'log'] },
    );

    try {
        await app.get(SeederService).run();
    } finally {
        await app.close();
    }

    log.success('✅ Seeding completed successfully!');
}

async function listCommand(argv: any): Promise<void> {
    const { config } = await createContext(argv.config);
    const seeders = config.seeders ?? [];

    if (seeders.length === 0) {
        log.info('No seeders registered in the config.');
        return;
    }

    log.info(`Registered seeders (${seeders.length}):`);
    seeders.forEach((seeder: any, index: number) => {
        const className = seeder?.name ?? 'Unknown';
        const stableName = getSeederName(seeder);
        const alias = stableName !== className ? `  (--name ${stableName})` : '';
        log.info(`  ${index + 1}. ${className}${alias}`);
    });
}

function initCommand(argv: any): void {
    const orm = argv.orm as OrmType;
    const force = Boolean(argv.force);
    const files = scaffoldFiles(orm);

    let created = 0;
    let skipped = 0;

    for (const file of files) {
        const absolute = path.resolve(process.cwd(), file.path);
        if (fs.existsSync(absolute) && !force) {
            log.dim(`• skipped (exists): ${file.path}`);
            skipped++;
            continue;
        }
        fs.mkdirSync(path.dirname(absolute), { recursive: true });
        fs.writeFileSync(absolute, file.contents);
        log.success(`• created: ${file.path}`);
        created++;
    }

    log.info(`\nScaffolded ${created} file(s)${skipped ? `, skipped ${skipped}` : ''}.`);
    log.info('\nNext steps:');
    log.info('  1. Adjust seeder.config.ts for your database and entities.');
    log.info('  2. Add a script to package.json:');
    log.dim('       "seed": "nest-seed"');
    log.info('  3. Run it:');
    log.dim('       npm run seed');
    if (skipped && !force) {
        log.dim('\nUse --force to overwrite existing files.');
    }
}

async function main(): Promise<void> {
    await yargs(hideBin(process.argv))
        .scriptName('nest-seed')
        .usage('$0 [command] [options]')
        .command(
            ['$0', 'run'],
            'Run seeders (default command)',
            (y) =>
                y
                    .option('config', {
                        alias: 'c',
                        type: 'string',
                        describe: 'Path to the seeder config file (auto-detected if omitted)',
                    })
                    .option('refresh', {
                        alias: 'r',
                        type: 'boolean',
                        default: false,
                        describe: 'Drop data before seeding',
                    })
                    .option('name', {
                        alias: 'n',
                        type: 'array',
                        string: true,
                        describe: 'Run only the named seeder(s)',
                    })
                    .option('dry-run', {
                        type: 'boolean',
                        default: false,
                        describe: 'Show which seeders would run without executing them',
                    })
                    .option('continue-on-error', {
                        type: 'boolean',
                        default: false,
                        describe: 'Keep going when a seeder fails',
                    })
                    .option('context', {
                        type: 'string',
                        describe: 'JSON forwarded to every seeder via options.context',
                    })
                    .option('dummy-data', {
                        alias: 'd',
                        type: 'boolean',
                        default: false,
                        describe: '[deprecated] forwarded as options.dummyData',
                    }),
            runCommand,
        )
        .command(
            'init',
            'Scaffold a seeder config, factory and seeder',
            (y) =>
                y
                    .option('orm', {
                        type: 'string',
                        choices: ['typeorm', 'mongoose'] as const,
                        default: 'typeorm',
                        describe: 'Which ORM template to scaffold',
                    })
                    .option('force', {
                        type: 'boolean',
                        default: false,
                        describe: 'Overwrite existing files',
                    }),
            (argv) => initCommand(argv),
        )
        .command(
            'list',
            'List the seeders registered in the config',
            (y) =>
                y.option('config', {
                    alias: 'c',
                    type: 'string',
                    describe: 'Path to the seeder config file (auto-detected if omitted)',
                }),
            listCommand,
        )
        .example('$0', 'Run all seeders using the auto-detected config')
        .example('$0 --refresh', 'Drop and reseed all data')
        .example('$0 --name users posts', 'Run only the "users" and "posts" seeders')
        .example('$0 init', 'Scaffold starter files')
        .example('$0 list', 'List available seeders')
        .strict()
        .alias('h', 'help')
        .alias('v', 'version')
        .fail((msg, err) => {
            // Re-throw real errors so the catch in `bootstrap` handles them.
            if (err) throw err;
            log.error(`\n${msg}`);
            console.error('\nRun "nest-seed --help" for usage.');
            process.exit(1);
        })
        .parseAsync();
}

async function bootstrap(): Promise<void> {
    log.info('🌱 nest-seeder');
    try {
        await main();
        process.exit(0);
    } catch (error: any) {
        log.error(`\n❌ ${error?.message ?? error}`);
        if (error?.stack && process.env.NEST_SEEDER_DEBUG) {
            console.error(error.stack);
        } else {
            log.dim('Set NEST_SEEDER_DEBUG=1 for a full stack trace.');
        }
        process.exit(1);
    }
}

// Only run when invoked directly (not when imported).
if (require.main === module) {
    bootstrap();
}
