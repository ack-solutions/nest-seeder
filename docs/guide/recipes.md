# Recipes

Practical, copy-pasteable patterns for real-world seeding. Each recipe sticks to the public API — combine them freely.

::: tip Prerequisites
These recipes assume you already have a factory and a seeder wired up. If not, start with [Factories](/guide/factories) and [Seeders](/guide/seeders), then come back here.
:::

## 1. Idempotent seeders

Re-running `npm run seed` should not double your data. Skip seeding when the table already has rows — unless the run is a `--refresh`, in which case `drop()` already cleared everything first.

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
    const existing = await this.userRepository.count();
    if (existing > 0) {
      // Already seeded — nothing to do.
      return;
    }

    const factory = DataFactory.createForClass(UserFactory);
    await this.userRepository.save(factory.generate(10));
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

::: info How `--refresh` interacts with this
On `nest-seed --refresh`, every seeder's `drop()` runs first (in reverse order), so `count()` returns `0` and the guard lets the seed proceed. On a plain run, the guard makes the seeder a no-op once data exists.
:::

## 2. Large datasets with batched inserts

Generating and inserting hundreds of thousands of rows in one `save()` can exhaust memory and blow past database parameter limits. Generate and persist in chunks instead.

```ts
async seed(): Promise<void> {
  const factory = DataFactory.createForClass(UserFactory);

  const total = 100_000;
  const batchSize = 1_000;

  for (let inserted = 0; inserted < total; inserted += batchSize) {
    const count = Math.min(batchSize, total - inserted);
    const batch = factory.generate(count);
    await this.userRepository.save(batch);
  }
}
```

::: tip Mongoose variant
With Mongoose, use `insertMany` per batch for the same effect:

```ts
await this.userModel.insertMany(factory.generate(count));
```
:::

## 3. Relationships across seeders

Generate the parent rows first, then pass each parent's id as an **override** when generating children. Overrides may include keys that are not `@Factory` fields — like a foreign key.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { UserFactory } from '../factories/user.factory';
import { PostFactory } from '../factories/post.factory';

@Injectable()
@SeederName('posts')
export class PostSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Post) private readonly postRepository: Repository<Post>,
  ) {}

  async seed(): Promise<void> {
    const userFactory = DataFactory.createForClass(UserFactory);
    const users = await this.userRepository.save(userFactory.generate(10));

    const postFactory = DataFactory.createForClass(PostFactory);
    for (const user of users) {
      // authorId is an override, not a @Factory field on PostFactory.
      const posts = postFactory.generate(3, { authorId: user.id });
      await this.postRepository.save(posts);
    }
  }

  async drop(): Promise<void> {
    await this.postRepository.createQueryBuilder().delete().execute();
  }
}
```

::: warning Order matters in the config
List parents before children in `seeders: [...]`. Seeders run top-to-bottom, and on `--refresh` they are dropped in **reverse** order — so children are dropped before parents, keeping foreign keys happy.

```ts
seeders: [UserSeeder, PostSeeder] // users first; posts dropped first on refresh
```
:::

## 4. Environment-specific seeders

Pick a different seeder list per `NODE_ENV` directly in your config file. The config is just code, so branch on the environment before exporting.

```ts
// seeder.config.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { Post } from './src/database/entities/post.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';
import { PostSeeder } from './src/database/seeders/post.seeder';
import { AdminSeeder } from './src/database/seeders/admin.seeder';

const isProd = process.env.NODE_ENV === 'production';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'app',
      entities: [User, Post],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Post]),
  ],
  // In production seed only the essentials; locally seed demo data too.
  seeders: isProd
    ? [AdminSeeder]
    : [AdminSeeder, UserSeeder, PostSeeder],
});
```

```bash
NODE_ENV=production npm run seed   # AdminSeeder only
npm run seed                       # full demo dataset
```

::: tip Need just one seeder for a quick run?
You don't have to change the config — use `--name` to target specific seeders:

```bash
npm run seed -- --name admin
```

See [the CLI guide](/guide/cli) for matching rules.
:::

## 5. Passing data via `--context`

The `--context` flag accepts a JSON string that is forwarded to **every** seeder as `options.context`. Use it to parametrize a run without editing code.

```bash
npm run seed -- --context '{"userCount": 50, "tenantId": "acme"}'
```

Read it inside `seed()` via the optional `options` argument:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Seeder,
  SeederName,
  DataFactory,
  SeederServiceOptions,
} from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async seed(options?: SeederServiceOptions): Promise<void> {
    const count = options?.context?.userCount ?? 10;
    const tenantId = options?.context?.tenantId;

    const factory = DataFactory.createForClass(UserFactory);
    // tenantId rides along as an override (not a @Factory field).
    const users = factory.generate(count, { tenantId });
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

::: info
`options.context` is `Record<string, any>`, so always guard with optional chaining and sensible defaults — a run without `--context` passes no context at all.
:::

## 6. Deterministic data with `faker.seed()`

Seed faker's PRNG before generating to get the **same** data on every run — invaluable for reproducible fixtures and snapshot tests.

```ts
import { faker } from '@faker-js/faker';
import { DataFactory } from '@ackplus/nest-seeder';
import { UserFactory } from '../factories/user.factory';

async seed(): Promise<void> {
  faker.seed(12345); // any fixed number → stable output

  const factory = DataFactory.createForClass(UserFactory);
  const users = factory.generate(10); // identical every time
  await this.userRepository.save(users);
}
```

::: tip Combine with `--context`
Let callers choose the seed so CI and local runs match:

```ts
async seed(options?: SeederServiceOptions): Promise<void> {
  if (options?.context?.seed != null) {
    faker.seed(Number(options.context.seed));
  }
  // ...
}
```

```bash
npm run seed -- --context '{"seed": 42}'
```
:::

## 7. Custom providers injected into seeders

Seeders are regular NestJS providers, so they support constructor injection. Register any extra providers in the config's `providers` array, then inject them like you would anywhere else.

```ts
// src/database/services/password.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordService {
  hash(plain: string): string {
    // ...your real hashing here
    return `hashed:${plain}`;
  }
}
```

```ts
// src/database/seeders/user.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';
import { PasswordService } from '../services/password.service';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10).map((user) => ({
      ...user,
      password: this.passwordService.hash('changeme'),
    }));
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

Register the provider so Nest can resolve it:

```ts
// seeder.config.ts
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { PasswordService } from './src/database/services/password.service';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    /* TypeOrmModule.forRoot(...), TypeOrmModule.forFeature([User]) */
  ],
  providers: [PasswordService],
  seeders: [UserSeeder],
});
```

## 8. Wrapping a seeder in a transaction (TypeORM)

For all-or-nothing seeding, inject the TypeORM `DataSource` and run your writes inside `dataSource.transaction()`. If anything throws, the whole batch rolls back.

```ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { UserFactory } from '../factories/user.factory';
import { PostFactory } from '../factories/post.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(private readonly dataSource: DataSource) {}

  async seed(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const userFactory = DataFactory.createForClass(UserFactory);
      const users = await manager.save(User, userFactory.generate(10));

      const postFactory = DataFactory.createForClass(PostFactory);
      for (const user of users) {
        const posts = postFactory.generate(3, { authorId: user.id });
        await manager.save(Post, posts);
      }
    });
  }

  async drop(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.createQueryBuilder().delete().from(Post).execute();
      await manager.createQueryBuilder().delete().from(User).execute();
    });
  }
}
```

::: info `DataSource` is injectable out of the box
When you import `TypeOrmModule.forRoot(...)` in your [seeder config](/guide/configuration), TypeORM registers `DataSource` in the DI container — no extra `providers` entry needed. Inside the callback, use the supplied `manager` (not your repositories) so every write joins the transaction.
:::

## See also

- [Factories](/guide/factories) — `@Factory`, `dependsOn`, and context-aware generators
- [Seeders](/guide/seeders) — the `Seeder` interface, `@SeederName`, and `drop()`
- [Configuration](/guide/configuration) — `defineSeederConfig`, imports, providers
- [CLI](/guide/cli) — `--refresh`, `--name`, `--context`, `--dry-run`, and more
