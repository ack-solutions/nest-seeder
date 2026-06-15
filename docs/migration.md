# Migrating from v1 to v2

`@ackplus/nest-seeder` v2 is a **focused redesign**. The core you already know — the
`@Factory` decorator, the `Seeder` interface, and `DataFactory` — is unchanged, so most
applications upgrade in a few minutes. The breaking changes are concentrated in the **CLI**,
the **config ergonomics**, and the **packaging**.

::: tip TL;DR
1. `npm install @ackplus/nest-seeder@^2`
2. Replace your long seed script with `"seed": "nest-seed"`.
3. Rename the `--dummyData` flag to `--dummy-data`.
4. If your `drop()` uses `repository.delete({})`, switch to `repository.createQueryBuilder().delete().execute()`.

Everything else is optional polish.
:::

## At a glance

| Area | v1 | v2 |
| --- | --- | --- |
| Run command | `node -r ts-node/register … dist/cli.js -c ./seeder.config.ts` | `nest-seed` (config auto-detected) |
| `--config` | Required | Optional (auto-discovers `seeder.config.{ts,js,cjs,mjs}`) |
| Dummy-data flag | `--dummyData` | `--dummy-data` (or the new `--context`) |
| Scaffolding | none | `nest-seed init` |
| Inspect seeders | none | `nest-seed list` |
| Preview | none | `nest-seed --dry-run` |
| `drop()` | required | optional |
| Refresh drop order | same as list | **reverse** of list (foreign-key safe) |
| Build output | CommonJS only | **Dual ESM + CJS** with an `exports` map |
| Logging | `console.*` | NestJS `Logger` |

## Step-by-step

### 1. Update the dependency

```bash
npm install @ackplus/nest-seeder@^2 @faker-js/faker
# .ts config files still need:
npm install -D ts-node typescript
```

### 2. Simplify your run script

The verbose v1 invocation still works, but v2 ships a real binary with config auto-discovery.

```json
// package.json
{
  "scripts": {
    // before (v1)
    "seed": "node -r ts-node/register -r tsconfig-paths/register ./node_modules/@ackplus/nest-seeder/dist/cli.js -c ./seeder.config.ts",
    // after (v2)
    "seed": "nest-seed",
    "seed:refresh": "nest-seed --refresh"
  }
}
```

If your config file is not named `seeder.config.*` in the project root, keep passing `-c ./path/to/config.ts`.

### 3. Rename the `--dummyData` flag

The flag is now kebab-case to match the rest of the CLI:

```bash
# before
nest-seed --dummyData
# after
nest-seed --dummy-data
```

`options.dummyData` is still delivered to your seeders (it's deprecated but functional). For new
code, prefer the general-purpose `--context` flag:

```bash
nest-seed --context '{ "size": "large" }'
```

```ts
async seed(options: SeederServiceOptions) {
  const big = options.context?.size === 'large';
  // ...
}
```

### 4. Fix your `drop()` method ⚠️

v1 docs taught `await this.repo.delete({})`. Modern TypeORM rejects an empty criteria with
`Empty criteria(s) are not allowed for the delete method`. Use the query builder instead:

```ts
// before (throws on modern TypeORM)
async drop() {
  await this.userRepository.delete({});
}

// after
async drop() {
  await this.userRepository.createQueryBuilder().delete().execute();
}
```

Mongoose is unchanged: `await this.userModel.deleteMany({})`.

### 5. (Optional) Wrap your config in `defineSeederConfig`

Get full IntelliSense and type-checking for free:

```ts
import { defineSeederConfig } from '@ackplus/nest-seeder';

export default defineSeederConfig({
  imports: [/* … */],
  seeders: [UserSeeder, PostSeeder],
});
```

A plain `export default { … }` still works.

### 6. (Optional) Add stable seeder names

`--name` matches the class name by default, which breaks under minification. Add `@SeederName`
for a stable, friendly alias:

```ts
import { Injectable } from '@nestjs/common';
import { Seeder, SeederName } from '@ackplus/nest-seeder';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder { /* … */ }
```

```bash
nest-seed --name users
```

Run `nest-seed list` to see every seeder and its alias.

## Behavior changes to be aware of

- **Overrides are always applied.** `factory.generate(3, { authorId: user.id })` now includes
  `authorId` even though it isn't a `@Factory` field. In v1 such keys were silently dropped — a
  common source of `NOT NULL` errors when seeding relationships. This is a **fix**, but if you
  worked around the old behavior, you can remove the workaround.
- **`dependsOn` is resolved transitively** and is no longer order-sensitive.
- **Factory inheritance works.** A factory that `extends` a base factory now inherits the base's
  `@Factory` properties (subclass definitions win).
- **Refresh drops in reverse order.** On `--refresh`, seeders are dropped from last to first so
  foreign-key children are removed before their parents. List your seeders parent-first (you
  almost certainly already do).
- **`drop()` is optional.** Seeders without a `drop()` are simply skipped during refresh.

## Packaging notes

- v2 ships **dual ESM + CJS** with a restricted `exports` map. Import from the package root:

  ```ts
  import { DataFactory, Factory, Seeder } from '@ackplus/nest-seeder';
  ```

  Deep imports like `@ackplus/nest-seeder/dist/lib/...` are no longer supported (the internal
  file layout changed). If you relied on one, open an issue describing the use case.
- The `nest-seed` binary path (`dist/cli.js`) is preserved, so the old long run command keeps working.

## Need help?

- Browse the [Guide](/guide/introduction) and [API Reference](/api/).
- Hit a snag? See [Troubleshooting](/guide/troubleshooting) or
  [open an issue](https://github.com/ack-solutions/nest-seeder/issues).
