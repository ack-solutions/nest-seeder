import { SeederModuleOptions } from '../seeder/seeder.module';

/**
 * Interface for SeederOptionsFactory
 * Implement this interface to create a factory class for seeder configuration
 */
export interface SeederOptionsFactory {
    createSeederOptions(): Promise<SeederModuleOptions> | SeederModuleOptions;
}
