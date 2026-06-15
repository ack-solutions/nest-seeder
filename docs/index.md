---
layout: home

hero:
  name: nest-seeder
  text: Database seeding for NestJS
  tagline: CLI-first, factory-powered, and type-safe. Seed realistic data with Faker.js in minutes.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Why nest-seeder?
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/ack-solutions/nest-seeder

features:
  - icon: 🖥️
    title: CLI-first
    details: Run `nest-seed` with zero changes to your app code. Auto-detects your config, scaffolds files with `init`, and lists seeders with `list`.
  - icon: 🏭
    title: Factories + Faker.js
    details: Declare realistic data with the `@Factory` decorator. Supports dependent fields, factory inheritance, and per-record overrides.
  - icon: 🔄
    title: Works with your ORM
    details: TypeORM, Mongoose, Prisma, or anything Nest can inject. You own the seeders — the library wires and runs them.
  - icon: 🎯
    title: Selective & safe
    details: Run specific seeders by name, refresh (drop + reseed) in foreign-key-safe order, or preview with `--dry-run`.
  - icon: 📦
    title: Dual ESM + CJS
    details: Ships modern ESM and CommonJS builds with full TypeScript declarations. Type-safe factories and config.
  - icon: 🧪
    title: Test-friendly
    details: The same factories and seeders you run from the CLI work great inside your test suite.
---
