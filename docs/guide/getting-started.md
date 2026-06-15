# Getting Started

This quickstart walks you through seeding a PostgreSQL database with **TypeORM** in five steps:
install the package, define an entity, write a factory, write a seeder, and add a config file.
By the end you'll run `npm run seed` and watch fake data land in your database.

::: tip In a hurry?
Skip ahead to [`nest-seed init`](#fast-path-nest-seed-init), which scaffolds a working config, factory,
and seeder for you.
:::

## 1. Install

```bash
npm install @ackplus/nest-seeder @faker-js/faker
```

If your `seeder.config` file is written in TypeScript (`.ts`), also install the dev dependencies that load it:

```bash
npm install -D ts-node typescript
```

::: info Peer dependencies
`@ackplus/nest-seeder` expects `@nestjs/common` and `@nestjs/core` (`^10 || ^11`),
`@faker-js/faker` (`^9 || ^10`), and `reflect-metadata` (`^0.2`) — all standard in a NestJS app.
Node 18 or newer is required.
:::

## 2. Create an entity

Define the TypeORM entity you want to seed. This is your normal application entity — nothing seeder-specific here.

```ts
// src/database/entities/user.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  role: string;
}
```

## 3. Create a factory

A factory describes how to generate one fake object. Decorate each property with [`@Factory`](/guide/factories),
passing a generator that receives a [Faker](https://fakerjs.dev/) instance.

```ts
// src/database/factories/user.factory.ts
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

::: tip Derived fields
The second argument to `@Factory` — `['firstName', 'lastName']` — declares dependencies. Those fields are
generated first and exposed on `ctx`, so `email` can be built from them. Dependencies are resolved transitively
and order-independently. Learn more in [Factories](/guide/factories).
:::

## 4. Create a seeder

A seeder is an injectable Nest provider that implements the [`Seeder`](/guide/seeders) interface. It uses
[`DataFactory`](/api/data-factory) to generate records and persists them through a repository.

```ts
// src/database/seeders/user.seeder.ts
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

::: tip Use @SeederName
[`@SeederName('users')`](/guide/seeders) gives the seeder a stable, minification-safe name. That name is what
`nest-seed --name users` matches against, so it keeps working even after your build minifies class names.
:::

::: warning drop() with TypeORM
Inside `drop()`, delete every row with `createQueryBuilder().delete().execute()`.
Do **not** use `repo.delete({})` — modern TypeORM throws *"Empty criteria(s) are not allowed for the delete method."*
`drop()` is optional, but defining it is what makes [`--refresh`](#refresh-re-seed) work for this seeder.
:::

## 5. Create `seeder.config.ts`

Add a `seeder.config.ts` at your **project root**. Default-export it through
[`defineSeederConfig`](/api/define-config) for full type-safety. It wires up the Nest modules your
seeders need and lists the seeders to run.

```ts
// seeder.config.ts
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

::: info Seeder order matters
Seeders run **top to bottom**. On [`--refresh`](#refresh-re-seed) they are dropped in **reverse order** so
foreign keys stay valid — so always list parents before their children. See
[Configuration](/guide/configuration) for the full config reference.
:::

::: warning .ts config needs ts-node
A `.ts` config file is loaded via `ts-node`, so make sure you installed `ts-node` and `typescript`
(see [step 1](#_1-install)). Prefer plain JS? `seeder.config.js`, `.cjs`, and `.mjs` are auto-discovered too.
:::

## Run it

Add a script to your `package.json`:

```json
{
  "scripts": {
    "seed": "nest-seed"
  }
}
```

Then run it:

```bash
npm run seed
```

The CLI auto-discovers your config, builds the Nest context, and runs each seeder in order. Expected output:

```bash
✔ Loaded config from seeder.config.ts
✔ users  seeded
Done in 1.2s
```

Open your database and you'll find 10 freshly generated users. 🎉

## Fast path: `nest-seed init`

Prefer not to write the boilerplate by hand? Scaffold a ready-to-edit config, factory, and seeder in one command:

```bash
npx nest-seed init --orm typeorm
```

This generates a `seeder.config.ts`, an example factory, and an example seeder wired together exactly like the
steps above. Pass `--orm mongoose` for a Mongoose setup, or `--force` to overwrite existing files.

::: tip
After `init`, just add `"seed": "nest-seed"` to `package.json`, point the config at your real database, and
run `npm run seed`.
:::

## Common commands

Everything below is covered in depth on the [CLI reference](/guide/cli) page.

### Refresh (re-seed)

Drop existing data, then seed again from scratch — handy during development:

```bash
npm run seed -- --refresh
```

This calls each seeder's `drop()` in reverse order, then re-runs `seed()` top to bottom.

### Dry run

Preview what would run without writing anything to the database:

```bash
npm run seed -- --dry-run
```

### List seeders

See every registered seeder and the `--name` alias it responds to:

```bash
npx nest-seed list
```

### Run a single seeder

Match by class name or `@SeederName` (case-insensitive, the `Seeder` suffix is optional):

```bash
npm run seed -- --name users
```

::: tip Debugging
Set `NEST_SEEDER_DEBUG=1` to print full stack traces when something goes wrong, and explore
`nest-seed --help` for every flag.
:::

## Next steps

- [Factories](/guide/factories) — generators, dependencies, inheritance, and overrides
- [Seeders](/guide/seeders) — the `Seeder` interface, `@SeederName`, and relationship seeding
- [Configuration](/guide/configuration) — config file shape, async config, and ordering rules
- [CLI reference](/guide/cli) — every `nest-seed` command and flag
- [DataFactory API](/api/data-factory) — `generate`, `generateOne`, and overrides
