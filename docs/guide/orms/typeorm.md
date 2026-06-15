# TypeORM

This guide walks you through seeding a TypeORM database end-to-end with `@ackplus/nest-seeder`: defining an entity, writing a factory, building a seeder with a correct `drop()`, and wiring up the config for **Postgres**, **MySQL**, and **SQLite**. It also covers relationships and batch inserts.

## Install

Install the library, Faker, and the TypeORM packages, plus the driver for your database.

::: code-group

```bash [Postgres]
npm install @ackplus/nest-seeder @faker-js/faker @nestjs/typeorm typeorm pg
```

```bash [MySQL]
npm install @ackplus/nest-seeder @faker-js/faker @nestjs/typeorm typeorm mysql2
```

```bash [SQLite]
npm install @ackplus/nest-seeder @faker-js/faker @nestjs/typeorm typeorm better-sqlite3
```

:::

::: tip
Using a `.ts` config file? Also install the dev dependencies: `npm install -D ts-node typescript`.
:::

## 1. Define your entity

Nothing special here — a standard TypeORM entity.

```ts
// src/database/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: 'user' })
  role: string;
}
```

## 2. Write a factory

A factory describes how to generate one fake row. Each `@Factory` property receives a Faker instance, and fields can derive from earlier ones using `dependsOn`.

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

See the [Factories guide](/guide/factories) for the full `@Factory` API.

## 3. Write the seeder

A seeder implements the `Seeder` interface. Inject your repository, generate rows with `DataFactory`, and persist them with `save()`.

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

::: tip
`@SeederName('users')` gives the seeder a stable, minification-safe name. You can then target it from the CLI with `nest-seed --name users`.
:::

### Why the query builder in `drop()`?

`drop()` is called when you run with `--refresh`. To delete every row in a table you must use the query builder:

```ts
await this.userRepository.createQueryBuilder().delete().execute();
```

::: warning
Do **not** use `repo.delete({})` to clear a table. Modern TypeORM rejects empty criteria and throws:

```
Empty criteria(s) are not allowed for the delete method.
```

Always use `createQueryBuilder().delete().execute()` instead.
:::

## 4. Configure `seeder.config.ts`

Create `seeder.config.ts` at your project root. Register your `TypeOrmModule` connection with `forRoot`, expose your entities to the seeder context with `forFeature`, and list your seeders.

::: code-group

```ts [Postgres]
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

```ts [MySQL]
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? 'root',
      database: process.env.DB_DATABASE ?? 'app',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
});
```

```ts [SQLite]
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_DATABASE ?? 'app.sqlite',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
});
```

:::

::: info
`defineSeederConfig` is an identity helper that gives you full type-safety and autocompletion on the config object. It's optional but recommended.
:::

::: warning
`synchronize: true` is convenient for local development and seeding throwaway databases, but never enable it against production data — it can drop columns and tables to match your entities.
:::

### Async config with `ConfigService`

If your connection details come from `@nestjs/config`, use `forRootAsync` instead. Add `ConfigModule` to the connection's `imports` and inject `ConfigService`.

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: Number(config.get('DB_PORT')),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [User],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
});
```

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

```bash
npm run seed                 # run all seeders
npm run seed -- --refresh    # drop, then reseed
npm run seed -- --name users # run only the UserSeeder
```

See the [CLI reference](/guide/cli) for every flag.

## Relationships

To seed related records, run the parent seeder first, then pass the foreign key as an **override** when generating children. Overrides may include keys that are not `@Factory` fields on the factory.

```ts
// src/database/factories/post.factory.ts
import { Factory } from '@ackplus/nest-seeder';

export class PostFactory {
  @Factory((faker) => faker.lorem.sentence())
  title: string;

  @Factory((faker) => faker.lorem.paragraphs(2))
  body: string;
}
```

```ts
// inside PostSeeder.seed()
const factory = DataFactory.createForClass(PostFactory);

for (const user of users) {
  const posts = factory.generate(3, { authorId: user.id }); // authorId is an override, not a @Factory field
  await this.postRepository.save(posts);
}
```

::: tip Order matters
List parents before children in your `seeders` array. Seeders run **top-to-bottom**, and on `--refresh` they are **dropped in reverse order** — which keeps foreign-key constraints happy. Put `UserSeeder` before `PostSeeder`:

```ts
seeders: [UserSeeder, PostSeeder],
```

:::

## Batch inserts with `save()`

`factory.generate(count)` returns a plain array, and TypeORM's `save()` accepts an array — so a single call inserts the whole batch:

```ts
const factory = DataFactory.createForClass(UserFactory);
const users = factory.generate(1000);
await this.userRepository.save(users);
```

For very large volumes you can chunk the work to avoid building one giant query:

```ts
const factory = DataFactory.createForClass(UserFactory);

for (let i = 0; i < 10; i++) {
  const batch = factory.generate(1000);
  await this.userRepository.save(batch);
}
```

## Next steps

- [Recipes](/guide/recipes) — common seeding patterns and snippets.
- [Testing](/guide/testing) — using seeders to set up test data.
- [CLI reference](/guide/cli) — all `nest-seed` commands and flags.
