import { Type, ModuleMetadata } from '@nestjs/common';
import { SeederModuleOptions } from '../seeder/seeder.module';
import { SeederOptionsFactory } from './seeder-options-factory.interface';

/**
 * Async options for SeederModule configuration
 */
export interface SeederModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /**
     * Make the module global
     */
    isGlobal?: boolean;

    /**
     * Use a factory function to create options
     */
    useFactory?: (...args: any[]) => Promise<SeederModuleOptions> | SeederModuleOptions;

    /**
     * Use a class that implements SeederOptionsFactory
     */
    useClass?: Type<SeederOptionsFactory>;

    /**
     * Use an existing provider
     */
    useExisting?: Type<SeederOptionsFactory>;

    /**
     * Dependencies to inject into the factory function or class
     */
    inject?: any[];
}
