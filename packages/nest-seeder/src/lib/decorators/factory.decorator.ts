import { Faker } from '@faker-js/faker';

import { FactoryMetadataStorage } from '../storages/factory.metadata.storage';


type BaseType = string | number | Date | Buffer | boolean | Record<string, any>;

export type FactoryValue = BaseType | Array<BaseType>;

/**
 * A generator function invoked for each generated record.
 *
 * @param faker the shared Faker instance
 * @param ctx   the partially-built record (override values + already-generated
 *              fields), useful for derived values via `dependsOn`
 */
export type FactoryValueGenerator = (
    faker: Faker,
    ctx: Record<string, any>
) => FactoryValue;

/**
 * Marks a class property as a generated field.
 *
 * @param generator a generator function or a static value
 * @param dependsOn names of other factory properties that must be generated
 *                  before this one (resolved transitively)
 *
 * @example
 * class UserFactory {
 *   @Factory((faker) => faker.person.firstName())
 *   firstName: string;
 *
 *   @Factory((faker, ctx) => `${ctx.firstName}@example.com`.toLowerCase(), ['firstName'])
 *   email: string;
 * }
 */
export function Factory(
    generator: FactoryValueGenerator | FactoryValue,
    dependsOn?: string[],
) {
    return (
        target: Record<string, any>,
        propertyKey: string | symbol,
    ): void => {
        FactoryMetadataStorage.addPropertyMetadata({
            target: target.constructor,
            propertyKey: propertyKey as string,
            arg: {
                generator,
                dependsOn,
            },
        });
    };
}
