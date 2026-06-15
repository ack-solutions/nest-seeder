# API Reference

Everything `@ackplus/nest-seeder` exports, at a glance. Each entry links to a page with full signatures and examples.

Most projects only need three things: a [factory](/guide/factories) (using `@Factory` + `DataFactory`), a [seeder](/guide/seeders) (implementing `Seeder`), and a [config file](/guide/configuration) (via `defineSeederConfig`). Then you run the [CLI](/guide/cli). The rest of the surface is there for advanced and programmatic use.

## One import to rule them all

Everything is exported from the package root — no deep imports needed.

```ts
import {
  // Factories
  DataFactory,
  Factory,
  // Seeders
  Seeder,
  SeederName,
  getSeederName,
  // Config
  defineSeederConfig,
  // Module & service (advanced / programmatic)
  SeederModule,
  SeederService,
  seeder,
} from '@ackplus/nest-seeder';
```

::: tip
You'll also want Faker for your generators:

```ts
import { faker } from '@faker-js/faker';
```

It's passed to every `@Factory` generator automatically, so you rarely import it directly.
:::

## Factories

| Export | Description |
| --- | --- |
| [`DataFactory`](/api/data-factory) | Builds factory instances from a decorated class. `DataFactory.createForClass(MyFactory)` returns an object with `generate()` and `generateOne()`. |
| [`@Factory`](/api/factory-decorator) | Property decorator that declares how a single field is generated. Accepts a generator function `(faker, ctx) => value` or a static value, plus an optional `dependsOn` list for derived fields. |

```ts
import { DataFactory } from '@ackplus/nest-seeder';

const factory = DataFactory.createForClass(UserFactory);
const users = factory.generate(10);          // → User[]
const one = factory.generateOne({ role: 'admin' });
```

## Seeders

| Export | Description |
| --- | --- |
| [`Seeder`](/api/seeder) | Interface your seeder classes implement. Requires `seed(options?)`; `drop(options?)` is optional. |
| [`@SeederName`](/api/seeder) | Class decorator that pins a stable, minification-safe name used by the CLI `--name` flag. Recommended on every seeder. |
| [`getSeederName`](/api/seeder) | Resolves the effective name of a seeder class or instance (the `@SeederName` value, falling back to the class name). |

```ts
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';

@SeederName('users')
export class UserSeeder implements Seeder {
  async seed(): Promise<void> {
    const users = DataFactory.createForClass(UserFactory).generate(10);
    // persist users...
  }
}
```

## Configuration

| Export | Description |
| --- | --- |
| [`defineSeederConfig`](/api/define-config) | Identity helper that gives full type-safety and autocomplete to your `seeder.config.ts`. Optional, but recommended — wrap the default-exported config object. |

```ts
import { defineSeederConfig } from '@ackplus/nest-seeder';

export default defineSeederConfig({
  imports: [/* ...Nest modules */],
  seeders: [UserSeeder],
});
```

## Module &amp; service

For programmatic use — wiring seeding into an existing Nest application or test, or running it from code instead of the CLI.

| Export | Description |
| --- | --- |
| [`SeederModule`](/api/seeder-service) | Nest module. Use `SeederModule.register(options)` or `SeederModule.forRootAsync(asyncOptions)` to register your seeders and their dependencies. |
| [`SeederService`](/api/seeder-service) | Injectable service that drives seeding. Exposes `run()`, `seed()`, `drop()`, and `getSeedersToRun()`. |
| [`seeder`](/api/seeder-service) | Programmatic helper — `seeder(options).run(extraOptions)` runs seeders without the CLI. The CLI is preferred for everyday use. |

```ts
import { seeder } from '@ackplus/nest-seeder';

await seeder({
  imports: [/* ...Nest modules */],
  seeders: [UserSeeder],
}).run({ refresh: true });
```

::: info CLI is the recommended entry point
For day-to-day seeding, reach for the [`nest-seed` CLI](/guide/cli) instead of wiring `SeederService` by hand. The programmatic API exists for tests and custom tooling.
:::

## Types

All public types are exported from the package root for use in your own signatures and helpers.

| Type | Description |
| --- | --- |
| [`SeederServiceOptions`](/api/seeder-service) | Options accepted by `seed()` / `drop()` / `run()`: `name`, `refresh`, `dryRun`, `continueOnError`, `context`, and the deprecated `dummyData`. |
| [`SeederConfig`](/api/define-config) | Shape of a `seeder.config.ts` — `imports`, optional `providers`, and `seeders`. Returned by `defineSeederConfig`. |
| [`FactoryInstance`](/api/data-factory) | What `DataFactory.createForClass` returns: an object with `generate()` and `generateOne()`. |
| [`FactoryOverrides`](/api/data-factory) | Override map passed to `generate()` / `generateOne()`. May include keys that aren't `@Factory` fields (e.g. a foreign key). |
| [`FactoryValue`](/api/factory-decorator) | A static value or generator accepted by `@Factory`. |
| [`FactoryValueGenerator`](/api/factory-decorator) | The generator function signature `(faker, ctx) => value`. |
| [`SeederModuleOptions`](/api/seeder-service) | Options for `SeederModule.register()`. |
| [`SeederModuleAsyncOptions`](/api/seeder-service) | Options for `SeederModule.forRootAsync()`. |
| [`SeederModuleExtraOptions`](/api/seeder-service) | Additional module-level options. |
| [`SeederOptions`](/api/seeder-service) | Options for the programmatic `seeder()` helper. |
| [`SeederRunner`](/api/seeder-service) | The object returned by `seeder()`, exposing `run()`. |
| [`SeederOptionsFactory`](/api/seeder-service) | Factory interface for providing module options asynchronously. |

```ts
import type {
  SeederServiceOptions,
  SeederConfig,
  FactoryInstance,
  FactoryOverrides,
  FactoryValue,
  FactoryValueGenerator,
  SeederModuleOptions,
  SeederModuleAsyncOptions,
  SeederModuleExtraOptions,
  SeederOptions,
  SeederRunner,
  SeederOptionsFactory,
} from '@ackplus/nest-seeder';
```

## Next steps

- New here? Start with [Getting Started](/guide/getting-started).
- Learn the building blocks: [Factories](/guide/factories) and [Seeders](/guide/seeders).
- Run it: the [CLI reference](/guide/cli).
- Coming from v1? See the [Migration guide](/migration).
