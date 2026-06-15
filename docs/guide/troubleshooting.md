# Troubleshooting

Hit a snag? This page collects the most common errors and gotchas, with copy-pasteable fixes. If you don't find your issue here, enable [debug mode](#enable-debug-logging) for a full stack trace.

## "Cannot find module 'ts-node'" / ts-node not found

The CLI loads `.ts` config files (`seeder.config.ts`) through `ts-node`. If it isn't installed, you'll see an error like `Cannot find module 'ts-node'`.

Install the TypeScript toolchain as dev dependencies:

```bash
npm install -D ts-node typescript
```

::: tip
You only need `ts-node` and `typescript` when your config is written in TypeScript. A `seeder.config.js` (or `.cjs` / `.mjs`) runs without them.
:::

## "No seeder config found"

The CLI auto-discovers a config file in your **current working directory** using this order:

1. `seeder.config.ts`
2. `seeder.config.js`
3. `seeder.config.cjs`
4. `seeder.config.mjs`

If none of those exist (or the file lives somewhere else), point the CLI at it explicitly with `-c` / `--config`:

```bash
nest-seed --config ./config/seeder.config.ts
```

Other things to check:

- You're running the command from the project root (where the config lives).
- The file **default-exports** the config object.
- You scaffolded one with `nest-seed init` if you're starting fresh.

::: tip Scaffold a config
```bash
nest-seed init --orm typeorm
```
This generates a `seeder.config.ts`, a factory, and a seeder to get you going.
:::

## "Empty criteria(s) are not allowed for the delete method"

This is a **TypeORM** error thrown from a seeder's `drop()` method when you try to delete every row with empty criteria:

```ts
// ❌ Throws: Empty criteria(s) are not allowed for the delete method
await this.userRepository.delete({});
```

Use a query builder to delete all rows safely:

```ts
// ✅ Correct
await this.userRepository.createQueryBuilder().delete().execute();
```

::: info Mongoose equivalent
With Mongoose, deleting everything is simply:

```ts
await this.userModel.deleteMany({});
```
:::

## `--name` matches nothing / "no seeders to run"

When you filter with `-n` / `--name`, the matcher compares your value against each seeder's:

- **class name** (e.g. `UserSeeder`), or
- its [`@SeederName`](/guide/seeders) alias (e.g. `users`).

Matching is **case-insensitive** and the `Seeder` suffix is **optional**. So for a class `UserSeeder` decorated with `@SeederName('users')`, all of these resolve to the same seeder:

```bash
nest-seed --name users
nest-seed --name UserSeeder
nest-seed --name userseeder
nest-seed --name User
```

If you're still getting no matches, list everything that's actually registered and check the aliases:

```bash
nest-seed list
```

This prints each registered seeder together with the names you can pass to `--name`.

::: tip
Always add a stable [`@SeederName`](/guide/seeders) to your seeders. Class names can be mangled by minifiers in production builds, but `@SeederName` aliases stay constant.
:::

## "Reflect.getMetadata is not a function" / decorators not working

`@Factory`, `@SeederName`, and the NestJS decorators all rely on `reflect-metadata`. If it isn't imported once at startup, decorator metadata is unavailable and you'll see errors like `Reflect.getMetadata is not a function` or factories producing empty objects.

Import it **once**, at the very top of your application's entry point (before anything else):

```ts
import 'reflect-metadata';
```

::: info
In a typical NestJS app this import already lives in `main.ts`. If you run seeders in a context that doesn't boot through `main.ts`, make sure `reflect-metadata` is still loaded.
:::

## ESM-only config files

If your project is configured as ESM (`"type": "module"` in `package.json`), use one of the ESM-friendly config formats so the CLI can load it:

- `seeder.config.ts` (with `ts-node` installed)
- `seeder.config.mjs`

```bash
nest-seed --config ./seeder.config.mjs
```

::: warning
A `.js` config in an ESM package is treated as ESM and must use `export default`. If you need CommonJS semantics in an ESM project, name the file `seeder.config.cjs` and use `module.exports`.
:::

## Foreign-key errors on `--refresh` / drop

On `--refresh`, seeders are **dropped in reverse order** of how they're listed in `seeders`, then re-seeded top-to-bottom. This is foreign-key safe **as long as you list parents before children**.

```ts
import { defineSeederConfig } from '@ackplus/nest-seeder';

export default defineSeederConfig({
  imports: [/* ... */],
  // Parents first, children after.
  seeders: [
    UserSeeder, // dropped LAST  (children removed before it)
    PostSeeder, // dropped FIRST (depends on User)
  ],
});
```

If you hit a foreign-key constraint violation during drop, it almost always means a child seeder is listed **before** its parent. Reorder so the table that owns the foreign key (the parent) comes first.

::: tip
Think of the list as insertion order. Drop runs that same list backwards, so the last thing inserted is the first thing removed.
:::

## Enable debug logging

When an error message isn't enough, set `NEST_SEEDER_DEBUG=1` to print full stack traces:

```bash
NEST_SEEDER_DEBUG=1 nest-seed --refresh
```

This surfaces the underlying error (database connection failures, entity metadata issues, throwing factories, etc.) instead of a trimmed message.

::: tip Preview without writing
Pair debug mode with `--dry-run` to see exactly which seeders would run, without touching your database:

```bash
NEST_SEEDER_DEBUG=1 nest-seed --dry-run
```
:::

## Still stuck?

- Run `nest-seed list` to confirm your seeders are registered.
- Re-check the [CLI reference](/guide/cli) for the exact flags.
- Review the [Seeders guide](/guide/seeders) for `drop()` and `@SeederName` patterns.
- Open an issue at [github.com/ack-solutions/nest-seeder](https://github.com/ack-solutions/nest-seeder).
