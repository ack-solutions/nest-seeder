import { SeederModuleOptions } from '../seeder/seeder.module';

/**
 * The shape of a `seeder.config.ts` default export.
 */
export type SeederConfig = SeederModuleOptions;

/**
 * Identity helper that gives you full type-checking and IntelliSense for your
 * seeder configuration. Using it is optional — a plain object works too — but
 * it catches typos and surfaces the available options as you type.
 *
 * @example
 * // seeder.config.ts
 * import { defineSeederConfig } from '@ackplus/nest-seeder';
 *
 * export default defineSeederConfig({
 *   imports: [TypeOrmModule.forRoot({ ... }), TypeOrmModule.forFeature([User])],
 *   seeders: [UserSeeder],
 * });
 */
export function defineSeederConfig(config: SeederConfig): SeederConfig {
    return config;
}
