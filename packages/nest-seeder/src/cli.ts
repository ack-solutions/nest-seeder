#!/usr/bin/env node

import { SeederModule, SeederModuleExtraOptions } from './lib/seeder/seeder.module';
import { SeederOptions, SeederRunner, SeederServiceOptions, } from './lib';
import yargs from 'yargs';
import { NestFactory } from '@nestjs/core';
import { SeederService } from './lib/seeder/seeder.service';
import * as path from 'path';
import * as fs from 'fs';

interface CliArguments {
  refresh: boolean;
  name?: string[];
  dummyData: boolean;
  config: string;
}

async function parseArguments(): Promise<CliArguments> {
  const argv = await yargs(process.argv.slice(2))
    .option('refresh', {
      alias: 'r',
      type: 'boolean',
      description: 'Drop all data before seeding',
      default: false
    })
    .option('name', {
      alias: 'n',
      type: 'array',
      string: true,
      description: 'Specific seeder names to run',
    })
    .option('dummyData', {
      alias: 'd',
      type: 'boolean',
      description: 'Include dummy data',
      default: false
    })
    .option('config', {
      alias: 'c',
      type: 'string',
      description: 'Path to seeder configuration file',
      demandOption: true
    })
    .help()
    .example('nest-seed -c ./seeder.config.ts', 'Run all seeders')
    .example('nest-seed -c ./seeder.config.ts --refresh', 'Drop and reseed all data')
    .example('nest-seed -c ./seeder.config.ts --name UserSeeder', 'Run specific seeder')
    .parseAsync();

  return {
    refresh: argv.refresh,
    name: argv.name,
    dummyData: argv.dummyData,
    config: argv.config,
  };
}

function setupTsNode() {
  try {
    // Register ts-node for TypeScript support
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
      }
    });
  } catch (_error) {
    console.error('Failed to setup TypeScript support. Make sure ts-node is installed:');
    console.error('npm install -D ts-node typescript');
    process.exit(1);
  }
}

async function loadSeederConfig(configPath: string) {
  try {
    // Resolve the config path relative to current working directory
    const resolvedPath = path.resolve(process.cwd(), configPath);

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Configuration file not found: ${resolvedPath}`);
    }

    // Setup TypeScript support if needed
    if (configPath.endsWith('.ts')) {
      setupTsNode();
    }

    // Clear require cache to ensure fresh import
    delete require.cache[resolvedPath];

    // Import the configuration
    const configModule = await import(resolvedPath);
    const config = configModule.default || configModule;

    if (!config) {
      throw new Error('Configuration file must export a default configuration object');
    }

    return config;
  } catch (error) {
    console.error('Error loading seeder configuration:');
    console.error(error.message);
    console.error('\nMake sure your configuration file:');
    console.error('1. Exists at the specified path');
    console.error('2. Exports a default configuration object');
    console.error('3. Has proper TypeScript setup if using .ts files');
    process.exit(1);
  }
}

async function runSeeder() {
  try {
    const args = await parseArguments();

    console.log('🌱 Starting NestJS Seeder...');
    console.log(`📁 Loading configuration from: ${args.config}`);

    // Load the seeder configuration from specified path
    const seederConfig = await loadSeederConfig(args.config);

    const cliOptions: SeederServiceOptions = {
      refresh: args.refresh,
      name: args.name,
      dummyData: args.dummyData,
    };

    if (args.refresh) {
      console.log('🔄 Refresh mode: Will drop existing data before seeding');
    }

    if (args.name && args.name.length > 0) {
      console.log(`🎯 Running specific seeders: ${args.name.join(', ')}`);
    }

    if (args.dummyData) {
      console.log('🎲 Dummy data mode enabled');
    }

    const app = await NestFactory.createApplicationContext(
      SeederModule.register({
        ...seederConfig,
        ...cliOptions,
      }),
    );

    const seedersService = app.get(SeederService);
    await seedersService.run();

    await app.close();
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeder:');
    console.error(error.message);
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

export const seeder = (options: SeederOptions): SeederRunner => {
  return {
    async run(extraOptions: SeederModuleExtraOptions): Promise<void> {
      const cliOptions: SeederServiceOptions = {};
      const argv: any = yargs(process.argv).argv;
      if (argv.r || argv.refresh) {
        cliOptions.refresh = true;
      }

      if (argv.n || argv.name) {
        cliOptions.name = argv.n || argv.name;
      }

      if (argv.d || argv.dummyData) {
        cliOptions.dummyData = argv.d || argv.dummyData;
      }

      extraOptions = Object.assign(extraOptions, cliOptions);

      const app = await NestFactory.createApplicationContext(
        SeederModule.register({
          ...options,
          ...extraOptions,
        }),
      );

      const seedersService = app.get(SeederService);
      await seedersService.run();

      await app.close();
    },
  };
};

// Only run if this file is executed directly
if (require.main === module) {
  runSeeder();
}
