# Changelog

All notable changes to `@ackplus/nest-seeder`. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.1.0 — 2026-06-15

### Added

- **`--project` / `-p`** flag (and `TS_NODE_PROJECT` env var) to point the CLI's ts-node at your
  own `tsconfig.json` when loading `.ts` config files and entities.

### Changed

- The CLI's ts-node default is now **`strict: true`** (was `strict: false`). With `strictNullChecks`
  off, some TypeScript versions emit `design:type = Object` for string-literal-union columns, which
  makes TypeORM throw `DataTypeNotSupportedError` on Postgres/MySQL. See
  [Troubleshooting](/guide/troubleshooting). Override with `--project` / `TS_NODE_PROJECT`.

### Notes

- The version-independent fix is to give enum/union columns an explicit column type
  (`@Column({ type: 'varchar' })`) so TypeORM never relies on reflect-metadata inference.

## 2.0.0 — 2026-06-15

A focused redesign that keeps the proven core (`@Factory`, `Seeder`, `DataFactory`) while
overhauling the CLI, configuration ergonomics, packaging, and documentation. See the
[Migration Guide](/migration) for upgrade steps.

### Added

- **`nest-seed init`** — scaffolds a `seeder.config.ts`, a factory, and a seeder (`--orm typeorm|mongoose`, `--force`).
- **`nest-seed list`** — lists registered seeders and their `--name` aliases.
- **Config auto-discovery** — finds `seeder.config.{ts,js,cjs,mjs}` automatically; `--config` is now optional.
- **`--dry-run`** — preview which seeders would run without writing data.
- **`--continue-on-error`** — keep going when a seeder throws.
- **`--context <json>`** — forward arbitrary JSON to every seeder via `options.context`.
- **`@SeederName('name')`** decorator and `getSeederName()` for stable, minification-safe names.
- **`defineSeederConfig()`** — a typed identity helper for `seeder.config.ts`.
- **`DataFactory.generateOne()`** convenience method.
- **Factory inheritance** — a factory that `extends` a base inherits its `@Factory` properties.
- **Dual ESM + CJS build** with an `exports` map and full TypeScript declarations.
- **Unit test suite** for the library.
- **This documentation site** (VitePress), plus a migration guide and changelog.

### Changed

- **CLI** rewritten with subcommands (`run`/`init`/`list`) and clearer output.
- **Logging** uses the NestJS `Logger` instead of raw `console.*`.
- **Refresh** drops seeders in **reverse order** (foreign-key safe) before reseeding.
- **`drop()` is optional** on the `Seeder` interface.
- **Factory overrides** always appear in the record — including non-`@Factory` keys (e.g. a foreign key).
- **`dependsOn`** is resolved transitively and order-independently.
- **Build tooling** switched to `tsup`. Node `>= 18` required.
- `--dummyData` renamed to `--dummy-data` (`options.dummyData` still delivered, deprecated).

### Fixed

- Overrides for non-decorated properties were dropped, causing `NOT NULL` failures when seeding relationships.
- Transitive `dependsOn` chains were not fully resolved.
- Generated property order was reversed relative to declaration order.
- Seeder selection mutated the shared options object in place.

### Removed

- The bundled `examples/` directory — replaced by this site and the runnable example app.
- Deep imports of internal files (`@ackplus/nest-seeder/dist/lib/...`); import from the package root.

## 1.1.16 — 2026-01-04

- Last release of the v1 line. Iterative fixes and packaging tweaks across the `1.1.x` series.
