# Contributing to nest-seeder

Thanks for your interest in improving `@ackplus/nest-seeder`! This guide covers everything you
need to develop, test, and document the library.

## Prerequisites

- **Node.js** `>= 18`
- **pnpm** `10.x` (the repo pins a version via `packageManager`)

## Repository layout

```
nest-seeder/
├── packages/
│   └── nest-seeder/      # 📦 the published library (@ackplus/nest-seeder)
│       ├── src/          # source + unit tests (*.spec.ts)
│       └── dist/         # build output (tsup)
├── apps/
│   └── example-app/      # 🧪 runnable TypeORM + SQLite example with tests
├── docs/                 # 📚 VitePress documentation site (not in the pnpm workspace)
└── scripts/              # release helpers
```

## Getting started

```bash
git clone https://github.com/ack-solutions/nest-seeder.git
cd nest-seeder
pnpm install

# Build the library
pnpm build:packages

# Type-check and test the library
pnpm -C packages/nest-seeder typecheck
pnpm -C packages/nest-seeder test

# Run the example app end-to-end
pnpm -C apps/example-app test
cd apps/example-app && pnpm seed:refresh
```

## Development workflow

The library builds with [`tsup`](https://tsup.egoist.dev/) into dual ESM + CJS.

```bash
# Rebuild after changes
pnpm -C packages/nest-seeder build

# Watch tests
pnpm -C packages/nest-seeder test:watch
```

After changing the library, rebuild it before running the example app — the example consumes the
built output via the `nest-seed` binary.

## Documentation

The docs site lives in `docs/` and is **not** part of the pnpm workspace (to keep the publish
pipeline lean). Install and run it standalone:

```bash
cd docs
pnpm install --ignore-workspace
pnpm dev          # local dev server
pnpm build        # production build
```

Documentation pages are plain Markdown under `docs/guide`, `docs/api`, etc. The navigation lives
in `docs/.vitepress/config.ts`.

## Coding standards

- TypeScript, formatted with Prettier (`pnpm -C packages/nest-seeder format`).
- Lint with `pnpm -C packages/nest-seeder lint`.
- Add or update unit tests (`*.spec.ts`) for any behavior change.
- Keep examples in docs accurate: use Faker v9 API (`faker.number.int`, not `faker.datatype.number`)
  and the query-builder delete pattern for TypeORM.

## Submitting changes

1. Fork the repo and create a branch: `git checkout -b feature/my-change`.
2. Make your change with tests and docs.
3. Verify everything: `pnpm typecheck && pnpm test`.
4. Commit using clear messages (Conventional Commits encouraged: `feat:`, `fix:`, `docs:`).
5. Open a Pull Request describing the change and the motivation.

## Releasing (maintainers)

Releases are tag-driven. Pushing a tag like `2.0.1` (or `2.1.0-beta.1`) triggers the
`Publish Packages` GitHub Action, which bumps versions, builds, and publishes to npm with
provenance. A local helper also exists: `node scripts/publish.js`.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./packages/nest-seeder/LICENSE).
