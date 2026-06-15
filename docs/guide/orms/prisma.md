# Prisma

Prisma works great with `@ackplus/nest-seeder` — there's just one thing to know up front:
**Prisma has no official NestJS database module.** Unlike TypeORM (`@nestjs/typeorm`) or
Mongoose (`@nestjs/mongoose`), there is no `PrismaModule.forRoot()` to import. Instead, you
provide your own `PrismaService` — a thin class that extends `PrismaClient` — and register it
through the config's `providers` array.

::: info Factories are unchanged
Everything about [factories](/guide/factories) — `@Factory`, `DataFactory.createForClass`,
`dependsOn`, overrides — is identical regardless of ORM. Only the seeder's insert/delete calls
differ. If you've read the [TypeORM](/guide/orms/typeorm) or [Mongoose](/guide/orms/mongoose)
guides, the only new piece here is `PrismaService`.
:::

## Install

```bash
npm install @ackplus/nest-seeder @faker-js/faker
npm install -D ts-node typescript
```

You'll also need Prisma itself in your project:

```bash
npm install @prisma/client
npm install -D prisma
```

## 1. The PrismaService (you define this)

There is no built-in Prisma module, so create a small injectable service that extends
`PrismaClient` and connects on module init.

```ts
// src/database/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
```

::: tip
This is the standard NestJS + Prisma pattern. `PrismaService` is plain user code — it is **not**
exported by `@ackplus/nest-seeder` or by any official Nest package. You own it.
:::

## 2. The factory (same as every ORM)

Nothing Prisma-specific here. A factory just describes how to generate plain objects.

```ts
// src/database/factories/user.factory.ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  @Factory(
    (faker, ctx) =>
      faker.internet.email({ firstName: ctx.firstName, lastName: ctx.lastName }).toLowerCase(),
    ['firstName', 'lastName'],
  )
  email: string;

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;
}
```

## 3. The seeder

Inject your `PrismaService` and use the Prisma Client API to insert and delete.

- Insert many rows with `prisma.user.createMany({ data: users })`.
- Drop all rows with `prisma.user.deleteMany()`.

```ts
// src/database/seeders/user.seeder.ts
import { Injectable } from '@nestjs/common';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { PrismaService } from '../prisma.service';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(private readonly prisma: PrismaService) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.prisma.user.createMany({ data: users });
  }

  async drop(): Promise<void> {
    await this.prisma.user.deleteMany();
  }
}
```

::: tip Why `@SeederName`?
`@SeederName('users')` gives the seeder a stable, minification-safe alias you can target with
`nest-seed --name users`. It's the recommended pattern — see [Seeders](/guide/seeders).
:::

## 4. The config

This is where Prisma differs most. There's no Nest database module to import, so `imports` is
empty (or only holds unrelated modules). Register `PrismaService` in `providers` so Nest can
inject it into your seeders.

```ts
// seeder.config.ts
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { PrismaService } from './src/database/prisma.service';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [],
  providers: [PrismaService],
  seeders: [UserSeeder],
});
```

::: warning Don't forget `providers`
Because there's no `PrismaModule`, `PrismaService` will be undefined in your seeder unless you
list it in `providers`. This is the single most common Prisma setup mistake.
:::

## 5. Run it

Add a script to `package.json`:

```json
{
  "scripts": {
    "seed": "nest-seed"
  }
}
```

Then:

::: code-group

```bash [seed]
npm run seed
```

```bash [refresh]
npm run seed -- --refresh
```

```bash [one seeder]
npm run seed -- --name users
```

:::

On `--refresh`, seeders are dropped in **reverse order** (foreign-key safe) and then reseeded.
List parents before children in the `seeders` array. See the [CLI reference](/guide/cli) for all
flags.

## Seeding relationships

Use factory overrides to pass a foreign key that isn't a `@Factory` field. The override flows
straight through into the generated object, so it lands in `createMany`'s `data`.

```ts
// inside a PostSeeder
async seed(): Promise<void> {
  const users = await this.prisma.user.findMany();
  const factory = DataFactory.createForClass(PostFactory);

  for (const user of users) {
    const posts = factory.generate(3, { authorId: user.id }); // authorId is an override
    await this.prisma.post.createMany({ data: posts });
  }
}
```

::: info Match your schema
The override key (`authorId` above) must match the scalar foreign-key field in your Prisma
schema. `createMany` accepts scalar fields only — it does not support nested `connect`/`create`
writes. If you need nested relation writes, loop over `prisma.post.create({ data: ... })` instead.
:::

## Recap

| Step              | TypeORM / Mongoose            | Prisma                                |
| ----------------- | ----------------------------- | ------------------------------------- |
| Database wiring   | `TypeOrmModule` / `MongooseModule` in `imports` | `PrismaService` in `providers` |
| Insert many       | `repo.save(...)` / `model.insertMany(...)` | `prisma.model.createMany({ data })` |
| Delete all (drop) | query builder / `deleteMany({})` | `prisma.model.deleteMany()`         |
| Factories         | identical                     | identical                             |

That's the whole difference. Once `PrismaService` is wired through `providers`, factories,
`DataFactory`, overrides, and the [CLI](/guide/cli) all behave exactly as they do for any other
ORM.
