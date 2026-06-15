# @ackplus/nest-seeder

<p align="center">
  <a href="https://nestjs.com/" target="_blank"><img src="https://nestjs.com/img/logo-small.svg" width="110" alt="Nest Logo" /></a>
</p>

<p align="center">A powerful, CLI-first database seeding library for NestJS — factories, Faker.js, and a great DX.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/v/@ackplus/nest-seeder.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/l/@ackplus/nest-seeder.svg" alt="License" /></a>
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/dm/@ackplus/nest-seeder.svg" alt="Downloads" /></a>
</p>

## 📚 Documentation

**👉 Full documentation & guides: [ack-solutions.github.io/nest-seeder](https://ack-solutions.github.io/nest-seeder/)**

| | |
| --- | --- |
| 🚀 [Getting Started](https://ack-solutions.github.io/nest-seeder/guide/getting-started) | 5-minute quickstart |
| 🏭 [Factories](https://ack-solutions.github.io/nest-seeder/guide/factories) | Generate realistic data |
| 🌱 [Seeders](https://ack-solutions.github.io/nest-seeder/guide/seeders) | Insert & drop data |
| 🖥️ [CLI Reference](https://ack-solutions.github.io/nest-seeder/guide/cli) | Every command & flag |
| 📖 [API Reference](https://ack-solutions.github.io/nest-seeder/api/) | Full API |
| 🔀 [Migration v1 → v2](https://ack-solutions.github.io/nest-seeder/migration) | Upgrade guide |
| 📝 [Changelog](https://ack-solutions.github.io/nest-seeder/changelog) | What changed |

## ✨ Features

- 🖥️ **CLI-first** — run `nest-seed` with zero changes to your app code. Auto-detects your config.
- 🏭 **Factories + Faker.js** — declare data with the `@Factory` decorator; supports dependent fields, inheritance, and overrides.
- 🔄 **Any ORM** — TypeORM, Mongoose, Prisma, or anything Nest can inject.
- 🎯 **Selective & safe** — run seeders by name, `--refresh` in foreign-key-safe order, or preview with `--dry-run`.
- 🛠️ **Scaffolding** — `nest-seed init` generates a config, factory, and seeder.
- 📦 **Dual ESM + CJS** with full TypeScript declarations.

## 📦 Installation

```bash
npm install @ackplus/nest-seeder @faker-js/faker
# For TypeScript config files:
npm install -D ts-node typescript
```

> Requires Node 18+ and NestJS 10 or 11.

## 🚀 Quick Start

The fastest path is to scaffold the files:

```bash
npx nest-seed init
```

…or wire them up by hand:

**1. Factory** — `src/database/factories/user.factory.ts`

```ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  @Factory(
    (faker, ctx) => faker.internet.email({ firstName: ctx.firstName, lastName: ctx.lastName }).toLowerCase(),
    ['firstName', 'lastName'],
  )
  email: string;

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;
}
```

**2. Seeder** — `src/database/seeders/user.seeder.ts`

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

**3. Config** — `seeder.config.ts` (project root)

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

**4. Run** — add a script and go

```json
{
  "scripts": {
    "seed": "nest-seed"
  }
}
```

```bash
npm run seed
```

That's it — the CLI auto-discovers `seeder.config.ts` and seeds your database. 🎉

## 🖥️ CLI at a glance

```bash
nest-seed                      # run all seeders (config auto-detected)
nest-seed --refresh            # drop (reverse order) then reseed
nest-seed --name users posts   # run only specific seeders
nest-seed --dry-run            # preview without writing
nest-seed list                 # list registered seeders
nest-seed init --orm mongoose  # scaffold starter files
nest-seed --help               # all options
```

See the [full CLI reference](https://ack-solutions.github.io/nest-seeder/guide/cli).

## 🔀 Upgrading from v1?

v2 keeps the `@Factory` / `Seeder` / `DataFactory` core and modernizes the CLI, config, and
packaging. Most apps upgrade in minutes — follow the
**[Migration Guide](https://ack-solutions.github.io/nest-seeder/migration)**.

## 🤝 Contributing

Contributions welcome! See the [Contributing Guide](https://github.com/ack-solutions/nest-seeder/blob/main/CONTRIBUTING.md).

## 📄 License

[MIT](./LICENSE) © AckPlus

---

Built with [NestJS](https://nestjs.com/) · Powered by [Faker.js](https://fakerjs.dev/)
