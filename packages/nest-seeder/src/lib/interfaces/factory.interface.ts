/**
 * Override values passed to a factory.
 *
 * Known factory properties keep their types (and autocomplete), while extra
 * keys — e.g. a foreign key set in a seeder — are allowed too.
 */
export type FactoryOverrides<T> = Partial<T> & Record<string, unknown>;

/**
 * A factory produced by `DataFactory.createForClass()`.
 */
export interface FactoryInstance<T = Record<string, any>> {
    /** Generate `count` records, applying optional overrides to each. */
    generate(count: number, overrides?: FactoryOverrides<T>): T[];

    /** Generate a single record, applying optional overrides. */
    generateOne(overrides?: FactoryOverrides<T>): T;
}
