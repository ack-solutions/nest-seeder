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

function setupTsNode(force = false) {
  // Check if we're already running under ts-node
  if (!force && require.extensions['.ts']) {
    return; // TypeScript is already supported
  }
  
  try {
    // Try to resolve ts-node from current working directory
    const tsNodePath = require.resolve('ts-node', {
      paths: [process.cwd(), __dirname]
    });
    
    const tsNode = require(tsNodePath);
    
    // Register ts-node for TypeScript support
    tsNode.register({
      transpileOnly: true,
      skipProject: true, // Ignore project's tsconfig.json
      compilerOptions: {
        module: 'commonjs',
        moduleResolution: 'node',
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        target: 'ES2020',
        resolveJsonModule: true,
        strict: false,
      }
    });
  } catch (error) {
    if (!force) {
      // Only fail if we weren't forcing (which means we expected it to work or fail silently)
      // But actually, if we need it and it fails, we should error. 
      // Existing logic was fine, we just add the force check above.
      console.error('\n❌ TypeScript configuration files require ts-node to be installed.');
      console.error('\nPlease install ts-node and typescript as dev dependencies:');
      console.error('   npm install -D ts-node typescript');
      console.error('   # or');
      console.error('   pnpm add -D ts-node typescript');
      console.error('\nAlternatively, you can use a JavaScript config file (.js extension).\n');
      process.exit(1);
    }
    // If forcing and it fails, we might just let the caller handle the subsequent require failure
  }
}

async function loadSeederConfig(configPath: string) {
  // Resolve the config path relative to current working directory
  const resolvedPath = path.resolve(process.cwd(), configPath);

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Configuration file not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Setup TypeScript support if needed (lazy/soft check)
  if (configPath.endsWith('.ts')) {
    setupTsNode();
  }

  // Helper to attempt loading
  const tryLoad = async (useImport = false) => {
    // Clear require cache to ensure fresh import
    if (!useImport) {
        delete require.cache[resolvedPath];
    }

    let configModule;
    if (!useImport && (configPath.endsWith('.ts') || configPath.endsWith('.js'))) {
      configModule = require(resolvedPath);
    } else {
      configModule = await import(resolvedPath);
    }
    return configModule;
  };

  try {
    let configModule;
    try {
      configModule = await tryLoad(false);
    } catch (error) {
      // If loading failed and it's a TS file, try forcing ts-node registration and retry
      if (configPath.endsWith('.ts') && (
          error.code === 'ERR_UNKNOWN_FILE_EXTENSION' || 
          error.code === 'ERR_REQUIRE_ESM' || 
          error.message.includes('Unknown file extension') ||
          error.message.includes('must use import to load ES Module')
      )) {
        // Fallback to import()
        // We also try to register ts-node just in case it helps (though for import it needs loader)
        setupTsNode(true); 
        try {
            configModule = await tryLoad(true);
        } catch (importError) {
             if (importError.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
                 console.error('\n❌ To load ESM TypeScript files, you must use the ts-node loader.');
                 console.error('Please run with: node --loader ts-node/esm ...\n');
             }
             throw importError;
        }
      } else {
        throw error;
      }
    }
    
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
