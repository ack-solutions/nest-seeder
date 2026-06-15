# Changelog

All notable changes to `@ackplus/nest-seeder` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-06-15

### Added

- **`--project` / `-p`** CLI flag (and the `TS_NODE_PROJECT` environment variable) to point the
  CLI's ts-node registration at your own `tsconfig.json`. Previously the CLI used
  `skipProject: true`, so there was no clean way to control the compiler options used to load
  `.ts` config files and entities.

### Changed

- The CLI's default ts-node registration now uses **`strict: true`** (was `strict: false`), matching
  how application code is normally compiled. With `strictNullChecks` disabled, some TypeScript
  versions emit `design:type = Object` for string-literal-union columns (e.g.
  `visibility: 'committee' | 'all-members'` with no explicit `@Column` type), which makes TypeORM
  throw `DataTypeNotSupportedError: Data type "Object" … is not supported` on Postgres/MySQL — even
  though the same entities compile fine under the app's own `strict` build. Pass
  `--project ./tsconfig.json` (or set `TS_NODE_PROJECT`) to override.

### Notes

- The version-independent fix is to give enum/union columns an explicit column type, e.g.
  `@Column({ type: 'varchar' })`, so TypeORM never relies on reflect-metadata inference. Thanks to
  the reporter for the detailed analysis.

## [2.0.0] - 2026-06-15

A focused redesign that keeps the proven core (`@Factory`, `Seeder`, `DataFactory`) while
overhauling the CLI, configuration ergonomics, packaging, and documentation.

See the [Migration Guide](https://ack-solutions.github.io/nest-seeder/migration) for upgrade steps.

### Added

- **`nest-seed init`** — scaffolds a `seeder.config.ts`, a factory, and a seeder (`--orm typeorm|mongoose`, `--force`).
- **`nest-seed list`** — lists registered seeders and their `--name` aliases.
- **Config auto-discovery** — the CLI finds `seeder.config.{ts,js,cjs,mjs}` automatically; `--config` is now optional.
- **`--dry-run`** — preview which seeders would run without writing data.
- **`--continue-on-error`** — keep going when a seeder throws instead of aborting.
- **`--context <json>`** — forward arbitrary JSON to every seeder via `options.context`.
- **`@SeederName('name')`** decorator and `getSeederName()` helper for stable, minification-safe seeder names.
- **`defineSeederConfig()`** — a typed identity helper for `seeder.config.ts`.
- **`DataFactory` `generateOne()`** convenience method.
- **Factory inheritance** — a factory that `extends` a base factory inherits its `@Factory` properties.
- **Dual ESM + CJS build** with a proper `exports` map and full TypeScript declarations.
- **Unit test suite** for the library (factory, service, decorators).
- **Documentation site** built with VitePress, plus this changelog and a migration guide.

### Changed

- **CLI** rewritten with subcommands (`run`/`init`/`list`) and clearer, colorized output.
- **Logging** now uses the NestJS `Logger` instead of raw `console.*`.
- **Refresh** drops seeders in **reverse order** (foreign-key safe) before reseeding.
- **`drop()` is now optional** on the `Seeder` interface; seeders without it are skipped during refresh.
- **Factory overrides** now always appear in the generated record — including keys that are not
  `@Factory` properties (e.g. a foreign key passed in a seeder).
- **`dependsOn`** is resolved transitively and is no longer sensitive to declaration order.
- **Build tooling** switched to `tsup`. Node `>= 18` is now required.
- `--dummyData` flag renamed to `--dummy-data` (the `options.dummyData` value is still delivered, deprecated).

### Fixed

- Overrides for non-decorated properties were silently dropped, causing `NOT NULL` failures when
  seeding relationships (e.g. `factory.generate(3, { authorId })`).
- Transitive `dependsOn` chains were not fully resolved.
- Generated property order was reversed relative to declaration order.
- Seeder selection mutated the shared options object in place.

### Removed

- The bundled `examples/` directory and `seeder.config.example.ts` — replaced by the
  [documentation site](https://ack-solutions.github.io/nest-seeder/) and the runnable example app.
- Deep imports of internal files (`@ackplus/nest-seeder/dist/lib/...`) are no longer supported;
  import from the package root.

## [1.1.16] - 2026-01-04

- Last release of the v1 line. Iterative fixes and packaging tweaks across the `1.1.x` series
  (including the `1.1.15-beta.*` pre-releases).

[2.1.0]: https://github.com/ack-solutions/nest-seeder/releases/tag/2.1.0
[2.0.0]: https://github.com/ack-solutions/nest-seeder/releases/tag/2.0.0
[1.1.16]: https://github.com/ack-solutions/nest-seeder/releases/tag/1.1.16
