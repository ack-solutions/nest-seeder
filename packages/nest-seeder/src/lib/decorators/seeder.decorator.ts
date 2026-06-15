/**
 * Stable, minification-safe identifier for a seeder.
 *
 * By default the CLI selects seeders by their class name (`--name UserSeeder`).
 * That breaks when your build minifies class names. Decorate the seeder with
 * `@SeederName('users')` to give it a stable name that survives minification
 * and is nicer to type.
 *
 * @example
 * @Injectable()
 * @SeederName('users')
 * export class UserSeeder implements Seeder { ... }
 *
 * // then: nest-seed --name users
 */
const SEEDER_NAME = Symbol.for('nest-seeder:name');

export function SeederName(name: string): ClassDecorator {
    return (target: any): void => {
        Object.defineProperty(target, SEEDER_NAME, {
            value: name,
            enumerable: false,
            configurable: true,
            writable: false,
        });
    };
}

/**
 * Resolves the stable name of a seeder class or instance.
 *
 * Resolution order:
 *   1. `@SeederName('...')` decorator value
 *   2. a static `seederName` property
 *   3. the constructor name (default, not minification-safe)
 */
export function getSeederName(seeder: any): string {
    const ctor =
        typeof seeder === 'function' ? seeder : seeder?.constructor;

    return (
        ctor?.[SEEDER_NAME] ||
        ctor?.seederName ||
        ctor?.name ||
        'UnknownSeeder'
    );
}
