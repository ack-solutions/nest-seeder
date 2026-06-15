# CLI

`nest-seed` is the primary way to run your seeders. It discovers your `seeder.config.ts`, boots a minimal NestJS application context, and runs the seeders you've registered — no extra wiring required.

```bash
nest-seed
```

That's the default command: it runs every seeder in your config, top to bottom.

::: tip Recommended setup
Add a script to your `package.json` so you (and your CI) can run `npm run seed`:

```json
{
  "scripts": {
    "seed": "nest-seed"
  }
}
```
:::

## The run command

Running `nest-seed` with no arguments executes all registered seeders in order. Every other behavior — refreshing, filtering, dry runs — is controlled by the flags below.

### Options

| Flag | Alias | Argument | Description |
| --- | --- | --- | --- |
| `--config` | `-c` | `<path>` | Path to the config file. Optional — auto-detected if omitted. |
| `--project` | `-p` | `<path>` | tsconfig.json for ts-node when loading `.ts` config. Also via `TS_NODE_PROJECT`. Defaults to strict mode. |
| `--refresh` | `-r` | — | Drop all seeders (in reverse order) before reseeding. |
| `--name` | `-n` | `<names...>` | Run only the named seeders. Matches class name or `@SeederName`, case-insensitive, `Seeder` suffix optional. |
| `--dry-run` | — | — | Print what would run and write nothing. |
| `--continue-on-error` | — | — | Keep going if a seeder throws instead of aborting. |
| `--context` | — | `<json>` | JSON string forwarded to every seeder as `options.context`. |
| `--dummy-data` | `-d` | — | Deprecated. Forwarded as `options.dummyData`. |
| `--help` | — | — | Show CLI help. |
| `--version` | — | — | Print the installed version. |

## Flags in detail

### `--config`, `-c`

Point the CLI at a specific config file. Handy in monorepos or when you keep multiple configs around.

```bash
nest-seed --config ./config/seeder.config.ts
nest-seed -c ./apps/api/seeder.config.ts
```

If you omit this flag, the CLI auto-discovers your config (see [Config auto-discovery](#config-auto-discovery)).

### `--project`, `-p`

When loading a `.ts` config, the CLI registers [ts-node](https://typestrong.org/ts-node/) with sensible defaults (including `strict: true`). Use `--project` to point it at your own `tsconfig.json` so the seed run compiles entities exactly like your app does.

```bash
nest-seed --project ./tsconfig.json
# or via environment variable
TS_NODE_PROJECT=./tsconfig.json nest-seed
```

::: tip When you need this
If you see TypeORM's `DataTypeNotSupportedError: Data type "Object" …` for a string-literal-union column, your seed-time compiler options differ from your app's. Point `--project` at your app's tsconfig, or give the column an explicit type — see [Troubleshooting](/guide/troubleshooting).
:::

### `--refresh`, `-r`

Drops existing data, then reseeds. Seeders are **dropped in reverse order** of how they're listed in your config, which keeps foreign keys safe — list parents first, children last.

```bash
nest-seed --refresh
nest-seed -r
```

::: warning Destructive
`--refresh` calls each seeder's `drop()` method, which typically deletes all rows in the target table. Only run it against databases you're comfortable wiping.
:::

::: info
`drop()` is optional. A seeder without it is simply skipped during the drop phase.
:::

### `--name`, `-n`

Run a subset of seeders by name. Matching is **case-insensitive**, the `Seeder` suffix is **optional**, and it matches either the class name or the `@SeederName` alias.

Given this seeder:

```ts
@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  /* ... */
}
```

all of these run it:

```bash
nest-seed --name users
nest-seed --name UserSeeder
nest-seed --name user
nest-seed -n users
```

Pass multiple names to run several seeders:

```bash
nest-seed --name users posts comments
```

::: tip
Use [`nest-seed list`](#list) to see every seeder and the names you can target with `--name`.
:::

### `--dry-run`

Prints the seeders that would run, in order, without writing anything to your database. Great for sanity-checking a config or a `--name` filter before you commit to it.

```bash
nest-seed --dry-run
nest-seed --refresh --dry-run
nest-seed --name users --dry-run
```

### `--continue-on-error`

By default the run stops at the first seeder that throws. With this flag, the CLI logs the error and moves on to the next seeder.

```bash
nest-seed --continue-on-error
```

### `--context`

Forward arbitrary JSON to every seeder. It arrives as `options.context` in your `seed()` / `drop()` methods, so you can branch on environment, tenant, locale, and so on.

```bash
nest-seed --context '{"env":"staging","tenantId":"acme"}'
```

Read it inside a seeder:

```ts
import { Seeder, SeederName, SeederServiceOptions, DataFactory } from '@ackplus/nest-seeder';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  async seed(options?: SeederServiceOptions): Promise<void> {
    const tenantId = options?.context?.tenantId;
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10, { tenantId });
    await this.userRepository.save(users);
  }
}
```

### `--dummy-data`, `-d`

::: warning Deprecated
`--dummy-data` is deprecated. It's still forwarded as `options.dummyData` for backwards compatibility, but prefer [`--context`](#context) for passing flags into your seeders.
:::

```bash
nest-seed --dummy-data
nest-seed -d
```

## `init`

Scaffold a project: generates a `seeder.config.ts` plus an example factory and seeder so you have a working starting point.

```bash
nest-seed init
```

### Options

| Flag | Argument | Description |
| --- | --- | --- |
| `--orm` | `typeorm` \| `mongoose` | Which ORM the generated files target. |
| `--force` | — | Overwrite existing files if they already exist. |

```bash
# Scaffold for TypeORM
nest-seed init --orm typeorm

# Scaffold for Mongoose, overwriting any existing files
nest-seed init --orm mongoose --force
```

## `list`

Lists every registered seeder and the aliases you can pass to `--name`. Run it whenever you're not sure what's available.

```bash
nest-seed list
```

## Config auto-discovery

When you don't pass `--config`, the CLI looks for a config file in your current working directory, in this order:

1. `seeder.config.ts`
2. `seeder.config.js`
3. `seeder.config.cjs`
4. `seeder.config.mjs`

The first match wins. To use a `.ts` config, install the TypeScript tooling:

```bash
npm install -D ts-node typescript
```

::: tip
Need a config somewhere else? Skip auto-discovery and point at it explicitly with `--config ./path/to/seeder.config.ts`.
:::

## package.json scripts

Wrap common invocations in scripts so your team runs the same commands every time.

```json
{
  "scripts": {
    "seed": "nest-seed",
    "seed:refresh": "nest-seed --refresh",
    "seed:users": "nest-seed --name users",
    "seed:list": "nest-seed list",
    "seed:watch": "nodemon --watch src --ext ts --exec \"nest-seed --refresh\""
  }
}
```

- **`seed`** — run all seeders.
- **`seed:refresh`** — wipe and reseed.
- **`seed:users`** — run just the `users` seeder via `--name`.
- **`seed:list`** — inspect registered seeders.
- **`seed:watch`** — re-run a refresh whenever your `src` files change (watch mode via [nodemon](https://www.npmjs.com/package/nodemon)).

### Passing flags through npm

npm swallows flags meant for the underlying command, so you need `--` to separate npm's arguments from `nest-seed`'s. Everything after `--` is forwarded verbatim.

::: code-group

```bash [npm]
npm run seed -- --refresh
npm run seed -- --name users posts
npm run seed -- --dry-run
```

```bash [pnpm]
pnpm seed --refresh
pnpm seed --name users posts
pnpm seed --dry-run
```

```bash [yarn]
yarn seed --refresh
yarn seed --name users posts
yarn seed --dry-run
```

:::

::: info
With `npm run`, the `--` is required. `pnpm` and `yarn` forward extra flags directly, so they don't need it.
:::

## Debugging

If a run fails and you want the full stack trace instead of a trimmed error message, set `NEST_SEEDER_DEBUG=1`:

```bash
NEST_SEEDER_DEBUG=1 nest-seed --refresh
```

::: tip
Combine it with `--dry-run` to trace exactly which seeders would run, and in what order, without touching your data.
:::

## See also

- [Configuration](/guide/configuration) — the shape of `seeder.config.ts`.
- [Writing seeders](/guide/seeders) — implementing `seed()` and `drop()`.
- [Factories](/guide/factories) — generating data with `DataFactory`.
