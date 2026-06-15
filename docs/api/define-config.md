# defineSeederConfig

`defineSeederConfig` is a tiny **identity helper** for your `seeder.config.ts`. It returns its argument
unchanged, but typed as `SeederConfig` — so you get autocomplete, inline docs, and compile-time errors
while you write the file.

```ts
import { defineSeederConfig } from '@ackplus/nest-seeder';

export default defineSeederConfig({
  imports: [/* ...Nest modules */],
  providers: [/* ...optional providers */],
  seeders: [/* ...seeder classes */],
});
```

::: tip It's optional
The CLI happily loads a plain default-exported object too. `defineSeederConfig` exists purely for the
editor experience — wrapping your config gives you type-checking and IntelliSense with zero runtime cost.
:::

## Signature

```ts
function defineSeederConfig(config: SeederConfig): SeederConfig;
```

It simply returns `config` as-is. There is no magic — the value you pass is the value you get back.

## The `SeederConfig` shape

A config object describes the NestJS context your seeders run in, plus optional default run options.

```ts
interface SeederConfig {
  // Nest modules to bootstrap (DB connection, ConfigModule, forFeature, etc.)
  imports?: any[];

  // Extra providers to register in the seeding context
  providers?: any[];

  // Seeder classes to run, in order (top-to-bottom on seed, reverse on refresh)
  seeders?: any[];

  // Default run options (each can be overridden by a CLI flag)
  refresh?: boolean;
  dryRun?: boolean;
  continueOnError?: boolean;
  name?: string | string[];
  context?: Record<string, any>;
}
```

::: info `SeederConfig` vs `SeederModuleOptions`
These describe the same shape. `SeederConfig` is what you author in `seeder.config.ts`; the same options
flow into [`SeederModule.register()`](/api/seeder-service) when you wire seeding up inside an app. The run
options (`refresh`, `dryRun`, `continueOnError`, `name`, `context`) mirror
[`SeederServiceOptions`](/api/seeder-service) and let you set defaults that CLI flags can override.
:::

### Fields

| Field             | Type                       | Description                                                                                      |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| `imports`         | `any[]`                    | Nest modules to bootstrap — your DB connection, `ConfigModule`, `TypeOrmModule.forFeature`, etc. |
| `providers`       | `any[]`                    | Optional extra providers available for injection inside seeders.                                 |
| `seeders`         | `any[]`                    | Seeder classes to run. They execute **top-to-bottom**; on `--refresh` they drop in **reverse**.  |
| `refresh`         | `boolean`                  | Default for "drop then reseed". Overridden by `--refresh`.                                        |
| `dryRun`          | `boolean`                  | Default for dry-run mode. Overridden by `--dry-run`.                                              |
| `continueOnError` | `boolean`                  | Keep going if a seeder throws. Overridden by `--continue-on-error`.                               |
| `name`            | `string \| string[]`       | Restrict to specific seeders by class name or `@SeederName`. Overridden by `--name`.             |
| `context`         | `Record<string, any>`      | Arbitrary data forwarded to every seeder as `options.context`. Overridden by `--context`.        |

::: warning Order matters for foreign keys
List **parents first**. Seeders run in array order, and `--refresh` drops them in reverse — so children
are removed before their parents, keeping foreign keys happy.
:::

## Before / after

The only difference is the type information your editor sees. Both files behave identically at runtime.

::: code-group

```ts [Plain object]
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

// No type safety — typos and wrong shapes slip through silently.
export default {
  imports: [TypeOrmModule.forFeature([User])],
  seeders: [UserSeeder],
};
```

```ts [defineSeederConfig]
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

// Fully typed — autocomplete on every field, errors on typos.
export default defineSeederConfig({
  imports: [TypeOrmModule.forFeature([User])],
  seeders: [UserSeeder],
});
```

:::

With the wrapped version, misspelling a key (e.g. `seeder` instead of `seeders`) or passing the wrong type
is caught by TypeScript right in your editor.

## Full example

A complete TypeORM config at the project root:

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
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
});
```

### Setting default run options

You can bake in defaults that the CLI flags still override:

```ts
import { defineSeederConfig } from '@ackplus/nest-seeder';

export default defineSeederConfig({
  imports: [/* ... */],
  seeders: [/* ... */],

  // Defaults — overridable from the CLI
  continueOnError: true,
  context: { environment: 'development' },
});
```

Running `nest-seed --context '{"environment":"staging"}'` would override the `context` above for that run.

## See also

- [Configuration guide](/guide/configuration) — where the config file lives, auto-discovery, and ORM setups.
- [SeederModule](/api/seeder-service) — using the same options inside a running app.
- [CLI reference](/guide/cli) — the flags that override these defaults.
