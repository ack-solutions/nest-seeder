# Migrating from v1 to v2

`@ackplus/nest-seeder` v2 is a **focused redesign**. The core — the `@Factory` decorator, the
`Seeder` interface, and `DataFactory` — is unchanged, so most apps upgrade in a few minutes.
Breaking changes are concentrated in the **CLI**, **config ergonomics**, and **packaging**.

> 📖 Full, searchable guide: https://ack-solutions.github.io/nest-seeder/migration

## TL;DR

1. `npm install @ackplus/nest-seeder@^2`
2. Replace your long seed script with `"seed": "nest-seed"`.
3. Rename the `--dummyData` flag to `--dummy-data`.
4. If your `drop()` uses `repository.delete({})`, switch to `repository.createQueryBuilder().delete().execute()`.

Everything else is optional polish.

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
| Refresh drop order | same as list | reverse of list (foreign-key safe) |
| Build output | CommonJS only | Dual ESM + CJS with an `exports` map |

## Steps

### 1. Update the dependency

```bash
npm install @ackplus/nest-seeder@^2 @faker-js/faker
npm install -D ts-node typescript   # for .ts config files
```

### 2. Simplify your run script

```json
{
  "scripts": {
    "seed": "nest-seed",
    "seed:refresh": "nest-seed --refresh"
  }
}
```

The verbose v1 command still works; the `dist/cli.js` path is preserved.

### 3. Rename the dummy-data flag

```bash
nest-seed --dummy-data        # was: --dummyData
```

For new code prefer the general-purpose `--context '{ "size": "large" }'`, read via `options.context`.

### 4. Fix your `drop()` (⚠️ important)

```ts
// before — modern TypeORM throws "Empty criteria(s) are not allowed"
await this.userRepository.delete({});

// after
await this.userRepository.createQueryBuilder().delete().execute();
```

Mongoose is unchanged: `await this.userModel.deleteMany({})`.

### 5. Optional polish

- Wrap your config in `defineSeederConfig({ … })` for full type-checking.
- Add `@SeederName('users')` to seeders for stable `--name users` selection (run `nest-seed list` to verify).

## Behavior changes

- **Overrides are always applied** — `factory.generate(3, { authorId })` now includes `authorId`
  even though it isn't a `@Factory` field (v1 dropped it; this fixes relationship seeding).
- **`dependsOn` is transitive** and order-independent.
- **Factory inheritance works** — `extends` a base factory to reuse its fields.
- **Refresh drops in reverse order**; keep your seeder list parent-first.
- **`drop()` is optional**.
- **Deep imports** (`@ackplus/nest-seeder/dist/lib/...`) are gone — import from the package root.

Questions? https://github.com/ack-solutions/nest-seeder/issues
