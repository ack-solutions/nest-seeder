# Seeders

A **seeder** is the unit of work that actually writes data to your database. It's a plain `@Injectable()` Nest provider that implements the `Seeder` interface, so it gets the **full power of NestJS dependency injection** — repositories, services, the `ConfigService`, anything in your module.

You list your seeders in [`seeder.config.ts`](/guide/configuration), and the [`nest-seed` CLI](/guide/cli) runs them for you.

## The `Seeder` interface

```ts
interface Seeder {
  seed(options?: SeederServiceOptions): Promise<any> | any;
  drop?(options?: SeederServiceOptions): Promise<any> | any;
}
```

- **`seed()`** is **required** — it inserts your data.
- **`drop()`** is **optional** — it deletes the data this seeder created. It runs during `--refresh`, and you only need it if your seeder should be reversible.

Both methods receive [`SeederServiceOptions`](/api/), which carries runtime flags like `refresh`, `context`, and `dryRun`.

## A basic seeder

Combine a [factory](/guide/factories) with a repository and you have a working seeder. Use [`DataFactory.createForClass`](/api/data-factory) to build instances, then persist them.

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

::: tip Full dependency injection
Seeders are ordinary Nest providers. Inject anything that's available in the module assembled from your config's `imports` and `providers` — repositories, your own services, `ConfigService`, an HTTP client, and so on.
:::

## `@SeederName`: stable, minification-safe names

`@SeederName('users')` gives a seeder a **stable, human-friendly name** that you can target with the CLI's `--name` flag:

```bash
npm run seed -- --name users
```

Why it matters: when your code is bundled and minified for production, class names like `UserSeeder` can be mangled into something like `e` or `t`. Targeting by class name would break. `@SeederName` pins a name that survives minification, so your `--name` filters and `nest-seed list` output stay reliable.

```ts
import { getSeederName } from '@ackplus/nest-seeder';

getSeederName(UserSeeder); // 'users'
```

The `--name` matcher is case-insensitive and the `Seeder` suffix is optional, so `users`, `UserSeeder`, and `userseeder` all resolve to the same class. Still, `@SeederName` is the recommended pattern on **every** seeder in your examples and projects.

::: tip
Use `nest-seed list` to print all registered seeders and their `--name` aliases.
:::

## Reading run options

`seed()` receives [`SeederServiceOptions`](/api/). The most useful fields:

- **`refresh`** — `true` when running with `--refresh`. Use it to decide whether to wipe-and-reseed or skip.
- **`context`** — arbitrary JSON forwarded from `--context '{...}'`. Great for environment- or tenant-specific data.
- **`dummyData`** — forwarded from `-d, --dummy-data`. **Deprecated**; prefer `context` for feature flags.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, SeederServiceOptions, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async seed(options?: SeederServiceOptions): Promise<void> {
    // Read tenant/env hints passed via `--context`
    const count = options?.context?.userCount ?? 10;

    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(count);
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

```bash
# Pass JSON that lands on options.context for every seeder
npm run seed -- --context '{"userCount": 50}'
```

## Idempotent seeders

For seeders you run repeatedly (e.g. local dev, CI), make `seed()` **idempotent**: skip work if the data already exists, unless the user explicitly asked for a `--refresh`.

```ts
async seed(options?: SeederServiceOptions): Promise<void> {
  const existing = await this.userRepository.count();

  if (existing > 0 && !options?.refresh) {
    // Data is already there and the user didn't ask to refresh — do nothing.
    return;
  }

  const factory = DataFactory.createForClass(UserFactory);
  const users = factory.generate(10);
  await this.userRepository.save(users);
}
```

::: info Why check `refresh`?
On a `--refresh` run, the framework calls `drop()` first (so the table is already empty) and then `seed()`. Honoring `options.refresh` lets a fresh seed go through even when your idempotency guard would otherwise skip it.
:::

## Relationship seeders

When one seeder's data depends on another's (e.g. posts belong to users), let the **parent seeder run first**, then have the child seeder **query the existing rows** and attach the foreign key via a [factory override](/guide/factories#overrides).

The key idea: an override key does **not** have to be a `@Factory` field on the factory. You can pass a foreign key like `authorId` straight through.

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { PostFactory } from '../factories/post.factory';

@Injectable()
@SeederName('posts')
export class PostSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Post) private readonly postRepository: Repository<Post>,
  ) {}

  async seed(): Promise<void> {
    const users = await this.userRepository.find();
    const factory = DataFactory.createForClass(PostFactory);

    for (const user of users) {
      // `authorId` is an override, not a @Factory field on PostFactory.
      const posts = factory.generate(3, { authorId: user.id });
      await this.postRepository.save(posts);
    }
  }

  async drop(): Promise<void> {
    await this.postRepository.createQueryBuilder().delete().execute();
  }
}
```

::: tip
Because `PostSeeder` reads users from the database, `UserSeeder` must run first. That ordering is controlled by the order of the `seeders` array in your config — see below.
:::

## Run order and reverse-order drops

Seeders run in the **order they appear** in the `seeders` array in [`seeder.config.ts`](/guide/configuration) — **top to bottom**. List parents (the rows others reference) **first**.

```ts
export default defineSeederConfig({
  imports: [/* ... */],
  seeders: [
    UserSeeder, // runs 1st — parents first
    PostSeeder, // runs 2nd — depends on users
  ],
});
```

On `--refresh`, the framework **drops in reverse order** before reseeding. This is **foreign-key safe**: children are deleted before the parents they reference.

```
seed:           UserSeeder  →  PostSeeder
drop (refresh): PostSeeder  →  UserSeeder
```

So with `[UserSeeder, PostSeeder]`, a `--refresh` run does:

```bash
npm run seed -- --refresh
# 1. drop  PostSeeder   (children first)
# 2. drop  UserSeeder   (then parents)
# 3. seed  UserSeeder   (parents first)
# 4. seed  PostSeeder   (then children)
```

You generally don't need to think about this — just keep the array in **dependency order** (parents first) and reverse-order dropping handles FK constraints for you.

## Correct `drop()` patterns

`drop()` should remove **all** rows this seeder owns. The right "delete everything" call differs per ORM.

::: code-group

```ts [TypeORM]
async drop(): Promise<void> {
  await this.userRepository.createQueryBuilder().delete().execute();
}
```

```ts [Mongoose]
async drop(): Promise<void> {
  await this.userModel.deleteMany({});
}
```

:::

::: warning Never use `repo.delete({})` in TypeORM
Modern TypeORM rejects an empty criteria object and throws:

> Empty criteria(s) are not allowed for the delete method.

Always use the query builder for a full wipe:

```ts
await repo.createQueryBuilder().delete().execute();
```

(Mongoose is different — `model.deleteMany({})` **is** the correct way to delete every document.)
:::

## Next steps

- [Factories](/guide/factories) — generate realistic data with `@Factory` and faker.
- [Configuration](/guide/configuration) — wire seeders into `seeder.config.ts`.
- [CLI](/guide/cli) — run, refresh, and filter seeders with `nest-seed`.
- [DataFactory API](/api/data-factory) — `generate`, `generateOne`, and overrides.
