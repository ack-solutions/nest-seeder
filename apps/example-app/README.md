# Example App — @ackplus/nest-seeder

A complete, runnable example of `@ackplus/nest-seeder` with **TypeORM + SQLite**, using the CLI.

> 📚 Full docs: **[ack-solutions.github.io/nest-seeder](https://ack-solutions.github.io/nest-seeder/)**

## 🚀 Quick start

```bash
# 1. Build the library (from the repo root)
pnpm -C packages/nest-seeder build

# 2. From this folder, seed the SQLite database
pnpm seed                # run all seeders (10 users, 30 posts)
pnpm seed:refresh        # drop (reverse order) then reseed
pnpm seed:users          # run only the "users" seeder (--name users)
pnpm seed:list           # list registered seeders
pnpm seed:dry            # preview without writing
pnpm seed:watch          # auto-reseed on file changes
```

All `seed*` scripts use the `nest-seed` binary, which auto-discovers `seeder.config.ts`.

## 🗂️ Structure

```
example-app/
├── src/
│   ├── database/
│   │   ├── entities/      # TypeORM entities (User, Post)
│   │   ├── factories/     # UserFactory, PostFactory
│   │   └── seeders/       # UserSeeder, PostSeeder (@SeederName)
│   ├── app.module.ts      # main app module — note: no seeder imports needed
│   └── main.ts
├── seeder.config.ts       # nest-seed configuration (defineSeederConfig)
└── test/                  # tests
```

## 🎯 What it demonstrates

- ✅ CLI-based seeding (no `app.module.ts` changes)
- ✅ TypeORM + SQLite with a One-to-Many relationship
- ✅ `@Factory` + Faker.js, including a dependent field
- ✅ Relationship seeding via a foreign-key override (`generate(n, { authorId })`)
- ✅ `@SeederName` stable names, `--refresh`, `--dry-run`, `list`
- ✅ Correct `drop()` using `createQueryBuilder().delete().execute()`
- ✅ A passing Jest suite (factories + seeder integration + e2e)

## 🧩 Key files

**`seeder.config.ts`**

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { Post } from './src/database/entities/post.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';
import { PostSeeder } from './src/database/seeders/post.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({ type: 'sqlite', database: 'database.sqlite', entities: [User, Post], synchronize: true }),
    TypeOrmModule.forFeature([User, Post]),
  ],
  seeders: [UserSeeder, PostSeeder], // parents first; drops run in reverse
});
```

**A seeder's `drop()`** (modern TypeORM — never `delete({})`):

```ts
async drop(): Promise<void> {
  await this.userRepository.createQueryBuilder().delete().execute();
}
```

## 🧪 Testing

```bash
pnpm test            # all tests
pnpm test:cov        # with coverage
pnpm test:e2e        # e2e tests
```

## 🐛 Troubleshooting

- **Stale data / locked DB:** `rm -f database.sqlite && pnpm seed`
- **Import errors:** rebuild the library — `pnpm -C packages/nest-seeder build`

## 📚 Learn more

- [Documentation](https://ack-solutions.github.io/nest-seeder/)
- [Getting Started](https://ack-solutions.github.io/nest-seeder/guide/getting-started)
- [Repository README](../../README.md)
