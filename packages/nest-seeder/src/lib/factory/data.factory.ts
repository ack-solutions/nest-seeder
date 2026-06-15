import { faker } from '@faker-js/faker';
import { Type } from '@nestjs/common';

import { FactoryInstance, FactoryOverrides } from '../interfaces';
import {
    FactoryMetadataStorage,
    PropertyMetadataType,
} from '../storages/factory.metadata.storage';


export class DataFactory {

    /**
     * Creates a factory for a class decorated with `@Factory` properties.
     *
     * @example
     * const factory = DataFactory.createForClass(UserFactory);
     * const users = factory.generate(10);
     * const admin = factory.generateOne({ role: 'admin' });
     */
    static createForClass<T = Record<string, any>>(
        target: Type<T>,
    ): FactoryInstance<T> {
        if (!target) {
            throw new Error(
                'A target class is required by "DataFactory.createForClass()" but received "undefined".',
            );
        }

        const properties =
            FactoryMetadataStorage.getPropertyMetadatasByTarget(target as Type<unknown>);

        return {
            generate: (count: number, overrides: FactoryOverrides<T> = {}): T[] => {
                if (!Number.isInteger(count) || count < 0) {
                    throw new Error(
                        `"generate(count)" expects a non-negative integer but received "${count}".`,
                    );
                }
                const records: T[] = [];
                for (let i = 0; i < count; i++) {
                    records.push(DataFactory.generateOne<T>(properties, overrides));
                }
                return records;
            },
            generateOne: (overrides: FactoryOverrides<T> = {}): T =>
                DataFactory.generateOne<T>(properties, overrides),
        };
    }

    private static generateOne<T>(
        properties: PropertyMetadataType[],
        overrides: FactoryOverrides<T>,
    ): T {
        const overrideValues = (overrides ?? {}) as Record<string, any>;

        // The context seeds dependency resolution and starts from the
        // overrides so that generators can read passed-in values.
        const ctx: Record<string, any> = { ...overrideValues };

        // The result always includes overrides — even keys that are not
        // declared with `@Factory` (e.g. a foreign key set in a seeder).
        const result: Record<string, any> = { ...overrideValues };

        const propertyByKey = new Map<string, PropertyMetadataType>();
        for (const property of properties) {
            propertyByKey.set(property.propertyKey, property);
        }

        const resolving = new Set<string>();

        const ensure = (key: string): any => {
            if (key in ctx) {
                return ctx[key];
            }

            const property = propertyByKey.get(key);
            if (!property) {
                return undefined;
            }

            // Guard against circular `dependsOn` chains.
            if (resolving.has(key)) {
                return undefined;
            }
            resolving.add(key);

            const { generator, dependsOn } = property.arg;

            if (Array.isArray(dependsOn)) {
                for (const dependency of dependsOn) {
                    ensure(dependency);
                }
            }

            ctx[key] =
                typeof generator === 'function' ? generator(faker, ctx) : generator;

            resolving.delete(key);
            return ctx[key];
        };

        for (const property of properties) {
            const key = property.propertyKey;

            // An explicit override always wins.
            if (key in overrideValues) {
                ctx[key] = overrideValues[key];
                result[key] = overrideValues[key];
                continue;
            }

            result[key] = ensure(key);
        }

        return result as T;
    }

}
