import {
    Module,
    DynamicModule,
    Provider,
    Type,
    ForwardReference,
} from '@nestjs/common';

import { Seeder, SeederServiceOptions } from './seeder.interface';
import { SeederService } from './seeder.service';
import { SeederModuleAsyncOptions } from '../interfaces/seeder-module-async-options.interface';
import { SeederOptionsFactory } from '../interfaces/seeder-options-factory.interface';

export interface SeederModuleExtraOptions extends SeederServiceOptions {
    seeders?: Provider<Seeder>[];
    plugins?: any[];
}

export interface SeederModuleOptions extends SeederModuleExtraOptions {
    imports?: Array<
        Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
    >;
    providers?: Provider[];
}

const SEEDER_MODULE_OPTIONS = 'SEEDER_MODULE_OPTIONS';

@Module({})
export class SeederModule {

    static register(options: SeederModuleOptions): DynamicModule {
        return {
            module: SeederModule,
            imports: options.imports || [],
            providers: [
                ...(options.providers || []),
                ...options.seeders || [],
                {
                    provide: SeederService,
                    useFactory: (...seeders: Seeder[]): SeederService => {
                        return new SeederService(seeders, options);
                    },
                    inject: (options.seeders || []) as Type<any>[],
                },
            ],
        };
    }

    static forRootAsync(options: SeederModuleAsyncOptions): DynamicModule {
        return {
            module: SeederModule,
            global: options.isGlobal,
            imports: options.imports || [],
            providers: [
                ...this.createAsyncProviders(options),
                {
                    provide: SeederService,
                    useFactory:  (seederOptions: SeederModuleOptions, ...seeders: Seeder[]): Promise<SeederService> | SeederService => {
                        return new SeederService(seeders, seederOptions);
                    },
                    inject: [SEEDER_MODULE_OPTIONS, ...(options.inject || []) as Type<any>[]],
                },
            ],
        };
    }

    private static createAsyncProviders(options: SeederModuleAsyncOptions): Provider[] {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }

        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: options.useClass!,
                useClass: options.useClass!,
            },
        ];
    }

    private static createAsyncOptionsProvider(options: SeederModuleAsyncOptions): Provider {
        if (options.useFactory) {
            return {
                provide: SEEDER_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }

        return {
            provide: SEEDER_MODULE_OPTIONS,
            useFactory: async (optionsFactory: SeederOptionsFactory) =>
                await optionsFactory.createSeederOptions(),
            inject: [options.useExisting || options.useClass!],
        };
    }
}
