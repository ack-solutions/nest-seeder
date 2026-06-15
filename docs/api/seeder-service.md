# SeederService & SeederModule

This page is the reference for running seeders **programmatically** — wiring the
`SeederModule` into a Nest application context and driving it through `SeederService`. It
covers `SeederModule.register()`, `SeederModule.forRootAsync()`, the `SeederService`
methods (`run()`, `seed()`, `drop()`, `getSeedersToRun()`), and the small
`seeder(options).run(extraOptions)` helper.

::: tip Most users want the CLI
For everyday seeding you do **not** need any of this — the [`nest-seed` CLI](/guide/cli)
already builds the module, resolves your [config](/api/define-config), and runs everything
for you. Reach for the programmatic API only when you need to embed seeding inside another
process: a custom script, an integration-test setup, a one-off migration task, or a server
bootstrap step.
:::

```ts
import { SeederModule, SeederService } from '@ackplus/nest-seeder';
```

## `SeederModule`

`SeederModule` is a standard NestJS dynamic module. It registers your seeders as providers
and exposes [`SeederService`](#seederservice) so you can resolve and run them from a Nest
context. It has two entry points: a synchronous `register()` and an async
`forRootAsync()`.

### `SeederModule.register(options)`

Registers the module with a static list of seeders (and anything they need).

```ts
SeederModule.register({
  imports: [
    /* Nest modules your seeders depend on, e.g. TypeOrmModule.forFeature([...]) */
  ],
  providers: [
    /* extra providers your seeders inject (optional) */
  ],
  seeders: [
    /* your Seeder classes, in run order */
  ],
});
```

| Option      | Type           | Description                                                                                  |
| ----------- | -------------- | -------------------------------------------------------------------------------------------- |
| `imports`   | `any[]`        | Nest modules to import so seeders can inject what they need (DB connection, feature modules). |
| `providers` | `any[]`        | Optional extra providers made available to seeders via DI.                                    |
| `seeders`   | `Class[]`      | Your seeder classes. They run **top-to-bottom**, and on `refresh` are dropped in **reverse**. |

::: info Same shape as your config file
The object you pass to `register()` mirrors the [`seeder.config.ts`](/api/define-config)
shape (`imports` / `providers` / `seeders`). When you run through the CLI, your config is
fed into the module for you — `register()` is the manual equivalent.
:::

### `SeederModule.forRootAsync(asyncOptions)`

Use `forRootAsync()` when the module configuration depends on values resolved at runtime —
for example pulling database credentials out of `ConfigService`. It accepts the standard
Nest async-options shape.

```ts
interface SeederModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory?: (...args: any[]) => SeederModuleExtraOptions | Promise<SeederModuleExtraOptions>;
  useClass?: Type<SeederOptionsFactory>;
  useExisting?: Type<SeederOptionsFactory>;
  isGlobal?: boolean;
}
```

| Option        | Type                              | Description                                                                                          |
| ------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- |
| `imports`     | `any[]`                           | Modules to import so the factory/class can inject providers (e.g. `ConfigModule`).                   |
| `inject`      | `any[]`                           | Providers injected into `useFactory`, in argument order.                                             |
| `useFactory`  | `(...args) => SeederModuleExtraOptions` | A factory that returns the module options (`imports` / `providers` / `seeders`). May be async. |
| `useClass`    | `Type<SeederOptionsFactory>`      | A class Nest instantiates; its `createSeederOptions()` provides the options.                         |
| `useExisting` | `Type<SeederOptionsFactory>`      | An **already-registered** provider implementing `SeederOptionsFactory` to reuse.                     |
| `isGlobal`    | `boolean`                         | Register the module globally so its exports are available app-wide without re-importing.             |

Provide **one** of `useFactory`, `useClass`, or `useExisting`.

#### With `useFactory`

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SeederModule } from '@ackplus/nest-seeder';
import { UserSeeder } from './src/database/seeders/user.seeder';

SeederModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    imports: [
      /* e.g. TypeOrmModule.forFeature([User]) */
    ],
    seeders: [UserSeeder],
  }),
});
```

#### The `SeederOptionsFactory` interface

`useClass` and `useExisting` both expect a provider that implements
`SeederOptionsFactory`. It has a single method, `createSeederOptions()`, that returns the
module options.

```ts
interface SeederOptionsFactory {
  createSeederOptions():
    | SeederModuleExtraOptions
    | Promise<SeederModuleExtraOptions>;
}
```

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SeederModuleExtraOptions, SeederOptionsFactory } from '@ackplus/nest-seeder';
import { UserSeeder } from './src/database/seeders/user.seeder';

@Injectable()
export class SeederOptionsProvider implements SeederOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createSeederOptions(): SeederModuleExtraOptions {
    return {
      imports: [
        /* e.g. TypeOrmModule.forFeature([User]) */
      ],
      seeders: [UserSeeder],
    };
  }
}
```

```ts
SeederModule.forRootAsync({
  imports: [ConfigModule],
  useClass: SeederOptionsProvider,
});
```

::: tip `useClass` vs `useExisting`
Use **`useClass`** to let Nest construct a fresh options provider for the module. Use
**`useExisting`** when a suitable `SeederOptionsFactory` provider already lives in your
application and you just want to reuse that instance.
:::

## `SeederService`

`SeederService` is the provider that actually orchestrates a run. Resolve it from the Nest
context (`app.get(SeederService)`) and call one of its methods. Every method accepts the
resolved [`SeederServiceOptions`](/api/seeder#seederserviceoptions) and forwards them to
your seeders.

```ts
import { SeederService, SeederServiceOptions } from '@ackplus/nest-seeder';
```

### `run(options?)`

The high-level entry point — the same one the CLI uses. It inspects the options and does
the right thing:

- **Normal run** — calls `seed()` on each seeder, **top-to-bottom**.
- **`refresh: true`** — first calls `drop()` on each seeder in **reverse order**
  (foreign-key safe), then `seed()`s them top-to-bottom.
- **`name`** — restricts the run to the matching seeders (see
  [`getSeedersToRun()`](#getseederstorun-options)).
- **`dryRun: true`** — resolves and prints what *would* run, but writes nothing.
- **`continueOnError: true`** — if a seeder throws, logs it and continues instead of
  aborting the whole run.
- **`context`** — forwarded to every seeder as `options.context`.

```ts
await seederService.run();                       // seed everything
await seederService.run({ refresh: true });      // drop (reverse) then reseed
await seederService.run({ name: 'users' });      // only the users seeder
await seederService.run({ dryRun: true });       // preview, write nothing
```

### `seed(options?)`

Runs only the **seed** phase: calls `seed()` on the seeders to run, top-to-bottom. It does
**not** drop first, even if `refresh` is set — use [`run()`](#run-options) when you want the
drop-then-reseed behavior.

```ts
await seederService.seed();
await seederService.seed({ name: ['users', 'posts'] });
```

### `drop(options?)`

Runs only the **drop** phase: calls `drop()` on the seeders to run, in **reverse order**.
Seeders that don't define `drop()` are skipped.

```ts
await seederService.drop();                  // tear everything down
await seederService.drop({ name: 'posts' }); // only drop the posts seeder
```

::: warning Reverse order matters
Both `run({ refresh: true })` and `drop()` walk seeders in reverse so children are removed
before their parents. List **parents first** in `seeders` and the foreign-key ordering
takes care of itself.
:::

### `getSeedersToRun(options?)`

Resolves the ordered list of seeder instances that a run *would* execute, after applying any
`name` filter. It performs no I/O — handy for logging, previews, or building your own custom
orchestration on top of the resolved set.

```ts
const seeders = seederService.getSeedersToRun({ name: 'users' });
// → the seeder instances that --name users would target
```

::: info `name` matching
`name` matches a seeder's class name **or** its [`@SeederName`](/api/seeder#seedername-name),
**case-insensitive**, with the `Seeder` suffix optional. Pass a single string or an array.
:::

## Programmatic seeding script

Putting it together: create a standalone Nest **application context** (no HTTP server),
register `SeederModule`, resolve `SeederService`, and run. This is essentially what the CLI
does under the hood.

::: code-group

```ts [seed.ts]
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederModule, SeederService } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'app',
      entities: [User],
      synchronize: true,
    }),
    SeederModule.register({
      imports: [TypeOrmModule.forFeature([User])],
      seeders: [UserSeeder],
    }),
  ],
})
class SeedModule {}

async function bootstrap() {
  // createApplicationContext = a Nest app with DI but no HTTP listener.
  const app = await NestFactory.createApplicationContext(SeedModule);

  const seederService = app.get(SeederService);
  await seederService.run({ refresh: true });

  await app.close();
}

bootstrap();
```

```bash [run it]
# Plain Node (compiled) or via ts-node for a .ts entrypoint
npx ts-node seed.ts
```

:::

::: tip Close the context
Always `await app.close()` when the run finishes so database connections drain and the
process can exit cleanly.
:::

## `seeder(options).run(extraOptions)`

`seeder()` is a tiny programmatic helper that bundles the application-context bootstrap from
the example above into a single call. You hand it your module configuration once; calling
`.run(extraOptions)` builds the context, executes the seeders, and tears everything down for
you.

```ts
import { seeder } from '@ackplus/nest-seeder';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

seeder({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'app',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
}).run({ refresh: true });
```

- **`options`** — the same `imports` / `providers` / `seeders` shape as
  [`register()`](#seedermodule-register-options).
- **`run(extraOptions)`** — accepts the [`SeederServiceOptions`](/api/seeder#seederserviceoptions)
  (`refresh`, `name`, `dryRun`, `continueOnError`, `context`, …) and forwards them to the
  underlying [`SeederService.run()`](#run-options).

::: tip Prefer the CLI
`seeder()` is convenient for embedding seeding in a script, but for normal use the
[`nest-seed` CLI](/guide/cli) is the recommended path — it auto-discovers your config and
exposes every option as a flag.
:::

## See also

- [CLI reference](/guide/cli) — the preferred way to run seeders.
- [defineSeederConfig](/api/define-config) — the config file the CLI consumes.
- [Seeder & @SeederName](/api/seeder) — the `Seeder` interface and `SeederServiceOptions`.
- [DataFactory](/api/data-factory) — generating model data inside `seed()`.
