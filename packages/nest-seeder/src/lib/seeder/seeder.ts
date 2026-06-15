import {
    Provider,
    Type,
    DynamicModule,
    ForwardReference,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import {
    SeederModule,
    SeederModuleExtraOptions,
    SeederModuleOptions,
} from './seeder.module';
import { SeederService } from './seeder.service';


export interface SeederOptions {
    imports?: Array<
        Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
    >;
    providers?: Provider[];
}

export interface SeederRunner {
    run(extraOptions?: SeederModuleExtraOptions): Promise<void>;
}

async function bootstrap(options: SeederModuleOptions): Promise<void> {
    const app = await NestFactory.createApplicationContext(
        SeederModule.register(options),
        { logger: ['error', 'warn', 'log'] },
    );

    try {
        const seedersService = app.get(SeederService);
        await seedersService.run();
    } finally {
        await app.close();
    }
}

/**
 * Programmatic entry point. Prefer the `nest-seed` CLI for most workflows; use
 * this when you need to seed from your own script.
 *
 * @example
 * await seeder({ imports: [AppModule] }).run({ seeders: [UserSeeder], refresh: true });
 */
export const seeder = (options: SeederOptions): SeederRunner => {
    return {
        run(extraOptions: SeederModuleExtraOptions = {}): Promise<void> {
            return bootstrap({
                ...options,
                ...extraOptions,
            });
        },
    };
};
