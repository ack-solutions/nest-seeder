# nest-seeder

<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="110" alt="Nest Logo" /></a>
</p>

<p align="center">A powerful, CLI-first database seeding library for NestJS — factories, Faker.js, and a great DX.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/v/@ackplus/nest-seeder.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/l/@ackplus/nest-seeder.svg" alt="License" /></a>
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/dm/@ackplus/nest-seeder.svg" alt="Downloads" /></a>
</p>

<p align="center">
  <b><a href="https://ack-solutions.github.io/nest-seeder/">📚 Documentation</a></b> ·
  <a href="https://ack-solutions.github.io/nest-seeder/guide/getting-started">Getting Started</a> ·
  <a href="https://ack-solutions.github.io/nest-seeder/guide/cli">CLI</a> ·
  <a href="https://ack-solutions.github.io/nest-seeder/api/">API</a> ·
  <a href="https://ack-solutions.github.io/nest-seeder/migration">Migration v1→v2</a> ·
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder">npm</a>
</p>

---

This is the monorepo for **[`@ackplus/nest-seeder`](https://www.npmjs.com/package/@ackplus/nest-seeder)**.
For usage, head to the **[documentation site](https://ack-solutions.github.io/nest-seeder/)**. This README
covers the repository itself and local development.

## 📚 Documentation

The full, searchable docs live at **[ack-solutions.github.io/nest-seeder](https://ack-solutions.github.io/nest-seeder/)**:

- [Getting Started](https://ack-solutions.github.io/nest-seeder/guide/getting-started) — 5-minute quickstart
- [Factories](https://ack-solutions.github.io/nest-seeder/guide/factories) · [Seeders](https://ack-solutions.github.io/nest-seeder/guide/seeders) · [Configuration](https://ack-solutions.github.io/nest-seeder/guide/configuration)
- [CLI Reference](https://ack-solutions.github.io/nest-seeder/guide/cli)
- [TypeORM](https://ack-solutions.github.io/nest-seeder/guide/orms/typeorm) · [Mongoose](https://ack-solutions.github.io/nest-seeder/guide/orms/mongoose) · [Prisma](https://ack-solutions.github.io/nest-seeder/guide/orms/prisma)
- [API Reference](https://ack-solutions.github.io/nest-seeder/api/)
- [Migration Guide (v1 → v2)](https://ack-solutions.github.io/nest-seeder/migration) · [Changelog](https://ack-solutions.github.io/nest-seeder/changelog)

## ✨ What it does

```bash
npm install @ackplus/nest-seeder @faker-js/faker
npx nest-seed init      # scaffold a config, factory, and seeder
npm run seed            # seed your database
```

- 🖥️ **CLI-first** — `nest-seed` runs your seeders with zero app-code changes.
- 🏭 **Factories + Faker.js** — `@Factory` decorators with dependent fields, inheritance, and overrides.
- 🔄 **Any ORM** — TypeORM, Mongoose, Prisma, or anything Nest can inject.
- 🎯 **Selective & safe** — `--name`, `--refresh` (foreign-key-safe), `--dry-run`.
- 📦 **Dual ESM + CJS** with full TypeScript types.

## 🗂️ Repository structure

```
nest-seeder/
├── packages/
│   └── nest-seeder/      # 📦 the published library (@ackplus/nest-seeder)
│       ├── src/          # source + unit tests
│       └── dist/         # build output (tsup, ESM + CJS)
├── apps/
│   └── example-app/      # 🧪 runnable TypeORM + SQLite example with tests
├── docs/                 # 📚 VitePress documentation site
├── scripts/              # release helpers
└── .github/workflows/    # CI: npm publish + docs deploy
```

## 🛠️ Local development

> Requires Node 18+ and pnpm 10.

```bash
git clone https://github.com/ack-solutions/nest-seeder.git
cd nest-seeder
pnpm install

# Build the library (tsup → dual ESM + CJS)
pnpm build:packages

# Type-check & unit-test the library
pnpm typecheck
pnpm -C packages/nest-seeder test

# Run the example app end-to-end
pnpm -C apps/example-app test
cd apps/example-app && pnpm seed:refresh
```

Useful root scripts: `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`.

### Documentation site

The docs are a standalone VitePress project (not part of the pnpm workspace):

```bash
cd docs
pnpm install --ignore-workspace
pnpm dev       # local dev server
pnpm build     # production build
```

## 🚀 Releasing

Releases are tag-driven — pushing a tag like `2.0.0` (or `2.1.0-beta.1`) triggers the
[publish workflow](.github/workflows/publish.yml), which bumps versions, builds, and publishes to npm
with provenance. The docs site redeploys automatically on changes to `docs/` via the
[docs workflow](.github/workflows/docs.yml). A local helper is also available:

```bash
pnpm release   # interactive version bump + publish (scripts/publish.js)
```

## 🤝 Contributing

Contributions are welcome — see the **[Contributing Guide](./CONTRIBUTING.md)**.

## 📄 License

[MIT](./packages/nest-seeder/LICENSE) © AckPlus

## 🔗 Links

- [📚 Documentation](https://ack-solutions.github.io/nest-seeder/)
- [📦 npm package](https://www.npmjs.com/package/@ackplus/nest-seeder)
- [🐙 GitHub](https://github.com/ack-solutions/nest-seeder)
- [🐛 Issues](https://github.com/ack-solutions/nest-seeder/issues)

---

Made with ❤️ for the NestJS community
